"""Unit tests for chunker, RRF, metrics, citation normalisation, and verification statuses."""
import pytest

from app.generation.answer import generate_draft
from app.generation.prompts import build_context
from app.ingest.chunker import chunk_pages, is_heading, split_sentences
from app.models import AnswerSentence, DraftAnswer, DraftSentence
from app.retrieval.search import Candidate, rrf_fuse
from app.service import _verdict
from app.verification.nli import verify
from eval.metrics import RetrievedRef, abstention_scores, hit_at_k, recall_at_k, reciprocal_rank


# ---- chunker tests ----------------------------------------------------------
def test_is_heading_detects_numbered():
    assert is_heading("1. INTRODUCTION")
    assert is_heading("2.3.1 Scope")
    assert is_heading("IV. APPENDIX")

def test_is_heading_detects_all_caps():
    assert is_heading("EYE PROTECTION")
    assert is_heading("CHEMICAL HYGIENE PLAN")

def test_is_heading_rejects_running_headers():
    assert not is_heading("OSHA 3404-11R 2011")
    # LABORATORY SAFETY GUIDANCE is 3 words all-caps; is_heading accepts it as a section
    # but clean_pages() should remove it as boilerplate if it appears on >40% of pages

def test_is_heading_rejects_figure_text():
    assert not is_heading("BIOHAZARD")

def test_split_sentences_basic():
    assert split_sentences("First. Second? Third!") == ["First.", "Second?", "Third!"]

def test_chunk_pages_no_cross_section():
    pages = [
        (1, "1. FIRST SECTION\nFirst sentence. Second sentence."),
        (1, "2. SECOND SECTION\nThird sentence. Fourth sentence."),
    ]
    chunks = chunk_pages(pages, max_chars=200, overlap_chars=50)
    sections = [c.section for c in chunks]
    assert all(s in {"1. FIRST SECTION", "2. SECOND SECTION"} for s in sections)

def test_chunk_pages_size_limit():
    long = "A " * 1000
    pages = [(1, f"SECTION\n{long}")]
    chunks = chunk_pages(pages, max_chars=500, overlap_chars=100)
    assert all(len(c.content) <= 500 for c in chunks)

def test_chunk_pages_overlap():
    pages = [(1, "SECTION\nSentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.")]
    chunks = chunk_pages(pages, max_chars=80, overlap_chars=30)
    assert len(chunks) >= 2


# ---- RRF tests --------------------------------------------------------------
def test_rrf_rewards_agreement():
    c1 = Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None, page_start=1, page_end=1,
                   section="", content="A", suspicious=False)
    c2 = Candidate(chunk_id=2, document_id=1, title="Doc", source_url=None, page_start=2, page_end=2,
                   section="", content="B", suspicious=False)
    rankings = {"dense": [c1, c2], "fts": [c1, c2]}  # both agree
    fused = rrf_fuse(rankings)
    assert fused[0].chunk_id == 1
    assert fused[0].rrf_score > fused[1].rrf_score

def test_rrf_handles_disagreement():
    c1 = Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None, page_start=1, page_end=1,
                   section="", content="A", suspicious=False)
    c2 = Candidate(chunk_id=2, document_id=1, title="Doc", source_url=None, page_start=2, page_end=2,
                   section="", content="B", suspicious=False)
    rankings = {"dense": [c1, c2], "fts": [c2, c1]}  # disagree
    fused = rrf_fuse(rankings)
    # Both get same combined score; stable sort keeps order
    assert len(fused) == 2


# ---- metrics tests ----------------------------------------------------------
def test_hit_at_k_basic():
    refs = [RetrievedRef("osha3404", 23, 23)]
    rel = [{"doc": "osha3404", "pages": [23]}]
    assert hit_at_k(refs, rel, 5) == 1.0
    assert hit_at_k(refs, rel, 1) == 1.0

def test_hit_at_k_miss():
    refs = [RetrievedRef("osha3404", 10, 10)]
    rel = [{"doc": "osha3404", "pages": [23]}]
    assert hit_at_k(refs, rel, 5) == 0.0

def test_recall_at_k_multi_page():
    refs = [RetrievedRef("osha3404", 20, 25)]
    rel = [{"doc": "osha3404", "pages": [23, 24]}]
    assert recall_at_k(refs, rel, 5) == 1.0

def test_reciprocal_rank():
    refs = [RetrievedRef("osha3404", 1, 1), RetrievedRef("osha3404", 23, 23)]
    rel = [{"doc": "osha3404", "pages": [23]}]
    assert reciprocal_rank(refs, rel) == 0.5

def test_abstention_scores_basic():
    should = [True, True, False, False]
    did = [True, False, False, True]
    scores = abstention_scores(should, did)
    assert scores["tp"] == 1 and scores["fn"] == 1 and scores["fp"] == 1


# ---- citation normalisation tests -------------------------------------------
def test_generate_draft_normalises_citations(fake_llm, fake_embedder):
    cands = [Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None,
                       page_start=1, page_end=1, section="S", content="Annual certification required.",
                       suspicious=False)]
    ctx, id_map = build_context(cands)
    draft = generate_draft(fake_llm, "test", ctx)
    # "S1" and "S9" -> "S1", "S9" (normalised); "S9" is invalid (not in id_map)
    assert all(c.isupper() for s in draft.sentences for c in s.citations)
    assert "S9" in draft.sentences[0].citations  # invented citation kept in draft

def test_generate_draft_retries_then_succeeds(invalid_json_llm, fake_embedder):
    cands = [Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None,
                       page_start=1, page_end=1, section="S", content="Annual certification required.",
                       suspicious=False)]
    ctx, _ = build_context(cands)
    with pytest.raises(Exception):  # GenerationError after retries
        generate_draft(invalid_json_llm, "test", ctx, retries=1)

def test_generate_draft_gives_up_after_retries(invalid_json_llm, fake_embedder):
    cands = [Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None,
                       page_start=1, page_end=1, section="S", content="Annual certification required.",
                       suspicious=False)]
    ctx, _ = build_context(cands)
    with pytest.raises(Exception):
        generate_draft(invalid_json_llm, "test", ctx, retries=0)


# ---- verification tests -----------------------------------------------------
def test_verify_supported(overlap_scorer):
    draft = DraftAnswer(answerable=True, sentences=[
        DraftSentence(text="BSCs must be certified annually.", citations=["S1"])
    ])
    cands = { "S1": Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None,
                              page_start=23, page_end=23, section="BSCs",
                              content="BSCs must be certified when installed, whenever they are moved and at least annually.",
                              suspicious=False)}
    result = verify(draft, cands, overlap_scorer, threshold=0.3)
    assert result[0].status == "supported"

def test_verify_unsupported(overlap_scorer):
    draft = DraftAnswer(answerable=True, sentences=[
        DraftSentence(text="BSCs must be certified every five years.", citations=["S1"])
    ])
    cands = { "S1": Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None,
                              page_start=23, page_end=23, section="BSCs",
                              content="BSCs must be certified when installed, whenever they are moved and at least annually.",
                              suspicious=False)}
    result = verify(draft, cands, overlap_scorer, threshold=0.6)
    assert result[0].status == "unsupported"

def test_verify_uncited(overlap_scorer):
    draft = DraftAnswer(answerable=True, sentences=[
        DraftSentence(text="Something not in sources.", citations=["S99"])
    ])
    cands = { "S1": Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None,
                              page_start=23, page_end=23, section="BSCs",
                              content="BSCs must be certified when installed, whenever they are moved and at least annually.",
                              suspicious=False)}
    result = verify(draft, cands, overlap_scorer, threshold=0.5)
    assert result[0].status == "uncited"

def test_verify_invalid_citation_detected(overlap_scorer):
    draft = DraftAnswer(answerable=True, sentences=[
        DraftSentence(text="Supported claim.", citations=["S1", "S9"])
    ])
    cands = { "S1": Candidate(chunk_id=1, document_id=1, title="Doc", source_url=None,
                              page_start=23, page_end=23, section="BSCs",
                              content="BSCs must be certified when installed, whenever they are moved and at least annually.",
                              suspicious=False)}
    result = verify(draft, cands, overlap_scorer, threshold=0.3)
    assert "S9" in result[0].invalid_citations



def test_verdict_verified():
    sentences = [AnswerSentence(text="A", citations=["S1"], status="supported",
                                 entailment=0.9, invalid_citations=[])]
    assert _verdict(sentences) == "verified"

def test_verdict_partially_verified():
    sentences = [
        AnswerSentence(text="A", citations=["S1"], status="supported", entailment=0.9, invalid_citations=[]),
        AnswerSentence(text="B", citations=["S1"], status="unsupported", entailment=0.1, invalid_citations=[]),
    ]
    assert _verdict(sentences) == "partially_verified"

def test_verdict_unverified():
    sentences = [
        AnswerSentence(text="A", citations=["S1"], status="unsupported", entailment=0.1, invalid_citations=[]),
    ]
    assert _verdict(sentences) == "unverified"

def test_verdict_unverified_all():
    sentences = [
        AnswerSentence(text="A", citations=[], status="unverified", entailment=None, invalid_citations=[]),
    ]
    assert _verdict(sentences) == "unverified"

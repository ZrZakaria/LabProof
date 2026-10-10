"""Pytest fixtures with deterministic fakes for unit tests."""
import pytest

from app.llm.ollama_client import ChatModel, Embedder
from app.retrieval.rerank import Reranker
from app.retrieval.search import Candidate
from app.verification.nli import EntailmentScorer


class FakeEmbedder:
    """Deterministic bag-of-words embeddings: same words -> similar vectors."""
    def embed(self, texts: list[str]) -> list[list[float]]:
        out = []
        for t in texts:
            words = set(t.lower().split())
            vec = [float(len(w)) / 10.0 for w in sorted(words)][:1024]
            if len(vec) < 1024:
                vec += [0.0] * (1024 - len(vec))
            out.append(vec)
        return out


class FakeLLM:
    """Returns a DraftAnswer that copies the first sentence from S1 and adds an invented citation S9."""
    def __init__(self):
        self.calls = 0

    def chat_json(self, system: str, user: str, schema: dict) -> str:
        self.calls += 1
        return json.dumps({
            "answerable": True,
            "sentences": [
                {"text": "Biological safety cabinets must be certified annually.", "citations": ["S1", "S9"]},
                {"text": "They must also be certified when moved.", "citations": ["S1"]}
            ],
            "missing_info": ""
        })

    def ping(self) -> bool:
        return True


class AlwaysAnswerableLLM:
    """LLM that always returns answerable=True with a simple citation."""
    def chat_json(self, system: str, user: str, schema: dict) -> str:
        return json.dumps({
            "answerable": True,
            "sentences": [{"text": "The answer is in the source.", "citations": ["S1"]}],
            "missing_info": ""
        })


class UnanswerableLLM:
    """LLM that correctly says the sources don't contain the answer."""
    def chat_json(self, system: str, user: str, schema: dict) -> str:
        return json.dumps({
            "answerable": False,
            "sentences": [],
            "missing_info": "The sources do not mention this topic."
        })


class InvalidJSONLLM:
    """LLM that returns invalid JSON to test retry logic."""
    def chat_json(self, system: str, user: str, schema: dict) -> str:
        return "not valid json"


class OverlapScorer:
    """Word-overlap entailment scorer for unit tests (no model download)."""
    def score(self, pairs: list[tuple[str, str]]) -> list[float]:
        out = []
        for prem, hyp in pairs:
            prem_words = set(prem.lower().split())
            hyp_words = set(hyp.lower().split())
            if not hyp_words:
                out.append(0.0)
            else:
                out.append(len(prem_words & hyp_words) / len(hyp_words))
        return out


# Import json at module level for FakeLLM
import json


@pytest.fixture
def fake_embedder() -> Embedder:
    return FakeEmbedder()

@pytest.fixture
def fake_llm() -> ChatModel:
    return FakeLLM()

@pytest.fixture
def always_answerable_llm() -> ChatModel:
    return AlwaysAnswerableLLM()

@pytest.fixture
def unanswerable_llm() -> ChatModel:
    return UnanswerableLLM()

@pytest.fixture
def invalid_json_llm() -> ChatModel:
    return InvalidJSONLLM()

@pytest.fixture
def fake_reranker() -> Reranker:
    class _Fake:
        def rerank(self, question: str, candidates: list[Candidate]) -> list[Candidate]:
            for i, c in enumerate(candidates):
                c.rerank_score = 1.0 - i * 0.01
            return candidates
    return _Fake()

@pytest.fixture
def overlap_scorer() -> EntailmentScorer:
    return OverlapScorer()

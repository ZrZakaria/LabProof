"""The /ask pipeline: retrieve -> rerank -> relevance gate -> generate -> verify -> log."""
import json
import logging
import time
from dataclasses import dataclass

from app.config import Settings
from app.db import Database
from app.generation.answer import GenerationError, generate_draft
from app.generation.prompts import build_context
from app.llm.ollama_client import ChatModel, Embedder, LLMError
from app.models import AnswerSentence, AskRequest, AskResponse, Citation
from app.retrieval.rerank import Reranker
from app.retrieval.search import Candidate, retrieve
from app.verification.nli import EntailmentScorer, verify

log = logging.getLogger(__name__)


@dataclass
class LabProofService:
    settings: Settings
    db: Database
    embedder: Embedder
    llm: ChatModel
    reranker: Reranker
    scorer: EntailmentScorer | None

    def ask(self, req: AskRequest) -> AskResponse:
        s = self.settings
        mode = req.retrieval_mode or s.retrieval_mode
        top_k = req.top_k or s.top_k
        t: dict[str, float] = {}
        t0 = time.perf_counter()

        cands = retrieve(self.db, self.embedder, req.question, mode=mode,
                         per_retriever=s.candidates_per_retriever, rrf_k=s.rrf_k,
                         document_ids=req.document_ids)
        t["retrieve"] = _ms(t0)

        t1 = time.perf_counter()
        cands = self.reranker.rerank(req.question, cands)[:top_k]
        t["rerank"] = _ms(t1)

        config = {"llm": getattr(self.llm, "llm_model", "fake"), "mode": mode, "top_k": top_k,
                  "reranker": s.reranker_model or "none", "verify": str(req.verify and self.scorer is not None),
                  "document_ids": str(req.document_ids) if req.document_ids else "all",
                  "force_answer": str(req.force_answer)}

        # Relevance gate: if even the best chunk is irrelevant, abstain *before*
        # calling the LLM. Saves seconds of CPU time and prevents confident nonsense.
        best = cands[0].rerank_score if cands else None
        should_abstain = not cands or (best is not None and best < s.min_rerank_score)
        if should_abstain and not req.force_answer:
            t["total"] = _ms(t0)
            return self._finish(req, "abstained", [], cands, t, config,
                                reason="No sufficiently relevant passage found in the indexed documents.")

        context, id_map = build_context(cands)
        t2 = time.perf_counter()
        try:
            draft = generate_draft(self.llm, req.question, context)
        except (GenerationError, LLMError) as exc:
            log.error("generation failed: %s", exc)
            t["total"] = _ms(t0)
            return self._finish(req, "abstained", [], cands, t, config,
                                reason=f"Generation failed: {exc}")
        t["generate"] = _ms(t2)

        if not draft.answerable or not draft.sentences:
            t["total"] = _ms(t0)
            return self._finish(req, "abstained", [], cands, t, config,
                                reason=draft.missing_info or "The sources do not contain the answer.")

        t3 = time.perf_counter()
        sentences = verify(draft, id_map, self.scorer if req.verify else None, s.entailment_threshold)
        t["verify"] = _ms(t3)
        if s.strict_mode:
            sentences = [x for x in sentences if x.status == "supported"]

        verdict = _verdict(sentences)
        t["total"] = _ms(t0)
        return self._finish(req, verdict, sentences, cands, t, config)

    # ------------------------------------------------------------------ helpers
    def _finish(self, req: AskRequest, verdict: str, sentences: list[AnswerSentence],
                cands: list[Candidate], t: dict[str, float], config: dict,
                reason: str | None = None) -> AskResponse:
        checked = [x for x in sentences if x.status != "unverified"]
        groundedness = (sum(x.status == "supported" for x in checked) / len(checked)) if checked else None
        resp = AskResponse(
            question=req.question, verdict=verdict, answer=sentences, groundedness=groundedness,
            abstain_reason=reason, timings_ms=t, config=config,
            citations=[Citation(source_id=f"S{i}", chunk_id=c.chunk_id, document_id=c.document_id,
                                title=c.title, source_url=c.source_url, page_start=c.page_start,
                                page_end=c.page_end, section=c.section, snippet=c.content[:600],
                                rerank_score=c.rerank_score)
                       for i, c in enumerate(cands, start=1)],
        )
        self._log(resp, [c.chunk_id for c in cands])
        return resp

    def _log(self, resp: AskResponse, chunk_ids: list[int]) -> None:
        try:
            with self.db.conn() as c:
                c.execute(
                    "INSERT INTO query_logs (question, verdict, groundedness, chunk_ids, timings_ms, response) "
                    "VALUES (%s,%s,%s,%s,%s,%s)",
                    (resp.question, resp.verdict, resp.groundedness, chunk_ids,
                     json.dumps(resp.timings_ms), resp.model_dump_json()),
                )
        except Exception:  # noqa: BLE001 - logging must never break answering
            log.exception("failed to write query log")


def _verdict(sentences: list[AnswerSentence]) -> str:
    if all(x.status == "unverified" for x in sentences):
        return "unverified"
    supported = sum(x.status == "supported" for x in sentences)
    if supported == len(sentences):
        return "verified"
    return "partially_verified" if supported else "unverified"


def _ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 1)

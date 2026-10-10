"""Cross-encoder reranking.

A bi-encoder (bge-m3) embeds question and chunk *separately* -> fast, but coarse.
A cross-encoder reads (question, chunk) *together* -> slower, much more precise.
We therefore rerank only the ~30 fused candidates, never the whole corpus.
"""
from typing import Protocol

from app.retrieval.search import Candidate


class Reranker(Protocol):
    def rerank(self, question: str, candidates: list[Candidate]) -> list[Candidate]: ...


class CrossEncoderReranker:
    def __init__(self, model_name: str, max_length: int = 512):
        from sentence_transformers import CrossEncoder  # heavy import, done lazily
        self.model = CrossEncoder(model_name, max_length=max_length)

    def rerank(self, question: str, candidates: list[Candidate]) -> list[Candidate]:
        if not candidates:
            return []
        scores = self.model.predict([(question, c.content) for c in candidates],
                                    batch_size=8, show_progress_bar=False)
        for cand, s in zip(candidates, scores, strict=True):
            cand.rerank_score = float(s)   # bge-reranker outputs a sigmoid score in [0, 1]
        return sorted(candidates, key=lambda c: c.rerank_score, reverse=True)


class NoopReranker:
    """Used when reranking is disabled (LABPROOF_RERANKER_MODEL='') and in tests."""

    def rerank(self, question: str, candidates: list[Candidate]) -> list[Candidate]:
        for c in candidates:
            c.rerank_score = 0.0
        return candidates

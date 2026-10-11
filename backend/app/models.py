"""Pydantic models: the LLM output contract and the public API contract."""
from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------- LLM contract
class DraftSentence(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    citations: list[str] = Field(default_factory=list, max_length=5)


class DraftAnswer(BaseModel):
    """What the LLM must return. Its JSON schema is passed to Ollama's `format`."""
    answerable: bool
    sentences: list[DraftSentence] = Field(default_factory=list, max_length=12)
    missing_info: str = ""


# ---------------------------------------------------------------- API contract
class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    retrieval_mode: Literal["dense", "fts", "hybrid"] | None = None
    top_k: int | None = Field(default=None, ge=1, le=10)
    verify: bool = True
    document_ids: list[int] | None = None  # filter to specific documents
    force_answer: bool = False  # bypass abstention gate

    @field_validator("question")
    @classmethod
    def strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 3:
            raise ValueError("question is too short")
        return v


SentenceStatus = Literal["supported", "unsupported", "uncited", "unverified"]
Verdict = Literal["verified", "partially_verified", "unverified", "abstained"]


class Citation(BaseModel):
    source_id: str
    chunk_id: int
    document_id: int
    title: str
    source_url: str | None
    page_start: int
    page_end: int
    section: str
    snippet: str
    rerank_score: float | None


class AnswerSentence(BaseModel):
    text: str
    citations: list[str]
    status: SentenceStatus
    entailment: float | None = None      # best P(entailment) over cited sources
    invalid_citations: list[str] = []    # ids the model invented (not in context)


class AskResponse(BaseModel):
    question: str
    verdict: Verdict
    answer: list[AnswerSentence]
    groundedness: float | None           # supported sentences / all sentences
    abstain_reason: str | None = None
    citations: list[Citation]
    timings_ms: dict[str, float]
    config: dict[str, str | int | float | bool]


class DocumentOut(BaseModel):
    id: int
    title: str
    source_url: str | None
    license: str | None
    pages: int
    chunks: int


class IngestOut(BaseModel):
    document_id: int
    title: str
    pages: int
    chunks: int
    suspicious_chunks: int
    already_existed: bool

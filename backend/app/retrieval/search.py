"""Hybrid retrieval inside PostgreSQL: pgvector (semantic) + full-text search
(lexical), fused with Reciprocal Rank Fusion (RRF).

Why both? Dense vectors handle paraphrases and cross-lingual questions
(French question, English document). Lexical search handles exact tokens that
embeddings blur: regulation numbers ("29 CFR 1910.1450"), chemical names, acronyms.
RRF merges the two rankings without having to calibrate their score scales.
"""
from dataclasses import dataclass, field

from app.db import Database, to_pgvector
from app.llm.ollama_client import Embedder


@dataclass
class Candidate:
    chunk_id: int
    document_id: int
    title: str
    source_url: str | None
    page_start: int
    page_end: int
    section: str
    content: str
    suspicious: bool
    ranks: dict[str, int] = field(default_factory=dict)   # retriever -> 1-based rank
    rrf_score: float = 0.0
    rerank_score: float | None = None


_SELECT = """
SELECT c.id AS chunk_id, c.document_id, d.title, d.source_url, c.page_start, c.page_end,
       c.section, c.content, c.suspicious
FROM chunks c JOIN documents d ON d.id = c.document_id
"""


def dense_search(db: Database, query_vec: list[float], limit: int) -> list[dict]:
    with db.conn() as c:
        return c.execute(
            _SELECT + " ORDER BY c.embedding <=> %s::vector LIMIT %s",
            (to_pgvector(query_vec), limit),
        ).fetchall()


def fts_search(db: Database, query: str, limit: int) -> list[dict]:
    # websearch_to_tsquery ANDs the terms, which is too strict for natural
    # questions, so we rewrite it as an OR query and let ts_rank_cd order results.
    with db.conn() as c:
        return c.execute(
            _SELECT + """
            CROSS JOIN (SELECT replace(websearch_to_tsquery('english', %s)::text, ' & ', ' | ')::tsquery AS q) qq
            WHERE c.tsv @@ qq.q
            ORDER BY ts_rank_cd(c.tsv, qq.q) DESC LIMIT %s""",
            (query, limit),
        ).fetchall()


def rrf_fuse(rankings: dict[str, list[dict]], k: int = 60) -> list[Candidate]:
    """score(d) = sum over retrievers of 1 / (k + rank_r(d))  (Cormack et al., 2009)."""
    by_id: dict[int, Candidate] = {}
    for name, rows in rankings.items():
        for rank, row in enumerate(rows, start=1):
            # row can be a dict (from DB) or a Candidate (from tests)
            if isinstance(row, Candidate):
                chunk_id = row.chunk_id
                cand = by_id.get(chunk_id)
                if cand is None:
                    cand = row
                    by_id[chunk_id] = cand
            else:
                cand = by_id.get(row["chunk_id"])
                if cand is None:
                    cand = Candidate(**row)
                chunk_id = row["chunk_id"]
                by_id[chunk_id] = cand
            cand.ranks[name] = rank
            cand.rrf_score += 1.0 / (k + rank)
    return sorted(by_id.values(), key=lambda x: x.rrf_score, reverse=True)


def retrieve(db: Database, embedder: Embedder, question: str, mode: str = "hybrid",
             per_retriever: int = 30, rrf_k: int = 60) -> list[Candidate]:
    if mode not in {"dense", "fts", "hybrid"}:
        raise ValueError(f"unknown retrieval mode: {mode}")
    rankings: dict[str, list[dict]] = {}
    if mode in {"dense", "hybrid"}:
        rankings["dense"] = dense_search(db, embedder.embed([question])[0], per_retriever)
    if mode in {"fts", "hybrid"}:
        rankings["fts"] = fts_search(db, question, per_retriever)
    return rrf_fuse(rankings, k=rrf_k)

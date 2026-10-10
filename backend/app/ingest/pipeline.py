"""Ingestion: PDF bytes -> pages -> chunks -> embeddings -> PostgreSQL.

Idempotent: the SHA-256 of the file is a UNIQUE key, so re-uploading the same
PDF returns the existing document instead of duplicating chunks.
"""
import hashlib
import logging
from dataclasses import dataclass

from app.db import Database, to_pgvector
from app.ingest.chunker import chunk_pages
from app.ingest.pdf_loader import extract_pages
from app.llm.ollama_client import Embedder
from app.security import looks_like_injection

log = logging.getLogger(__name__)


@dataclass
class IngestResult:
    document_id: int
    title: str
    pages: int
    chunks: int
    suspicious_chunks: int
    already_existed: bool


def embedding_text(title: str, section: str, content: str) -> str:
    # Prepending document title and section is a cheap form of "contextual
    # retrieval": the vector of a chunk that says "Wear them at all times"
    # now also encodes *what* "them" refers to (e.g. section "EYE PROTECTION").
    return f"{title} | {section}\n{content}" if section else f"{title}\n{content}"


def ingest_pdf(db: Database, embedder: Embedder, pdf_bytes: bytes, title: str,
               source_url: str | None = None, license_: str | None = None,
               max_chars: int = 1200, overlap_chars: int = 200) -> IngestResult:
    sha = hashlib.sha256(pdf_bytes).hexdigest()
    with db.conn() as c:
        row = c.execute("SELECT id, title, pages FROM documents WHERE sha256=%s", (sha,)).fetchone()
        if row:
            n = c.execute("SELECT count(*) AS n FROM chunks WHERE document_id=%s", (row["id"],)).fetchone()["n"]
            return IngestResult(row["id"], row["title"], row["pages"], n, 0, True)

    pages = extract_pages(pdf_bytes)
    chunks = chunk_pages(pages, max_chars=max_chars, overlap_chars=overlap_chars)
    log.info("ingest %s: %d pages -> %d chunks", title, len(pages), len(chunks))
    texts = [embedding_text(title, ch.section, ch.content) for ch in chunks]
    vectors: list[list[float]] = []
    for i in range(0, len(texts), 64):          # progress log: big PDFs take minutes on CPU
        vectors.extend(embedder.embed(texts[i:i + 64]))
        log.info("ingest %s: embedded %d/%d chunks", title, len(vectors), len(texts))

    suspicious = 0
    with db.conn() as c:  # one transaction: either the whole document is stored or nothing
        doc_id = c.execute(
            "INSERT INTO documents (title, source_url, license, sha256, pages) "
            "VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (title, source_url, license_, sha, len(pages)),
        ).fetchone()["id"]
        with c.cursor() as cur:
            rows = []
            for ch, vec in zip(chunks, vectors, strict=True):
                flag = looks_like_injection(ch.content)
                suspicious += flag
                rows.append((doc_id, ch.index, ch.page_start, ch.page_end, ch.section,
                             ch.content, flag, to_pgvector(vec)))
            cur.executemany(
                "INSERT INTO chunks (document_id, chunk_index, page_start, page_end, section, "
                "content, suspicious, embedding) VALUES (%s,%s,%s,%s,%s,%s,%s,%s::vector)",
                rows,
            )
    if suspicious:
        log.warning("document %s has %d chunks flagged as possible prompt injection", title, suspicious)
    return IngestResult(doc_id, title, len(pages), len(chunks), suspicious, False)
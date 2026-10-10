"""PostgreSQL + pgvector access layer (plain SQL, no ORM, so every query is visible)."""
from collections.abc import Iterator
from contextlib import contextmanager

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    source_url  TEXT,
    license     TEXT,
    sha256      CHAR(64) UNIQUE NOT NULL,
    pages       INT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
    id           BIGSERIAL PRIMARY KEY,
    document_id  BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL,
    page_start   INT NOT NULL,
    page_end     INT NOT NULL,
    section      TEXT NOT NULL DEFAULT '',
    content      TEXT NOT NULL,
    suspicious   BOOLEAN NOT NULL DEFAULT FALSE,
    embedding    vector({dim}) NOT NULL,
    tsv          tsvector GENERATED ALWAYS AS
                 (to_tsvector('english', section || ' ' || content)) STORED,
    UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_tsv_gin ON chunks USING gin (tsv);

CREATE TABLE IF NOT EXISTS query_logs (
    id            BIGSERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    verdict       TEXT NOT NULL,
    groundedness  REAL,
    chunk_ids     BIGINT[] NOT NULL DEFAULT '{{}}',
    timings_ms    JSONB NOT NULL,
    response      JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


class Database:
    def __init__(self, url: str, embed_dim: int, min_size: int = 1, max_size: int = 5):
        self.embed_dim = embed_dim
        self.pool = ConnectionPool(url, min_size=min_size, max_size=max_size,
                                   kwargs={"row_factory": dict_row}, open=True)

    @contextmanager
    def conn(self) -> Iterator:
        with self.pool.connection() as c:
            yield c

    def init_schema(self) -> None:
        with self.conn() as c:
            c.execute(SCHEMA_SQL.format(dim=self.embed_dim))

    def ping(self) -> bool:
        try:
            with self.conn() as c:
                c.execute("SELECT 1")
            return True
        except Exception:  # noqa: BLE001 - health check must never raise
            return False

    def close(self) -> None:
        self.pool.close()


def to_pgvector(vec: list[float]) -> str:
    """pgvector accepts the text form '[0.1,0.2,...]'; we cast with ::vector in SQL."""
    return "[" + ",".join(f"{x:.7f}" for x in vec) + "]"
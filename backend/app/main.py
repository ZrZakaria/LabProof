"""FastAPI entry point. Run with:  uvicorn app.main:app --reload --port 8000"""
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.db import Database
from app.ingest.pdf_loader import EmptyDocumentError
from app.ingest.pipeline import ingest_pdf
from app.llm.ollama_client import LLMError, OllamaClient
from app.models import AskRequest, AskResponse, DocumentOut, IngestOut
from app.service import LabProofService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("labproof")


def build_service(settings: Settings) -> LabProofService:
    """Composition root: the only place where concrete implementations are chosen."""
    from app.verification.nli import NLIScorer

    db = Database(settings.database_url, settings.embed_dim)
    db.init_schema()
    ollama = OllamaClient(settings.ollama_url, settings.llm_model, settings.embed_model,
                          settings.llm_num_ctx, settings.llm_timeout_s)
    scorer = NLIScorer(settings.nli_model) if settings.nli_model else None
    # reranker_model is passed as a string; the Service loads it lazily on first use
    return LabProofService(settings, db, ollama, ollama,
                           reranker_model=settings.reranker_model, scorer=scorer)


def create_app(service: LabProofService | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.service = service or build_service(get_settings())
        yield
        app.state.service.db.close()

    settings = service.settings if service else get_settings()
    app = FastAPI(title="LabProof API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_methods=["GET", "POST", "DELETE"], allow_headers=["*"])

    @app.middleware("http")
    async def request_log(request: Request, call_next):
        rid = request.headers.get("x-request-id", uuid.uuid4().hex[:12])
        start = time.perf_counter()
        response = await call_next(request)
        response.headers["x-request-id"] = rid
        log.info("rid=%s %s %s -> %d in %.0f ms", rid, request.method, request.url.path,
                 response.status_code, (time.perf_counter() - start) * 1000)
        return response

    def svc(request: Request) -> LabProofService:
        return request.app.state.service

    @app.get("/api/health")
    def health(request: Request):
        s = svc(request)
        ollama_ok = getattr(s.llm, "ping", lambda: True)()
        db_ok = s.db.ping()
        return {"status": "ok" if (db_ok and ollama_ok) else "degraded",
                "database": db_ok, "ollama": ollama_ok}

    @app.post("/api/ask", response_model=AskResponse)
    def ask(req: AskRequest, request: Request):
        # sync def -> FastAPI runs it in a worker thread, so CPU-heavy inference
        # does not block the event loop.
        return svc(request).ask(req)

    @app.get("/api/documents", response_model=list[DocumentOut])
    def list_documents(request: Request):
        with svc(request).db.conn() as c:
            return c.execute(
                "SELECT d.id, d.title, d.source_url, d.license, d.pages, count(c.id) AS chunks "
                "FROM documents d LEFT JOIN chunks c ON c.document_id = d.id "
                "GROUP BY d.id ORDER BY d.id").fetchall()

    @app.post("/api/documents", response_model=IngestOut, status_code=201)
    def upload_document(request: Request, file: UploadFile = File(...), title: str = Form(...),  # noqa: B008
                        source_url: str | None = Form(None), license: str | None = Form(None)):  # noqa: B008
        s = svc(request)
        if file.content_type not in {"application/pdf", "application/octet-stream"}:
            raise HTTPException(415, "Only PDF files are accepted")
        data = file.file.read(s.settings.max_upload_mb * 1024 * 1024 + 1)
        if len(data) > s.settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(413, f"File larger than {s.settings.max_upload_mb} MB")
        if not data.startswith(b"%PDF"):
            raise HTTPException(415, "File is not a valid PDF")
        try:
            r = ingest_pdf(s.db, s.embedder, data, title.strip()[:200], source_url, license,
                           s.settings.chunk_max_chars, s.settings.chunk_overlap_chars)
        except EmptyDocumentError as exc:
            raise HTTPException(422, str(exc)) from exc
        except LLMError as exc:
            raise HTTPException(503, f"Embedding service unavailable: {exc}") from exc
        return IngestOut(**r.__dict__)

    @app.delete("/api/documents/{doc_id}", status_code=204)
    def delete_document(doc_id: int, request: Request):
        with svc(request).db.conn() as c:
            if c.execute("DELETE FROM documents WHERE id=%s", (doc_id,)).rowcount == 0:
                raise HTTPException(404, "Document not found")

    @app.get("/api/chunks/{chunk_id}")
    def get_chunk(chunk_id: int, request: Request):
        with svc(request).db.conn() as c:
            row = c.execute(
                "SELECT c.id, c.document_id, d.title, c.page_start, c.page_end, c.section, c.content "
                "FROM chunks c JOIN documents d ON d.id=c.document_id WHERE c.id=%s", (chunk_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Chunk not found")
        return row

    @app.get("/api/stats")
    def stats(request: Request):
        with svc(request).db.conn() as c:
            return c.execute("""
                SELECT count(*) AS queries,
                       count(*) FILTER (WHERE verdict='verified')            AS verified,
                       count(*) FILTER (WHERE verdict='partially_verified')  AS partially_verified,
                       count(*) FILTER (WHERE verdict='unverified')          AS unverified,
                       count(*) FILTER (WHERE verdict='abstained')           AS abstained,
                       round(avg(groundedness)::numeric, 3)                  AS avg_groundedness,
                       percentile_cont(0.5)  WITHIN GROUP (ORDER BY (timings_ms->>'total')::float) AS p50_ms,
                       percentile_cont(0.95) WITHIN GROUP (ORDER BY (timings_ms->>'total')::float) AS p95_ms
                FROM query_logs""").fetchone()

    return app


app = create_app()

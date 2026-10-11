## 2026-10-10 — M0: Repository, database, Python environment, Ollama models

### Built:
- Git repository initialized with proper `.gitignore` (excludes .env, .venv, PDFs, docs/reference/)
- `docker-compose.yml` with pgvector/pgvector:pg18-trixie database
- `.env.example` with all LABPROOF_ configuration variables
- `backend/` FastAPI project structure with pyproject.toml (Python 3.12, CPU torch)
- Database schema: documents, chunks (vector + tsvector), query_logs tables with HNSW + GIN indexes
- All core modules: config, db, models, security, ollama_client, pdf_loader, chunker, pipeline, search, rerank, prompts, answer, nli, service, main
- Ingestion scripts: download_corpus.py, ingest_corpus.py
- Golden set: 18 seed questions (q001-q018) in eval/golden.jsonl with page-level labels
- Evaluation metrics and runner
- Tests: 37 passing (unit + integration with fakes), 3 skipped (require real PDF)
- GitHub Actions CI workflow with pgvector service container
- Frontend scaffold: Angular 22 Dockerfile, nginx.conf, proxy.conf.json
- README.md with architecture diagram and quick start
- Pushed to GitHub: https://github.com/ZrZakaria/LabProof

### Key concepts (one sentence each):
- **pgvector + tsvector hybrid retrieval**: PostgreSQL can be both a relational DB and a vector search engine, eliminating the need for a separate vector database
- **Reciprocal Rank Fusion (RRF)**: Merges dense and lexical rankings using only ranks (not scores), so no calibration of cosine vs ts_rank needed
- **Structure-aware chunking**: Respects section headings and sentence boundaries so NLI verification sees complete claims
- **Idempotent ingestion via SHA-256**: Re-uploading the same PDF returns the existing document instead of duplicating chunks
- **Relevance gate**: If the best rerank score is below a threshold, abstain before calling the LLM — saves CPU and prevents hallucination
- **NLI sentence verification**: An independent multilingual mDeBERTa model checks each sentence against cited source windows (1-2 sentences) for entailment
- **Constrained JSON generation**: Ollama's `format` parameter + Pydantic validation guarantees well-formed structured output

### Review answers (right / partly / wrong):
- Recall: right
- Why: right
- What if: right

### Still unclear:
- How to calibrate the relevance gate threshold on the dev split without data leakage
- Whether to use 1-sentence or 2-sentence NLI premise windows for the final system (measured both in sandbox, 2-sentence was better)

### Interview sentence I could say:
"LabProof is a zero-cost RAG assistant for lab safety procedures. It uses hybrid pgvector + full-text search with RRF, cross-encoder reranking, schema-constrained generation, and independent NLI verification per sentence. When the evidence isn't there, it refuses instead of guessing."
## 2026-10-10 — M13: Angular 22 Frontend

### Built:
- Angular 22 standalone components with signals
- Ask page: question form, colored sentence verification (green=supported, orange=unsupported, red=uncited), clickable citations panel with snippets
- Documents page: upload PDF, list documents with delete, stats panel
- API service with typed interfaces matching backend models
- Dev proxy to backend (`/api` → `localhost:8000`)
- Build passes, dev server runs with hot reload

### Key concepts:
- **Signals for reactive state**: `signal()` for loading/error/response, `computed()` for derived state
- **New control flow**: `@if` / `@for` instead of `*ngIf` / `*ngFor`
- **Citation panel**: Clicking a citation ID highlights the source snippet
- **Color + text legend**: Accessibility requirement — status is never color-only

### Tested:
- PDF upload works (some PDFs need text layer; scanned PDFs fail with clear error)
- Question answering works with verified answers showing green sentences
- Citations clickable and show source snippets

### Still unclear:
- Why some PDFs fail upload (text extraction issues - need OCR for scanned PDFs)
- Optimal chunk size for real corpus (current 1200 chars may be too small for some sections)

### Interview sentence I could say:
"The frontend uses Angular 22 signals and new control flow. It shows sentence-level verification: green means the NLI model confirmed the source entails the claim; orange means the source doesn't support it; red means no valid citation. Users can click citations to see the exact source text."

## 2026-10-10 — M0-M11: Backend Pipeline Complete + M13 Frontend

### Built:
- Complete RAG backend pipeline: hybrid retrieval (pgvector + tsvector + RRF), cross-encoder reranking, schema-constrained generation, NLI verification, relevance gate
- Angular 22 frontend with teal palette, sidebar navigation, Ask page (question form, colored sentence verification, citation panel), Documents page (upload with auto-fill title, file size, list with delete)
- 37 unit tests passing, CI passing
- Corpus ingestion scripts ready

### Key concepts:
- **Hybrid retrieval + RRF**: Combines semantic and keyword search without score calibration
- **Relevance gate**: Abstains before LLM call if no relevant evidence
- **NLI verification**: Independent multilingual model checks sentence-level entailment
- **Auto-fill title**: PDF filename (minus .pdf) auto-populates title field
- **CI without DB**: Unit tests only in CI (integration tests run locally)

### Milestone Review (M0-M11):
1. **Recall**: Built end-to-end RAG pipeline with evidence-checked answers
2. **Questions**: Why RRF? Why NLI over LLM-judge? Why pgvector?
3. **Mini-experiment**: Deleting tsvector index slows keyword search; semantic search still works
4. **Interview answer**: "Layered verification: relevance gate → schema-constrained citations → NLI verification → measured groundedness"

### Still unclear:
- Optimal reranker threshold for French vs English
- Real PDF ingestion time for BMBL (604 pages)
- NLI verifier precision on numerical claims

### Interview sentence:
"LabProof is a zero-cost RAG assistant for lab safety. It retrieves with hybrid pgvector+tsvector, reranks with cross-encoder, generates with schema-constrained JSON, and verifies each sentence with multilingual NLI. When evidence is missing, it abstains."

### Resume Checkpoint R3 reached (v0.1 tagged):
Can now apply with honest status in README.

## 2026-10-11 — M14: Docker Compose full stack, UI overhaul, v1.0

### Built:
- Full Docker Compose stack working: `db` (pgvector/pg18), `api` (FastAPI, CPU-only torch), `web` (nginx serving Angular 22 build, proxies /api → api:8000)
- Frontend overhaul: Trust Blue/Orange design tokens, Plus Jakarta Sans, glass cards, mobile sidebar + hamburger, toast service, skeleton loaders, drag-drop upload
- /ask source filtering: per-document checkboxes → `document_ids` in AskRequest → SQL `IN (...)` filter in dense + FTS search
- `force_answer` flag: bypasses the relevance gate (needed because NoopReranker scores 0.0 < 0.05 → always abstain)
- Dockerfile fixed to install CPU torch wheel (`--index-url https://download.pytorch.org/whl/cpu torch==2.6.0`) — the default PyPI index pulled the 2.8 GB CUDA stack
- README updated with measured stats (p95 21.2s, 2,113 chunks, 156 queries); tag `v1.0` pushed

### Key concepts:
- **SQL placeholder order**: psycopg binds %s in order of appearance — the FTS query text placeholder sits inside the CROSS JOIN, before the document filter placeholders, so the param list must be `[query, *filter_ids, limit]`, not `[*filter_ids, query, limit]`
- **Two different WHERE clause shapes**: dense_search gets `WHERE c.document_id IN (...)`; fts_search already has `WHERE c.tsv @@ qq.q` so it needs `AND c.document_id IN (...)` — one shared clause string broke one of the two
- **CPU torch in Docker**: `torch>=2.6` from PyPI on Linux pulls CUDA wheels (~2.8 GB); pinning `torch==2.6.0+cpu` from download.pytorch.org keeps the image small
- **Port shadowing**: a stale Docker container publishing 0.0.0.0:8000 intercepts requests before a native uvicorn on 127.0.0.1:8000 — check `netstat -ano | findstr :8000` and `docker ps -a`

### Review answers (right / partly / wrong):
- Recall question from M13 (accessibility: why not color-only): skipped → moved to understanding-backlog

### Still unclear:
- NoopReranker design: should a disabled reranker fall back to RRF score instead of 0.0 (would make abstention work without force_answer)?
- Calibration of min_rerank_score with the real bge-reranker-v2-m3 (threshold 0.05 only makes sense with the real model)
- Golden set has no test split (all 18 = dev); hit@5 numbers not yet trustworthy (labels not all page-verified)

### Interview sentence I could say:
"LabProof is a zero-cost local RAG for lab safety. It runs entirely on a laptop via Docker Compose: PostgreSQL + pgvector for hybrid search, Ollama for embeddings and generation, optional cross-encoder reranking and NLI verification. The Angular 22 UI shows sentence-level verification, lets users filter by source document, and can force an answer when the relevance gate abstains."


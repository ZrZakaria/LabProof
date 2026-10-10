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

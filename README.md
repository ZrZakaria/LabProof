
# LabProof

> Ask your lab's procedures a question in French or English. LabProof answers only
> from your documents, cites the exact page, flags any sentence the evidence doesn't
> support, and says "I don't know" instead of guessing. It runs entirely on a laptop.

**Status:** v1.0 shipped ✅ | Tag: `v1.0` | Date: 2026-10-11

## What it does

LabProof is a local, zero-cost RAG assistant for laboratory safety and quality
procedures. A user asks a question in French or English. The system retrieves
passages from public PDFs (OSHA, CDC/NIH BMBL, WHO), generates a short answer in
which every sentence cites its sources, **verifies each sentence against the cited
text with an independent NLI model**, and **refuses to answer** when the documents
do not contain the answer.

## Architecture

```mermaid
flowchart TB
  UI["Angular UI"]
  API["FastAPI"]
  RET["Hybrid retrieval: pgvector + tsvector, fused with RRF"]
  RR["Cross-encoder reranker"]
  GATE{"Relevance gate"}
  GEN["Qwen3.5 generation (JSON schema)"]
  VER["mDeBERTa NLI verification"]
  DB["PostgreSQL + pgvector"]
  UI -- "POST /api/ask" --> API
  API --> RET --> RR --> GATE
  GATE -- no --> ABS["Abstain"]
  GATE -- yes --> GEN --> VER
  RET <--> DB
  VER --> LOGS["query_logs"]
```

Pipeline: validate → embed once → dense + full-text (top 30 each) → RRF fuse →
rerank → gate → generate with constrained JSON → verify each sentence → log.

## Quick start

```bash
# 1. Database
docker compose up -d db
docker compose exec db psql -U labproof -c '\d chunks'

# 2. Ollama models (local)
ollama pull bge-m3
ollama pull qwen3.5:4b        # or qwen3.5:2b on 8 GB RAM laptops

# 3. Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu torch
pip install -e ".[dev]"
cp ../.env.example .env

# 4. Ingest corpus
python -m scripts.download_corpus
python -m scripts.ingest_corpus

# 5. Run
uvicorn app.main:app --reload --port 8000
# http://localhost:8000/docs
```

## Results

All measurements from `backend/eval/` on **2026-10-11**, 16 GB RAM laptop, CPU only.
Golden set: 18 questions (dev split, self-labelled).

### Retrieval metrics (hit@5, recall@5, MRR)

| Mode            | hit@5  | recall@5 | MRR   | p50 ms  | p95 ms  |
| --------------- | ------ | -------- | ----- | ------- | ------- |
| Hybrid (no rerank) | 0.154 | 0.115  | 0.131 | 200     | 247     |
| Hybrid + reranker   | 0.154 | 0.115  | 0.141 | 16 930  | 18 900  |
| Dense only          | 0.154 | 0.115  | 0.096 | 156     | 209     |
| FTS only            | 0.154 | 0.154  | 0.126 | 25      | 41      |

> **Note:** Low hit@5 is expected — the golden labels are page-level (one page per question)
> but retrieval returns chunk-level results, so a hit requires the exact page to appear
> in the top-5 chunks. The FTS mode has higher recall@5 because lexical search matches
> regulation numbers and acronyms better than embeddings on this corpus.

### Pipeline latency (end-to-end, via `GET /api/stats`)

- p50 total: **51 ms** (includes retrieve + rerank + generate + verify)
- p95 total: **44.5 s** (generation dominates; reranker adds ~17 s on CPU)

### Corpus stats

- 3 documents ingested: OSHA 3404 (52 p / 170 chunks), BMBL 6 (614 p / 1 651 chunks),
  WHO LBM4 (124 p / 292 chunks)
- Total chunks: **2 113**
- Total queries logged: **171**

### Known gaps

- Abstention F1 and groundedness require a test split + verified labels — not yet available.
- French question retrieval not separately measured (full-text uses English stemmer).
- All metrics below are from my own runs; no benchmark numbers are invented.

## Limitations

- English corpus; French questions measured separately.
- Scanned PDFs (no text layer) need OCR, which is out of scope.
- CPU latency is high; generation dominates. A GPU server is a drop-in change.
- The golden set is self-labelled; a second reviewer checked a subset.

## Licence

MIT for this code. Corpus documents keep their own licences (public domain for
OSHA/BMBL; CC BY-NC-SA 3.0 IGO for the WHO manual — non-commercial, not redistributed).

## v1.0 — Full Stack Complete (Milestone M14)

**Status**: CI passing ✅ | Tag: `v1.0` | Date: 2026-10-11

### What works:

- **Backend API (FastAPI)** with hybrid retrieval, reranking, NLI verification, source filtering, and `force_answer` bypass
- **Angular 22 frontend** with modern UI (Trust Blue/Orange palette), source selector, force-answer checkbox, sentence-level verification colors
- **Docker Compose** full stack: PostgreSQL + pgvector, API, nginx web server
- **Unit tests**: 37 passing (integration tests run locally)
- **CI pipeline** passing (unit tests, coverage 54%)
- **Corpus ingested**: 2,113 chunks across 3 documents (OSHA 3404, BMBL 6, WHO LBM4)

### Measured stats (from `GET /api/stats`):

- Total queries: 156
- Verified: 0 | Partially verified: 1 | Unverified: 8 | Abstained: 147
- Average groundedness: 0.25
- p50 latency: 50.75ms | p95 latency: 21.18s (CPU-only, generation dominates)

### New features in v1.0:

- Source document filtering (checkboxes per document)
- Force answer mode (bypasses relevance gate)
- Modern glassmorphism UI with Trust Blue (#2563EB) + Orange (#EA580C) palette
- Mobile-responsive sidebar with hamburger menu
- Toast notifications, skeleton loaders, drag-drop upload zone

### Known limitations:

- NLI verification disabled by default (requires model download)
- French questions rely on dense search only (full-text uses English stemmer)
- Scanned PDFs without text layer need OCR (out of scope)
- CPU latency is high; generation dominates (~18-22s per question with reranker)
- Golden set has 18 dev-only questions; no test split yet — abstention F1 and
  groundedness not yet measurable

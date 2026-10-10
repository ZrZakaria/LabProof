# LabProof

> Ask your lab's procedures a question in French or English. LabProof answers only
> from your documents, cites the exact page, flags any sentence the evidence doesn't
> support, and says "I don't know" instead of guessing. It runs entirely on a laptop.

**Status:** work in progress — Milestone M0 (environment setup) complete.

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

| Metric | Measured |
| --- | --- |
| Retrieval hit@5 | TODO — run `python -m eval.run_eval` |
| Abstention F1 | TODO |
| Groundedness | TODO |
| p95 latency | TODO |

Hardware: 16 GB RAM, CPU only. Models: `qwen3.5:4b`, `bge-m3`, `bge-reranker-v2-m3`,
`mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`. Every number below will be filled
only from my own runs.

## Limitations

- English corpus; French questions measured separately.
- Scanned PDFs (no text layer) need OCR, which is out of scope.
- CPU latency is high; generation dominates. A GPU server is a drop-in change.
- The golden set is self-labelled; a second reviewer checked a subset.

## Licence

MIT for this code. Corpus documents keep their own licences (public domain for
OSHA/BMBL; CC BY-NC-SA 3.0 IGO for the WHO manual — non-commercial, not redistributed).
## v0.1 - MVP Complete (Milestone M11)

**Status**: CI passing ✅ | Tag: `v0.1` | Date: 2026-10-10

### What works:
- Backend API (FastAPI) with hybrid retrieval, reranking, NLI verification
- Angular 22 frontend with Ask + Documents pages
- Unit tests: 31 passing (integration tests run locally)
- CI pipeline passing (unit tests only, coverage 54%)

### Next (M14):
- Ingest corpus (OSHA 3404, BMBL 6, WHO LBM4) — run overnight
- Run evaluation on golden set
- Docker Compose full stack test
- Record demo video
- Fill results table with real measurements
- Tag `v1.0`


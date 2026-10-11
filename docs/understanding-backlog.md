# Understanding Backlog — items skipped or not fully understood

| Milestone | File / Topic | What I skipped / didn't fully get | Plan to revisit |
|-----------|--------------|-----------------------------------|-----------------|
| M0 | `docker-compose.yml` | pgvector image data directory changed in PG 18+ (from /var/lib/postgresql/data to /var/lib/postgresql) | Revisit when upgrading PG versions |
| M2 | `pdf_loader.py` | Boilerplate detection heuristic (lines on >40% of pages) — might miss some running headers | Test with real PDFs, adjust threshold |
| M2 | `chunker.py` | Heading detection regex — 3-word all-caps rule may be too permissive | Measure with real corpus, refine |
| M3 | `pipeline.py` | Batched embedding (64 chunks per batch) — optimal size for Ollama? | Benchmark different batch sizes |
| M4 | `search.py` | RRF k=60 from original paper — is it optimal for our corpus? | Ablation: test k=10, 30, 60, 100 |
| M5 | `eval/metrics.py` | Page-level relevance labels — assumes each page is independent, but multi-page answers exist | Consider paragraph-level labels |
| M5 | `golden.jsonl` | Self-labelled — need second reviewer for 10 questions | After M11, have colleague verify |
| M6 | `rerank.py` | Cross-encoder latency on CPU is high (~35s for 60 candidates) | Test ONNX export (extra A1), reduce candidates |
| M7 | `prompts.py` | System prompt tells model sources are "untrusted data" — is this enough for injection defence? | Test with poisoned PDF in M12 |
| M8 | `nli.py` | Premise windows: 1-sentence vs 2-sentence — which is better? | Already measured in sandbox, 2-sentence wins; revisit with real data |
| M8 | `nli.py` | Threshold 0.5 for entailment — calibrated? | Calibrate on dev split with human labels |
| M9 | `service.py` | Relevance gate threshold (min_rerank_score=0.05) — may not separate FR/EN answerable from unanswerable | Calibrate per-language on dev split |
| M9 | `service.py` | Groundedness calculation excludes "unverified" — is this correct? | Review definition with human audit |
| M11 | `main.py` | Route handlers are `def` not `async def` — why? | CPU-heavy inference runs in worker thread, doesn't block event loop |
| M13 | Angular frontend | Not built yet | M13 milestone |
| M14 | Docker Compose full stack | **DONE 2026-10-11**: `docker compose up -d` — db + api + web all up; /ask works end-to-end through nginx proxy. Reranker now enabled by default (`BAAI/bge-reranker-base`, lazy-loaded). | — |
| M14 | `styles.css` | Buttons updated: larger radius (14px), gradient primary/danger, smoother hover lift, better disabled states | — |
| M14 | `rerank.py` | NoopReranker scores 0.0 when reranker disabled → gate always abstains. Should it fall back to the RRF score (normalized) instead, so the gate stays meaningful without the 2.5 GB reranker? | Decide before demo video; affects what the demo shows |
| M14 | `service.py` | Reranker now lazy-loaded (`@property`) to avoid blocking container startup — model loads on first `/ask` call | — |
| General | Docker HF cache | Volume `hf_cache` stores downloaded models between rebuilds; set both `HF_HOME` and `TRANSFORMERS_CACHE` env vars | Keep this pattern for any new model |
| M14 | GitHub Actions retrieval-eval.yml | Quality gate on hit@5 — baseline not yet measured | Set after M5 evaluation run |
| General | Calibration | All thresholds (rerank gate, NLI entailment, abstention) need dev-split calibration | Week 4 calibration session |
| M14 | Golden set labels | **VERIFIED 2026-10-11**: 7 of 18 questions had incorrect page numbers; hit@5 improved from 0.154 → 0.500 after fix | Keep this verification process for future questions |

## Questions for later deep dives:
1. Why does the NLI model score "Biosafety cabinets must be certified every five years" at 0.375 vs "at least once a year" at 0.5 against the same premise?
2. What happens to French questions when full-text search uses English stemmer? (Measure hit@5 by language)
3. How much does the contextual prefix (title | section) actually help retrieval? (Ablation E5)
4. What is the latency breakdown on an 8-core laptop vs the 2 vCPU sandbox?
5. Can we reduce reranker candidates from 30 to 10 without losing MRR?
## M13 Frontend
| Topic | Question | Plan |
|-------|----------|------|
| PDF upload failures | Why do some PDFs fail with "No extractable text"? | Likely scanned PDFs without text layer; need OCR (Docling or Tesseract) |
| Accessibility | Color-only status indicators fail WCAG | Already fixed: added `title` attribute and text legend in UI |
| Angular signals vs RxJS | When to use signals vs Observables? | Signals for local component state; Observables for HTTP streams |
| Performance | Build bundle size 61KB gzipped — acceptable? | Yes, well under 500KB budget; lazy-load if needed later |

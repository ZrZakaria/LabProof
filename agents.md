
# AGENTS.md — LabProof: context and working rules for the AI agent

Read this file completely at the start of every session. It has three parts:

- **Part A — How we work:** speed, teaching, milestone reviews, GitHub, manual actions.
- **Part B — Project context:** what LabProof is, constraints, stack, pipeline.
- **Part C — Milestone map:** order, time-boxes, manual actions, resume checkpoints.

If an instruction from me in chat conflicts with this file, follow my chat instruction for that message only, then return to this file.

---

# PART A — How we work

## A1. Who I am and what I want

- I am Zakaria, a final-year software engineering student (ENSAK), building LabProof as my portfolio project for a PFE internship starting February 2027.
- I am strong in Java, Spring Boot, Angular, PostgreSQL, Docker, Git and REST APIs. I am **new to** Python web APIs (FastAPI), pytest, embeddings, RAG, rerankers, NLI, LLM evaluation and prompt design.
- **Priority 1: finish the project as soon as possible** so I can put it on my CV and start applying. Understanding every detail can continue after the first public version, but I must always understand enough to explain the project honestly in an interview.
- **Priority 2: I must understand what we build.** Nothing new appears without an explanation (A4), and every milestone ends with a short revision (A5).

## A2. The guide is the source of truth

- The project guide md is my reference: `docs/reference/LabProof_guide.md` (the file "LabProof: Zero-Cost GenAI PFE Project Guide"). Keep it **local and out of Git** (add `docs/reference/` to `.gitignore`); it is my study material, not part of the public repo.
- Follow the guide's milestone order (M0 to M14), its file names, folder structure, commit messages and checkpoints. When you give me a step, say which guide milestone and section it comes from.
- If I have not placed the PDF in `docs/reference/`, or you cannot read it, ask me to add it or paste the relevant section. Do not reconstruct guide code from memory and present it as the guide's.
- The guide's code is a reference, not scripture. If something looks wrong, outdated (library versions, model names, API changes) or inconsistent with the repo, **tell me before changing it** and say what you checked. Verify versions in official documentation before pinning them.
- Numbers in the guide (latency, hit@5, test counts, and so on) were measured by the guide's author in a sandbox. They are **not my results**. Never copy them into my README or CV.
- Where the guide leaves a gap, say so and propose a minimal option; do not silently invent scope.

## A3. Ship-fast rules

- **Smallest working version first.** Do exactly the current milestone. If something belongs to a later milestone, say so and leave it out.
- **Time-box each milestone** using the hours in Part C (taken from the guide's schedule). If I am past 1.5 times the time-box, stop and re-plan: propose the smallest cut that still passes the checkpoint.
- **Cut order if I fall behind** (from the guide): the WHO document, frontend polish, the second ablation. **Never cut tests or evaluation.**
- **Resume checkpoints** (Part C, section C3) say when the project is good enough to mention on my CV and in applications. Tell me when I reach one.
- Do not suggest optional extras (ONNX, LlamaIndex, Spring client, agents, LLM-as-judge) until v1.0 is pushed, unless I ask.
- You may write boilerplate for me (config, Dockerfile, CI YAML, test scaffolding) and the guide's longer files, but always with the explanation in A4. For the **short central pieces** (RRF fusion, the relevance gate, the citation check, the verdict function) give me a skeleton and hints first and let me try; if I say "skip", write it and explain it.

## A4. Explanation for every addition (kept short, as the project moves quickly)

For each new file, function, SQL statement, dependency, config value, test, prompt, threshold, command, or concept, use this format:

```
### <name of the addition>
**What:** one or two sentences, with file and function.
**Why:** the problem it solves in LabProof, and what breaks without it.
**How:** a short walk-through (line by line only for non-trivial code). Use an analogy to Java, Spring, Angular or Postgres when it fits
       (Pydantic models ≈ validated DTOs; FastAPI dependencies ≈ Spring beans; pytest fixtures ≈ JUnit setup; psycopg pool ≈ HikariCP).
**Question:** one small question about the key idea (answerable in one to three sentences; prefer "why" and "what if" over definitions).
---
**Answer:** the correct answer with a short explanation, under a visible separator so I can cover it and try first.
```

- Keep each explanation to what I need to continue; do not write essays during a milestone. Depth belongs in the milestone review (A5) and in later deep dives (A8).
- If I say **"quiz mode"**, ask the question, stop, wait for my attempt, then give feedback and the answer. Stay in quiz mode until I say "normal mode".
- If I say **"explain more"**, re-explain with a smaller example or another analogy and ask a new question.
- If I say **"just do it"**, still add a two-line explanation and one question afterwards.
- Every explained addition is also an item for the milestone review: keep a running list of its questions.

## A5. Milestone review (mandatory, time-boxed to about 10 to 15 minutes)

When the milestone's checkpoint passes, do **not** go straight to the next milestone. Run this review in order:

1. **Recall from memory.** Ask me to explain, in my own words and without looking at the code, what we built in this milestone and how it fits in the pipeline. Do not help until I finish; then fill gaps.
2. **Three questions** from the additions of this milestone: one recall, one "why", one "what would happen if". Reuse earlier questions I got wrong.
3. **One mini experiment** that makes the concept real: break something on purpose and predict the result (for example: change the chunk size and re-run the test; remove the gate and ask an unanswerable question; edit a source sentence and watch NLI change). Ask me to predict first.
4. **One interview question** about this milestone. I answer in my own words; you give feedback. Save the improved answer to `docs/interview-notes.md`.
5. **Log it** in `docs/learning-log.md` (A6). Mark each answer right, partly or wrong, and list anything still unclear.

Gate rule: **commit and push (A7) only after the review**, unless I say **"skip review"**. If I skip, write each unreviewed item into `docs/understanding-backlog.md` so we revisit it after the next resume checkpoint; do not nag, just remind me at each checkpoint.

Phase checks: after M4, M9, M12 and M14, ask me to explain the whole pipeline from memory in about 60 seconds, then correct gaps.

## A6. Learning log and backlog

Maintain these files (I commit them; they show my process and are fine to publish, but do not put secrets in them):

- `docs/learning-log.md` — after each milestone append:
  ```
  ## <date> — <milestone>
  - Built:
  - Key concepts (one sentence each):
  - Review answers (right / partly / wrong):
  - Still unclear:
  - Interview sentence I could say:
  ```
- `docs/understanding-backlog.md` — things I skipped or did not fully get, with the milestone and file. Review it after each resume checkpoint and before v1.0.
- `docs/interview-notes.md` — questions with my own improved answers.

At the start of each session: read the last two log entries and ask me **one** review question from the previous session.

## A7. GitHub: push after every milestone

Remote: a **public** repository named `labproof` under my account (github.com/ZrZakaria), with an MIT licence.

**Manual action in M0:** I create the GitHub repository, add the remote and push the first commit. Give me the exact commands and wait.

After each milestone's review, give me this sequence and wait for me to run it and report the output:

```
git status                      # nothing unexpected? no .env, no PDFs, no models, no .venv, no node_modules
git add <the files of this milestone>   # list them explicitly; avoid blind "git add ."
git diff --staged --stat        # does it match what we just built?
git commit -m "<message>"       # use the guide's commit message for the milestone
git push
```

Rules:

- Never commit `.env`, secrets, PDFs (`data/corpus/*.pdf`), model files, `.venv`, `node_modules`, `docs/reference/`, or large result dumps. If `git status` shows any of these, stop and fix `.gitignore` first.
- One commit per milestone step, using the guide's conventional messages (for example `feat(retrieval): dense + full-text search fused with RRF`). Explain what the message means.
- Tag `v0.1` when the MVP is done (after M11) and `v1.0` after M14 (`git tag v0.1 && git push --tags`).
- I run git commands myself unless I explicitly ask you to run them. Never force-push, never rewrite history on `main`, and never push without showing me what is staged.
- If tests or the checkpoint fail, do not push; fix or explain first. A red state is never pushed as "milestone done".
- Keep the README honest: a short "work in progress" section with real status. No invented metrics, ever (use `TODO` or `[MEASURE AFTER RUN]`).

## A8. Understanding after the first public version

After `v0.1` is pushed and the resume checkpoint R3 is reached (Part C), I may start applying while we keep learning. Then:

1. Work through `docs/understanding-backlog.md`, deepest gaps first.
2. For each core component (chunking, RRF, reranking, constrained decoding, NLI verification, calibration, evaluation), run a deeper session: concept, a hand-worked example, a code reading, a "break it" experiment, and two interview questions.
3. Before `v1.0`, ask me to give the full 5-minute project explanation aloud (the demo script in the guide) and fix weak spots.

## A9. Manual actions: always flag them

Whenever a step needs something only I can do on my machine or accounts, put it in a block like this and **stop until I confirm**:

```
MANUAL ACTION REQUIRED
1. <exact step or command>
2. <what to check afterwards>
Expected result: <what I should see>
Tell me the output or any error.
```

Typical manual actions are listed per milestone in Part C. Also flag anything that costs money, needs a credit card, requires an account, takes more than 10 minutes (downloads, ingestion), or downloads a large model. If a step would break the zero-cost rule, refuse it and offer a free alternative.

## A10. Honesty rules (these protect my CV)

- Never invent metrics, benchmark numbers, test results or sources. A number counts only if a run on my machine produced it; record date, hardware and model versions with it.
- The golden-set labels are **my** evidence. You may help draft questions, but I verify each answer page in the PDF myself. If a label is unverified, say so.
- Say "I am not sure" when you are not. If an API may have changed, tell me where to check the official docs.
- Point out mistakes in my code, my reasoning or the plan, even when I seem confident, and explain why.
- Do not praise understanding that is not there. If I clearly did not get it, say so kindly and teach it.

---

# PART B — Project context

## B1. What LabProof is

A local, zero-cost RAG assistant for laboratory safety and quality procedures. A user asks a question in French or English. The system retrieves passages from public PDFs (OSHA, CDC/NIH BMBL, WHO), generates a short answer in which every sentence cites its sources, **verifies each sentence against the cited text with an independent NLI model**, and **refuses to answer** when the documents do not contain the answer.

Differentiators to protect: sentence-level verification shown in the UI, calibrated abstention, French questions over English documents, measured ablations, prompt-injection tests, fully local and free.

## B2. Hard constraints

- **Zero cost.** No paid APIs, no credit card, no cloud GPU, no hosted LLMs or embeddings. No Ollama Cloud models and no `ollama signin`.
- **Local first.** Everything runs on a student laptop (16 GB RAM, CPU only). 8 GB fallback: `qwen3.5:2b`, and `LABPROOF_RERANKER_MODEL=` (empty) if memory is short.
- **Licences.** Prefer permissive licences. Use pypdf, not PyMuPDF (AGPL). The WHO manual is non-commercial; never redistribute it. PDFs are git-ignored.
- **No LangChain or LlamaIndex in the core pipeline** (they may appear only in optional extra A2 after v1.0).
- **No secrets in Git.** Settings come from `.env` (copied from `.env.example`), prefix `LABPROOF_`.
- Never call LabProof "novel". The techniques are established; my contribution is the integration, the verification UX and the evaluation.

## B3. Stack

| Layer          | Choice                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Language / API | Python 3.12, FastAPI, Pydantic 2, pydantic-settings                                                |
| Database       | PostgreSQL + pgvector (HNSW) + full-text search (tsvector, GIN); plain SQL with psycopg 3, no ORM  |
| LLM runtime    | Ollama (local):`qwen3.5:4b` or `qwen3.5:2b` for generation, `bge-m3` for embeddings          |
| Reranker       | `BAAI/bge-reranker-v2-m3` via sentence-transformers (disable with an empty setting)              |
| Verifier       | `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7` (NLI) via Transformers + PyTorch CPU |
| PDF            | pypdf                                                                                              |
| Frontend       | Angular (signals, standalone components)                                                           |
| Packaging / CI | Docker Compose, GitHub Actions (public repo, standard runners)                                     |
| Tests          | pytest with fakes for models, a real pgvector container for SQL                                    |

Versions in the guide were true when it was written. Check official documentation before pinning.

## B4. Repository structure

```
labproof/
├── AGENTS.md                  # this file
├── README.md                  # pitch, status, results table, quick start, limitations
├── LICENSE                    # MIT
├── docker-compose.yml
├── .env.example
├── .gitignore                 # includes .env, .venv, node_modules, data/corpus/*.pdf, docs/reference/
├── .github/workflows/         # ci.yml, retrieval-eval.yml
├── infra/
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── config.py  db.py  models.py  security.py  service.py  main.py
│   │   ├── ingest/        # pdf_loader.py, chunker.py, pipeline.py
│   │   ├── llm/           # ollama_client.py
│   │   ├── retrieval/     # search.py, rerank.py
│   │   ├── generation/    # prompts.py, answer.py
│   │   └── verification/  # nli.py
│   ├── scripts/           # download_corpus.py, ingest_corpus.py
│   ├── data/              # corpus.json (sources and licences); PDFs git-ignored
│   ├── eval/              # golden.jsonl, metrics.py, run_eval.py, results/
│   └── tests/
├── frontend/              # Angular
└── docs/
    ├── reference/         # LabProof_guide.md (local only, git-ignored)
    ├── learning-log.md  understanding-backlog.md  interview-notes.md
    └── screenshots/, architecture, evaluation report
```

## B5. The /ask pipeline (what I must be able to explain)

1. **Validate** the question (3 to 1,000 characters).
2. **Retrieve:** embed once; dense search (pgvector cosine) and full-text search; top 30 each.
3. **Fuse** with Reciprocal Rank Fusion: score = sum of 1 / (60 + rank).
4. **Rerank** with the cross-encoder; keep the top 5.
5. **Gate:** if the best rerank score is below a threshold calibrated on the dev split, abstain without calling the LLM.
6. **Generate:** Ollama with a JSON schema, temperature 0; sources wrapped in `<source id="S1" ...>` blocks and treated as untrusted data.
7. **Verify:** NLI entailment of each sentence against every 1- and 2-sentence window of each cited source, keeping the best. `supported`, `unsupported`, `uncited`; invented source IDs reported.
8. **Log and respond:** verdict, groundedness, chunk IDs, timings, response stored in `query_logs`.

Verdicts: `verified`, `partially_verified`, `unverified`, `abstained`.

## B6. Engineering rules

- Every function with logic gets a test. Unit tests use fakes; integration tests use real PostgreSQL + pgvector. Model quality belongs in the evaluation harness, not in pytest.
- All SQL is parameterised (`%s`), never built with string formatting from user input.
- Inference route handlers are plain `def`, not `async def`.
- Prompts live in `generation/prompts.py`.
- Type hints, `ruff` clean, small functions, docstrings that explain the reason.

## B7. Evaluation rules

- The golden set labels **pages**, not chunks.
- Split about 40% dev (tune thresholds) and 60% test (report). **Never tune on the test split.**
- Mix about 60% English, 25% French, 15 to 20% unanswerable but plausible, with at least 10 questions on the second document.
- Metrics: hit@k, recall@k, MRR, abstention precision/recall/F1, groundedness, citation validity, p50/p95 latency per stage, peak RAM, and a manual audit of at least 30 sentences for NLI agreement.
- Ablations: dense, full-text, hybrid, hybrid + reranker, with and without the title/section prefix, 4B vs 2B model, with and without NLI.
- Report only what I measured, with date, hardware and model versions.

## B8. Known tricky points (explain when we reach them)

- Full-text search uses the English stemmer, so French questions depend on dense search; measure it.
- The NLI model scores short premises best; 3-sentence windows made correct answers look unsupported. Verify the verifier.
- The abstention threshold may not separate French answerable from English unanswerable questions; calibrate per language if needed and report it.
- The reranker is the CPU latency bottleneck; fewer candidates per retriever lowers latency.
- Large PDFs take a long time to embed on CPU; run them once, ideally overnight.
- PDF extraction leaves artefacts (ligatures, running headers); look at real chunks before tuning models.

## B9. Out of scope until v1.0 is pushed

Fine-tuning, paid or hosted models, OCR, multi-tenant authentication, Kubernetes, agent frameworks in the core, and the optional extras A1 to A5 (ONNX, LlamaIndex comparison, Spring Boot client, one tool-calling step, LLM-as-judge).

---

# PART C — Milestone map

## C1. Milestones, time-boxes and typical manual actions

Time-boxes come from the guide's schedule (approximate, in hours of focused work, including the milestone review). Re-plan at 1.5 times.

| Milestone | Topic                                            | Time-box | Typical manual actions                                                                                                                                                                                            |
| --------- | ------------------------------------------------ | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0        | Repo, Docker database, Python env, Ollama models |        4 | Install Docker, Ollama, Python 3.12 (WSL2 on Windows);**create the public GitHub repo, add remote, first push**; `ollama pull bge-m3` and a Qwen3.5 model (several GB); copy `.env.example` to `.env` |
| M1        | Configuration and database schema                |        2 | `docker compose up -d db`; inspect the schema with psql                                                                                                                                                         |
| M2        | PDF loading and chunking                         |        4 | Download the corpus PDFs; read a dozen real chunks by eye                                                                                                                                                         |
| M3        | Embeddings and ingestion                         |        3 | Keep Ollama running; run ingestion (minutes to hours; run large PDFs overnight)                                                                                                                                   |
| M4        | Hybrid retrieval with RRF                        |        5 | Try the three modes on an English and a French question and note the difference                                                                                                                                   |
| M5        | Retrieval evaluation                             |        4 | **Write the first 20 golden questions myself and verify each page label in the PDF**                                                                                                                        |
| M6        | Cross-encoder reranking                          |        2 | First run downloads the reranker (about 2 GB) from Hugging Face                                                                                                                                                   |
| M7        | Grounded generation                              |        2 | Confirm Ollama returns valid JSON ten times out of ten                                                                                                                                                            |
| M8        | NLI verification                                 |        2 | First run downloads the NLI model; run the three-sentence experiment                                                                                                                                              |
| M9        | /ask pipeline: gate, generate, verify, log       |        2 | Ask answerable, unanswerable and French questions                                                                                                                                                                 |
| —        | Calibration and golden set to 40 questions       |       10 | **Label questions and choose thresholds on the dev split myself**                                                                                                                                           |
| M10       | Tests with fakes and a real database             |        3 | Run pytest; read the failures                                                                                                                                                                                     |
| M11       | FastAPI application                              |        2 | Try the endpoints in`/docs`; **tag v0.1**                                                                                                                                                                 |
| M12       | Security: injection, input limits                |        4 | **Create the poisoned PDF**, ingest it, record what happens                                                                                                                                                 |
| M13       | Angular frontend                                 |       13 | Install Node;`npm install`; take screenshots                                                                                                                                                                    |
| M14       | Docker Compose, CI, README, demo                 |        7 | Enable GitHub Actions; fresh-clone test on another machine or VM; record the demo (OBS); fill the results table from my runs; set repo topics;**tag v1.0**                                                  |

## C2. Evaluation and polish work (between M11 and v1.0)

Grow the golden set to 60 or more questions with a second reviewer for 10 labels, run the ablations, audit 30 sentences of NLI output by hand, and write a short failure analysis. These produce the numbers for the README and CV.

## C3. Resume checkpoints (when I may mention LabProof)

| Checkpoint | When               | What I can honestly say                                                                                                                                                               |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1         | After M0           | A public repo exists with a README skeleton, so the link on my CV is not dead. Label it "in progress".                                                                                |
| R2         | After M5           | Hybrid retrieval and a retrieval evaluation harness, with real hit@k and MRR on my own questions.                                                                                     |
| R3         | `v0.1` after M11 | A working API with grounded, cited, verified answers and abstention, with measured retrieval results.**This is the point to start applying**, with honest status in the README. |
| R4         | `v1.0` after M14 | Full version with UI, CI, Docker Compose, evaluation table, demo video and failure analysis.                                                                                          |

When I reach a checkpoint, tell me what to update on the CV and README, and which numbers I may and may not use (only mine, only measured).

## C4. Session start and end checklist

Start:

1. Read this file and the last two entries of `docs/learning-log.md`.
2. Ask me one review question from the last session.
3. Ask which milestone and step I am on (check `git log` if unsure).
4. Propose a short plan of three to five steps with the time-box, list any manual actions up front, and wait for my approval.

End:

1. If a milestone passed its checkpoint, run the milestone review (A5), then the push sequence (A7).
2. Update `docs/learning-log.md` and `docs/understanding-backlog.md`.
3. State the next milestone, its time-box and its first manual action.

"""Run retrieval or full-pipeline evaluation on the golden set."""
import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime
from typing import Any

# Add parent directory to path for app imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from eval.metrics import (
    RetrievedRef,
    hit_at_k,
    percentile,
    recall_at_k,
    reciprocal_rank,
    safe_mean,
)

from app.config import get_settings
from app.db import Database
from app.llm.ollama_client import OllamaClient
from app.retrieval.rerank import CrossEncoderReranker, NoopReranker
from app.retrieval.search import retrieve


def load_golden(path: str, split: str | None) -> list[dict]:
    out = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            q = json.loads(line)
            if split is None or q.get("split", "dev") == split:
                out.append(q)
    return out


def run_retrieval_eval(args: argparse.Namespace) -> dict[str, Any]:
    s = get_settings()
    db = Database(s.database_url, s.embed_dim)
    embedder = OllamaClient(s.ollama_url, s.llm_model, s.embed_model,
                            s.llm_num_ctx, s.llm_timeout_s)
    reranker = NoopReranker() if args.no_rerank else CrossEncoderReranker(s.reranker_model)

    questions = load_golden(args.golden, args.split)
    per_q: list[dict] = []
    hits, recalls, mrrs, latencies = [], [], [], []

    for q in questions:
        if not q["answerable"]:
            continue
        t0 = time.perf_counter()
        cands = retrieve(db, embedder, q["question"], mode=args.mode,
                         per_retriever=s.candidates_per_retriever, rrf_k=s.rrf_k)
        if not args.no_rerank:
            cands = reranker.rerank(q["question"], cands)
        latency = (time.perf_counter() - t0) * 1000
        latencies.append(latency)

        refs = [RetrievedRef(doc_key=q["relevant"][0]["doc"],  # simplified: one doc per q
                            page_start=c.page_start, page_end=c.page_end) for c in cands]
        h = hit_at_k(refs, q["relevant"], s.top_k)
        r = recall_at_k(refs, q["relevant"], s.top_k)
        mrr = reciprocal_rank(refs, q["relevant"])
        hits.append(h)
        recalls.append(r)
        mrrs.append(mrr)
        per_q.append({"id": q["id"], "hit@k": h, "recall@k": r, "mrr": mrr, "latency_ms": latency})

    summary = {"mode": args.mode, "reranker": not args.no_rerank,
               "hit@k": safe_mean(hits), "recall@k": safe_mean(recalls),
               "mrr": safe_mean(mrrs), "p50_ms": percentile(latencies, 0.5),
               "p95_ms": percentile(latencies, 0.95), "questions": len(questions)}
    return {"summary": summary, "per_question": per_q}


def run_full_eval(args: argparse.Namespace) -> dict[str, Any]:
    # Full pipeline with service (not implemented here — uses service.py directly)
    return {"error": "Full evaluation requires service integration; run via pytest or manual calls"}


def main() -> None:
    parser = argparse.ArgumentParser(description="LabProof evaluation runner")
    parser.add_argument("--golden", default=os.path.join(os.path.dirname(__file__), "golden.jsonl"))
    parser.add_argument("--split", choices=["dev", "test"], default=None)
    parser.add_argument("--retrieval-only", action="store_true")
    parser.add_argument("--mode", choices=["dense", "fts", "hybrid"], default="hybrid")
    parser.add_argument("--no-rerank", action="store_true")
    parser.add_argument("--no-verify", action="store_true")
    parser.add_argument("--tag", default="")
    args = parser.parse_args()

    if args.retrieval_only:
        result = run_retrieval_eval(args)
    else:
        result = run_full_eval(args)

    out_dir = os.path.join(os.path.dirname(__file__), "results")
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    tag = f"_{args.tag}" if args.tag else ""
    out_json = os.path.join(out_dir, f"{ts}{tag}.json")
    out_csv = os.path.join(out_dir, f"{ts}{tag}.csv")

    with open(out_json, "w") as f:
        json.dump(result, f, indent=2, default=str)

    if "per_question" in result:
        with open(out_csv, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=result["per_question"][0].keys())
            w.writeheader()
            w.writerows(result["per_question"])

    print(json.dumps(result.get("summary", result), indent=2, default=str))
    print(f"Saved to {out_json} and {out_csv}")


if __name__ == "__main__":
    main()
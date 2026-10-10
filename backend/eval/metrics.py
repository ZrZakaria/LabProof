"""Pure metric functions (unit-tested in tests/test_metrics.py).

Relevance is defined at the (document, page) level rather than by chunk id, so
the golden set stays valid when you change the chunking strategy - which is
exactly the experiment you want to run.
"""
from dataclasses import dataclass
from statistics import mean


@dataclass(frozen=True)
class RetrievedRef:
    doc_key: str
    page_start: int
    page_end: int


def is_relevant(ref: RetrievedRef, relevant: list[dict]) -> bool:
    for rel in relevant:
        if rel["doc"] == ref.doc_key and any(ref.page_start <= p <= ref.page_end for p in rel["pages"]):
            return True
    return False


def hit_at_k(refs: list[RetrievedRef], relevant: list[dict], k: int) -> float:
    return float(any(is_relevant(r, relevant) for r in refs[:k]))


def recall_at_k(refs: list[RetrievedRef], relevant: list[dict], k: int) -> float:
    """Fraction of relevant (doc, page) pairs covered by the top-k chunks."""
    wanted = {(rel["doc"], p) for rel in relevant for p in rel["pages"]}
    if not wanted:
        return 0.0
    got = {(r.doc_key, p) for r in refs[:k] for p in range(r.page_start, r.page_end + 1)}
    return len(wanted & got) / len(wanted)


def reciprocal_rank(refs: list[RetrievedRef], relevant: list[dict]) -> float:
    for i, r in enumerate(refs, start=1):
        if is_relevant(r, relevant):
            return 1.0 / i
    return 0.0


def abstention_scores(should_abstain: list[bool], did_abstain: list[bool]) -> dict[str, float]:
    """Positive class = 'the system should abstain'."""
    tp = sum(s and d for s, d in zip(should_abstain, did_abstain, strict=True))
    fp = sum((not s) and d for s, d in zip(should_abstain, did_abstain, strict=True))
    fn = sum(s and (not d) for s, d in zip(should_abstain, did_abstain, strict=True))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1, "tp": tp, "fp": fp, "fn": fn}


def percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    v = sorted(values)
    idx = min(len(v) - 1, max(0, round(q * (len(v) - 1))))
    return v[idx]


def safe_mean(values: list[float]) -> float | None:
    return round(mean(values), 4) if values else None
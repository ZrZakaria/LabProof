"""Claim-level citation verification with a Natural Language Inference model.

For every answer sentence (the *hypothesis*) we ask an NLI classifier whether
the text of the sources it cites (the *premise*) ENTAILS it. A sentence is:
  supported   - best P(entailment) over its cited sources >= threshold
  unsupported - cited, but no cited source entails it  (likely hallucination / wrong citation)
  uncited     - no valid citation at all
This is deterministic, runs on CPU, and is independent of the generator LLM
(a model grading its own output is a weaker check).
"""
from typing import Protocol

from app.ingest.chunker import split_sentences
from app.models import AnswerSentence, DraftAnswer
from app.retrieval.search import Candidate


class EntailmentScorer(Protocol):
    def score(self, pairs: list[tuple[str, str]]) -> list[float]: ...


class NLIScorer:
    """Wraps a Hugging Face sequence-classification NLI model (premise, hypothesis)."""

    def __init__(self, model_name: str, device: str = "cpu", max_length: int = 512):
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        self._torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name).to(device).eval()
        self.device, self.max_length = device, max_length
        labels = {v.lower(): k for k, v in self.model.config.id2label.items()}
        self.entail_idx = labels["entailment"]          # read from config, never hard-code

    def score(self, pairs: list[tuple[str, str]], batch_size: int = 8) -> list[float]:
        out: list[float] = []
        for i in range(0, len(pairs), batch_size):
            batch = pairs[i:i + batch_size]
            enc = self.tokenizer([p for p, _ in batch], [h for _, h in batch], truncation="only_first",
                                 max_length=self.max_length, padding=True, return_tensors="pt").to(self.device)
            with self._torch.no_grad():
                probs = self._torch.softmax(self.model(**enc).logits, dim=-1)
            out.extend(probs[:, self.entail_idx].tolist())
        return out


def premise_windows(text: str, sizes: tuple[int, ...] = (1, 2)) -> list[str]:
    """NLI models are trained on short premises: extra sentences dilute the signal.
    Measured on OSHA 3404: the exact source sentence scored P(entail)=0.99 as a
    1-sentence premise, 0.75 inside a 2-sentence window and 0.01 inside a 3-sentence
    window. We therefore score every 1- and 2-sentence window (2 covers claims that
    combine adjacent sentences) and keep the best score."""
    sents = split_sentences(text)
    if len(sents) <= 1:
        return [text]
    windows: list[str] = []
    for size in sizes:
        windows += [" ".join(sents[i:i + size]) for i in range(0, len(sents) - size + 1)]
    return list(dict.fromkeys(windows))       # de-duplicate, keep order


def verify(draft: DraftAnswer, id_map: dict[str, Candidate], scorer: EntailmentScorer | None,
           threshold: float = 0.5) -> list[AnswerSentence]:
    results: list[AnswerSentence] = []
    pairs: list[tuple[str, str]] = []
    owners: list[int] = []                       # pairs[i] belongs to results[owners[i]]
    for idx, s in enumerate(draft.sentences):
        valid = [c for c in s.citations if c in id_map]
        invalid = [c for c in s.citations if c not in id_map]
        status = "uncited" if not valid else ("unverified" if scorer is None else "unsupported")
        results.append(AnswerSentence(text=s.text, citations=valid, status=status,
                                      invalid_citations=invalid))
        if scorer is not None:
            for sid in valid:
                for prem in premise_windows(id_map[sid].content):
                    pairs.append((prem, s.text))
                    owners.append(idx)
    if scorer is None or not pairs:
        return results
    for owner, p in zip(owners, scorer.score(pairs), strict=True):
        best = results[owner].entailment
        results[owner].entailment = p if best is None else max(best, p)
    for r in results:
        if r.entailment is not None and r.entailment >= threshold:
            r.status = "supported"
    return results
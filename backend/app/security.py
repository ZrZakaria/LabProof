"""Cheap, transparent defences against indirect prompt injection.

This is NOT a complete defence (no heuristic is). It is one layer of several:
  1. flag suspicious chunks at ingestion time (this module),
  2. wrap retrieved text in clearly delimited <source> blocks and tell the model
     that sources are data, never instructions (generation/prompts.py),
  3. constrain the output to a JSON schema, so the model cannot "call tools"
     or change format (llm/ollama_client.py),
  4. verify every sentence against the cited evidence (verification/nli.py).
"""
import re

_INJECTION_PATTERNS = [
    r"ignore (all |any )?(previous|prior|above) (instructions|prompts?)",
    r"disregard (the )?(system|previous) (prompt|instructions)",
    r"you are now\b",
    r"\bsystem prompt\b",
    r"reveal (your|the) (instructions|prompt)",
    r"ignore(z)? (les|toutes les) instructions",          # French variant
    r"<\s*/?\s*(system|assistant|source)\s*>",            # tries to break our delimiters
]
_INJECTION_RE = re.compile("|".join(_INJECTION_PATTERNS), re.IGNORECASE)


def looks_like_injection(text: str) -> bool:
    return bool(_INJECTION_RE.search(text))


def sanitize_for_prompt(text: str) -> str:
    """Neutralise our own delimiter tags so a document cannot close a <source> block."""
    return re.sub(r"<\s*(/?)\s*(source|system|assistant)\s*>", r"[\1\2]", text, flags=re.IGNORECASE)
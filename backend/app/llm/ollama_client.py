"""Thin, typed wrapper around the local Ollama REST API.

Only two endpoints are needed:
  POST /api/embed  -> embeddings for a batch of texts
  POST /api/chat   -> chat completion, optionally constrained by a JSON schema
"""
from typing import Any, Protocol

import httpx


class LLMError(RuntimeError):
    """Raised when the local model server is unreachable or returns garbage."""


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...


class ChatModel(Protocol):
    def chat_json(self, system: str, user: str, schema: dict[str, Any]) -> str: ...


class OllamaClient:
    def __init__(self, base_url: str, llm_model: str, embed_model: str,
                 num_ctx: int = 8192, timeout_s: float = 300.0):
        self.llm_model = llm_model
        self.embed_model = embed_model
        self.num_ctx = num_ctx
        self._http = httpx.Client(base_url=base_url, timeout=timeout_s)

    # ---------------------------------------------------------------- embeddings
    def embed(self, texts: list[str], batch_size: int = 16) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            data = self._post("/api/embed", {"model": self.embed_model, "input": batch})
            vectors = data.get("embeddings")
            if not vectors or len(vectors) != len(batch):
                raise LLMError(f"Unexpected embedding response for model {self.embed_model}")
            out.extend(vectors)
        return out

    # ---------------------------------------------------------------- generation
    def chat_json(self, system: str, user: str, schema: dict[str, Any]) -> str:
        payload = {
            "model": self.llm_model,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}],
            "stream": False,
            "think": False,          # Qwen3.5 is a "thinking" model; we want direct JSON
            "format": schema,        # Ollama constrains decoding to this JSON schema
            "options": {"temperature": 0, "num_ctx": self.num_ctx},
        }
        data = self._post("/api/chat", payload)
        try:
            return data["message"]["content"]
        except (KeyError, TypeError) as exc:
            raise LLMError("Malformed chat response from Ollama") from exc

    # ---------------------------------------------------------------- health
    def ping(self) -> bool:
        try:
            return self._http.get("/api/version").status_code == 200
        except httpx.HTTPError:
            return False

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            r = self._http.post(path, json=payload)
        except httpx.HTTPError as exc:
            raise LLMError(f"Ollama unreachable at {self._http.base_url}: {exc}") from exc
        if r.status_code != 200:
            raise LLMError(f"Ollama {path} returned {r.status_code}: {r.text[:300]}")
        return r.json()
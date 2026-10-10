"""Ingest the corpus PDFs listed in data/corpus.json into the database."""
import json
import os

from app.config import get_settings
from app.db import Database
from app.ingest.pipeline import ingest_pdf
from app.llm.ollama_client import OllamaClient


def main() -> None:
    s = get_settings()
    db = Database(s.database_url, s.embed_dim)
    ollama = OllamaClient(s.ollama_url, s.llm_model, s.embed_model,
                          s.llm_num_ctx, s.llm_timeout_s)

    corpus_path = os.path.join(os.path.dirname(__file__), "..", "data", "corpus.json")
    with open(corpus_path) as f:
        corpus = json.load(f)

    for src in corpus["sources"]:
        pdf_path = os.path.join(os.path.dirname(corpus_path), src["filename"])
        if not os.path.exists(pdf_path):
            print(f"[skip] {src['key']}: {pdf_path} not found (run download_corpus.py first)")
            continue
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        r = ingest_pdf(db, ollama, pdf_bytes, src["title"], src.get("url"), src.get("license"),
                       s.chunk_max_chars, s.chunk_overlap_chars)
        status = "exists" if r.already_existed else "ingested"
        print(f"[{status}] {src['key']}: {r.pages} pages, {r.chunks} chunks, {r.suspicious_chunks} suspicious")


if __name__ == "__main__":
    main()

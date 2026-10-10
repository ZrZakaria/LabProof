"""PDF -> list of (page_number, cleaned_text).

pypdf (BSD-3) is used instead of PyMuPDF (AGPL) to keep licensing simple.
Scanned PDFs without a text layer are rejected explicitly instead of
silently producing empty chunks.
"""
import re
from collections import Counter
from io import BytesIO

from pypdf import PdfReader


class EmptyDocumentError(ValueError):
    pass


def extract_pages(pdf_bytes: bytes) -> list[tuple[int, str]]:
    reader = PdfReader(BytesIO(pdf_bytes))
    raw = [(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]
    if sum(len(t.strip()) for _, t in raw) < 200:
        raise EmptyDocumentError("No extractable text (scanned PDF?). Run OCR first.")
    return clean_pages(raw)


def clean_pages(pages: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """Remove running headers/footers and fix hyphenation / spacing."""
    # A line that appears on more than 40% of pages (e.g. the publication title
    # in a running header) is boilerplate. Page numbers are normalised first.
    def norm(line: str) -> str:
        return re.sub(r"\d+", "#", line.strip().lower())

    counts: Counter[str] = Counter()
    for _, text in pages:
        counts.update({norm(line) for line in text.splitlines() if line.strip()})
    threshold = max(3, int(0.4 * len(pages)))
    boilerplate = {line for line, c in counts.items() if c >= threshold and len(line) < 120}

    cleaned = []
    for page_no, text in pages:
        lines = [ln for ln in text.splitlines() if norm(ln) not in boilerplate]
        body = "\n".join(lines)
        body = re.sub(r"(\w)-\n(\w)", r"\1\2", body)        # de-hyphenate line breaks
        body = re.sub(r"[ \t\u00a0]+", " ", body)             # collapse spaces
        body = re.sub(r"\n{3,}", "\n\n", body)
        cleaned.append((page_no, body.strip()))
    return cleaned
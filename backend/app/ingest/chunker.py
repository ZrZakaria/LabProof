"""Structure-aware chunker.

Design goals (each one is an interview talking point):
  * Chunks never cross a detected section heading -> retrieved context stays on-topic.
  * Chunks are packed from whole sentences -> NLI verification sees complete claims.
  * Each chunk remembers its page range -> citations can point to exact pages.
  * Overlap is sentence-based, not character-based -> no half-words at chunk edges.
"""
import re
from dataclasses import dataclass, field

_NUMBERED_HEADING = re.compile(r"^(\d+(\.\d+){0,3}|[IVX]+\.|[A-Z]\.)\s+[A-Z][^.]{2,80}$")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?;])\s+(?=[A-Z0-9\"'(\u2022•-])")


def is_heading(line: str) -> bool:
    s = line.strip()
    if not (3 <= len(s) <= 90) or s.endswith((".", ",", ";")):
        return False
    if _NUMBERED_HEADING.match(s):
        return True
    # ALL-CAPS line of 2-12 words without digits ("EYE PROTECTION"). Lines with digits
    # are usually running headers or codes ("OSHA 3404-11R"), single words are often
    # text inside figures ("BIOHAZARD") - both are rejected.
    letters = [ch for ch in s if ch.isalpha()]
    return (len(letters) >= 4 and all(ch.isupper() for ch in letters)
            and not any(ch.isdigit() for ch in s) and 2 <= len(s.split()) <= 12)


def split_sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()] if text else []


@dataclass
class Chunk:
    index: int
    page_start: int
    page_end: int
    section: str
    content: str


@dataclass
class _Unit:                      # one sentence + where it came from
    page: int
    text: str


@dataclass
class _Builder:
    max_chars: int
    overlap_chars: int
    chunks: list[Chunk] = field(default_factory=list)
    units: list[_Unit] = field(default_factory=list)
    section: str = ""

    def add(self, unit: _Unit) -> None:
        for piece in self._hard_split(unit):
            if self.units and self._size() + len(piece.text) + 1 > self.max_chars:
                self.flush(keep_overlap=True)
            self.units.append(piece)

    def new_section(self, title: str) -> None:
        self.flush(keep_overlap=False)
        self.section = title

    def flush(self, keep_overlap: bool) -> None:
        if not self.units:
            return
        self.chunks.append(Chunk(
            index=len(self.chunks),
            page_start=self.units[0].page,
            page_end=self.units[-1].page,
            section=self.section,
            content=" ".join(u.text for u in self.units),
        ))
        if keep_overlap:
            tail, size = [], 0
            for u in reversed(self.units):
                if size + len(u.text) > self.overlap_chars:
                    break
                tail.insert(0, u)
                size += len(u.text) + 1
            self.units = tail
        else:
            self.units = []

    def _size(self) -> int:
        return sum(len(u.text) + 1 for u in self.units)

    def _hard_split(self, unit: _Unit) -> list[_Unit]:
        if len(unit.text) <= self.max_chars:
            return [unit]
        words, parts, cur = unit.text.split(), [], ""
        for w in words:
            if len(cur) + len(w) + 1 > self.max_chars and cur:
                parts.append(cur)
                cur = w
            else:
                cur = f"{cur} {w}".strip()
        if cur:
            parts.append(cur)
        return [_Unit(unit.page, p) for p in parts]


def chunk_pages(pages: list[tuple[int, str]], max_chars: int = 1200,
                overlap_chars: int = 200) -> list[Chunk]:
    if overlap_chars >= max_chars:
        raise ValueError("overlap_chars must be smaller than max_chars")
    b = _Builder(max_chars=max_chars, overlap_chars=overlap_chars)
    for page_no, text in pages:
        paragraph: list[str] = []
        for line in text.splitlines() + [""]:
            if is_heading(line):
                for s in split_sentences(" ".join(paragraph)):
                    b.add(_Unit(page_no, s))
                paragraph = []
                b.new_section(line.strip())
            elif line.strip():
                paragraph.append(line.strip())
        for s in split_sentences(" ".join(paragraph)):
            b.add(_Unit(page_no, s))
    b.flush(keep_overlap=False)
    # drop near-empty fragments (e.g. a lone page number that survived cleaning)
    kept = [c for c in b.chunks if len(c.content) >= 40]
    for i, c in enumerate(kept):
        c.index = i
    return kept
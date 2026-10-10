"""Download the three corpus PDFs from their official sources.

If a primary URL fails, we try an Internet Archive copy. This script is
idempotent: running it twice leaves the files as they are.
"""
import os
import hashlib
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

# URLs from corpus.json
SOURCES = [
    {
        "key": "osha3404",
        "filename": "osha3404.pdf",
        "primary": "https://www.osha.gov/sites/default/files/publications/OSHA3404LABORATORY-SAFETY-GUIDANCE.pdf",
        "fallback": "https://web.archive.org/web/2024/https://www.osha.gov/sites/default/files/publications/OSHA3404LABORATORY-SAFETY-GUIDANCE.pdf",
    },
    {
        "key": "bmbL6",
        "filename": "bmbl6.pdf",
        "primary": "https://www.cdc.gov/labs/pdf/CDC-BMBL-6th-Edition-P.pdf",
        "fallback": "https://web.archive.org/web/2024/https://www.cdc.gov/labs/pdf/CDC-BMBL-6th-Edition-P.pdf",
    },
    {
        "key": "who_lbm4",
        "filename": "who_lbm4.pdf",
        "primary": "https://www.who.int/publications/i/item/9789240011311",
        "fallback": "https://web.archive.org/web/2024/https://www.who.int/publications/i/item/9789240011311",
    },
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "corpus")
os.makedirs(DATA_DIR, exist_ok=True)


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: str, name: str) -> bool:
    try:
        req = Request(url, headers={"User-Agent": "LabProof/0.1"})
        with urlopen(req, timeout=60) as r, open(dest, "wb") as f:
            f.write(r.read())
        print(f"[{name}] downloaded from {url}")
        return True
    except (HTTPError, URLError, TimeoutError) as exc:
        print(f"[{name}] failed to download from {url}: {exc}")
        return False


def main() -> None:
    for src in SOURCES:
        dest = os.path.join(DATA_DIR, src["filename"])
        if os.path.exists(dest):
            print(f"[{src['key']}] already exists at {dest} (sha256: {sha256_file(dest)})")
            continue
        ok = download(src["primary"], dest, src["key"])
        if not ok and src.get("fallback"):
            ok = download(src["fallback"], dest, src["key"])
        if not ok:
            print(f"[{src['key']}] ERROR: both primary and fallback failed. Download manually and place at {dest}")


if __name__ == "__main__":
    main()
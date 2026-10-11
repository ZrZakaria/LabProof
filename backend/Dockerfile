# CPU-only image: we deliberately install the CPU wheel for torch so the
# container stays small and runs on any machine without a GPU.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system deps needed by psycopg (libpq) and pypdf.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY eval ./eval
COPY scripts ./scripts
COPY data ./data

RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.14.1 \
    && pip install --no-cache-dir -e ".[dev]"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# Application image — lightweight, rebuilds fast.
# Base image (labproof-base) contains torch/transformers/sentence-transformers.
# Build base once: docker build -f Dockerfile.base -t labproof-base .

FROM labproof-base

# Switch to root for pip install, then back to appuser
USER root

# System deps for psycopg (libpq) and pypdf (already in base, but ensure)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY eval ./eval
COPY scripts ./scripts
COPY data ./data

# Install only your app dependencies (lightweight, fast)
RUN pip install --no-cache-dir -e ".[dev]"

# Switch back to non-root user
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
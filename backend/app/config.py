"""Central configuration. Every value can be overridden with an environment
variable (prefix LABPROOF_) or a .env file. Nothing is hard-coded elsewhere."""
import json
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LABPROOF_", env_file=".env", extra="ignore")

    # --- Infrastructure -----------------------------------------------------
    database_url: str = "postgresql://labproof:labproof@localhost:5432/labproof"
    ollama_url: str = "http://localhost:11434"
    cors_origins: list[str] = ["http://localhost:4200"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Fallback: comma-separated
                return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # --- Models (all local, all free) ----------------------------------------
    llm_model: str = "qwen3.5:4b"          # use qwen3.5:2b on 8 GB RAM laptops
    embed_model: str = "bge-m3"            # 1024-dim, multilingual, MIT licence
    embed_dim: int = 1024
    reranker_model: str = "BAAI/bge-reranker-v2-m3"   # "" disables reranking
    nli_model: str = "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7"  # "" disables verification
    llm_num_ctx: int = 8192
    llm_timeout_s: float = 300.0

    # --- Ingestion -------------------------------------------------------------
    chunk_max_chars: int = 1200            # ~300 tokens; fits the NLI model's 512-token window
    chunk_overlap_chars: int = 200
    max_upload_mb: int = 25

    # --- Retrieval -------------------------------------------------------------
    retrieval_mode: str = "hybrid"         # dense | fts | hybrid
    candidates_per_retriever: int = 30
    rrf_k: int = 60
    top_k: int = 5                         # chunks sent to the LLM
    min_rerank_score: float = 0.05         # below this -> abstain without calling the LLM (calibrate!)

    # --- Verification ----------------------------------------------------------
    entailment_threshold: float = 0.5      # P(entailment) needed to mark a sentence "supported"
    strict_mode: bool = False              # True -> drop unsupported sentences from the answer

    # --- API guard rails ------------------------------------------------------
    max_question_chars: int = 1000


@lru_cache
def get_settings() -> Settings:
    return Settings()

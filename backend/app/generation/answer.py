"""Grounded answer generation with schema-constrained output."""
import logging

from pydantic import ValidationError

from app.generation.prompts import SYSTEM_PROMPT, build_user_prompt
from app.llm.ollama_client import ChatModel
from app.models import DraftAnswer

log = logging.getLogger(__name__)
DRAFT_SCHEMA = DraftAnswer.model_json_schema()


class GenerationError(RuntimeError):
    pass


def generate_draft(llm: ChatModel, question: str, context: str, retries: int = 1) -> DraftAnswer:
    """Ask the LLM for a DraftAnswer. Even with constrained decoding we validate
    with Pydantic: small models can still emit empty strings or wrong ids."""
    user = build_user_prompt(question, context)
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        raw = llm.chat_json(SYSTEM_PROMPT, user, DRAFT_SCHEMA)
        try:
            draft = DraftAnswer.model_validate_json(raw)
            # normalise citation ids: "s2", "[S2]", " S2 " -> "S2"
            for s in draft.sentences:
                s.citations = sorted({c.strip().strip("[]").upper() for c in s.citations if c.strip()})
            draft.sentences = [s for s in draft.sentences if s.text.strip()]
            return draft
        except ValidationError as exc:
            last_err = exc
            log.warning("invalid LLM JSON (attempt %d): %s", attempt + 1, raw[:200])
    raise GenerationError(f"LLM returned invalid JSON after {retries + 1} attempts") from last_err

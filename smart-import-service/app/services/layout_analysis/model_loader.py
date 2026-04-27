"""Lazy singleton loader for HuggingFace LayoutLMv3 token-classification models."""

from __future__ import annotations

import logging
import os
import threading
from typing import Any

logger = logging.getLogger(__name__)

_loader_lock = threading.Lock()
_cached: tuple[Any, Any, str] | None = None  # (processor, model, model_id)

_DEFAULT_PROCESSOR_REPO = "microsoft/layoutlmv3-base"


def _desired_model_id() -> str:
    return os.getenv(
        "LAYOUT_MODEL_ID",
        "nielsr/layoutlmv3-finetuned-funsd",
    ).strip()


def _load_layout_processor(LayoutLMv3Processor: Any, model_id: str) -> Any:
    """
    Load LayoutLMv3Processor. Many FUNSD checkpoints omit image_processor_type in
    preprocessor_config.json; newer transformers need a processor from a full repo
    (e.g. microsoft/layoutlmv3-base).
    """
    explicit = os.getenv("LAYOUT_PROCESSOR_ID", "").strip()
    if explicit:
        logger.info("Loading LayoutLMv3 processor from %s", explicit)
        return LayoutLMv3Processor.from_pretrained(explicit)

    try:
        logger.info("Loading LayoutLMv3 processor from %s", model_id)
        return LayoutLMv3Processor.from_pretrained(model_id)
    except Exception as exc:
        logger.warning(
            "LayoutLMv3 processor from model repo failed (%s), falling back to %s",
            exc,
            _DEFAULT_PROCESSOR_REPO,
        )
        return LayoutLMv3Processor.from_pretrained(_DEFAULT_PROCESSOR_REPO)


def is_layout_model_enabled() -> bool:
    """Feature flag: default on unless explicitly disabled."""
    raw = os.getenv("LAYOUT_ENABLED", "true").strip().lower()
    return raw not in ("0", "false", "no", "off")


def get_layout_model() -> tuple[Any, Any, str] | None:
    """
    Return (processor, model, model_id) or None if transformers/torch unavailable
    or loading fails.
    """
    global _cached
    if _cached is not None:
        return _cached

    if not is_layout_model_enabled():
        logger.info("Layout analysis disabled via LAYOUT_ENABLED")
        return None

    model_id = _desired_model_id()

    with _loader_lock:
        if _cached is not None:
            return _cached
        try:
            import torch  # noqa: F401
            from transformers import (
                LayoutLMv3ForTokenClassification,
                LayoutLMv3Processor,
            )
        except ImportError as exc:
            logger.warning("LayoutLM deps missing — skipping HF layout: %s", exc)
            return None

        try:
            logger.info("Loading LayoutLMv3 token classifier weights: %s", model_id)
            processor = _load_layout_processor(LayoutLMv3Processor, model_id)
            model = LayoutLMv3ForTokenClassification.from_pretrained(model_id)
            model.eval()
            _cached = (processor, model, model_id)
            return _cached
        except Exception as exc:
            logger.warning("Failed to load layout model %s: %s", model_id, exc)
            return None


def reset_cache_for_tests() -> None:
    """Clear singleton (tests only)."""
    global _cached
    _cached = None

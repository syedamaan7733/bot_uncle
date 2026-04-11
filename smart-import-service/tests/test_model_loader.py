"""Layout model loader behavior."""

import os
from unittest.mock import MagicMock

import pytest

from app.services.layout_analysis.model_loader import (
    get_layout_model,
    is_layout_model_enabled,
    reset_cache_for_tests,
)


@pytest.fixture(autouse=True)
def _reset_layout_cache():
    reset_cache_for_tests()
    yield
    reset_cache_for_tests()


def test_layout_disabled_short_circuits(monkeypatch):
    monkeypatch.setenv("LAYOUT_ENABLED", "false")
    assert is_layout_model_enabled() is False
    assert get_layout_model() is None


def test_layout_enabled_default(monkeypatch):
    monkeypatch.delenv("LAYOUT_ENABLED", raising=False)
    assert is_layout_model_enabled() is True


def test_get_layout_model_uses_explicit_processor_and_model_repos(monkeypatch):
    monkeypatch.delenv("LAYOUT_ENABLED", raising=False)
    monkeypatch.setenv("LAYOUT_PROCESSOR_ID", "microsoft/layoutlmv3-base")
    monkeypatch.setenv("LAYOUT_MODEL_ID", "nielsr/layoutlmv3-finetuned-funsd")

    proc_repos: list[str] = []
    model_repos: list[str] = []

    def proc_from_pretrained(cls, repo_id: str, *args, **kwargs):
        proc_repos.append(repo_id)
        return object()

    def model_from_pretrained(cls, repo_id: str, *args, **kwargs):
        model_repos.append(repo_id)
        m = MagicMock()
        m.eval = MagicMock()
        return m

    import transformers

    monkeypatch.setattr(
        transformers.LayoutLMv3Processor,
        "from_pretrained",
        classmethod(proc_from_pretrained),
    )
    monkeypatch.setattr(
        transformers.LayoutLMv3ForTokenClassification,
        "from_pretrained",
        classmethod(model_from_pretrained),
    )

    out = get_layout_model()
    assert out is not None
    assert proc_repos == ["microsoft/layoutlmv3-base"]
    assert model_repos == ["nielsr/layoutlmv3-finetuned-funsd"]


def test_processor_falls_back_when_model_repo_processor_fails(monkeypatch):
    monkeypatch.delenv("LAYOUT_ENABLED", raising=False)
    monkeypatch.delenv("LAYOUT_PROCESSOR_ID", raising=False)
    monkeypatch.setenv("LAYOUT_MODEL_ID", "nielsr/layoutlmv3-finetuned-funsd")

    proc_repos: list[str] = []
    model_repos: list[str] = []

    def proc_from_pretrained(cls, repo_id: str, *args, **kwargs):
        proc_repos.append(repo_id)
        if repo_id == "nielsr/layoutlmv3-finetuned-funsd":
            raise ValueError("Unrecognized image processor")
        return object()

    def model_from_pretrained(cls, repo_id: str, *args, **kwargs):
        model_repos.append(repo_id)
        m = MagicMock()
        m.eval = MagicMock()
        return m

    import transformers

    monkeypatch.setattr(
        transformers.LayoutLMv3Processor,
        "from_pretrained",
        classmethod(proc_from_pretrained),
    )
    monkeypatch.setattr(
        transformers.LayoutLMv3ForTokenClassification,
        "from_pretrained",
        classmethod(model_from_pretrained),
    )

    out = get_layout_model()
    assert out is not None
    assert proc_repos == [
        "nielsr/layoutlmv3-finetuned-funsd",
        "microsoft/layoutlmv3-base",
    ]
    assert model_repos == ["nielsr/layoutlmv3-finetuned-funsd"]

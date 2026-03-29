"""Layout model loader behavior."""

import os

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

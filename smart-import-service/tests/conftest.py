"""
Pytest hooks: optional stub so test collection works without google-cloud-vision
installed or fully compatible with the local Python version.
"""

from __future__ import annotations

import os
import sys
import types

# ASGI lifespan in app.main pre-loads LayoutLMv3; avoid Hugging Face download during tests.
os.environ.setdefault("LAYOUT_WARMUP", "false")


def _ensure_google_vision_stub() -> None:
    if "google.cloud.vision" in sys.modules:
        return

    google_mod = sys.modules.get("google")
    if google_mod is None:
        google_mod = types.ModuleType("google")
        sys.modules["google"] = google_mod

    cloud_mod = types.ModuleType("google.cloud")
    vision_mod = types.ModuleType("google.cloud.vision")

    sys.modules["google.cloud"] = cloud_mod
    sys.modules["google.cloud.vision"] = vision_mod
    google_mod.cloud = cloud_mod  # type: ignore[attr-defined]
    cloud_mod.vision = vision_mod  # type: ignore[attr-defined]


_ensure_google_vision_stub()

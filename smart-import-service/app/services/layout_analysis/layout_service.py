"""Build layout blocks (LayoutLMv3 + OCR/OpenCV fallbacks) and mapping context."""

from __future__ import annotations

import asyncio
import logging
import os
from collections import Counter
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
from PIL import Image

from app.services.layout_analysis.fallback import (
    cluster_words_into_line_blocks,
    detect_image_candidate_boxes,
)
from app.services.layout_analysis.mapping_service import map_image_blocks_to_text
from app.services.layout_analysis.model_loader import (
    get_layout_model,
    is_layout_model_enabled,
)
from app.services.layout_analysis.schemas import LayoutBlock, LayoutContextPayload, OcrWordBox

logger = logging.getLogger(__name__)

_MAX_WORDS = int(os.getenv("LAYOUT_MAX_WORDS", "400"))


def _normalize_box_to_1000(
    bbox: Sequence[int], width: int, height: int
) -> List[int]:
    x1, y1, x2, y2 = bbox
    return [
        int(1000 * x1 / max(width, 1)),
        int(1000 * y1 / max(height, 1)),
        int(1000 * x2 / max(width, 1)),
        int(1000 * y2 / max(height, 1)),
    ]


def _point_in_box(x: float, y: float, bbox: Sequence[int]) -> bool:
    return bbox[0] <= x <= bbox[2] and bbox[1] <= y <= bbox[3]


def _majority_layout_label_for_line(
    line: LayoutBlock,
    words: Sequence[OcrWordBox],
    word_labels: Dict[int, str],
) -> Optional[str]:
    counts: Counter[str] = Counter()
    for idx, w in enumerate(words):
        cx = (w.bbox[0] + w.bbox[2]) / 2.0
        cy = (w.bbox[1] + w.bbox[3]) / 2.0
        if not _point_in_box(cx, cy, line.bbox):
            continue
        lab = word_labels.get(idx)
        if lab:
            coarse = lab.split("-")[-1] if "-" in lab else lab
            if coarse.upper() != "O" and coarse.lower() != "other":
                counts[coarse] += 1
    return counts.most_common(1)[0][0] if counts else None


def _run_hf_word_labels(
    image_rgb: Image.Image,
    words: Sequence[OcrWordBox],
) -> tuple[Dict[int, str], str | None, bool]:
    """
    Token classification at word granularity using word_ids alignment.
    Returns (index_in_words -> label string), model_id, success.
    """
    loaded = get_layout_model()
    if not loaded:
        return {}, None, False

    processor, model, model_id = loaded
    width, height = image_rgb.size

    if not words:
        return {}, model_id, True

    try:
        import torch
    except ImportError:
        return {}, model_id, False

    texts = [w.text for w in words]
    boxes = [_normalize_box_to_1000(w.bbox, width, height) for w in words]

    enc = processor(
        image_rgb,
        text=texts,
        boxes=boxes,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=512,
    )

    raw_labels = getattr(model.config, "id2label", None) or {}
    id2label: Dict[int, str] = {int(k): str(v) for k, v in raw_labels.items()}

    device = next(model.parameters()).device
    batch = {k: v.to(device) for k, v in enc.items()}

    with torch.no_grad():
        out = model(**batch)

    pred = out.logits.argmax(-1).detach().cpu().tolist()[0]

    word_ids: List[Optional[int]] | None = None
    if hasattr(enc, "word_ids"):
        try:
            word_ids = enc.word_ids(0)  # type: ignore[assignment]
        except Exception:
            word_ids = None
    if word_ids is None:
        word_ids = []

    if not word_ids or len(word_ids) != len(pred):
        logger.info("word_ids unavailable or length mismatch — HF layout labels skipped")
        return {}, model_id, False

    index_to_label: Dict[int, str] = {}
    for wid, pid in zip(word_ids, pred):
        if wid is None:
            continue
        if wid < 0 or wid >= len(words):
            continue
        label = id2label.get(int(pid), str(pid))
        # First subword wins for each word index
        if wid not in index_to_label:
            index_to_label[int(wid)] = label

    return index_to_label, model_id, True


def _sync_build_layout_context(
    original_rgb: Image.Image,
    processed_gray: np.ndarray,
    ocr_words: Sequence[OcrWordBox],
) -> Optional[LayoutContextPayload]:
    if not is_layout_model_enabled():
        return None

    w, h = original_rgb.size
    words: List[OcrWordBox] = list(ocr_words[:_MAX_WORDS])

    used_hf = False
    model_id: Optional[str] = None
    word_labels: Dict[int, str] = {}
    try:
        word_labels, model_id, ok = _run_hf_word_labels(original_rgb, words)
        used_hf = ok and bool(word_labels)
    except Exception as exc:
        logger.warning("LayoutLM inference error (continuing with fallback): %s", exc)

    line_blocks = cluster_words_into_line_blocks(words)
    for lb in line_blocks:
        maj = _majority_layout_label_for_line(lb, words, word_labels)
        if maj:
            lb.layout_label = maj

    text_boxes = [b.bbox for b in line_blocks]
    img_boxes = detect_image_candidate_boxes(processed_gray, text_boxes)

    image_blocks = [
        LayoutBlock(type="image", bbox=b) for b in img_boxes
    ]

    all_blocks: List[LayoutBlock] = [*line_blocks, *image_blocks]
    all_blocks.sort(key=lambda b: (b.bbox[1], b.bbox[0]))

    mapping = map_image_blocks_to_text(image_blocks, line_blocks)

    meta: Dict[str, Any] = {
        "used_hf_model": used_hf,
        "model_id": model_id,
        "word_count": len(words),
    }
    # Compact JSON for LLM: cap block list size in prompt layer (product_parser)
    blocks_out: List[Dict[str, Any]] = []
    for b in all_blocks:
        d: Dict[str, Any] = {
            "type": b.type,
            "bbox": list(b.bbox),
        }
        if b.text:
            d["text"] = b.text
        if b.layout_label:
            d["layout_label"] = b.layout_label
        blocks_out.append(d)

    return LayoutContextPayload(
        blocks=blocks_out,
        products=mapping["products"],
        image_size=(w, h),
        meta=meta,
    )


async def build_layout_context(
    original_rgb: Image.Image,
    processed_gray: np.ndarray,
    ocr_words: Sequence[OcrWordBox],
    infer_timeout_s: Optional[float] = None,
) -> Optional[LayoutContextPayload]:
    """
    Async entry: runs CPU/GPU work off the event loop; returns None on timeout/error.
    """
    if not is_layout_model_enabled():
        return None
    if not ocr_words:
        return None

    timeout = infer_timeout_s
    if timeout is None:
        raw_ms = os.getenv("LAYOUT_MAX_INFER_MS", "").strip()
        if raw_ms:
            try:
                timeout = float(raw_ms) / 1000.0
            except ValueError:
                timeout = 45.0
        else:
            raw_s = os.getenv("LAYOUT_MAX_INFER_S", "45").strip()
            try:
                timeout = float(raw_s)
            except ValueError:
                timeout = 45.0

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(
                _sync_build_layout_context,
                original_rgb,
                processed_gray,
                ocr_words,
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        logger.warning("Layout analysis timed out after %ss — skipping layout context", timeout)
        return None
    except Exception as exc:
        logger.warning("Layout analysis failed — skipping layout context: %s", exc)
        return None


def layout_context_to_jsonable(ctx: LayoutContextPayload) -> Dict[str, Any]:
    """Stable JSON-friendly dict for prompts / logging."""
    return ctx.to_prompt_dict()

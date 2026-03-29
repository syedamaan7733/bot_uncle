"""Lightweight layout fallbacks: OCR line clustering + OpenCV image candidates."""

from __future__ import annotations

import logging
from typing import List, Sequence

import cv2
import numpy as np

from app.services.layout_analysis.schemas import LayoutBlock, OcrWordBox

logger = logging.getLogger(__name__)


def cluster_words_into_line_blocks(
    words: Sequence[OcrWordBox],
    line_y_tol: int = 12,
) -> List[LayoutBlock]:
    """
    Group OCR words into horizontal text lines using simple y-band clustering.
    """
    if not words:
        return []

    sorted_words = sorted(words, key=lambda w: (w.bbox[1], w.bbox[0]))
    lines: List[List[OcrWordBox]] = []
    current_line: List[OcrWordBox] = []
    ref_y: int | None = None

    for w in sorted_words:
        cy = (w.bbox[1] + w.bbox[3]) // 2
        if ref_y is None or abs(cy - ref_y) <= line_y_tol:
            current_line.append(w)
            if ref_y is None:
                ref_y = cy
            else:
                ref_y = (ref_y * (len(current_line) - 1) + cy) // len(current_line)
        else:
            if current_line:
                lines.append(current_line)
            current_line = [w]
            ref_y = cy

    if current_line:
        lines.append(current_line)

    blocks: List[LayoutBlock] = []
    for line_words in lines:
        xs1 = [w.bbox[0] for w in line_words]
        ys1 = [w.bbox[1] for w in line_words]
        xs2 = [w.bbox[2] for w in line_words]
        ys2 = [w.bbox[3] for w in line_words]
        text = " ".join(w.text.strip() for w in line_words if w.text.strip())
        if not text:
            continue
        blocks.append(
            LayoutBlock(
                type="text",
                bbox=[min(xs1), min(ys1), max(xs2), max(ys2)],
                text=text,
            )
        )

    return blocks


def _bbox_overlap_ratio(a: List[int], b: List[int]) -> float:
    """Intersection over min(area) for axis-aligned boxes."""
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(1, (ax2 - ax1) * (ay2 - ay1))
    area_b = max(1, (bx2 - bx1) * (by2 - by1))
    return inter / min(area_a, area_b)


def detect_image_candidate_boxes(
    processed_gray: np.ndarray,
    text_boxes: Sequence[List[int]],
    max_regions: int = 24,
) -> List[List[int]]:
    """
    Heuristic \"photo / figure\" candidates: large contours with moderate solidity,
    excluding regions that largely overlap OCR text lines.
    """
    if processed_gray.size == 0:
        return []

    h, w = processed_gray.shape[:2]
    img_area = float(max(1, h * w))
    blur = cv2.GaussianBlur(processed_gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates: List[tuple[float, List[int]]] = []

    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        if cw < 20 or ch < 20:
            continue
        area = cw * ch
        if area < 0.002 * img_area or area > 0.45 * img_area:
            continue
        bbox = [int(x), int(y), int(x + cw), int(y + ch)]
        # Skip if mostly overlapping text
        if any(_bbox_overlap_ratio(bbox, tb) > 0.35 for tb in text_boxes):
            continue
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = float(cv2.contourArea(cnt)) / max(hull_area, 1.0)
        if solidity < 0.65:
            continue
        ar = cw / max(ch, 1)
        if ar < 0.25 or ar > 4.0:
            continue
        # Score: prefer medium-large compact regions
        score = area * solidity
        candidates.append((score, bbox))

    candidates.sort(key=lambda t: t[0], reverse=True)
    seen: List[List[int]] = []
    for _, bbox in candidates[: max_regions * 2]:
        if any(_bbox_overlap_ratio(bbox, s) > 0.5 for s in seen):
            continue
        seen.append(bbox)
        if len(seen) >= max_regions:
            break

    logger.info("OpenCV fallback found %d image region candidate(s)", len(seen))
    return seen

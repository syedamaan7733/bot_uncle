"""Map image regions to nearby text (label below + horizontally related)."""

from __future__ import annotations

from typing import Any, Dict, List, Sequence

from app.services.layout_analysis.schemas import LayoutBlock, MappedProductCandidate


def _horizontal_overlap_x(x1a: int, x2a: int, x1b: int, x2b: int) -> int:
    return max(0, min(x2a, x2b) - max(x1a, x1b))


def _center_x(bbox: Sequence[int]) -> float:
    return (bbox[0] + bbox[2]) / 2.0


def map_image_blocks_to_text(
    image_blocks: Sequence[LayoutBlock],
    text_blocks: Sequence[LayoutBlock],
    max_related: int = 6,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    For each image block, pick:
    - label: primary text = nearest text block *below* with horizontal overlap
    - related_text_blocks: text lines horizontally aligned / overlapping the band
    """
    texts = [b for b in text_blocks if b.type == "text" and b.text]
    products: List[Dict[str, Any]] = []

    for img in image_blocks:
        if img.type != "image":
            continue
        ix1, iy1, ix2, iy2 = img.bbox

        below = [
            t
            for t in texts
            if t.bbox[1] >= iy2 - 2
            and _horizontal_overlap_x(ix1, ix2, t.bbox[0], t.bbox[2]) > 0
        ]
        below.sort(
            key=lambda t: (t.bbox[1] - iy2, abs(_center_x(t.bbox) - _center_x(img.bbox)))
        )

        label = ""
        primary = below[0] if below else None
        if primary and primary.text:
            label = primary.text.strip()

        # Related: same row band as primary or within vertical window under image
        related: List[Dict[str, Any]] = []
        band_y0 = iy2
        band_y1 = iy2 + int(max(80, (iy2 - iy1) * 1.2))

        for t in texts:
            ty_mid = (t.bbox[1] + t.bbox[3]) // 2
            if ty_mid < band_y0 or ty_mid > band_y1:
                continue
            x_ovl = _horizontal_overlap_x(ix1, ix2, t.bbox[0], t.bbox[2])
            if x_ovl <= 0 and abs(_center_x(t.bbox) - _center_x(img.bbox)) > 0.35 * (ix2 - ix1):
                continue
            related.append(
                {
                    "text": (t.text or "").strip(),
                    "bbox": list(t.bbox),
                    "layout_label": t.layout_label,
                }
            )

        # De-dup preserve order
        seen = set()
        uniq: List[Dict[str, Any]] = []
        for r in related:
            key = (r["text"], tuple(r["bbox"]))
            if key in seen or not r["text"]:
                continue
            seen.add(key)
            uniq.append(r)
            if len(uniq) >= max_related:
                break

        products.append(
            MappedProductCandidate(
                image_bbox=list(img.bbox),
                label=label,
                related_text_blocks=uniq,
            ).model_dump()
        )

    return {"products": products}

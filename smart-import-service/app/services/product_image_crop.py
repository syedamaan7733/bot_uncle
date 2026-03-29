"""
Match layout image regions to extracted products, crop, upload to Cloudinary.

Fails soft: returns products unchanged if disabled, misconfigured, or on error.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import re
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Sequence, Tuple

from PIL import Image

from app.schemas.product_schema import ExtractedProduct

logger = logging.getLogger(__name__)

_MIN_BBOX_AREA = 400  # ~20x20 px minimum
_MAX_CROPS = 20
_MIN_MATCH_SCORE = 0.22
_PADDING_PX = 4


def _is_crop_enabled() -> bool:
    raw = os.getenv("CROP_PRODUCT_IMAGES", "true").strip().lower()
    return raw not in ("0", "false", "no", "off")


def _cloudinary_configured() -> bool:
    return bool(
        os.getenv("CLOUDINARY_CLOUD_NAME")
        and os.getenv("CLOUDINARY_API_KEY")
        and os.getenv("CLOUDINARY_API_SECRET")
    )


def _tokens(s: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", (s or "").lower()))


def _price_strings(price: float) -> List[str]:
    if price is None or price <= 0:
        return []
    s = f"{price:g}"
    out = [s, s.replace(".", ","), f"{price:.2f}"]
    if price == int(price):
        out.append(str(int(price)))
    return out


def _layout_text_blob(entry: Dict[str, Any]) -> str:
    parts = [entry.get("label") or ""]
    for block in entry.get("related_text_blocks") or []:
        if isinstance(block, dict) and block.get("text"):
            parts.append(str(block["text"]))
    return " ".join(parts)


def match_score(product: ExtractedProduct, layout_entry: Dict[str, Any]) -> float:
    """Higher = better match between product and a layout row (label + related text)."""
    blob = _layout_text_blob(layout_entry)
    name = (product.name or "").strip()
    if not name or not blob.strip():
        return 0.0

    r1 = SequenceMatcher(None, name.lower(), blob.lower()).ratio()

    tn = _tokens(name)
    tb = _tokens(blob)
    jacc = len(tn & tb) / max(len(tn | tb), 1) if tn or tb else 0.0

    price_bonus = 0.0
    for ps in _price_strings(product.price):
        if not ps:
            continue
        compact_blob = blob.replace(" ", "")
        if ps in compact_blob or ps in blob:
            price_bonus = 0.25
            break

    return min(1.0, 0.45 * r1 + 0.45 * jacc + price_bonus)


def greedy_match(
    products: Sequence[ExtractedProduct],
    layout_products: Sequence[Dict[str, Any]],
) -> Dict[int, int]:
    """Map product index -> layout_products index. One-to-one greedy by score."""
    if not products or not layout_products:
        return {}

    pairs: List[Tuple[float, int, int]] = []
    for pi, p in enumerate(products):
        for li, lp in enumerate(layout_products):
            s = match_score(p, lp)
            pairs.append((s, pi, li))

    pairs.sort(key=lambda t: t[0], reverse=True)
    used_p: set[int] = set()
    used_l: set[int] = set()
    out: Dict[int, int] = {}
    for s, pi, li in pairs:
        if s < _MIN_MATCH_SCORE:
            break
        if pi in used_p or li in used_l:
            continue
        used_p.add(pi)
        used_l.add(li)
        out[pi] = li
    return out


def _clamp_bbox(
    bbox: Sequence[int], width: int, height: int, pad: int = _PADDING_PX
) -> Tuple[int, int, int, int]:
    x1, y1, x2, y2 = (int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3]))
    x1 -= pad
    y1 -= pad
    x2 += pad
    y2 += pad
    x1 = max(0, min(x1, width - 1))
    y1 = max(0, min(y1, height - 1))
    x2 = max(x1 + 1, min(x2, width))
    y2 = max(y1 + 1, min(y2, height))
    if (x2 - x1) * (y2 - y1) < _MIN_BBOX_AREA:
        raise ValueError("bbox too small after clamp")
    return x1, y1, x2, y2


def _upload_crop_sync(pil_image: Image.Image) -> str:
    import cloudinary  # type: ignore
    import cloudinary.uploader  # type: ignore

    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    )
    buf = io.BytesIO()
    pil_image.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    folder = os.getenv("CLOUDINARY_CROP_FOLDER", "catalog-imports/crops")
    result = cloudinary.uploader.upload(
        buf,
        folder=folder,
        resource_type="image",
        use_filename=False,
        unique_filename=True,
        overwrite=False,
    )
    url = result.get("secure_url") or result.get("url")
    if not url:
        raise RuntimeError("Cloudinary upload returned no URL")
    return str(url)


async def _upload_one(pi: int, cropped: Image.Image) -> Tuple[int, Optional[str]]:
    try:
        url = await asyncio.to_thread(_upload_crop_sync, cropped)
        return pi, url
    except Exception as exc:
        logger.warning("Cloudinary upload failed for product index %s: %s", pi, exc)
        return pi, None


async def attach_cropped_product_images(
    original_rgb: Image.Image,
    layout_context: Optional[Dict[str, Any]],
    products: List[ExtractedProduct],
) -> List[ExtractedProduct]:
    """
    Return a new list of products with optional imageUrls set from layout crops.
    """
    if not _is_crop_enabled():
        return products

    if not _cloudinary_configured():
        logger.info("Cloudinary not configured — skipping product crop uploads")
        return products

    if not layout_context or not products:
        return products

    raw_layout = layout_context.get("products") or []
    if not isinstance(raw_layout, list) or not raw_layout:
        return products

    lp_items = [x for x in raw_layout if isinstance(x, dict) and x.get("image_bbox")]
    if not lp_items:
        return products

    products_slice = list(products[:_MAX_CROPS])
    mapping = greedy_match(products_slice, lp_items)
    if not mapping:
        logger.info("No layout–product matches above threshold — skipping crops")
        return products

    w, h = original_rgb.size
    crop_tasks: List[Tuple[int, Image.Image]] = []
    for pi, li in mapping.items():
        if pi >= len(products):
            continue
        entry = lp_items[li]
        bbox = entry.get("image_bbox")
        if not bbox or len(bbox) != 4:
            continue
        try:
            box = _clamp_bbox(bbox, w, h)
            cropped = original_rgb.crop(box)
            crop_tasks.append((pi, cropped))
        except (ValueError, TypeError) as exc:
            logger.warning("Skip crop for product %s: %s", products[pi].name, exc)

    if not crop_tasks:
        return products

    results = await asyncio.gather(*[_upload_one(pi, cr) for pi, cr in crop_tasks])
    url_by_pi: Dict[int, str] = {}
    for pi, url in results:
        if url:
            url_by_pi[pi] = url

    final: List[ExtractedProduct] = []
    for pi, p in enumerate(products):
        url = url_by_pi.get(pi)
        if url:
            final.append(p.model_copy(update={"imageUrls": [url]}))
        else:
            final.append(p)

    logger.info(
        "Attached %d cropped image(s) from %d layout matches",
        len(url_by_pi),
        len(mapping),
    )
    return final

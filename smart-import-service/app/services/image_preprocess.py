import logging
from io import BytesIO
from typing import List, Optional, Tuple

import cv2
import httpx
import numpy as np
from PIL import Image

from app.services.pdf_render import pdf_bytes_to_rgb_images

logger = logging.getLogger(__name__)

MAX_WIDTH = 2000


def _content_type_is_pdf(content_type: Optional[str]) -> bool:
    if not content_type:
        return False
    base = content_type.split(";")[0].strip().lower()
    return base == "application/pdf"


def _bytes_look_like_pdf(data: bytes) -> bool:
    return len(data) >= 4 and data[:4] == b"%PDF"


def pil_rgb_to_preprocessed(original_pil: Image.Image) -> Tuple[Image.Image, np.ndarray]:
    """Resize wide images, then grayscale + mild blur + CLAHE for OCR."""
    width, height = original_pil.size
    if width > MAX_WIDTH:
        scale = MAX_WIDTH / width
        new_size = (MAX_WIDTH, int(height * scale))
        original_pil = original_pil.resize(new_size, Image.LANCZOS)
        logger.info("Image resized to %s", new_size)

    gray = cv2.cvtColor(np.array(original_pil), cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    processed = clahe.apply(blurred)
    return original_pil, processed


async def download_catalog_pages(
    catalog_url: str,
) -> List[Tuple[Image.Image, np.ndarray]]:
    """
    Download URL (raster image or PDF). Returns one (PIL, numpy) pair per page.
    PDF bytes are opened once in memory; each page is rendered then preprocessed.
    """
    logger.info("Downloading catalog: %s", catalog_url)
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.get(catalog_url, follow_redirects=True)
        response.raise_for_status()
        data = response.content
        ct = response.headers.get("content-type")
        if ct:
            ct = ct.split(";")[0].strip().lower()

    if _bytes_look_like_pdf(data) or _content_type_is_pdf(ct):
        logger.info("Detected PDF (%d bytes)", len(data))
        rgb_pages = pdf_bytes_to_rgb_images(data)
        return [pil_rgb_to_preprocessed(p.convert("RGB")) for p in rgb_pages]

    original_pil = Image.open(BytesIO(data)).convert("RGB")
    logger.info("Raster image downloaded — size %s", original_pil.size)
    one = pil_rgb_to_preprocessed(original_pil)
    logger.info("Image preprocessing complete (1 page)")
    return [one]


async def download_and_preprocess(catalog_url: str) -> Tuple[Image.Image, np.ndarray]:
    """
    Back-compat: first page only (same as single raster image, or first PDF page).
    Prefer download_catalog_pages for full PDF handling.
    """
    pages = await download_catalog_pages(catalog_url)
    return pages[0]

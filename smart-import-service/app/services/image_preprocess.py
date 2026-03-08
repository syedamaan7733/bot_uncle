import logging
from io import BytesIO
from typing import Tuple

import cv2
import httpx
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

MAX_WIDTH = 2000


async def download_and_preprocess(image_url: str) -> Tuple[Image.Image, np.ndarray]:
    """
    Downloads the image from *image_url* and returns:
      - original PIL image  (colour, for GPT-4o vision)
      - preprocessed numpy array (grayscale, denoised, CLAHE — for OCR)
    """
    logger.info("Downloading image: %s", image_url)
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(image_url, follow_redirects=True)
        response.raise_for_status()

    original_pil = Image.open(BytesIO(response.content)).convert("RGB")
    logger.info("Image downloaded — size %s", original_pil.size)

    # ── Resize if too wide ────────────────────────────────────────────────────
    width, height = original_pil.size
    if width > MAX_WIDTH:
        scale = MAX_WIDTH / width
        new_size = (MAX_WIDTH, int(height * scale))
        original_pil = original_pil.resize(new_size, Image.LANCZOS)
        logger.info("Image resized to %s", new_size)

    # ── Convert to grayscale numpy for OCR ───────────────────────────────────
    gray = cv2.cvtColor(np.array(original_pil), cv2.COLOR_RGB2GRAY)

    # ── Gaussian blur — mild noise removal ───────────────────────────────────
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)

    # ── CLAHE contrast enhancement ────────────────────────────────────────────
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    processed = clahe.apply(blurred)

    logger.info("Image preprocessing complete")
    return original_pil, processed

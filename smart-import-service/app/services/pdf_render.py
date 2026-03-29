"""Render PDF pages to RGB PIL images (PyMuPDF — no system Poppler)."""

from __future__ import annotations

import logging
import os
from typing import List

import fitz  # PyMuPDF
from PIL import Image

logger = logging.getLogger(__name__)


def max_pdf_pages_allowed() -> int:
    raw = os.getenv("SMART_IMPORT_MAX_PDF_PAGES", "20")
    try:
        n = int(raw)
        return max(1, min(n, 100))
    except ValueError:
        return 20


def pdf_bytes_to_rgb_images(pdf_bytes: bytes) -> List[Image.Image]:
    """
    Open PDF from bytes, render each page to RGB.
    Raises ValueError for encrypted PDFs, empty docs, or page count over limit.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if doc.needs_pass:
            raise ValueError("Password-protected PDFs are not supported")
        n = doc.page_count
        if n == 0:
            raise ValueError("PDF has no pages")
        cap = max_pdf_pages_allowed()
        if n > cap:
            raise ValueError(f"PDF has {n} pages; maximum allowed is {cap}")

        out: List[Image.Image] = []
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        for i in range(n):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            out.append(img)
        logger.info("Rendered %d PDF page(s) to RGB", len(out))
        return out
    finally:
        doc.close()

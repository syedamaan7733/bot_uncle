"""PDF rendering via PyMuPDF."""

import fitz
import pytest

from app.services.pdf_render import max_pdf_pages_allowed, pdf_bytes_to_rgb_images


def _minimal_pdf_bytes(num_pages: int) -> bytes:
    doc = fitz.open()
    try:
        for _ in range(num_pages):
            doc.new_page(width=200, height=200)
        return doc.tobytes()
    finally:
        doc.close()


def test_pdf_bytes_to_rgb_images_renders_each_page():
    data = _minimal_pdf_bytes(2)
    imgs = pdf_bytes_to_rgb_images(data)
    assert len(imgs) == 2
    assert all(im.mode == "RGB" for im in imgs)
    assert all(im.width > 0 and im.height > 0 for im in imgs)


def test_pdf_rejects_when_page_count_exceeds_cap(monkeypatch):
    monkeypatch.setenv("SMART_IMPORT_MAX_PDF_PAGES", "2")
    assert max_pdf_pages_allowed() == 2
    data = _minimal_pdf_bytes(3)
    with pytest.raises(ValueError, match="maximum allowed is 2"):
        pdf_bytes_to_rgb_images(data)

"""Tests for layout–product matching and crop helpers."""

import os

import pytest
from PIL import Image

from app.schemas.product_schema import ExtractedProduct
from app.services.product_image_crop import (
    attach_cropped_product_images,
    greedy_match,
    match_score,
    _clamp_bbox,
)


def test_match_score_prefers_name_in_label():
    p = ExtractedProduct(name="Blu Sandal", price=499.0, confidence=0.9)
    layout = {
        "image_bbox": [0, 0, 10, 10],
        "label": "Blu",
        "related_text_blocks": [{"text": "499", "bbox": [0, 0, 1, 1]}],
    }
    assert match_score(p, layout) > 0.3


def test_greedy_match_one_to_one():
    products = [
        ExtractedProduct(name="Alpha Shoe", price=10.0, confidence=0.9),
        ExtractedProduct(name="Beta Bag", price=20.0, confidence=0.9),
    ]
    layout = [
        {"image_bbox": [0, 0, 50, 50], "label": "Alpha", "related_text_blocks": []},
        {"image_bbox": [60, 0, 100, 50], "label": "Beta", "related_text_blocks": []},
    ]
    m = greedy_match(products, layout)
    assert len(m) == 2
    assert set(m.keys()) == {0, 1}


def test_clamp_bbox():
    box = _clamp_bbox([10, 10, 100, 100], width=200, height=200, pad=0)
    assert box == (10, 10, 100, 100)


@pytest.mark.asyncio
async def test_attach_skips_without_cloudinary(monkeypatch):
    monkeypatch.delenv("CLOUDINARY_CLOUD_NAME", raising=False)
    monkeypatch.delenv("CLOUDINARY_API_KEY", raising=False)
    monkeypatch.delenv("CLOUDINARY_API_SECRET", raising=False)
    img = Image.new("RGB", (200, 200), color="white")
    products = [ExtractedProduct(name="X", price=1.0, confidence=0.9)]
    layout = {
        "products": [
            {
                "image_bbox": [10, 10, 80, 80],
                "label": "X",
                "related_text_blocks": [],
            }
        ]
    }
    out = await attach_cropped_product_images(img, layout, products)
    assert out[0].imageUrls is None


@pytest.mark.asyncio
async def test_attach_with_mock_upload(monkeypatch):
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "test")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "k")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "s")
    monkeypatch.setenv("CROP_PRODUCT_IMAGES", "true")

    async def fake_upload(pi: int, cropped: Image.Image):
        return pi, "https://res.cloudinary.com/demo/image/upload/v1/crop.png"

    import app.services.product_image_crop as pic

    monkeypatch.setattr(pic, "_upload_one", fake_upload)

    img = Image.new("RGB", (200, 200), color="white")
    products = [ExtractedProduct(name="Blu Flip", price=99.0, confidence=0.9)]
    layout = {
        "products": [
            {
                "image_bbox": [20, 20, 120, 120],
                "label": "Blu",
                "related_text_blocks": [{"text": "99", "bbox": [0, 0, 1, 1]}],
            }
        ]
    }
    out = await attach_cropped_product_images(img, layout, products)
    assert out[0].imageUrls == ["https://res.cloudinary.com/demo/image/upload/v1/crop.png"]

"""Integration-style tests for /process-image response contract."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.main import app


@pytest.mark.asyncio
async def test_process_image_returns_only_products_key():
    fake_img = Image.new("RGB", (120, 120), color="white")
    fake_gray = np.zeros((120, 120), dtype=np.uint8)

    async def fake_download(url: str):
        return [(fake_img, fake_gray)]

    async def fake_vision(img):
        return "catalog description"

    async def fake_parse(ocr_text, vision_description, layout_context=None):
        from app.schemas.product_schema import ExtractedProduct

        return [
            ExtractedProduct(
                name="Test",
                price=9.99,
                category="Cat",
                confidence=0.9,
            )
        ]

    async def fake_match(products, categories):
        return products

    boxed = {
        "full_text": "Test 9.99",
        "words": [
            {"text": "Test", "bbox": [10, 10, 40, 24], "conf": 96},
            {"text": "9.99", "bbox": [10, 30, 50, 48], "conf": 96},
        ],
    }

    fake_ctx = MagicMock()
    fake_ctx.blocks = []
    fake_ctx.products = []
    fake_ctx.meta = {"used_hf_model": False}
    fake_ctx.to_prompt_dict = MagicMock(
        return_value={"blocks": [], "products": [], "image_size": [120, 120], "meta": {}}
    )

    with patch("app.routes.import_routes.download_catalog_pages", fake_download):
        with patch(
            "app.routes.import_routes.extract_text_with_boxes_tesseract",
            return_value=boxed,
        ):
            with patch(
                "app.routes.import_routes.build_layout_context",
                new_callable=AsyncMock,
                return_value=fake_ctx,
            ):
                with patch(
                    "app.routes.import_routes.analyze_image_vision",
                    new_callable=AsyncMock,
                    side_effect=fake_vision,
                ):
                    with patch(
                        "app.routes.import_routes.parse_products",
                        new_callable=AsyncMock,
                        side_effect=fake_parse,
                    ):
                        with patch(
                            "app.routes.import_routes.match_categories",
                            new_callable=AsyncMock,
                            side_effect=fake_match,
                        ):
                            transport = ASGITransport(app=app)
                            async with AsyncClient(
                                transport=transport, base_url="http://test"
                            ) as ac:
                                r = await ac.post(
                                    "/process-image",
                                    json={
                                        "imageUrl": "https://example.com/x.jpg",
                                        "categories": [],
                                    },
                                )

    assert r.status_code == 200
    data = r.json()
    assert set(data.keys()) == {"products"}
    assert len(data["products"]) == 1
    assert data["products"][0]["name"] == "Test"


@pytest.mark.asyncio
async def test_layout_failure_does_not_fail_request():
    fake_img = Image.new("RGB", (80, 80), color="white")
    fake_gray = np.zeros((80, 80), dtype=np.uint8)

    async def fake_download(url: str):
        return [(fake_img, fake_gray)]

    boxed = {"full_text": "x", "words": [{"text": "x", "bbox": [1, 1, 10, 12], "conf": 99}]}

    with patch.dict(os.environ, {"LAYOUT_ENABLED": "true"}, clear=False):
        with patch("app.routes.import_routes.download_catalog_pages", fake_download):
            with patch(
                "app.routes.import_routes.extract_text_with_boxes_tesseract",
                return_value=boxed,
            ):
                with patch(
                    "app.routes.import_routes.build_layout_context",
                    new_callable=AsyncMock,
                    side_effect=RuntimeError("layout boom"),
                ):
                    with patch(
                        "app.routes.import_routes.analyze_image_vision",
                        new_callable=AsyncMock,
                        return_value="v",
                    ):
                        with patch(
                            "app.routes.import_routes.parse_products",
                            new_callable=AsyncMock,
                            return_value=[],
                        ):
                            transport = ASGITransport(app=app)
                            async with AsyncClient(
                                transport=transport, base_url="http://test"
                            ) as ac:
                                r = await ac.post(
                                    "/process-image",
                                    json={
                                        "imageUrl": "https://example.com/y.jpg",
                                        "categories": [],
                                    },
                                )

    # Route wraps layout in try/except; should still return 200
    assert r.status_code == 200
    assert r.json() == {"products": []}


@pytest.mark.asyncio
async def test_process_image_merges_products_from_two_pages():
    fake_img = Image.new("RGB", (60, 60), color="white")
    fake_gray = np.zeros((60, 60), dtype=np.uint8)

    async def fake_download(url: str):
        return [(fake_img, fake_gray), (fake_img, fake_gray)]

    parse_calls = {"n": 0}

    async def fake_parse(ocr_text, vision_description, layout_context=None):
        from app.schemas.product_schema import ExtractedProduct

        parse_calls["n"] += 1
        return [
            ExtractedProduct(
                name=f"Page{parse_calls['n']}",
                price=float(parse_calls["n"]),
                confidence=0.9,
            )
        ]

    async def fake_match(products, categories):
        return products

    boxed = {"full_text": "x", "words": []}

    with patch("app.routes.import_routes.download_catalog_pages", fake_download):
        with patch(
            "app.routes.import_routes.extract_text_with_boxes_tesseract",
            return_value=boxed,
        ):
            with patch(
                "app.routes.import_routes.analyze_image_vision",
                new_callable=AsyncMock,
                return_value="vision",
            ):
                with patch(
                    "app.routes.import_routes.parse_products",
                    new_callable=AsyncMock,
                    side_effect=fake_parse,
                ):
                    with patch(
                        "app.routes.import_routes.match_categories",
                        new_callable=AsyncMock,
                        side_effect=fake_match,
                    ):
                        transport = ASGITransport(app=app)
                        async with AsyncClient(
                            transport=transport, base_url="http://test"
                        ) as ac:
                            r = await ac.post(
                                "/process-image",
                                json={
                                    "imageUrl": "https://example.com/doc.pdf",
                                    "categories": [],
                                },
                            )

    assert r.status_code == 200
    data = r.json()
    assert len(data["products"]) == 2
    assert data["products"][0]["name"] == "Page1"
    assert data["products"][1]["name"] == "Page2"

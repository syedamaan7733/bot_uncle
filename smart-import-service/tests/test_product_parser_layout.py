"""parse_products optional layout_context."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.product_parser import parse_products


@pytest.mark.asyncio
async def test_layout_context_appended_to_user_message():
    captured = {}

    async def fake_create(**kwargs):
        captured["messages"] = kwargs.get("messages")
        raw = '{"products": [{"name": "A", "price": 1.0, "line1": "", "line2": "", "line3": "", "category": "X", "confidence": 0.9}]}'
        return MagicMock(choices=[MagicMock(message=MagicMock(content=raw))])

    with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}, clear=False):
        with patch("app.services.product_parser.AsyncOpenAI") as m_client:
            inst = m_client.return_value
            inst.chat = MagicMock()
            inst.chat.completions = MagicMock()
            inst.chat.completions.create = AsyncMock(side_effect=fake_create)

            products = await parse_products(
                "ocr",
                "vision",
                layout_context={"blocks": [], "products": [], "image_size": [1, 1], "meta": {}},
            )

    assert len(products) == 1
    user_content = captured["messages"][-1]["content"]
    assert "LAYOUT CONTEXT" in user_content
    assert "blocks" in user_content


@pytest.mark.asyncio
async def test_no_layout_when_none():
    captured = {}

    async def fake_create(**kwargs):
        captured["messages"] = kwargs.get("messages")
        raw = '{"products": []}'
        return MagicMock(choices=[MagicMock(message=MagicMock(content=raw))])

    with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}, clear=False):
        with patch("app.services.product_parser.AsyncOpenAI") as m_client:
            inst = m_client.return_value
            inst.chat = MagicMock()
            inst.chat.completions = MagicMock()
            inst.chat.completions.create = AsyncMock(side_effect=fake_create)

            await parse_products("a", "b", layout_context=None)

    user_content = captured["messages"][-1]["content"]
    assert "LAYOUT CONTEXT" not in user_content

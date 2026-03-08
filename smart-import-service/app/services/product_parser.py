import json
import logging
import os
import re
from typing import List

from openai import AsyncOpenAI

from app.schemas.product_schema import ExtractedProduct

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a product catalog parser. You receive raw OCR text and a visual description "
    "of a product catalog image. Your task is to extract ALL products from this data.\n\n"
    "Rules:\n"
    "- Extract each distinct product as a separate entry (max 20 products)\n"
    "- name: the product name (required, non-empty)\n"
    "- price: a number only — no currency symbols, no commas. Use 0 if not found.\n"
    "- line1, line2, line3: brief description split into 3 lines max (each 80 chars max). "
    "- category: the SINGLE base category name for the products in the image (e.g. 'Flip-Flops' NOT 'Footwear - Flip-Flops').\n"
    "Leave blank if nothing meaningful.\n"
    "- confidence: 0.0–1.0 — how confident you are this is a real product from the image.\n\n"
    "Return ONLY a JSON object in this exact format (no markdown, no extra text):\n"
    '{"products": [{"name": "...", "price": 0.0, "line1": "...", "line2": "...", "line3": "...", "category": "...", '
    '"confidence": 0.9}]}'
)


async def parse_products(ocr_text: str, vision_description: str) -> List[ExtractedProduct]:
    """
    Uses GPT-4o-mini to extract structured products from OCR + vision text.
    Returns a list of ExtractedProduct (without categoryId — set by category_matcher).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not set — cannot parse products")
        return []

    combined_input = (
        f"=== OCR TEXT ===\n{ocr_text}\n\n"
        f"=== VISUAL DESCRIPTION ===\n{vision_description}"
    )

    logger.info("Sending combined text to GPT-4o-mini for product extraction")

    client = AsyncOpenAI(api_key=api_key)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": combined_input},
            ],
        )

        raw = response.choices[0].message.content or ""
        logger.info("LLM product extraction response (%d chars): %s", len(raw), raw[:200])

        # Strip markdown fences if present
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("```").strip()

        data = json.loads(raw)
        products_data = data.get("products", [])

        products: List[ExtractedProduct] = []
        for p in products_data[:20]:
            try:
                products.append(
                    ExtractedProduct(
                        name=str(p.get("name", "")).strip(),
                        price=float(p.get("price", 0.0)),
                        line1=p.get("line1") or None,
                        line2=p.get("line2") or None,
                        line3=p.get("line3") or None,
                        category=p.get("category") or None,
                        confidence=float(p.get("confidence", 0.5)),
                    )
                )
            except Exception as exc:
                logger.warning("Skipping malformed product entry: %s — %s", p, exc)

        # Filter out very low confidence products
        products = [p for p in products if p.confidence >= 0.3 and p.name]

        logger.info("Extracted %d products", len(products))
        return products

    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM JSON response: %s", exc)
        return []
    except Exception as exc:
        logger.error("Product parsing failed: %s", exc)
        return []

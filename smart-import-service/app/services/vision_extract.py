import base64
import logging
import os
from io import BytesIO

from openai import AsyncOpenAI
from PIL import Image

logger = logging.getLogger(__name__)

VISION_PROMPT = (
    "You are a product catalog analyst. Look at this catalog image carefully. "
    "Describe:\n"
    "1. The type of products shown (e.g. clothing, electronics, food, cosmetics)\n"
    "2. Any product names, model numbers, or brand names you can see\n"
    "3. Any prices, sizes, or specifications visible\n"
    "4. The general layout (grid, list, single item, etc.)\n\n"
    "Be thorough and precise. Your output will be combined with OCR text to extract structured product data."
    "5. Suggest a category name for the products in the image."
)


def _pil_to_base64(image: Image.Image, max_size: int = 1024) -> str:
    """Resize and base64-encode the PIL image for the vision API."""
    width, height = image.size
    if max(width, height) > max_size:
        scale = max_size / max(width, height)
        image = image.resize(
            (int(width * scale), int(height * scale)), Image.LANCZOS
        )

    buf = BytesIO()
    image.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


async def analyze_image_vision(image: Image.Image) -> str:
    """
    Send the image to GPT-4o-mini vision to get a descriptive analysis.

    Returns the text description, or empty string on failure.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — skipping vision analysis")
        return ""

    logger.info("Sending image to GPT-4o-mini vision")
    client = AsyncOpenAI(api_key=api_key)

    try:
        b64 = _pil_to_base64(image)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
        )

        description = response.choices[0].message.content or ""
        print("Vision analysis complete",description)
        logger.info("Vision analysis complete — %d chars", len(description))
        return description

    except Exception as exc:
        logger.error("Vision analysis failed: %s", exc)
        return ""

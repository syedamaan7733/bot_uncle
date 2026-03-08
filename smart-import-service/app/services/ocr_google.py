import logging
import os
from io import BytesIO
from typing import Optional
from google.cloud import vision
from PIL import Image

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.70


def _is_available() -> bool:
    """Return True if Google credentials are configured."""
    return bool(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        or os.getenv("GOOGLE_CLOUD_API_KEY")
    )


async def extract_text_google(image: Image.Image) -> Optional[dict]:
    """
    Run Google Vision document-text detection on a PIL image.

    Returns:
        {"full_text": str, "confidence": float, "needs_fallback": bool}
        or None if the library is not available / credentials missing.
    """
    if not _is_available():
        logger.warning("Google Vision credentials not set — skipping Google OCR")
        return None

    try:

        client = vision.ImageAnnotatorClient()

        buf = BytesIO()
        image.save(buf, format="PNG")
        content = buf.getvalue()

        gv_image = vision.Image(content=content)
        response = client.document_text_detection(image=gv_image)

        if response.error.message:
            logger.error("Google Vision error: %s", response.error.message)
            return None

        annotation = response.full_text_annotation
        if not annotation or not annotation.text:
            logger.info("Google Vision returned no text")
            return {"full_text": "", "confidence": 0.0, "needs_fallback": True}
        print("annotation",annotation)
        # Gather per-symbol confidence scores
        confidences = []
        for page in annotation.pages:
            for block in page.blocks:
                for paragraph in block.paragraphs:
                    for word in paragraph.words:
                        for symbol in word.symbols:
                            if symbol.confidence is not None:
                                confidences.append(symbol.confidence)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        needs_fallback = avg_confidence < CONFIDENCE_THRESHOLD

        logger.info(
            "Google Vision OCR complete — avg confidence %.2f — fallback needed: %s",
            avg_confidence,
            needs_fallback,
        )
        return {
            "full_text": annotation.text,
            "confidence": avg_confidence,
            "needs_fallback": needs_fallback,
        }

    except Exception as exc:
        logger.error("Google Vision OCR failed: %s", exc)
        return None

import logging
from typing import Any, Dict, List, TypedDict

import numpy as np
import pytesseract  # type: ignore

logger = logging.getLogger(__name__)


class TesseractOcrWithBoxes(TypedDict):
    """OCR result with per-word bounding boxes (pixel space, same image as input)."""

    full_text: str
    words: List[Dict[str, Any]]


def extract_text_tesseract(processed_image: np.ndarray) -> str:
    """
    Run pytesseract OCR on a preprocessed (grayscale numpy) image.

    Returns cleaned full-text string.
    """
    logger.info("Running Tesseract OCR")

    try:
        data = pytesseract.image_to_data(
            processed_image,
            output_type=pytesseract.Output.DICT,
            config="--oem 3 --psm 6",
        )

        words = [
            word
            for word, conf in zip(data["text"], data["conf"])
            if word.strip() and int(conf) > 30
        ]
        full_text = " ".join(words)

        logger.info("Tesseract OCR complete — %d words extracted", len(words))
        return full_text

    except Exception as exc:
        logger.error("Tesseract OCR failed: %s", exc)
        return ""


def extract_text_with_boxes_tesseract(processed_image: np.ndarray) -> TesseractOcrWithBoxes:
    """
    Run pytesseract and preserve word-level boxes + confidence.
    Does not change ``extract_text_tesseract`` behavior for existing callers.
    """
    logger.info("Running Tesseract OCR (with boxes)")

    empty: TesseractOcrWithBoxes = {"full_text": "", "words": []}

    try:
        data = pytesseract.image_to_data(
            processed_image,
            output_type=pytesseract.Output.DICT,
            config="--oem 3 --psm 6",
        )

        words: List[Dict[str, Any]] = []
        n = len(data.get("text", []))
        for i in range(n):
            raw = (data["text"][i] or "").strip()
            if not raw:
                continue
            try:
                conf = int(data["conf"][i])
            except (ValueError, TypeError):
                conf = -1
            if conf <= 30:
                continue
            x, y, w, h = (
                int(data["left"][i]),
                int(data["top"][i]),
                int(data["width"][i]),
                int(data["height"][i]),
            )
            words.append(
                {
                    "text": raw,
                    "bbox": [x, y, x + w, y + h],
                    "conf": conf,
                }
            )

        full_text = " ".join(w["text"] for w in words)
        logger.info(
            "Tesseract OCR (with boxes) complete — %d words",
            len(words),
        )
        return {"full_text": full_text, "words": words}

    except Exception as exc:
        logger.error("Tesseract OCR (with boxes) failed: %s", exc)
        return empty

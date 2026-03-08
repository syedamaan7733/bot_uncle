import logging

import numpy as np
import pytesseract  # type: ignore

logger = logging.getLogger(__name__)


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

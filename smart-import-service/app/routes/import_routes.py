import logging

from fastapi import APIRouter, HTTPException

from app.schemas.product_schema import ProcessImageRequest, ProcessImageResponse
from app.services.image_preprocess import download_and_preprocess
from app.services.ocr_google import extract_text_google
from app.services.ocr_tesseract import extract_text_tesseract
from app.services.vision_extract import analyze_image_vision
from app.services.product_parser import parse_products
from app.services.category_matcher import match_categories

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/process-image", response_model=ProcessImageResponse)
async def process_image(request: ProcessImageRequest) -> ProcessImageResponse:
    """
    Full catalog-processing pipeline:
      1. Download & preprocess image
      2. OCR (Google Vision → Tesseract fallback)
      3. GPT-4o-mini vision analysis
      4. LLM product extraction
      5. Category matching via embeddings
    """
    logger.info(
        "process-image request — url=%s, categories=%d",
        request.imageUrl,
        len(request.categories),
    )

    # ── 1. Download & preprocess ──────────────────────────────────────────────
    try:
        original_image, processed_array = await download_and_preprocess(request.imageUrl)
    except Exception as exc:
        logger.error("Image download/preprocess failed: %s", exc)
        raise HTTPException(status_code=422, detail=f"Failed to download image: {exc}")

    # ── 2. OCR ────────────────────────────────────────────────────────────────
    ocr_text = ""

    google_result = None
    # google_result = await extract_text_google(original_image)
   

    if google_result and not google_result.get("needs_fallback") and google_result.get("full_text"):
        ocr_text = google_result["full_text"]
        logger.info("Using Google Vision OCR text (%d chars)", len(ocr_text))
    else:
        if google_result and google_result.get("needs_fallback"):
            logger.info("Google Vision confidence low — using Tesseract fallback")
        else:
            logger.info("Google Vision unavailable — using Tesseract")
        ocr_text = extract_text_tesseract(processed_array)
        logger.info("Tesseract OCR text (%d chars)", len(ocr_text))

    # ── 3. Vision analysis ────────────────────────────────────────────────────
    vision_description = await analyze_image_vision(original_image)

    # ── 4. Product extraction ─────────────────────────────────────────────────
    if not ocr_text and not vision_description:
        logger.warning("No text extracted from image — returning empty product list")
        return ProcessImageResponse(products=[])

    products = await parse_products(ocr_text, vision_description)
    print("Parsed products",products)
    logger.info("Extracted %d products before category matching", len(products))

    # ── 5. Category matching ──────────────────────────────────────────────────
    if products and request.categories:
        products = await match_categories(products, request.categories)

    logger.info("Pipeline complete — returning %d products", len(products))
    return ProcessImageResponse(products=products)

import logging
from typing import List

import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image

from app.schemas.product_schema import ExtractedProduct, ProcessImageRequest, ProcessImageResponse
from app.services.image_preprocess import download_catalog_pages
from app.services.ocr_google import extract_text_google
from app.services.ocr_tesseract import extract_text_with_boxes_tesseract, extract_text_tesseract
from app.services.layout_analysis.layout_service import build_layout_context, layout_context_to_jsonable
from app.services.layout_analysis.schemas import OcrWordBox
from app.services.vision_extract import analyze_image_vision
from app.services.product_parser import parse_products
from app.services.category_matcher import match_categories
from app.services.product_image_crop import attach_cropped_product_images

logger = logging.getLogger(__name__)

router = APIRouter()


async def _extract_products_one_page(
    original_image: Image.Image,
    processed_array: np.ndarray,
) -> List[ExtractedProduct]:
    """OCR → layout → vision → parse → optional crop for a single raster page."""
    ocr_text = ""
    ocr_words_for_layout: list[OcrWordBox] = []

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
        boxed = extract_text_with_boxes_tesseract(processed_array)
        ocr_text = boxed["full_text"] if boxed["full_text"] else extract_text_tesseract(processed_array)
        logger.info("Tesseract OCR text (%d chars)", len(ocr_text))
        try:
            ocr_words_for_layout = [
                OcrWordBox(text=w["text"], bbox=w["bbox"], conf=int(w.get("conf", 0)))
                for w in boxed.get("words", [])
            ]
        except Exception as exc:
            logger.warning("Could not build OCR word boxes for layout: %s", exc)
            ocr_words_for_layout = []

    layout_context_dict = None
    if ocr_words_for_layout:
        try:
            ctx = await build_layout_context(
                original_image,
                processed_array,
                ocr_words_for_layout,
            )
            if ctx is not None:
                layout_context_dict = layout_context_to_jsonable(ctx)
                logger.info(
                    "Layout context built — blocks=%d mapped_products=%d hf=%s",
                    len(ctx.blocks),
                    len(ctx.products),
                    ctx.meta.get("used_hf_model"),
                )
        except Exception as exc:
            logger.warning("Layout analysis skipped due to error: %s", exc)

    vision_description = await analyze_image_vision(original_image)

    if not ocr_text and not vision_description:
        logger.warning("No text extracted from page — skipping products for this page")
        return []

    products = await parse_products(
        ocr_text,
        vision_description,
        layout_context=layout_context_dict,
    )
    logger.info("Extracted %d products from page before crop", len(products))

    if products and layout_context_dict:
        try:
            products = await attach_cropped_product_images(
                original_image,
                layout_context_dict,
                products,
            )
        except Exception as exc:
            logger.warning("Product image crop/upload skipped: %s", exc)

    return products


@router.post("/process-image", response_model=ProcessImageResponse)
async def process_image(request: ProcessImageRequest) -> ProcessImageResponse:
    """
    Full catalog-processing pipeline:
      1. Download & preprocess (raster or PDF → one image per page)
      2. Per page: OCR → layout → vision → LLM extraction → optional crop
      3. Merge products; category matching once; return
    """
    logger.info(
        "process-image request — url=%s, categories=%d",
        request.imageUrl,
        len(request.categories),
    )

    try:
        pages = await download_catalog_pages(request.imageUrl)
    except ValueError as exc:
        logger.warning("Catalog rejected: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Catalog download/preprocess failed: %s", exc)
        raise HTTPException(status_code=422, detail=f"Failed to download catalog: {exc}") from exc

    logger.info("Catalog has %d page(s) to process", len(pages))

    all_products: List[ExtractedProduct] = []
    for page_idx, (original_image, processed_array) in enumerate(pages):
        logger.info("Processing page %d/%d", page_idx + 1, len(pages))
        page_products = await _extract_products_one_page(original_image, processed_array)
        logger.info("Page %d contributed %d product(s)", page_idx + 1, len(page_products))
        all_products.extend(page_products)

    if not all_products:
        logger.warning("No products extracted from catalog")
        return ProcessImageResponse(products=[])

    if request.categories:
        all_products = await match_categories(all_products, request.categories)

    logger.info("Pipeline complete — returning %d products", len(all_products))
    return ProcessImageResponse(products=all_products)

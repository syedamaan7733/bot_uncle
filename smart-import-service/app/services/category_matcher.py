import logging
import os
import re
from typing import List

import numpy as np
from openai import AsyncOpenAI

from app.schemas.product_schema import CategoryInput, ExtractedProduct

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.40


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


async def _get_embeddings(texts: List[str], client: AsyncOpenAI) -> List[List[float]]:
    """Batch-embed a list of texts using OpenAI text-embedding-3-small."""
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    sorted_data = sorted(response.data, key=lambda d: d.index)
    return [d.embedding for d in sorted_data]


def _derive_new_category_name(product: ExtractedProduct) -> str:
    """
    Derive a clean new category name from a product name when no existing
    category matches with sufficient confidence.

    Strategy:
      - Take the product name
      - Strip quantities, sizes, punctuation
      - Keep the first 1-3 meaningful title-cased words
    Examples:
      "Nike Air Max 270 - Size 10" → "Nike Air Max"
      "Red Cotton T-Shirt XL" → "T-Shirt"
      "Basmati Rice 5kg Pack" → "Basmati Rice"
    """
    name = product.name.strip()

    # Remove common noise patterns: sizes, weights, pack descriptors, codes
    noise_patterns = [
        r"\b(size|sz|xl|xxl|xs|sm|md|lg|s|m|l|x)\b",
        r"\b\d+\s*(kg|g|gm|ml|l|ltr|liter|litre|oz|lb|pack|pcs|piece|pkt|box|set)\b",
        r"\b\d+\s*-\s*\d+\b",    # ranges like "10-12"
        r"[/|\\].*",             # everything after / or |
        r"\s*[-–—]\s*.*",        # everything after a dash
        r"\(.*?\)",              # parenthetical content
        r"[^a-zA-Z0-9 ]",        # non-alphanumeric (except spaces)
    ]
    cleaned = name
    for pattern in noise_patterns:
        cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)

    # Collapse whitespace and title-case
    words = [w for w in cleaned.split() if len(w) > 1]

    if not words:
        # Fallback: first 2 words of original name, title-cased
        words = product.name.split()[:2]

    # Keep first 3 meaningful words max
    category_name = " ".join(words[:3]).title()

    # If line1 gives us context and name was very generic, prefer line1 prefix
    if len(words) == 1 and product.line1:
        extra = product.line1.split()[:2]
        if extra:
            category_name = " ".join(extra).title()

    return category_name or "Uncategorised"


async def match_categories(
    products: List[ExtractedProduct],
    categories: List[CategoryInput],
) -> List[ExtractedProduct]:
    """
    Assign the best-matching categoryId to each product using embedding cosine similarity.

    - If best_sim >= SIMILARITY_THRESHOLD:
        categoryId = matched id, isNewCategory = False
    - If best_sim < SIMILARITY_THRESHOLD:
        categoryId = None, isNewCategory = True,
        categorySuggestion = AI-derived new category name (for the user to accept/edit)
    """
    if not categories:
        logger.warning("No categories provided — marking all products as new-category")
        for product in products:
            product.isNewCategory = True
            product.categorySuggestion = product.category.title() if product.category else _derive_new_category_name(product)
        return products

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — skipping category matching")
        return products

    client = AsyncOpenAI(api_key=api_key)

    # ── Build text inputs ─────────────────────────────────────────────────────
    product_texts = [
        product.category if product.category else " ".join(filter(None, [product.name, product.line1, product.line2]))
        for product in products
    ]
    category_texts = [c.name for c in categories]

    logger.info(
        "Embedding %d products and %d categories for matching",
        len(product_texts),
        len(category_texts),
    )

    try:
        all_texts = product_texts + category_texts
        all_embeddings = await _get_embeddings(all_texts, client)

        product_embeddings = all_embeddings[: len(products)]
        category_embeddings = all_embeddings[len(products):]

    except Exception as exc:
        logger.error("Embedding call failed: %s", exc)
        return products

    # ── Match each product to best category ───────────────────────────────────
    for i, product in enumerate(products):
        best_sim = -1.0
        best_idx = 0

        for j, cat_emb in enumerate(category_embeddings):
            sim = _cosine_similarity(product_embeddings[i], cat_emb)
            if sim > best_sim:
                best_sim = sim
                best_idx = j

        best_category = categories[best_idx]

        if best_sim >= SIMILARITY_THRESHOLD:
            # ✅ Confident match — use existing category
            product.categoryId = best_category.id
            product.categorySuggestion = best_category.name
            product.isNewCategory = False
            logger.info(
                "Product '%s' (AI category: '%s') → existing category '%s' (similarity=%.3f)",
                product.name, product.category, best_category.name, best_sim,
            )
        else:
            # ❌ No confident match — suggest a brand-new category
            product.categoryId = None
            product.isNewCategory = True
            product.categorySuggestion = product.category.title() if product.category else _derive_new_category_name(product)
            logger.info(
                "Product '%s' — no match (best=%.3f for '%s') → suggesting new category '%s'",
                product.name, best_sim, best_category.name, product.categorySuggestion,
            )

    logger.info("Category matching complete")
    return products

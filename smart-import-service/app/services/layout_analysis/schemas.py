"""Internal schemas for layout analysis (not part of the public HTTP contract)."""

from __future__ import annotations

from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field

BlockType = Literal["image", "text"]


class OcrWordBox(BaseModel):
    """Single OCR word with pixel-space bounding box on the analysis image."""

    text: str
    bbox: List[int] = Field(..., description="[x1, y1, x2, y2] pixel coordinates")
    conf: int = 0


class LayoutBlock(BaseModel):
    """One layout block for downstream mapping / optional LLM context."""

    type: BlockType
    bbox: List[int] = Field(..., description="[x1, y1, x2, y2] pixel coordinates")
    text: Optional[str] = None
    layout_label: Optional[str] = Field(
        default=None,
        description="Optional coarse label from token classification (e.g. header, answer).",
    )


class LayoutAnalysisResult(BaseModel):
    """Structured layout: image regions + text blocks."""

    blocks: List[LayoutBlock]
    image_size: tuple[int, int]  # width, height
    model_id: Optional[str] = None
    used_hf_model: bool = False


class MappedProductCandidate(BaseModel):
    """image ↔ nearby text mapping for GPT context."""

    image_bbox: List[int]
    label: str = ""
    related_text_blocks: List[dict[str, Any]] = Field(default_factory=list)


class LayoutContextPayload(BaseModel):
    """
    Serializable payload passed to parse_products as optional JSON-friendly dict.
    """

    blocks: List[dict[str, Any]]
    products: List[dict[str, Any]]
    image_size: tuple[int, int]
    meta: dict[str, Any] = Field(default_factory=dict)

    def to_prompt_dict(self) -> dict[str, Any]:
        return {
            "blocks": self.blocks,
            "products": self.products,
            "image_size": list(self.image_size),
            "meta": self.meta,
        }

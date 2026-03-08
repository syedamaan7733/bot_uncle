from typing import List, Optional
from pydantic import BaseModel, Field


class CategoryInput(BaseModel):
    id: str
    name: str


class ProcessImageRequest(BaseModel):
    imageUrl: str
    categories: List[CategoryInput] = Field(default_factory=list)


class ExtractedProduct(BaseModel):
    name: str
    price: float = 0.0
    line1: Optional[str] = None
    line2: Optional[str] = None
    line3: Optional[str] = None
    category: Optional[str] = None
    categoryId: Optional[str] = None
    categorySuggestion: Optional[str] = None
    isNewCategory: bool = False
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ProcessImageResponse(BaseModel):
    products: List[ExtractedProduct]

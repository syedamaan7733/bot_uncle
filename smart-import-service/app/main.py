import asyncio
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.import_routes import router as import_router
from app.services.layout_analysis.model_loader import (
    get_layout_model,
    is_layout_model_enabled,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Pre-load LayoutLMv3 on startup so first /process-image is not capped by HF download."""
    raw = os.getenv("LAYOUT_WARMUP", "true").strip().lower()
    if raw not in ("0", "false", "no", "off") and is_layout_model_enabled():
        await asyncio.to_thread(get_layout_model)
    yield


app = FastAPI(
    title="Bot Uncle — Smart Import AI Service",
    version="1.0.0",
    description="AI-powered catalog image processing service",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "smart-import"}

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes.import_routes import router as import_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

app = FastAPI(
    title="Bot Uncle — Smart Import AI Service",
    version="1.0.0",
    description="AI-powered catalog image processing service",
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

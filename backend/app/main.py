import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from app.routers.gold import router as gold_router
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the cache on startup so first request is fast
    try:
        from app.services.data_service import get_current_price
        get_current_price()
    except Exception:
        pass
    yield


app = FastAPI(
    title="Gold Price Forecaster API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(gold_router)


@app.get("/health")
async def health():
    return {"status": "ok", "ticker": settings.gold_ticker}


# Serve React frontend in production (when dist/ exists)
_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(str(_dist / "index.html"))

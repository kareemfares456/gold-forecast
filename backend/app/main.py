import os
import threading
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from app.routers.gold import router as gold_router
from app.config import settings


def _warm_all_caches():
    """Pre-populate all caches in a background thread so the first real
    user request is served instantly instead of waiting for computation."""
    try:
        from app.services.data_service import get_current_price
        from app.services.technical_service import get_technical_indicators
        from app.services.forecast_service import get_ensemble_forecast
        from app.services.institutional_service import get_institutional_forecasts

        price_data = get_current_price()
        get_technical_indicators()
        get_ensemble_forecast()
        if price_data:
            get_institutional_forecasts(
                current_price=price_data.get("price", 0),
                change_pct=price_data.get("change_pct", 0),
            )
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm all caches in the background — server starts immediately and
    # data is ready before the first user request arrives.
    threading.Thread(target=_warm_all_caches, daemon=True).start()
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
        # Serve real static files (sitemap.xml, robots.txt, favicon.svg, etc.)
        file_path = _dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Fall back to index.html for all SPA routes
        return FileResponse(str(_dist / "index.html"))

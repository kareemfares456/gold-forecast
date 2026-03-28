import os
import threading
from datetime import date
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from contextlib import asynccontextmanager

from app.routers.gold import router as gold_router
from app.routers.tracker import router as tracker_router
from app.services import tracker_service
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
    # Initialise the tracker DB (no-op if already exists)
    tracker_service.init_db()
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
    allow_methods=["GET", "DELETE"],
    allow_headers=["*"],
)

app.include_router(gold_router)
app.include_router(tracker_router)


@app.get("/health")
async def health():
    return {"status": "ok", "ticker": settings.gold_ticker}


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    """Dynamic sitemap — lastmod is always today so Google sees fresh content."""
    today = date.today().isoformat()
    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://www.goldpriceforecasted.com/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en"        href="https://www.goldpriceforecasted.com/"/>
    <xhtml:link rel="alternate" hreflang="ar"        href="https://www.goldpriceforecasted.com/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.goldpriceforecasted.com/"/>
  </url>
</urlset>"""
    return Response(
        content=content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# Serve React frontend in production (when dist/ exists)
_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    # Hashed assets (/assets/*.js, /assets/*.css) get long-term caching —
    # they are already handled by the StaticFiles mount above with immutable
    # content-hash filenames, so browsers re-fetch automatically on deploy.

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve real static files (sitemap.xml, robots.txt, favicon.svg, etc.)
        file_path = _dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Fall back to index.html — always no-cache so browsers fetch the
        # latest version and pick up the new hashed JS/CSS filenames.
        return FileResponse(
            str(_dist / "index.html"),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.services.data_service import get_current_price
from app.services.technical_service import get_technical_indicators
from app.services.forecast_service import get_ensemble_forecast
from app.services.institutional_service import get_institutional_forecasts

router = APIRouter(prefix="/api/gold", tags=["gold"])


@router.get("/price")
async def price():
    data = get_current_price()
    if "error" in data:
        return JSONResponse(status_code=503, content=data)
    return JSONResponse(
        content=data,
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/forecast")
async def forecast(lang: str = Query("en")):
    data = get_ensemble_forecast(lang=lang)
    if "error" in data:
        return JSONResponse(status_code=503, content=data)

    # Persist today's forecasts to the tracker DB (dedup: one per timeframe per day)
    try:
        from app.services import tracker_service
        tracker_service.capture_daily_forecasts(data)
    except Exception:
        pass  # Never fail the main forecast response

    return JSONResponse(
        content=data,
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/technical")
async def technical():
    data = get_technical_indicators()
    if "error" in data:
        return JSONResponse(status_code=503, content=data)
    return JSONResponse(
        content=data,
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/institutional")
async def institutional(lang: str = Query("en")):
    price_data = get_current_price()
    current_price = price_data.get("current_price", 0)
    change_pct = price_data.get("change_pct", 0)
    data = get_institutional_forecasts(current_price, change_pct, lang=lang)
    return JSONResponse(
        content=data,
        headers={"Cache-Control": "no-cache"},
    )

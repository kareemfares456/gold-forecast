from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services import tracker_service
from app.services.data_service import get_current_price

router = APIRouter(prefix="/api/gold", tags=["tracker"])


@router.get("/tracker")
async def get_tracker():
    """
    Return all forecast accuracy records.
    Resolves any pending records against current price history before responding.
    """
    try:
        price_data = get_current_price()
        tracker_service.resolve_pending_records(price_data)
    except Exception:
        pass  # Never fail — return whatever is in DB

    records = tracker_service.get_all_records()
    return JSONResponse(
        content={"records": records},
        headers={"Cache-Control": "no-cache"},
    )


@router.delete("/tracker")
async def clear_tracker():
    """Delete all forecast accuracy records."""
    tracker_service.clear_all_records()
    return JSONResponse(content={"ok": True})

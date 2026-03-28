"""
Server-side forecast accuracy tracker using SQLite.

Records are captured once per timeframe per calendar day when the forecast
endpoint is called. Pending records are resolved against price history when
the tracker endpoint is read.
"""

import sqlite3
from datetime import date, timedelta, timezone, datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "forecast_tracker.db"


# ─── DB Setup ─────────────────────────────────────────────────────────────────

def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the forecast_records table if it doesn't exist."""
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS forecast_records (
                id               TEXT PRIMARY KEY,
                timeframe        TEXT NOT NULL,
                label            TEXT,
                trading_days     INTEGER,
                predicted_price  REAL,
                confidence_low   REAL,
                confidence_high  REAL,
                direction        TEXT,
                current_price    REAL,
                generated_at     TEXT,
                capture_date     TEXT NOT NULL,
                target_date      TEXT NOT NULL,
                status           TEXT DEFAULT 'pending',
                actual_price     REAL,
                direction_met    INTEGER,
                within_interval  INTEGER,
                resolved_at      TEXT
            )
        """)
        conn.commit()


# ─── Date Helpers ─────────────────────────────────────────────────────────────

def _compute_target_date(from_date: str, trading_days: int) -> str:
    """Advance from_date by trading_days business days (skip Sat/Sun)."""
    d = date.fromisoformat(from_date)
    remaining = trading_days
    while remaining > 0:
        d += timedelta(days=1)
        if d.weekday() < 5:   # 0=Mon … 4=Fri
            remaining -= 1
    return d.isoformat()


def _find_actual_price(target_date: str, price_map: dict):
    """
    Return the close price for target_date, scanning ±5 calendar days
    to handle weekends, holidays, and data gaps.
    """
    if target_date in price_map:
        return price_map[target_date]

    d = date.fromisoformat(target_date)
    for i in range(1, 6):
        key = (d + timedelta(days=i)).isoformat()
        if key in price_map:
            return price_map[key]
    for i in range(1, 6):
        key = (d - timedelta(days=i)).isoformat()
        if key in price_map:
            return price_map[key]
    return None


# ─── Core Operations ──────────────────────────────────────────────────────────

def capture_daily_forecasts(forecast_data: dict):
    """
    Persist today's forecasts from get_ensemble_forecast() output.
    One record per timeframe per calendar day — silently skips duplicates.
    """
    forecasts = forecast_data.get("forecasts") or []
    if not forecasts:
        return

    capture_date = date.today().isoformat()
    current_price = forecast_data.get("current_price")
    generated_at = forecast_data.get("generated_at", "")

    with _get_conn() as conn:
        for f in forecasts:
            tf = f.get("timeframe")
            if not tf:
                continue
            record_id = f"{tf}_{capture_date}"

            # Skip if already captured for this timeframe today
            if conn.execute(
                "SELECT 1 FROM forecast_records WHERE id = ?", (record_id,)
            ).fetchone():
                continue

            target_date = _compute_target_date(capture_date, f.get("trading_days", 1))
            conn.execute(
                """
                INSERT INTO forecast_records
                  (id, timeframe, label, trading_days, predicted_price,
                   confidence_low, confidence_high, direction, current_price,
                   generated_at, capture_date, target_date, status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending')
                """,
                (
                    record_id, tf, f.get("label"), f.get("trading_days"),
                    f.get("predicted_price"), f.get("confidence_low"),
                    f.get("confidence_high"), f.get("direction"),
                    current_price, generated_at, capture_date, target_date,
                ),
            )
        conn.commit()


def resolve_pending_records(price_data: dict):
    """
    Resolve any pending records whose target_date <= today using price history.
    Called before returning tracker data so records are always up-to-date.
    """
    history = price_data.get("history") or []
    if not history:
        return

    price_map = {
        p["date"]: p["close"]
        for p in history
        if p.get("date") and p.get("close") is not None
    }
    today = date.today().isoformat()

    with _get_conn() as conn:
        pending = conn.execute(
            "SELECT * FROM forecast_records WHERE status = 'pending' AND target_date <= ?",
            (today,),
        ).fetchall()

        for record in pending:
            actual = _find_actual_price(record["target_date"], price_map)
            if actual is None:
                continue

            cap_price = record["current_price"] or 0
            delta = actual - cap_price
            actual_dir = "up" if delta > 0.5 else ("down" if delta < -0.5 else "flat")
            direction_met = 1 if record["direction"] == actual_dir else 0
            within_interval = (
                1 if record["confidence_low"] <= actual <= record["confidence_high"] else 0
            )
            resolved_at = datetime.now(timezone.utc).isoformat()

            conn.execute(
                """
                UPDATE forecast_records
                SET status = 'resolved', actual_price = ?, direction_met = ?,
                    within_interval = ?, resolved_at = ?
                WHERE id = ?
                """,
                (actual, direction_met, within_interval, resolved_at, record["id"]),
            )

        conn.commit()


def get_all_records() -> list:
    """Return all records ordered by capture_date DESC then timeframe."""
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM forecast_records ORDER BY capture_date DESC, timeframe"
        ).fetchall()

    result = []
    for row in rows:
        d = dict(row)
        # Convert SQLite INTEGER (0/1) to JSON boolean
        if d["direction_met"] is not None:
            d["direction_met"] = bool(d["direction_met"])
        if d["within_interval"] is not None:
            d["within_interval"] = bool(d["within_interval"])
        result.append(d)
    return result


def clear_all_records():
    """Delete all tracker records."""
    with _get_conn() as conn:
        conn.execute("DELETE FROM forecast_records")
        conn.commit()

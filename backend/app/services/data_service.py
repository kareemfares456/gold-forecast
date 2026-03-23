import yfinance as yf
import pandas as pd
import requests
from datetime import datetime, timezone, timedelta
from io import StringIO
from typing import Dict, Any, Optional

from app.config import settings
from app.utils.cache import cache

# Fallback tickers in priority order
TICKER_FALLBACKS = ["GC=F", "XAUUSD=X", "GLD"]

# Browser-like session to reduce Yahoo Finance blocks
def _make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    })
    return s


# ── Stooq fallback (free CSV, no auth, works on cloud IPs) ──────────────────
_STOOQ_SYMBOLS = ["xauusd", "gc.f"]   # gold spot then gold futures

def _fetch_via_stooq(days: int = 400) -> Optional[pd.DataFrame]:
    """Fetch OHLCV from stooq.com CSV API — no API key, no IP blocks."""
    d2 = datetime.now().strftime("%Y%m%d")
    d1 = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
    for sym in _STOOQ_SYMBOLS:
        try:
            url = f"https://stooq.com/q/d/l/?s={sym}&d1={d1}&d2={d2}&i=d"
            resp = requests.get(url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            })
            if resp.status_code != 200 or "No data" in resp.text or len(resp.text) < 50:
                continue
            df = pd.read_csv(StringIO(resp.text), parse_dates=["Date"])
            df = df.rename(columns={"Date": "date", "Open": "Open", "High": "High",
                                     "Low": "Low", "Close": "Close", "Volume": "Volume"})
            df = df.set_index("date")
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()
            if df.empty or len(df) < 5:
                continue
            # Volume may be missing from spot data — fill with 0
            if "Volume" not in df.columns:
                df["Volume"] = 0
            return df
        except Exception:
            continue
    return None


# ── yfinance methods ─────────────────────────────────────────────────────────

def _fetch_via_ticker(symbol: str, period: str) -> Optional[pd.DataFrame]:
    try:
        t = yf.Ticker(symbol, session=_make_session())
        df = t.history(period=period, auto_adjust=True)
        if df.empty:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.index = pd.to_datetime(df.index).tz_localize(None)
        return df
    except Exception:
        return None


def _fetch_via_download(symbol: str, period: str) -> Optional[pd.DataFrame]:
    try:
        df = yf.download(symbol, period=period, auto_adjust=True, progress=False,
                         session=_make_session())
        if df.empty:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.index = pd.to_datetime(df.index)
        if df.index.tz is not None:
            df.index = df.index.tz_localize(None)
        return df
    except Exception:
        return None


def _fetch_raw(period: str = "1y") -> Optional[pd.DataFrame]:
    """Try yfinance first, then Stooq as cloud-safe fallback."""
    days = 400 if "1y" in period else 800

    # 1. Try yfinance
    tickers = [settings.gold_ticker] + [t for t in TICKER_FALLBACKS if t != settings.gold_ticker]
    for symbol in tickers:
        df = _fetch_via_ticker(symbol, period)
        if df is not None and not df.empty:
            return df
        df = _fetch_via_download(symbol, period)
        if df is not None and not df.empty:
            return df

    # 2. Fallback: Stooq CSV (works on cloud IPs, no key needed)
    return _fetch_via_stooq(days=days)


def get_ohlcv_df(period: str = "1y") -> Optional[pd.DataFrame]:
    cache_key = f"ohlcv_{settings.gold_ticker}_{period}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    df = _fetch_raw(period)
    if df is not None:
        cache.set(cache_key, df, settings.cache_ttl_seconds)
    return df


def get_current_price() -> Dict[str, Any]:
    cache_key = f"current_price_{settings.gold_ticker}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    df = get_ohlcv_df("1y")
    if df is None or df.empty:
        return {"error": "Unable to fetch gold price data"}

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

    current_price = float(latest["Close"])
    prev_close = float(prev["Close"])
    change = current_price - prev_close
    change_pct = (change / prev_close) * 100 if prev_close else 0.0

    high_52w = float(df["High"].max())
    low_52w = float(df["Low"].min())

    history_df = df.tail(90)
    history = []
    for idx, row in history_df.iterrows():
        try:
            history.append({
                "date": idx.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
            })
        except Exception:
            continue

    result = {
        "current_price": round(current_price, 2),
        "currency": "USD",
        "change": round(change, 2),
        "change_pct": round(change_pct, 4),
        "high_52w": round(high_52w, 2),
        "low_52w": round(low_52w, 2),
        "history": history,
        "last_updated": df.index[-1].strftime("%Y-%m-%d"),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    cache.set(cache_key, result, settings.cache_ttl_seconds)
    return result


def get_history_df(days: int = 365) -> Optional[pd.DataFrame]:
    df = get_ohlcv_df("2y")
    if df is None:
        return None
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
    return df[df.index >= cutoff].copy()

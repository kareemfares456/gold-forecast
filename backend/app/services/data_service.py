import yfinance as yf
import pandas as pd
import requests
from datetime import datetime, timezone, timedelta
from io import StringIO
from typing import Dict, Any, Optional

from app.config import settings
from app.utils.cache import cache

TICKER_FALLBACKS = ["GC=F", "XAUUSD=X", "GLD"]

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def _make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(_HEADERS)
    return s


# ── 1. yfinance (works locally, often blocked on cloud) ─────────────────────

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
        df = yf.download(symbol, period=period, auto_adjust=True,
                         progress=False, session=_make_session())
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


# ── 2. Direct Yahoo Finance JSON (bypasses yfinance lib issues) ──────────────

def _fetch_via_yahoo_direct(days: int = 400) -> Optional[pd.DataFrame]:
    """Hit Yahoo Finance chart API directly with cookie+crumb."""
    session = _make_session()
    try:
        # Step 1 — get cookie
        session.get("https://finance.yahoo.com/quote/GC=F",
                    timeout=10, allow_redirects=True)
        # Step 2 — get crumb
        crumb_r = session.get(
            "https://query2.finance.yahoo.com/v1/test/getcrumb", timeout=10)
        crumb = crumb_r.text.strip()
        if not crumb or "<" in crumb:
            return None
        # Step 3 — fetch chart data
        end_ts = int(datetime.now().timestamp())
        start_ts = int((datetime.now() - timedelta(days=days)).timestamp())
        r = session.get(
            "https://query2.finance.yahoo.com/v8/finance/chart/GC%3DF",
            params={"period1": start_ts, "period2": end_ts,
                    "interval": "1d", "crumb": crumb},
            timeout=20,
        )
        data = r.json()
        result = data["chart"]["result"][0]
        ts = result["timestamp"]
        ohlcv = result["indicators"]["quote"][0]
        adj = result["indicators"].get("adjclose", [{}])[0]
        closes = adj.get("adjclose") or ohlcv["close"]
        df = pd.DataFrame({
            "Open":   ohlcv["open"],
            "High":   ohlcv["high"],
            "Low":    ohlcv["low"],
            "Close":  closes,
            "Volume": ohlcv.get("volume", [0] * len(ts)),
        }, index=pd.to_datetime(ts, unit="s"))
        df.index = df.index.tz_localize(None)
        df = df.dropna(subset=["Close"])
        return df if not df.empty else None
    except Exception:
        return None


# ── 3. Stooq CSV (free, no auth, usually works on cloud) ────────────────────

def _fetch_via_stooq(days: int = 400) -> Optional[pd.DataFrame]:
    d2 = datetime.now().strftime("%Y%m%d")
    d1 = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
    for sym in ["xauusd", "gc.f"]:
        try:
            url = f"https://stooq.com/q/d/l/?s={sym}&d1={d1}&d2={d2}&i=d"
            resp = requests.get(url, timeout=15, headers=_HEADERS)
            if resp.status_code != 200 or len(resp.text) < 50:
                continue
            text = resp.text
            if "No data" in text or "Exceeded" in text:
                continue
            df = pd.read_csv(StringIO(text), parse_dates=["Date"])
            df = df.set_index("Date")
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()
            if "Volume" not in df.columns:
                df["Volume"] = 0
            if df.empty or len(df) < 5:
                continue
            return df
        except Exception:
            continue
    return None


# ── 4. FRED — London Gold Fix (Federal Reserve, zero restrictions) ───────────

def _fetch_via_fred(days: int = 400) -> Optional[pd.DataFrame]:
    """FRED GOLDPMGBD228NLBM — London Gold Fixing, USD/troy oz.
    Lags ~1 business day but works from ANY IP with no auth."""
    try:
        url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=GOLDPMGBD228NLBM"
        resp = requests.get(url, timeout=20, headers=_HEADERS)
        if resp.status_code != 200:
            return None
        df = pd.read_csv(StringIO(resp.text), parse_dates=["DATE"])
        df = df.rename(columns={"DATE": "Date", "GOLDPMGBD228NLBM": "Close"})
        df = df.set_index("Date")
        df.index = pd.to_datetime(df.index)
        df = df[df["Close"] != "."].copy()
        df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
        df = df.dropna(subset=["Close"])
        # FRED only has Close — synthesise OHLV as identical for compatibility
        df["Open"] = df["Close"]
        df["High"] = df["Close"]
        df["Low"] = df["Close"]
        df["Volume"] = 0
        cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
        df = df[df.index >= cutoff]
        return df if len(df) >= 5 else None
    except Exception:
        return None


# ── Orchestrator ─────────────────────────────────────────────────────────────

def _fetch_raw(period: str = "1y") -> Optional[pd.DataFrame]:
    days = 400 if "1y" in period else 800

    # Try each source in order — first success wins
    for fn in [
        lambda: _fetch_via_ticker(settings.gold_ticker, period),
        lambda: _fetch_via_download(settings.gold_ticker, period),
        lambda: _fetch_via_yahoo_direct(days),
        lambda: _fetch_via_stooq(days),
        lambda: _fetch_via_fred(days),
    ]:
        try:
            df = fn()
            if df is not None and not df.empty:
                return df
        except Exception:
            continue
    return None


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

    history_df = df
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

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List

from app.services.data_service import get_ohlcv_df
from app.utils.cache import cache
from app.config import settings


def _safe_float(val) -> Optional[float]:
    """Convert to float, return None if NaN/None."""
    try:
        v = float(val)
        return round(v, 4) if not np.isnan(v) else None
    except (TypeError, ValueError):
        return None


def compute_indicators(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute all technical indicators on the provided OHLCV DataFrame."""
    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    n = len(df)

    # ── Moving Averages ─────────────────────────────────────────────────────
    ma_20 = _safe_float(close.rolling(20).mean().iloc[-1]) if n >= 20 else None
    ma_50 = _safe_float(close.rolling(50).mean().iloc[-1]) if n >= 50 else None
    ma_200 = _safe_float(close.rolling(200).mean().iloc[-1]) if n >= 200 else None
    ema_12 = _safe_float(close.ewm(span=12, adjust=False).mean().iloc[-1])
    ema_26 = _safe_float(close.ewm(span=26, adjust=False).mean().iloc[-1])

    # ── RSI (14) ─────────────────────────────────────────────────────────────
    rsi_val = None
    if n >= 15:
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi_series = 100 - (100 / (1 + rs))
        rsi_val = _safe_float(rsi_series.iloc[-1])

    rsi_signal = "neutral"
    if rsi_val is not None:
        if rsi_val > 70:
            rsi_signal = "overbought"
        elif rsi_val < 30:
            rsi_signal = "oversold"

    # ── MACD (12, 26, 9) ─────────────────────────────────────────────────────
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line_series = ema12 - ema26
    signal_line_series = macd_line_series.ewm(span=9, adjust=False).mean()
    histogram_series = macd_line_series - signal_line_series

    macd_line = _safe_float(macd_line_series.iloc[-1])
    signal_line = _safe_float(signal_line_series.iloc[-1])
    histogram = _safe_float(histogram_series.iloc[-1])

    macd_crossover = "neutral"
    if len(histogram_series) >= 2:
        prev_hist = histogram_series.iloc[-2]
        curr_hist = histogram_series.iloc[-1]
        if not (np.isnan(prev_hist) or np.isnan(curr_hist)):
            if prev_hist < 0 and curr_hist > 0:
                macd_crossover = "buy"
            elif prev_hist > 0 and curr_hist < 0:
                macd_crossover = "sell"
            elif curr_hist > 0:
                macd_crossover = "buy"
            else:
                macd_crossover = "sell"

    # ── Bollinger Bands (20, 2) ──────────────────────────────────────────────
    bb_upper = bb_middle = bb_lower = bb_bandwidth = bb_pct_b = None
    if n >= 20:
        rolling_mean = close.rolling(20).mean()
        rolling_std = close.rolling(20).std()
        upper_series = rolling_mean + 2 * rolling_std
        lower_series = rolling_mean - 2 * rolling_std

        bb_upper = _safe_float(upper_series.iloc[-1])
        bb_middle = _safe_float(rolling_mean.iloc[-1])
        bb_lower = _safe_float(lower_series.iloc[-1])

        if bb_upper and bb_lower and bb_middle and bb_middle != 0:
            bb_bandwidth = _safe_float((bb_upper - bb_lower) / bb_middle)

        curr_close = float(close.iloc[-1])
        if bb_upper and bb_lower and bb_upper != bb_lower:
            bb_pct_b = _safe_float((curr_close - bb_lower) / (bb_upper - bb_lower))

    bb_signal = "neutral"
    if bb_bandwidth is not None:
        avg_bw = _safe_float(
            ((close.rolling(20).mean() + 2 * close.rolling(20).std()) -
             (close.rolling(20).mean() - 2 * close.rolling(20).std()))
            .rolling(50).mean().iloc[-1]
        ) if n >= 70 else None
        if avg_bw and bb_middle:
            actual_bw_abs = (bb_upper - bb_lower) if (bb_upper and bb_lower) else 0
            avg_bw_abs = avg_bw
            if actual_bw_abs < avg_bw_abs * 0.8:
                bb_signal = "squeeze"
            elif actual_bw_abs > avg_bw_abs * 1.2:
                bb_signal = "expansion"

    # ── Overall Trend Direction ──────────────────────────────────────────────
    curr_price = float(close.iloc[-1])
    bullish_count = 0
    bearish_count = 0

    if ma_20 and curr_price > ma_20:
        bullish_count += 1
    elif ma_20:
        bearish_count += 1

    if ma_50 and curr_price > ma_50:
        bullish_count += 1
    elif ma_50:
        bearish_count += 1

    if ma_200 and curr_price > ma_200:
        bullish_count += 1
    elif ma_200:
        bearish_count += 1

    if bullish_count > bearish_count:
        trend_direction = "bullish"
    elif bearish_count > bullish_count:
        trend_direction = "bearish"
    else:
        trend_direction = "neutral"

    # Overall composite signal
    signals = [trend_direction, rsi_signal if rsi_signal in ("neutral",) else
               ("bullish" if rsi_signal == "oversold" else "bearish"), macd_crossover]
    bull = sum(1 for s in signals if s == "bullish" or s == "buy")
    bear = sum(1 for s in signals if s == "bearish" or s == "sell")
    overall = "bullish" if bull > bear else ("bearish" if bear > bull else "neutral")

    # ── History (last 60 days with indicators) ───────────────────────────────
    hist_df = df.tail(60).copy()
    ma20_series = close.rolling(20).mean()
    ma50_series = close.rolling(50).mean()
    ma200_series = close.rolling(200).mean()

    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi_full = 100 - (100 / (1 + rs))

    history = []
    for idx, row in hist_df.iterrows():
        loc = df.index.get_loc(idx)
        history.append({
            "date": idx.strftime("%Y-%m-%d"),
            "close": round(float(row["Close"]), 2),
            "ma_20": _safe_float(ma20_series.iloc[loc]),
            "ma_50": _safe_float(ma50_series.iloc[loc]),
            "ma_200": _safe_float(ma200_series.iloc[loc]),
            "rsi": _safe_float(rsi_full.iloc[loc]),
            "macd": _safe_float(macd_line_series.iloc[loc]),
            "macd_signal": _safe_float(signal_line_series.iloc[loc]),
            "bb_upper": _safe_float(upper_series.iloc[loc]) if n >= 20 else None,
            "bb_lower": _safe_float(lower_series.iloc[loc]) if n >= 20 else None,
        })

    return {
        "current_price": round(curr_price, 2),
        "moving_averages": {
            "ma_20": ma_20,
            "ma_50": ma_50,
            "ma_200": ma_200,
            "ema_12": ema_12,
            "ema_26": ema_26,
        },
        "rsi": {"value": rsi_val, "signal": rsi_signal},
        "macd": {
            "macd_line": macd_line,
            "signal_line": signal_line,
            "histogram": histogram,
            "crossover_signal": macd_crossover,
        },
        "bollinger_bands": {
            "upper": bb_upper,
            "middle": bb_middle,
            "lower": bb_lower,
            "bandwidth": bb_bandwidth,
            "percent_b": bb_pct_b,
            "signal": bb_signal,
        },
        "signals": {
            "trend_direction": trend_direction,
            "rsi_signal": rsi_signal,
            "macd_signal": macd_crossover,
            "bb_signal": bb_signal,
            "overall": overall,
        },
        "history": history,
    }


def get_technical_indicators() -> Dict[str, Any]:
    """Cached wrapper for compute_indicators."""
    cache_key = f"technical_{settings.gold_ticker}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    df = get_ohlcv_df("2y")
    if df is None or df.empty:
        return {"error": "Unable to fetch data for technical analysis"}

    result = compute_indicators(df)
    cache.set(cache_key, result, settings.forecast_cache_ttl)  # 1-hour cache
    return result

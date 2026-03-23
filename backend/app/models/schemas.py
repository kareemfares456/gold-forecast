from pydantic import BaseModel
from typing import Optional, List, Dict, Any


# ─── Price ────────────────────────────────────────────────────────────────────

class PricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class CurrentPriceResponse(BaseModel):
    current_price: float
    currency: str
    change: float
    change_pct: float
    high_52w: float
    low_52w: float
    history: List[PricePoint]
    last_updated: str
    fetched_at: str


# ─── Forecast ─────────────────────────────────────────────────────────────────

class ForecastTimeframe(BaseModel):
    timeframe: str          # "1d", "3d", "1w", "1m", "1y"
    label: str              # "Tomorrow", "3 Days", "1 Week", "1 Month", "1 Year"
    trading_days: int
    predicted_price: float
    price_change: float
    price_change_pct: float
    confidence_low: float
    confidence_high: float
    direction: str          # "up" | "down" | "flat"
    model_contributions: Optional[Dict[str, Any]] = None


class AIAnalysisResult(BaseModel):
    analysis: Optional[str] = None
    key_factors: Optional[List[str]] = None
    sentiment: Optional[str] = None   # "bullish" | "bearish" | "neutral"
    available: bool = True
    error: Optional[str] = None


class ForecastResponse(BaseModel):
    current_price: float
    forecasts: List[ForecastTimeframe]
    ai_analysis: AIAnalysisResult
    generated_at: str
    disclaimer: str


# ─── Technical ────────────────────────────────────────────────────────────────

class MovingAverages(BaseModel):
    ma_20: Optional[float] = None
    ma_50: Optional[float] = None
    ma_200: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None


class RSIData(BaseModel):
    value: Optional[float] = None
    signal: str = "neutral"   # "overbought" | "oversold" | "neutral"


class MACDData(BaseModel):
    macd_line: Optional[float] = None
    signal_line: Optional[float] = None
    histogram: Optional[float] = None
    crossover_signal: str = "neutral"   # "buy" | "sell" | "neutral"


class BollingerBands(BaseModel):
    upper: Optional[float] = None
    middle: Optional[float] = None
    lower: Optional[float] = None
    bandwidth: Optional[float] = None
    percent_b: Optional[float] = None
    signal: str = "neutral"   # "squeeze" | "expansion" | "neutral"


class OverallSignals(BaseModel):
    trend_direction: str = "neutral"   # "bullish" | "bearish" | "neutral"
    rsi_signal: str = "neutral"
    macd_signal: str = "neutral"
    bb_signal: str = "neutral"
    overall: str = "neutral"


class TechnicalHistoryPoint(BaseModel):
    date: str
    close: float
    ma_20: Optional[float] = None
    ma_50: Optional[float] = None
    ma_200: Optional[float] = None
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None


class TechnicalIndicatorsResponse(BaseModel):
    current_price: float
    moving_averages: MovingAverages
    rsi: RSIData
    macd: MACDData
    bollinger_bands: BollingerBands
    signals: OverallSignals
    history: List[TechnicalHistoryPoint]

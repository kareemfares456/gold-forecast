import anthropic
from typing import Dict, Any, Optional

from app.config import settings
from app.utils.cache import cache
from app.services.news_service import get_news_headlines


def _build_cache_key(price: float, rsi: Optional[float], macd_signal: str, lang: str = "en") -> str:
    """Build a coarse cache key so similar market states share cached responses."""
    price_bucket = int(price / 10) * 10  # e.g., 2340 -> 2340
    rsi_bucket = (
        "overbought" if (rsi and rsi > 70)
        else "oversold" if (rsi and rsi < 30)
        else "neutral"
    )
    return f"claude_analysis_{price_bucket}_{rsi_bucket}_{macd_signal}_{lang}"


def get_ai_analysis(
    current_price: float,
    change_pct: float,
    technical_signals: Dict[str, Any],
    forecasts: Dict[str, float],
    lang: str = "en",
) -> Dict[str, Any]:
    """
    Call Claude API to generate a narrative gold market analysis.
    Returns cached result if available. Gracefully handles missing API key.
    """
    if not settings.anthropic_api_key:
        return {
            "analysis": None,
            "key_factors": None,
            "sentiment": None,
            "available": False,
            "error": "ANTHROPIC_API_KEY not configured",
        }

    rsi_val = technical_signals.get("rsi", {}).get("value")
    macd_signal = technical_signals.get("macd", {}).get("crossover_signal", "neutral")
    cache_key = _build_cache_key(current_price, rsi_val, macd_signal, lang)

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Build data summary for Claude
    ma = technical_signals.get("moving_averages", {})
    signals = technical_signals.get("signals", {})
    trend = signals.get("trend_direction", "unknown")
    rsi_signal = signals.get("rsi_signal", "neutral")
    overall = signals.get("overall", "neutral")

    ma_status = []
    if ma.get("ma_20"):
        rel = "above" if current_price > ma["ma_20"] else "below"
        ma_status.append(f"20-day MA ({rel} at ${ma['ma_20']:.2f})")
    if ma.get("ma_50"):
        rel = "above" if current_price > ma["ma_50"] else "below"
        ma_status.append(f"50-day MA ({rel} at ${ma['ma_50']:.2f})")
    if ma.get("ma_200"):
        rel = "above" if current_price > ma["ma_200"] else "below"
        ma_status.append(f"200-day MA ({rel} at ${ma['ma_200']:.2f})")

    forecast_lines = "\n".join([
        f"  - {label}: ${price:.2f}"
        for label, price in forecasts.items()
    ])

    headlines = get_news_headlines(max_headlines=8)
    news_block = (
        "Recent headlines driving markets:\n" +
        "\n".join(f"- {h}" for h in headlines)
        if headlines else "No recent headlines available."
    )

    lang_instruction = (
        "\nIMPORTANT: Write all analysis text (the content after each colon) in Arabic (العربية). "
        "Keep the format markers TODAY:, TOMORROW:, NEXT_WEEK:, NEXT_MONTH:, NEXT_YEAR:, SENTIMENT: in English exactly as shown."
        if lang == "ar" else ""
    )

    prompt = f"""You are a concise gold market analyst. Write exactly 5 tweet-length bullets — one per time horizon — explaining what gold will do and WHY. Ground each "why" in the actual news headlines provided below. Plain language, no jargon, max 280 chars each.{lang_instruction}

Current market data:
- Price: ${current_price:.2f} ({change_pct:+.2f}% today)
- RSI: {f"{rsi_val:.1f} ({rsi_signal})" if rsi_val else 'N/A'}
- MACD: {macd_signal}
- Trend: {trend} | Signal: {overall}
- Moving averages: {', '.join(ma_status) if ma_status else 'N/A'}
- Model forecasts: {', '.join([f"{l}: ${p:.0f}" for l, p in forecasts.items()])}

{news_block}

Format your response exactly like this (no other text):
TODAY: <what gold is doing right now and the specific news reason why>
TOMORROW: <what to expect tomorrow and the key news driver>
NEXT_WEEK: <week outlook tied to an upcoming event or trend from the news>
NEXT_MONTH: <month outlook and the macro driver from the headlines>
NEXT_YEAR: <year outlook and the structural reason>
SENTIMENT: bullish
(or bearish or neutral)"""

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text

        # Parse sentiment and time-horizon bullets
        sentiment = "neutral"
        HORIZON_LABELS = {
            "TODAY": "Today",
            "TOMORROW": "Tomorrow",
            "NEXT_WEEK": "Next Week",
            "NEXT_MONTH": "Next Month",
            "NEXT_YEAR": "Next Year",
        }
        bullets = []
        for line in text.split("\n"):
            stripped = line.strip()
            matched = False
            for key, label in HORIZON_LABELS.items():
                if stripped.startswith(f"{key}:"):
                    bullets.append({"label": label, "text": stripped[len(key) + 1:].strip()})
                    matched = True
                    break
            if not matched and stripped.startswith("SENTIMENT:"):
                val = stripped.split(":", 1)[1].strip().lower()
                if val in ("bullish", "bearish", "neutral"):
                    sentiment = val

        result = {
            "analysis": bullets,
            "key_factors": None,
            "sentiment": sentiment,
            "available": True,
            "error": None,
        }
        cache.set(cache_key, result, settings.forecast_cache_ttl)
        return result

    except Exception as e:
        return {
            "analysis": None,
            "key_factors": None,
            "sentiment": None,
            "available": False,
            "error": str(e),
        }

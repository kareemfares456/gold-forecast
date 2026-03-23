import anthropic
import json
from typing import Dict, Any

from app.config import settings
from app.utils.cache import cache
from app.services.news_service import get_institutional_headlines

# Cache for 3 hours — refreshed more frequently to stay current
INSTITUTIONAL_CACHE_TTL = 3 * 3600


def get_institutional_forecasts(current_price: float, change_pct: float) -> Dict[str, Any]:
    """
    Use Claude to generate a structured summary of major institutional
    gold price forecasts grounded in recent news headlines.
    """
    if not settings.anthropic_api_key:
        return {"available": False, "error": "ANTHROPIC_API_KEY not configured", "institutions": []}

    price_bucket = int(current_price / 50) * 50
    cache_key = f"institutional_{price_bucket}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    headlines = get_institutional_headlines(max_headlines=12, max_age_days=3)
    news_block = (
        "Recent news from the last 3 days:\n" + "\n".join(f"- {h}" for h in headlines)
        if headlines
        else "No recent institutional headlines found — use your best knowledge of each institution's latest publicly known view."
    )

    prompt = f"""You are a financial research analyst. Gold (XAU/USD) is currently at ${current_price:.2f} ({change_pct:+.2f}% today).

{news_block}

Based on the news above AND your knowledge of each institution's most recent published research, list 6 major institutions and their current gold outlook. For each include:
- Their latest price target or directional view (reference the news where possible)
- Their primary rationale in one plain sentence
- Overall stance: bullish, neutral, or bearish

Institutions: Goldman Sachs, JPMorgan, Citigroup, UBS, Bank of America, World Gold Council.

Respond ONLY with a JSON array, no markdown, no extra text:
[
  {{
    "institution": "Goldman Sachs",
    "target": "$3,300 by end-2025",
    "stance": "bullish",
    "rationale": "Central bank demand and Fed rate cuts support structurally higher prices."
  }}
]"""

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        institutions = json.loads(text)

        note = (
            "Based on news from the last 3 days and latest published research."
            if headlines else
            "Based on latest published research — no recent headlines found."
        )
        result = {
            "available": True,
            "error": None,
            "institutions": institutions,
            "note": note,
        }
        cache.set(cache_key, result, INSTITUTIONAL_CACHE_TTL)
        return result

    except Exception as e:
        return {"available": False, "error": str(e), "institutions": []}

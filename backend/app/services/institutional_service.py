import anthropic
import json
from datetime import date
from typing import Dict, Any

from app.config import settings
from app.utils.cache import cache
from app.services.news_service import get_institutional_headlines

# Cache for 6 hours; cache key includes today's date so data refreshes daily
INSTITUTIONAL_CACHE_TTL = 6 * 3600


def get_institutional_forecasts(current_price: float, change_pct: float, lang: str = "en") -> Dict[str, Any]:
    """
    Use Claude to generate a structured summary of major institutional
    gold price forecasts grounded in recent news headlines.
    """
    if not settings.anthropic_api_key:
        return {"available": False, "error": "ANTHROPIC_API_KEY not configured", "institutions": []}

    today = date.today().isoformat()          # e.g. "2026-03-23"
    price_bucket = int(current_price / 50) * 50
    cache_key = f"institutional_{price_bucket}_{today}_{lang}"   # refreshes every day
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    headlines = get_institutional_headlines(max_headlines=12, max_age_days=3)
    news_block = (
        "Recent news from the last 3 days:\n" + "\n".join(f"- {h}" for h in headlines)
        if headlines
        else "No recent institutional headlines found — use your best knowledge of each institution's latest publicly known view."
    )

    lang_instruction = (
        '\nIMPORTANT: Write the "rationale" field value in Arabic (العربية). '
        'Keep "institution", "target", and "stance" values in English.'
        if lang == "ar" else ""
    )

    prompt = f"""You are a financial research analyst. Today's date is {today}.
Gold (XAU/USD) is currently at ${current_price:.2f} ({change_pct:+.2f}% today).

{news_block}

Based on the news above AND your knowledge of each institution's most recent published research as of {today}, list 6 major institutions and their current gold outlook. For each include:
- Their latest price target or directional view with the correct year (reference the news where possible)
- Their primary rationale in one plain sentence
- Overall stance: bullish, neutral, or bearish

Institutions: Goldman Sachs, JPMorgan, Citigroup, UBS, Bank of America, World Gold Council.{lang_instruction}

Respond ONLY with a JSON array, no markdown, no extra text:
[
  {{
    "institution": "Goldman Sachs",
    "target": "$3,500 by end-2026",
    "stance": "bullish",
    "rationale": "Central bank demand and safe-haven flows support structurally higher prices."
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

        if lang == "ar":
            note = (
                "استناداً إلى أخبار الأيام الثلاثة الأخيرة وآخر الأبحاث المنشورة."
                if headlines else
                "استناداً إلى آخر الأبحاث المنشورة — لم تُعثر على عناوين أخبار حديثة."
            )
        else:
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

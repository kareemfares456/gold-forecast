import anthropic
import json
import re
from datetime import date
from typing import Dict, Any

from app.config import settings
from app.utils.cache import cache
from app.services.news_service import get_institutional_headlines

# Refresh every 6 hours; stable cache key enables stale-while-revalidate across restarts
INSTITUTIONAL_CACHE_TTL = 6 * 3600


def _generate_institutional(lang: str, current_price: float, change_pct: float) -> Dict[str, Any]:
    """Call Claude to build institutional forecast data. Returns the result dict (no caching here)."""
    today = date.today().isoformat()
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
        max_tokens = 1200 if lang == "ar" else 700
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()

        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        try:
            institutions = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                institutions = json.loads(match.group())
            else:
                raise

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

        return {
            "available": True,
            "error": None,
            "institutions": institutions,
            "note": note,
        }

    except Exception as e:
        return {"available": False, "error": str(e), "institutions": []}


def get_institutional_forecasts(current_price: float, change_pct: float, lang: str = "en") -> Dict[str, Any]:
    """
    Return institutional gold forecasts — served instantly via stale-while-revalidate.
    Stable cache key (no date/price in key) means stale data is always available across
    restarts and deploys; TTL handles scheduled refresh every 6 hours.
    """
    if not settings.anthropic_api_key:
        return {"available": False, "error": "ANTHROPIC_API_KEY not configured", "institutions": []}

    cache_key = f"institutional_{lang}"

    fresh = cache.get(cache_key)
    if fresh is not None:
        return fresh

    stale = cache.get_stale(cache_key)
    if stale is not None:
        _cp, _ch = current_price, change_pct
        cache.schedule_refresh(
            cache_key,
            INSTITUTIONAL_CACHE_TTL,
            lambda: _generate_institutional(lang, _cp, _ch),
        )
        return stale

    # No cached data at all — generate synchronously (first ever call or after cache wipe)
    result = _generate_institutional(lang, current_price, change_pct)
    if result.get("available"):
        cache.set(cache_key, result, INSTITUTIONAL_CACHE_TTL)
    return result

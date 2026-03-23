import feedparser
from datetime import datetime, timezone, timedelta
from app.utils.cache import cache

# Public RSS feeds covering gold / macro news — no API key required
RSS_FEEDS = [
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF&region=US&lang=en-US",
    "https://www.marketwatch.com/rss/topstories",
    "https://feeds.reuters.com/reuters/businessNews",
    "https://feeds.bbci.co.uk/news/business/rss.xml",
]

KEYWORDS = {"gold", "xau", "fed", "federal reserve", "inflation", "dollar", "interest rate",
             "central bank", "treasury", "commodity", "precious metal", "geopolit", "tariff",
             "recession", "rate cut", "rate hike", "powell", "fomc"}

INSTITUTION_KEYWORDS = {
    "goldman", "jpmorgan", "jp morgan", "citigroup", "citi", "ubs", "bank of america",
    "world gold council", "morgan stanley", "barclays", "deutsche", "hsbc", "wells fargo",
    "forecast", "target", "price target", "outlook", "analyst"
}

CACHE_TTL = 900  # 15 minutes


def _entry_age_days(entry) -> float:
    """Return age of a feed entry in days. Returns 999 if unparseable."""
    for field in ("published_parsed", "updated_parsed"):
        t = entry.get(field)
        if t:
            try:
                pub = datetime(*t[:6], tzinfo=timezone.utc)
                return (datetime.now(timezone.utc) - pub).total_seconds() / 86400
            except Exception:
                pass
    return 999


def _is_relevant(text: str, keyword_set: set) -> bool:
    low = text.lower()
    return any(kw in low for kw in keyword_set)


def get_news_headlines(max_headlines: int = 8) -> list:
    cached = cache.get("news_headlines")
    if cached is not None:
        return cached

    headlines = []
    for url in RSS_FEEDS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:20]:
                title = entry.get("title", "").strip()
                if title and _is_relevant(title, KEYWORDS) and title not in headlines:
                    headlines.append(title)
                if len(headlines) >= max_headlines:
                    break
        except Exception:
            continue
        if len(headlines) >= max_headlines:
            break

    cache.set("news_headlines", headlines, CACHE_TTL)
    return headlines


def get_institutional_headlines(max_headlines: int = 12, max_age_days: float = 3) -> list:
    """Fetch recent headlines about institutional gold forecasts (last 3 days)."""
    cache_key = "institutional_headlines"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    combined_kw = KEYWORDS | INSTITUTION_KEYWORDS
    headlines = []

    for url in RSS_FEEDS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:30]:
                title = entry.get("title", "").strip()
                age = _entry_age_days(entry)
                if age > max_age_days:
                    continue
                if title and _is_relevant(title, combined_kw) and title not in headlines:
                    pub_label = ""
                    for field in ("published_parsed", "updated_parsed"):
                        t = entry.get(field)
                        if t:
                            try:
                                pub_label = datetime(*t[:6]).strftime("%b %d")
                            except Exception:
                                pass
                            break
                    headlines.append(f"{title}{f' ({pub_label})' if pub_label else ''}")
                if len(headlines) >= max_headlines:
                    break
        except Exception:
            continue
        if len(headlines) >= max_headlines:
            break

    cache.set(cache_key, headlines, CACHE_TTL)
    return headlines

import json
import threading
import time
from pathlib import Path
from typing import Any, Callable, Optional

# Persisted next to the tracker DB so the cache survives server restarts / redeploys
CACHE_FILE = Path(__file__).parent.parent.parent / "cache_store.json"


class TTLCache:
    """
    In-memory TTL cache with two extras:
      1. Disk persistence  — cache survives server restarts / redeploys.
      2. Stale-while-revalidate — get_stale() + schedule_refresh() let callers
         serve slightly-old data instantly while a background thread refreshes.
    """

    def __init__(self):
        self._store: dict = {}          # key -> (value, expires_at)
        self._lock = threading.Lock()
        self._refreshing: set = set()   # keys currently being refreshed in background
        self._load_from_disk()

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load_from_disk(self):
        try:
            if CACHE_FILE.exists():
                raw = json.loads(CACHE_FILE.read_text())
                with self._lock:
                    self._store = {
                        k: (v["value"], v["expires_at"])
                        for k, v in raw.items()
                    }
        except Exception:
            pass

    def _save_to_disk(self):
        try:
            with self._lock:
                data = {
                    k: {"value": v[0], "expires_at": v[1]}
                    for k, v in self._store.items()
                }
            CACHE_FILE.write_text(json.dumps(data, default=str))
        except Exception:
            pass

    # ── Core API ──────────────────────────────────────────────────────────────

    def get(self, key: str) -> Optional[Any]:
        """Return value only if still fresh, else None."""
        with self._lock:
            if key not in self._store:
                return None
            value, expires_at = self._store[key]
            if time.time() > expires_at:
                return None
            return value

    def get_stale(self, key: str) -> Optional[Any]:
        """Return stored value even if expired (stale-while-revalidate)."""
        with self._lock:
            if key not in self._store:
                return None
            return self._store[key][0]

    def set(self, key: str, value: Any, ttl: int) -> None:
        with self._lock:
            self._store[key] = (value, time.time() + ttl)
        # Persist in the background so callers aren't blocked
        threading.Thread(target=self._save_to_disk, daemon=True).start()

    def schedule_refresh(self, key: str, ttl: int, refresh_fn: Callable) -> None:
        """
        Spawn a background thread to refresh a stale cache entry.
        Silently skips if a refresh for this key is already running.
        """
        with self._lock:
            if key in self._refreshing:
                return
            self._refreshing.add(key)

        def _run():
            try:
                result = refresh_fn()
                if result is not None:
                    self.set(key, result, ttl)
            except Exception:
                pass
            finally:
                with self._lock:
                    self._refreshing.discard(key)

        threading.Thread(target=_run, daemon=True).start()

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)
        threading.Thread(target=self._save_to_disk, daemon=True).start()

    def clear(self) -> None:
        with self._lock:
            self._store.clear()
        threading.Thread(target=self._save_to_disk, daemon=True).start()


# Global shared cache instance
cache = TTLCache()

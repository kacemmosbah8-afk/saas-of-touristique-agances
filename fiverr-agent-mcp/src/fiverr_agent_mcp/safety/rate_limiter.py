"""Rate limiting with human-like pacing and hard caps.

Three protections, applied before each *write* action:

* a randomized human-like delay (``min_action_delay_s``…``max_action_delay_s``),
* a per-minute cap (``max_actions_per_minute``),
* a persistent per-day cap (``max_actions_per_day``), stored under the state dir
  so it survives restarts.

Exceeding a cap raises :class:`RateLimitExceeded` *before* any delay is spent.
"""

from __future__ import annotations

import asyncio
import json
import random
import time
from collections import deque
from datetime import date

from ..config import Settings
from ..exceptions import RateLimitExceeded
from ..logging_config import get_logger

logger = get_logger("safety.rate_limiter")


class RateLimiter:
    """Enforce human-like pacing and per-minute / per-day action caps.

    Args:
        settings: Active settings (delays and caps).
        sleep: Injectable async sleep (tests pass a no-op).
        clock: Injectable monotonic-ish clock returning seconds.
    """

    def __init__(self, settings: Settings, *, sleep=asyncio.sleep, clock=time.time) -> None:
        self._settings = settings
        self._sleep = sleep
        self._clock = clock
        self._recent: deque[float] = deque()
        self._state_path = settings.state_dir / "rate_state.json"
        self._day, self._day_count = self._load_daily()

    # -- daily persistence ------------------------------------------------ #
    def _load_daily(self) -> tuple[str, int]:
        today = date.today().isoformat()
        try:
            data = json.loads(self._state_path.read_text())
            if data.get("date") == today:
                return today, int(data.get("count", 0))
        except Exception:
            pass
        return today, 0

    def _save_daily(self) -> None:
        try:
            self._state_path.parent.mkdir(parents=True, exist_ok=True)
            self._state_path.write_text(json.dumps({"date": self._day, "count": self._day_count}))
        except Exception as exc:  # pragma: no cover
            logger.debug("Could not persist rate state: %s", exc)

    def _roll_day(self) -> None:
        today = date.today().isoformat()
        if today != self._day:
            self._day, self._day_count = today, 0

    # -- public API ------------------------------------------------------- #
    def _prune(self, now: float) -> None:
        while self._recent and now - self._recent[0] >= 60.0:
            self._recent.popleft()

    async def acquire(self, tool: str) -> float:
        """Enforce caps then apply a human-like delay. Returns the delay used.

        Raises:
            RateLimitExceeded: If a per-minute or per-day cap is hit.
        """
        self._roll_day()
        now = self._clock()
        self._prune(now)

        if len(self._recent) >= self._settings.max_actions_per_minute:
            raise RateLimitExceeded(
                f"Per-minute action cap reached ({self._settings.max_actions_per_minute}/min) "
                f"while calling '{tool}'.",
                hint="Wait a moment and retry, or raise FIVERR_MAX_ACTIONS_PER_MINUTE.",
            )
        if self._day_count >= self._settings.max_actions_per_day:
            raise RateLimitExceeded(
                f"Daily action cap reached ({self._settings.max_actions_per_day}/day) "
                f"while calling '{tool}'.",
                hint="Resume tomorrow, or raise FIVERR_MAX_ACTIONS_PER_DAY.",
            )

        lo = min(self._settings.min_action_delay_s, self._settings.max_action_delay_s)
        hi = max(self._settings.min_action_delay_s, self._settings.max_action_delay_s)
        delay = random.uniform(lo, hi) if hi > 0 else 0.0
        if delay:
            await self._sleep(delay)

        self._recent.append(self._clock())
        self._day_count += 1
        self._save_daily()
        return delay

    def snapshot(self) -> dict:
        """Return current usage vs caps (for the safety status tool)."""
        self._roll_day()
        self._prune(self._clock())
        return {
            "actions_last_minute": len(self._recent),
            "max_actions_per_minute": self._settings.max_actions_per_minute,
            "actions_today": self._day_count,
            "max_actions_per_day": self._settings.max_actions_per_day,
            "human_delay_s": [self._settings.min_action_delay_s, self._settings.max_action_delay_s],
        }

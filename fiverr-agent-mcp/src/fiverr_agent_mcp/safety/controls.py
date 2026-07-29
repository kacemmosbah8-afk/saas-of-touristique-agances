"""Emergency stop (kill switch) and session-health (read-only) controls."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from ..config import Settings
from ..logging_config import get_logger

logger = get_logger("safety.controls")


class EmergencyStop:
    """Global kill switch backed by an env flag and a sentinel file.

    Engaged when ``FIVERR_KILL_SWITCH=true`` or the sentinel file exists. The
    file persists across restarts, so a trip stays engaged until cleared.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._path = settings.emergency_stop_path

    def engaged(self) -> bool:
        return self._settings.kill_switch or self._path.exists()

    def engage(self, reason: str) -> None:
        """Trip the kill switch, recording a reason. Idempotent."""
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text(
                json.dumps({"reason": reason, "engaged_at": datetime.now(timezone.utc).isoformat()})
            )
            logger.error("EMERGENCY STOP engaged: %s", reason)
        except Exception as exc:  # pragma: no cover
            logger.error("Failed to write emergency-stop file (%s); reason was: %s", exc, reason)

    def clear(self) -> bool:
        """Clear the sentinel file. Returns True if one was removed.

        Note: an env-var kill switch (``FIVERR_KILL_SWITCH``) cannot be cleared at
        runtime and keeps the stop engaged until the env changes.
        """
        removed = False
        if self._path.exists():
            try:
                self._path.unlink()
                removed = True
            except OSError as exc:  # pragma: no cover
                logger.error("Failed to clear emergency-stop file: %s", exc)
        return removed

    def status(self) -> dict:
        reason, engaged_at, source = None, None, None
        if self._path.exists():
            source = "file"
            try:
                data = json.loads(self._path.read_text())
                reason, engaged_at = data.get("reason"), data.get("engaged_at")
            except Exception:  # pragma: no cover
                pass
        if self._settings.kill_switch:
            source = "env" if source is None else "env+file"
            reason = reason or "FIVERR_KILL_SWITCH=true"
        return {"engaged": self.engaged(), "reason": reason, "engaged_at": engaged_at, "source": source}


class SessionHealth:
    """Tracks whether the agent has dropped into read-only mode.

    Set when a session expiry or challenge is detected; cleared on a successful
    login/restore. While read-only, write tools are refused.
    """

    def __init__(self) -> None:
        self._read_only = False
        self._reason: str | None = None
        self._since: str | None = None

    @property
    def is_read_only(self) -> bool:
        return self._read_only

    @property
    def reason(self) -> str | None:
        return self._reason

    def set_read_only(self, reason: str) -> None:
        if not self._read_only:
            logger.warning("Switching to READ-ONLY mode: %s", reason)
        self._read_only = True
        self._reason = reason
        self._since = datetime.now(timezone.utc).isoformat()

    def clear(self) -> None:
        if self._read_only:
            logger.info("Read-only mode cleared; writes re-enabled.")
        self._read_only = False
        self._reason = None
        self._since = None

    def status(self) -> dict:
        return {"read_only": self._read_only, "reason": self._reason, "since": self._since}

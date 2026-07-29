"""Append-only audit log (JSON Lines).

Every safeguarded tool call is recorded with a UTC timestamp, tool name,
conversation id, sanitized parameters (sensitive keys dropped, then the whole
line passed through log redaction), the outcome, a short result summary, and any
screenshot paths. The file is written ``0600`` under the state dir.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..logging_config import get_logger
from ..security.redaction import redact

logger = get_logger("safety.audit")

# Parameter keys never written to the audit log.
_SENSITIVE_KEYS = {
    "password", "passwd", "pwd", "secret", "token", "api_key", "apikey",
    "session_key", "cookie", "cookies", "authorization", "storage_state",
}
_MAX_VALUE_LEN = 500


def _sanitize(value: Any) -> Any:
    """Recursively drop sensitive keys and truncate long strings."""
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if k.lower() in _SENSITIVE_KEYS:
                out[k] = "***REDACTED***"
            else:
                out[k] = _sanitize(v)
        return out
    if isinstance(value, list):
        return [_sanitize(v) for v in value[:50]]
    if isinstance(value, str) and len(value) > _MAX_VALUE_LEN:
        return value[:_MAX_VALUE_LEN] + "…"
    return value


class AuditLogger:
    """Append audit records to a JSONL file."""

    def __init__(self, path: Path) -> None:
        self._path = path

    @property
    def path(self) -> Path:
        return self._path

    def record(
        self,
        *,
        tool: str,
        outcome: str,
        mode: str,
        conversation_id: str | None = None,
        params: dict | None = None,
        result_summary: Any = None,
        screenshots: list[str] | None = None,
        duration_ms: float | None = None,
        error_code: str | None = None,
        is_write: bool = False,
        high_risk: bool = False,
    ) -> None:
        """Write one audit line. Never raises (audit must not break a tool)."""
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "mode": mode,
            "tool": tool,
            "outcome": outcome,
            "is_write": is_write,
            "high_risk": high_risk,
            "conversation_id": conversation_id,
            "params": _sanitize(params or {}),
            "result_summary": _sanitize(result_summary),
            "screenshots": screenshots or [],
            "duration_ms": round(duration_ms, 1) if duration_ms is not None else None,
            "error_code": error_code,
        }
        try:
            line = redact(json.dumps(entry, default=str))
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(line + "\n")
            try:
                os.chmod(self._path, 0o600)
            except OSError:  # pragma: no cover
                pass
        except Exception as exc:  # pragma: no cover - audit is best-effort
            logger.warning("Failed to write audit entry for %s: %s", tool, exc)

    def read_recent(self, limit: int = 20) -> list[dict]:
        """Return the most recent audit entries (best-effort)."""
        if not self._path.exists():
            return []
        try:
            lines = self._path.read_text(encoding="utf-8").splitlines()
        except Exception:  # pragma: no cover
            return []
        out = []
        for line in lines[-limit:]:
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
        return out

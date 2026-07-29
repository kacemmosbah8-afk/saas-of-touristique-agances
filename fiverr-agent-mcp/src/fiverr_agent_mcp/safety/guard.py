"""The ``safeguard`` decorator — the enforcement point for all safeguards.

Wraps a tool body (innermost, beneath ``tool_guard``). On every call it, in order:

1. refuses if the emergency stop / kill switch is engaged,
2. refuses writes while in read-only mode (expired session),
3. requires confirmation for high-risk tools (unless AUTO_APPROVE or confirm=true),
4. applies rate limiting (human delay + per-minute/day caps) to writes,
5. runs the tool, timing it,
6. on a CAPTCHA/anti-bot signal, trips the emergency stop and goes read-only;
   on session expiry, goes read-only,
7. records metrics + an audit entry for every outcome.

Control-plane tools (emergency_stop, clear_emergency_stop, safety_status,
metrics) are never gated, so you can always recover.
"""

from __future__ import annotations

import functools
import json
from collections.abc import Awaitable, Callable
from time import perf_counter
from typing import Any, TypeVar

from ..config import get_settings
from ..exceptions import (
    ConfirmationRequired,
    DryRunBlocked,
    ElementNotFoundError,
    EmergencyStopped,
    FiverrAgentError,
    RateLimitedError,
    ReadOnlyMode,
    SessionExpiredError,
)
from ..logging_config import get_logger
from . import policy
from .audit import _sanitize
from .manager import get_safety

logger = get_logger("safety.guard")

F = TypeVar("F", bound=Callable[..., Awaitable[str]])


def _conversation_id(params: Any) -> str | None:
    for attr in ("conversation_id", "order_id", "gig_id", "notification_id", "lead_id"):
        value = getattr(params, attr, None)
        if value:
            return str(value)
    return None


def _params_dict(params: Any) -> dict:
    if hasattr(params, "model_dump"):
        try:
            return params.model_dump()
        except Exception:  # pragma: no cover
            return {}
    return {}


def _result_meta(result: str) -> tuple[bool, list[str], Any]:
    """Parse a tool's JSON string result into (ok, screenshots, summary)."""
    try:
        data = json.loads(result)
    except Exception:  # pragma: no cover
        return True, [], None
    ok = bool(data.get("ok", True))
    res = data.get("result") if isinstance(data, dict) else None
    shots: list[str] = []
    if isinstance(res, dict):
        shots = list(res.get("screenshots") or [])
        if res.get("screenshot_path"):
            shots.append(res["screenshot_path"])
    summary = None
    if isinstance(res, dict):
        summary = {k: v for k, v in res.items() if k not in ("screenshots",) and not isinstance(v, (list, dict))}
    return ok, shots, summary


def safeguard(name: str | None = None) -> Callable[[F], F]:
    """Decorate a tool body with production safeguards.

    Args:
        name: Tool name for classification/audit. Defaults to the function name
            (which matches the tool name for all write/high-risk tools).
    """

    def decorator(func: F) -> F:
        tool = name or func.__name__
        write = policy.is_write(tool)
        high_risk = policy.is_high_risk(tool)

        @functools.wraps(func)
        async def wrapper(params: Any) -> str:
            safety = get_safety()
            settings = get_settings()
            conv = _conversation_id(params)
            pdict = _params_dict(params)

            def _audit(outcome: str, *, duration_ms=None, error_code=None,
                       screenshots=None, summary=None) -> None:
                safety.audit.record(
                    tool=tool, outcome=outcome, mode=settings.mode, conversation_id=conv,
                    params=pdict, result_summary=summary, screenshots=screenshots,
                    duration_ms=duration_ms, error_code=error_code,
                    is_write=write, high_risk=high_risk,
                )

            # 1. Emergency stop / kill switch.
            if safety.emergency.engaged():
                st = safety.emergency.status()
                safety.metrics.record(tool, 0.0, "blocked")
                _audit("blocked_emergency", error_code="emergency_stopped")
                raise EmergencyStopped(
                    f"Emergency stop engaged ({st.get('reason') or 'kill switch'}); "
                    f"'{tool}' refused.",
                    hint="Resolve the issue, then call clear_emergency_stop.",
                )

            # 2. Read-only mode for writes.
            if write and safety.session.is_read_only:
                safety.metrics.record(tool, 0.0, "blocked")
                _audit("blocked_read_only", error_code="read_only_mode")
                raise ReadOnlyMode(
                    f"Agent is in read-only mode ({safety.session.reason}); '{tool}' refused.",
                    hint="Re-authenticate with the 'login' tool to restore write access.",
                )

            # 3. Confirmation for high-risk actions.
            if high_risk and not settings.auto_approve and not getattr(params, "confirm", False):
                safety.metrics.record(tool, 0.0, "confirmation")
                _audit("confirmation_required")
                exc = ConfirmationRequired(
                    f"'{tool}' is a high-risk action and requires confirmation.",
                    hint="Re-run with confirm=true, or set FIVERR_AUTO_APPROVE=true to skip.",
                )
                exc.details = {"tool": tool, "conversation_id": conv, "parameters": _sanitize(pdict)}
                raise exc

            # 4. Rate limiting (writes only).
            if write:
                await safety.rate_limiter.acquire(tool)  # may raise RateLimitExceeded

            # 5. Execute, timing the body.
            start = perf_counter()
            try:
                result = await func(params)
            except DryRunBlocked:
                safety.metrics.record(tool, perf_counter() - start, "dry_run")
                _audit("dry_run")
                raise
            except RateLimitedError as exc:  # CAPTCHA / anti-bot challenge
                safety.metrics.record(tool, perf_counter() - start, "error", captcha=True)
                safety.emergency.engage(f"CAPTCHA/anti-bot detected during '{tool}'")
                safety.session.set_read_only("CAPTCHA/anti-bot challenge")
                _audit("captcha_abort", error_code=exc.code)
                raise
            except SessionExpiredError as exc:
                safety.session.set_read_only("session expired")
                safety.metrics.record(tool, perf_counter() - start, "error")
                _audit("session_expired", error_code=exc.code)
                raise
            except ElementNotFoundError as exc:
                safety.metrics.record(tool, perf_counter() - start, "error", selector_failure=True)
                _audit("error", error_code=exc.code)
                raise
            except FiverrAgentError as exc:
                safety.metrics.record(tool, perf_counter() - start, "error")
                _audit("error", error_code=exc.code)
                raise

            duration = perf_counter() - start
            ok, shots, summary = _result_meta(result)
            safety.metrics.record(tool, duration, "ok" if ok else "error")
            _audit("ok" if ok else "error", duration_ms=duration * 1000.0,
                   screenshots=shots, summary=summary)

            # Successful (re)authentication clears read-only mode.
            if tool in ("login", "restore_session", "verify_logged_in") and ok:
                safety.session.clear()
            return result

        return wrapper  # type: ignore[return-value]

    return decorator

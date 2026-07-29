"""Control-plane safety tools: emergency stop, status, metrics.

These are intentionally NOT wrapped with ``@safeguard`` — they must remain
callable even while the kill switch is engaged, so the operator can inspect state
and recover.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..core.mcp_app import mcp
from ..safety import get_safety
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False}
_WRITE = {"readOnlyHint": False, "destructiveHint": True, "idempotentHint": True, "openWorldHint": False}


class _Empty(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EmergencyStopInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    reason: str = Field(default="manual", max_length=500, description="Why the stop is being engaged.")


@mcp.tool(name="safety_status", annotations={"title": "Safety / production status", **_READ})
@tool_guard
async def safety_status(params: _Empty) -> str:
    """Report the current production-safety status.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON with ``mode`` (DRY_RUN|LIVE), ``dry_run``, ``auto_approve``,
        ``emergency_stop`` (engaged/reason/source), ``session_health``
        (read_only/reason), ``rate_limits`` (usage vs caps), and ``metrics``.

    Possible errors:
        - None.

    Example:
        safety_status() -> {"mode": "DRY_RUN", "emergency_stop": {"engaged": false}, ...}
    """
    return ok(get_safety().status())


@mcp.tool(name="metrics", annotations={"title": "Action metrics", **_READ})
@tool_guard
async def metrics(params: _Empty) -> str:
    """Return aggregated action metrics for this server process.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON with ``total_actions``, ``failed_actions``, ``blocked_actions``,
        ``success_rate``, ``average_execution_ms``, ``selector_failure_rate``,
        ``captcha_count``, and per-tool / per-outcome breakdowns.

    Possible errors:
        - None.

    Example:
        metrics() -> {"total_actions": 42, "failed_actions": 1, ...}
    """
    return ok(get_safety().metrics.snapshot())


@mcp.tool(name="emergency_stop", annotations={"title": "Engage emergency stop", **_WRITE})
@tool_guard
async def emergency_stop(params: EmergencyStopInput) -> str:
    """Engage the global kill switch — all subsequent actions are refused.

    Persists a sentinel file so the stop survives restarts. Clear it with
    ``clear_emergency_stop`` once the issue is resolved.

    Args:
        params (EmergencyStopInput):
            - reason (str): Why the stop is being engaged.

    Returns:
        str: JSON ``{"ok": true, "result": {"engaged": true, "reason": str, ...}}``.

    Possible errors:
        - None.

    Example:
        emergency_stop(reason="suspicious activity") -> engaged.
    """
    safety = get_safety()
    safety.emergency.engage(params.reason)
    return ok(safety.emergency.status())


@mcp.tool(name="clear_emergency_stop", annotations={"title": "Clear emergency stop", **_WRITE})
@tool_guard
async def clear_emergency_stop(params: _Empty) -> str:
    """Clear the emergency stop (removes the sentinel file).

    Note: an env-var kill switch (``FIVERR_KILL_SWITCH=true``) cannot be cleared
    at runtime and keeps the stop engaged until the environment changes.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"cleared": bool, "status": {...}}}``.

    Possible errors:
        - None.

    Example:
        clear_emergency_stop() -> {"cleared": true}
    """
    safety = get_safety()
    cleared = safety.emergency.clear()
    return ok({"cleared": cleared, "status": safety.emergency.status()})

"""Analytics tools: dashboard, conversion, impressions, clicks, orders, export."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..browser import get_client
from ..core.mcp_app import mcp
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
_WRITE = {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}


class _Empty(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExportInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    destination: str = Field(
        ..., min_length=1, description="Local file path to save the exported statistics file."
    )


async def _snapshot(dashboard: bool = False):
    client = await get_client()
    return await client.read_analytics(dashboard=dashboard)


@mcp.tool(name="read_dashboard", annotations={"title": "Read seller dashboard", **_READ})
@tool_guard
async def read_dashboard(params: _Empty) -> str:
    """Read the seller dashboard summary metrics.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``AnalyticsSnapshot`` (impressions, clicks, orders, earnings,
        conversion_rate, plus a ``raw`` map of all scraped metric cards).

    Possible errors:
        - ``session_expired`` / ``element_not_found``.

    Example:
        read_dashboard() -> {"impressions": 1200, "orders": 8, ...}
    """
    return ok(await _snapshot(dashboard=True))


@mcp.tool(name="read_conversion_rate", annotations={"title": "Read conversion rate", **_READ})
@tool_guard
async def read_conversion_rate(params: _Empty) -> str:
    """Read the conversion rate (orders / clicks) from analytics.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"conversion_rate": float|null,
        "orders": int|null, "clicks": int|null}}``.

    Possible errors:
        - ``session_expired`` / ``element_not_found``.

    Example:
        read_conversion_rate() -> {"conversion_rate": 3.5}
    """
    snap = await _snapshot()
    return ok(
        {"conversion_rate": snap.conversion_rate, "orders": snap.orders, "clicks": snap.clicks}
    )


@mcp.tool(name="read_impressions", annotations={"title": "Read impressions", **_READ})
@tool_guard
async def read_impressions(params: _Empty) -> str:
    """Read total impressions from analytics.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"impressions": int|null, "period": str|null}}``.

    Possible errors:
        - ``session_expired`` / ``element_not_found``.

    Example:
        read_impressions() -> {"impressions": 4200}
    """
    snap = await _snapshot()
    return ok({"impressions": snap.impressions, "period": snap.period})


@mcp.tool(name="read_clicks", annotations={"title": "Read clicks", **_READ})
@tool_guard
async def read_clicks(params: _Empty) -> str:
    """Read total clicks from analytics.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"clicks": int|null, "period": str|null}}``.

    Possible errors:
        - ``session_expired`` / ``element_not_found``.

    Example:
        read_clicks() -> {"clicks": 350}
    """
    snap = await _snapshot()
    return ok({"clicks": snap.clicks, "period": snap.period})


@mcp.tool(name="read_orders", annotations={"title": "Read analytics orders", **_READ})
@tool_guard
async def read_orders(params: _Empty) -> str:
    """Read the total orders metric from analytics.

    Note: for the list of individual orders use ``list_orders`` instead.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"orders": int|null, "cancellations": int|null}}``.

    Possible errors:
        - ``session_expired`` / ``element_not_found``.

    Example:
        read_orders() -> {"orders": 8, "cancellations": 1}
    """
    snap = await _snapshot()
    return ok({"orders": snap.orders, "cancellations": snap.cancellations})


@mcp.tool(name="export_statistics", annotations={"title": "Export statistics", **_WRITE})
@tool_guard
async def export_statistics(params: ExportInput) -> str:
    """Trigger the analytics export and save the file locally.

    Args:
        params (ExportInput):
            - destination (str): Local path to save the downloaded file.

    Returns:
        str: JSON ``{"ok": true, "result": {"exported": true, "path": str}}``.

    Possible errors:
        - ``element_not_found``: No export control available.
        - ``dry_run_blocked``.

    Example:
        export_statistics(destination="/tmp/fiverr_stats.csv")
    """
    client = await get_client()
    return ok(await client.export_statistics(params.destination))

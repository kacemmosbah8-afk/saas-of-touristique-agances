"""Notification tools: list, open, mark as read."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..browser import get_client
from ..core.mcp_app import mcp
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
_WRITE = {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}


class ListNotificationsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum notifications to return.")


class NotificationInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    notification_id: str = Field(..., min_length=1, description="Notification id from list_notifications.")


class MarkReadInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    notification_id: str | None = Field(
        default=None, description="Notification id to mark read; omit to mark ALL as read."
    )


@mcp.tool(name="list_notifications", annotations={"title": "List notifications", **_READ})
@tool_guard
async def list_notifications(params: ListNotificationsInput) -> str:
    """List recent notifications.

    Args:
        params (ListNotificationsInput):
            - limit (int): Max notifications, 1-100 (default 20).

    Returns:
        str: JSON ``{"ok": true, "count": int, "result": [Notification...]}`` with
        ``notification_id, text, unread, link``.

    Possible errors:
        - ``session_expired`` / ``element_not_found``.

    Example:
        list_notifications(limit=10) -> ten latest notifications.
    """
    client = await get_client()
    return ok(await client.list_notifications(limit=params.limit))


@mcp.tool(name="open_notification", annotations={"title": "Open a notification", **_WRITE})
@tool_guard
async def open_notification(params: NotificationInput) -> str:
    """Open (click) a notification and return its target link.

    Args:
        params (NotificationInput):
            - notification_id (str).

    Returns:
        str: JSON ``{"ok": true, "result": {"notification_id", "opened": true, "link"}}``.

    Possible errors:
        - ``not_found`` / ``dry_run_blocked``.

    Example:
        open_notification(notification_id="0")
    """
    client = await get_client()
    return ok(await client.open_notification(params.notification_id))


@mcp.tool(name="mark_as_read", annotations={"title": "Mark notification(s) read", **_WRITE})
@tool_guard
async def mark_as_read(params: MarkReadInput) -> str:
    """Mark a notification (or all notifications) as read.

    Args:
        params (MarkReadInput):
            - notification_id (str, optional): Omit to mark all as read.

    Returns:
        str: JSON ``{"ok": true, "result": {"notification_id"|"all", "read": true}}``.

    Possible errors:
        - ``element_not_found`` / ``dry_run_blocked``.

    Example:
        mark_as_read() -> marks all as read.
    """
    client = await get_client()
    return ok(await client.mark_as_read(params.notification_id))

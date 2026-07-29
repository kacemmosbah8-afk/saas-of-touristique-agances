"""Order tools: list, open, requirements, message, deliver, extend, cancel."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..browser import get_client
from ..core.mcp_app import mcp
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
_WRITE = {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}
_DESTRUCTIVE = {"readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": True}


class ListOrdersInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    status: str | None = Field(
        default=None, description="Filter by status substring, e.g. 'active', 'late', 'delivered'."
    )


class OrderInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    order_id: str = Field(..., min_length=1, description="Order number (from list_orders).")


class OrderMessageInput(OrderInput):
    body: str = Field(..., min_length=1, max_length=10_000, description="Message text.")


class DeliverOrderInput(OrderInput):
    message: str = Field(..., min_length=1, max_length=5_000, description="Delivery note to the buyer.")
    files: list[str] = Field(
        default_factory=list, max_length=25, description="Local file paths to attach as deliverables."
    )


class ExtensionInput(OrderInput):
    days: int = Field(..., ge=1, le=90, description="Additional delivery days requested.")
    reason: str = Field(..., min_length=1, max_length=2_000, description="Reason shown to the buyer.")


class CancelInput(OrderInput):
    reason: str = Field(..., min_length=1, max_length=2_000, description="Cancellation reason.")


@mcp.tool(name="list_orders", annotations={"title": "List orders", **_READ})
@tool_guard
async def list_orders(params: ListOrdersInput) -> str:
    """List the seller's orders, optionally filtered by status.

    Args:
        params (ListOrdersInput):
            - status (str, optional): Substring filter, e.g. 'active'.

    Returns:
        str: JSON ``{"ok": true, "count": int, "result": [OrderSummary...]}`` with
        ``order_id, title, status, due``.

    Possible errors:
        - ``session_expired``: Not logged in.

    Example:
        list_orders(status="late") -> only late orders.
    """
    client = await get_client()
    return ok(await client.list_orders(status=params.status))


@mcp.tool(name="open_order", annotations={"title": "Open an order", **_READ})
@tool_guard
async def open_order(params: OrderInput) -> str:
    """Open a single order and return its full detail.

    Args:
        params (OrderInput):
            - order_id (str): Order number.

    Returns:
        str: JSON ``OrderDetail`` including ``requirements`` and ``messages``.

    Possible errors:
        - ``navigation_error`` / ``session_expired``.

    Example:
        open_order(order_id="FO123ABC") -> full order detail.
    """
    client = await get_client()
    return ok(await client.open_order(params.order_id))


@mcp.tool(name="read_requirements", annotations={"title": "Read order requirements", **_READ})
@tool_guard
async def read_requirements(params: OrderInput) -> str:
    """Return the buyer-submitted requirement answers for an order.

    Args:
        params (OrderInput):
            - order_id (str): Order number.

    Returns:
        str: JSON ``{"ok": true, "count": int, "result": [str, ...]}``.

    Possible errors:
        - ``navigation_error`` / ``session_expired``.

    Example:
        read_requirements(order_id="FO123ABC") -> ["Brand name: Acme", ...]
    """
    client = await get_client()
    return ok(await client.read_requirements(params.order_id))


@mcp.tool(name="send_order_message", annotations={"title": "Message on an order", **_WRITE})
@tool_guard
async def send_order_message(params: OrderMessageInput) -> str:
    """Post a message in an order's thread.

    Args:
        params (OrderMessageInput):
            - order_id (str), body (str).

    Returns:
        str: JSON ``{"ok": true, "result": {"order_id", "sent": true, "chars"}}``.

    Possible errors:
        - ``not_found`` / ``dry_run_blocked``.

    Example:
        send_order_message(order_id="FO123ABC", body="First draft attached shortly.")
    """
    client = await get_client()
    return ok(await client.send_order_message(params.order_id, params.body))


@mcp.tool(name="deliver_order", annotations={"title": "Deliver an order", **_WRITE})
@tool_guard
async def deliver_order(params: DeliverOrderInput) -> str:
    """Deliver an order with a note and optional file attachments.

    Args:
        params (DeliverOrderInput):
            - order_id (str), message (str), files (list[str], optional local paths).

    Returns:
        str: JSON ``{"ok": true, "result": {"order_id", "delivered": true, "attachments"}}``.

    Possible errors:
        - ``element_not_found``: Deliver control missing (order not deliverable).
        - ``dry_run_blocked``.

    Example:
        deliver_order(order_id="FO123ABC", message="Final files.", files=["/tmp/logo.zip"])
    """
    client = await get_client()
    return ok(await client.deliver_order(params.order_id, params.message, params.files))


@mcp.tool(name="request_extension", annotations={"title": "Request delivery extension", **_WRITE})
@tool_guard
async def request_extension(params: ExtensionInput) -> str:
    """Request a delivery-date extension on an order.

    Args:
        params (ExtensionInput):
            - order_id (str), days (int 1-90), reason (str).

    Returns:
        str: JSON ``{"ok": true, "result": {"order_id", "extension_requested": true, "days"}}``.

    Possible errors:
        - ``element_not_found`` / ``dry_run_blocked``.

    Example:
        request_extension(order_id="FO123ABC", days=2, reason="Awaiting brand assets.")
    """
    client = await get_client()
    return ok(await client.request_extension(params.order_id, params.days, params.reason))


@mcp.tool(name="cancel_order_request", annotations={"title": "Request order cancellation", **_DESTRUCTIVE})
@tool_guard
async def cancel_order_request(params: CancelInput) -> str:
    """Open a cancellation / resolution request on an order.

    This starts a cancellation; the buyer must still accept. Destructive because
    it can affect completion rate.

    Args:
        params (CancelInput):
            - order_id (str), reason (str).

    Returns:
        str: JSON ``{"ok": true, "result": {"order_id", "cancellation_requested": true}}``.

    Possible errors:
        - ``element_not_found`` / ``dry_run_blocked``.

    Example:
        cancel_order_request(order_id="FO123ABC", reason="Buyer unresponsive for 14 days.")
    """
    client = await get_client()
    return ok(await client.cancel_order_request(params.order_id, params.reason))

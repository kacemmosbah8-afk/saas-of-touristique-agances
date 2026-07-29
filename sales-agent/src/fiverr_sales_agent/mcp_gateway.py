"""Execution gateway — the ONLY seam between the sales agent and Fiverr I/O.

The sales agent's business logic depends on the :class:`ExecutionGateway`
protocol, never on the browser layer directly. The default
:class:`InProcessMCPGateway` implements it by calling the Fiverr Agent MCP tool
functions in-process, so every action still passes through the MCP safeguards
(DRY_RUN, confirmation, rate limiting, audit). Tests swap in a fake gateway.

Read operations are plain. Write operations (``send_message``, ``send_offer``)
take an explicit ``confirm`` flag that the agent only sets on an approved action;
the MCP still enforces its own confirmation policy on top.
"""

from __future__ import annotations

import json
from typing import Any, Protocol, runtime_checkable


class GatewayError(RuntimeError):
    """Raised when an MCP tool call returns an error envelope."""

    def __init__(self, code: str, message: str, payload: dict | None = None) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message
        self.payload = payload or {}


@runtime_checkable
class ExecutionGateway(Protocol):
    """The operations the sales agent needs from its execution layer."""

    async def list_messages(self, limit: int = 20, unread_only: bool = False) -> list[dict]: ...

    async def read_message(self, conversation_id: str) -> dict: ...

    async def list_orders(self, status: str | None = None) -> list[dict]: ...

    async def read_dashboard(self) -> dict: ...

    async def safety_status(self) -> dict: ...

    async def send_message(self, conversation_id: str, body: str, *, confirm: bool = False) -> dict: ...

    async def send_offer(
        self,
        conversation_id: str,
        description: str,
        price: float,
        delivery_days: int,
        *,
        revisions: int = 1,
        offer_type: str = "custom",
        gig_id: str | None = None,
        confirm: bool = False,
    ) -> dict: ...


def _unwrap(raw: str) -> dict:
    """Parse an MCP tool JSON string, raising on error/confirmation envelopes.

    Returns the ``result`` payload for successful calls. Raises
    :class:`GatewayError` for ``ok:false`` envelopes (including
    ``confirmation_required`` and ``dry_run``), attaching the full payload so the
    caller can inspect it.
    """
    data = json.loads(raw)
    if not data.get("ok", False):
        code = data.get("code") or (
            "confirmation_required" if data.get("confirmation_required")
            else "dry_run" if data.get("dry_run") else "error"
        )
        raise GatewayError(code, data.get("message", "MCP call failed"), data)
    return data


class InProcessMCPGateway:
    """Default gateway: calls the Fiverr Agent MCP tool functions in-process."""

    def __init__(self) -> None:
        # Imported lazily so the sales agent package imports even if the MCP is
        # not installed (e.g. unit tests that use a fake gateway).
        from fiverr_agent_mcp.tools import analytics, inbox, leads, orders, safety_tools

        self._inbox = inbox
        self._orders = orders
        self._analytics = analytics
        self._leads = leads
        self._safety = safety_tools

    async def list_messages(self, limit: int = 20, unread_only: bool = False) -> list[dict]:
        raw = await self._inbox.list_messages(
            self._inbox.ListMessagesInput(limit=limit, unread_only=unread_only)
        )
        return _unwrap(raw).get("result", [])

    async def read_message(self, conversation_id: str) -> dict:
        raw = await self._inbox.read_message(
            self._inbox.ConversationInput(conversation_id=conversation_id)
        )
        return _unwrap(raw).get("result", {})

    async def list_orders(self, status: str | None = None) -> list[dict]:
        raw = await self._orders.list_orders(self._orders.ListOrdersInput(status=status))
        return _unwrap(raw).get("result", [])

    async def read_dashboard(self) -> dict:
        raw = await self._analytics.read_dashboard(self._analytics._Empty())
        return _unwrap(raw).get("result", {})

    async def safety_status(self) -> dict:
        raw = await self._safety.safety_status(self._safety._Empty())
        return _unwrap(raw).get("result", {})

    async def send_message(self, conversation_id: str, body: str, *, confirm: bool = False) -> dict:
        raw = await self._inbox.send_message(
            self._inbox.SendMessageInput(conversation_id=conversation_id, body=body)
        )
        return _unwrap(raw).get("result", {})

    async def send_offer(
        self,
        conversation_id: str,
        description: str,
        price: float,
        delivery_days: int,
        *,
        revisions: int = 1,
        offer_type: str = "custom",
        gig_id: str | None = None,
        confirm: bool = False,
    ) -> dict:
        raw = await self._leads.send_offer(
            self._leads.SendOfferInput(
                conversation_id=conversation_id, description=description, price=price,
                delivery_days=delivery_days, revisions=revisions, offer_type=offer_type,
                gig_id=gig_id, confirm=confirm,
            )
        )
        return _unwrap(raw).get("result", {})


def default_gateway() -> ExecutionGateway:
    """Construct the in-process MCP gateway."""
    return InProcessMCPGateway()


def messages_to_texts(conversation: dict) -> tuple[list[str], list[str]]:
    """Split a conversation payload into (bodies, senders)."""
    msgs: list[dict[str, Any]] = conversation.get("messages", [])
    bodies = [m.get("body", "") for m in msgs if m.get("body")]
    senders = [m.get("sender", "?") for m in msgs if m.get("body")]
    return bodies, senders

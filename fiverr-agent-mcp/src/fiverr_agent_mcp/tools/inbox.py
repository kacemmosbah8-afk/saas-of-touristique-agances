"""Inbox tools: list, read, send, reply, archive."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..browser import get_client
from ..core.mcp_app import mcp
from ..safety import safeguard
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
_WRITE = {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}


class ListMessagesInput(BaseModel):
    """Input for listing inbox conversations."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    limit: int = Field(default=20, ge=1, le=100, description="Maximum conversations to return.")
    unread_only: bool = Field(default=False, description="Only return conversations with unread messages.")


class ConversationInput(BaseModel):
    """Input referencing a single conversation."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    conversation_id: str = Field(
        ..., min_length=1, description="Conversation id/username (from list_messages)."
    )


class SendMessageInput(ConversationInput):
    """Input for sending/replying within a conversation."""

    body: str = Field(..., min_length=1, max_length=10_000, description="Message text to send.")


@mcp.tool(name="list_messages", annotations={"title": "List inbox messages", **_READ})
@tool_guard
@safeguard()
async def list_messages(params: ListMessagesInput) -> str:
    """List inbox conversation previews, newest first.

    Args:
        params (ListMessagesInput):
            - limit (int): Max conversations, 1-100 (default 20).
            - unread_only (bool): Restrict to unread threads (default false).

    Returns:
        str: JSON ``{"ok": true, "count": int, "result": [MessagePreview...]}`` where
        each preview has ``conversation_id``, ``contact``, ``snippet``, ``unread``.

    Possible errors:
        - ``session_expired``: Not logged in (run ``login``).
        - ``element_not_found``: Inbox layout not recognized.

    Example:
        list_messages(unread_only=true) -> previews of unread threads.
    """
    client = await get_client()
    return ok(await client.list_messages(limit=params.limit, unread_only=params.unread_only))


@mcp.tool(name="read_message", annotations={"title": "Read a conversation", **_READ})
@tool_guard
@safeguard()
async def read_message(params: ConversationInput) -> str:
    """Open a conversation thread and return all its messages in order.

    Args:
        params (ConversationInput):
            - conversation_id (str): Thread id from ``list_messages``.

    Returns:
        str: JSON with ``conversation_id``, ``contact`` and ``messages`` (each
        ``{sender, body, timestamp, attachments}``).

    Possible errors:
        - ``not_found``: Conversation has no readable messages / does not exist.
        - ``session_expired``: Not logged in.

    Example:
        read_message(conversation_id="buyer_acme") -> full thread.
    """
    client = await get_client()
    return ok(await client.read_message(params.conversation_id))


@mcp.tool(name="send_message", annotations={"title": "Send a message", **_WRITE})
@tool_guard
@safeguard()
async def send_message(params: SendMessageInput) -> str:
    """Send a new message in a conversation.

    Args:
        params (SendMessageInput):
            - conversation_id (str): Target thread.
            - body (str): Message text (1-10000 chars).

    Returns:
        str: JSON ``{"ok": true, "result": {"conversation_id", "sent": true, "chars"}}``.

    Possible errors:
        - ``not_found``: No message input for the thread.
        - ``dry_run_blocked``: Skipped due to ``FIVERR_DRY_RUN``.

    Example:
        send_message(conversation_id="buyer_acme", body="Thanks, on it!")
    """
    client = await get_client()
    return ok(await client.send_message(params.conversation_id, params.body))


@mcp.tool(name="reply_to_message", annotations={"title": "Reply to a conversation", **_WRITE})
@tool_guard
@safeguard()
async def reply_to_message(params: SendMessageInput) -> str:
    """Reply to the latest message in a conversation.

    Functionally posts ``body`` into the given thread (Fiverr threads are linear,
    so a reply is a new message in the same conversation).

    Args:
        params (SendMessageInput):
            - conversation_id (str): Target thread.
            - body (str): Reply text.

    Returns:
        str: JSON ``{"ok": true, "result": {"conversation_id", "sent": true}}``.

    Possible errors:
        - ``not_found`` / ``dry_run_blocked`` (see ``send_message``).

    Example:
        reply_to_message(conversation_id="buyer_acme", body="Sounds good!")
    """
    client = await get_client()
    return ok(await client.send_message(params.conversation_id, params.body))


@mcp.tool(
    name="archive_message",
    annotations={"title": "Archive a conversation", "readOnlyHint": False,
                 "destructiveHint": True, "idempotentHint": True, "openWorldHint": True},
)
@tool_guard
@safeguard()
async def archive_message(params: ConversationInput) -> str:
    """Archive a conversation (removes it from the active inbox).

    Args:
        params (ConversationInput):
            - conversation_id (str): Thread to archive.

    Returns:
        str: JSON ``{"ok": true, "result": {"conversation_id", "archived": true}}``.

    Possible errors:
        - ``element_not_found``: Archive control not present.
        - ``dry_run_blocked``: Skipped due to ``FIVERR_DRY_RUN``.

    Example:
        archive_message(conversation_id="spam_bot") -> archived.
    """
    client = await get_client()
    return ok(await client.archive_message(params.conversation_id))

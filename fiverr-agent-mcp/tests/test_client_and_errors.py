"""Tests for dry-run guarding, tool error envelopes, and config."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from fiverr_agent_mcp.browser.client import FiverrClient
from fiverr_agent_mcp.config import Settings
from fiverr_agent_mcp.exceptions import DryRunBlocked, NotFoundError
from fiverr_agent_mcp.tools.common import tool_guard


def _client(dry_run: bool) -> FiverrClient:
    settings = Settings(FIVERR_DRY_RUN=dry_run)
    return FiverrClient(
        page=MagicMock(),
        context=MagicMock(),
        settings=settings,
        session_store=MagicMock(),
    )


async def test_dry_run_blocks_mutation():
    client = _client(dry_run=True)
    with pytest.raises(DryRunBlocked):
        await client.send_message("buyer1", "hello")


async def test_dry_run_blocks_send_offer_conversation_based():
    # send_offer now targets a conversation (Custom Offer flow), not a buyer request.
    client = _client(dry_run=True)
    with pytest.raises(DryRunBlocked):
        await client.send_offer("buyer1", "I'll deliver 5 posts", 150.0, 4, revisions=2)


async def test_guard_mutation_noop_when_disabled():
    client = _client(dry_run=False)
    # Should not raise on the guard itself (page interaction is mocked away).
    client._guard_mutation("send_message", conversation_id="x")


async def test_tool_guard_formats_dry_run():
    @tool_guard
    async def failing():
        raise DryRunBlocked("nope")

    import json

    payload = json.loads(await failing())
    assert payload["ok"] is False
    assert payload["dry_run"] is True


async def test_tool_guard_formats_domain_error():
    @tool_guard
    async def failing():
        raise NotFoundError("missing", hint="check the id")

    import json

    payload = json.loads(await failing())
    assert payload["code"] == "not_found"
    assert payload["hint"] == "check the id"


async def test_tool_guard_hides_unexpected_error():
    @tool_guard
    async def failing():
        raise RuntimeError("secret internal detail")

    import json

    payload = json.loads(await failing())
    assert payload["code"] == "internal_error"
    assert "secret internal detail" not in payload["message"]


def test_settings_masks_email():
    s = Settings(FIVERR_EMAIL="john.doe@example.com")
    masked = s.masked_email()
    assert "john.doe" not in masked
    assert masked.endswith("@example.com")


def test_settings_has_credentials():
    assert Settings(FIVERR_EMAIL="a@b.com", FIVERR_PASSWORD="x").has_credentials() is True
    assert Settings(FIVERR_EMAIL="a@b.com").has_credentials() is False


def test_settings_rejects_bad_log_level():
    with pytest.raises(ValueError):
        Settings(FIVERR_LOG_LEVEL="LOUD")

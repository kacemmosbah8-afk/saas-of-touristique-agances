"""Shared pytest fixtures.

The browser layer is mocked everywhere so the entire suite runs with **no
Playwright browser and no Fiverr credentials**. A fake :class:`FiverrClient`
(an ``AsyncMock`` preloaded with realistic return models) is injected via the
process-singleton hook so tool tests exercise the real tool code paths
(validation, error handling, JSON envelope) without a browser.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock

import pytest

from fiverr_agent_mcp import models as m
from fiverr_agent_mcp.browser import manager as manager_mod


@pytest.fixture(autouse=True)
def _reset_settings_cache(monkeypatch, tmp_path):
    """Isolate settings per test and keep state files inside tmp_path."""
    from fiverr_agent_mcp.config import get_settings

    monkeypatch.setenv("FIVERR_STATE_DIR", str(tmp_path / "state"))
    monkeypatch.delenv("FIVERR_DRY_RUN", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


class _FakeManager:
    """Stands in for BrowserManager; returns a preset client."""

    def __init__(self, client: AsyncMock) -> None:
        self._client = client

    async def client(self) -> AsyncMock:
        return self._client


def _build_fake_client() -> AsyncMock:
    """An AsyncMock FiverrClient with realistic return values for every method."""
    client = AsyncMock()

    # account
    client.login.return_value = m.LoginStatus(logged_in=True, username="acme", method="restored")
    client.logout.return_value = m.LoginStatus(logged_in=False, method="none")
    client.verify_logged_in.return_value = m.LoginStatus(
        logged_in=True, username="acme", method="restored"
    )
    client.restore_session.return_value = m.LoginStatus(
        logged_in=True, username="acme", method="restored"
    )
    client.save_session.return_value = "/tmp/session.enc"

    # inbox
    client.list_messages.return_value = [
        m.MessagePreview(conversation_id="buyer1", contact="Buyer One", snippet="Hi", unread=True)
    ]
    client.read_message.return_value = m.Conversation(
        conversation_id="buyer1",
        contact="Buyer One",
        messages=[m.ChatMessage(sender="buyer", body="Hello")],
    )
    client.send_message.return_value = {"conversation_id": "buyer1", "sent": True, "chars": 5}
    client.archive_message.return_value = {"conversation_id": "buyer1", "archived": True}

    # leads
    client.list_available_leads.return_value = [
        m.Lead(lead_id="0", title="Logo", description="Need a logo", budget="$100")
    ]
    client.send_offer.return_value = {
        "conversation_id": "buyer1", "sent": True, "price": 100.0, "delivery_days": 3,
        "revisions": 1, "offer_type_requested": "custom", "offer_type_used": "custom",
        "fallback_used": False, "gig_selected": None,
        "selector_path_used": ["create_offer:btn", "custom_option:btn", "submit:btn"],
        "screenshots": [],
    }

    # orders
    client.list_orders.return_value = [
        m.OrderSummary(order_id="FO1", title="Logo", status=m.OrderStatus.ACTIVE)
    ]
    client.open_order.return_value = m.OrderDetail(
        order_id="FO1", title="Logo", status=m.OrderStatus.ACTIVE, requirements=["Brand: Acme"]
    )
    client.read_requirements.return_value = ["Brand: Acme"]
    client.send_order_message.return_value = {"order_id": "FO1", "sent": True, "chars": 3}
    client.deliver_order.return_value = {"order_id": "FO1", "delivered": True, "attachments": 1}
    client.request_extension.return_value = {"order_id": "FO1", "extension_requested": True, "days": 2}
    client.cancel_order_request.return_value = {"order_id": "FO1", "cancellation_requested": True}

    # gigs
    client.list_gigs.return_value = [
        m.GigSummary(gig_id="0", title="I will design a logo", status=m.GigStatus.ACTIVE)
    ]
    client.open_gig.return_value = m.GigDetail(gig_id="0", title="I will design a logo")
    client.create_gig.return_value = {"created": True, "title": "x", "status": "draft"}
    client.update_gig.return_value = {"gig_id": "0", "updated": True, "fields": ["title"]}
    client.pause_gig.return_value = {"gig_id": "0", "status": "paused"}
    client.activate_gig.return_value = {"gig_id": "0", "status": "active"}
    client.delete_draft.return_value = {"gig_id": "0", "deleted": True}

    # analytics
    client.read_analytics.return_value = m.AnalyticsSnapshot(
        impressions=1000, clicks=200, orders=10, conversion_rate=5.0, earnings="$500"
    )
    client.export_statistics.return_value = {"exported": True, "path": "/tmp/stats.csv"}

    # notifications
    client.list_notifications.return_value = [
        m.Notification(notification_id="0", text="New order!", unread=True)
    ]
    client.open_notification.return_value = {"notification_id": "0", "opened": True, "link": "/orders/FO1"}
    client.mark_as_read.return_value = {"notification_id": "all", "read": True}

    return client


@pytest.fixture
def fake_client() -> AsyncMock:
    """Return the fake client (also injected as the process singleton)."""
    client = _build_fake_client()
    manager_mod._set_manager_for_tests(_FakeManager(client))
    yield client
    manager_mod._set_manager_for_tests(None)


@pytest.fixture
def parse():
    """Helper to parse a tool's JSON string response."""

    def _parse(raw: str) -> dict:
        return json.loads(raw)

    return _parse

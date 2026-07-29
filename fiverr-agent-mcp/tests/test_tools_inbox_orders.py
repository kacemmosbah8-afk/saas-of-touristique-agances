"""Integration tests: inbox, leads, order, gig, analytics, notification tools.

Each tool is invoked through its real code path (Pydantic validation +
``tool_guard`` envelope) against the injected fake :class:`FiverrClient`.
"""

from __future__ import annotations

import pytest

from fiverr_agent_mcp.tools import account, analytics, gigs, inbox, leads, notifications, orders

pytestmark = pytest.mark.usefixtures("fake_client")


# --- Account --------------------------------------------------------------- #
async def test_login(parse):
    res = parse(await account.login(account._Empty()))
    assert res["ok"] is True
    assert res["result"]["logged_in"] is True


async def test_verify_and_restore(parse):
    assert parse(await account.verify_logged_in(account._Empty()))["result"]["logged_in"]
    assert parse(await account.restore_session(account._Empty()))["result"]["logged_in"]


async def test_save_session(parse):
    res = parse(await account.save_session(account._Empty()))
    assert res["ok"] is True
    assert "path" in res["result"]


async def test_logout(parse):
    res = parse(await account.logout(account._Empty()))
    assert res["result"]["logged_in"] is False


# --- Inbox ----------------------------------------------------------------- #
async def test_list_messages(parse):
    res = parse(await inbox.list_messages(inbox.ListMessagesInput(limit=5)))
    assert res["count"] == 1
    assert res["result"][0]["conversation_id"] == "buyer1"


async def test_read_message(parse):
    res = parse(await inbox.read_message(inbox.ConversationInput(conversation_id="buyer1")))
    assert res["result"]["messages"][0]["body"] == "Hello"


async def test_send_and_reply(parse, fake_client):
    r1 = parse(await inbox.send_message(inbox.SendMessageInput(conversation_id="buyer1", body="hello")))
    assert r1["result"]["sent"] is True
    await inbox.reply_to_message(inbox.SendMessageInput(conversation_id="buyer1", body="hi again"))
    assert fake_client.send_message.await_count == 2


async def test_archive(parse):
    res = parse(await inbox.archive_message(inbox.ConversationInput(conversation_id="buyer1")))
    assert res["result"]["archived"] is True


# --- Leads ----------------------------------------------------------------- #
async def test_list_leads(parse):
    res = parse(await leads.list_available_leads(leads.ListLeadsInput(limit=10)))
    assert res["result"][0]["title"] == "Logo"


async def test_analyze_lead(parse):
    res = parse(await leads.analyze_lead(leads.AnalyzeLeadInput(description="Need a long-term logo, budget $200", budget="$200")))
    assert "score" in res["result"]


async def test_generate_proposal(parse):
    res = parse(await leads.generate_proposal(leads.GenerateProposalInput(
        lead_description="Need SEO posts", seller_pitch="I write ranking content")))
    assert "proposal" in res["result"]


async def test_send_offer_defaults_to_custom(parse, fake_client):
    res = parse(await leads.send_offer(leads.SendOfferInput(
        conversation_id="buyer1", description="I'll do it", price=100, delivery_days=3)))
    assert res["result"]["sent"] is True
    assert res["result"]["offer_type_used"] == "custom"
    assert res["result"]["fallback_used"] is False
    # The tool must pass offer_type="custom" through by default.
    assert fake_client.send_offer.await_args.kwargs["offer_type"] == "custom"


# --- Orders ---------------------------------------------------------------- #
async def test_list_orders(parse):
    res = parse(await orders.list_orders(orders.ListOrdersInput(status="active")))
    assert res["result"][0]["order_id"] == "FO1"


async def test_open_order_and_requirements(parse):
    res = parse(await orders.open_order(orders.OrderInput(order_id="FO1")))
    assert res["result"]["requirements"] == ["Brand: Acme"]
    req = parse(await orders.read_requirements(orders.OrderInput(order_id="FO1")))
    assert req["result"] == ["Brand: Acme"]


async def test_order_message_deliver_extend_cancel(parse):
    assert parse(await orders.send_order_message(orders.OrderMessageInput(order_id="FO1", body="hi")))["result"]["sent"]
    assert parse(await orders.deliver_order(orders.DeliverOrderInput(order_id="FO1", message="done", files=["/tmp/x"])))["result"]["delivered"]
    assert parse(await orders.request_extension(orders.ExtensionInput(order_id="FO1", days=2, reason="assets")))["result"]["extension_requested"]
    assert parse(await orders.cancel_order_request(orders.CancelInput(order_id="FO1", reason="unresponsive")))["result"]["cancellation_requested"]


# --- Gigs ------------------------------------------------------------------ #
async def test_list_and_open_gig(parse):
    assert parse(await gigs.list_gigs(gigs._Empty()))["result"][0]["gig_id"] == "0"
    assert parse(await gigs.open_gig(gigs.GigInput(gig_id="0")))["result"]["title"]


async def test_create_update_gig(parse):
    created = parse(await gigs.create_gig(gigs.CreateGigInput(
        title="I will design a beautiful logo", description="x" * 130, tags=["logo"])))
    assert created["result"]["created"] is True
    updated = parse(await gigs.update_gig(gigs.UpdateGigInput(gig_id="0", title="I will craft a premium logo kit")))
    assert updated["result"]["updated"] is True


async def test_pause_activate_delete(parse):
    assert parse(await gigs.pause_gig(gigs.GigInput(gig_id="0")))["result"]["status"] == "paused"
    assert parse(await gigs.activate_gig(gigs.GigInput(gig_id="0")))["result"]["status"] == "active"
    assert parse(await gigs.delete_draft(gigs.GigInput(gig_id="0")))["result"]["deleted"] is True


# --- Analytics ------------------------------------------------------------- #
async def test_analytics_tools(parse):
    assert parse(await analytics.read_dashboard(analytics._Empty()))["result"]["impressions"] == 1000
    assert parse(await analytics.read_conversion_rate(analytics._Empty()))["result"]["conversion_rate"] == 5.0
    assert parse(await analytics.read_impressions(analytics._Empty()))["result"]["impressions"] == 1000
    assert parse(await analytics.read_clicks(analytics._Empty()))["result"]["clicks"] == 200
    assert parse(await analytics.read_orders(analytics._Empty()))["result"]["orders"] == 10
    assert parse(await analytics.export_statistics(analytics.ExportInput(destination="/tmp/stats.csv")))["result"]["exported"]


# --- Notifications --------------------------------------------------------- #
async def test_notification_tools(parse):
    assert parse(await notifications.list_notifications(notifications.ListNotificationsInput(limit=5)))["result"][0]["text"] == "New order!"
    assert parse(await notifications.open_notification(notifications.NotificationInput(notification_id="0")))["result"]["opened"]
    assert parse(await notifications.mark_as_read(notifications.MarkReadInput()))["result"]["read"]

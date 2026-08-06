"""Tests for analysis, pricing, replies, offers, and the agent orchestration."""

from __future__ import annotations

import pytest

from fiverr_sales_agent.agent import ApprovalRequired
from fiverr_sales_agent.models import (
    Complexity,
    ProjectType,
    Recommendation,
    ReplyStyle,
    Urgency,
)


async def test_analyze_detects_web_project(agent):
    a = await agent.analyze_conversation("buyer_web")
    assert a.detections.project_type == ProjectType.WEB_DEVELOPMENT
    assert a.detections.budget_hint == 800.0
    assert a.detections.complexity in (Complexity.MEDIUM, Complexity.HIGH)
    assert a.detections.urgency in (Urgency.LOW, Urgency.NORMAL)
    # Estimates present and sane.
    assert 0.0 <= a.estimates.win_probability <= 1.0
    assert a.estimates.estimated_value >= 75
    # Three replies, one per style.
    styles = {r.style for r in a.replies}
    assert styles == {ReplyStyle.CONSERVATIVE, ReplyStyle.PROFESSIONAL, ReplyStyle.SALES}
    # Offer preview built but nothing sent.
    assert a.offer_preview.conversation_id == "buyer_web"
    assert a.offer_preview.price > 0


async def test_analyze_never_sends(agent, gateway):
    await agent.analyze_conversation("buyer_web")
    assert gateway.sent_messages == []
    assert gateway.sent_offers == []


async def test_vague_lead_asks_questions(agent):
    a = await agent.analyze_conversation("buyer_vague")
    assert a.recommendation.action == Recommendation.ASK_QUESTIONS
    assert a.recommendation.questions  # concrete clarifying questions
    assert "budget" in a.detections.missing_info


async def test_spam_lead_declined(agent):
    a = await agent.analyze_conversation("buyer_spam")
    assert a.detections.is_spam is True
    assert a.recommendation.action == Recommendation.DECLINE


async def test_pricing_reflects_budget_and_complexity(agent):
    a = await agent.analyze_conversation("buyer_web")
    p = a.pricing
    assert p.recommended_price >= agent.settings.min_price
    assert p.delivery_days >= 1
    assert p.premium_package["price"] > p.recommended_price
    assert p.upsells and p.rationale


async def test_pricing_never_exceeds_stated_budget(agent):
    # buyer_web states an $800 budget; the recommended price must stay within it.
    a = await agent.analyze_conversation("buyer_web")
    assert a.detections.budget_hint == 800.0
    assert a.pricing.recommended_price <= 800.0


async def test_review_inbox_ranks(agent):
    opps = await agent.review_inbox(limit=10, unread_only=True)
    assert opps
    # The $800 web project should outrank the vague one.
    assert opps[0].conversation_id == "buyer_web"


# --- approval / autonomy --------------------------------------------------- #
async def test_approve_offer_sends_with_confirm(agent, gateway):
    a = await agent.analyze_conversation("buyer_web")
    res = await agent.approve_offer(a.offer_preview)
    assert res["sent"] is True
    assert len(gateway.sent_offers) == 1
    assert gateway.sent_offers[0]["confirm"] is True  # approval relayed as confirm


async def test_approve_reply_sends(agent, gateway):
    res = await agent.approve_reply("buyer_web", "Thanks — starting now!")
    assert res["sent"] is True
    assert gateway.sent_messages[0]["confirm"] is True


async def test_autonomous_disabled_raises(agent):
    with pytest.raises(ApprovalRequired):
        await agent.autonomous_handle("buyer_web")


async def test_autonomous_enabled_acts(gateway, settings):
    from fiverr_sales_agent.agent import SalesAgent
    settings.autonomous = True
    agent = SalesAgent(gateway=gateway, settings=settings)
    res = await agent.autonomous_handle("buyer_web")
    assert res["action"] in ("offer", "reply", "declined", "skipped")
    # For the strong web lead it should send an offer.
    if res["action"] == "offer":
        assert gateway.sent_offers

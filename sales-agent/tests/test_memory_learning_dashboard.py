"""Tests for memory, learning, dashboard, daily brief, and the gateway."""

from __future__ import annotations

import pytest

from fiverr_sales_agent.learning import LearningStore
from fiverr_sales_agent.mcp_gateway import GatewayError, _unwrap
from fiverr_sales_agent.memory import ConversationMemory
from fiverr_sales_agent.models import OfferRecord, Outcome, ProjectType


# --- memory ---------------------------------------------------------------- #
def test_memory_persists_across_instances(tmp_path):
    path = tmp_path / "memory.json"
    m = ConversationMemory(path)
    m.touch_conversation("acme", "c1", name="Acme Co")
    m.record_offer("acme", OfferRecord(conversation_id="c1", title="Logo", price=150,
                                       delivery_days=3, revisions=2))
    m.set_offer_outcome("acme", "c1", accepted=True)

    m2 = ConversationMemory(path)  # reload from disk
    rec = m2.get("acme")
    assert rec is not None
    assert rec.accepted_offers == 1
    assert rec.total_revenue == 150


def test_memory_returning_and_patterns(tmp_path):
    m = ConversationMemory(tmp_path / "memory.json")
    m.touch_conversation("acme", "c1", name="Acme")
    m.touch_conversation("acme", "c2")
    assert m.is_returning("acme") is True
    m.record_offer("acme", OfferRecord(conversation_id="c1", title="x", price=100, delivery_days=2, revisions=1))
    m.set_offer_outcome("acme", "c1", accepted=True)
    summary = m.history_summary("acme")
    assert summary.returning is True
    assert summary.total_conversations == 2
    assert summary.accepted_offers == 1


# --- learning -------------------------------------------------------------- #
def test_learning_records_and_insights(tmp_path):
    ls = LearningStore(tmp_path / "learning.json")
    ls.record(Outcome(conversation_id="c1", client_id="a", project_type=ProjectType.LOGO_BRANDING,
                      won=True, final_price=120, satisfaction=5, response_time_hours=1.0,
                      lessons=["Fast reply won it"]))
    ls.record(Outcome(conversation_id="c2", client_id="b", project_type=ProjectType.LOGO_BRANDING,
                      won=False, final_price=0, response_time_hours=8.0))
    ins = ls.insights()
    assert ins["outcomes_recorded"] == 2
    assert ins["win_rate"] == 0.5
    assert ins["average_response_time_hours"] == 4.5
    assert ins["average_won_price"] == 120
    assert "Fast reply won it" in ins["recent_lessons"]


def test_learning_adjusts_win_probability(tmp_path):
    ls = LearningStore(tmp_path / "learning.json")
    # 3 losses for web dev -> observed win rate 0 pulls a high base down.
    for i in range(3):
        ls.record(Outcome(conversation_id=f"c{i}", client_id="x",
                          project_type=ProjectType.WEB_DEVELOPMENT, won=False))
    adjusted = ls.adjust_win_probability(0.8, ProjectType.WEB_DEVELOPMENT)
    assert adjusted < 0.8  # blended toward the observed 0.0
    # With no history for a different type, base is unchanged.
    assert ls.adjust_win_probability(0.8, ProjectType.VIDEO) == 0.8


# --- dashboard / daily ----------------------------------------------------- #
async def test_dashboard_builds(agent, gateway):
    dash = await agent.build_dashboard()
    assert dash.totals["open_conversations"] >= 1
    assert dash.new_opportunities  # unread previews
    assert dash.revenue_forecast >= 0
    assert dash.highest_value_leads[0].conversation_id == "buyer_web"


async def test_daily_brief(agent, gateway):
    brief = await agent.daily_brief()
    assert brief.priority_inbox
    assert brief.recommended_actions
    # It analyzed top opps but sent nothing.
    assert gateway.sent_offers == []
    assert gateway.sent_messages == []


async def test_dashboard_follow_ups(agent, gateway):
    # Seed a client with a pending offer and an old last_seen.
    agent.memory.touch_conversation("old", "c1", name="Old Client")
    agent.memory.record_offer("old", OfferRecord(conversation_id="c1", title="x", price=100,
                                                 delivery_days=2, revisions=1))
    rec = agent.memory.get("old")
    rec.last_seen = "2000-01-01T00:00:00"
    agent.memory._save()
    dash = await agent.build_dashboard()
    assert any(f["client_id"] == "old" for f in dash.follow_ups_due)


# --- gateway unwrap -------------------------------------------------------- #
def test_unwrap_success():
    assert _unwrap('{"ok": true, "result": {"x": 1}}')["result"] == {"x": 1}


def test_unwrap_confirmation_raises():
    with pytest.raises(GatewayError) as ei:
        _unwrap('{"ok": false, "confirmation_required": true, "code": "confirmation_required", "message": "need confirm"}')
    assert ei.value.code == "confirmation_required"


def test_unwrap_dry_run_raises():
    with pytest.raises(GatewayError) as ei:
        _unwrap('{"ok": false, "dry_run": true, "code": "dry_run_blocked", "message": "dry"}')
    assert ei.value.code == "dry_run_blocked"


async def test_record_outcome_updates_memory_and_learning(agent):
    agent.memory.touch_conversation("buyer_web", "buyer_web", name="Acme Co")
    agent.memory.record_offer("buyer_web", OfferRecord(conversation_id="buyer_web", title="x",
                                                       price=200, delivery_days=5, revisions=2))
    agent.record_outcome(Outcome(conversation_id="buyer_web", client_id="buyer_web",
                                 project_type=ProjectType.WEB_DEVELOPMENT, won=True, final_price=200))
    assert agent.insights()["outcomes_recorded"] == 1
    assert agent.memory.get("buyer_web").accepted_offers == 1

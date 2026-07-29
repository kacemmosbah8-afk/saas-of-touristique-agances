"""Unit tests for the offline AI heuristics."""

from __future__ import annotations

import pytest

from fiverr_agent_mcp.ai import (
    analyze_client_profile,
    detect_spam,
    estimate_win_probability,
    improve_reply_text,
    rewrite_proposal_text,
    score_lead,
    suggest_price,
    summarize_conversation,
)
from fiverr_agent_mcp.models import ChatMessage, Lead


def test_detect_spam_flags_offplatform_scam():
    verdict = detect_spam("Contact me on WhatsApp, pay outside Fiverr with gift cards")
    assert verdict.is_spam is True
    assert verdict.confidence >= 0.5
    assert verdict.reasons


def test_detect_spam_clears_normal_message():
    verdict = detect_spam("Hi, I'd love a modern logo for my bakery. What's your timeline?")
    assert verdict.is_spam is False


def test_score_lead_rewards_strong_lead():
    lead = Lead(
        lead_id="1",
        title="Ongoing content writer",
        description="Looking for a long-term, professional partner for recurring blog posts. Budget $400 per month with clear milestones and detailed briefs provided.",
        budget="$400",
    )
    result = score_lead(lead, seller_avg_price=200)
    assert result.score >= 60
    assert result.recommended is True
    assert 0.0 <= result.win_probability <= 1.0


def test_score_lead_penalizes_bargain_hunter():
    lead = Lead(lead_id="2", title="cheap", description="cheapest quick job $3", budget="$3")
    result = score_lead(lead, seller_avg_price=200)
    assert result.score < 55
    assert result.recommended is False
    assert result.risks


def test_estimate_win_probability_rating_bonus():
    lead = Lead(lead_id="3", title="Long-term", description="ongoing professional work, budget $300", budget="$300")
    low = estimate_win_probability(lead, seller_rating=3.0, response_time_hours=24)
    high = estimate_win_probability(lead, seller_rating=5.0, response_time_hours=0.5)
    assert 0.0 <= low <= high <= 1.0


@pytest.mark.parametrize("complexity", ["low", "medium", "high"])
def test_suggest_price_ordering(complexity):
    p = suggest_price("Build a website with revisions", base_price=100, complexity=complexity)
    assert p.low < p.recommended < p.high
    assert p.rationale


def test_suggest_price_complexity_scales_up():
    low = suggest_price("task", base_price=100, complexity="low").recommended
    high = suggest_price("task", base_price=100, complexity="high").recommended
    assert high > low


def test_rewrite_proposal_personalizes():
    text = rewrite_proposal_text("i can do your logo fast", buyer_name="Sam")
    assert text.startswith("Hi Sam,")
    assert "Best regards" in text


def test_improve_reply_tones():
    assert "😊" in improve_reply_text("ok will do", tone="friendly")
    assert improve_reply_text("ok will do", tone="concise").endswith(".")
    assert "Thank you" in improve_reply_text("ok", tone="professional")


def test_summarize_conversation_extracts_points():
    msgs = [
        ChatMessage(sender="buyer", body="Hi"),
        ChatMessage(sender="buyer", body="I need it delivered by Friday and my budget is $300."),
        ChatMessage(sender="me", body="Sure, can you send the brand assets?"),
    ]
    summary = summarize_conversation(msgs)
    assert summary["message_count"] == 3
    assert summary["key_points"]
    assert "me" in summary["participants"]


def test_analyze_client_profile_detects_risk():
    msgs = [ChatMessage(sender="buyer", body="Can you do a free sample first, cheapest price, before payment?")]
    profile = analyze_client_profile(msgs)
    assert profile["risk_level"] in {"medium", "high"}
    assert "spam" in profile

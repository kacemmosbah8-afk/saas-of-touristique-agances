"""Integration tests for the AI feature tools (no browser needed)."""

from __future__ import annotations

from fiverr_agent_mcp.tools import ai_tools


async def test_analyze_client(parse):
    res = parse(await ai_tools.analyze_client(ai_tools.AnalyzeClientInput(
        messages=["Ready to start, please send an offer"])))
    assert res["result"]["sentiment"] in {"positive", "neutral", "negative"}
    assert "risk_level" in res["result"]


async def test_estimate_win_probability(parse):
    res = parse(await ai_tools.estimate_win_probability_tool(ai_tools.WinProbInput(
        description="Long-term SEO work, budget $500", seller_rating=4.9, response_time_hours=0.5)))
    assert 0.0 <= res["result"]["win_probability"] <= 1.0


async def test_score_lead(parse):
    res = parse(await ai_tools.score_lead_tool(ai_tools.ScoreLeadInput(
        description="Cheap quick logo for $5", budget="$5")))
    assert res["result"]["recommended"] is False


async def test_suggest_price(parse):
    res = parse(await ai_tools.suggest_price_tool(ai_tools.SuggestPriceInput(
        scope_text="Urgent 10-page website", base_price=200, complexity="high")))
    r = res["result"]
    assert r["low"] < r["recommended"] < r["high"]


async def test_rewrite_proposal(parse):
    res = parse(await ai_tools.rewrite_proposal(ai_tools.RewriteProposalInput(
        draft="i can do your logo fast", buyer_name="Sam")))
    assert res["result"]["proposal"].startswith("Hi Sam,")


async def test_improve_reply(parse):
    res = parse(await ai_tools.improve_reply(ai_tools.ImproveReplyInput(draft="ok will do", tone="friendly")))
    assert "😊" in res["result"]["reply"]


async def test_detect_spam(parse):
    res = parse(await ai_tools.detect_spam_tool(ai_tools.DetectSpamInput(
        text="Contact me on WhatsApp and pay outside Fiverr")))
    assert res["result"]["is_spam"] is True


async def test_summarize_conversation(parse):
    res = parse(await ai_tools.summarize_conversation_tool(ai_tools.MessagesInput(
        messages=["Need it by Friday", "Budget is $300", "Can you send a draft?"])))
    assert res["result"]["message_count"] == 3
    assert res["result"]["key_points"]

"""AI feature tools (offline heuristics).

These wrap :mod:`fiverr_agent_mcp.ai.heuristics` as MCP tools. They perform no
network I/O, so they are fast, free, deterministic, and safe to call freely.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..ai import (
    analyze_client_profile,
    detect_spam,
    estimate_win_probability,
    improve_reply_text,
    rewrite_proposal_text,
    score_lead,
    suggest_price,
    summarize_conversation,
)
from ..core.mcp_app import mcp
from ..models import ChatMessage, Lead
from ..safety import safeguard
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False}


class MessagesInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    messages: list[str] = Field(
        ..., min_length=1, max_length=500, description="Conversation/message texts in order."
    )
    senders: list[str] | None = Field(
        default=None, description="Optional parallel list of sender labels for each message."
    )


class AnalyzeClientInput(MessagesInput):
    country: str | None = Field(default=None, description="Buyer country, if known.")
    stated_budget: str | None = Field(default=None, description="Stated budget, if known.")


class LeadInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    title: str = Field(default="", description="Lead title.")
    description: str = Field(..., min_length=1, description="Buyer request text.")
    budget: str | None = Field(default=None, description="Stated budget, e.g. '$150'.")


class WinProbInput(LeadInput):
    seller_rating: float | None = Field(default=None, ge=0, le=5, description="Seller rating (0-5).")
    response_time_hours: float | None = Field(
        default=None, ge=0, description="Typical response time in hours."
    )
    seller_avg_price: float | None = Field(default=None, ge=0, description="Seller average price.")


class ScoreLeadInput(LeadInput):
    seller_avg_price: float | None = Field(default=None, ge=0, description="Seller average price.")


class SuggestPriceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    scope_text: str = Field(..., min_length=1, description="Description of the work / buyer request.")
    base_price: float = Field(default=50.0, gt=0, description="Your baseline package price.")
    complexity: str = Field(default="medium", description="One of 'low', 'medium', 'high'.")
    currency: str = Field(default="USD", description="Currency code.")


class RewriteProposalInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    draft: str = Field(..., min_length=1, description="Raw proposal draft.")
    buyer_name: str | None = Field(default=None, description="Buyer name for personalization.")


class ImproveReplyInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    draft: str = Field(..., min_length=1, description="Raw reply draft.")
    tone: str = Field(default="professional", description="'professional', 'friendly', or 'concise'.")


class DetectSpamInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    text: str = Field(..., min_length=1, description="Message or lead text to classify.")


def _to_chat(messages: list[str], senders: list[str] | None) -> list[ChatMessage]:
    out: list[ChatMessage] = []
    for i, body in enumerate(messages):
        sender = senders[i] if senders and i < len(senders) else "buyer"
        out.append(ChatMessage(sender=sender, body=body))
    return out


@mcp.tool(name="analyze_client", annotations={"title": "Analyze a client", **_READ})
@tool_guard
@safeguard()
async def analyze_client(params: AnalyzeClientInput) -> str:
    """Analyze a client's messages for sentiment, risk, and buying signals.

    Args:
        params (AnalyzeClientInput):
            - messages (list[str]): Client messages in order.
            - senders (list[str], optional), country (str, optional),
              stated_budget (str, optional).

    Returns:
        str: JSON with ``sentiment``, ``risk_level``, ``buying_signals``,
        ``red_flags`` and a nested ``spam`` verdict.

    Possible errors:
        - None (pure computation).

    Example:
        analyze_client(messages=["Ready to start, please send an offer"])
        -> {"sentiment": "positive", "risk_level": "low"}
    """
    chats = _to_chat(params.messages, params.senders)
    return ok(analyze_client_profile(chats, country=params.country, stated_budget=params.stated_budget))


@mcp.tool(name="estimate_win_probability", annotations={"title": "Estimate win probability", **_READ})
@tool_guard
@safeguard()
async def estimate_win_probability_tool(params: WinProbInput) -> str:
    """Estimate the probability (0-1) of winning a lead.

    Args:
        params (WinProbInput):
            - description/title/budget (str): Lead content.
            - seller_rating (float 0-5, optional), response_time_hours (float, optional),
              seller_avg_price (float, optional).

    Returns:
        str: JSON ``{"ok": true, "result": {"win_probability": float}}``.

    Possible errors:
        - None (pure computation).

    Example:
        estimate_win_probability(description="Long-term SEO work, $500/mo", seller_rating=4.9)
        -> {"win_probability": 0.71}
    """
    lead = Lead(lead_id="0", title=params.title, description=params.description, budget=params.budget)
    prob = estimate_win_probability(
        lead,
        seller_rating=params.seller_rating,
        response_time_hours=params.response_time_hours,
        seller_avg_price=params.seller_avg_price,
    )
    return ok({"win_probability": prob})


@mcp.tool(name="score_lead", annotations={"title": "Score a lead", **_READ})
@tool_guard
@safeguard()
async def score_lead_tool(params: ScoreLeadInput) -> str:
    """Score a lead 0-100 with signals and risks (heuristic).

    Args:
        params (ScoreLeadInput):
            - description/title/budget (str), seller_avg_price (float, optional).

    Returns:
        str: JSON ``LeadScore`` (``score``, ``win_probability``, ``signals``,
        ``risks``, ``recommended``).

    Possible errors:
        - None (pure computation).

    Example:
        score_lead(description="Cheap quick logo, $5") -> {"score": 22, "recommended": false}
    """
    lead = Lead(lead_id="0", title=params.title, description=params.description, budget=params.budget)
    return ok(score_lead(lead, seller_avg_price=params.seller_avg_price))


@mcp.tool(name="suggest_price", annotations={"title": "Suggest a price", **_READ})
@tool_guard
@safeguard()
async def suggest_price_tool(params: SuggestPriceInput) -> str:
    """Suggest a price range for a piece of work.

    Args:
        params (SuggestPriceInput):
            - scope_text (str), base_price (float), complexity ('low'|'medium'|'high'),
              currency (str).

    Returns:
        str: JSON ``PriceSuggestion`` (``low``, ``recommended``, ``high``, ``rationale``).

    Possible errors:
        - None (pure computation).

    Example:
        suggest_price(scope_text="Urgent 10-page website", base_price=200, complexity="high")
    """
    return ok(
        suggest_price(
            scope_text=params.scope_text,
            base_price=params.base_price,
            complexity=params.complexity,
            currency=params.currency,
        )
    )


@mcp.tool(name="rewrite_proposal", annotations={"title": "Rewrite a proposal", **_READ})
@tool_guard
@safeguard()
async def rewrite_proposal(params: RewriteProposalInput) -> str:
    """Restructure a proposal draft into a clean, professional template.

    Args:
        params (RewriteProposalInput):
            - draft (str), buyer_name (str, optional).

    Returns:
        str: JSON ``{"ok": true, "result": {"proposal": str}}``.

    Possible errors:
        - None (pure computation).

    Example:
        rewrite_proposal(draft="i can do your logo fast", buyer_name="Sam")
    """
    return ok({"proposal": rewrite_proposal_text(params.draft, buyer_name=params.buyer_name)})


@mcp.tool(name="improve_reply", annotations={"title": "Improve a reply", **_READ})
@tool_guard
@safeguard()
async def improve_reply(params: ImproveReplyInput) -> str:
    """Polish a short reply for clarity and tone.

    Args:
        params (ImproveReplyInput):
            - draft (str), tone ('professional'|'friendly'|'concise').

    Returns:
        str: JSON ``{"ok": true, "result": {"reply": str}}``.

    Possible errors:
        - None (pure computation).

    Example:
        improve_reply(draft="ok will do", tone="friendly")
    """
    return ok({"reply": improve_reply_text(params.draft, tone=params.tone)})


@mcp.tool(name="detect_spam", annotations={"title": "Detect spam/scam", **_READ})
@tool_guard
@safeguard()
async def detect_spam_tool(params: DetectSpamInput) -> str:
    """Classify a message/lead as spam/scam with reasons.

    Args:
        params (DetectSpamInput):
            - text (str): Content to classify.

    Returns:
        str: JSON ``SpamVerdict`` (``is_spam``, ``confidence``, ``reasons``).

    Possible errors:
        - None (pure computation).

    Example:
        detect_spam(text="Contact me on WhatsApp, pay outside Fiverr")
        -> {"is_spam": true, "confidence": 0.9}
    """
    return ok(detect_spam(params.text))


@mcp.tool(name="summarize_conversation", annotations={"title": "Summarize a conversation", **_READ})
@tool_guard
@safeguard()
async def summarize_conversation_tool(params: MessagesInput) -> str:
    """Produce an extractive summary of a conversation thread.

    Args:
        params (MessagesInput):
            - messages (list[str]): Messages in order.
            - senders (list[str], optional): Parallel sender labels.

    Returns:
        str: JSON with ``message_count``, ``participants``, ``key_points``,
        ``action_items``.

    Possible errors:
        - None (pure computation).

    Example:
        summarize_conversation(messages=["Need it by Friday", "Budget is $300"])
    """
    chats = _to_chat(params.messages, params.senders)
    return ok(summarize_conversation(chats))

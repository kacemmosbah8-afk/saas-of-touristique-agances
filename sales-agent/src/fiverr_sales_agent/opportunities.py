"""Lightweight opportunity scoring from inbox previews."""

from __future__ import annotations

from fiverr_agent_mcp.ai import estimate_win_probability, score_lead
from fiverr_agent_mcp.models import Lead

from .analysis import _detect_budget
from .config import SalesAgentSettings
from .models import Opportunity


def score_preview(preview: dict, settings: SalesAgentSettings) -> Opportunity:
    """Score a single inbox conversation preview into an :class:`Opportunity`.

    Uses only the list-view snippet (cheap); a full read/analysis refines it.
    """
    snippet = preview.get("snippet", "") or ""
    contact = preview.get("contact", "Unknown")
    conv_id = preview.get("conversation_id", "")
    unread = bool(preview.get("unread", False))

    budget = _detect_budget(snippet)
    lead = Lead(lead_id="0", title="", description=snippet,
                budget=f"${budget:.0f}" if budget else None)
    scored = score_lead(lead, seller_avg_price=settings.base_price)
    win = estimate_win_probability(
        lead, seller_rating=settings.seller_rating,
        response_time_hours=settings.typical_response_hours, seller_avg_price=settings.base_price,
    )
    value = budget or settings.base_price
    return Opportunity(
        conversation_id=conv_id,
        contact=contact,
        score=scored.score,
        estimated_value=round(value, 2),
        win_probability=win,
        unread=unread,
        waiting=unread,  # an unread buyer message means they're awaiting a reply
        last_snippet=snippet[:160],
    )

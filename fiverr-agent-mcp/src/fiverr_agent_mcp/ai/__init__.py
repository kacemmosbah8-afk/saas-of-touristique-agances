"""Deterministic AI/heuristic helpers.

These tools give the calling LLM structured, explainable signals (lead scores,
spam verdicts, price ranges, proposal rewrites) without depending on an external
model. They are intentionally rule-based so they are fast, free, and unit
testable; the calling agent can layer its own judgement on top.
"""

from __future__ import annotations

from .heuristics import (
    analyze_client_profile,
    detect_spam,
    estimate_win_probability,
    improve_reply_text,
    rewrite_proposal_text,
    score_lead,
    suggest_price,
    summarize_conversation,
)

__all__ = [
    "analyze_client_profile",
    "detect_spam",
    "estimate_win_probability",
    "improve_reply_text",
    "rewrite_proposal_text",
    "score_lead",
    "suggest_price",
    "summarize_conversation",
]

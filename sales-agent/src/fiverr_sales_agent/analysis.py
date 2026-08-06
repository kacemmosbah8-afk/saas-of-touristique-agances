"""Conversation analysis: detect, estimate, recommend.

Builds on the MCP's deterministic heuristics (``fiverr_agent_mcp.ai``) for
scoring / spam / win-probability and adds sales-specific detection (project type,
urgency, complexity, budget clues, missing information) and a clear
accept/decline/ask recommendation.
"""

from __future__ import annotations

import re

from fiverr_agent_mcp.ai import (
    analyze_client_profile,
    detect_spam,
    estimate_win_probability,
    score_lead,
    summarize_conversation,
)
from fiverr_agent_mcp.models import ChatMessage, Lead

from .config import SalesAgentSettings
from .models import (
    Complexity,
    Detections,
    Estimates,
    ProjectType,
    Recommendation,
    RecommendationResult,
    Urgency,
)

# Keyword banks for project-type detection (first match wins, in priority order).
_PROJECT_KEYWORDS: list[tuple[ProjectType, tuple[str, ...]]] = [
    (ProjectType.LOGO_BRANDING, ("logo", "brand", "branding", "identity", "rebrand")),
    (ProjectType.WEB_DEVELOPMENT, ("website build", "web app", "webapp", "api", "backend",
                                   "frontend", "react", "django", "node", "database", "e-commerce",
                                   "shopify", "wordpress plugin")),
    (ProjectType.WEB_DESIGN, ("web design", "landing page", "ui", "ux", "figma", "mockup", "website design")),
    (ProjectType.WRITING_SEO, ("blog", "article", "seo", "content", "copywriting", "copy", "rewrite", "proofread")),
    (ProjectType.VIDEO, ("video", "editing", "animation", "motion", "reel", "youtube")),
    (ProjectType.MARKETING, ("marketing", "ads", "campaign", "social media", "smm", "growth")),
    (ProjectType.TRANSLATION, ("translate", "translation", "localization", "localize")),
    (ProjectType.DATA, ("data entry", "scraping", "excel", "spreadsheet", "dataset", "analysis")),
]
_URGENCY_WORDS = ("urgent", "asap", "immediately", "today", "right now", "by tomorrow", "deadline", "rush")
_COMPLEX_WORDS = ("integration", "api", "custom", "complex", "scalable", "multiple", "advanced",
                  "authentication", "payment", "database", "migration", "automation")
_CURRENCY_RE = re.compile(r"(?:\$|usd\s*|budget[^\d]{0,8})(\d{2,6})", re.IGNORECASE)
_DEADLINE_RE = re.compile(r"\b(today|tomorrow|\d+\s*(?:day|days|week|weeks|hour|hours))\b", re.IGNORECASE)


def _detect_project_type(text: str) -> ProjectType:
    low = text.lower()
    for ptype, words in _PROJECT_KEYWORDS:
        if any(w in low for w in words):
            return ptype
    return ProjectType.OTHER


def _detect_urgency(text: str) -> Urgency:
    low = text.lower()
    hits = sum(w in low for w in _URGENCY_WORDS)
    if hits >= 2 or "asap" in low or "urgent" in low:
        return Urgency.HIGH
    if hits == 1 or _DEADLINE_RE.search(low):
        return Urgency.NORMAL
    return Urgency.LOW


def _detect_complexity(text: str) -> Complexity:
    low = text.lower()
    score = sum(w in low for w in _COMPLEX_WORDS)
    if score >= 3 or len(text) > 600:
        return Complexity.HIGH
    if score >= 1 or len(text) > 200:
        return Complexity.MEDIUM
    return Complexity.LOW


def _detect_budget(text: str) -> float | None:
    match = _CURRENCY_RE.search(text)
    return float(match.group(1)) if match else None


def _missing_info(text: str, budget: float | None) -> list[str]:
    low = text.lower()
    missing: list[str] = []
    if budget is None:
        missing.append("budget")
    if not _DEADLINE_RE.search(low) and "deadline" not in low:
        missing.append("deadline / timeline")
    if len(text) < 80:
        missing.append("detailed scope / requirements")
    if not any(w in low for w in ("file", "format", "deliverable", "source", "example", "reference")):
        missing.append("desired deliverables / examples")
    return missing


class ConversationAnalyzer:
    """Analyzes a conversation into detections, estimates and a recommendation."""

    def __init__(self, settings: SalesAgentSettings) -> None:
        self._settings = settings

    def detect(self, joined_text: str) -> Detections:
        budget = _detect_budget(joined_text)
        spam = detect_spam(joined_text)
        return Detections(
            project_type=_detect_project_type(joined_text),
            urgency=_detect_urgency(joined_text),
            complexity=_detect_complexity(joined_text),
            budget_hint=budget,
            missing_info=_missing_info(joined_text, budget),
            keywords=sorted({w for w in _COMPLEX_WORDS if w in joined_text.lower()}),
            is_spam=spam.is_spam,
        )

    def summarize(self, messages: list[ChatMessage]) -> str:
        summary = summarize_conversation(messages, max_points=3)
        points = summary.get("key_points", [])
        if not points:
            return "No substantive content yet."
        return " ".join(p if p.endswith(".") else p + "." for p in points[:3])

    def estimate(
        self, detections: Detections, joined_text: str, recommended_price: float
    ) -> Estimates:
        lead = Lead(
            lead_id="0",
            title=detections.project_type.value,
            description=joined_text,
            budget=f"${detections.budget_hint:.0f}" if detections.budget_hint else None,
        )
        win = estimate_win_probability(
            lead,
            seller_rating=self._settings.seller_rating,
            response_time_hours=self._settings.typical_response_hours,
            seller_avg_price=self._settings.base_price,
        )
        value = detections.budget_hint or recommended_price
        days = {Complexity.LOW: 2, Complexity.MEDIUM: self._settings.typical_delivery_days,
                Complexity.HIGH: self._settings.typical_delivery_days + 5}[detections.complexity]
        if detections.urgency == Urgency.HIGH:
            days = max(1, days - 2)
        confidence = 0.4 + (0.3 if detections.budget_hint else 0.0) + (0.2 if len(joined_text) > 200 else 0.0)
        return Estimates(
            win_probability=win,
            estimated_value=round(value, 2),
            estimated_delivery_days=days,
            confidence=round(min(1.0, confidence), 2),
        )

    def recommend(self, detections: Detections, joined_text: str) -> RecommendationResult:
        if detections.is_spam:
            return RecommendationResult(
                action=Recommendation.DECLINE,
                reasons=["Message flagged as likely spam/scam."],
            )
        score = score_lead(
            Lead(lead_id="0", title=detections.project_type.value, description=joined_text,
                 budget=f"${detections.budget_hint:.0f}" if detections.budget_hint else None),
            seller_avg_price=self._settings.base_price,
        )
        critical_missing = [m for m in detections.missing_info if m in ("budget", "detailed scope / requirements")]
        if critical_missing:
            return RecommendationResult(
                action=Recommendation.ASK_QUESTIONS,
                reasons=[f"Missing critical details: {', '.join(critical_missing)}.",
                         f"Lead score {score.score}/100."],
                questions=self._questions_for(detections),
            )
        if not score.recommended:
            return RecommendationResult(
                action=Recommendation.DECLINE,
                reasons=[f"Low lead score ({score.score}/100)."] + score.risks[:2],
            )
        return RecommendationResult(
            action=Recommendation.ACCEPT,
            reasons=[f"Strong lead ({score.score}/100)."] + score.signals[:2],
        )

    @staticmethod
    def _questions_for(detections: Detections) -> list[str]:
        q: list[str] = []
        for item in detections.missing_info:
            if item == "budget":
                q.append("What budget range are you working with for this project?")
            elif item == "deadline / timeline":
                q.append("When do you need this delivered by?")
            elif item == "detailed scope / requirements":
                q.append("Could you share a bit more detail about the scope and requirements?")
            elif item == "desired deliverables / examples":
                q.append("What final deliverables/formats do you need, and any examples you like?")
        return q or ["Could you share a few more details so I can tailor an accurate offer?"]

    def client_profile(self, messages: list[ChatMessage], budget_hint: float | None) -> dict:
        return analyze_client_profile(
            messages,
            stated_budget=f"${budget_hint:.0f}" if budget_hint else None,
        )

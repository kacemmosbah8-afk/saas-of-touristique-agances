"""Pricing engine: recommended price, delivery, revisions, upsells, premium."""

from __future__ import annotations

from fiverr_agent_mcp.ai import suggest_price

from .config import SalesAgentSettings
from .models import Complexity, Detections, PricingRecommendation, ProjectType, Urgency

# Project-type-specific upsell ideas.
_UPSELLS: dict[ProjectType, list[str]] = {
    ProjectType.LOGO_BRANDING: ["Source files (AI/SVG)", "Social media kit", "Brand guidelines PDF"],
    ProjectType.WEB_DESIGN: ["Extra page designs", "Mobile-responsive variants", "Design system/handoff"],
    ProjectType.WEB_DEVELOPMENT: ["CMS integration", "Analytics + SEO setup", "1 month of support"],
    ProjectType.WRITING_SEO: ["Keyword research", "Meta descriptions", "Extra articles bundle"],
    ProjectType.VIDEO: ["Extra revision round", "Captions/subtitles", "Vertical (Reels) cut"],
    ProjectType.MARKETING: ["A/B ad variants", "Landing page copy", "Weekly reporting"],
    ProjectType.TRANSLATION: ["Proofreading by 2nd linguist", "Localization notes", "Rush delivery"],
    ProjectType.DATA: ["Data cleaning", "Automated refresh script", "Dashboard/summary"],
    ProjectType.OTHER: ["Priority delivery", "Extra revision", "Source files"],
}


class PricingEngine:
    def __init__(self, settings: SalesAgentSettings) -> None:
        self._settings = settings

    def recommend(self, scope_text: str, detections: Detections) -> PricingRecommendation:
        """Recommend a price package for the detected work."""
        s = self._settings
        complexity = detections.complexity.value
        suggestion = suggest_price(scope_text, base_price=s.base_price, complexity=complexity,
                                   currency=s.currency)
        price = max(s.min_price, suggestion.recommended)

        delivery = {Complexity.LOW: 2, Complexity.MEDIUM: s.typical_delivery_days,
                    Complexity.HIGH: s.typical_delivery_days + 5}[detections.complexity]
        rationale = list(suggestion.rationale)
        if detections.urgency == Urgency.HIGH:
            price = round(price * 1.2, 2)
            delivery = max(1, delivery - 2)
            rationale.append("Urgent timeline → +20% rush premium, faster delivery.")

        # When the buyer states a budget, anchor to it: quote competitively near
        # (but never above) their budget — capturing the value they signalled —
        # and let the Premium package carry the upsell above budget.
        if detections.budget_hint:
            budget = detections.budget_hint
            anchored = min(budget, max(price, budget * 0.9))  # floor at 90% of budget, cap at budget
            anchored = max(s.min_price, anchored)
            if anchored >= budget:
                rationale.append(f"Quoted at the buyer's stated budget (${budget:.0f}).")
            elif anchored > price:
                rationale.append(f"Anchored near the buyer's stated budget (${budget:.0f}).")
            else:
                rationale.append(f"Within the buyer's stated budget (${budget:.0f}).")
            price = round(anchored, 2)

        upsells = _UPSELLS.get(detections.project_type, _UPSELLS[ProjectType.OTHER])
        premium = {
            "name": "Premium",
            "price": round(price * 1.8, 2),
            "delivery_days": max(1, delivery + 2),
            "revisions": s.default_revisions + 2,
            "includes": ["Everything in Standard", *upsells[:2], "Priority support"],
        }
        return PricingRecommendation(
            currency=s.currency,
            recommended_price=round(price, 2),
            delivery_days=delivery,
            revisions=s.default_revisions,
            upsells=upsells,
            premium_package=premium,
            rationale=rationale,
        )

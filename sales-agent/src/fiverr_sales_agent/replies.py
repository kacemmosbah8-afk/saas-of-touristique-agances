"""Reply generation in three styles, matched to the seller's writing style.

Deterministic, template-based drafts parameterized by the seller's configured
greeting/sign-off and characteristic phrases. These are meant to be sent as-is or
lightly edited; an LLM caller can further refine them from the structured
analysis. The MCP's :func:`improve_reply_text` polishes each draft.
"""

from __future__ import annotations

from fiverr_agent_mcp.ai import improve_reply_text

from .config import SalesAgentSettings
from .models import (
    ConversationAnalysis,
    Detections,
    PricingRecommendation,
    RecommendationResult,
    ReplyDraft,
    ReplyStyle,
)


class ReplyGenerator:
    def __init__(self, settings: SalesAgentSettings) -> None:
        self._settings = settings

    def _greeting(self, contact: str) -> str:
        name = contact.split()[0] if contact and contact.lower() not in ("unknown", "?") else ""
        return self._settings.greeting.format(name=(" " + name) if name else "")

    def _flavor(self) -> str:
        """A characteristic phrase from the seller's samples, if any."""
        samples = self._settings.style_samples
        return f" {samples[0].strip()}" if samples else ""

    def generate(
        self,
        contact: str,
        summary: str,
        detections: Detections,
        recommendation: RecommendationResult,
        pricing: PricingRecommendation,
    ) -> list[ReplyDraft]:
        greeting = self._greeting(contact)
        signoff = f"\n\n{self._settings.signoff}"
        questions = recommendation.questions
        price_line = (
            f"I can deliver this in {pricing.delivery_days} days for "
            f"{pricing.currency} {pricing.recommended_price:.0f} "
            f"(incl. {pricing.revisions} revisions)."
        )

        # Conservative: cautious, clarifying, no pressure.
        conservative = [greeting, "", "Thanks for reaching out."]
        if questions:
            conservative.append("Before I quote precisely, a couple of quick questions:")
            conservative.extend(f"- {q}" for q in questions[:3])
        else:
            conservative.append(f"Here's my understanding: {summary}")
            conservative.append("Happy to adjust scope to fit your needs and budget.")
        conservative_text = "\n".join(conservative) + signoff

        # Professional: clear, structured, confident.
        professional = [
            greeting, "",
            f"Thanks for the details — here's my understanding: {summary}",
            "", price_line,
        ]
        if questions:
            professional.append("To finalize the scope, could you confirm: " + "; ".join(questions[:2]) + "?")
        professional.append("I'm confident I can deliver exactly what you need.")
        professional_text = "\n".join(professional) + signoff

        # Sales-oriented: enthusiastic, value-led, clear CTA + upsell.
        upsell = pricing.upsells[0] if pricing.upsells else "priority delivery"
        sales = [
            greeting, "",
            f"Love this project — {summary}",
            "",
            f"I specialize in exactly this and can make it a standout result.{self._flavor()}",
            price_line,
            f"For a bit more, I can also add {upsell} (see my Premium option).",
            "",
            "If that works, I'll send a custom offer right away — shall I?",
        ]
        sales_text = "\n".join(sales) + signoff

        return [
            ReplyDraft(style=ReplyStyle.CONSERVATIVE, text=conservative_text),
            ReplyDraft(style=ReplyStyle.PROFESSIONAL, text=professional_text),
            ReplyDraft(style=ReplyStyle.SALES, text=sales_text),
        ]


def refine(analysis: ConversationAnalysis) -> list[ReplyDraft]:
    """Optionally polish existing drafts (kept simple/deterministic)."""
    return [ReplyDraft(style=r.style, text=improve_reply_text(r.text, tone="professional"))
            for r in analysis.replies]

"""Custom Offer building and (approval-gated) sending.

Builds a complete offer *preview* from the analysis + pricing but never sends it.
Sending happens only via :meth:`OfferBuilder.approve_and_send`, which relays the
approval to the MCP's ``send_offer`` (custom "Without a Gig" by default). The MCP
still enforces DRY_RUN, confirmation and rate limits on top.
"""

from __future__ import annotations

from .config import SalesAgentSettings
from .mcp_gateway import ExecutionGateway, GatewayError
from .models import Detections, OfferPreview, PricingRecommendation, ProjectType

_TITLE_TEMPLATES: dict[ProjectType, str] = {
    ProjectType.LOGO_BRANDING: "Custom logo & brand identity design",
    ProjectType.WEB_DESIGN: "Custom website / UI design",
    ProjectType.WEB_DEVELOPMENT: "Custom web development build",
    ProjectType.WRITING_SEO: "Custom SEO content writing",
    ProjectType.VIDEO: "Custom video editing",
    ProjectType.MARKETING: "Custom marketing campaign",
    ProjectType.TRANSLATION: "Professional translation",
    ProjectType.DATA: "Data processing & analysis",
    ProjectType.OTHER: "Custom project",
}


class OfferBuilder:
    def __init__(self, settings: SalesAgentSettings) -> None:
        self._settings = settings

    def build_preview(
        self,
        conversation_id: str,
        summary: str,
        detections: Detections,
        pricing: PricingRecommendation,
    ) -> OfferPreview:
        """Construct a ready-to-send Custom Offer (nothing is sent)."""
        title = _TITLE_TEMPLATES.get(detections.project_type, _TITLE_TEMPLATES[ProjectType.OTHER])
        includes = ", ".join(pricing.upsells[:2]) if pricing.upsells else "source files"
        description = (
            f"Hi! Based on your request — {summary}\n\n"
            f"I'll deliver: {title.lower()} tailored to your needs, "
            f"with {pricing.revisions} revisions and clean, professional results. "
            f"Optional add-ons available: {includes}.\n\n"
            f"Delivery in {pricing.delivery_days} days. Let's get started!"
        )
        return OfferPreview(
            conversation_id=conversation_id,
            title=title[:80],
            description=description[:2500],
            price=pricing.recommended_price,
            delivery_days=pricing.delivery_days,
            revisions=pricing.revisions,
            offer_type="custom",
        )

    async def approve_and_send(
        self, gateway: ExecutionGateway, preview: OfferPreview, *, confirm: bool = True
    ) -> dict:
        """Send an approved offer through the MCP.

        Args:
            gateway: The execution layer.
            preview: The approved offer preview.
            confirm: Passed to the MCP (must be true to clear its high-risk gate).

        Returns:
            A dict describing the result. On DRY_RUN / confirmation, includes
            ``blocked`` with the reason instead of raising.
        """
        try:
            result = await gateway.send_offer(
                conversation_id=preview.conversation_id,
                description=preview.description,
                price=preview.price,
                delivery_days=preview.delivery_days,
                revisions=preview.revisions,
                offer_type=preview.offer_type,
                confirm=confirm,
            )
            return {"sent": True, "result": result}
        except GatewayError as exc:
            # DRY_RUN / confirmation_required / read_only etc. — surfaced, not fatal.
            return {"sent": False, "blocked": exc.code, "message": exc.message, "payload": exc.payload}

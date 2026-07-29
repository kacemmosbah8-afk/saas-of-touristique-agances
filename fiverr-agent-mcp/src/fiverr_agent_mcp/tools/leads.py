"""Buyer-request / lead tools: list, analyze, generate proposal, send offer."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..ai import rewrite_proposal_text, score_lead
from ..browser import get_client
from ..core.mcp_app import mcp
from ..models import Lead
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
_WRITE = {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}


class ListLeadsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum leads to return.")


class AnalyzeLeadInput(BaseModel):
    """A lead payload to analyze (typically from ``list_available_leads``)."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    lead_id: str = Field(default="0", description="Lead id (for reference).")
    title: str = Field(default="", description="Lead title.")
    description: str = Field(default="", description="Full buyer-request text.")
    budget: str | None = Field(default=None, description="Stated budget, e.g. '$120'.")
    seller_avg_price: float | None = Field(
        default=None, ge=0, description="Your average gig price for budget-fit scoring."
    )


class GenerateProposalInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    lead_description: str = Field(..., min_length=1, description="The buyer request to respond to.")
    seller_pitch: str = Field(
        ..., min_length=1, description="Your raw pitch / relevant experience to shape into a proposal."
    )
    buyer_name: str | None = Field(default=None, description="Buyer name for personalization.")


class SendOfferInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    lead_id: str = Field(..., description="Lead id from ``list_available_leads``.")
    description: str = Field(..., min_length=1, max_length=2500, description="Offer description.")
    price: float = Field(..., gt=0, le=100_000, description="Offer price in account currency.")
    delivery_days: int = Field(..., ge=1, le=90, description="Delivery time in days.")


@mcp.tool(name="list_available_leads", annotations={"title": "List buyer requests", **_READ})
@tool_guard
async def list_available_leads(params: ListLeadsInput) -> str:
    """List open buyer requests / leads available to respond to.

    Args:
        params (ListLeadsInput):
            - limit (int): Max leads, 1-100 (default 20).

    Returns:
        str: JSON ``{"ok": true, "count": int, "result": [Lead...]}`` where each Lead
        has ``lead_id, title, description, budget, delivery_time``.

    Possible errors:
        - ``session_expired``: Not logged in.
        - ``element_not_found``: Buyer-requests page not recognized.

    Example:
        list_available_leads(limit=10) -> ten current leads.
    """
    client = await get_client()
    return ok(await client.list_available_leads(limit=params.limit))


@mcp.tool(name="analyze_lead", annotations={"title": "Analyze a lead", **_READ})
@tool_guard
async def analyze_lead(params: AnalyzeLeadInput) -> str:
    """Score a lead's quality and estimate win probability (heuristic, offline).

    Combines budget fit, description richness, professionalism and spam signals.

    Args:
        params (AnalyzeLeadInput):
            - title/description/budget (str): Lead content.
            - seller_avg_price (float, optional): For budget-fit scoring.

    Returns:
        str: JSON ``LeadScore`` with ``score`` (0-100), ``win_probability`` (0-1),
        ``signals``, ``risks`` and ``recommended`` (bool).

    Possible errors:
        - None (pure computation); invalid input is rejected by validation.

    Example:
        analyze_lead(description="Need a long-term logo designer, budget $200")
        -> {"score": 78, "recommended": true}
    """
    lead = Lead(
        lead_id=params.lead_id,
        title=params.title,
        description=params.description,
        budget=params.budget,
    )
    return ok(score_lead(lead, seller_avg_price=params.seller_avg_price))


@mcp.tool(name="generate_proposal", annotations={"title": "Generate a proposal", **_READ})
@tool_guard
async def generate_proposal(params: GenerateProposalInput) -> str:
    """Draft a structured, professional proposal from a raw pitch.

    Offline text tool: shapes ``seller_pitch`` into a greeting + body + CTA
    tailored to ``lead_description``. The calling agent can further refine it.

    Args:
        params (GenerateProposalInput):
            - lead_description (str): The buyer request.
            - seller_pitch (str): Your raw pitch/experience.
            - buyer_name (str, optional): For a personalized greeting.

    Returns:
        str: JSON ``{"ok": true, "result": {"proposal": str}}``.

    Possible errors:
        - None (pure computation).

    Example:
        generate_proposal(lead_description="Need SEO blog posts",
                          seller_pitch="I write ranking content, 200+ posts")
    """
    proposal = rewrite_proposal_text(params.seller_pitch, buyer_name=params.buyer_name)
    return ok({"proposal": proposal, "responding_to": params.lead_description[:200]})


@mcp.tool(name="send_offer", annotations={"title": "Send a custom offer", **_WRITE})
@tool_guard
async def send_offer(params: SendOfferInput) -> str:
    """Send a custom offer in response to a buyer request.

    Args:
        params (SendOfferInput):
            - lead_id (str): Lead to respond to.
            - description (str): Offer text.
            - price (float): Offer price (>0).
            - delivery_days (int): Delivery window, 1-90.

    Returns:
        str: JSON ``{"ok": true, "result": {"lead_id", "sent": true, "price",
        "delivery_days"}}``.

    Possible errors:
        - ``not_found``: Lead no longer on the current page.
        - ``dry_run_blocked``: Skipped due to ``FIVERR_DRY_RUN``.

    Example:
        send_offer(lead_id="2", description="I'll deliver 5 posts", price=150, delivery_days=4)
    """
    client = await get_client()
    return ok(
        await client.send_offer(
            lead_id=params.lead_id,
            description=params.description,
            price=params.price,
            delivery_days=params.delivery_days,
        )
    )

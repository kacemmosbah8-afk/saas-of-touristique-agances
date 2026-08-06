"""SalesAgent — orchestrates analysis, drafting, memory, learning, and (gated)
execution through the MCP.

Guarantees:
* Read/analysis flows never send anything.
* Sending happens only via the explicit ``approve_*`` methods, or — if and only
  if ``autonomous`` is enabled — via :meth:`autonomous_handle`.
* Even then, every send goes through the MCP, which enforces DRY_RUN and its own
  confirmation/rate-limit/audit safeguards.
"""

from __future__ import annotations

from fiverr_agent_mcp.models import ChatMessage

from .analysis import ConversationAnalyzer
from .config import SalesAgentSettings, get_settings
from .daily import DailyAssistant
from .dashboard import DashboardBuilder
from .learning import LearningStore
from .mcp_gateway import ExecutionGateway, default_gateway, messages_to_texts
from .memory import ConversationMemory
from .models import (
    ConversationAnalysis,
    DailyBrief,
    DashboardData,
    OfferPreview,
    OfferRecord,
    Opportunity,
    Outcome,
    Recommendation,
)
from .offers import OfferBuilder
from .opportunities import score_preview
from .pricing import PricingEngine
from .replies import ReplyGenerator


class ApprovalRequired(RuntimeError):
    """Raised when a send is attempted without approval and autonomy is off."""


class SalesAgent:
    """The autonomous (opt-in) sales agent."""

    def __init__(
        self,
        gateway: ExecutionGateway | None = None,
        settings: SalesAgentSettings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.gateway = gateway if gateway is not None else default_gateway()
        self.memory = ConversationMemory(self.settings.memory_path)
        self.learning = LearningStore(self.settings.learning_path)
        self.analyzer = ConversationAnalyzer(self.settings)
        self.pricing = PricingEngine(self.settings)
        self.replies = ReplyGenerator(self.settings)
        self.offers = OfferBuilder(self.settings)
        self._dashboard = DashboardBuilder(self.settings, self.memory, self.learning)
        self._daily = DailyAssistant(self.settings, self._dashboard)

    # ================================================================== #
    # Analysis (never sends)
    # ================================================================== #
    async def analyze_conversation(self, conversation_id: str) -> ConversationAnalysis:
        """Full analysis of one conversation: summary, detections, estimates,
        recommendation, three replies, pricing, and an offer preview.

        Updates client memory. Sends nothing.
        """
        convo = await self.gateway.read_message(conversation_id)
        contact = convo.get("contact") or conversation_id
        bodies, senders = messages_to_texts(convo)
        chat = [ChatMessage(sender=s, body=b) for s, b in zip(senders, bodies, strict=False)]
        # Only the buyer's words drive detection (exclude our own replies).
        buyer_text = " ".join(
            b for s, b in zip(senders, bodies, strict=False) if s.lower() not in ("me", "you")
        )
        joined = buyer_text or " ".join(bodies)

        detections = self.analyzer.detect(joined)
        summary = self.analyzer.summarize(chat) if chat else "No messages yet."
        pricing = self.pricing.recommend(joined, detections)
        estimates = self.analyzer.estimate(detections, joined, pricing.recommended_price)
        # Blend the win estimate with learned outcomes for this project type.
        estimates.win_probability = self.learning.adjust_win_probability(
            estimates.win_probability, detections.project_type
        )
        recommendation = self.analyzer.recommend(detections, joined)
        replies = self.replies.generate(contact, summary, detections, recommendation, pricing)
        offer_preview = self.offers.build_preview(conversation_id, summary, detections, pricing)

        # Memory: record the touch and expose history.
        self.memory.touch_conversation(conversation_id, conversation_id, name=contact)
        history = self.memory.history_summary(conversation_id)

        return ConversationAnalysis(
            conversation_id=conversation_id,
            contact=contact,
            summary=summary,
            detections=detections,
            estimates=estimates,
            recommendation=recommendation,
            replies=replies,
            pricing=pricing,
            offer_preview=offer_preview,
            client_history=history,
        )

    async def review_inbox(self, limit: int = 20, unread_only: bool = True) -> list[Opportunity]:
        """Rank inbox conversations into scored opportunities (no sending)."""
        previews = await self.gateway.list_messages(limit=limit, unread_only=unread_only)
        opps = [score_preview(p, self.settings) for p in previews]
        return sorted(opps, key=lambda o: o.estimated_value * o.win_probability, reverse=True)

    async def build_dashboard(self) -> DashboardData:
        return await self._dashboard.build(self.gateway)

    async def daily_brief(self) -> DailyBrief:
        return await self._daily.brief(self.gateway, self.analyze_conversation)

    # ================================================================== #
    # Approved actions (the ONLY send paths)
    # ================================================================== #
    async def approve_reply(self, conversation_id: str, text: str) -> dict:
        """Send an approved reply. This IS the human approval, so it's allowed."""
        return await self.gateway.send_message(conversation_id, text, confirm=True)

    async def approve_offer(self, preview: OfferPreview, *, confirm: bool = True) -> dict:
        """Send an approved Custom Offer through the MCP (respects DRY_RUN)."""
        result = await self.offers.approve_and_send(self.gateway, preview, confirm=confirm)
        # Track the offer in memory (outcome unknown until later).
        self.memory.record_offer(preview.conversation_id, OfferRecord(
            conversation_id=preview.conversation_id, title=preview.title, price=preview.price,
            delivery_days=preview.delivery_days, revisions=preview.revisions,
        ))
        return result

    # ================================================================== #
    # Autonomous mode (opt-in only)
    # ================================================================== #
    async def autonomous_handle(self, conversation_id: str) -> dict:
        """Analyze and, ONLY if autonomous mode is enabled, act automatically.

        Raises:
            ApprovalRequired: If called while autonomous mode is disabled.
        """
        if not self.settings.autonomous:
            raise ApprovalRequired(
                "Autonomous mode is disabled — use analyze_conversation + approve_* instead. "
                "Set SALES_AUTONOMOUS=true to enable automatic actions."
            )
        analysis = await self.analyze_conversation(conversation_id)
        if analysis.detections.is_spam:
            return {"action": "skipped", "reason": "spam", "analysis": analysis.model_dump()}
        if analysis.recommendation.action == Recommendation.ACCEPT:
            sent = await self.approve_offer(analysis.offer_preview)
            return {"action": "offer", "result": sent, "analysis": analysis.model_dump()}
        if analysis.recommendation.action == Recommendation.ASK_QUESTIONS:
            reply = next((r for r in analysis.replies if r.style.value == "conservative"),
                         analysis.replies[0])
            sent = await self.approve_reply(conversation_id, reply.text)
            return {"action": "reply", "result": sent, "analysis": analysis.model_dump()}
        return {"action": "declined", "analysis": analysis.model_dump()}

    # ================================================================== #
    # Learning
    # ================================================================== #
    def record_outcome(self, outcome: Outcome) -> None:
        """Record a conversation outcome and update offer acceptance in memory."""
        self.learning.record(outcome)
        self.memory.set_offer_outcome(outcome.client_id, outcome.conversation_id, outcome.won)

    def insights(self) -> dict:
        return self.learning.insights()

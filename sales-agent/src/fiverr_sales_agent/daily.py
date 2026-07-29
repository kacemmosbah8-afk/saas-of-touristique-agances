"""Daily assistant — the morning brief."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import date

from .config import SalesAgentSettings
from .dashboard import DashboardBuilder
from .mcp_gateway import ExecutionGateway
from .models import ConversationAnalysis, DailyBrief, Recommendation

AnalyzeFn = Callable[[str], Awaitable[ConversationAnalysis]]


class DailyAssistant:
    def __init__(self, settings: SalesAgentSettings, dashboard: DashboardBuilder) -> None:
        self._settings = settings
        self._dashboard = dashboard

    async def brief(
        self, gateway: ExecutionGateway, analyze_fn: AnalyzeFn, deep_n: int = 3
    ) -> DailyBrief:
        """Produce the daily brief.

        Args:
            gateway: Execution layer.
            analyze_fn: The agent's ``analyze_conversation`` (used for the top
                few opportunities to draft replies/offers). Nothing is sent.
            deep_n: How many top opportunities to analyze in depth.
        """
        data = await self._dashboard.build(gateway)
        priority = sorted(
            data.new_opportunities or data.waiting_for_reply,
            key=lambda o: o.estimated_value * o.win_probability, reverse=True,
        )

        suggested_replies: list[dict] = []
        suggested_offers = []
        risks: list[str] = []
        actions: list[str] = []

        for opp in priority[:deep_n]:
            try:
                analysis = await analyze_fn(opp.conversation_id)
            except Exception:
                continue
            if analysis.detections.is_spam:
                risks.append(f"Possible spam from {analysis.contact} ({opp.conversation_id}).")
                continue
            # Suggest the professional reply by default.
            reply = next((r for r in analysis.replies if r.style.value == "professional"),
                         analysis.replies[0] if analysis.replies else None)
            if reply:
                suggested_replies.append({
                    "conversation_id": opp.conversation_id,
                    "contact": analysis.contact,
                    "recommendation": analysis.recommendation.action.value,
                    "reply_style": reply.style.value,
                    "reply": reply.text,
                })
            if analysis.recommendation.action == Recommendation.ACCEPT:
                suggested_offers.append(analysis.offer_preview)
                actions.append(f"Review & send offer to {analysis.contact} "
                               f"(~{self._settings.currency} {analysis.offer_preview.price:.0f}).")
            elif analysis.recommendation.action == Recommendation.ASK_QUESTIONS:
                actions.append(f"Ask {analysis.contact} clarifying questions before quoting.")

        # Risks from orders (late) and quiet clients.
        try:
            late = await gateway.list_orders(status="late")
            if late:
                risks.append(f"{len(late)} order(s) are LATE — prioritize delivery.")
        except Exception:
            pass
        if data.follow_ups_due:
            actions.append(f"Follow up with {len(data.follow_ups_due)} quiet client(s).")

        if not actions:
            actions.append("No urgent actions — inbox is under control.")

        return DailyBrief(
            date=date.today().isoformat(),
            priority_inbox=priority[:10],
            suggested_replies=suggested_replies,
            suggested_offers=suggested_offers,
            follow_ups=data.follow_ups_due,
            high_value_opportunities=data.highest_value_leads,
            risks=risks,
            recommended_actions=actions,
        )

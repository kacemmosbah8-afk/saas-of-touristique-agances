"""Dashboard builder — the sales cockpit."""

from __future__ import annotations

from datetime import datetime, timezone

from .config import SalesAgentSettings
from .learning import LearningStore
from .mcp_gateway import ExecutionGateway
from .memory import ConversationMemory
from .models import DashboardData, Opportunity
from .opportunities import score_preview


class DashboardBuilder:
    def __init__(self, settings: SalesAgentSettings, memory: ConversationMemory,
                 learning: LearningStore) -> None:
        self._settings = settings
        self._memory = memory
        self._learning = learning

    async def build(self, gateway: ExecutionGateway, inbox_limit: int = 50) -> DashboardData:
        previews = await gateway.list_messages(limit=inbox_limit, unread_only=False)
        opps: list[Opportunity] = [score_preview(p, self._settings) for p in previews]

        new_opps = [o for o in opps if o.unread]
        waiting = [o for o in opps if o.waiting]
        highest = sorted(opps, key=lambda o: o.estimated_value * o.win_probability, reverse=True)[:5]

        # Follow-ups: known clients not seen within follow_up_hours.
        follow_ups = self._due_follow_ups()

        # Revenue forecast: expected value of open opportunities.
        forecast = round(sum(o.estimated_value * o.win_probability for o in opps), 2)

        try:
            orders = await gateway.list_orders()
        except Exception:
            orders = []

        return DashboardData(
            generated_at=datetime.now(timezone.utc).isoformat(),
            new_opportunities=new_opps,
            highest_value_leads=highest,
            waiting_for_reply=waiting,
            follow_ups_due=follow_ups,
            average_response_time_hours=self._learning.average_response_time()
            or self._settings.typical_response_hours,
            win_rate=self._learning.win_rate(),
            revenue_forecast=forecast,
            totals={
                "open_conversations": len(opps),
                "unread": len(new_opps),
                "active_orders": len(orders),
                "known_clients": len(self._memory.all_clients()),
                "outcomes_recorded": self._learning.insights()["outcomes_recorded"],
            },
        )

    def _due_follow_ups(self) -> list[dict]:
        now = datetime.utcnow()
        out: list[dict] = []
        for rec in self._memory.all_clients():
            try:
                last = datetime.fromisoformat(rec.last_seen)
            except ValueError:
                continue
            hours = (now - last).total_seconds() / 3600.0
            # A client with an open (undecided) offer, gone quiet past the window.
            pending = [o for o in rec.offers if o.accepted is None]
            if hours >= self._settings.follow_up_hours and pending:
                out.append({
                    "client_id": rec.client_id,
                    "name": rec.name,
                    "hours_since_contact": round(hours, 1),
                    "pending_offers": len(pending),
                })
        return sorted(out, key=lambda d: d["hours_since_contact"], reverse=True)

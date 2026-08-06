"""Test fixtures: a fake execution gateway and an isolated agent."""

from __future__ import annotations

import pytest

from fiverr_sales_agent.agent import SalesAgent
from fiverr_sales_agent.config import SalesAgentSettings


class FakeGateway:
    """In-memory stand-in for the MCP execution layer.

    Records send calls so tests can assert nothing was sent unless approved.
    """

    def __init__(self) -> None:
        self.conversations: dict[str, dict] = {
            "buyer_web": {
                "conversation_id": "buyer_web", "contact": "Acme Co",
                "messages": [
                    {"sender": "Acme Co", "body": (
                        "Hi, I need a custom website built with a React frontend and a "
                        "payment integration. Budget is around $800 and I'd like it in 2 weeks. "
                        "Please include source files.")},
                ],
            },
            "buyer_vague": {
                "conversation_id": "buyer_vague", "contact": "Jo",
                "messages": [{"sender": "Jo", "body": "hey can you help"}],
            },
            "buyer_spam": {
                "conversation_id": "buyer_spam", "contact": "Bot",
                "messages": [{"sender": "Bot", "body": (
                    "Contact me on WhatsApp and pay outside Fiverr with gift cards")}],
            },
        }
        self.previews = [
            {"conversation_id": "buyer_web", "contact": "Acme Co",
             "snippet": "custom website React payment integration budget $800", "unread": True},
            {"conversation_id": "buyer_vague", "contact": "Jo",
             "snippet": "hey can you help", "unread": True},
        ]
        self.orders: list[dict] = []
        self.sent_messages: list[dict] = []
        self.sent_offers: list[dict] = []

    async def list_messages(self, limit=20, unread_only=False):
        rows = self.previews
        if unread_only:
            rows = [p for p in rows if p.get("unread")]
        return rows[:limit]

    async def read_message(self, conversation_id):
        return self.conversations.get(conversation_id, {"conversation_id": conversation_id, "messages": []})

    async def list_orders(self, status=None):
        if status:
            return [o for o in self.orders if o.get("status") == status]
        return self.orders

    async def read_dashboard(self):
        return {"impressions": 100, "clicks": 20, "orders": 2}

    async def safety_status(self):
        return {"mode": "DRY_RUN", "emergency_stop": {"engaged": False}}

    async def send_message(self, conversation_id, body, *, confirm=False):
        self.sent_messages.append({"conversation_id": conversation_id, "body": body, "confirm": confirm})
        return {"conversation_id": conversation_id, "sent": True}

    async def send_offer(self, conversation_id, description, price, delivery_days, *,
                         revisions=1, offer_type="custom", gig_id=None, confirm=False):
        rec = {"conversation_id": conversation_id, "price": price, "delivery_days": delivery_days,
               "offer_type": offer_type, "confirm": confirm}
        self.sent_offers.append(rec)
        return {**rec, "sent": True, "offer_type_used": offer_type}


@pytest.fixture
def settings(tmp_path) -> SalesAgentSettings:
    return SalesAgentSettings(
        data_dir=tmp_path / "data",
        seller_name="Alex",
        base_price=75,
        autonomous=False,
    )


@pytest.fixture
def gateway() -> FakeGateway:
    return FakeGateway()


@pytest.fixture
def agent(gateway, settings) -> SalesAgent:
    return SalesAgent(gateway=gateway, settings=settings)

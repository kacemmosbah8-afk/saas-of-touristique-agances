"""Conversation memory — a persistent client history store.

Tracks returning clients, their conversations, accepted/rejected offers, revenue,
and inferred buying patterns. Backed by a JSON file so history survives restarts.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .models import ClientHistorySummary, ClientRecord, OfferRecord


class ConversationMemory:
    """Load/save client records keyed by a stable client id (username)."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._clients: dict[str, ClientRecord] = {}
        self._load()

    # -- persistence ------------------------------------------------------ #
    def _load(self) -> None:
        if self._path.exists():
            try:
                data = json.loads(self._path.read_text(encoding="utf-8"))
                self._clients = {
                    cid: ClientRecord.model_validate(rec) for cid, rec in data.items()
                }
            except Exception:
                self._clients = {}

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = {cid: rec.model_dump() for cid, rec in self._clients.items()}
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
        tmp.replace(self._path)

    # -- API -------------------------------------------------------------- #
    def get_or_create(self, client_id: str, name: str = "") -> ClientRecord:
        rec = self._clients.get(client_id)
        if rec is None:
            rec = ClientRecord(client_id=client_id, name=name or client_id)
            self._clients[client_id] = rec
            self._save()
        elif name and rec.name in ("", client_id):
            rec.name = name
            self._save()
        return rec

    def get(self, client_id: str) -> ClientRecord | None:
        return self._clients.get(client_id)

    def is_returning(self, client_id: str) -> bool:
        rec = self._clients.get(client_id)
        return bool(rec and len(rec.conversations) > 1)

    def touch_conversation(self, client_id: str, conversation_id: str, name: str = "") -> ClientRecord:
        rec = self.get_or_create(client_id, name)
        if conversation_id not in rec.conversations:
            rec.conversations.append(conversation_id)
        rec.last_seen = datetime.utcnow().isoformat()
        self._save()
        return rec

    def record_offer(self, client_id: str, offer: OfferRecord) -> None:
        rec = self.get_or_create(client_id)
        rec.offers.append(offer)
        if offer.accepted:
            rec.total_revenue += offer.price
        self._save()

    def set_offer_outcome(self, client_id: str, conversation_id: str, accepted: bool) -> None:
        rec = self._clients.get(client_id)
        if not rec:
            return
        for offer in reversed(rec.offers):
            if offer.conversation_id == conversation_id and offer.accepted is None:
                offer.accepted = accepted
                if accepted:
                    rec.total_revenue += offer.price
                break
        self._save()

    def all_clients(self) -> list[ClientRecord]:
        return list(self._clients.values())

    def buying_patterns(self, client_id: str) -> list[str]:
        rec = self._clients.get(client_id)
        if not rec:
            return []
        patterns: list[str] = []
        accepted = [o for o in rec.offers if o.accepted]
        if accepted:
            avg = sum(o.price for o in accepted) / len(accepted)
            patterns.append(f"Accepts around {avg:.0f} on average")
        if rec.rejected_offers > rec.accepted_offers and rec.offers:
            patterns.append("Price-sensitive (rejects more than accepts)")
        if len(rec.conversations) >= 3:
            patterns.append("Repeat client — high retention")
        return patterns

    def history_summary(self, client_id: str) -> ClientHistorySummary:
        rec = self._clients.get(client_id)
        if not rec:
            return ClientHistorySummary()
        return ClientHistorySummary(
            returning=self.is_returning(client_id),
            total_conversations=len(rec.conversations),
            accepted_offers=rec.accepted_offers,
            rejected_offers=rec.rejected_offers,
            total_revenue=round(rec.total_revenue, 2),
            buying_patterns=self.buying_patterns(client_id),
        )

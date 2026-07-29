"""Pydantic domain models shared across the Fiverr Agent MCP.

These describe the *entities* the browser layer extracts from Fiverr (messages,
orders, gigs, leads, ...) and the structured results tools return. Tool *input*
models live next to their tools in :mod:`fiverr_agent_mcp.tools`.

Every model is JSON-serializable and forbids extra fields so schema drift is
caught early.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    """Base with strict, consistent config."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")


class ResponseFormat(str, Enum):
    """Preferred output format for tool responses."""

    MARKDOWN = "markdown"
    JSON = "json"


# --------------------------------------------------------------------------- #
# Account / session
# --------------------------------------------------------------------------- #
class LoginStatus(_Base):
    """Result of a login / verification check."""

    logged_in: bool = Field(..., description="True when an authenticated session is active.")
    username: str | None = Field(default=None, description="Detected Fiverr username, if any.")
    method: str | None = Field(
        default=None,
        description="How the session was established: 'restored', 'credentials', or 'none'.",
    )
    detail: str | None = Field(default=None, description="Human-readable status detail.")


# --------------------------------------------------------------------------- #
# Inbox
# --------------------------------------------------------------------------- #
class MessagePreview(_Base):
    """A single inbox conversation preview (list view)."""

    conversation_id: str = Field(..., description="Stable id/username used to open the thread.")
    contact: str = Field(..., description="Display name of the other party.")
    snippet: str = Field(default="", description="Preview of the latest message.")
    unread: bool = Field(default=False, description="True when the thread has unread messages.")
    last_activity: str | None = Field(
        default=None, description="Human-readable timestamp of last activity."
    )


class ChatMessage(_Base):
    """A single message within a conversation thread."""

    sender: str = Field(..., description="Who sent this message ('me' or the contact name).")
    body: str = Field(..., description="Message text content.")
    timestamp: str | None = Field(default=None, description="When it was sent, if available.")
    attachments: list[str] = Field(
        default_factory=list, description="Filenames of any attachments."
    )


class Conversation(_Base):
    """A full conversation thread."""

    conversation_id: str = Field(..., description="Stable id/username of the thread.")
    contact: str = Field(..., description="Display name of the other party.")
    messages: list[ChatMessage] = Field(default_factory=list, description="Ordered messages.")


# --------------------------------------------------------------------------- #
# Leads / buyer requests
# --------------------------------------------------------------------------- #
class Lead(_Base):
    """A buyer request / lead."""

    lead_id: str = Field(..., description="Identifier used to open or respond to the lead.")
    title: str = Field(default="", description="Short summary of what the buyer wants.")
    description: str = Field(default="", description="Full buyer request text.")
    budget: str | None = Field(default=None, description="Stated budget, if any.")
    delivery_time: str | None = Field(default=None, description="Requested delivery window.")
    category: str | None = Field(default=None, description="Category/subcategory of the request.")
    buyer_country: str | None = Field(default=None, description="Buyer country, if shown.")
    posted: str | None = Field(default=None, description="When the request was posted.")


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
class OrderStatus(str, Enum):
    """Coarse order lifecycle state."""

    ACTIVE = "active"
    LATE = "late"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    IN_REVISION = "in_revision"
    UNKNOWN = "unknown"


class OrderSummary(_Base):
    """An order as shown in the orders list."""

    order_id: str = Field(..., description="Order number (e.g. 'FO123ABC').")
    title: str = Field(default="", description="Gig/order title.")
    buyer: str | None = Field(default=None, description="Buyer username.")
    status: OrderStatus = Field(default=OrderStatus.UNKNOWN, description="Lifecycle status.")
    due: str | None = Field(default=None, description="Due date / time remaining.")
    total: str | None = Field(default=None, description="Order value.")


class OrderDetail(OrderSummary):
    """Full order detail including requirements and messages."""

    requirements: list[str] = Field(
        default_factory=list, description="Buyer-submitted requirement answers."
    )
    messages: list[ChatMessage] = Field(
        default_factory=list, description="Order-thread messages."
    )


# --------------------------------------------------------------------------- #
# Gigs
# --------------------------------------------------------------------------- #
class GigStatus(str, Enum):
    """Gig publication state."""

    ACTIVE = "active"
    PAUSED = "paused"
    DRAFT = "draft"
    PENDING = "pending"
    DENIED = "denied"
    UNKNOWN = "unknown"


class GigSummary(_Base):
    """A gig as shown in the seller's gig manager list."""

    gig_id: str = Field(..., description="Gig identifier or slug.")
    title: str = Field(default="", description="Gig title.")
    status: GigStatus = Field(default=GigStatus.UNKNOWN, description="Publication state.")
    impressions: int | None = Field(default=None, description="Impressions, if listed.")
    clicks: int | None = Field(default=None, description="Clicks, if listed.")
    orders: int | None = Field(default=None, description="Orders in queue, if listed.")


class GigDetail(GigSummary):
    """Full gig detail."""

    description: str = Field(default="", description="Gig description body.")
    category: str | None = Field(default=None, description="Category path.")
    tags: list[str] = Field(default_factory=list, description="Search tags.")
    packages: list[dict[str, Any]] = Field(
        default_factory=list, description="Package tiers with price/delivery/features."
    )


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #
class AnalyticsSnapshot(_Base):
    """A metrics snapshot from the seller dashboard/analytics."""

    period: str | None = Field(default=None, description="Time window the metrics cover.")
    impressions: int | None = Field(default=None, description="Total impressions.")
    clicks: int | None = Field(default=None, description="Total clicks.")
    orders: int | None = Field(default=None, description="Total orders.")
    conversion_rate: float | None = Field(
        default=None, description="Orders / clicks as a percentage."
    )
    cancellations: int | None = Field(default=None, description="Cancelled orders.")
    earnings: str | None = Field(default=None, description="Earnings figure, if shown.")
    raw: dict[str, Any] = Field(default_factory=dict, description="Any extra scraped metrics.")


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #
class Notification(_Base):
    """A single notification."""

    notification_id: str = Field(..., description="Identifier used to open the notification.")
    text: str = Field(default="", description="Notification text.")
    unread: bool = Field(default=False, description="True when unread.")
    timestamp: str | None = Field(default=None, description="When it was generated.")
    link: str | None = Field(default=None, description="Target URL, if any.")


# --------------------------------------------------------------------------- #
# AI feature results
# --------------------------------------------------------------------------- #
class LeadScore(_Base):
    """Heuristic scoring of a lead's quality/fit."""

    score: int = Field(..., description="0-100 quality score (higher is better).", ge=0, le=100)
    win_probability: float = Field(
        ..., description="Estimated 0.0-1.0 probability of winning the lead.", ge=0.0, le=1.0
    )
    signals: list[str] = Field(default_factory=list, description="Positive signals found.")
    risks: list[str] = Field(default_factory=list, description="Risk/spam signals found.")
    recommended: bool = Field(..., description="Whether responding is recommended.")


class SpamVerdict(_Base):
    """Result of spam/scam detection on a message or lead."""

    is_spam: bool = Field(..., description="True when the content looks like spam/scam.")
    confidence: float = Field(..., description="0.0-1.0 confidence.", ge=0.0, le=1.0)
    reasons: list[str] = Field(default_factory=list, description="Triggered heuristics.")


class PriceSuggestion(_Base):
    """A suggested price range for a piece of work."""

    currency: str = Field(default="USD", description="Currency code.")
    low: float = Field(..., description="Low end of the suggested range.", ge=0)
    recommended: float = Field(..., description="Recommended price.", ge=0)
    high: float = Field(..., description="High end of the suggested range.", ge=0)
    rationale: list[str] = Field(default_factory=list, description="Why this range was chosen.")

"""Pydantic domain models for the Sales Agent."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")


class ProjectType(str, Enum):
    LOGO_BRANDING = "logo_branding"
    WEB_DESIGN = "web_design"
    WEB_DEVELOPMENT = "web_development"
    WRITING_SEO = "writing_seo"
    VIDEO = "video"
    MARKETING = "marketing"
    TRANSLATION = "translation"
    DATA = "data"
    OTHER = "other"


class Urgency(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class Complexity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Recommendation(str, Enum):
    ACCEPT = "accept"
    DECLINE = "decline"
    ASK_QUESTIONS = "ask_questions"


class ReplyStyle(str, Enum):
    CONSERVATIVE = "conservative"
    PROFESSIONAL = "professional"
    SALES = "sales"


# --------------------------------------------------------------------------- #
class Detections(_Base):
    """Signals extracted from the client's messages."""

    project_type: ProjectType = ProjectType.OTHER
    urgency: Urgency = Urgency.NORMAL
    complexity: Complexity = Complexity.MEDIUM
    budget_hint: float | None = Field(default=None, description="Detected budget amount, if any.")
    missing_info: list[str] = Field(default_factory=list, description="Important details not provided.")
    keywords: list[str] = Field(default_factory=list)
    is_spam: bool = False


class Estimates(_Base):
    """Quantitative estimates for the opportunity."""

    win_probability: float = Field(..., ge=0.0, le=1.0)
    estimated_value: float = Field(..., ge=0.0)
    estimated_delivery_days: int = Field(..., ge=1)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class RecommendationResult(_Base):
    action: Recommendation
    reasons: list[str] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list, description="Ask these if action is ask_questions.")


class ReplyDraft(_Base):
    style: ReplyStyle
    text: str


class PricingRecommendation(_Base):
    currency: str = "USD"
    recommended_price: float = Field(..., ge=0)
    delivery_days: int = Field(..., ge=1)
    revisions: int = Field(..., ge=0)
    upsells: list[str] = Field(default_factory=list)
    premium_package: dict[str, Any] = Field(default_factory=dict)
    rationale: list[str] = Field(default_factory=list)


class OfferPreview(_Base):
    """A Custom Offer, ready to send but NOT sent."""

    conversation_id: str
    title: str
    description: str
    price: float = Field(..., ge=0)
    delivery_days: int = Field(..., ge=1)
    revisions: int = Field(..., ge=0)
    offer_type: str = "custom"


class ClientHistorySummary(_Base):
    returning: bool = False
    total_conversations: int = 0
    accepted_offers: int = 0
    rejected_offers: int = 0
    total_revenue: float = 0.0
    buying_patterns: list[str] = Field(default_factory=list)


class ConversationAnalysis(_Base):
    """The full analysis + drafts for one conversation (nothing is sent)."""

    conversation_id: str
    contact: str
    summary: str
    detections: Detections
    estimates: Estimates
    recommendation: RecommendationResult
    replies: list[ReplyDraft] = Field(default_factory=list)
    pricing: PricingRecommendation
    offer_preview: OfferPreview
    client_history: ClientHistorySummary


class Opportunity(_Base):
    conversation_id: str
    contact: str
    score: int = Field(..., ge=0, le=100)
    estimated_value: float = Field(..., ge=0)
    win_probability: float = Field(..., ge=0.0, le=1.0)
    unread: bool = False
    waiting: bool = Field(default=False, description="Buyer is awaiting a reply.")
    last_snippet: str = ""


# --------------------------------------------------------------------------- #
# Memory / learning
# --------------------------------------------------------------------------- #
class OfferRecord(_Base):
    conversation_id: str
    title: str
    price: float
    delivery_days: int
    revisions: int
    accepted: bool | None = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ClientRecord(_Base):
    client_id: str
    name: str = ""
    first_seen: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_seen: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    conversations: list[str] = Field(default_factory=list)
    offers: list[OfferRecord] = Field(default_factory=list)
    total_revenue: float = 0.0
    notes: list[str] = Field(default_factory=list)

    @property
    def accepted_offers(self) -> int:
        return sum(1 for o in self.offers if o.accepted is True)

    @property
    def rejected_offers(self) -> int:
        return sum(1 for o in self.offers if o.accepted is False)


class Outcome(_Base):
    conversation_id: str
    client_id: str
    project_type: ProjectType = ProjectType.OTHER
    won: bool
    final_price: float = 0.0
    satisfaction: int | None = Field(default=None, ge=1, le=5)
    response_time_hours: float | None = None
    lessons: list[str] = Field(default_factory=list)
    recorded_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# --------------------------------------------------------------------------- #
# Dashboard / daily brief
# --------------------------------------------------------------------------- #
class DashboardData(_Base):
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    new_opportunities: list[Opportunity] = Field(default_factory=list)
    highest_value_leads: list[Opportunity] = Field(default_factory=list)
    waiting_for_reply: list[Opportunity] = Field(default_factory=list)
    follow_ups_due: list[dict[str, Any]] = Field(default_factory=list)
    average_response_time_hours: float | None = None
    win_rate: float | None = None
    revenue_forecast: float = 0.0
    totals: dict[str, Any] = Field(default_factory=dict)


class DailyBrief(_Base):
    date: str
    priority_inbox: list[Opportunity] = Field(default_factory=list)
    suggested_replies: list[dict[str, Any]] = Field(default_factory=list)
    suggested_offers: list[OfferPreview] = Field(default_factory=list)
    follow_ups: list[dict[str, Any]] = Field(default_factory=list)
    high_value_opportunities: list[Opportunity] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)

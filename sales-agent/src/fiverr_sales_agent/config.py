"""Configuration for the Sales Agent (env-driven, prefix ``SALES_``)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    return Path.home() / ".fiverr-sales-agent"


class SalesAgentSettings(BaseSettings):
    """Runtime settings for the sales agent.

    Everything is optional with sensible defaults so the agent runs out of the
    box; tune pricing and style to match your business.
    """

    model_config = SettingsConfigDict(
        env_prefix="SALES_", env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # -- Autonomy / safety ------------------------------------------------ #
    # When False (default), the agent NEVER sends automatically — it only drafts
    # and previews. Sending happens only through explicit approve_* calls.
    autonomous: bool = Field(default=False)

    # -- Seller profile --------------------------------------------------- #
    seller_name: str = Field(default="")
    seller_rating: float = Field(default=4.9, ge=0, le=5)
    typical_response_hours: float = Field(default=2.0, ge=0)

    # -- Pricing defaults ------------------------------------------------- #
    currency: str = Field(default="USD")
    base_price: float = Field(default=75.0, gt=0)
    min_price: float = Field(default=20.0, gt=0)
    typical_delivery_days: int = Field(default=5, ge=1, le=90)
    default_revisions: int = Field(default=2, ge=0, le=30)

    # -- Cadence ---------------------------------------------------------- #
    follow_up_hours: int = Field(default=24, ge=1)

    # -- Writing style ---------------------------------------------------- #
    greeting: str = Field(default="Hi{name},")
    signoff: str = Field(default="Best regards")
    # Characteristic phrases from your own past messages, to flavor drafts.
    style_samples: list[str] = Field(default_factory=list)

    # -- Storage ---------------------------------------------------------- #
    data_dir: Path = Field(default_factory=_default_data_dir)

    @property
    def memory_path(self) -> Path:
        return self.data_dir / "memory.json"

    @property
    def learning_path(self) -> Path:
        return self.data_dir / "learning.json"


@lru_cache(maxsize=1)
def get_settings() -> SalesAgentSettings:
    """Return a cached settings instance (call ``.cache_clear()`` in tests)."""
    return SalesAgentSettings()

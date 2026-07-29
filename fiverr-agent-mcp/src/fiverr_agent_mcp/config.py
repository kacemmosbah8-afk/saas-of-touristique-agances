"""Centralized configuration for the Fiverr Agent MCP.

All configuration is sourced from environment variables (optionally loaded from a
``.env`` file) via :class:`Settings`. Nothing sensitive is ever hard-coded.

Credential handling rules enforced here:

* ``FIVERR_EMAIL`` / ``FIVERR_PASSWORD`` are read from the environment only and
  are never written to disk or logs by this module.
* ``FIVERR_SESSION_KEY`` is a Fernet key used to encrypt the persisted browser
  session. When absent, session persistence falls back to *unencrypted* storage
  and a loud warning is emitted (see :mod:`fiverr_agent_mcp.browser.session`).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_state_dir() -> Path:
    """Return the default directory for persisted session/state files."""
    return Path.home() / ".fiverr-agent-mcp"


class Settings(BaseSettings):
    """Runtime settings, populated from the environment.

    Environment variables are prefixed with ``FIVERR_`` where noted. A local
    ``.env`` file is loaded automatically if present, but real secrets should be
    supplied through the process environment in production.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Credentials (never persisted, never logged) ---------------------
    email: str | None = Field(default=None, alias="FIVERR_EMAIL")
    password: SecretStr | None = Field(default=None, alias="FIVERR_PASSWORD")

    # --- Session persistence ---------------------------------------------
    session_key: SecretStr | None = Field(default=None, alias="FIVERR_SESSION_KEY")
    state_dir: Path = Field(default_factory=_default_state_dir, alias="FIVERR_STATE_DIR")
    session_filename: str = Field(default="session.enc", alias="FIVERR_SESSION_FILE")

    # --- Browser behavior ------------------------------------------------
    headless: bool = Field(default=True, alias="FIVERR_HEADLESS")
    slow_mo_ms: int = Field(default=0, alias="FIVERR_SLOW_MO_MS", ge=0, le=5000)
    default_timeout_ms: int = Field(
        default=30_000, alias="FIVERR_TIMEOUT_MS", ge=1_000, le=120_000
    )
    navigation_timeout_ms: int = Field(
        default=45_000, alias="FIVERR_NAV_TIMEOUT_MS", ge=1_000, le=180_000
    )
    max_retries: int = Field(default=3, alias="FIVERR_MAX_RETRIES", ge=0, le=10)
    retry_backoff_base_s: float = Field(
        default=1.0, alias="FIVERR_RETRY_BACKOFF_S", ge=0.0, le=30.0
    )
    user_agent: str | None = Field(default=None, alias="FIVERR_USER_AGENT")
    locale: str = Field(default="en-US", alias="FIVERR_LOCALE")

    # --- Safety rails ----------------------------------------------------
    # When true, tools that would send/modify data on Fiverr refuse to run and
    # instead return a preview of what *would* happen. Useful for testing.
    dry_run: bool = Field(default=False, alias="FIVERR_DRY_RUN")

    # --- Production safeguards -------------------------------------------
    # Skip the confirmation gate on high-risk actions (send_offer, deliver_order,
    # create_gig, update_gig). Leave FALSE in production for human-in-the-loop.
    auto_approve: bool = Field(default=False, alias="FIVERR_AUTO_APPROVE")
    # Randomized human-like delay (seconds) inserted before each write action.
    min_action_delay_s: float = Field(default=1.5, alias="FIVERR_MIN_ACTION_DELAY_S", ge=0, le=60)
    max_action_delay_s: float = Field(default=5.0, alias="FIVERR_MAX_ACTION_DELAY_S", ge=0, le=120)
    # Throughput caps (writes/actions).
    max_actions_per_minute: int = Field(default=8, alias="FIVERR_MAX_ACTIONS_PER_MINUTE", ge=1, le=120)
    max_actions_per_day: int = Field(default=150, alias="FIVERR_MAX_ACTIONS_PER_DAY", ge=1, le=10_000)
    # Audit log location (JSON lines). Defaults under the state dir.
    audit_log_file: str = Field(default="audit.log", alias="FIVERR_AUDIT_LOG")
    # Emergency-stop sentinel file; when present, all actions abort.
    emergency_stop_file: str = Field(default="EMERGENCY_STOP", alias="FIVERR_EMERGENCY_STOP_FILE")
    # Environment kill switch (in addition to the sentinel file).
    kill_switch: bool = Field(default=False, alias="FIVERR_KILL_SWITCH")

    # --- Logging ---------------------------------------------------------
    log_level: str = Field(default="INFO", alias="FIVERR_LOG_LEVEL")
    log_json: bool = Field(default=False, alias="FIVERR_LOG_JSON")

    # --- Fiverr endpoints ------------------------------------------------
    base_url: str = Field(default="https://www.fiverr.com", alias="FIVERR_BASE_URL")

    @field_validator("log_level")
    @classmethod
    def _normalize_log_level(cls, value: str) -> str:
        level = value.strip().upper()
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if level not in valid:
            raise ValueError(f"log_level must be one of {sorted(valid)}, got {value!r}")
        return level

    @property
    def session_path(self) -> Path:
        """Absolute path to the persisted (possibly encrypted) session file."""
        return self.state_dir / self.session_filename

    @property
    def audit_log_path(self) -> Path:
        """Absolute path to the JSONL audit log."""
        return self.state_dir / self.audit_log_file

    @property
    def emergency_stop_path(self) -> Path:
        """Absolute path to the emergency-stop sentinel file."""
        return self.state_dir / self.emergency_stop_file

    @property
    def mode(self) -> str:
        """Human-readable run mode: 'DRY_RUN' or 'LIVE'."""
        return "DRY_RUN" if self.dry_run else "LIVE"

    def has_credentials(self) -> bool:
        """True when both email and password are configured."""
        return bool(self.email) and self.password is not None

    def masked_email(self) -> str:
        """Return the email with the local part partially masked for logs."""
        if not self.email or "@" not in self.email:
            return "<unset>"
        local, _, domain = self.email.partition("@")
        head = local[:2] if len(local) > 2 else local[:1]
        return f"{head}***@{domain}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance.

    Cached so the environment is parsed once per process. Call
    :func:`get_settings.cache_clear` in tests to force a reload.
    """
    return Settings()

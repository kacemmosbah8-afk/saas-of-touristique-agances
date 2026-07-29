"""SafetyManager: composes all production safeguards behind one object."""

from __future__ import annotations

from ..config import Settings, get_settings
from ..logging_config import get_logger
from .audit import AuditLogger
from .controls import EmergencyStop, SessionHealth
from .metrics import Metrics
from .rate_limiter import RateLimiter

logger = get_logger("safety.manager")


class SafetyManager:
    """Bundles rate limiting, audit, metrics, kill switch and session health."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.rate_limiter = RateLimiter(self.settings)
        self.audit = AuditLogger(self.settings.audit_log_path)
        self.metrics = Metrics()
        self.emergency = EmergencyStop(self.settings)
        self.session = SessionHealth()

    def status(self) -> dict:
        """Full safety/production status snapshot."""
        return {
            "mode": self.settings.mode,
            "dry_run": self.settings.dry_run,
            "auto_approve": self.settings.auto_approve,
            "emergency_stop": self.emergency.status(),
            "session_health": self.session.status(),
            "rate_limits": self.rate_limiter.snapshot(),
            "metrics": self.metrics.snapshot(),
        }

    def banner(self) -> str:
        """Return the production-mode banner text."""
        mode = self.settings.mode
        flag = "🟢 LIVE — actions WILL affect your real Fiverr account" if mode == "LIVE" \
            else "🟡 DRY_RUN — mutating actions are previewed, not executed"
        return (
            "\n" + "=" * 68 + "\n"
            f"  Fiverr Agent MCP — MODE: {mode}\n"
            f"  {flag}\n"
            f"  auto_approve={self.settings.auto_approve}  "
            f"rate={self.settings.max_actions_per_minute}/min,"
            f"{self.settings.max_actions_per_day}/day  "
            f"delay={self.settings.min_action_delay_s}-{self.settings.max_action_delay_s}s\n"
            f"  emergency_stop={'ENGAGED' if self.emergency.engaged() else 'clear'}  "
            f"audit={self.settings.audit_log_path}\n"
            + "=" * 68
        )


_manager: SafetyManager | None = None


def get_safety() -> SafetyManager:
    """Return the process-wide :class:`SafetyManager`, creating it on first use."""
    global _manager
    if _manager is None:
        _manager = SafetyManager()
    return _manager


def reset_safety(settings: Settings | None = None) -> SafetyManager:
    """Rebuild the safety manager (used on config change and in tests)."""
    global _manager
    _manager = SafetyManager(settings)
    return _manager

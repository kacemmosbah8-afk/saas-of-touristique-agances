"""Typed exception hierarchy for the Fiverr Agent MCP.

Tools convert these into concise, actionable error strings (see
:func:`fiverr_agent_mcp.tools.common.handle_tool_errors`). Keeping a typed
hierarchy lets the browser layer signal *what* went wrong so the tool layer can
decide how to recover (e.g. re-login on :class:`SessionExpiredError`).
"""

from __future__ import annotations


class FiverrAgentError(Exception):
    """Base class for all errors raised by this package."""

    #: Short, stable, machine-readable code included in tool error payloads.
    code: str = "fiverr_error"

    def __init__(self, message: str, *, hint: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.hint = hint

    def to_dict(self) -> dict:
        payload = {"error": True, "code": self.code, "message": self.message}
        if self.hint:
            payload["hint"] = self.hint
        return payload


class ConfigurationError(FiverrAgentError):
    """Raised when required configuration/credentials are missing or invalid."""

    code = "configuration_error"


class AuthenticationError(FiverrAgentError):
    """Raised when a login attempt fails (bad credentials, blocked, captcha)."""

    code = "authentication_error"


class SessionExpiredError(FiverrAgentError):
    """Raised when the persisted session is no longer valid and re-login failed."""

    code = "session_expired"


class NavigationError(FiverrAgentError):
    """Raised when a page fails to load or a URL cannot be reached."""

    code = "navigation_error"


class ElementNotFoundError(FiverrAgentError):
    """Raised when an expected element never appears within the timeout."""

    code = "element_not_found"


class ActionFailedError(FiverrAgentError):
    """Raised when an interaction (click/type/upload) fails after all retries."""

    code = "action_failed"


class NotFoundError(FiverrAgentError):
    """Raised when a requested resource (message, order, gig) does not exist."""

    code = "not_found"


class RateLimitedError(FiverrAgentError):
    """Raised when Fiverr rate-limits or challenges the automation."""

    code = "rate_limited"


class DryRunBlocked(FiverrAgentError):
    """Raised (and handled) when a mutating action is skipped due to dry-run."""

    code = "dry_run_blocked"

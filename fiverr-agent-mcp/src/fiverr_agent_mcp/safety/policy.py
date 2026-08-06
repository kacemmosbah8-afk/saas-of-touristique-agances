"""Tool risk classification used by the safeguard layer.

Central source of truth for which tools mutate Fiverr (``WRITE_TOOLS``) and which
are high-risk enough to require explicit confirmation (``HIGH_RISK_TOOLS``).
Keeping this here means the safeguard decorator can classify a tool purely from
its name.
"""

from __future__ import annotations

# High-risk actions require explicit confirmation unless FIVERR_AUTO_APPROVE=true.
HIGH_RISK_TOOLS: frozenset[str] = frozenset(
    {"send_offer", "deliver_order", "create_gig", "update_gig"}
)

# Mutating actions: rate-limited and blocked in read-only mode. Excludes auth
# recovery tools (login/restore_session) so the agent can always re-authenticate,
# and local-only tools (save_session).
WRITE_TOOLS: frozenset[str] = frozenset(
    {
        # inbox
        "send_message", "reply_to_message", "archive_message",
        # leads
        "send_offer",
        # orders
        "send_order_message", "deliver_order", "request_extension", "cancel_order_request",
        # gigs
        "create_gig", "update_gig", "pause_gig", "activate_gig", "delete_draft",
        # analytics / notifications
        "export_statistics", "open_notification", "mark_as_read",
    }
)

# Control-plane tools that must never be blocked by the safeguards themselves
# (otherwise you could not clear an emergency stop).
CONTROL_TOOLS: frozenset[str] = frozenset(
    {"emergency_stop", "clear_emergency_stop", "safety_status", "metrics"}
)


def is_write(tool: str) -> bool:
    return tool in WRITE_TOOLS


def is_high_risk(tool: str) -> bool:
    return tool in HIGH_RISK_TOOLS


def is_control(tool: str) -> bool:
    return tool in CONTROL_TOOLS

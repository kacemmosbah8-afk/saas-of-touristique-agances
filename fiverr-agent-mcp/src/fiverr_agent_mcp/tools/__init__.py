"""Tool packages.

Importing this package imports every tool module, which registers all tools on
the shared :data:`fiverr_agent_mcp.core.mcp_app.mcp` instance as a side effect.
"""

from __future__ import annotations

from . import (  # noqa: F401  (imported for registration side effects)
    account,
    ai_tools,
    analytics,
    gigs,
    inbox,
    leads,
    notifications,
    orders,
    safety_tools,
)

__all__ = [
    "account",
    "ai_tools",
    "analytics",
    "gigs",
    "inbox",
    "leads",
    "notifications",
    "orders",
    "safety_tools",
]

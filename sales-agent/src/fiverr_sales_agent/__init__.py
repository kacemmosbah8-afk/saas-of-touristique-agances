"""Fiverr Sales Agent.

An autonomous AI sales layer that sits **on top of** the Fiverr Agent MCP. It
reads conversations, analyzes them, drafts replies and Custom Offers, tracks
client history, learns from outcomes, and produces a dashboard and daily brief —
while keeping the human in control: it never sends a message or offer unless
explicitly approved (or autonomous mode is enabled), and every action still flows
through the MCP's safeguards (DRY_RUN, confirmation, rate limits, audit).

Business logic lives here; all Fiverr I/O is delegated to the MCP through the
:class:`~fiverr_sales_agent.mcp_gateway.ExecutionGateway`.
"""

from __future__ import annotations

__version__ = "0.1.0"

from .agent import SalesAgent

__all__ = ["SalesAgent", "__version__"]

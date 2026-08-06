"""Fiverr Agent MCP.

A production-ready Model Context Protocol (MCP) server that lets an LLM read and
write on an authenticated Fiverr account using Playwright browser automation.

The public surface intentionally stays small: import :data:`server.mcp` to embed
the server, or run ``python -m fiverr_agent_mcp`` to start it over stdio.
"""

from __future__ import annotations

__version__ = "0.1.0"

__all__ = ["__version__"]

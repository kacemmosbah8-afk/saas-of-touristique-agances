"""Server entry point.

Imports the tool packages (registering every tool on the shared FastMCP
instance) and exposes :func:`run` / :data:`mcp`. Run with::

    python -m fiverr_agent_mcp        # stdio transport (default)
    FIVERR_TRANSPORT=streamable-http python -m fiverr_agent_mcp
"""

from __future__ import annotations

import os

# Importing the tools package registers all tools via decorators as a side
# effect. Keep this import after `mcp` is created.
from . import tools  # noqa: E402,F401
from .core.mcp_app import mcp
from .logging_config import configure_logging, get_logger

logger = get_logger("server")


def run() -> None:
    """Configure logging and run the MCP server over the selected transport."""
    configure_logging()
    transport = os.getenv("FIVERR_TRANSPORT", os.getenv("TRANSPORT", "stdio")).lower()
    logger.info("Starting Fiverr Agent MCP (transport=%s)", transport)
    if transport in ("http", "streamable-http", "streamable_http"):
        mcp.run(transport="streamable-http")
    elif transport == "sse":
        mcp.run(transport="sse")
    else:
        mcp.run()  # stdio


__all__ = ["mcp", "run"]

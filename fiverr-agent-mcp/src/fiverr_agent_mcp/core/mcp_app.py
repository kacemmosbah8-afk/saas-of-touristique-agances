"""The shared :class:`FastMCP` application instance.

Kept in its own module so tool packages can ``from ..core.mcp_app import mcp``
and register decorators without importing the server entry point (which would be
a circular import). :mod:`fiverr_agent_mcp.server` imports the tool packages to
trigger their registration, then runs this instance.
"""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP

#: Server name follows the ``{service}_mcp`` convention.
mcp = FastMCP("fiverr_agent_mcp")

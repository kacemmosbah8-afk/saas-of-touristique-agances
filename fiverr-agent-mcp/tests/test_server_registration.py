"""Tests that the server registers the full, expected tool set."""

from __future__ import annotations

from fiverr_agent_mcp.smoke import EXPECTED_TOOLS, _registered_tool_names


async def test_all_expected_tools_registered():
    names = await _registered_tool_names()
    missing = EXPECTED_TOOLS - names
    assert not missing, f"Missing tools: {sorted(missing)}"
    assert len(EXPECTED_TOOLS) == 45


async def test_tools_have_descriptions():
    from fiverr_agent_mcp.core.mcp_app import mcp

    for tool in await mcp.list_tools():
        assert tool.description, f"{tool.name} has no description"
        assert tool.inputSchema is not None

"""Account & session tools: login, logout, verify, save/restore session."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..browser import get_client
from ..browser.manager import (  # noqa: F401 (test hook re-export)
    BrowserManager,
    _set_manager_for_tests,
)
from ..config import get_settings
from ..core.mcp_app import mcp
from ..safety import safeguard
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
_WRITE = {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}


class _Empty(BaseModel):
    """No parameters."""

    model_config = ConfigDict(extra="forbid")


@mcp.tool(name="login", annotations={"title": "Log in to Fiverr", **_WRITE})
@tool_guard
@safeguard()
async def login(params: _Empty) -> str:
    """Authenticate the browser session with Fiverr.

    Restores a persisted session if valid; otherwise signs in with the
    ``FIVERR_EMAIL`` / ``FIVERR_PASSWORD`` environment variables and saves the
    resulting session (encrypted when ``FIVERR_SESSION_KEY`` is set).

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"logged_in": bool, "username": str|null,
        "method": "restored"|"credentials", "detail": str}}``.

    Possible errors:
        - ``configuration_error``: No session and no credentials configured.
        - ``authentication_error``: Credentials rejected or a 2FA/captcha wall.
        - ``rate_limited``: Anti-bot challenge encountered.

    Example:
        login() -> {"ok": true, "result": {"logged_in": true, "method": "restored"}}
    """
    client = await get_client()
    return ok(await client.login())


@mcp.tool(name="logout", annotations={"title": "Log out of Fiverr", **_WRITE})
@tool_guard
@safeguard()
async def logout(params: _Empty) -> str:
    """Log out of Fiverr and delete the persisted session file.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"logged_in": false, ...}}``.

    Possible errors:
        - ``dry_run_blocked``: Skipped because ``FIVERR_DRY_RUN`` is set.

    Example:
        logout() -> {"ok": true, "result": {"logged_in": false}}
    """
    client = await get_client()
    return ok(await client.logout())


@mcp.tool(name="verify_logged_in", annotations={"title": "Verify session", **_READ})
@tool_guard
@safeguard()
async def verify_logged_in(params: _Empty) -> str:
    """Check whether the current browser session is authenticated.

    Navigates to the Fiverr home page and looks for logged-in-only UI markers.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON with ``logged_in`` (bool) and, when available, ``username``.

    Possible errors:
        - ``navigation_error``: Home page could not be loaded.

    Example:
        verify_logged_in() -> {"ok": true, "result": {"logged_in": true, "username": "acme"}}
    """
    client = await get_client()
    return ok(await client.verify_logged_in())


@mcp.tool(name="save_session", annotations={"title": "Save session", **_WRITE})
@tool_guard
@safeguard()
async def save_session(params: _Empty) -> str:
    """Persist the current browser session to disk (encrypted if configured).

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "result": {"path": str, "encrypted": bool}}``.

    Possible errors:
        - ``configuration_error``: Session key present but invalid.

    Example:
        save_session() -> {"ok": true, "result": {"path": "~/.fiverr-agent-mcp/session.enc"}}
    """
    client = await get_client()
    path = await client.save_session()
    settings = get_settings()
    return ok({"path": path, "encrypted": bool(settings.session_key)})


@mcp.tool(name="restore_session", annotations={"title": "Restore session", **_READ})
@tool_guard
@safeguard()
async def restore_session(params: _Empty) -> str:
    """Load the persisted session and verify it is still valid.

    Use this at the start of a run to avoid re-entering credentials.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON login-status object; ``logged_in`` is false when no valid
        session file exists.

    Possible errors:
        - ``configuration_error``: Encrypted session cannot be decrypted.

    Example:
        restore_session() -> {"ok": true, "result": {"logged_in": true, "method": "restored"}}
    """
    client = await get_client()
    return ok(await client.restore_session())

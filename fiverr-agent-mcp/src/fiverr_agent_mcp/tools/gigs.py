"""Gig tools: list, open, create, update, pause, activate, delete draft."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..browser import get_client
from ..core.mcp_app import mcp
from .common import ok, tool_guard

_READ = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
_WRITE = {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}
_DESTRUCTIVE = {"readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": True}


class _Empty(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GigInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    gig_id: str = Field(..., min_length=1, description="Gig id/index from list_gigs.")


class CreateGigInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    title: str = Field(..., min_length=15, max_length=80, description="Gig title (Fiverr requires 15-80 chars).")
    description: str = Field(..., min_length=120, description="Gig description (Fiverr minimum ~120 chars).")
    category: str | None = Field(default=None, description="Category path, e.g. 'Graphics & Design'.")
    tags: list[str] = Field(default_factory=list, max_length=5, description="Up to 5 search tags.")


class UpdateGigInput(GigInput):
    title: str | None = Field(default=None, min_length=15, max_length=80, description="New title.")
    description: str | None = Field(default=None, min_length=120, description="New description.")


@mcp.tool(name="list_gigs", annotations={"title": "List gigs", **_READ})
@tool_guard
async def list_gigs(params: _Empty) -> str:
    """List the seller's gigs from the gig manager.

    Args:
        params (_Empty): No parameters.

    Returns:
        str: JSON ``{"ok": true, "count": int, "result": [GigSummary...]}`` with
        ``gig_id, title, status, impressions, clicks``.

    Possible errors:
        - ``session_expired``: Not logged in.

    Example:
        list_gigs() -> all gigs with status.
    """
    client = await get_client()
    return ok(await client.list_gigs())


@mcp.tool(name="open_gig", annotations={"title": "Open a gig", **_READ})
@tool_guard
async def open_gig(params: GigInput) -> str:
    """Open a gig's edit page and return its detail.

    Args:
        params (GigInput):
            - gig_id (str): Gig identifier from ``list_gigs``.

    Returns:
        str: JSON ``GigDetail`` with ``title``, ``description``, ``status``.

    Possible errors:
        - ``navigation_error`` / ``session_expired``.

    Example:
        open_gig(gig_id="0") -> gig detail.
    """
    client = await get_client()
    return ok(await client.open_gig(params.gig_id))


@mcp.tool(name="create_gig", annotations={"title": "Create a gig draft", **_WRITE})
@tool_guard
async def create_gig(params: CreateGigInput) -> str:
    """Create a new gig draft and fill its initial fields.

    Leaves the gig as a draft for review before publishing.

    Args:
        params (CreateGigInput):
            - title (str, 15-80 chars), description (str, >=120 chars),
              category (str, optional), tags (list[str], <=5).

    Returns:
        str: JSON ``{"ok": true, "result": {"created": true, "title", "status": "draft"}}``.

    Possible errors:
        - ``dry_run_blocked`` / ``element_not_found``.

    Example:
        create_gig(title="I will design a modern minimalist logo",
                   description="<120+ chars>", tags=["logo","branding"])
    """
    client = await get_client()
    return ok(
        await client.create_gig(
            title=params.title,
            category=params.category,
            description=params.description,
            tags=params.tags,
        )
    )


@mcp.tool(name="update_gig", annotations={"title": "Update a gig", **_WRITE})
@tool_guard
async def update_gig(params: UpdateGigInput) -> str:
    """Update editable fields (title/description) on an existing gig.

    Only provided fields are changed.

    Args:
        params (UpdateGigInput):
            - gig_id (str), title (str, optional), description (str, optional).

    Returns:
        str: JSON ``{"ok": true, "result": {"gig_id", "updated": true, "fields": [...]}}``.

    Possible errors:
        - ``dry_run_blocked`` / ``element_not_found``.

    Example:
        update_gig(gig_id="0", title="I will design a premium brand identity kit")
    """
    fields: dict[str, str] = {}
    if params.title is not None:
        fields["title"] = params.title
    if params.description is not None:
        fields["description"] = params.description
    client = await get_client()
    return ok(await client.update_gig(params.gig_id, fields))


@mcp.tool(name="pause_gig", annotations={"title": "Pause a gig", **_WRITE})
@tool_guard
async def pause_gig(params: GigInput) -> str:
    """Pause an active gig (hides it from search).

    Args:
        params (GigInput):
            - gig_id (str).

    Returns:
        str: JSON ``{"ok": true, "result": {"gig_id", "status": "paused"}}``.

    Possible errors:
        - ``not_found`` / ``dry_run_blocked``.

    Example:
        pause_gig(gig_id="0") -> paused.
    """
    client = await get_client()
    return ok(await client.pause_gig(params.gig_id))


@mcp.tool(name="activate_gig", annotations={"title": "Activate a gig", **_WRITE})
@tool_guard
async def activate_gig(params: GigInput) -> str:
    """Activate a paused gig (returns it to search).

    Args:
        params (GigInput):
            - gig_id (str).

    Returns:
        str: JSON ``{"ok": true, "result": {"gig_id", "status": "active"}}``.

    Possible errors:
        - ``not_found`` / ``dry_run_blocked``.

    Example:
        activate_gig(gig_id="0") -> active.
    """
    client = await get_client()
    return ok(await client.activate_gig(params.gig_id))


@mcp.tool(name="delete_draft", annotations={"title": "Delete a draft gig", **_DESTRUCTIVE})
@tool_guard
async def delete_draft(params: GigInput) -> str:
    """Delete a draft gig permanently.

    Args:
        params (GigInput):
            - gig_id (str): Draft gig to delete.

    Returns:
        str: JSON ``{"ok": true, "result": {"gig_id", "deleted": true}}``.

    Possible errors:
        - ``not_found`` / ``dry_run_blocked``.

    Example:
        delete_draft(gig_id="3") -> deleted.
    """
    client = await get_client()
    return ok(await client.delete_draft(params.gig_id))

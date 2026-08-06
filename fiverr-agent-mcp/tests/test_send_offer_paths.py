"""Deterministic path-selection tests for the conversation-based send_offer.

Exercises the real ``FiverrClient.send_offer`` logic against a lightweight fake
Playwright page, so the custom-first preference and transparent fallback are
verified without a browser.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from playwright.async_api import TimeoutError as PWTimeout

from fiverr_agent_mcp.browser import selectors as sel
from fiverr_agent_mcp.browser.client import FiverrClient
from fiverr_agent_mcp.config import Settings


class _Loc:
    def __init__(self, count: int) -> None:
        self._count = count

    @property
    def first(self) -> _Loc:
        return self

    async def wait_for(self, state: str = "visible", timeout: float = 0) -> None:
        if self._count <= 0:
            raise PWTimeout("not present")

    async def count(self) -> int:
        return self._count

    async def click(self, *a, **k) -> None:
        pass

    async def fill(self, *a, **k) -> None:
        pass

    async def select_option(self, *a, **k) -> None:
        if self._count <= 0:
            raise PWTimeout("no select")


class _FakePage:
    """Fake page where a selector is 'present' if listed in ``present``."""

    url = "https://www.fiverr.com/inbox/buyer1"

    def __init__(self, present: set[str]) -> None:
        self.present = present

    def locator(self, selector: str) -> _Loc:
        parts = [selector] if ", " not in selector else selector.split(", ")
        count = 1 if any(p in self.present for p in parts) else 0
        return _Loc(count)

    async def goto(self, *a, **k) -> None:
        pass

    async def content(self) -> str:
        return "<html>ok</html>"

    async def screenshot(self, *a, **k) -> None:
        pass


def _client(present: set[str]) -> FiverrClient:
    settings = Settings(
        FIVERR_DRY_RUN=False, FIVERR_MAX_RETRIES=0, FIVERR_RETRY_BACKOFF_S=0.0,
        FIVERR_TIMEOUT_MS=1000, FIVERR_NAV_TIMEOUT_MS=1000,
    )
    return FiverrClient(
        page=_FakePage(present), context=MagicMock(), settings=settings,
        session_store=MagicMock(),
    )


# Common controls present in every scenario (trigger + fields + submit).
_BASE = {
    sel.CREATE_OFFER_BUTTON[0],
    sel.OFFER_DESCRIPTION_INPUT[0],
    sel.OFFER_PRICE_INPUT[0],
    sel.OFFER_DELIVERY_INPUT[0],
    sel.SEND_OFFER_BUTTON[0],
}


async def _send(present, **kw):
    client = _client(present)
    return await client.send_offer(
        "buyer1", "I'll deliver 5 posts", 150.0, 4, capture_screenshots=False, **kw
    )


async def test_default_uses_custom_when_available():
    res = await _send(_BASE | {sel.OFFER_CUSTOM_OPTION[0]})
    assert res["offer_type_requested"] == "custom"
    assert res["offer_type_used"] == "custom"
    assert res["fallback_used"] is False
    assert res["gig_selected"] is None
    # Deterministic, shortest path recorded.
    assert any(p.startswith("create_offer:") for p in res["selector_path_used"])
    assert any(p.startswith("custom_option:") for p in res["selector_path_used"])
    assert any(p.startswith("submit:") for p in res["selector_path_used"])


async def test_custom_requested_falls_back_to_gig_when_only_gig_available():
    # No custom option; a gig <select> is present -> transparent fallback to gig.
    res = await _send(_BASE | {sel.OFFER_GIG_SELECT[0]})
    assert res["offer_type_requested"] == "custom"
    assert res["offer_type_used"] == "gig"
    assert res["fallback_used"] is True
    assert res["gig_selected"] is not None
    assert any(p.startswith("gig_select:") for p in res["selector_path_used"])


async def test_explicit_gig_uses_gig_path():
    res = await _send(_BASE | {sel.OFFER_GIG_SELECT[0]}, offer_type="gig", gig_id="12345")
    assert res["offer_type_used"] == "gig"
    assert res["fallback_used"] is False
    assert res["gig_selected"] == "12345"


async def test_explicit_gig_falls_back_to_custom_when_no_gig():
    # gig requested but only custom is available -> fall back to custom.
    res = await _send(_BASE | {sel.OFFER_CUSTOM_OPTION[0]}, offer_type="gig")
    assert res["offer_type_used"] == "custom"
    assert res["fallback_used"] is True


async def test_custom_assumed_when_neither_option_detected():
    # Neither explicit custom nor gig controls -> assume custom (composer default).
    res = await _send(_BASE)
    assert res["offer_type_used"] == "custom"
    assert res["fallback_used"] is False
    assert "custom_option:default" in res["selector_path_used"]


async def test_missing_create_offer_button_raises():
    from fiverr_agent_mcp.exceptions import NotFoundError

    client = _client({sel.OFFER_PRICE_INPUT[0]})  # no CREATE_OFFER_BUTTON
    with pytest.raises(NotFoundError):
        await client.send_offer("buyer1", "x", 100.0, 3, capture_screenshots=False)

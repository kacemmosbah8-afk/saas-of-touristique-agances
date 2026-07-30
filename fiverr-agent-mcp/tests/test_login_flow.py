"""End-to-end tests for ``FiverrClient.login()`` against a fake page.

These reproduce the exact reported bug — ``detect_login_wall`` raising
``SessionExpiredError`` the instant the browser reaches Fiverr's own login
page during an *intentional* credential login — and verify the full flow:
reach the login page, fill email/password, click submit, tolerate a pending
2FA/challenge page without crashing, and persist the session on success.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from playwright.async_api import TimeoutError as PWTimeout

from fiverr_agent_mcp.browser import selectors as sel
from fiverr_agent_mcp.browser.client import FiverrClient
from fiverr_agent_mcp.config import Settings
from fiverr_agent_mcp.exceptions import (
    AuthenticationError,
    DryRunBlocked,
    RateLimitedError,
)


def _parts(selector: str) -> list[str]:
    """Split a comma-joined CSS selector list back into individual selectors."""
    return [selector] if ", " not in selector else selector.split(", ")


class _FakeLocator:
    """A locator whose presence depends on the fake page's current state/URL."""

    def __init__(self, page: FakeLoginPage, selector: str) -> None:
        self.page = page
        self.selector = selector

    @property
    def first(self) -> _FakeLocator:
        return self

    async def count(self) -> int:
        return 1 if self._present() else 0

    async def wait_for(self, state: str = "visible", timeout: float = 0) -> None:
        if not self._present():
            raise PWTimeout("not present")

    async def fill(self, value: str, timeout: float | None = None) -> None:
        self.page.filled[self.selector] = value

    async def click(self, timeout: float | None = None) -> None:
        self.page.clicked.append(self.selector)
        if self.selector in sel.LOGIN_SUBMIT and not self.page.hold_challenge:
            self.page.state = "authenticated"

    async def inner_text(self, timeout: float | None = None) -> str:
        if self.page.state == "authenticated" and any(
            p in sel.USERNAME_DISPLAY for p in _parts(self.selector)
        ):
            return "acme_seller"
        return ""

    def _present(self) -> bool:
        parts = _parts(self.selector)
        page = self.page
        if page.state == "authenticated":
            if any(p in sel.LOGGED_IN_MARKERS for p in parts):
                return True
            if any(p in sel.USERNAME_DISPLAY for p in parts):
                return True
        if "/login" in page.url:
            if any(p in sel.EMAIL_INPUT for p in parts):
                return True
            if any(p in sel.PASSWORD_INPUT for p in parts):
                return True
            if any(p in sel.LOGIN_SUBMIT for p in parts):
                return True
        return False


class FakeLoginPage:
    """A fake Playwright page modeling Fiverr's login/home state transitions."""

    def __init__(
        self, *, redirect_home_to_login_once: bool = False, captcha_active: bool = False
    ) -> None:
        self.url = "https://www.fiverr.com/"
        self.state = "anon"  # or "authenticated"
        self.hold_challenge = False  # simulate a pending 2FA/challenge on submit
        self.captcha_active = captcha_active  # simulate an anti-bot wall on every page
        self.clicked: list[str] = []
        self.filled: dict[str, str] = {}
        self.history: list[str] = []
        self._redirect_home_to_login_once = redirect_home_to_login_once
        self._redirected = False

    async def goto(self, url: str, timeout: float | None = None, wait_until: str | None = None) -> None:
        self.history.append(url)
        if (
            self._redirect_home_to_login_once
            and not self._redirected
            and "/login" not in url
            and self.state != "authenticated"
        ):
            self._redirected = True
            self.url = "https://www.fiverr.com/login?next=/"
            return
        self.url = url

    async def wait_for_load_state(self, state: str | None = None, timeout: float | None = None) -> None:
        pass

    async def content(self) -> str:
        if self.captcha_active:
            return "<html>please complete the captcha</html>"
        return "<html>ok</html>"

    def locator(self, selector: str) -> _FakeLocator:
        return _FakeLocator(self, selector)


def _settings(**overrides) -> Settings:
    base = dict(
        FIVERR_EMAIL="seller@example.com",
        FIVERR_PASSWORD="hunter2",
        FIVERR_DRY_RUN=False,
        FIVERR_MAX_RETRIES=0,
        FIVERR_RETRY_BACKOFF_S=0.0,
        FIVERR_TIMEOUT_MS=1000,
        FIVERR_NAV_TIMEOUT_MS=1000,
    )
    base.update(overrides)
    return Settings(**base)


def _client(
    page: FakeLoginPage, session_store=None, settings: Settings | None = None
) -> tuple[FiverrClient, MagicMock, MagicMock]:
    context = MagicMock()
    context.storage_state = AsyncMock(return_value={"cookies": [{"name": "x"}], "origins": []})
    session_store = session_store or MagicMock()
    client = FiverrClient(
        page=page, context=context, settings=settings or _settings(), session_store=session_store
    )
    return client, context, session_store


# --------------------------------------------------------------------------- #
async def test_login_reaches_login_page_without_raising():
    """The core reported bug: navigating to /login during login() must not raise
    SessionExpiredError."""
    page = FakeLoginPage()
    client, _, _ = _client(page)

    status = await client.login()  # must not raise

    assert any("/login" in u for u in page.history), "browser never navigated to the login page"
    assert status.logged_in is True


async def test_login_fills_email_and_password():
    page = FakeLoginPage()
    client, _, _ = _client(page)

    await client.login()

    assert page.filled.get(sel.EMAIL_INPUT[0]) == "seller@example.com"
    assert page.filled.get(sel.PASSWORD_INPUT[0]) == "hunter2"


async def test_login_clicks_submit():
    page = FakeLoginPage()
    client, _, _ = _client(page)

    await client.login()

    assert sel.LOGIN_SUBMIT[0] in page.clicked


async def test_login_persists_encrypted_session_on_success():
    page = FakeLoginPage()
    client, context, session_store = _client(page)

    status = await client.login()

    assert status.method == "credentials"
    context.storage_state.assert_awaited()
    session_store.save.assert_called_once()


async def test_pending_challenge_reports_authentication_error_not_session_expired():
    """A lingering 2FA/challenge page after submit must surface as a clear
    AuthenticationError (so the caller can complete it and retry) — never as
    SessionExpiredError, which would incorrectly imply an existing session died."""
    page = FakeLoginPage()
    page.hold_challenge = True
    client, _, _ = _client(page)

    with pytest.raises(AuthenticationError) as exc_info:
        await client.login()
    detail = f"{exc_info.value.message} {exc_info.value.hint or ''}".lower()
    assert "challenge" in detail or "2fa" in detail


async def test_login_succeeds_after_challenge_is_completed_and_retried():
    """After the human solves the challenge (simulated by the page becoming
    authenticated), calling login() again must succeed."""
    page = FakeLoginPage()
    page.hold_challenge = True
    client, _, session_store = _client(page)

    with pytest.raises(AuthenticationError):
        await client.login()

    # Simulate the human completing the challenge/2FA in the (headful) browser.
    page.state = "authenticated"
    status = await client.login()

    assert status.logged_in is True
    session_store.save.assert_called()


async def test_stale_persisted_session_falls_through_to_credentials():
    """If a persisted session looks stale (probing home unexpectedly redirects to
    /login on the very first check), login() must not crash — it should fall
    through to the normal credential flow instead of propagating
    SessionExpiredError."""
    page = FakeLoginPage(redirect_home_to_login_once=True)
    client, _, _ = _client(page)

    status = await client.login()  # must not raise SessionExpiredError

    assert status.logged_in is True
    assert status.method == "credentials"


# --------------------------------------------------------------------------- #
# CAPTCHA/anti-bot: must pause (browser stays open), never crash/close.
# --------------------------------------------------------------------------- #
async def test_captcha_pauses_and_retries_instead_of_raising(monkeypatch):
    """A captcha hit during login() must not propagate immediately: it should
    pause via _pause_for_manual_challenge, then retry the same step. Simulate a
    human solving the challenge by clearing it inside the pause callback."""
    page = FakeLoginPage(captcha_active=True)
    client, _, session_store = _client(page)

    pause_calls = {"n": 0}

    async def fake_pause(exc):
        pause_calls["n"] += 1
        page.captcha_active = False  # simulate the human solving it

    monkeypatch.setattr(client, "_pause_for_manual_challenge", fake_pause)

    status = await client.login()  # must not raise RateLimitedError

    assert pause_calls["n"] >= 1
    assert status.logged_in is True
    session_store.save.assert_called()


async def test_captcha_abort_propagates_rate_limited_error(monkeypatch):
    """If the human explicitly aborts (or the pause callback re-raises), login()
    must propagate RateLimitedError rather than looping forever or masking it."""
    page = FakeLoginPage(captcha_active=True)
    client, _, _ = _client(page)

    async def fake_pause(exc):
        raise exc  # simulate explicit abort

    monkeypatch.setattr(client, "_pause_for_manual_challenge", fake_pause)

    with pytest.raises(RateLimitedError):
        await client.login()


# --------------------------------------------------------------------------- #
# Dry-run must NOT block login: authenticating is a prerequisite, not a write.
# --------------------------------------------------------------------------- #
async def test_login_is_not_blocked_by_dry_run():
    """FIVERR_DRY_RUN gates marketplace writes, never authentication. The manual
    login CLI must be able to create the first real session in dry-run mode."""
    page = FakeLoginPage()
    client, _, session_store = _client(page, settings=_settings(FIVERR_DRY_RUN=True))

    status = await client.login()  # must NOT raise DryRunBlocked

    assert status.logged_in is True
    assert status.method == "credentials"
    session_store.save.assert_called()  # session persisted despite dry-run


async def test_send_message_still_blocked_by_dry_run():
    """Guard rail unchanged: an actual marketplace write is still dry-run-gated,
    proving login's exemption didn't loosen the write path."""
    page = FakeLoginPage()
    client, _, _ = _client(page, settings=_settings(FIVERR_DRY_RUN=True))

    with pytest.raises(DryRunBlocked):
        await client.send_message("buyer1", "hello")


async def test_pause_reraises_immediately_when_stdin_is_not_a_tty(monkeypatch):
    """_pause_for_manual_challenge must never block on input() when stdin isn't
    an interactive TTY (e.g. running as an MCP server over stdio) — it must
    re-raise the original exception right away instead of trying to read a
    line from a pipe that isn't a human typing."""
    page = FakeLoginPage()
    client, _, _ = _client(page)
    monkeypatch.setattr("sys.stdin.isatty", lambda: False)

    exc = RateLimitedError("captcha")
    with pytest.raises(RateLimitedError):
        await client._pause_for_manual_challenge(exc)

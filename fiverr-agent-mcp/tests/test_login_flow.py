"""End-to-end tests for ``FiverrClient.login()`` against a fake page.

These reproduce the exact reported bug — ``detect_login_wall`` raising
``SessionExpiredError`` the instant the browser reaches Fiverr's own login
page during an *intentional* credential login — and verify the full flow:
reach the login page, fill email/password, click submit, tolerate a pending
2FA/challenge page without crashing, and persist the session on success.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from playwright.async_api import TimeoutError as PWTimeout

from fiverr_agent_mcp.browser import client as client_mod
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
        if any(p in sel.SIGN_IN_TRIGGER for p in _parts(self.selector)):
            # Clicking the homepage "Sign in" trigger opens the login form.
            self.page.open_login_ui()
            return
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
        # A logged-out "Sign in" trigger (e.g. homepage header) when the form is
        # not open and we're not authenticated.
        if (
            page.sign_in_present
            and page.state != "authenticated"
            and any(p in sel.SIGN_IN_TRIGGER for p in parts)
        ):
            return True
        if "/login" in page.url and not page.suppress_form:
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
        self,
        *,
        redirect_home_to_login_once: bool = False,
        captcha_active: bool = False,
        suppress_form: bool = False,
        content_override: str | None = None,
        redirect_login_to: str | None = None,
        sign_in_present: bool = False,
    ) -> None:
        self.url = "https://www.fiverr.com/"
        self.state = "anon"  # or "authenticated"
        self.hold_challenge = False  # simulate a pending 2FA/challenge on submit
        self.captcha_active = captcha_active  # simulate an anti-bot wall on every page
        self.suppress_form = suppress_form  # login URL present but no form (DOM change)
        self.content_override = content_override  # force page HTML (e.g. human-touch)
        self.redirect_login_to = redirect_login_to  # /login lands on another URL
        self.sign_in_present = sign_in_present  # homepage "Sign in" trigger visible
        self.title_text = "Fiverr"
        self.clicked: list[str] = []
        self.filled: dict[str, str] = {}
        self.history: list[str] = []
        self.screenshots: list[str] = []
        self._redirect_home_to_login_once = redirect_home_to_login_once
        self._redirected = False

    async def goto(self, url: str, timeout: float | None = None, wait_until: str | None = None) -> None:
        self.history.append(url)
        if self.redirect_login_to and "/login" in url:
            self.url = self.redirect_login_to
            return
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
        if self.content_override is not None:
            return self.content_override
        if self.captcha_active:
            return "<html>please complete the captcha</html>"
        return "<html>ok</html>"

    def open_login_ui(self) -> None:
        """Simulate the 'Sign in' trigger opening the credential form."""
        self.url = "https://www.fiverr.com/login"
        self.suppress_form = False
        self.sign_in_present = False

    async def title(self) -> str:
        return self.title_text

    async def screenshot(self, path: str | None = None, full_page: bool = False) -> bytes:
        if path is not None:
            Path(path).write_bytes(b"\x89PNG\r\n")  # minimal fake PNG
            self.screenshots.append(path)
        return b"\x89PNG\r\n"

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


# --------------------------------------------------------------------------- #
# Diagnostics: when the email field is missing, inspect the page and adapt.
# --------------------------------------------------------------------------- #
def _diag_dir(client: FiverrClient) -> Path:
    return client.settings.state_dir / "diagnostics"


async def test_missing_email_on_login_dumps_diagnostics_and_reports_dom_change():
    """On the login URL but with no known email field (DOM changed): raise a
    clear AuthenticationError AND save a screenshot, HTML and JSON metadata."""
    page = FakeLoginPage(suppress_form=True)
    client, _, _ = _client(page)

    with pytest.raises(AuthenticationError) as exc_info:
        await client.login()

    msg = f"{exc_info.value.message} {exc_info.value.hint or ''}".lower()
    assert "login dom" in msg or "email field matched" in msg
    files = list(_diag_dir(client).iterdir())
    suffixes = {f.suffix for f in files}
    assert {".png", ".html", ".json"} <= suffixes  # all three artifacts saved
    # The metadata records which email selectors were tried (DOM-change evidence).
    meta = next(f for f in files if f.suffix == ".json")
    import json as _json

    data = _json.loads(meta.read_text())
    assert data["state"] == client_mod.LOGIN_STATE_UNKNOWN_DOM
    assert set(data["email_selectors_tried"]) == set(sel.EMAIL_INPUT)
    assert data["url"]  # current URL was logged


async def test_missing_email_when_already_logged_in_finishes_as_success():
    """If the login page has no form because we're actually already logged in,
    login() must detect that and succeed instead of erroring."""
    page = FakeLoginPage(suppress_form=True)
    page.state = "authenticated"  # logged-in markers now present
    client, _, session_store = _client(page)

    status = await client.login()

    assert status.logged_in is True
    session_store.save.assert_called()


async def test_find_login_email_pauses_on_human_touch_then_recovers(monkeypatch):
    """A PerimeterX 'It needs a human touch' page reached while looking for the
    email field must be detected as a challenge: _find_login_email pauses for a
    manual solve, saves a challenge diagnosis, then re-probes and returns the
    field once the human clears it. (Exercised directly so a late JS-rendered
    challenge — not caught at navigation time — is simulated.)"""
    page = FakeLoginPage(
        suppress_form=True,
        content_override="<html><body>It needs a human touch — Press &amp; Hold</body></html>",
    )
    page.url = "https://www.fiverr.com/login"
    client, _, _ = _client(page)

    async def fake_pause(exc):
        # Human solves it: the real form appears and the page returns to normal.
        page.suppress_form = False
        page.content_override = None

    monkeypatch.setattr(client, "_pause_for_manual_challenge", fake_pause)

    email = await client._find_login_email()

    assert email is not None
    metas = [f for f in _diag_dir(client).iterdir() if f.suffix == ".json"]
    import json as _json

    assert any(
        _json.loads(m.read_text())["state"] == client_mod.LOGIN_STATE_CHALLENGE for m in metas
    )


async def test_login_clicks_sign_in_trigger_when_redirected_to_homepage():
    """Fiverr redirects /login to the homepage (form not shown, "Sign in" button
    visible). login() must detect that, click the trigger to open the form, wait
    for it, and only then locate the email field — reaching authentication."""
    page = FakeLoginPage(
        redirect_login_to="https://www.fiverr.com/",  # /login -> homepage
        suppress_form=True,  # no form until the trigger is clicked
        sign_in_present=True,  # homepage shows a "Sign in" button
    )
    client, _, session_store = _client(page)

    status = await client.login()

    assert status.logged_in is True
    assert status.method == "credentials"
    # The Sign-in trigger was actually clicked to open the form.
    assert any(s in page.clicked for s in sel.SIGN_IN_TRIGGER)
    # The email + password fields were filled only after the form opened.
    assert page.filled.get(sel.EMAIL_INPUT[0]) == "seller@example.com"
    session_store.save.assert_called()


async def test_login_reports_when_form_never_opens_after_clicking_sign_in(monkeypatch):
    """If the 'Sign in' trigger is present but clicking it never reveals the
    form, login() must give up with an actionable error and saved diagnostics —
    not loop forever."""
    page = FakeLoginPage(suppress_form=True, sign_in_present=True)
    page.url = "https://www.fiverr.com/"
    client, _, _ = _client(page)
    # Neutralize the trigger so clicking never opens the form.
    monkeypatch.setattr(page, "open_login_ui", lambda: None)

    with pytest.raises(AuthenticationError) as exc_info:
        await client.login()

    assert "sign in" in exc_info.value.message.lower()
    metas = [f for f in _diag_dir(client).iterdir() if f.suffix == ".json"]
    import json as _json

    assert any(
        _json.loads(m.read_text())["state"] == client_mod.LOGIN_STATE_SIGN_IN_TRIGGER for m in metas
    )


async def test_missing_email_after_redirect_reports_actual_url():
    """If Fiverr redirects the login flow away from /login, the error must name
    the actual URL and still save diagnostics."""
    # Navigating to /login actually lands on an account-hold interstitial.
    page = FakeLoginPage(redirect_login_to="https://www.fiverr.com/account_security_hold")
    client, _, _ = _client(page)

    with pytest.raises(AuthenticationError) as exc_info:
        await client.login()

    assert "account_security_hold" in exc_info.value.message
    metas = [f for f in _diag_dir(client).iterdir() if f.suffix == ".json"]
    import json as _json

    assert any(
        _json.loads(m.read_text())["state"] == client_mod.LOGIN_STATE_REDIRECTED for m in metas
    )

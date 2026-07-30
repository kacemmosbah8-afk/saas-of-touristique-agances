"""Unit tests for BrowserManager's launch-path selection.

These verify — without a real browser — that:

* the default (no ``FIVERR_CHROME_USER_DATA_DIR``) still uses the throwaway
  ``launch()`` + ``new_context()`` path and applies the encrypted session, and
* setting a Chrome user-data-dir switches to ``launch_persistent_context()``,
  binds to that dir, does **not** inject the encrypted session as storage_state
  (the profile owns state), yet still *saves* the session on close.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from fiverr_agent_mcp.browser.manager import BrowserManager
from fiverr_agent_mcp.config import Settings


class _FakePage:
    pass


class _FakeContext:
    def __init__(self, *, with_default_page: bool) -> None:
        self.pages = [_FakePage()] if with_default_page else []
        self.set_default_timeout = MagicMock()
        self.set_default_navigation_timeout = MagicMock()
        self.new_page = AsyncMock(return_value=_FakePage())
        self.close = AsyncMock()
        self.storage_state = AsyncMock(return_value={"cookies": [], "origins": []})


class _FakeBrowser:
    def __init__(self, context: _FakeContext) -> None:
        self._context = context
        self.new_context = AsyncMock(return_value=context)
        self.close = AsyncMock()


class _FakeChromium:
    def __init__(self) -> None:
        self.throwaway_context = _FakeContext(with_default_page=False)
        self.persistent_context = _FakeContext(with_default_page=True)
        self.browser = _FakeBrowser(self.throwaway_context)
        self.launch = AsyncMock(return_value=self.browser)
        self.launch_persistent_context = AsyncMock(return_value=self.persistent_context)


class _FakePlaywright:
    def __init__(self) -> None:
        self.chromium = _FakeChromium()
        self.stop = AsyncMock()


class _FakePlaywrightManager:
    """Mimics the object returned by ``async_playwright()``."""

    def __init__(self, pw: _FakePlaywright) -> None:
        self._pw = pw

    async def start(self) -> _FakePlaywright:
        return self._pw


@pytest.fixture
def fake_playwright(monkeypatch):
    pw = _FakePlaywright()
    monkeypatch.setattr(
        "playwright.async_api.async_playwright", lambda: _FakePlaywrightManager(pw)
    )
    return pw


def _settings(**overrides) -> Settings:
    base = dict(FIVERR_HEADLESS=True)
    base.update(overrides)
    return Settings(**base)


async def test_default_uses_throwaway_launch(fake_playwright, monkeypatch):
    """No user-data-dir → launch() + new_context(); persistent path untouched."""
    mgr = BrowserManager(_settings())
    # No session file present.
    monkeypatch.setattr(mgr._session_store, "load", lambda: None)

    await mgr.start()

    fake_playwright.chromium.launch.assert_awaited_once()
    fake_playwright.chromium.launch_persistent_context.assert_not_awaited()
    assert mgr._browser is fake_playwright.chromium.browser
    assert mgr._context is fake_playwright.chromium.throwaway_context


async def test_throwaway_applies_encrypted_session(fake_playwright, monkeypatch):
    """The saved storage_state is injected into the throwaway context."""
    mgr = BrowserManager(_settings())
    state = {"cookies": [{"name": "x"}], "origins": []}
    monkeypatch.setattr(mgr._session_store, "load", lambda: state)

    await mgr.start()

    _, kwargs = fake_playwright.chromium.browser.new_context.call_args
    assert kwargs.get("storage_state") == state


async def test_user_data_dir_uses_persistent_context(fake_playwright, tmp_path):
    """A configured user-data-dir switches to launch_persistent_context().

    Direct mode (copy disabled) drives the configured dir as-is.
    """
    user_data = tmp_path / "User Data"
    user_data.mkdir()
    mgr = BrowserManager(
        _settings(
            FIVERR_CHROME_USER_DATA_DIR=str(user_data),
            FIVERR_BROWSER_CHANNEL="chrome",
            FIVERR_CHROME_COPY_PROFILE=False,
        )
    )

    await mgr.start()

    fake_playwright.chromium.launch_persistent_context.assert_awaited_once()
    fake_playwright.chromium.launch.assert_not_awaited()
    args, kwargs = fake_playwright.chromium.launch_persistent_context.call_args
    assert args[0] == str(user_data)  # the root, unchanged, in direct mode
    assert kwargs["channel"] == "chrome"
    # Profile selected via --profile-directory (not by rewriting user-data-dir).
    assert "--profile-directory=Default" in kwargs["args"]
    # Persistent context owns its own browser — no separate Browser object.
    assert mgr._browser is None
    assert mgr._context is fake_playwright.chromium.persistent_context
    # It reuses the profile's default page rather than opening a new one.
    assert mgr._context.new_page.await_count == 0


async def test_clone_mode_drives_agent_owned_dir(fake_playwright, tmp_path):
    """The default (copy) mode launches against the agent-owned automation dir,
    NOT the user's live User Data root — so Playwright owns the singleton."""
    user_data = tmp_path / "User Data"
    (user_data / "Default").mkdir(parents=True)
    (user_data / "Default" / "Cookies").write_bytes(b"cookiedata")
    (user_data / "Local State").write_text("{}")
    mgr = BrowserManager(_settings(FIVERR_CHROME_USER_DATA_DIR=str(user_data)))

    await mgr.start()

    args, kwargs = fake_playwright.chromium.launch_persistent_context.call_args
    launched_dir = args[0]
    assert launched_dir == str(mgr._settings.automation_profile_dir)
    assert launched_dir != str(user_data)
    # The real profile was cloned in (cookies + Local State carried over).
    assert (mgr._settings.automation_profile_dir / "Default" / "Cookies").exists()
    assert (mgr._settings.automation_profile_dir / "Local State").exists()
    assert "--profile-directory=Default" in kwargs["args"]


async def test_profile_directory_flag_is_passed(fake_playwright, tmp_path):
    """A configured profile name is forwarded via --profile-directory and cloned."""
    user_data = tmp_path / "User Data"
    (user_data / "Profile 1").mkdir(parents=True)
    (user_data / "Profile 1" / "Cookies").write_bytes(b"c")
    mgr = BrowserManager(
        _settings(
            FIVERR_CHROME_USER_DATA_DIR=str(user_data),
            FIVERR_CHROME_PROFILE_DIRECTORY="Profile 1",
        )
    )

    await mgr.start()

    _, kwargs = fake_playwright.chromium.launch_persistent_context.call_args
    assert "--profile-directory=Profile 1" in kwargs["args"]
    assert (mgr._settings.automation_profile_dir / "Profile 1" / "Cookies").exists()


async def test_singleton_handoff_error_is_actionable(fake_playwright, tmp_path):
    """A TargetClosedError-style failure must surface as a clear, actionable
    NavigationError about the singleton handoff — not the raw exception."""
    from fiverr_agent_mcp.exceptions import NavigationError

    user_data = tmp_path / "User Data"
    (user_data / "Default").mkdir(parents=True)
    mgr = BrowserManager(
        _settings(FIVERR_CHROME_USER_DATA_DIR=str(user_data), FIVERR_CHROME_COPY_PROFILE=False)
    )
    fake_playwright.chromium.launch_persistent_context.side_effect = RuntimeError(
        "BrowserType.launch_persistent_context: Target page, context or browser has been closed"
    )

    with pytest.raises(NavigationError) as exc_info:
        await mgr.start()
    hint = (exc_info.value.hint or "").lower()
    assert "background" in hint and "chrome" in hint


async def test_persistent_does_not_inject_storage_state(fake_playwright, tmp_path, monkeypatch):
    """The encrypted session must NOT be passed to the persistent context —
    the profile dir is the source of truth for cookies/state."""
    profile = tmp_path / "chrome-profile"
    mgr = BrowserManager(_settings(FIVERR_CHROME_USER_DATA_DIR=str(profile)))
    # Even if a session file exists, it must not be forwarded as storage_state.
    monkeypatch.setattr(
        mgr._session_store, "load", lambda: {"cookies": [{"name": "x"}], "origins": []}
    )

    await mgr.start()

    _, kwargs = fake_playwright.chromium.launch_persistent_context.call_args
    assert "storage_state" not in kwargs


async def test_persistent_still_saves_session_on_close(fake_playwright, tmp_path, monkeypatch):
    """Closing a persistent context still writes the encrypted session file, so
    a one-time profile login also seeds session.enc for later headless runs."""
    profile = tmp_path / "chrome-profile"
    mgr = BrowserManager(_settings(FIVERR_CHROME_USER_DATA_DIR=str(profile)))
    saved = {}
    monkeypatch.setattr(mgr._session_store, "save", lambda state: saved.setdefault("state", state))

    await mgr.start()
    await mgr.close()

    assert "state" in saved  # storage_state was captured and persisted
    fake_playwright.chromium.persistent_context.close.assert_awaited()

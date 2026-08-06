"""Tests for retry/backoff and login-wall detection."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from fiverr_agent_mcp.browser import navigation as nav
from fiverr_agent_mcp.config import Settings
from fiverr_agent_mcp.exceptions import ActionFailedError, RateLimitedError, SessionExpiredError


def _settings(**kw) -> Settings:
    base = dict(FIVERR_MAX_RETRIES=2, FIVERR_RETRY_BACKOFF_S=0.0)
    base.update(kw)
    return Settings(**base)


async def test_retry_succeeds_after_transient_failures():
    calls = {"n": 0}

    async def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise ValueError("transient")
        return "done"

    result = await nav.retry_async(
        flaky, settings=_settings(), description="flaky", retryable=(ValueError,)
    )
    assert result == "done"
    assert calls["n"] == 3


async def test_retry_exhausts_and_raises():
    async def always_fail():
        raise ValueError("nope")

    with pytest.raises(ActionFailedError):
        await nav.retry_async(
            always_fail, settings=_settings(), description="fail", retryable=(ValueError,)
        )


async def test_detect_login_wall_by_url():
    page = SimpleNamespace(url="https://www.fiverr.com/login?next=/inbox")
    page.content = AsyncMock(return_value="<html></html>")
    with pytest.raises(SessionExpiredError):
        await nav.detect_login_wall(page)


async def test_detect_captcha():
    page = SimpleNamespace(url="https://www.fiverr.com/inbox")
    page.content = AsyncMock(return_value="<html>Please complete the captcha</html>")
    with pytest.raises(RateLimitedError):
        await nav.detect_login_wall(page)


async def test_detect_login_wall_passes_when_authenticated():
    page = SimpleNamespace(url="https://www.fiverr.com/inbox")
    page.content = AsyncMock(return_value="<html>inbox</html>")
    await nav.detect_login_wall(page)  # should not raise


# --- allow_login_page: intentional login must not be treated as expiry ----- #
async def test_login_page_allowed_during_intentional_login():
    """Reaching /login itself must not raise when allow_login_page=True."""
    page = SimpleNamespace(url="https://www.fiverr.com/login")
    page.content = AsyncMock(return_value="<html>sign in</html>")
    await nav.detect_login_wall(page, allow_login_page=True)  # should not raise


async def test_challenge_page_allowed_during_intentional_login():
    """A 2FA/checkpoint page reached mid-login must not raise either."""
    page = SimpleNamespace(url="https://www.fiverr.com/checkpoint/verify")
    page.content = AsyncMock(return_value="<html>verify it's you</html>")
    await nav.detect_login_wall(page, allow_login_page=True)  # should not raise


async def test_login_page_still_raises_when_not_expected():
    """Default (allow_login_page=False) must preserve the original behavior:
    an unexpected redirect to /login is a real session expiry."""
    page = SimpleNamespace(url="https://www.fiverr.com/login?next=/inbox")
    page.content = AsyncMock(return_value="<html></html>")
    with pytest.raises(SessionExpiredError):
        await nav.detect_login_wall(page, allow_login_page=False)


async def test_captcha_still_raises_during_intentional_login():
    """A genuine anti-bot challenge must still surface even mid-login — only the
    plain login/challenge URL check is suppressed by allow_login_page."""
    page = SimpleNamespace(url="https://www.fiverr.com/login")
    page.content = AsyncMock(return_value="<html>please complete the captcha</html>")
    with pytest.raises(RateLimitedError):
        await nav.detect_login_wall(page, allow_login_page=True)


async def test_goto_threads_allow_login_page(monkeypatch):
    """goto() must forward allow_login_page to detect_login_wall."""
    calls = {}

    async def fake_detect(page, *, allow_login_page=False):
        calls["allow_login_page"] = allow_login_page

    monkeypatch.setattr(nav, "detect_login_wall", fake_detect)

    page = SimpleNamespace(goto=AsyncMock())
    await nav.goto(page, "https://www.fiverr.com/login", settings=_settings(), allow_login_page=True)
    assert calls["allow_login_page"] is True

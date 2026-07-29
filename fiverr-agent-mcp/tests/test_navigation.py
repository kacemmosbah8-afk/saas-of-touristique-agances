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

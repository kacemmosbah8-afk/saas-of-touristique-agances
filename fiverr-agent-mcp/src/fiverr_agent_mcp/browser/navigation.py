"""Safe navigation and interaction primitives.

Wraps raw Playwright calls with:

* bounded retries and exponential backoff,
* explicit waits for elements/network idle,
* login-expiration detection,
* uniform translation of Playwright errors into typed
  :mod:`fiverr_agent_mcp.exceptions`.

Higher-level page objects (:class:`fiverr_agent_mcp.browser.client.FiverrClient`)
build on these helpers instead of touching Playwright directly, so retry and
error semantics stay consistent everywhere.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, TypeVar

from ..config import Settings
from ..exceptions import (
    ActionFailedError,
    ElementNotFoundError,
    NavigationError,
    RateLimitedError,
    SessionExpiredError,
)
from ..logging_config import get_logger

if TYPE_CHECKING:  # pragma: no cover - typing only
    from playwright.async_api import Locator, Page

logger = get_logger("browser.navigation")

T = TypeVar("T")

# Substrings that, when present in the URL or page, indicate we've been bounced
# to a login/challenge wall (i.e. the session expired).
_LOGIN_URL_MARKERS = ("/login", "/join", "/checkpoint", "/challenge")
_LOGIN_TEXT_MARKERS = ("Sign in", "Log in to continue", "Continue with email")


# --------------------------------------------------------------------------- #
# Retry observability
#
# The validation harness needs to know how many retries a navigation/action
# incurred. A context-local counter lets it observe retries without changing any
# call signatures: wrap a block in ``with count_retries() as c:`` and read
# ``c.count`` afterwards. In normal operation the observer is unset and this adds
# nothing.
# --------------------------------------------------------------------------- #
import contextlib  # noqa: E402
import contextvars  # noqa: E402


class _RetryCounter:
    __slots__ = ("count",)

    def __init__(self) -> None:
        self.count = 0


_retry_observer: contextvars.ContextVar[_RetryCounter | None] = contextvars.ContextVar(
    "fiverr_retry_observer", default=None
)


@contextlib.contextmanager
def count_retries():
    """Context manager yielding a counter of retries incurred within the block."""
    counter = _RetryCounter()
    token = _retry_observer.set(counter)
    try:
        yield counter
    finally:
        _retry_observer.reset(token)


def _note_retry() -> None:
    counter = _retry_observer.get()
    if counter is not None:
        counter.count += 1


def _playwright_errors() -> tuple[type[Exception], ...]:
    """Return Playwright error classes, or a safe fallback when not installed."""
    try:
        from playwright.async_api import Error as PWError
        from playwright.async_api import TimeoutError as PWTimeout

        return (PWTimeout, PWError)
    except Exception:  # pragma: no cover - playwright always present in prod
        return (Exception,)


async def retry_async(
    operation: Callable[[], Awaitable[T]],
    *,
    settings: Settings,
    description: str,
    retryable: tuple[type[Exception], ...] | None = None,
) -> T:
    """Run ``operation`` with exponential backoff.

    Args:
        operation: Zero-arg coroutine factory to execute.
        settings: Provides ``max_retries`` and ``retry_backoff_base_s``.
        description: Human label used in logs/errors.
        retryable: Exception types that should trigger a retry. Defaults to
            Playwright's error classes.

    Returns:
        Whatever ``operation`` returns on success.

    Raises:
        ActionFailedError: When all attempts are exhausted.
    """
    retryable = retryable or _playwright_errors()
    attempts = settings.max_retries + 1
    last_exc: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            return await operation()
        except retryable as exc:  # type: ignore[misc]
            last_exc = exc
            if attempt >= attempts:
                break
            _note_retry()
            delay = settings.retry_backoff_base_s * (2 ** (attempt - 1))
            logger.warning(
                "Attempt %d/%d for '%s' failed (%s); retrying in %.1fs",
                attempt,
                attempts,
                description,
                type(exc).__name__,
                delay,
            )
            await asyncio.sleep(delay)

    raise ActionFailedError(
        f"'{description}' failed after {attempts} attempt(s): "
        f"{type(last_exc).__name__ if last_exc else 'unknown error'}",
        hint="The page structure may have changed or the network is unstable.",
    )


async def goto(page: Page, url: str, *, settings: Settings) -> None:
    """Navigate to ``url`` with retries and a load-state wait.

    Raises:
        NavigationError: If navigation ultimately fails.
        SessionExpiredError: If the destination is a login/challenge wall.
    """

    async def _do() -> None:
        await page.goto(
            url,
            timeout=settings.navigation_timeout_ms,
            wait_until="domcontentloaded",
        )

    try:
        await retry_async(_do, settings=settings, description=f"navigate to {url}")
    except ActionFailedError as exc:
        raise NavigationError(str(exc), hint="Check connectivity and the URL.") from exc

    await detect_login_wall(page)


async def detect_login_wall(page: Page) -> None:
    """Raise :class:`SessionExpiredError` if the page is a login/challenge wall.

    Detection combines URL markers with visible sign-in text so a redirect to
    ``/login`` or an inline auth modal are both caught.
    """
    try:
        url = page.url or ""
    except Exception:  # pragma: no cover
        url = ""

    if any(marker in url for marker in _LOGIN_URL_MARKERS):
        raise SessionExpiredError(
            "Redirected to a Fiverr login/challenge page; the session has expired.",
            hint="Call the 'login' tool or 'restore_session' to re-authenticate.",
        )

    try:
        content = await page.content()
    except Exception:  # pragma: no cover
        return
    lowered = content.lower()
    if "captcha" in lowered or "unusual traffic" in lowered:
        raise RateLimitedError(
            "Fiverr presented a captcha / anti-bot challenge.",
            hint="Slow down, reduce concurrency, or complete the challenge manually.",
        )


async def wait_for(
    page: Page,
    selector: str,
    *,
    settings: Settings,
    state: str = "visible",
    timeout_ms: int | None = None,
) -> Locator:
    """Wait for a selector and return its :class:`Locator`.

    Raises:
        ElementNotFoundError: If the element never reaches ``state`` in time.
    """
    timeout = timeout_ms or settings.default_timeout_ms
    locator = page.locator(selector).first
    try:
        await locator.wait_for(state=state, timeout=timeout)
    except _playwright_errors() as exc:  # type: ignore[misc]
        raise ElementNotFoundError(
            f"Element '{selector}' not found (state={state}) within {timeout}ms.",
            hint="The Fiverr page layout may have changed; update the selector.",
        ) from exc
    return locator


async def safe_click(
    page: Page,
    selector: str,
    *,
    settings: Settings,
    timeout_ms: int | None = None,
    allow_retry: bool = True,
) -> None:
    """Click an element identified by ``selector``.

    Set ``allow_retry=False`` for **destructive** submits (deliver, cancel,
    delete, offer send): the element is still waited for, but the click itself is
    attempted exactly once so a mutation is never silently repeated. This is the
    retry-policy rule — retry only safe operations, never destructive ones.
    """
    locator = await wait_for(page, selector, settings=settings, timeout_ms=timeout_ms)
    click_timeout = timeout_ms or settings.default_timeout_ms

    if not allow_retry:
        await locator.click(timeout=click_timeout)
        return

    async def _do() -> None:
        await locator.click(timeout=click_timeout)

    await retry_async(_do, settings=settings, description=f"click {selector}")


async def safe_fill(
    page: Page,
    selector: str,
    value: str,
    *,
    settings: Settings,
    timeout_ms: int | None = None,
) -> None:
    """Fill a text field identified by ``selector``."""
    locator = await wait_for(page, selector, settings=settings, timeout_ms=timeout_ms)

    async def _do() -> None:
        await locator.fill(value, timeout=timeout_ms or settings.default_timeout_ms)

    await retry_async(_do, settings=settings, description=f"fill {selector}")


async def safe_text(
    page: Page,
    selector: str,
    *,
    settings: Settings,
    default: str = "",
) -> str:
    """Return trimmed text content of the first match, or ``default`` if absent."""
    try:
        locator = page.locator(selector).first
        if await locator.count() == 0:
            return default
        text = await locator.inner_text(timeout=settings.default_timeout_ms)
        return text.strip()
    except _playwright_errors():  # type: ignore[misc]
        return default


async def first_present(
    page: Page,
    selectors: list[str],
    *,
    settings: Settings,
    state: str = "visible",
    timeout_ms: int | None = None,
) -> Locator | None:
    """Return the first selector from ``selectors`` that becomes present.

    Enables resilient, fallback-based location: pass role/testid/text variants
    and take whichever the current Fiverr layout exposes. Returns ``None`` when
    none appear within the timeout.
    """
    timeout = timeout_ms or settings.default_timeout_ms
    per = max(500, timeout // max(1, len(selectors)))
    for selector in selectors:
        locator = page.locator(selector).first
        try:
            await locator.wait_for(state=state, timeout=per)
            return locator
        except _playwright_errors():  # type: ignore[misc]
            continue
    return None

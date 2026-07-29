"""Playwright lifecycle management.

:class:`BrowserManager` owns a single Playwright instance, browser, and browser
context for the process. It restores a persisted session on startup and exposes
a shared :class:`~fiverr_agent_mcp.browser.client.FiverrClient`.

The module-level :func:`get_client` accessor gives the tool layer a lazily
started, reused client so every tool call reuses the same authenticated context
(important for both performance and staying logged in).
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from ..config import Settings, get_settings
from ..exceptions import ConfigurationError, NavigationError
from ..logging_config import get_logger
from .client import FiverrClient
from .session import SessionStore

if TYPE_CHECKING:  # pragma: no cover - typing only
    from playwright.async_api import Browser, BrowserContext, Page, Playwright

logger = get_logger("browser.manager")


class BrowserManager:
    """Manage the Playwright browser, context, and persisted session.

    Args:
        settings: Configuration. Defaults to the process settings.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._session_store = SessionStore(self._settings)
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._client: FiverrClient | None = None
        self._lock = asyncio.Lock()

    # -- lifecycle -------------------------------------------------------- #
    async def start(self) -> None:
        """Launch the browser and open a context, restoring session if present.

        Idempotent: safe to call repeatedly; only the first call does work.
        """
        async with self._lock:
            if self._context is not None:
                return

            try:
                from playwright.async_api import async_playwright
            except ImportError as exc:  # pragma: no cover
                raise ConfigurationError(
                    "Playwright is not installed.",
                    hint="pip install playwright && playwright install chromium",
                ) from exc

            logger.info(
                "Starting browser (headless=%s, locale=%s)",
                self._settings.headless,
                self._settings.locale,
            )
            self._playwright = await async_playwright().start()
            try:
                self._browser = await self._playwright.chromium.launch(
                    headless=self._settings.headless,
                    slow_mo=self._settings.slow_mo_ms or None,
                )
            except Exception as exc:  # pragma: no cover - environment dependent
                await self._teardown()
                raise NavigationError(
                    f"Failed to launch Chromium: {exc}",
                    hint="Run 'playwright install chromium' to install the browser.",
                ) from exc

            context_kwargs: dict[str, Any] = {"locale": self._settings.locale}
            if self._settings.user_agent:
                context_kwargs["user_agent"] = self._settings.user_agent

            storage_state = self._session_store.load()
            if storage_state is not None:
                context_kwargs["storage_state"] = storage_state
                logger.info("Applied persisted session to new browser context.")

            self._context = await self._browser.new_context(**context_kwargs)
            self._context.set_default_timeout(self._settings.default_timeout_ms)
            self._context.set_default_navigation_timeout(self._settings.navigation_timeout_ms)
            self._page = await self._context.new_page()
            self._client = FiverrClient(
                page=self._page,
                context=self._context,
                settings=self._settings,
                session_store=self._session_store,
            )

    async def client(self) -> FiverrClient:
        """Return the shared client, starting the browser on first use."""
        if self._client is None:
            await self.start()
        assert self._client is not None  # for type-checkers
        return self._client

    async def close(self) -> None:
        """Persist the current session (best effort) and tear down the browser."""
        async with self._lock:
            if self._context is not None:
                try:
                    state = await self._context.storage_state()
                    self._session_store.save(state)
                except Exception as exc:  # pragma: no cover
                    logger.warning("Could not persist session on close: %s", exc)
            await self._teardown()

    async def _teardown(self) -> None:
        for closer, obj in (
            ("context", self._context),
            ("browser", self._browser),
        ):
            if obj is not None:
                try:
                    await obj.close()
                except Exception as exc:  # pragma: no cover
                    logger.debug("Error closing %s: %s", closer, exc)
        if self._playwright is not None:
            try:
                await self._playwright.stop()
            except Exception as exc:  # pragma: no cover
                logger.debug("Error stopping playwright: %s", exc)
        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None
        self._client = None


# --------------------------------------------------------------------------- #
# Process-wide singleton accessors used by the tool layer.
# --------------------------------------------------------------------------- #
_manager: BrowserManager | None = None
_manager_lock = asyncio.Lock()


async def get_client() -> FiverrClient:
    """Return the process-wide :class:`FiverrClient`, creating it if needed.

    This is the single entry point every tool uses to reach the browser. The
    underlying :class:`BrowserManager` lives for the lifetime of the server so
    the authenticated context is reused across tool calls.
    """
    global _manager
    async with _manager_lock:
        if _manager is None:
            _manager = BrowserManager()
    return await _manager.client()


async def shutdown_client() -> None:
    """Close the process-wide manager (used on shutdown and in tests)."""
    global _manager
    async with _manager_lock:
        if _manager is not None:
            await _manager.close()
            _manager = None


def _set_manager_for_tests(manager: BrowserManager | None) -> None:
    """Inject a manager (or ``None``) — test-only hook."""
    global _manager
    _manager = manager

"""High-level Fiverr operations (page-object layer).

:class:`FiverrClient` translates domain operations ("list my orders", "send an
offer") into Playwright interactions using the resilient helpers in
:mod:`.navigation` and the fallback locators in :mod:`.selectors`. Tools call
these methods and never touch Playwright directly.

Design notes
------------
* Every marketplace-mutating method (sending messages/offers, delivering,
  editing gigs, ...) routes through :meth:`_guard_mutation`, which honours
  ``FIVERR_DRY_RUN`` by refusing to act and raising :class:`DryRunBlocked` with a
  preview payload the tool layer surfaces to the caller. Authentication
  (:meth:`login`) is deliberately exempt — it is a prerequisite, not a write.
* Read methods degrade gracefully: a missing optional field yields ``None``
  rather than an exception, because Fiverr frequently omits fields.
* All navigation goes through :meth:`_open`, which re-checks the login wall so a
  silently expired session surfaces as :class:`SessionExpiredError`.
"""

from __future__ import annotations

import asyncio
import json
import sys
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any, TypeVar
from urllib.parse import urljoin

from ..config import Settings
from ..exceptions import (
    AuthenticationError,
    ConfigurationError,
    DryRunBlocked,
    NotFoundError,
    RateLimitedError,
    SessionExpiredError,
)
from ..logging_config import get_logger
from ..models import (
    AnalyticsSnapshot,
    ChatMessage,
    Conversation,
    GigDetail,
    GigStatus,
    GigSummary,
    Lead,
    LoginStatus,
    MessagePreview,
    Notification,
    OrderDetail,
    OrderStatus,
    OrderSummary,
)
from . import navigation as nav
from . import selectors as sel

if TYPE_CHECKING:  # pragma: no cover
    from playwright.async_api import BrowserContext, Locator, Page

    from .session import SessionStore

logger = get_logger("browser.client")

T = TypeVar("T")

# Login page states the diagnostics can distinguish.
LOGIN_STATE_FORM = "login_form"  # the email/password form is present
LOGIN_STATE_LOGGED_IN = "already_logged_in"  # authenticated; no form needed
LOGIN_STATE_CHALLENGE = "challenge"  # CAPTCHA / "It needs a human touch"
LOGIN_STATE_SIGN_IN_TRIGGER = "sign_in_trigger"  # form closed, but a Sign-in button is present
LOGIN_STATE_REDIRECTED = "redirected"  # Fiverr sent us somewhere unexpected
LOGIN_STATE_UNKNOWN_DOM = "unknown_dom"  # on /login but the DOM has changed


@dataclass
class _PageDiagnosis:
    """A snapshot classification of whatever page the browser is actually on.

    Produced by :meth:`FiverrClient._classify_page` when an expected element
    (e.g. the login email field) is missing, so the failure carries evidence
    instead of a blind "not found".
    """

    url: str
    title: str
    state: str
    logged_in: bool
    challenge: bool
    has_login_form: bool
    reason: str
    sign_in_trigger: bool = False
    email_selectors: dict[str, bool] = field(default_factory=dict)
    screenshot: str = ""
    html: str = ""
    metadata: str = ""

    @property
    def summary(self) -> str:
        return f"Browser is on '{self.url}' (title={self.title!r}); detected state: {self.state}."


def _to_int(text: str | None) -> int | None:
    """Parse the first integer out of a noisy metric string (e.g. '1,234 clicks')."""
    if not text:
        return None
    digits = "".join(ch for ch in text if ch.isdigit())
    return int(digits) if digits else None


class FiverrClient:
    """Authenticated Fiverr operations over a single Playwright page.

    Args:
        page: The active Playwright page.
        context: Its browser context (used for session export).
        settings: Runtime configuration.
        session_store: Persistence backend for the login session.
    """

    def __init__(
        self,
        page: Page,
        context: BrowserContext,
        settings: Settings,
        session_store: SessionStore,
    ) -> None:
        self._page = page
        self._context = context
        self._settings = settings
        self._session = session_store
        self._username: str | None = None

    # ------------------------------------------------------------------ #
    # Public accessors (used by the live-validation harness)
    # ------------------------------------------------------------------ #
    @property
    def page(self) -> Page:
        """The underlying Playwright page (read-only accessor)."""
        return self._page

    @property
    def settings(self) -> Settings:
        """The active settings (read-only accessor)."""
        return self._settings

    def absolute_url(self, path: str, **kwargs: Any) -> str:
        """Public wrapper around URL building for a Fiverr path template."""
        return self._url(path, **kwargs)

    async def goto_path(self, path: str, **kwargs: Any) -> None:
        """Public, login-wall-aware navigation to a Fiverr path template."""
        await self._open(path, **kwargs)

    async def current_username(self) -> str:
        """Return the logged-in username (discovering it if needed)."""
        return await self._require_username()

    # ------------------------------------------------------------------ #
    # Low-level helpers
    # ------------------------------------------------------------------ #
    def _url(self, path: str, **kwargs: Any) -> str:
        """Build an absolute Fiverr URL from a path template."""
        if kwargs:
            path = path.format(**kwargs)
        return urljoin(self._settings.base_url.rstrip("/") + "/", path.lstrip("/"))

    async def _open(
        self, path: str, *, allow_login_page: bool = False, **kwargs: Any
    ) -> None:
        """Navigate to ``path`` (login-wall aware).

        Args:
            path: URL path template (formatted with ``kwargs``).
            allow_login_page: Set True only when landing on Fiverr's login/
                challenge page is an expected part of an intentional login flow
                (see :func:`fiverr_agent_mcp.browser.navigation.detect_login_wall`).
            **kwargs: Values to format into ``path``.
        """
        await nav.goto(
            self._page,
            self._url(path, **kwargs),
            settings=self._settings,
            allow_login_page=allow_login_page,
        )

    def _guard_mutation(self, action: str, **details: Any) -> None:
        """Raise :class:`DryRunBlocked` when ``FIVERR_DRY_RUN`` is enabled."""
        if self._settings.dry_run:
            logger.info("[dry-run] Skipping mutation: %s %s", action, details)
            raise DryRunBlocked(
                f"Dry-run enabled: '{action}' was not executed.",
                hint="Unset FIVERR_DRY_RUN to perform this action for real.",
            )

    async def _rows(self, selector_variants: list[str]) -> list[Locator]:
        """Return all row locators matching the first variant that yields any."""
        for selector in selector_variants:
            locator = self._page.locator(selector)
            try:
                count = await locator.count()
            except Exception:  # pragma: no cover
                count = 0
            if count:
                return [locator.nth(i) for i in range(count)]
        return []

    @staticmethod
    async def _scoped_text(row: Locator, variants: list[str], default: str = "") -> str:
        """Return trimmed text of the first matching descendant, else ``default``."""
        for selector in variants:
            loc = row.locator(selector).first
            try:
                if await loc.count():
                    return (await loc.inner_text()).strip()
            except Exception:  # pragma: no cover
                continue
        return default

    @staticmethod
    async def _row_present(row: Locator, variants: list[str]) -> bool:
        for selector in variants:
            try:
                if await row.locator(selector).first.count():
                    return True
            except Exception:  # pragma: no cover
                continue
        return False

    # ================================================================== #
    # Account / session
    # ================================================================== #
    async def verify_logged_in(self, *, allow_login_page: bool = False) -> LoginStatus:
        """Check whether the current context has an authenticated session.

        Args:
            allow_login_page: Set True when this check runs as part of an
                intentional login attempt (e.g. immediately after submitting
                credentials, when a 2FA/challenge page may still be showing).
                In that case landing on the login/challenge page is reported as
                ``logged_in=False`` instead of raising
                :class:`~fiverr_agent_mcp.exceptions.SessionExpiredError`.
        """
        await self._open(sel.PATH_HOME, allow_login_page=allow_login_page)
        marker = await nav.first_present(
            self._page, sel.LOGGED_IN_MARKERS, settings=self._settings, timeout_ms=5_000
        )
        if marker is None:
            return LoginStatus(logged_in=False, method="none", detail="No session marker found.")
        username = await nav.safe_text(
            self._page, ", ".join(sel.USERNAME_DISPLAY), settings=self._settings
        )
        self._username = username or self._username
        return LoginStatus(
            logged_in=True,
            username=self._username or None,
            method="restored",
            detail="Authenticated session detected.",
        )

    async def restore_session(self) -> LoginStatus:
        """Verify the persisted session works; report status without credentials."""
        if not self._session.exists():
            return LoginStatus(
                logged_in=False, method="none", detail="No persisted session file found."
            )
        return await self.verify_logged_in()

    async def _pause_for_manual_challenge(self, exc: RateLimitedError) -> None:
        """Block, browser left open, for a human to clear a captcha/anti-bot wall.

        Called only from an intentional login (see :meth:`_run_tolerating_captcha`).
        Never closes the browser or context — it just waits. Resumes the moment a
        human presses Enter in the terminal (the caller then retries the step, so
        if the challenge is in fact not yet cleared it will pause again).

        When stdin is not an interactive TTY (e.g. this process is an MCP server
        driven over stdio, or a script's stdin was consumed by a heredoc) there is
        no human to prompt and no safe way to block a protocol pipe on ``input()``,
        so this re-raises ``exc`` immediately — identical to the pre-existing
        behavior, and still lets the ``@safeguard`` layer trip the emergency stop
        as designed.

        Args:
            exc: The captured :class:`RateLimitedError` (its message is shown).

        Raises:
            RateLimitedError: ``exc`` itself, if stdin is not a TTY or the human
                explicitly types ``abort``.
        """
        if not sys.stdin.isatty():
            raise exc
        logger.warning(
            "CAPTCHA/anti-bot challenge detected at %s: %s "
            "The browser window is left open — solve it manually.",
            self._page.url,
            exc.message,
        )
        answer = await asyncio.to_thread(
            input,
            "Press Enter after solving the challenge to continue (or type 'abort' to give up): ",
        )
        if answer.strip().lower() == "abort":
            raise exc

    async def _run_tolerating_captcha(self, step: Callable[[], Awaitable[T]]) -> T:
        """Run one intentional-login step, pausing (not aborting) on a captcha.

        On :class:`RateLimitedError` the browser stays open and
        :meth:`_pause_for_manual_challenge` blocks for manual resolution; ``step``
        is then retried. This repeats until it succeeds or the pause raises
        (no TTY, or explicit abort), at which point the exception propagates.
        """
        while True:
            try:
                return await step()
            except RateLimitedError as exc:
                await self._pause_for_manual_challenge(exc)

    async def _classify_page(self, reason: str) -> tuple[_PageDiagnosis, str]:
        """Inspect the *actual* current page and classify it (no file I/O).

        Determines the URL/title, whether we are already logged in, whether an
        anti-bot/CAPTCHA challenge is showing, whether the login form is present,
        and whether a logged-out "Sign in" trigger is present (so we can open the
        form). Returns the diagnosis and the page HTML (so a caller can persist it
        without re-fetching). Cheap enough to run on every attempt.
        """
        try:
            url = self._page.url or "<unknown>"
        except Exception:  # pragma: no cover
            url = "<unknown>"
        title = ""
        try:
            title = await self._page.title()
        except Exception:  # pragma: no cover
            pass

        content = ""
        try:
            content = await self._page.content()
        except Exception:  # pragma: no cover
            content = ""
        challenge = nav.content_has_challenge(content) if content else False

        # Probe each email selector individually so the metadata records exactly
        # which variants were tried and whether any matched (DOM-change evidence).
        email_selectors: dict[str, bool] = {}
        for selector in sel.EMAIL_INPUT:
            found = await nav.first_present(
                self._page, [selector], settings=self._settings, timeout_ms=800
            )
            email_selectors[selector] = found is not None
        has_login_form = any(email_selectors.values())

        logged_in = (
            await nav.first_present(
                self._page, sel.LOGGED_IN_MARKERS, settings=self._settings, timeout_ms=1_500
            )
            is not None
        )
        sign_in_trigger = (
            not has_login_form
            and not logged_in
            and await nav.first_present(
                self._page, sel.SIGN_IN_TRIGGER, settings=self._settings, timeout_ms=1_500
            )
            is not None
        )

        if challenge:
            state = LOGIN_STATE_CHALLENGE
        elif logged_in:
            state = LOGIN_STATE_LOGGED_IN
        elif has_login_form:
            state = LOGIN_STATE_FORM
        elif sign_in_trigger:
            # A logged-out page (often the homepage Fiverr redirected /login to)
            # that shows a "Sign in" button — the form opens once it's clicked.
            state = LOGIN_STATE_SIGN_IN_TRIGGER
        elif not any(m in url for m in nav._LOGIN_URL_MARKERS):
            state = LOGIN_STATE_REDIRECTED
        else:
            state = LOGIN_STATE_UNKNOWN_DOM

        diag = _PageDiagnosis(
            url=url, title=title, state=state, logged_in=logged_in,
            challenge=challenge, has_login_form=has_login_form,
            sign_in_trigger=sign_in_trigger, reason=reason,
            email_selectors=email_selectors,
        )
        return diag, content

    async def _persist_diagnostics(self, diag: _PageDiagnosis, content: str) -> None:
        """Write screenshot / HTML / metadata for a diagnosis (best-effort)."""
        try:
            out_dir = self._settings.state_dir / "diagnostics"
            out_dir.mkdir(parents=True, exist_ok=True)
        except Exception as exc:  # pragma: no cover
            logger.debug("Could not create diagnostics dir: %s", exc)
            return
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        base = out_dir / f"{stamp}_{diag.reason}"

        try:
            shot = base.with_suffix(".png")
            await self._page.screenshot(path=str(shot), full_page=True)
            diag.screenshot = str(shot)
        except Exception as exc:  # pragma: no cover
            logger.debug("Diagnostics screenshot failed: %s", exc)
        if content:
            try:
                html = base.with_suffix(".html")
                html.write_text(content, encoding="utf-8")
                diag.html = str(html)
            except Exception as exc:  # pragma: no cover
                logger.debug("Diagnostics HTML dump failed: %s", exc)
        try:
            meta = base.with_suffix(".json")
            meta.write_text(
                json.dumps(
                    {
                        "reason": diag.reason,
                        "url": diag.url,
                        "title": diag.title,
                        "state": diag.state,
                        "logged_in": diag.logged_in,
                        "challenge": diag.challenge,
                        "has_login_form": diag.has_login_form,
                        "sign_in_trigger": diag.sign_in_trigger,
                        "email_selectors_tried": diag.email_selectors,
                        "timestamp": stamp,
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
            diag.metadata = str(meta)
        except Exception as exc:  # pragma: no cover
            logger.debug("Diagnostics metadata dump failed: %s", exc)

    async def _open_login_ui(self) -> str | None:
        """Click the logged-out "Sign in" trigger to reveal the credential form.

        Fiverr commonly redirects ``/login`` to the homepage, where the form is
        not present until a "Sign in" control is clicked — it then opens either a
        modal or a dedicated page. This clicks the first matching trigger and
        waits (up to the navigation timeout) for the email field to appear,
        tolerating both the modal and separate-page variants. Returns the matched
        trigger selector, or ``None`` if no trigger could be clicked.
        """
        trigger, selector = await self._first_with_selector(
            sel.SIGN_IN_TRIGGER, timeout_ms=4_000
        )
        if trigger is None:
            return None
        logger.info("Login: form not open; clicking Sign-in trigger '%s' to open it.", selector)
        try:
            await trigger.click()
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Login: clicking Sign-in trigger '%s' failed: %s", selector, exc)
            return selector
        # Wait for the login UI (modal or navigated page) to expose the email
        # field, rather than assuming it is instantly present.
        await nav.first_present(
            self._page,
            sel.EMAIL_INPUT,
            settings=self._settings,
            timeout_ms=self._settings.navigation_timeout_ms,
        )
        return selector

    async def _find_login_email(self) -> Locator | None:
        """Locate the login email field, adapting to the page actually shown.

        Does NOT assume ``/login`` shows the form. It classifies the current page
        first — logging the URL and detected page type *before* looking for the
        field — then acts on that type:

        * ``login_form`` → return the email :class:`Locator`.
        * ``already_logged_in`` → return ``None`` (caller finishes as success).
        * ``sign_in_trigger`` → click the "Sign in" button to open the form
          (modal or page), wait for it, then re-classify.
        * ``challenge`` → pause for manual resolution (browser left open) and
          re-probe.
        * ``redirected`` / ``unknown_dom`` → raise :class:`AuthenticationError`
          with saved diagnostics (screenshot, HTML, metadata).
        """
        trigger_attempts = 0
        max_trigger_attempts = 2
        # Bounded so a page that never resolves to a form can't loop forever.
        for _ in range(8):
            diag, content = await self._classify_page("login_locate_email")
            logger.info(
                "Login: detected page type=%s at %s (title=%r, has_form=%s, "
                "sign_in_trigger=%s) before locating the email field.",
                diag.state, diag.url, diag.title, diag.has_login_form, diag.sign_in_trigger,
            )

            if diag.state == LOGIN_STATE_FORM:
                email = await nav.first_present(
                    self._page, sel.EMAIL_INPUT, settings=self._settings
                )
                if email is not None:
                    return email
                continue  # rare race: re-classify

            if diag.state == LOGIN_STATE_LOGGED_IN:
                logger.info("Login: already authenticated — no credential form needed.")
                return None

            if diag.state == LOGIN_STATE_CHALLENGE:
                await self._persist_diagnostics(diag, content)
                await self._pause_for_manual_challenge(
                    RateLimitedError(
                        f"Fiverr is showing a verification/anti-bot page at {diag.url}.",
                        hint="Solve it in the open browser window, then press Enter.",
                    )
                )
                continue

            if diag.state == LOGIN_STATE_SIGN_IN_TRIGGER and trigger_attempts < max_trigger_attempts:
                trigger_attempts += 1
                if await self._open_login_ui() is not None:
                    continue  # re-classify: the form should now be open
                # No trigger was actually clickable — fall through to diagnose.

            # redirected / unknown_dom / trigger exhausted: persist and explain.
            await self._persist_diagnostics(diag, content)
            where = (
                f"Saved diagnostics — screenshot: {diag.screenshot or 'n/a'}; "
                f"HTML: {diag.html or 'n/a'}; metadata: {diag.metadata or 'n/a'}."
            )
            if diag.state == LOGIN_STATE_SIGN_IN_TRIGGER:
                raise AuthenticationError(
                    f"Found the 'Sign in' button on '{diag.url}' but the login form never "
                    f"opened after clicking it. {where}",
                    hint="Fiverr's login UI may have changed. Inspect the saved screenshot/HTML "
                    "and update SIGN_IN_TRIGGER / EMAIL_INPUT in browser/selectors.py. " + where,
                )
            if diag.state == LOGIN_STATE_REDIRECTED:
                raise AuthenticationError(
                    f"Expected the login page but the browser is on '{diag.url}'. {where}",
                    hint="Fiverr redirected the login flow. Open that URL manually to see why "
                    "(account hold, region block, or an interstitial). " + where,
                )
            # LOGIN_STATE_UNKNOWN_DOM
            raise AuthenticationError(
                f"On the login page but no known email field matched. {diag.summary} {where}",
                hint="The login DOM may have changed. Inspect the saved HTML/screenshot and "
                "update EMAIL_INPUT in browser/selectors.py to the current field. " + where,
            )

        # Loop budget exhausted without ever reaching a usable form.
        diag, content = await self._classify_page("login_locate_email_exhausted")
        await self._persist_diagnostics(diag, content)
        raise AuthenticationError(
            f"Could not reach the login form after several attempts; last state was "
            f"'{diag.state}' at '{diag.url}'. Saved diagnostics: {diag.metadata or 'n/a'}.",
            hint="Inspect the saved screenshot/HTML and update SIGN_IN_TRIGGER / EMAIL_INPUT "
            "in browser/selectors.py.",
        )

    async def login(self) -> LoginStatus:
        """Authenticate using ``FIVERR_EMAIL`` / ``FIVERR_PASSWORD``.

        Tries the restored session first; only submits credentials if needed. A
        stale/invalid persisted session (one that redirects to Fiverr's login
        page when we merely probe it) is treated as "not logged in" here and
        falls through to the credential flow, rather than surfacing as a
        :class:`~fiverr_agent_mcp.exceptions.SessionExpiredError` — that
        exception is reserved for an *already-authenticated* session getting
        unexpectedly bounced to login mid-operation (see
        :func:`fiverr_agent_mcp.browser.navigation.detect_login_wall`).

        A Cloudflare/hCaptcha/anti-bot challenge encountered at any point during
        this intentional login (initial session probe, opening the login page,
        or the post-submit check) never closes the browser: it pauses for manual
        resolution (see :meth:`_pause_for_manual_challenge`) and then retries that
        step, so the flow completes normally once a human clears the challenge.

        Dry-run does **not** apply here: login is authentication, not a Fiverr
        marketplace write, so it runs regardless of ``FIVERR_DRY_RUN`` (which is
        what lets ``fiverr-agent-mcp-login`` create the first real session).

        Raises:
            ConfigurationError: If credentials are not configured.
            AuthenticationError: If the credential login fails.
            RateLimitedError: If a challenge could not be resolved (no TTY to
                prompt on, or the human explicitly aborted).
        """
        try:
            status = await self._run_tolerating_captcha(self.verify_logged_in)
        except SessionExpiredError:
            status = LoginStatus(
                logged_in=False, method="none", detail="Persisted session invalid or expired."
            )
        if status.logged_in:
            await self.save_session()
            return status

        if not self._settings.has_credentials():
            raise ConfigurationError(
                "No persisted session and no credentials configured.",
                hint="Set FIVERR_EMAIL and FIVERR_PASSWORD, or restore a saved session.",
            )

        # NOTE: login is intentionally NOT gated by dry-run. Authenticating is a
        # prerequisite for everything — including the read-only tools that are
        # meant to work in dry-run — not a marketplace mutation. FIVERR_DRY_RUN
        # blocks *sends/writes to Fiverr* (messages, offers, deliveries, gigs),
        # never authentication. This matches the safety layer, which already
        # excludes login/restore_session from its write/high-risk sets so the
        # agent can always (re)authenticate (see safety/policy.py).
        logger.info("Logging in as %s via credentials", self._settings.masked_email())
        # Navigating to the login page is the intentional first step of a
        # credential login, not a session expiry — allow it explicitly.
        await self._run_tolerating_captcha(
            lambda: self._open(sel.PATH_LOGIN, allow_login_page=True)
        )

        # Do NOT assume the login form is showing. Inspect what page we actually
        # landed on and adapt: already logged in, a challenge to solve, a
        # redirect, or a changed DOM — each with saved diagnostics.
        email = await self._find_login_email()
        if email is None:
            # _find_login_email detected we are already authenticated.
            status = await self.verify_logged_in(allow_login_page=True)
            if status.logged_in:
                status.method = "credentials"
                await self.save_session()
                return status
            raise AuthenticationError(
                "Login page showed logged-in markers but the session did not verify.",
                hint="Re-run 'login'; if it persists, clear the session and try headful.",
            )
        await email.fill(self._settings.email or "")

        # Some flows require clicking 'Continue with email' before the password.
        cont = await nav.first_present(
            self._page, sel.CONTINUE_BUTTON, settings=self._settings, timeout_ms=3_000
        )
        if cont is not None:
            await cont.click()

        pwd = await nav.first_present(self._page, sel.PASSWORD_INPUT, settings=self._settings)
        if pwd is None:
            raise AuthenticationError("Could not find the password field on the login page.")
        assert self._settings.password is not None
        await pwd.fill(self._settings.password.get_secret_value())

        submit = await nav.first_present(self._page, sel.LOGIN_SUBMIT, settings=self._settings)
        if submit is None:
            raise AuthenticationError("Could not find the sign-in button.")
        await submit.click()

        try:
            await self._page.wait_for_load_state("networkidle", timeout=self._settings.navigation_timeout_ms)
        except Exception:  # pragma: no cover
            pass

        # Immediately after submitting, the browser may still be sitting on a
        # 2FA/challenge page (not yet resolved) — that is expected here too, not
        # a session expiry. A genuine CAPTCHA/anti-bot page pauses for manual
        # resolution instead of raising (see _run_tolerating_captcha).
        status = await self._run_tolerating_captcha(
            lambda: self.verify_logged_in(allow_login_page=True)
        )
        if not status.logged_in:
            raise AuthenticationError(
                "Login submitted but no authenticated session detected.",
                hint="Credentials may be wrong, or a 2FA/challenge page needs to be completed "
                "manually — run headful (FIVERR_HEADLESS=false), solve it in the browser "
                "window, then call 'login' again to finish.",
            )
        status.method = "credentials"
        await self.save_session()
        return status

    async def logout(self) -> LoginStatus:
        """Log out and clear the persisted session."""
        self._guard_mutation("logout")
        try:
            await self._open(sel.PATH_LOGOUT)
        except SessionExpiredError:
            pass  # already logged out
        self._session.clear()
        self._username = None
        return LoginStatus(logged_in=False, method="none", detail="Logged out and session cleared.")

    async def save_session(self) -> str:
        """Persist the current browser session; return the file path."""
        state = await self._context.storage_state()
        self._session.save(state)
        return str(self._session.path)

    # ================================================================== #
    # Inbox
    # ================================================================== #
    async def list_messages(
        self, limit: int = 20, unread_only: bool = False
    ) -> list[MessagePreview]:
        """Return inbox conversation previews (newest first)."""
        await self._open(sel.PATH_INBOX)
        await nav.first_present(
            self._page, sel.CONVERSATION_ROWS, settings=self._settings, timeout_ms=10_000
        )
        rows = await self._rows(sel.CONVERSATION_ROWS)
        previews: list[MessagePreview] = []
        for row in rows:
            unread = await self._row_present(row, sel.CONVERSATION_UNREAD)
            if unread_only and not unread:
                continue
            contact = await self._scoped_text(row, sel.CONVERSATION_CONTACT, default="Unknown")
            snippet = await self._scoped_text(row, sel.CONVERSATION_SNIPPET)
            conv_id = await self._extract_conversation_id(row, contact)
            previews.append(
                MessagePreview(
                    conversation_id=conv_id, contact=contact, snippet=snippet, unread=unread
                )
            )
            if len(previews) >= limit:
                break
        return previews

    @staticmethod
    async def _extract_conversation_id(row: Locator, fallback: str) -> str:
        try:
            href = await row.locator('a[href^="/inbox/"]').first.get_attribute("href")
            if href:
                return href.rstrip("/").split("/")[-1]
        except Exception:  # pragma: no cover
            pass
        return fallback

    async def read_message(self, conversation_id: str) -> Conversation:
        """Open a conversation thread and return its ordered messages."""
        await self._open(sel.PATH_CONVERSATION, conversation_id=conversation_id)
        await nav.first_present(
            self._page, sel.MESSAGE_ITEMS, settings=self._settings, timeout_ms=10_000
        )
        rows = await self._rows(sel.MESSAGE_ITEMS)
        messages: list[ChatMessage] = []
        for row in rows:
            body = await self._scoped_text(row, sel.MESSAGE_BODY)
            if not body:
                continue
            messages.append(ChatMessage(sender="?", body=body))
        if not rows:
            raise NotFoundError(
                f"Conversation '{conversation_id}' has no readable messages or does not exist."
            )
        return Conversation(
            conversation_id=conversation_id, contact=conversation_id, messages=messages
        )

    async def send_message(self, conversation_id: str, body: str) -> dict[str, Any]:
        """Send a message in a conversation. Returns a small result dict."""
        self._guard_mutation("send_message", conversation_id=conversation_id, chars=len(body))
        await self._open(sel.PATH_CONVERSATION, conversation_id=conversation_id)
        box = await nav.first_present(self._page, sel.MESSAGE_INPUT, settings=self._settings)
        if box is None:
            raise NotFoundError(f"No message input found for conversation '{conversation_id}'.")
        await box.fill(body)
        await nav.safe_click(
            self._page, ", ".join(sel.SEND_BUTTON), settings=self._settings, allow_retry=False
        )
        return {"conversation_id": conversation_id, "sent": True, "chars": len(body)}

    async def archive_message(self, conversation_id: str) -> dict[str, Any]:
        """Archive a conversation."""
        self._guard_mutation("archive_message", conversation_id=conversation_id)
        await self._open(sel.PATH_CONVERSATION, conversation_id=conversation_id)
        await nav.safe_click(
            self._page, ", ".join(sel.ARCHIVE_BUTTON), settings=self._settings, allow_retry=False
        )
        return {"conversation_id": conversation_id, "archived": True}

    # ================================================================== #
    # Leads / Custom Offers
    #
    # Fiverr retired the public Buyer Requests page, so custom offers are now
    # created from *within a conversation* (see :meth:`send_offer`).
    # :meth:`list_available_leads` remains for the legacy page and may return an
    # empty list on current Fiverr.
    # ================================================================== #
    async def list_available_leads(self, limit: int = 20) -> list[Lead]:
        """Return open buyer requests / leads (legacy; Fiverr deprecated this page)."""
        username = await self._require_username()
        await self._open(sel.PATH_BUYER_REQUESTS, username=username)
        await nav.first_present(
            self._page, sel.LEAD_ROWS, settings=self._settings, timeout_ms=10_000
        )
        rows = await self._rows(sel.LEAD_ROWS)
        leads: list[Lead] = []
        for idx, row in enumerate(rows):
            title = await self._scoped_text(row, sel.LEAD_TITLE)
            description = await self._scoped_text(row, sel.LEAD_DESCRIPTION)
            budget = await self._scoped_text(row, sel.LEAD_BUDGET) or None
            delivery = await self._scoped_text(row, sel.LEAD_DELIVERY) or None
            leads.append(
                Lead(
                    lead_id=str(idx),
                    title=title,
                    description=description,
                    budget=budget,
                    delivery_time=delivery,
                )
            )
            if len(leads) >= limit:
                break
        return leads

    async def send_offer(
        self,
        conversation_id: str,
        description: str,
        price: float,
        delivery_days: int,
        revisions: int = 1,
        offer_type: str = "custom",
        gig_id: str | None = None,
        capture_screenshots: bool = True,
    ) -> dict[str, Any]:
        """Send an offer inside a conversation, preferring the custom workflow.

        Default path is **Custom Offer ("Without a Gig")** — the shortest, most
        reliable workflow. The method auto-detects what the composer offers and
        chooses the shortest valid deterministic path:

        * ``offer_type="custom"`` (default): use "Without a Gig" when available;
          if Fiverr only allows a gig-based offer in this conversation,
          transparently fall back to the gig workflow instead of failing.
        * ``offer_type="gig"``: use the gig workflow (``gig_id`` if given, else
          the first available gig); if a gig offer is not available but a custom
          offer is, fall back to custom.

        Args:
            conversation_id: Conversation/username to send the offer into.
            description: Offer description shown to the buyer.
            price: Offer price in the account currency.
            delivery_days: Delivery time in days.
            revisions: Included revisions (best-effort; skipped if not exposed).
            offer_type: ``"custom"`` (default) or ``"gig"``.
            gig_id: Gig to base a gig offer on; ignored for custom offers.
            capture_screenshots: Save before/after screenshots and return paths.

        Returns:
            Dict with ``sent``, ``offer_type_requested``, ``offer_type_used``,
            ``fallback_used``, ``gig_selected``, ``selector_path_used`` and
            ``screenshots``.
        """
        self._guard_mutation(
            "send_offer",
            conversation_id=conversation_id,
            price=price,
            delivery_days=delivery_days,
            offer_type=offer_type,
        )
        requested = "gig" if offer_type == "gig" else "custom"
        path: list[str] = []
        shots: list[str] = []

        await self._open(sel.PATH_CONVERSATION, conversation_id=conversation_id)

        trigger, trigger_sel = await self._first_with_selector(
            sel.CREATE_OFFER_BUTTON, timeout_ms=10_000
        )
        if trigger is None:
            raise NotFoundError(
                f"No 'Create an offer' control found in conversation '{conversation_id}'.",
                hint="Confirm the offer button exists in this conversation; update "
                "CREATE_OFFER_BUTTON in browser/selectors.py if Fiverr renamed it.",
            )
        await trigger.click()
        path.append(f"create_offer:{trigger_sel}")

        # Detect which offer bases the composer exposes.
        custom_opt, custom_sel = await self._first_with_selector(
            sel.OFFER_CUSTOM_OPTION, timeout_ms=4_000
        )
        gig_ctrl, gig_sel = await self._first_with_selector(
            sel.OFFER_GIG_SELECT, timeout_ms=3_000
        )
        custom_available = custom_opt is not None
        gig_available = gig_ctrl is not None or await self._any_present(sel.OFFER_GIG_OPTION)

        # Choose the shortest valid path (deterministic).
        used = requested
        fallback = False
        if requested == "custom":
            if custom_available or not gig_available:
                used = "custom"  # prefer custom; if neither detected, assume custom fields
            else:
                used, fallback = "gig", True
        else:  # requested == "gig"
            if gig_available:
                used = "gig"
            elif custom_available:
                used, fallback = "custom", True

        gig_selected: str | None = None
        if used == "custom":
            if custom_opt is not None:
                await custom_opt.click()
                path.append(f"custom_option:{custom_sel}")
            else:
                path.append("custom_option:default")
        else:  # gig path
            gig_selected = await self._select_gig(gig_ctrl, gig_sel, gig_id, path)

        # Fill the offer detail fields (shared by both paths).
        await self._fill_offer_fields(description, price, delivery_days, revisions, path)

        if capture_screenshots:
            shots.append(await self._capture("offer_composer"))

        await nav.safe_click(
            self._page, ", ".join(sel.SEND_OFFER_BUTTON), settings=self._settings, allow_retry=False
        )
        path.append("submit:" + sel.SEND_OFFER_BUTTON[0])

        if capture_screenshots:
            shots.append(await self._capture("offer_sent"))

        return {
            "conversation_id": conversation_id,
            "sent": True,
            "price": price,
            "delivery_days": delivery_days,
            "revisions": revisions,
            "offer_type_requested": requested,
            "offer_type_used": used,
            "fallback_used": fallback,
            "gig_selected": gig_selected,
            "selector_path_used": path,
            "screenshots": [s for s in shots if s],
        }

    async def _first_with_selector(
        self, variants: list[str], *, timeout_ms: int
    ) -> tuple[Locator | None, str | None]:
        """Return the first present locator and the selector string that matched."""
        for selector in variants:
            locator = await nav.first_present(
                self._page, [selector], settings=self._settings, timeout_ms=timeout_ms
            )
            if locator is not None:
                return locator, selector
        return None, None

    async def _any_present(self, variants: list[str]) -> bool:
        for selector in variants:
            try:
                if await self._page.locator(selector).count():
                    return True
            except Exception:  # pragma: no cover
                continue
        return False

    async def _select_gig(
        self,
        gig_ctrl: Locator | None,
        gig_sel: str | None,
        gig_id: str | None,
        path: list[str],
    ) -> str | None:
        """Select a gig for a gig-based offer; return an identifier for it."""
        if gig_ctrl is not None:
            try:
                if gig_id is not None:
                    await gig_ctrl.select_option(value=gig_id)
                    path.append(f"gig_select:{gig_sel}={gig_id}")
                    return gig_id
                # Pick the first non-placeholder option.
                await gig_ctrl.select_option(index=1)
                path.append(f"gig_select:{gig_sel}=first")
                return "first"
            except Exception:  # not a <select>; fall through to option cards
                await gig_ctrl.click()
        # Option cards
        option, option_sel = await self._first_with_selector(sel.OFFER_GIG_OPTION, timeout_ms=3_000)
        if option is not None:
            await option.click()
            path.append(f"gig_option:{option_sel}")
            return gig_id or "first"
        path.append("gig_select:unavailable")
        return None

    async def _fill_offer_fields(
        self, description: str, price: float, delivery_days: int, revisions: int, path: list[str]
    ) -> None:
        desc, desc_sel = await self._first_with_selector(
            sel.OFFER_DESCRIPTION_INPUT, timeout_ms=8_000
        )
        if desc is not None:
            await desc.fill(description)
            path.append(f"description:{desc_sel}")
        price_box, price_sel = await self._first_with_selector(sel.OFFER_PRICE_INPUT, timeout_ms=5_000)
        if price_box is not None:
            await price_box.fill(str(price))
            path.append(f"price:{price_sel}")
        delivery_box, del_sel = await self._first_with_selector(sel.OFFER_DELIVERY_INPUT, timeout_ms=5_000)
        if delivery_box is not None:
            await self._fill_or_select(delivery_box, str(delivery_days))
            path.append(f"delivery:{del_sel}")
        rev_box, rev_sel = await self._first_with_selector(sel.OFFER_REVISIONS_INPUT, timeout_ms=4_000)
        if rev_box is not None:
            await self._fill_or_select(rev_box, str(revisions))
            path.append(f"revisions:{rev_sel}")

    async def _capture(self, name: str) -> str:
        """Best-effort screenshot into the state dir; return its path (or '')."""
        try:
            shots_dir = self._settings.state_dir / "screenshots"
            shots_dir.mkdir(parents=True, exist_ok=True)
            path = shots_dir / f"{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}_{name}.png"
            await self._page.screenshot(path=str(path), full_page=True)
            return str(path)
        except Exception as exc:  # pragma: no cover - screenshots are best-effort
            logger.debug("offer screenshot '%s' failed: %s", name, exc)
            return ""

    @staticmethod
    async def _fill_or_select(locator: Locator, value: str) -> None:
        """Set a value on a field that may be a text input or a <select>."""
        try:
            await locator.fill(value)
        except Exception:  # pragma: no cover - it's a <select>, not an <input>
            try:
                await locator.select_option(value=value)
            except Exception:
                await locator.select_option(label=value)

    # ================================================================== #
    # Orders
    # ================================================================== #
    async def list_orders(self, status: str | None = None) -> list[OrderSummary]:
        """Return the seller's orders, optionally filtered by status substring."""
        await self._open(sel.PATH_ORDERS)
        await nav.first_present(
            self._page, sel.ORDER_ROWS, settings=self._settings, timeout_ms=10_000
        )
        rows = await self._rows(sel.ORDER_ROWS)
        orders: list[OrderSummary] = []
        for row in rows:
            order_id = await self._extract_order_id(row)
            if not order_id:
                continue
            title = await self._scoped_text(row, sel.ORDER_TITLE)
            raw_status = await self._scoped_text(row, sel.ORDER_STATUS)
            due = await self._scoped_text(row, sel.ORDER_DUE) or None
            summary = OrderSummary(
                order_id=order_id,
                title=title,
                status=self._map_order_status(raw_status),
                due=due,
            )
            if status and status.lower() not in raw_status.lower():
                continue
            orders.append(summary)
        return orders

    @staticmethod
    async def _extract_order_id(row: Locator) -> str | None:
        for selector in sel.ORDER_ID:
            loc = row.locator(selector).first
            try:
                if not await loc.count():
                    continue
                href = await loc.get_attribute("href")
                if href and "/orders/" in href:
                    return href.rstrip("/").split("/")[-1]
                text = (await loc.inner_text()).strip()
                if text:
                    return text
            except Exception:  # pragma: no cover
                continue
        return None

    @staticmethod
    def _map_order_status(raw: str) -> OrderStatus:
        low = raw.lower()
        mapping = {
            "late": OrderStatus.LATE,
            "delivered": OrderStatus.DELIVERED,
            "completed": OrderStatus.COMPLETED,
            "cancel": OrderStatus.CANCELLED,
            "revision": OrderStatus.IN_REVISION,
            "active": OrderStatus.ACTIVE,
            "progress": OrderStatus.ACTIVE,
        }
        for key, value in mapping.items():
            if key in low:
                return value
        return OrderStatus.UNKNOWN

    async def open_order(self, order_id: str) -> OrderDetail:
        """Open an order and return its full detail with requirements and messages."""
        await self._open(sel.PATH_ORDER_DETAIL, order_id=order_id)
        title = await nav.safe_text(
            self._page, ", ".join(sel.ORDER_TITLE), settings=self._settings
        )
        raw_status = await nav.safe_text(
            self._page, ", ".join(sel.ORDER_STATUS), settings=self._settings
        )
        requirements = await self.read_requirements(order_id, _already_open=True)
        message_rows = await self._rows(sel.MESSAGE_ITEMS)
        messages = [
            ChatMessage(sender="?", body=await self._scoped_text(r, sel.MESSAGE_BODY))
            for r in message_rows
        ]
        messages = [m for m in messages if m.body]
        return OrderDetail(
            order_id=order_id,
            title=title,
            status=self._map_order_status(raw_status),
            requirements=requirements,
            messages=messages,
        )

    async def read_requirements(self, order_id: str, _already_open: bool = False) -> list[str]:
        """Return the buyer-submitted requirement answers for an order."""
        if not _already_open:
            await self._open(sel.PATH_ORDER_DETAIL, order_id=order_id)
        rows = await self._rows(sel.ORDER_REQUIREMENTS)
        out = []
        for row in rows:
            try:
                text = (await row.inner_text()).strip()
            except Exception:  # pragma: no cover
                text = ""
            if text:
                out.append(text)
        return out

    async def send_order_message(self, order_id: str, body: str) -> dict[str, Any]:
        """Post a message in an order thread."""
        self._guard_mutation("send_order_message", order_id=order_id, chars=len(body))
        await self._open(sel.PATH_ORDER_DETAIL, order_id=order_id)
        box = await nav.first_present(self._page, sel.MESSAGE_INPUT, settings=self._settings)
        if box is None:
            raise NotFoundError(f"No message box found on order '{order_id}'.")
        await box.fill(body)
        await nav.safe_click(
            self._page, ", ".join(sel.SEND_BUTTON), settings=self._settings, allow_retry=False
        )
        return {"order_id": order_id, "sent": True, "chars": len(body)}

    async def deliver_order(
        self, order_id: str, message: str, files: list[str] | None = None
    ) -> dict[str, Any]:
        """Deliver an order with a message and optional file attachments."""
        self._guard_mutation("deliver_order", order_id=order_id, files=len(files or []))
        await self._open(sel.PATH_ORDER_DETAIL, order_id=order_id)
        await nav.safe_click(self._page, ", ".join(sel.DELIVER_BUTTON), settings=self._settings)
        box = await nav.first_present(self._page, sel.MESSAGE_INPUT, settings=self._settings)
        if box is not None:
            await box.fill(message)
        if files:
            try:
                await self._page.locator('input[type="file"]').first.set_input_files(files)
            except Exception as exc:  # pragma: no cover
                logger.warning("Could not attach delivery files: %s", exc)
        await nav.safe_click(
            self._page, ", ".join(sel.DELIVER_BUTTON), settings=self._settings, allow_retry=False
        )
        return {"order_id": order_id, "delivered": True, "attachments": len(files or [])}

    async def request_extension(
        self, order_id: str, days: int, reason: str
    ) -> dict[str, Any]:
        """Request a delivery-date extension on an order."""
        self._guard_mutation("request_extension", order_id=order_id, days=days)
        await self._open(sel.PATH_ORDER_DETAIL, order_id=order_id)
        await nav.safe_click(self._page, ", ".join(sel.EXTENSION_BUTTON), settings=self._settings)
        box = await nav.first_present(self._page, sel.MESSAGE_INPUT, settings=self._settings)
        if box is not None:
            await box.fill(reason)
        return {"order_id": order_id, "extension_requested": True, "days": days}

    async def cancel_order_request(self, order_id: str, reason: str) -> dict[str, Any]:
        """Open a cancellation/resolution request on an order."""
        self._guard_mutation("cancel_order_request", order_id=order_id)
        await self._open(sel.PATH_ORDER_DETAIL, order_id=order_id)
        await nav.safe_click(
            self._page, ", ".join(sel.CANCEL_BUTTON), settings=self._settings, allow_retry=False
        )
        box = await nav.first_present(self._page, sel.MESSAGE_INPUT, settings=self._settings)
        if box is not None:
            await box.fill(reason)
        return {"order_id": order_id, "cancellation_requested": True}

    # ================================================================== #
    # Gigs
    # ================================================================== #
    async def list_gigs(self) -> list[GigSummary]:
        """Return the seller's gigs from the gig manager."""
        username = await self._require_username()
        await self._open(sel.PATH_GIGS, username=username)
        await nav.first_present(
            self._page, sel.GIG_ROWS, settings=self._settings, timeout_ms=10_000
        )
        rows = await self._rows(sel.GIG_ROWS)
        gigs: list[GigSummary] = []
        for idx, row in enumerate(rows):
            title = await self._scoped_text(row, sel.GIG_TITLE)
            if not title:
                continue
            raw_status = await self._scoped_text(row, sel.GIG_STATUS)
            gigs.append(
                GigSummary(
                    gig_id=str(idx),
                    title=title,
                    status=self._map_gig_status(raw_status),
                    impressions=_to_int(await self._scoped_text(row, sel.GIG_IMPRESSIONS)),
                    clicks=_to_int(await self._scoped_text(row, sel.GIG_CLICKS)),
                )
            )
        return gigs

    @staticmethod
    def _map_gig_status(raw: str) -> GigStatus:
        low = raw.lower()
        for key, value in {
            "active": GigStatus.ACTIVE,
            "paus": GigStatus.PAUSED,
            "draft": GigStatus.DRAFT,
            "pending": GigStatus.PENDING,
            "denied": GigStatus.DENIED,
            "requires": GigStatus.DENIED,
        }.items():
            if key in low:
                return value
        return GigStatus.UNKNOWN

    async def open_gig(self, gig_id: str) -> GigDetail:
        """Open a gig's edit page and return its detail."""
        await self._open(sel.PATH_GIG_DETAIL, gig_id=gig_id)
        title = await nav.safe_text(
            self._page, ", ".join(sel.GIG_TITLE_INPUT + sel.GIG_TITLE), settings=self._settings
        )
        description = await nav.safe_text(
            self._page, ", ".join(sel.GIG_DESCRIPTION_INPUT), settings=self._settings
        )
        return GigDetail(gig_id=gig_id, title=title, description=description)

    async def create_gig(
        self, title: str, category: str | None, description: str, tags: list[str]
    ) -> dict[str, Any]:
        """Start a new gig draft and fill the initial fields."""
        self._guard_mutation("create_gig", title=title)
        await self._open(sel.PATH_GIG_CREATE)
        title_box = await nav.first_present(
            self._page, sel.GIG_TITLE_INPUT, settings=self._settings
        )
        if title_box is not None:
            await title_box.fill(title)
        desc_box = await nav.first_present(
            self._page, sel.GIG_DESCRIPTION_INPUT, settings=self._settings, timeout_ms=5_000
        )
        if desc_box is not None:
            await desc_box.fill(description)
        return {"created": True, "title": title, "status": "draft"}

    async def update_gig(self, gig_id: str, fields: dict[str, Any]) -> dict[str, Any]:
        """Update editable fields (title/description) on an existing gig."""
        self._guard_mutation("update_gig", gig_id=gig_id, fields=list(fields))
        await self._open(sel.PATH_GIG_DETAIL, gig_id=gig_id)
        if "title" in fields:
            box = await nav.first_present(self._page, sel.GIG_TITLE_INPUT, settings=self._settings)
            if box is not None:
                await box.fill(str(fields["title"]))
        if "description" in fields:
            box = await nav.first_present(
                self._page, sel.GIG_DESCRIPTION_INPUT, settings=self._settings
            )
            if box is not None:
                await box.fill(str(fields["description"]))
        return {"gig_id": gig_id, "updated": True, "fields": list(fields)}

    async def _gig_row_action(self, gig_id: str, action_selectors: list[str], label: str) -> None:
        username = await self._require_username()
        await self._open(sel.PATH_GIGS, username=username)
        rows = await self._rows(sel.GIG_ROWS)
        try:
            row = rows[int(gig_id)]
        except (ValueError, IndexError) as exc:
            raise NotFoundError(f"Gig '{gig_id}' is not in the gig manager.") from exc
        for selector in sel.GIG_ROW_MENU:
            menu = row.locator(selector).first
            if await menu.count():
                await menu.click()
                break
        # Gig row actions (pause/activate/delete) mutate state — never auto-retry.
        await nav.safe_click(
            self._page, ", ".join(action_selectors), settings=self._settings, allow_retry=False
        )

    async def pause_gig(self, gig_id: str) -> dict[str, Any]:
        """Pause an active gig."""
        self._guard_mutation("pause_gig", gig_id=gig_id)
        await self._gig_row_action(gig_id, sel.GIG_PAUSE_ACTION, "pause")
        return {"gig_id": gig_id, "status": "paused"}

    async def activate_gig(self, gig_id: str) -> dict[str, Any]:
        """Activate a paused gig."""
        self._guard_mutation("activate_gig", gig_id=gig_id)
        await self._gig_row_action(gig_id, sel.GIG_ACTIVATE_ACTION, "activate")
        return {"gig_id": gig_id, "status": "active"}

    async def delete_draft(self, gig_id: str) -> dict[str, Any]:
        """Delete a draft gig."""
        self._guard_mutation("delete_draft", gig_id=gig_id)
        await self._gig_row_action(gig_id, sel.GIG_DELETE_ACTION, "delete")
        return {"gig_id": gig_id, "deleted": True}

    # ================================================================== #
    # Analytics
    # ================================================================== #
    async def read_analytics(self, dashboard: bool = False) -> AnalyticsSnapshot:
        """Scrape metric cards from the analytics (or dashboard) page."""
        await self._open(sel.PATH_DASHBOARD if dashboard else sel.PATH_ANALYTICS)
        await nav.first_present(
            self._page, sel.METRIC_CARDS, settings=self._settings, timeout_ms=10_000
        )
        rows = await self._rows(sel.METRIC_CARDS)
        raw: dict[str, Any] = {}
        for row in rows:
            label = (await self._scoped_text(row, sel.METRIC_LABEL)).lower()
            value = await self._scoped_text(row, sel.METRIC_VALUE)
            if label:
                raw[label] = value
        snapshot = AnalyticsSnapshot(raw=raw)
        for key, value in raw.items():
            if "impression" in key:
                snapshot.impressions = _to_int(value)
            elif "click" in key:
                snapshot.clicks = _to_int(value)
            elif "order" in key:
                snapshot.orders = _to_int(value)
            elif "cancel" in key:
                snapshot.cancellations = _to_int(value)
            elif "earn" in key or "revenue" in key:
                snapshot.earnings = value
        if snapshot.clicks and snapshot.orders is not None and snapshot.clicks > 0:
            snapshot.conversion_rate = round(100.0 * snapshot.orders / snapshot.clicks, 2)
        return snapshot

    async def export_statistics(self, destination: str) -> dict[str, Any]:
        """Trigger the analytics export and save the downloaded file locally."""
        self._guard_mutation("export_statistics", destination=destination)
        await self._open(sel.PATH_ANALYTICS)
        async with self._page.expect_download(
            timeout=self._settings.navigation_timeout_ms
        ) as dl_info:
            await nav.safe_click(self._page, ", ".join(sel.EXPORT_BUTTON), settings=self._settings)
        download = await dl_info.value
        await download.save_as(destination)
        return {"exported": True, "path": destination}

    # ================================================================== #
    # Notifications
    # ================================================================== #
    async def list_notifications(self, limit: int = 20) -> list[Notification]:
        """Return recent notifications."""
        await self._open(sel.PATH_NOTIFICATIONS)
        await nav.first_present(
            self._page, sel.NOTIFICATION_ROWS, settings=self._settings, timeout_ms=10_000
        )
        rows = await self._rows(sel.NOTIFICATION_ROWS)
        notifications: list[Notification] = []
        for idx, row in enumerate(rows):
            text = await self._scoped_text(row, sel.NOTIFICATION_TEXT)
            if not text:
                continue
            link = None
            try:
                link = await row.locator("a").first.get_attribute("href")
            except Exception:  # pragma: no cover
                pass
            notifications.append(
                Notification(
                    notification_id=str(idx),
                    text=text,
                    unread=await self._row_present(row, sel.NOTIFICATION_UNREAD),
                    link=link,
                )
            )
            if len(notifications) >= limit:
                break
        return notifications

    async def open_notification(self, notification_id: str) -> dict[str, Any]:
        """Open (click through) a notification and return its target link."""
        await self._open(sel.PATH_NOTIFICATIONS)
        rows = await self._rows(sel.NOTIFICATION_ROWS)
        try:
            row = rows[int(notification_id)]
        except (ValueError, IndexError) as exc:
            raise NotFoundError(f"Notification '{notification_id}' not found.") from exc
        link = None
        try:
            link = await row.locator("a").first.get_attribute("href")
        except Exception:  # pragma: no cover
            pass
        self._guard_mutation("open_notification", notification_id=notification_id)
        await row.click()
        return {"notification_id": notification_id, "opened": True, "link": link}

    async def mark_as_read(self, notification_id: str | None = None) -> dict[str, Any]:
        """Mark one notification (or all) as read."""
        self._guard_mutation("mark_as_read", notification_id=notification_id or "all")
        await self._open(sel.PATH_NOTIFICATIONS)
        await nav.safe_click(self._page, ", ".join(sel.MARK_READ_BUTTON), settings=self._settings)
        return {"notification_id": notification_id or "all", "read": True}

    # ================================================================== #
    # Internal
    # ================================================================== #
    async def _require_username(self) -> str:
        """Return the logged-in username, discovering it if necessary."""
        if self._username:
            return self._username
        status = await self.verify_logged_in()
        if not status.logged_in or not status.username:
            raise SessionExpiredError(
                "Could not determine the logged-in username.",
                hint="Ensure you are logged in (run the 'login' tool).",
            )
        self._username = status.username
        return self._username

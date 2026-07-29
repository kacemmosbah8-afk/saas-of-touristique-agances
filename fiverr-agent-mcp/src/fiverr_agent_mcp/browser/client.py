"""High-level Fiverr operations (page-object layer).

:class:`FiverrClient` translates domain operations ("list my orders", "send an
offer") into Playwright interactions using the resilient helpers in
:mod:`.navigation` and the fallback locators in :mod:`.selectors`. Tools call
these methods and never touch Playwright directly.

Design notes
------------
* Every mutating method routes through :meth:`_guard_mutation`, which honours
  ``FIVERR_DRY_RUN`` by refusing to act and raising :class:`DryRunBlocked` with a
  preview payload the tool layer surfaces to the caller.
* Read methods degrade gracefully: a missing optional field yields ``None``
  rather than an exception, because Fiverr frequently omits fields.
* All navigation goes through :meth:`_open`, which re-checks the login wall so a
  silently expired session surfaces as :class:`SessionExpiredError`.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from urllib.parse import urljoin

from ..config import Settings
from ..exceptions import (
    AuthenticationError,
    ConfigurationError,
    DryRunBlocked,
    NotFoundError,
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
    # Low-level helpers
    # ------------------------------------------------------------------ #
    def _url(self, path: str, **kwargs: Any) -> str:
        """Build an absolute Fiverr URL from a path template."""
        if kwargs:
            path = path.format(**kwargs)
        return urljoin(self._settings.base_url.rstrip("/") + "/", path.lstrip("/"))

    async def _open(self, path: str, **kwargs: Any) -> None:
        """Navigate to ``path`` (login-wall aware)."""
        await nav.goto(self._page, self._url(path, **kwargs), settings=self._settings)

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
    async def verify_logged_in(self) -> LoginStatus:
        """Check whether the current context has an authenticated session."""
        await self._open(sel.PATH_HOME)
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

    async def login(self) -> LoginStatus:
        """Authenticate using ``FIVERR_EMAIL`` / ``FIVERR_PASSWORD``.

        Tries the restored session first; only submits credentials if needed.

        Raises:
            ConfigurationError: If credentials are not configured.
            AuthenticationError: If the credential login fails.
        """
        status = await self.verify_logged_in()
        if status.logged_in:
            await self.save_session()
            return status

        if not self._settings.has_credentials():
            raise ConfigurationError(
                "No persisted session and no credentials configured.",
                hint="Set FIVERR_EMAIL and FIVERR_PASSWORD, or restore a saved session.",
            )

        self._guard_mutation("login", email=self._settings.masked_email())
        logger.info("Logging in as %s via credentials", self._settings.masked_email())
        await self._open(sel.PATH_LOGIN)

        email = await nav.first_present(self._page, sel.EMAIL_INPUT, settings=self._settings)
        if email is None:
            raise AuthenticationError(
                "Could not find the email field on the login page.",
                hint="Fiverr may be showing a social-login-only screen or a challenge.",
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

        status = await self.verify_logged_in()
        if not status.logged_in:
            raise AuthenticationError(
                "Login submitted but no authenticated session detected.",
                hint="Credentials may be wrong or a 2FA/captcha challenge appeared.",
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
            self._page, ", ".join(sel.SEND_BUTTON), settings=self._settings
        )
        return {"conversation_id": conversation_id, "sent": True, "chars": len(body)}

    async def archive_message(self, conversation_id: str) -> dict[str, Any]:
        """Archive a conversation."""
        self._guard_mutation("archive_message", conversation_id=conversation_id)
        await self._open(sel.PATH_CONVERSATION, conversation_id=conversation_id)
        await nav.safe_click(self._page, ", ".join(sel.ARCHIVE_BUTTON), settings=self._settings)
        return {"conversation_id": conversation_id, "archived": True}

    # ================================================================== #
    # Leads / buyer requests
    # ================================================================== #
    async def list_available_leads(self, limit: int = 20) -> list[Lead]:
        """Return open buyer requests / leads."""
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
        lead_id: str,
        description: str,
        price: float,
        delivery_days: int,
    ) -> dict[str, Any]:
        """Send a custom offer in response to a buyer request."""
        self._guard_mutation(
            "send_offer", lead_id=lead_id, price=price, delivery_days=delivery_days
        )
        username = await self._require_username()
        await self._open(sel.PATH_BUYER_REQUESTS, username=username)
        rows = await self._rows(sel.LEAD_ROWS)
        try:
            row = rows[int(lead_id)]
        except (ValueError, IndexError) as exc:
            raise NotFoundError(f"Lead '{lead_id}' is not on the current buyer-requests page.") from exc

        offer_btn = None
        for selector in sel.SEND_OFFER_BUTTON:
            loc = row.locator(selector).first
            if await loc.count():
                offer_btn = loc
                break
        if offer_btn is None:
            raise NotFoundError(f"No 'Send offer' control on lead '{lead_id}'.")
        await offer_btn.click()

        desc = await nav.first_present(
            self._page, sel.OFFER_DESCRIPTION_INPUT, settings=self._settings
        )
        if desc is not None:
            await desc.fill(description)
        price_box = await nav.first_present(
            self._page, sel.OFFER_PRICE_INPUT, settings=self._settings, timeout_ms=5_000
        )
        if price_box is not None:
            await price_box.fill(str(price))
        delivery_box = await nav.first_present(
            self._page, sel.OFFER_DELIVERY_INPUT, settings=self._settings, timeout_ms=5_000
        )
        if delivery_box is not None:
            await delivery_box.fill(str(delivery_days))
        await nav.safe_click(self._page, ", ".join(sel.SEND_OFFER_BUTTON), settings=self._settings)
        return {"lead_id": lead_id, "sent": True, "price": price, "delivery_days": delivery_days}

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
        await nav.safe_click(self._page, ", ".join(sel.SEND_BUTTON), settings=self._settings)
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
        await nav.safe_click(self._page, ", ".join(sel.DELIVER_BUTTON), settings=self._settings)
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
        await nav.safe_click(self._page, ", ".join(sel.CANCEL_BUTTON), settings=self._settings)
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
        await nav.safe_click(self._page, ", ".join(action_selectors), settings=self._settings)

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

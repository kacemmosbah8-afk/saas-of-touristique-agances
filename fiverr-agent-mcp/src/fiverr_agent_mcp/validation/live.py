"""Live-validation harness against the real Fiverr website.

Walks each tool group, navigates the real pages, probes every selector variant,
screenshots each step, records per-tool telemetry, and writes a tiered
compatibility report with an explicit **go-live gate**.

Safe by design:

* No write is ever performed unless you explicitly pass ``--send-test-message``
  with ``--live`` and a ``--conversation-id`` you designate — and even then only
  a single text message to *that* thread. Offers and gigs are never created;
  their write flows are validated only up to (not including) the submit control.
* Intended to run on *your* machine, headful, so you can clear any Fiverr
  login/anti-bot challenge yourself.

Go-live gate: every **Tier 1** tool must be ``production_ready`` before
``FIVERR_DRY_RUN=false`` is permitted. Tiers are defined in :data:`TOOL_TIERS`.

Run: ``fiverr-agent-mcp-validate`` or ``python -m fiverr_agent_mcp.validation``.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from ..browser import navigation as nav
from ..browser import selectors as sel
from ..browser.manager import BrowserManager
from ..config import Settings, get_settings
from ..exceptions import FiverrAgentError, NavigationError, RateLimitedError, SessionExpiredError
from ..logging_config import configure_logging, get_logger
from .probe import ProbeResult, probe_selectors

if TYPE_CHECKING:  # pragma: no cover
    from playwright.async_api import Page

    from ..browser.client import FiverrClient

logger = get_logger("validation")

# Status values for a validated tool.
PRODUCTION_READY = "production_ready"
NEEDS_FIX = "needs_fix"
BLOCKED = "blocked"
SKIPPED = "skipped"

# Go-live tiers. Tier 1 must be 100% production-ready before live writes.
TOOL_TIERS: dict[str, int] = {
    # Tier 1 — Critical (blocks FIVERR_DRY_RUN=false)
    "login": 1, "restore_session": 1, "verify_logged_in": 1,
    "list_messages": 1, "read_message": 1, "send_message": 1,
    "send_offer": 1, "list_orders": 1, "open_order": 1,
    # Tier 2 — Important (feature-complete, does not block initial production)
    "list_notifications": 2, "list_gigs": 2, "open_gig": 2,
    "read_dashboard": 2, "read_analytics": 2, "summarize_conversation": 2,
    "analyze_client": 2, "suggest_price": 2,
    # Tier 3 — Optional / Phase 2 (keep in dry-run until individually validated)
    "create_gig": 3, "update_gig": 3, "pause_gig": 3, "activate_gig": 3,
    "deliver_order": 3, "request_extension": 3, "archive_message": 3,
    "list_available_leads": 3,
}
TIER1_TOOLS = {t for t, tier in TOOL_TIERS.items() if tier == 1}


def tier_of(tool: str) -> int:
    return TOOL_TIERS.get(tool, 0)


@dataclass
class CheckResult:
    """Result + telemetry for validating one tool against the live site."""

    tool: str
    group: str
    status: str
    tier: int = 0
    probes: list[ProbeResult] = field(default_factory=list)
    required_labels: list[str] = field(default_factory=list)
    screenshot: str | None = None
    screenshot_path: str | None = None
    notes: list[str] = field(default_factory=list)
    is_write: bool = False
    duration_s: float = 0.0
    retry_count: int = 0
    captcha: bool = False
    human_required: bool = False
    dom_changed: bool | None = None  # None = no baseline to compare against

    @property
    def missing(self) -> list[str]:
        req = set(self.required_labels)
        return [p.label for p in self.probes if p.label in req and not p.found]

    @property
    def success_rate(self) -> float:
        """Percent of *required* selectors that matched (100 if none required)."""
        req = [p for p in self.probes if p.label in set(self.required_labels)]
        if not req:
            return 100.0 if self.status == PRODUCTION_READY else 0.0
        return round(100.0 * sum(1 for p in req if p.found) / len(req), 1)

    @property
    def selectors_used(self) -> list[dict]:
        """Matched selector + confidence for each required element."""
        req = set(self.required_labels)
        return [
            {"element": p.label, "selector": p.matched, "confidence": p.confidence}
            for p in self.probes
            if p.label in req and p.found
        ]

    def to_dict(self) -> dict:
        return {
            "tool": self.tool,
            "group": self.group,
            "tier": self.tier,
            "status": self.status,
            "success_rate": self.success_rate,
            "duration_s": self.duration_s,
            "retry_count": self.retry_count,
            "captcha": self.captcha,
            "human_required": self.human_required,
            "dom_changed": self.dom_changed,
            "is_write": self.is_write,
            "screenshot": self.screenshot,
            "screenshot_path": self.screenshot_path,
            "required_labels": self.required_labels,
            "missing": self.missing,
            "selectors_used": self.selectors_used,
            "notes": self.notes,
            "probes": [p.to_dict() for p in self.probes],
        }


def evaluate_gate(results: list[CheckResult]) -> dict:
    """Evaluate the Tier-1 go-live gate.

    Returns a dict with the verdict and the reason. ``go`` is True only when
    every Tier-1 tool ran and is ``production_ready``.
    """
    by_tool = {r.tool: r for r in results}
    present = set(by_tool) & TIER1_TOOLS
    missing = sorted(TIER1_TOOLS - present)
    not_ready = sorted(
        t for t in present if by_tool[t].status != PRODUCTION_READY
    )
    go = not missing and not not_ready
    if go:
        reason = "All Tier 1 tools are Production Ready."
    elif missing:
        reason = f"Tier 1 tools not validated: {', '.join(missing)}."
    else:
        reason = f"Tier 1 tools not Production Ready: {', '.join(not_ready)}."
    return {
        "go": go,
        "reason": reason,
        "tier1_total": len(TIER1_TOOLS),
        "tier1_ready": sum(
            1 for t in TIER1_TOOLS if t in by_tool and by_tool[t].status == PRODUCTION_READY
        ),
        "tier1_missing": missing,
        "tier1_not_ready": not_ready,
        "allow_dry_run_false": go,
    }


class LiveValidator:
    """Drives a real browser session and validates each tool with telemetry."""

    def __init__(
        self,
        artifacts_dir: Path,
        headless: bool = False,
        only: set[str] | None = None,
        baseline: dict[str, dict[str, str | None]] | None = None,
    ) -> None:
        self.artifacts_dir = artifacts_dir
        self.only = only
        self.baseline = baseline
        self.results: list[CheckResult] = []
        self._step = 0
        self._logged_in = False

        os.environ["FIVERR_HEADLESS"] = "true" if headless else "false"
        get_settings.cache_clear()
        self._settings: Settings = get_settings()
        self._manager = BrowserManager(self._settings)
        self._client: FiverrClient | None = None

    # -- lifecycle -------------------------------------------------------- #
    async def setup(self) -> bool:
        """Start the browser and establish a session. Returns False if the
        browser could not launch (records a blocked harness result)."""
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        try:
            self._client = await self._manager.client()
        except FiverrAgentError as exc:
            hint = f" ({exc.hint})" if exc.hint else ""
            self.results.append(CheckResult(
                tool="browser", group="Harness", status=BLOCKED, human_required=True,
                notes=[f"could not start browser: {exc.code}: {exc.message}{hint}"]))
            return False

        try:
            status = await self._client.verify_logged_in()
            self._logged_in = status.logged_in
            if not status.logged_in and self._settings.has_credentials():
                logger.info("No active session; attempting credential login…")
                status = await self._client.login()
                self._logged_in = status.logged_in
        except FiverrAgentError as exc:
            self.results.append(CheckResult(
                tool="session_bootstrap", group="Account", status=BLOCKED, human_required=True,
                notes=[f"session bootstrap failed: {exc.code}: {exc.message}. "
                       "Log in headful first, then re-run."]))
        return True

    async def teardown(self) -> None:
        await self._manager.close()

    # -- helpers ---------------------------------------------------------- #
    @property
    def client(self) -> FiverrClient:
        assert self._client is not None, "call setup() first"
        return self._client

    @property
    def page(self) -> Page:
        return self.client.page

    def _selected(self, tool: str) -> bool:
        return self.only is None or tool in self.only

    async def _screenshot(self, name: str) -> tuple[str | None, str | None]:
        self._step += 1
        path = self.artifacts_dir / f"{self._step:02d}_{name}.png"
        try:
            await self.page.screenshot(path=str(path), full_page=True)
            return path.name, str(path.resolve())
        except Exception as exc:  # pragma: no cover
            logger.warning("Screenshot '%s' failed: %s", name, exc)
            return None, None

    async def _probe(self, label: str, variants: list[str]) -> ProbeResult:
        return await probe_selectors(self.page, label, variants)

    async def _captcha_present(self) -> bool:
        try:
            content = (await self.page.content()).lower()
        except Exception:  # pragma: no cover
            return False
        return any(m in content for m in (
            "captcha", "unusual traffic", "press & hold", "perimeterx",
            "cf-chl", "verify you are human", "recaptcha",
        ))

    @contextlib.asynccontextmanager
    async def _track(self):
        """Measure wall time and retry count for the enclosed block."""
        start = time.perf_counter()
        with nav.count_retries() as counter:
            box = _Track()
            try:
                yield box
            finally:
                box.retries = counter.count
                box.duration = round(time.perf_counter() - start, 3)

    def _dom_changed(self, tool: str, probes: list[ProbeResult]) -> bool | None:
        if self.baseline is None:
            return None
        base = self.baseline.get(tool)
        if base is None:
            return None
        for p in probes:
            if base.get(p.label, "__absent__") != (p.matched or None):
                return True
        return False

    def _finalize(
        self, *, tool: str, group: str, status: str, probes: list[ProbeResult],
        required_labels: list[str], screenshot: tuple[str | None, str | None],
        notes: list[str], is_write: bool, track: _Track, captcha: bool,
    ) -> CheckResult:
        human = captcha or status == BLOCKED
        result = CheckResult(
            tool=tool, group=group, status=status, tier=tier_of(tool),
            probes=probes, required_labels=required_labels,
            screenshot=screenshot[0], screenshot_path=screenshot[1],
            notes=notes, is_write=is_write,
            duration_s=track.duration, retry_count=track.retries,
            captcha=captcha, human_required=human,
            dom_changed=self._dom_changed(tool, probes),
        )
        self.results.append(result)
        return result

    async def _page_check(
        self, tool: str, group: str, path: str, required: dict[str, list[str]],
        optional: dict[str, list[str]] | None = None, is_write: bool = False,
        path_kwargs: dict | None = None, note: str | None = None,
    ) -> CheckResult | None:
        """Navigate to ``path``, screenshot, probe selectors, record telemetry."""
        if not self._selected(tool):
            return None
        notes: list[str] = [note] if note else []
        status = PRODUCTION_READY
        probes: list[ProbeResult] = []
        async with self._track() as track:
            try:
                await self.client.goto_path(path, **(path_kwargs or {}))
            except (SessionExpiredError, RateLimitedError) as exc:
                notes.append(f"{exc.code}: {exc.message}")
                status = BLOCKED
            except NavigationError as exc:
                notes.append(f"navigation failed: {exc.message}")
                status = BLOCKED
            if status != BLOCKED:
                for label, variants in required.items():
                    probes.append(await self._probe(label, variants))
                for label, variants in (optional or {}).items():
                    probes.append(await self._probe(label, variants))
                if any(not p.found for p in probes if p.label in required):
                    status = NEEDS_FIX
        shot = await self._screenshot(tool)
        captcha = await self._captcha_present()
        if captcha and status == PRODUCTION_READY:
            status = BLOCKED
            notes.append("CAPTCHA/anti-bot challenge detected on the page.")
        return self._finalize(
            tool=tool, group=group, status=status, probes=probes,
            required_labels=list(required), screenshot=shot, notes=notes,
            is_write=is_write, track=track, captcha=captcha)

    # -- account checks (Tier 1) ----------------------------------------- #
    async def check_account(self) -> None:
        for tool, fn in (
            ("verify_logged_in", self.client.verify_logged_in),
            ("restore_session", self.client.restore_session),
            ("login", self.client.login),
        ):
            if not self._selected(tool):
                continue
            notes: list[str] = []
            probes: list[ProbeResult] = []
            status = PRODUCTION_READY
            async with self._track() as track:
                try:
                    login_status = await fn()
                    self._logged_in = self._logged_in or login_status.logged_in
                    notes.append(f"logged_in={login_status.logged_in}, "
                                 f"method={login_status.method}, "
                                 f"username={login_status.username or '?'}")
                    probes.append(await self._probe("logged-in marker", sel.LOGGED_IN_MARKERS))
                    if not login_status.logged_in:
                        status = BLOCKED
                        notes.append("Not authenticated — log in headful first.")
                except FiverrAgentError as exc:
                    status = BLOCKED
                    notes.append(f"{exc.code}: {exc.message}")
            shot = await self._screenshot(tool)
            captcha = await self._captcha_present()
            self._finalize(
                tool=tool, group="Account", status=status, probes=probes,
                required_labels=["logged-in marker"], screenshot=shot, notes=notes,
                is_write=False, track=track, captcha=captcha)

    # -- inbox ------------------------------------------------------------ #
    async def check_inbox(self) -> None:
        await self._page_check(
            "list_messages", "Inbox", sel.PATH_INBOX,
            required={"conversation rows": sel.CONVERSATION_ROWS},
            optional={"contact name": sel.CONVERSATION_CONTACT,
                      "snippet": sel.CONVERSATION_SNIPPET,
                      "unread badge": sel.CONVERSATION_UNREAD})

    async def check_read_message(self, conversation_id: str | None) -> None:
        if not self._selected("read_message"):
            return
        conv = conversation_id or await self._first_conversation_id()
        if not conv:
            self.results.append(CheckResult(
                "read_message", "Inbox", SKIPPED, tier=1,
                notes=["No conversation available; pass --conversation-id to test."]))
            return
        await self._page_check(
            "read_message", "Inbox", sel.PATH_CONVERSATION,
            required={"message items": sel.MESSAGE_ITEMS},
            optional={"message body": sel.MESSAGE_BODY},
            path_kwargs={"conversation_id": conv}, note=f"conversation: {conv}")

    async def check_send_message_flow(self, conversation_id: str | None) -> None:
        if not self._selected("send_message"):
            return
        conv = conversation_id or await self._first_conversation_id()
        if not conv:
            self.results.append(CheckResult(
                "send_message", "Inbox", SKIPPED, tier=1, is_write=True,
                notes=["No conversation available; pass --conversation-id to test compose."]))
            return
        await self._page_check(
            "send_message", "Inbox", sel.PATH_CONVERSATION,
            required={"message input": sel.MESSAGE_INPUT, "send button": sel.SEND_BUTTON},
            optional={"archive button": sel.ARCHIVE_BUTTON}, is_write=True,
            path_kwargs={"conversation_id": conv},
            note="Dry-run: located compose + send controls; nothing was sent.")

    # -- orders ----------------------------------------------------------- #
    async def check_orders(self) -> None:
        await self._page_check(
            "list_orders", "Orders", sel.PATH_ORDERS,
            required={"order rows": sel.ORDER_ROWS},
            optional={"order id": sel.ORDER_ID, "order status": sel.ORDER_STATUS,
                      "order due": sel.ORDER_DUE})

    async def check_open_order(self, order_id: str | None) -> None:
        if not self._selected("open_order"):
            return
        oid = order_id or await self._first_order_id()
        if not oid:
            self.results.append(CheckResult(
                "open_order", "Orders", SKIPPED, tier=1,
                notes=["No order available; pass --order-id to test the order detail page."]))
            return
        await self._page_check(
            "open_order", "Orders", sel.PATH_ORDER_DETAIL,
            required={"order title": sel.ORDER_TITLE},
            optional={"order status": sel.ORDER_STATUS,
                      "requirements": sel.ORDER_REQUIREMENTS,
                      "order messages": sel.MESSAGE_ITEMS},
            path_kwargs={"order_id": oid}, note=f"order: {oid}")

    # -- send offer (Tier 1, conversation-based custom offer) ------------- #
    async def check_send_offer_flow(self, conversation_id: str | None) -> None:
        if not self._selected("send_offer"):
            return
        conv = conversation_id or await self._first_conversation_id()
        if not conv:
            self.results.append(CheckResult(
                "send_offer", "Leads", SKIPPED, tier=1, is_write=True,
                notes=["No conversation available; pass --conversation-id to test the "
                       "custom-offer composer."]))
            return
        notes = [f"conversation: {conv}",
                 "Dry-run: opened the 'Create an offer' composer; no offer was sent."]
        status = PRODUCTION_READY
        probes: list[ProbeResult] = []
        async with self._track() as track:
            try:
                await self.client.goto_path(sel.PATH_CONVERSATION, conversation_id=conv)
            except (SessionExpiredError, NavigationError, RateLimitedError) as exc:
                notes.append(f"navigation failed: {exc.message}")
                status = BLOCKED
            if status != BLOCKED:
                trigger = await self._probe("create-offer button", sel.CREATE_OFFER_BUTTON)
                probes.append(trigger)
                if trigger.found and trigger.matched:
                    try:
                        await self.page.locator(trigger.matched).first.click()
                    except Exception as exc:  # pragma: no cover
                        notes.append(f"could not open composer: {exc}")
                else:
                    notes.append("No 'Create an offer' control found — Fiverr may have renamed "
                                 "it or offers are unavailable in this conversation.")
                # Probe the offer-basis controls to report which path send_offer
                # would take. Custom ("Without a Gig") is the preferred primary.
                custom_opt = await self._probe("custom option (Without a Gig)", sel.OFFER_CUSTOM_OPTION)
                gig_sel = await self._probe("gig selector (fallback)", sel.OFFER_GIG_SELECT)
                probes.extend([custom_opt, gig_sel])
                if custom_opt.found:
                    notes.append("Detected path: CUSTOM (Without a Gig) — primary/high-confidence.")
                elif gig_sel.found:
                    notes.append("Detected path: GIG only — send_offer will transparently fall back "
                                 "to the gig workflow here.")
                else:
                    notes.append("Neither custom nor gig control detected — send_offer will assume "
                                 "the composer's default custom fields.")
                for label, variants in {
                    "offer description": sel.OFFER_DESCRIPTION_INPUT,
                    "offer price": sel.OFFER_PRICE_INPUT,
                    "offer delivery": sel.OFFER_DELIVERY_INPUT,
                    "send-offer submit": sel.SEND_OFFER_BUTTON,
                }.items():
                    probes.append(await self._probe(label, variants))
                required = {"create-offer button", "offer price", "send-offer submit"}
                if any(not p.found for p in probes if p.label in required):
                    status = NEEDS_FIX
        shot = await self._screenshot("send_offer")
        captcha = await self._captcha_present()
        self._finalize(
            tool="send_offer", group="Leads", status=status, probes=probes,
            required_labels=["create-offer button", "offer price", "send-offer submit"],
            screenshot=shot, notes=notes, is_write=True, track=track, captcha=captcha)

    # -- Tier 2 ----------------------------------------------------------- #
    async def check_notifications(self) -> None:
        await self._page_check(
            "list_notifications", "Notifications", sel.PATH_NOTIFICATIONS,
            required={"notification rows": sel.NOTIFICATION_ROWS},
            optional={"notification text": sel.NOTIFICATION_TEXT,
                      "mark-read button": sel.MARK_READ_BUTTON})

    async def check_gigs(self) -> None:
        if not self._selected("list_gigs"):
            return
        try:
            username = await self.client.current_username()
        except FiverrAgentError as exc:
            self.results.append(CheckResult(
                "list_gigs", "Gigs", BLOCKED, tier=2, human_required=True,
                notes=[f"username unavailable: {exc.message}"]))
            return
        await self._page_check(
            "list_gigs", "Gigs", sel.PATH_GIGS,
            required={"gig rows": sel.GIG_ROWS},
            optional={"gig title": sel.GIG_TITLE, "gig status": sel.GIG_STATUS,
                      "row menu": sel.GIG_ROW_MENU},
            path_kwargs={"username": username})

    async def check_open_gig(self, gig_id: str | None) -> None:
        if not self._selected("open_gig"):
            return
        if not gig_id:
            self.results.append(CheckResult(
                "open_gig", "Gigs", SKIPPED, tier=2,
                notes=["Pass --gig-id <real gig id> to validate the gig detail page."]))
            return
        await self._page_check(
            "open_gig", "Gigs", sel.PATH_GIG_DETAIL,
            required={"gig title input": sel.GIG_TITLE_INPUT + sel.GIG_TITLE},
            optional={"gig description input": sel.GIG_DESCRIPTION_INPUT},
            path_kwargs={"gig_id": gig_id}, note=f"gig: {gig_id}")

    async def check_analytics(self) -> None:
        await self._page_check(
            "read_dashboard", "Analytics", sel.PATH_DASHBOARD,
            required={"metric cards": sel.METRIC_CARDS},
            optional={"metric label": sel.METRIC_LABEL, "metric value": sel.METRIC_VALUE})
        await self._page_check(
            "read_analytics", "Analytics", sel.PATH_ANALYTICS,
            required={"metric cards": sel.METRIC_CARDS},
            optional={"metric label": sel.METRIC_LABEL, "metric value": sel.METRIC_VALUE,
                      "export button": sel.EXPORT_BUTTON})

    async def check_offline_ai(self) -> None:
        """Validate offline AI tools (deterministic; no live DOM dependency)."""
        from ..ai import analyze_client_profile, suggest_price, summarize_conversation
        from ..models import ChatMessage

        checks = {
            "analyze_client": lambda: analyze_client_profile(
                [ChatMessage(sender="buyer", body="Ready to start, please send an offer")]),
            "suggest_price": lambda: suggest_price("Urgent 10-page site", 200, "high"),
            "summarize_conversation": lambda: summarize_conversation(
                [ChatMessage(sender="buyer", body="Need it by Friday, budget $300")]),
        }
        for tool, fn in checks.items():
            if not self._selected(tool):
                continue
            async with self._track() as track:
                try:
                    fn()
                    status = PRODUCTION_READY
                    notes = ["Offline heuristic — deterministic, no live Fiverr DOM dependency."]
                except Exception as exc:  # pragma: no cover
                    status = NEEDS_FIX
                    notes = [f"heuristic failed: {exc}"]
            self._finalize(
                tool=tool, group="AI", status=status, probes=[], required_labels=[],
                screenshot=(None, None), notes=notes, is_write=False, track=track, captcha=False)

    # -- Tier 3 write flows (dry) ---------------------------------------- #
    async def check_create_gig_flow(self) -> None:
        await self._page_check(
            "create_gig", "Gigs", sel.PATH_GIG_CREATE,
            required={"gig title input": sel.GIG_TITLE_INPUT},
            optional={"gig description input": sel.GIG_DESCRIPTION_INPUT}, is_write=True,
            note="Dry-run: located the create-gig fields; no gig was created.")

    async def check_update_gig_flow(self, gig_id: str | None) -> None:
        if not self._selected("update_gig"):
            return
        if not gig_id:
            self.results.append(CheckResult(
                "update_gig", "Gigs", SKIPPED, tier=3, is_write=True,
                notes=["Pass --gig-id <real gig id> to validate the edit flow."]))
            return
        await self._page_check(
            "update_gig", "Gigs", sel.PATH_GIG_DETAIL,
            required={"gig title input": sel.GIG_TITLE_INPUT + sel.GIG_TITLE},
            optional={"gig description input": sel.GIG_DESCRIPTION_INPUT}, is_write=True,
            path_kwargs={"gig_id": gig_id}, note=f"Dry-run: opened gig {gig_id}; no changes saved.")

    # -- optional real write (guarded) ----------------------------------- #
    async def send_test_message(self, conversation_id: str, text: str) -> None:
        notes = [f"LIVE send to conversation {conversation_id}"]
        status = PRODUCTION_READY
        async with self._track() as track:
            try:
                await self.client.goto_path(sel.PATH_CONVERSATION, conversation_id=conversation_id)
                await self.page.locator(", ".join(sel.MESSAGE_INPUT)).first.fill(text)
                await self.page.locator(", ".join(sel.SEND_BUTTON)).first.click()
                notes.append("message sent")
            except Exception as exc:
                status = NEEDS_FIX
                notes.append(f"send failed: {type(exc).__name__}: {exc}")
        shot = await self._screenshot("send_message_LIVE")
        captcha = await self._captcha_present()
        self._finalize(
            tool="send_message", group="Inbox", status=status, probes=[], required_labels=[],
            screenshot=shot, notes=notes, is_write=True, track=track, captcha=captcha)

    # -- internals -------------------------------------------------------- #
    async def _first_conversation_id(self) -> str | None:
        try:
            await self.client.goto_path(sel.PATH_INBOX)
            href = await self.page.locator('a[href^="/inbox/"]').first.get_attribute("href")
            if href:
                return href.rstrip("/").split("/")[-1]
        except Exception:
            pass
        return None

    async def _first_order_id(self) -> str | None:
        try:
            await self.client.goto_path(sel.PATH_ORDERS)
            href = await self.page.locator('a[href*="/orders/"]').first.get_attribute("href")
            if href and "/orders/" in href:
                return href.rstrip("/").split("/")[-1]
        except Exception:
            pass
        return None

    async def run_all(self, args: argparse.Namespace) -> None:
        started = await self.setup()
        if not started:
            return
        await self.check_account()
        # Tier 1
        await self.check_inbox()
        await self.check_read_message(args.conversation_id)
        await self.check_send_message_flow(args.conversation_id)
        await self.check_send_offer_flow(args.conversation_id)
        await self.check_orders()
        await self.check_open_order(args.order_id)
        # Tier 2
        await self.check_notifications()
        await self.check_gigs()
        await self.check_open_gig(args.gig_id)
        await self.check_analytics()
        await self.check_offline_ai()
        # Tier 3 (validated but stay dry-run)
        await self.check_create_gig_flow()
        await self.check_update_gig_flow(args.gig_id)
        # Optional real send
        if args.send_test_message:
            if args.live and args.conversation_id:
                await self.send_test_message(args.conversation_id, args.test_text)
            else:
                self.results.append(CheckResult(
                    "send_message", "Inbox", SKIPPED, tier=1, is_write=True,
                    notes=["--send-test-message requires --live and --conversation-id."]))


@dataclass
class _Track:
    duration: float = 0.0
    retries: int = 0


# --------------------------------------------------------------------------- #
# Report writers
# --------------------------------------------------------------------------- #
_STATUS_LABEL = {
    PRODUCTION_READY: "✅ Production Ready",
    NEEDS_FIX: "⚠️ Needs Fix",
    BLOCKED: "⛔ Blocked",
    SKIPPED: "⏭️ Skipped",
}
_YN = {True: "Yes", False: "No", None: "n/a"}


def load_baseline(path: Path) -> dict[str, dict[str, str | None]]:
    """Load a prior ``report.json`` into a ``{tool: {label: matched}}`` map."""
    data = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict[str, str | None]] = {}
    for r in data.get("results", []):
        out[r["tool"]] = {p["label"]: p.get("matched") for p in r.get("probes", [])}
    return out


def _metrics_table(rows: list[CheckResult]) -> list[str]:
    out = ["| Tool | Status | Success | Time (s) | Retries | CAPTCHA | Human? | DOM Δ | Selector(s) → confidence |",
           "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    for r in rows:
        used = "; ".join(f"`{s['selector']}` ({s['confidence']})" for s in r.selectors_used) or "—"
        out.append(
            f"| `{r.tool}` | {_STATUS_LABEL.get(r.status, r.status)} | {r.success_rate:.0f}% | "
            f"{r.duration_s:.2f} | {r.retry_count} | {_YN[r.captcha]} | {_YN[r.human_required]} | "
            f"{_YN[r.dom_changed]} | {used} |"
        )
    return out


def write_reports(results: list[CheckResult], artifacts_dir: Path, base_url: str) -> Path:
    """Write ``report.md`` and ``report.json``; return the markdown path."""
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    counts = {k: sum(1 for r in results if r.status == k) for k in _STATUS_LABEL}
    total = len(results)
    ready = counts[PRODUCTION_READY]
    overall_rate = round(100.0 * ready / total, 1) if total else 0.0
    gate = evaluate_gate(results)

    lines: list[str] = []
    lines.append("# Fiverr Agent MCP — Live Compatibility Report\n")
    lines.append(f"Generated: {ts}  ·  Target: {base_url}\n")

    # -- Gate ----------------------------------------------------------------
    verdict = "🟢 GO" if gate["go"] else "🔴 NO-GO"
    lines.append("## Go-Live Gate (Tier 1)\n")
    lines.append(f"**Verdict: {verdict}** — {gate['reason']}\n")
    lines.append(f"- Tier 1 Production Ready: **{gate['tier1_ready']} / {gate['tier1_total']}**")
    lines.append(f"- `FIVERR_DRY_RUN=false` permitted: **{'YES' if gate['allow_dry_run_false'] else 'NO'}**")
    if gate["tier1_missing"]:
        lines.append(f"- Not yet validated: {', '.join(gate['tier1_missing'])}")
    if gate["tier1_not_ready"]:
        lines.append(f"- Not Production Ready: {', '.join(gate['tier1_not_ready'])}")
    lines.append("")

    lines.append(f"**Overall success rate:** {overall_rate:.0f}% "
                 f"({ready}/{total} checks Production Ready · {counts[NEEDS_FIX]} need fixes · "
                 f"{counts[BLOCKED]} blocked · {counts[SKIPPED]} skipped)\n")

    # -- Per-tier metrics tables --------------------------------------------
    for tier, title in ((1, "Tier 1 — Critical (blocks go-live)"),
                        (2, "Tier 2 — Important"),
                        (3, "Tier 3 — Optional / Phase 2"),
                        (0, "Other checks")):
        rows = [r for r in results if r.tier == tier]
        if not rows:
            continue
        lines.append(f"## {title}\n")
        lines.extend(_metrics_table(rows))
        lines.append("")

    # -- Per-tool detail -----------------------------------------------------
    lines.append("## Per-tool detail\n")
    for r in results:
        lines.append(f"### `{r.tool}` — {_STATUS_LABEL.get(r.status, r.status)} "
                     f"(Tier {r.tier or '—'})\n")
        lines.append(f"- success rate: {r.success_rate:.0f}% · time: {r.duration_s:.2f}s · "
                     f"retries: {r.retry_count} · CAPTCHA: {_YN[r.captcha]} · "
                     f"human intervention: {_YN[r.human_required]} · DOM changed: {_YN[r.dom_changed]}")
        if r.screenshot_path:
            lines.append(f"- screenshot: `{r.screenshot_path}`")
        if r.screenshot:
            lines.append(f"\n![{r.tool}]({r.screenshot})\n")
        for n in r.notes:
            lines.append(f"- _note:_ {n}")
        if r.probes:
            lines.append("\n| Element | Matched selector | Nodes | Confidence |")
            lines.append("| --- | --- | --- | --- |")
            for p in r.probes:
                req = " *(required)*" if p.label in r.required_labels else ""
                matched = f"`{p.matched}`" if p.matched else "**none matched**"
                lines.append(f"| {p.label}{req} | {matched} | {p.match_count} | {p.confidence} |")
        lines.append("")

    # -- Selectors to fix ----------------------------------------------------
    to_fix = [(r.tool, p) for r in results for p in r.probes
              if p.label in r.required_labels and not p.found]
    if to_fix:
        lines.append("## Selectors to fix\n")
        lines.append("These required elements matched nothing on the live site. Update the "
                     "corresponding list in `browser/selectors.py`:\n")
        for tool, p in to_fix:
            tried = ", ".join(f"`{s}`" for s in p.counts)
            lines.append(f"- **{tool} → {p.label}**: tried {tried}")
        lines.append("")

    md_path = artifacts_dir / "report.md"
    md_path.write_text("\n".join(lines), encoding="utf-8")
    (artifacts_dir / "report.json").write_text(
        json.dumps(
            {"generated": ts, "target": base_url, "overall_success_rate": overall_rate,
             "counts": counts, "gate": gate, "results": [r.to_dict() for r in results]},
            indent=2),
        encoding="utf-8")
    return md_path


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Validate Fiverr Agent MCP tools against the live Fiverr site.")
    p.add_argument("--artifacts", default=None,
                   help="Output directory (default: ./validation-artifacts/<timestamp>).")
    p.add_argument("--headless", action="store_true",
                   help="Run headless (default: headful, recommended for first login).")
    p.add_argument("--only", default=None,
                   help="Comma-separated tool names to validate (default: all).")
    p.add_argument("--conversation-id", default=None,
                   help="Inbox thread id for read/compose/offer checks and the optional test send.")
    p.add_argument("--order-id", default=None, help="Order id to validate the order detail page.")
    p.add_argument("--gig-id", default=None, help="Real gig id to validate gig detail/edit flows.")
    p.add_argument("--baseline", default=None,
                   help="Path to a prior report.json to detect DOM changes against.")
    p.add_argument("--send-test-message", action="store_true",
                   help="Actually send ONE real message (requires --live and --conversation-id).")
    p.add_argument("--test-text", default="✅ Fiverr Agent MCP live validation — please ignore.",
                   help="Text for the optional real test message.")
    p.add_argument("--live", action="store_true",
                   help="Confirmation flag required to perform the single real test send.")
    return p.parse_args(argv)


async def _amain(args: argparse.Namespace) -> int:
    configure_logging()
    artifacts = Path(args.artifacts) if args.artifacts else (
        Path("validation-artifacts") / datetime.now().strftime("%Y%m%d-%H%M%S"))
    only = {s.strip() for s in args.only.split(",")} if args.only else None
    baseline = None
    if args.baseline:
        try:
            baseline = load_baseline(Path(args.baseline))
        except Exception as exc:
            logger.warning("Could not load baseline %s: %s", args.baseline, exc)
    validator = LiveValidator(artifacts, headless=args.headless, only=only, baseline=baseline)
    try:
        await validator.run_all(args)
    except Exception as exc:  # never lose the partial report
        logger.exception("Validation run aborted early")
        validator.results.append(CheckResult(
            tool="run", group="Harness", status=BLOCKED,
            notes=[f"run aborted: {type(exc).__name__}: {exc}"]))
    finally:
        await validator.teardown()

    md = write_reports(validator.results, artifacts, validator._settings.base_url)
    gate = evaluate_gate(validator.results)
    print(f"\nGo-Live Gate: {'🟢 GO' if gate['go'] else '🔴 NO-GO'} — {gate['reason']}")
    print(f"Tier 1 ready: {gate['tier1_ready']}/{gate['tier1_total']} · "
          f"FIVERR_DRY_RUN=false permitted: {'YES' if gate['allow_dry_run_false'] else 'NO'}")
    print(f"Report:      {md}")
    print(f"Screenshots: {artifacts}")
    needs_fix = [r.tool for r in validator.results if r.status == NEEDS_FIX]
    if needs_fix:
        print(f"Needs fix:   {', '.join(needs_fix)}")
    return 0 if gate["go"] else 2


def main(argv: list[str] | None = None) -> None:
    """CLI entry point. Exit code 0 when the Tier-1 gate passes, else 2."""
    raise SystemExit(asyncio.run(_amain(_parse_args(argv))))


if __name__ == "__main__":
    main()

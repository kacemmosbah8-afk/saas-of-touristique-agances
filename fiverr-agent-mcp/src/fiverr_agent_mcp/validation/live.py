"""Live-validation harness against the real Fiverr website.

Walks each tool group, navigates the real pages, probes every selector variant,
screenshots each step, and writes a compatibility report. **Safe by design**:

* No write is ever performed unless you explicitly pass ``--send-test-message``
  together with ``--live`` and a ``--conversation-id`` you designate — and even
  then only a single text message to *that* thread. Offers and gigs are never
  created; their write flows are validated only up to (not including) the submit
  control.
* Intended to run on *your* machine, headful, so you can clear any Fiverr
  login/anti-bot challenge yourself.

Run: ``fiverr-agent-mcp-validate`` or ``python -m fiverr_agent_mcp.validation``.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from ..browser import selectors as sel
from ..browser.manager import BrowserManager
from ..config import Settings, get_settings
from ..exceptions import FiverrAgentError, NavigationError, SessionExpiredError
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


@dataclass
class CheckResult:
    """Result of validating one tool against the live site."""

    tool: str
    group: str
    status: str
    probes: list[ProbeResult] = field(default_factory=list)
    required_labels: list[str] = field(default_factory=list)
    screenshot: str | None = None
    notes: list[str] = field(default_factory=list)
    is_write: bool = False

    @property
    def missing(self) -> list[str]:
        req = set(self.required_labels)
        return [p.label for p in self.probes if p.label in req and not p.found]

    def to_dict(self) -> dict:
        return {
            "tool": self.tool,
            "group": self.group,
            "status": self.status,
            "is_write": self.is_write,
            "screenshot": self.screenshot,
            "required_labels": self.required_labels,
            "missing": self.missing,
            "notes": self.notes,
            "probes": [p.to_dict() for p in self.probes],
        }


class LiveValidator:
    """Drives a real browser session and validates each tool.

    Args:
        artifacts_dir: Where screenshots and the report are written.
        headless: Run the browser headless (default False for first-run login).
        only: Optional set of tool names to restrict to.
    """

    def __init__(
        self,
        artifacts_dir: Path,
        headless: bool = False,
        only: set[str] | None = None,
    ) -> None:
        self.artifacts_dir = artifacts_dir
        self.only = only
        self.results: list[CheckResult] = []
        self._step = 0

        os.environ["FIVERR_HEADLESS"] = "true" if headless else "false"
        get_settings.cache_clear()
        self._settings: Settings = get_settings()
        self._manager = BrowserManager(self._settings)
        self._client: FiverrClient | None = None

    # -- lifecycle -------------------------------------------------------- #
    async def setup(self) -> CheckResult:
        """Start the browser and confirm an authenticated session.

        Any failure to launch the browser or reach Fiverr is recorded as a
        BLOCKED result (with a hint) rather than crashing the run, so a report is
        always produced.
        """
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        try:
            self._client = await self._manager.client()
            status = await self._client.verify_logged_in()
        except FiverrAgentError as exc:
            hint = f" ({exc.hint})" if exc.hint else ""
            result = CheckResult(
                tool="login / verify_logged_in",
                group="Account",
                status=BLOCKED,
                notes=[f"could not start session: {exc.code}: {exc.message}{hint}"],
            )
            self.results.append(result)
            return result
        notes = [f"login method: {status.method}", f"username: {status.username or '?'}"]
        if not status.logged_in:
            if self._settings.has_credentials():
                notes.append("No active session; attempting credential login…")
                try:
                    status = await self._client.login()
                    notes.append(f"credential login: {status.logged_in}")
                except FiverrAgentError as exc:
                    notes.append(f"login failed: {exc.code}: {exc.message}")
        shot = await self._screenshot("login")
        result = CheckResult(
            tool="login / verify_logged_in",
            group="Account",
            status=PRODUCTION_READY if status.logged_in else BLOCKED,
            required_labels=["logged-in marker"],
            probes=[await self._probe("logged-in marker", sel.LOGGED_IN_MARKERS)],
            screenshot=shot,
            notes=notes,
        )
        self.results.append(result)
        return result

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

    async def _screenshot(self, name: str) -> str | None:
        self._step += 1
        path = self.artifacts_dir / f"{self._step:02d}_{name}.png"
        try:
            await self.page.screenshot(path=str(path), full_page=True)
            return path.name
        except Exception as exc:  # pragma: no cover - screenshot best-effort
            logger.warning("Screenshot '%s' failed: %s", name, exc)
            return None

    async def _probe(self, label: str, variants: list[str]) -> ProbeResult:
        return await probe_selectors(self.page, label, variants)

    def _selected(self, tool: str) -> bool:
        return self.only is None or tool in self.only

    async def _page_check(
        self,
        tool: str,
        group: str,
        path: str,
        required: dict[str, list[str]],
        optional: dict[str, list[str]] | None = None,
        is_write: bool = False,
        path_kwargs: dict | None = None,
        note: str | None = None,
    ) -> CheckResult | None:
        """Navigate to ``path``, screenshot, probe selectors, record a result."""
        if not self._selected(tool):
            return None
        notes: list[str] = [note] if note else []
        status = PRODUCTION_READY
        try:
            await self.client.goto_path(path, **(path_kwargs or {}))
        except SessionExpiredError as exc:
            notes.append(f"session expired during navigation: {exc.message}")
            status = BLOCKED
        except NavigationError as exc:
            notes.append(f"navigation failed: {exc.message}")
            status = BLOCKED

        shot = await self._screenshot(tool)
        probes: list[ProbeResult] = []
        if status != BLOCKED:
            for label, variants in required.items():
                probes.append(await self._probe(label, variants))
            for label, variants in (optional or {}).items():
                probes.append(await self._probe(label, variants))
            if any(not p.found for p in probes if p.label in required):
                status = NEEDS_FIX

        result = CheckResult(
            tool=tool,
            group=group,
            status=status,
            probes=probes,
            required_labels=list(required),
            screenshot=shot,
            notes=notes,
            is_write=is_write,
        )
        self.results.append(result)
        return result

    # -- individual checks ------------------------------------------------ #
    async def check_inbox(self) -> None:
        await self._page_check(
            "list_messages", "Inbox", sel.PATH_INBOX,
            required={"conversation rows": sel.CONVERSATION_ROWS},
            optional={"contact name": sel.CONVERSATION_CONTACT,
                      "snippet": sel.CONVERSATION_SNIPPET,
                      "unread badge": sel.CONVERSATION_UNREAD},
        )

    async def check_read_message(self, conversation_id: str | None) -> None:
        if not self._selected("read_message"):
            return
        conv = conversation_id or await self._first_conversation_id()
        if not conv:
            self.results.append(CheckResult(
                "read_message", "Inbox", SKIPPED,
                notes=["No conversation available; pass --conversation-id to test."]))
            return
        await self._page_check(
            "read_message", "Inbox", sel.PATH_CONVERSATION,
            required={"message items": sel.MESSAGE_ITEMS},
            optional={"message body": sel.MESSAGE_BODY},
            path_kwargs={"conversation_id": conv},
            note=f"conversation: {conv}",
        )

    async def check_send_message_flow(self, conversation_id: str | None) -> None:
        if not self._selected("send_message"):
            return
        conv = conversation_id or await self._first_conversation_id()
        if not conv:
            self.results.append(CheckResult(
                "send_message", "Inbox", SKIPPED, is_write=True,
                notes=["No conversation available; pass --conversation-id to test the compose flow."]))
            return
        await self._page_check(
            "send_message", "Inbox", sel.PATH_CONVERSATION,
            required={"message input": sel.MESSAGE_INPUT, "send button": sel.SEND_BUTTON},
            optional={"archive button": sel.ARCHIVE_BUTTON},
            is_write=True,
            path_kwargs={"conversation_id": conv},
            note="Dry-run: located compose + send controls; nothing was sent.",
        )

    async def check_notifications(self) -> None:
        await self._page_check(
            "list_notifications", "Notifications", sel.PATH_NOTIFICATIONS,
            required={"notification rows": sel.NOTIFICATION_ROWS},
            optional={"notification text": sel.NOTIFICATION_TEXT,
                      "mark-read button": sel.MARK_READ_BUTTON},
        )

    async def check_gigs(self) -> None:
        if not self._selected("list_gigs"):
            return
        try:
            username = await self.client.current_username()
        except FiverrAgentError as exc:
            self.results.append(CheckResult(
                "list_gigs", "Gigs", BLOCKED, notes=[f"username unavailable: {exc.message}"]))
            return
        await self._page_check(
            "list_gigs", "Gigs", sel.PATH_GIGS,
            required={"gig rows": sel.GIG_ROWS},
            optional={"gig title": sel.GIG_TITLE, "gig status": sel.GIG_STATUS,
                      "row menu": sel.GIG_ROW_MENU},
            path_kwargs={"username": username},
        )

    async def check_create_gig_flow(self) -> None:
        await self._page_check(
            "create_gig", "Gigs", sel.PATH_GIG_CREATE,
            required={"gig title input": sel.GIG_TITLE_INPUT},
            optional={"gig description input": sel.GIG_DESCRIPTION_INPUT},
            is_write=True,
            note="Dry-run: located the create-gig fields; no gig was created.",
        )

    async def check_edit_gig_flow(self, gig_id: str | None) -> None:
        if not self._selected("update_gig"):
            return
        if not gig_id:
            self.results.append(CheckResult(
                "update_gig", "Gigs", SKIPPED, is_write=True,
                notes=["Pass --gig-id <real gig id> to validate the edit-draft flow."]))
            return
        await self._page_check(
            "update_gig", "Gigs", sel.PATH_GIG_DETAIL,
            required={"gig title input": sel.GIG_TITLE_INPUT + sel.GIG_TITLE},
            optional={"gig description input": sel.GIG_DESCRIPTION_INPUT},
            is_write=True,
            path_kwargs={"gig_id": gig_id},
            note=f"Dry-run: opened gig {gig_id} edit page; no changes saved.",
        )

    async def check_orders(self) -> None:
        await self._page_check(
            "list_orders", "Orders", sel.PATH_ORDERS,
            required={"order rows": sel.ORDER_ROWS},
            optional={"order id": sel.ORDER_ID, "order status": sel.ORDER_STATUS,
                      "order due": sel.ORDER_DUE},
        )

    async def check_send_offer_flow(self) -> None:
        if not self._selected("send_offer"):
            return
        try:
            username = await self.client.current_username()
        except FiverrAgentError as exc:
            self.results.append(CheckResult(
                "send_offer", "Leads", BLOCKED, is_write=True,
                notes=[f"username unavailable: {exc.message}"]))
            return
        await self._page_check(
            "send_offer", "Leads", sel.PATH_BUYER_REQUESTS,
            required={"lead rows": sel.LEAD_ROWS},
            optional={"lead title": sel.LEAD_TITLE, "send-offer button": sel.SEND_OFFER_BUTTON},
            is_write=True,
            path_kwargs={"username": username},
            note=("Dry-run: located buyer-request rows + send-offer control; no offer was sent. "
                  "NOTE: Fiverr has largely retired public Buyer Requests — if this page is empty "
                  "or 404s, that reflects Fiverr, not a selector bug."),
        )

    async def check_analytics(self) -> None:
        await self._page_check(
            "read_analytics", "Analytics", sel.PATH_ANALYTICS,
            required={"metric cards": sel.METRIC_CARDS},
            optional={"metric label": sel.METRIC_LABEL, "metric value": sel.METRIC_VALUE,
                      "export button": sel.EXPORT_BUTTON},
        )

    # -- optional real write (guarded) ----------------------------------- #
    async def send_test_message(self, conversation_id: str, text: str) -> None:
        """Actually send ONE real message to the designated thread (guarded)."""
        notes = [f"LIVE send to conversation {conversation_id}"]
        status = PRODUCTION_READY
        try:
            await self.client.goto_path(sel.PATH_CONVERSATION, conversation_id=conversation_id)
            box = self.page.locator(", ".join(sel.MESSAGE_INPUT)).first
            await box.fill(text)
            await self.page.locator(", ".join(sel.SEND_BUTTON)).first.click()
            notes.append("message sent")
        except Exception as exc:
            status = NEEDS_FIX
            notes.append(f"send failed: {type(exc).__name__}: {exc}")
        shot = await self._screenshot("send_message_LIVE")
        self.results.append(CheckResult(
            "send_message (LIVE)", "Inbox", status,
            required_labels=[], screenshot=shot, notes=notes, is_write=True))

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

    async def run_all(self, args: argparse.Namespace) -> None:
        """Run the full validation sequence."""
        setup = await self.setup()
        if setup.status == BLOCKED:
            logger.error("Not logged in — cannot validate authenticated tools.")
            return
        await self.check_inbox()
        await self.check_read_message(args.conversation_id)
        await self.check_send_message_flow(args.conversation_id)
        await self.check_notifications()
        await self.check_gigs()
        await self.check_create_gig_flow()
        await self.check_edit_gig_flow(args.gig_id)
        await self.check_orders()
        await self.check_send_offer_flow()
        await self.check_analytics()
        if args.send_test_message:
            if args.live and args.conversation_id:
                await self.send_test_message(args.conversation_id, args.test_text)
            else:
                self.results.append(CheckResult(
                    "send_message (LIVE)", "Inbox", SKIPPED, is_write=True,
                    notes=["--send-test-message requires --live and --conversation-id."]))


# --------------------------------------------------------------------------- #
# Report writers
# --------------------------------------------------------------------------- #
_STATUS_LABEL = {
    PRODUCTION_READY: "✅ Production Ready",
    NEEDS_FIX: "⚠️ Needs Fix",
    BLOCKED: "⛔ Blocked",
    SKIPPED: "⏭️ Skipped",
}


def write_reports(results: list[CheckResult], artifacts_dir: Path, base_url: str) -> Path:
    """Write ``report.md`` and ``report.json``; return the markdown path."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    counts = {k: sum(1 for r in results if r.status == k) for k in _STATUS_LABEL}

    lines: list[str] = []
    lines.append("# Fiverr Agent MCP — Live Compatibility Report\n")
    lines.append(f"Generated: {ts}  ·  Target: {base_url}\n")
    lines.append(
        f"**Summary:** {counts[PRODUCTION_READY]} production-ready · "
        f"{counts[NEEDS_FIX]} need fixes · {counts[BLOCKED]} blocked · "
        f"{counts[SKIPPED]} skipped\n"
    )
    lines.append("> A tool is marked **Production Ready** only when all its required "
                 "selectors matched live DOM nodes. **Needs Fix** means at least one "
                 "required selector matched nothing (see the per-tool detail).\n")

    lines.append("## Overview\n")
    lines.append("| Tool | Group | Write? | Status | Missing selectors |")
    lines.append("| --- | --- | --- | --- | --- |")
    for r in results:
        miss = ", ".join(r.missing) if r.missing else "—"
        lines.append(
            f"| `{r.tool}` | {r.group} | {'yes' if r.is_write else 'no'} | "
            f"{_STATUS_LABEL.get(r.status, r.status)} | {miss} |"
        )
    lines.append("")

    lines.append("## Per-tool detail\n")
    for r in results:
        lines.append(f"### `{r.tool}` — {_STATUS_LABEL.get(r.status, r.status)}\n")
        if r.screenshot:
            lines.append(f"![screenshot]({r.screenshot})\n")
        for note in r.notes:
            lines.append(f"- _note:_ {note}")
        if r.probes:
            lines.append("\n| Element | Matched selector | Nodes |")
            lines.append("| --- | --- | --- |")
            for p in r.probes:
                req = " *(required)*" if p.label in r.required_labels else ""
                matched = f"`{p.matched}`" if p.matched else "**none matched**"
                lines.append(f"| {p.label}{req} | {matched} | {p.match_count} |")
        lines.append("")

    # Actionable: selectors to fix
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
    json_path = artifacts_dir / "report.json"
    json_path.write_text(
        json.dumps(
            {"generated": ts, "target": base_url, "counts": counts,
             "results": [r.to_dict() for r in results]},
            indent=2,
        ),
        encoding="utf-8",
    )
    return md_path


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Validate Fiverr Agent MCP tools against the live Fiverr site.",
    )
    p.add_argument("--artifacts", default=None,
                   help="Output directory (default: ./validation-artifacts/<timestamp>).")
    p.add_argument("--headless", action="store_true",
                   help="Run headless (default: headful, recommended for first login).")
    p.add_argument("--only", default=None,
                   help="Comma-separated tool names to validate (default: all).")
    p.add_argument("--conversation-id", default=None,
                   help="Inbox thread id to use for read/compose checks and the optional test send.")
    p.add_argument("--gig-id", default=None,
                   help="Real gig id to validate the edit-draft flow.")
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
        Path("validation-artifacts") / datetime.now().strftime("%Y%m%d-%H%M%S")
    )
    only = {s.strip() for s in args.only.split(",")} if args.only else None
    validator = LiveValidator(artifacts_dir=artifacts, headless=args.headless, only=only)
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
    ready = sum(1 for r in validator.results if r.status == PRODUCTION_READY)
    total = len(validator.results)
    print(f"\nValidation complete: {ready}/{total} checks production-ready.")
    print(f"Report:      {md}")
    print(f"Screenshots: {artifacts}")
    needs_fix = [r.tool for r in validator.results if r.status == NEEDS_FIX]
    if needs_fix:
        print(f"Needs fix:   {', '.join(needs_fix)}")
    return 0


def main(argv: list[str] | None = None) -> None:
    """CLI entry point."""
    args = _parse_args(argv)
    raise SystemExit(asyncio.run(_amain(args)))


if __name__ == "__main__":
    main()

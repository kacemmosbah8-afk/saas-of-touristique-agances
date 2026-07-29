"""Smoke test & small CLI utilities.

Run ``fiverr-agent-mcp-smoke`` (or ``python -m fiverr_agent_mcp.smoke``) to verify
the whole server wires up correctly *without* touching Fiverr or launching a
browser:

* every tool module imports and registers,
* the expected tool set is present,
* configuration loads,
* the AI heuristics produce sane output.

Flags:
    --gen-key      Print a fresh FIVERR_SESSION_KEY and exit.
    --list-tools   Print the registered tool names and exit.
    --json         Emit machine-readable JSON.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

EXPECTED_TOOLS = {
    # inbox
    "list_messages", "read_message", "send_message", "reply_to_message", "archive_message",
    # leads
    "list_available_leads", "analyze_lead", "generate_proposal", "send_offer",
    # orders
    "list_orders", "open_order", "read_requirements", "send_order_message",
    "deliver_order", "request_extension", "cancel_order_request",
    # gigs
    "list_gigs", "open_gig", "create_gig", "update_gig", "pause_gig", "activate_gig", "delete_draft",
    # analytics
    "read_dashboard", "read_conversion_rate", "read_impressions", "read_clicks",
    "read_orders", "export_statistics",
    # notifications
    "list_notifications", "open_notification", "mark_as_read",
    # account
    "login", "logout", "verify_logged_in", "save_session", "restore_session",
    # ai
    "analyze_client", "estimate_win_probability", "score_lead", "suggest_price",
    "rewrite_proposal", "improve_reply", "detect_spam", "summarize_conversation",
}


async def _registered_tool_names() -> set[str]:
    from . import tools  # noqa: F401  (registers tools)
    from .core.mcp_app import mcp

    tool_list = await mcp.list_tools()
    return {t.name for t in tool_list}


def _check_heuristics() -> list[str]:
    """Run the offline heuristics and return any failures."""
    from .ai import detect_spam, score_lead, suggest_price
    from .models import Lead

    failures: list[str] = []
    spam = detect_spam("Contact me on WhatsApp and pay outside Fiverr with gift cards")
    if not spam.is_spam:
        failures.append("detect_spam failed to flag an obvious scam")

    good = score_lead(Lead(lead_id="1", title="Long-term work",
                           description="Looking for an ongoing, professional partner. Budget $500.",
                           budget="$500"))
    if good.score < 55:
        failures.append(f"score_lead scored a strong lead too low ({good.score})")

    price = suggest_price("A big urgent website project", base_price=100, complexity="high")
    if not (price.low < price.recommended < price.high):
        failures.append("suggest_price produced an inconsistent range")
    return failures


async def _run_smoke() -> dict:
    from .config import get_settings

    result: dict = {"ok": True, "checks": {}}

    names = await _registered_tool_names()
    missing = sorted(EXPECTED_TOOLS - names)
    result["checks"]["tools_registered"] = len(names)
    result["checks"]["missing_tools"] = missing
    if missing:
        result["ok"] = False

    try:
        settings = get_settings()
        result["checks"]["config_loaded"] = True
        result["checks"]["has_credentials"] = settings.has_credentials()
        result["checks"]["session_encryption"] = bool(settings.session_key)
    except Exception as exc:  # pragma: no cover
        result["ok"] = False
        result["checks"]["config_loaded"] = False
        result["checks"]["config_error"] = str(exc)

    heuristic_failures = _check_heuristics()
    result["checks"]["heuristics_ok"] = not heuristic_failures
    if heuristic_failures:
        result["ok"] = False
        result["checks"]["heuristic_failures"] = heuristic_failures

    return result


def main() -> None:
    """CLI entry point for the smoke test and helper flags."""
    parser = argparse.ArgumentParser(description="Fiverr Agent MCP smoke test.")
    parser.add_argument("--gen-key", action="store_true", help="Print a new session encryption key.")
    parser.add_argument("--list-tools", action="store_true", help="List registered tool names.")
    parser.add_argument("--json", action="store_true", help="Emit JSON output.")
    args = parser.parse_args()

    if args.gen_key:
        from .security.crypto import generate_key

        print(generate_key())
        return

    if args.list_tools:
        names = sorted(asyncio.run(_registered_tool_names()))
        if args.json:
            print(json.dumps(names, indent=2))
        else:
            for name in names:
                print(name)
        return

    result = asyncio.run(_run_smoke())
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        status = "PASS" if result["ok"] else "FAIL"
        print(f"[{status}] Fiverr Agent MCP smoke test")
        for key, value in result["checks"].items():
            print(f"  - {key}: {value}")
    sys.exit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()

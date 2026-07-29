"""Command-line interface for the Sales Agent.

Read/analysis commands never send. The ``approve-*`` commands relay an explicit
approval to the MCP (which still enforces DRY_RUN / confirmation).

Examples::

    fiverr-sales-agent inbox
    fiverr-sales-agent analyze <conversation_id>
    fiverr-sales-agent dashboard
    fiverr-sales-agent daily
    fiverr-sales-agent approve-offer <conversation_id> --price 150 --days 4 \
        --title "Custom logo" --description "..."
"""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any

from .agent import SalesAgent
from .models import OfferPreview


def _print(obj: Any) -> None:
    if hasattr(obj, "model_dump"):
        obj = obj.model_dump()
    elif isinstance(obj, list):
        obj = [o.model_dump() if hasattr(o, "model_dump") else o for o in obj]
    print(json.dumps(obj, indent=2, default=str))


async def _run(args: argparse.Namespace) -> int:
    agent = SalesAgent()
    cmd = args.command

    if cmd == "inbox":
        _print(await agent.review_inbox(limit=args.limit, unread_only=not args.all))
    elif cmd == "analyze":
        _print(await agent.analyze_conversation(args.conversation_id))
    elif cmd == "dashboard":
        _print(await agent.build_dashboard())
    elif cmd == "daily":
        _print(await agent.daily_brief())
    elif cmd == "status":
        _print(await agent.gateway.safety_status())
    elif cmd == "approve-reply":
        _print(await agent.approve_reply(args.conversation_id, args.text))
    elif cmd == "approve-offer":
        preview = OfferPreview(
            conversation_id=args.conversation_id, title=args.title, description=args.description,
            price=args.price, delivery_days=args.days, revisions=args.revisions,
        )
        _print(await agent.approve_offer(preview, confirm=True))
    else:  # pragma: no cover
        return 2
    return 0


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="fiverr-sales-agent", description="Autonomous Fiverr sales agent.")
    sub = p.add_subparsers(dest="command", required=True)

    pi = sub.add_parser("inbox", help="Rank inbox opportunities (no sending).")
    pi.add_argument("--limit", type=int, default=20)
    pi.add_argument("--all", action="store_true", help="Include read conversations.")

    pa = sub.add_parser("analyze", help="Full analysis of one conversation (no sending).")
    pa.add_argument("conversation_id")

    sub.add_parser("dashboard", help="Build the sales dashboard.")
    sub.add_parser("daily", help="Generate the daily brief.")
    sub.add_parser("status", help="Show MCP safety/production status.")

    pr = sub.add_parser("approve-reply", help="Send an approved reply (via the MCP).")
    pr.add_argument("conversation_id")
    pr.add_argument("text")

    po = sub.add_parser("approve-offer", help="Send an approved Custom Offer (via the MCP).")
    po.add_argument("conversation_id")
    po.add_argument("--title", required=True)
    po.add_argument("--description", required=True)
    po.add_argument("--price", type=float, required=True)
    po.add_argument("--days", type=int, required=True)
    po.add_argument("--revisions", type=int, default=2)
    return p


def main(argv: list[str] | None = None) -> None:
    """CLI entry point."""
    args = _parser().parse_args(argv)
    raise SystemExit(asyncio.run(_run(args)))


if __name__ == "__main__":
    main()

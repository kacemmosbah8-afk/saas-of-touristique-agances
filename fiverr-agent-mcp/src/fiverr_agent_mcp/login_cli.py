"""Standalone CLI for the very first (or any manual) Fiverr login.

Run ``fiverr-agent-mcp-login`` directly in a real terminal — not via a
``python - <<EOF`` heredoc. A heredoc feeds the whole script through stdin, so
by the time it runs there is nothing left for an interactive prompt to read;
this command needs a live TTY so :meth:`FiverrClient.login` can pause
(browser left open) for manual CAPTCHA/2FA resolution instead of aborting.

Recommended for a first login: set ``FIVERR_HEADLESS=false`` so you can watch
the browser and solve any challenge yourself.
"""

from __future__ import annotations

import asyncio


async def _amain() -> int:
    from .browser import get_client, shutdown_client

    client = await get_client()
    try:
        status = await client.login()
        print(status)
        return 0 if status.logged_in else 1
    finally:
        # Persists the session (if one was established) and always closes the
        # browser on the way out — success, failure, or explicit abort alike.
        await shutdown_client()


def main() -> None:
    """CLI entry point: ``fiverr-agent-mcp-login``."""
    raise SystemExit(asyncio.run(_amain()))


if __name__ == "__main__":
    main()

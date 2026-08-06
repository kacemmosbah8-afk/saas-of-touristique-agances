"""``python -m fiverr_agent_mcp`` entry point."""

from __future__ import annotations

from .server import run


def main() -> None:
    """Console-script / module entry point."""
    run()


if __name__ == "__main__":
    main()

"""Structured, redaction-safe logging configuration.

* Logs go to **stderr** (stdout is reserved for the MCP stdio transport).
* Every handler carries a :class:`RedactingFilter` so secrets can't leak.
* Set ``FIVERR_LOG_JSON=true`` for machine-readable JSON lines.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

from .config import get_settings
from .security.redaction import RedactingFilter

_CONFIGURED = False


class _JsonFormatter(logging.Formatter):
    """Minimal JSON line formatter."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(force: bool = False) -> None:
    """Configure the root ``fiverr_agent_mcp`` logger exactly once.

    Args:
        force: Reconfigure even if already configured (used in tests).
    """
    global _CONFIGURED
    if _CONFIGURED and not force:
        return

    settings = get_settings()
    logger = logging.getLogger("fiverr_agent_mcp")
    logger.setLevel(settings.log_level)
    logger.handlers.clear()
    logger.propagate = False

    handler = logging.StreamHandler(stream=sys.stderr)
    handler.setLevel(settings.log_level)
    if settings.log_json:
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
    handler.addFilter(RedactingFilter())
    logger.addHandler(handler)
    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced child logger, configuring logging on first use.

    Args:
        name: Dotted suffix, e.g. ``"browser.manager"``.
    """
    configure_logging()
    return logging.getLogger(f"fiverr_agent_mcp.{name}")

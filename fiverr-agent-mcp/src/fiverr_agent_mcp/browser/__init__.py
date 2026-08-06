"""Browser automation layer built on Playwright.

Public entry points:

* :class:`BrowserManager` — owns the Playwright lifecycle and a single context.
* :class:`FiverrClient` — page-object exposing high-level Fiverr operations.
* :func:`get_client` — process-wide accessor used by the tool layer.
"""

from __future__ import annotations

from .client import FiverrClient
from .manager import BrowserManager, get_client, shutdown_client
from .session import SessionStore

__all__ = [
    "BrowserManager",
    "FiverrClient",
    "SessionStore",
    "get_client",
    "shutdown_client",
]

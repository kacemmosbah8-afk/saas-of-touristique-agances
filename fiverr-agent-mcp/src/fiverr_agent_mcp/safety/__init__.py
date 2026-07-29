"""Production safeguards: confirmation, rate limiting, audit, kill switch,
session health, retry policy, metrics, and the mode banner.

Public surface:

* :func:`safeguard` — decorator applied to every tool body.
* :func:`get_safety` / :func:`reset_safety` — the process-wide manager.
* :data:`policy` — tool risk classification.
"""

from __future__ import annotations

from . import policy
from .guard import safeguard
from .manager import SafetyManager, get_safety, reset_safety

__all__ = ["safeguard", "SafetyManager", "get_safety", "reset_safety", "policy"]

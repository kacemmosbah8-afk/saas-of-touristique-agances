"""In-memory metrics collector.

Aggregates across safeguarded tool calls: total actions, failures, average
execution time, selector failure rate, CAPTCHA count, and a per-tool breakdown.
Exposed via the ``metrics`` tool.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

# Outcomes that actually executed the tool body (count toward timing/success).
_EXECUTED = {"ok", "error"}


@dataclass
class Metrics:
    """Mutable metrics accumulator for the process lifetime."""

    total_actions: int = 0
    executed: int = 0
    ok: int = 0
    failed: int = 0
    blocked: int = 0
    selector_failures: int = 0
    captcha_count: int = 0
    total_duration_s: float = 0.0
    by_tool: Counter = field(default_factory=Counter)
    by_outcome: Counter = field(default_factory=Counter)

    def record(
        self,
        tool: str,
        duration_s: float,
        outcome: str,
        *,
        selector_failure: bool = False,
        captcha: bool = False,
    ) -> None:
        """Record one tool invocation.

        Args:
            tool: Tool name.
            duration_s: Wall time of the executed body (0 for blocked calls).
            outcome: One of 'ok', 'error', 'blocked', 'dry_run', 'confirmation'.
            selector_failure: True if the failure was a missing selector.
            captcha: True if a CAPTCHA/anti-bot challenge was detected.
        """
        self.total_actions += 1
        self.by_tool[tool] += 1
        self.by_outcome[outcome] += 1
        if outcome in _EXECUTED:
            self.executed += 1
            self.total_duration_s += max(0.0, duration_s)
            if outcome == "ok":
                self.ok += 1
            else:
                self.failed += 1
        else:
            self.blocked += 1
        if selector_failure:
            self.selector_failures += 1
        if captcha:
            self.captcha_count += 1

    def snapshot(self) -> dict:
        """Return a JSON-serializable metrics summary."""
        avg_ms = round(1000.0 * self.total_duration_s / self.executed, 1) if self.executed else 0.0
        sel_rate = round(self.selector_failures / self.executed, 3) if self.executed else 0.0
        success_rate = round(self.ok / self.executed, 3) if self.executed else 0.0
        return {
            "total_actions": self.total_actions,
            "executed_actions": self.executed,
            "failed_actions": self.failed,
            "blocked_actions": self.blocked,
            "success_rate": success_rate,
            "average_execution_ms": avg_ms,
            "selector_failure_rate": sel_rate,
            "selector_failures": self.selector_failures,
            "captcha_count": self.captcha_count,
            "by_tool": dict(self.by_tool),
            "by_outcome": dict(self.by_outcome),
        }

"""Live-validation harness.

Run against your OWN Fiverr account, on your OWN machine, to verify every tool's
selectors against the real, current Fiverr DOM — capturing screenshots and a
compatibility report. Nothing is sent or created: write flows stop at the submit
control, and an optional real test message only goes to a thread you designate.

Entry point: ``fiverr-agent-mcp-validate`` (or ``python -m
fiverr_agent_mcp.validation``).
"""

from __future__ import annotations

from .probe import ProbeResult, probe_selectors, selector_confidence

__all__ = ["ProbeResult", "probe_selectors", "selector_confidence"]

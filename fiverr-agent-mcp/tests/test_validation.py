"""Tests for the live-validation harness (browser mocked)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

from fiverr_agent_mcp.validation.live import (
    BLOCKED,
    NEEDS_FIX,
    PRODUCTION_READY,
    CheckResult,
    write_reports,
)
from fiverr_agent_mcp.validation.probe import probe_selectors


class _FakePage:
    """Fake page where selectors in ``present`` report a match count."""

    def __init__(self, present: dict[str, int]):
        self._present = present

    def locator(self, selector: str):
        count = self._present.get(selector, 0)
        return SimpleNamespace(count=AsyncMock(return_value=count))


async def test_probe_reports_first_match():
    page = _FakePage({"a": 0, "b": 3, "c": 1})
    result = await probe_selectors(page, "rows", ["a", "b", "c"])
    assert result.found is True
    assert result.matched == "b"
    assert result.match_count == 3
    assert result.counts == {"a": 0, "b": 3, "c": 1}


async def test_probe_no_match():
    page = _FakePage({})
    result = await probe_selectors(page, "rows", ["x", "y"])
    assert result.found is False
    assert result.matched is None
    assert result.match_count == 0


async def test_probe_survives_locator_errors():
    class Boom:
        def locator(self, selector):
            raise RuntimeError("bad selector")

    result = await probe_selectors(Boom(), "rows", ["z"])
    assert result.found is False
    assert result.counts == {"z": 0}


def test_check_result_missing_computes_required_gaps():
    from fiverr_agent_mcp.validation.probe import ProbeResult

    r = CheckResult(
        tool="list_orders",
        group="Orders",
        status=NEEDS_FIX,
        required_labels=["order rows"],
        probes=[
            ProbeResult("order rows", matched=None, counts={"a": 0}),
            ProbeResult("order id", matched="x", counts={"x": 2}),  # optional
        ],
    )
    assert r.missing == ["order rows"]


def test_write_reports_creates_files(tmp_path):
    from fiverr_agent_mcp.validation.probe import ProbeResult

    results = [
        CheckResult("list_messages", "Inbox", PRODUCTION_READY,
                    required_labels=["conversation rows"],
                    probes=[ProbeResult("conversation rows", "a[href^='/inbox/']", {"a[href^='/inbox/']": 5})],
                    screenshot="02_list_messages.png"),
        CheckResult("list_orders", "Orders", NEEDS_FIX,
                    required_labels=["order rows"],
                    probes=[ProbeResult("order rows", None, {"table tbody tr": 0})]),
        CheckResult("login", "Account", BLOCKED, notes=["not logged in"]),
    ]
    md = write_reports(results, tmp_path, "https://www.fiverr.com")
    assert md.exists()
    assert (tmp_path / "report.json").exists()

    text = md.read_text()
    assert "Live Compatibility Report" in text
    assert "Production Ready" in text
    assert "Selectors to fix" in text  # because list_orders needs fix
    assert "list_orders → order rows" in text

    import json
    data = json.loads((tmp_path / "report.json").read_text())
    assert data["counts"][PRODUCTION_READY] == 1
    assert data["counts"][NEEDS_FIX] == 1
    assert data["counts"][BLOCKED] == 1

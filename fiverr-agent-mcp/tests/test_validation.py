"""Tests for the live-validation harness (browser mocked)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

from fiverr_agent_mcp.validation.live import (
    BLOCKED,
    NEEDS_FIX,
    PRODUCTION_READY,
    TIER1_TOOLS,
    CheckResult,
    evaluate_gate,
    tier_of,
    write_reports,
)
from fiverr_agent_mcp.validation.probe import ProbeResult, probe_selectors, selector_confidence


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


def test_selector_confidence_tiers():
    assert selector_confidence('[data-testid="x"]', 1) == "high"
    assert selector_confidence('button:has-text("Send")', 1) == "medium"
    assert selector_confidence("table tbody tr", 5) == "low"
    assert selector_confidence("anything", 0) == "none"
    assert selector_confidence(None, 3) == "none"


def test_probe_result_exposes_confidence():
    p = ProbeResult("rows", '[data-testid="conv"]', {'[data-testid="conv"]': 4})
    assert p.confidence == "high"
    assert p.to_dict()["confidence"] == "high"


def test_success_rate_partial():
    r = CheckResult(
        "list_orders", "Orders", NEEDS_FIX, tier=1,
        required_labels=["a", "b"],
        probes=[ProbeResult("a", "x", {"x": 1}), ProbeResult("b", None, {"y": 0})],
    )
    assert r.success_rate == 50.0


def _ready(tool):
    return CheckResult(tool, "G", PRODUCTION_READY, tier=tier_of(tool),
                       required_labels=["m"], probes=[ProbeResult("m", "x", {"x": 1})])


def test_gate_go_when_all_tier1_ready():
    results = [_ready(t) for t in TIER1_TOOLS]
    gate = evaluate_gate(results)
    assert gate["go"] is True
    assert gate["allow_dry_run_false"] is True
    assert gate["tier1_ready"] == gate["tier1_total"]


def test_gate_nogo_when_tier1_missing():
    # Only a couple of Tier 1 tools validated.
    results = [_ready("login"), _ready("list_messages")]
    gate = evaluate_gate(results)
    assert gate["go"] is False
    assert gate["allow_dry_run_false"] is False
    assert "send_offer" in gate["tier1_missing"]


def test_gate_nogo_when_tier1_not_ready():
    results = [_ready(t) for t in TIER1_TOOLS if t != "send_offer"]
    results.append(CheckResult("send_offer", "Leads", NEEDS_FIX, tier=1,
                               required_labels=["create-offer button"],
                               probes=[ProbeResult("create-offer button", None, {"x": 0})]))
    gate = evaluate_gate(results)
    assert gate["go"] is False
    assert gate["tier1_not_ready"] == ["send_offer"]


def test_dom_change_detection_via_baseline(tmp_path):
    from fiverr_agent_mcp.validation.live import LiveValidator, load_baseline
    # Write a baseline report.json with a prior matched selector.
    baseline_results = [CheckResult("list_orders", "Orders", PRODUCTION_READY, tier=1,
                                    required_labels=["order rows"],
                                    probes=[ProbeResult("order rows", "table tbody tr", {"table tbody tr": 3})])]
    write_reports(baseline_results, tmp_path, "https://www.fiverr.com")
    baseline = load_baseline(tmp_path / "report.json")

    v = LiveValidator.__new__(LiveValidator)  # avoid launching a browser
    v.baseline = baseline
    # Same selector -> no change
    assert v._dom_changed("list_orders", [ProbeResult("order rows", "table tbody tr", {"x": 3})]) is False
    # Different selector -> change detected
    assert v._dom_changed("list_orders", [ProbeResult("order rows", "div.new", {"x": 1})]) is True
    # Unknown tool -> no baseline
    assert v._dom_changed("unknown", [ProbeResult("x", "y", {"y": 1})]) is None


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

"""Tests for the production safeguards."""

from __future__ import annotations

import pytest

from fiverr_agent_mcp.config import Settings, get_settings
from fiverr_agent_mcp.safety import policy, reset_safety
from fiverr_agent_mcp.safety.audit import AuditLogger, _sanitize
from fiverr_agent_mcp.safety.controls import EmergencyStop, SessionHealth
from fiverr_agent_mcp.safety.metrics import Metrics
from fiverr_agent_mcp.safety.rate_limiter import RateLimiter
from fiverr_agent_mcp.tools import leads, orders, safety_tools


def _settings(tmp_path, **kw) -> Settings:
    base = dict(FIVERR_STATE_DIR=str(tmp_path))
    base.update(kw)
    return Settings(**base)


# --- 1. Confirmation policy ------------------------------------------------- #
async def test_high_risk_requires_confirmation(monkeypatch, parse, fake_client):
    monkeypatch.setenv("FIVERR_AUTO_APPROVE", "false")
    get_settings.cache_clear()
    reset_safety()
    res = parse(await leads.send_offer(leads.SendOfferInput(
        conversation_id="buyer1", description="hi", price=100, delivery_days=3)))
    assert res["ok"] is False
    assert res["confirmation_required"] is True
    assert res["action"]["tool"] == "send_offer"
    # fake client must NOT have been called.
    fake_client.send_offer.assert_not_awaited()


async def test_confirm_true_proceeds(monkeypatch, parse, fake_client):
    monkeypatch.setenv("FIVERR_AUTO_APPROVE", "false")
    get_settings.cache_clear()
    reset_safety()
    res = parse(await leads.send_offer(leads.SendOfferInput(
        conversation_id="buyer1", description="hi", price=100, delivery_days=3, confirm=True)))
    assert res["ok"] is True
    fake_client.send_offer.assert_awaited()


async def test_auto_approve_skips_confirmation(parse, fake_client):
    # autouse fixture sets AUTO_APPROVE=true.
    res = parse(await orders.deliver_order(orders.DeliverOrderInput(
        order_id="FO1", message="done", files=[])))
    assert res["ok"] is True


# --- 2. Rate limiting ------------------------------------------------------- #
async def test_rate_limiter_per_minute_cap(tmp_path):
    s = _settings(tmp_path, FIVERR_MAX_ACTIONS_PER_MINUTE=2, FIVERR_MIN_ACTION_DELAY_S=0,
                  FIVERR_MAX_ACTION_DELAY_S=0)
    rl = RateLimiter(s, sleep=_noop, clock=lambda: 1000.0)
    await rl.acquire("send_message")
    await rl.acquire("send_message")
    from fiverr_agent_mcp.exceptions import RateLimitExceeded
    with pytest.raises(RateLimitExceeded):
        await rl.acquire("send_message")


async def test_rate_limiter_daily_cap_persists(tmp_path):
    from fiverr_agent_mcp.exceptions import RateLimitExceeded
    s = _settings(tmp_path, FIVERR_MAX_ACTIONS_PER_DAY=1, FIVERR_MIN_ACTION_DELAY_S=0,
                  FIVERR_MAX_ACTION_DELAY_S=0)
    rl = RateLimiter(s, sleep=_noop)
    await rl.acquire("send_message")
    # A fresh limiter reads the persisted daily count.
    rl2 = RateLimiter(s, sleep=_noop)
    with pytest.raises(RateLimitExceeded):
        await rl2.acquire("send_message")


async def test_rate_limiter_applies_delay(tmp_path):
    slept = []
    s = _settings(tmp_path, FIVERR_MIN_ACTION_DELAY_S=2, FIVERR_MAX_ACTION_DELAY_S=2)

    async def fake_sleep(d):
        slept.append(d)

    rl = RateLimiter(s, sleep=fake_sleep)
    delay = await rl.acquire("send_message")
    assert delay == 2.0
    assert slept == [2.0]


# --- 3. Audit log ----------------------------------------------------------- #
def test_audit_records_and_redacts(tmp_path):
    audit = AuditLogger(tmp_path / "audit.log")
    audit.record(tool="send_offer", outcome="ok", mode="LIVE", conversation_id="buyer1",
                 params={"description": "hi", "password": "secret"}, screenshots=["/x.png"],
                 duration_ms=12.3, is_write=True, high_risk=True)
    entries = audit.read_recent()
    assert len(entries) == 1
    e = entries[0]
    assert e["tool"] == "send_offer"
    assert e["conversation_id"] == "buyer1"
    assert e["params"]["password"] == "***REDACTED***"
    assert e["screenshots"] == ["/x.png"]
    assert e["ts"]  # timestamp present


def test_audit_sanitize_drops_sensitive():
    out = _sanitize({"token": "abc", "nested": {"cookie": "c", "ok": 1}})
    assert out["token"] == "***REDACTED***"
    assert out["nested"]["cookie"] == "***REDACTED***"
    assert out["nested"]["ok"] == 1


# --- 4. Emergency stop ------------------------------------------------------ #
def test_emergency_stop_engage_clear(tmp_path):
    es = EmergencyStop(_settings(tmp_path))
    assert es.engaged() is False
    es.engage("captcha")
    assert es.engaged() is True
    assert es.status()["reason"] == "captcha"
    assert es.clear() is True
    assert es.engaged() is False


def test_emergency_stop_env_switch(tmp_path):
    es = EmergencyStop(_settings(tmp_path, FIVERR_KILL_SWITCH=True))
    assert es.engaged() is True


async def test_emergency_stop_blocks_tools(monkeypatch, parse):
    from fiverr_agent_mcp.safety import get_safety
    get_safety().emergency.engage("test")
    res = parse(await orders.list_orders(orders.ListOrdersInput()))
    assert res["ok"] is False
    assert res["code"] == "emergency_stopped"


async def test_clear_emergency_stop_tool(parse):
    from fiverr_agent_mcp.safety import get_safety
    get_safety().emergency.engage("test")
    res = parse(await safety_tools.clear_emergency_stop(safety_tools._Empty()))
    assert res["ok"] is True
    assert res["result"]["cleared"] is True


# --- 5. Session health (read-only) ----------------------------------------- #
def test_session_health_read_only():
    sh = SessionHealth()
    assert sh.is_read_only is False
    sh.set_read_only("expired")
    assert sh.is_read_only is True
    assert sh.reason == "expired"
    sh.clear()
    assert sh.is_read_only is False


async def test_read_only_blocks_writes_but_allows_reads(parse, fake_client):
    from fiverr_agent_mcp.safety import get_safety
    get_safety().session.set_read_only("session expired")
    # Write is refused.
    w = parse(await orders.send_order_message(orders.OrderMessageInput(order_id="FO1", body="hi")))
    assert w["ok"] is False
    assert w["code"] == "read_only_mode"
    # Read still works.
    r = parse(await orders.list_orders(orders.ListOrdersInput()))
    assert r["ok"] is True


# --- 7. Production banner / classification ---------------------------------- #
def test_policy_classification():
    assert policy.is_high_risk("send_offer")
    assert policy.is_high_risk("deliver_order")
    assert policy.is_write("send_message")
    assert not policy.is_write("list_orders")
    assert not policy.is_write("login")  # auth recovery never gated


def test_banner_shows_mode(tmp_path):
    from fiverr_agent_mcp.safety import reset_safety as rs
    mgr = rs(_settings(tmp_path, FIVERR_DRY_RUN=True))
    assert "DRY_RUN" in mgr.banner()
    mgr2 = rs(_settings(tmp_path, FIVERR_DRY_RUN=False))
    assert "LIVE" in mgr2.banner()


# --- 8. Metrics ------------------------------------------------------------- #
def test_metrics_snapshot():
    m = Metrics()
    m.record("send_message", 0.1, "ok")
    m.record("send_message", 0.3, "error", selector_failure=True)
    m.record("deliver_order", 0.0, "blocked")
    m.record("send_offer", 0.2, "error", captcha=True)
    snap = m.snapshot()
    assert snap["total_actions"] == 4
    assert snap["failed_actions"] == 2
    assert snap["blocked_actions"] == 1
    assert snap["captcha_count"] == 1
    assert snap["selector_failures"] == 1
    assert snap["average_execution_ms"] > 0


async def test_metrics_tool_reports(parse, fake_client):
    # Run a couple of tools, then read metrics.
    await orders.list_orders(orders.ListOrdersInput())
    res = parse(await safety_tools.metrics(safety_tools._Empty()))
    assert res["ok"] is True
    assert res["result"]["total_actions"] >= 1


async def test_safety_status_tool(parse):
    res = parse(await safety_tools.safety_status(safety_tools._Empty()))
    assert res["ok"] is True
    assert res["result"]["mode"] in ("DRY_RUN", "LIVE")
    assert "rate_limits" in res["result"]
    assert "emergency_stop" in res["result"]


async def _noop(_):
    return None

# Production Safeguards

Before enabling LIVE mode, the agent enforces eight layers of protection. They
are always on (even in `DRY_RUN`) and are wired into **every** tool via the
`@safeguard()` decorator, except the four control-plane tools that must stay
reachable to recover.

## 1. Action confirmation

High-risk tools — `send_offer`, `deliver_order`, `create_gig`, `update_gig` —
require explicit confirmation. Called without it (and with
`FIVERR_AUTO_APPROVE=false`) they return, instead of acting:

```json
{
  "ok": false,
  "confirmation_required": true,
  "code": "confirmation_required",
  "message": "'send_offer' is a high-risk action and requires confirmation.",
  "action": { "tool": "send_offer", "conversation_id": "buyer1", "parameters": { … } }
}
```

Re-run with `confirm=true` to proceed, or set `FIVERR_AUTO_APPROVE=true` to skip
the gate globally (not recommended in production).

## 2. Rate limiting

Applied to every **write** action:

- **Human-like delay** — a randomized pause of
  `FIVERR_MIN_ACTION_DELAY_S`…`FIVERR_MAX_ACTION_DELAY_S` seconds before acting.
- **Per-minute cap** — `FIVERR_MAX_ACTIONS_PER_MINUTE` (default 8).
- **Daily cap** — `FIVERR_MAX_ACTIONS_PER_DAY` (default 150), persisted under the
  state dir so it survives restarts.

Exceeding a cap returns `code: "rate_limit_exceeded"` *before* any delay is spent.

## 3. Audit log

Every tool call appends one JSON line to `FIVERR_AUDIT_LOG` (default
`~/.fiverr-agent-mcp/audit.log`, mode `0600`) with: UTC timestamp, run mode, tool
name, conversation id, **sanitized** parameters (sensitive keys dropped, then the
whole line passed through log redaction), outcome, a short result summary,
screenshot paths, duration, and error code.

## 4. Emergency stop

A global kill switch, engaged by either:

- the `emergency_stop` tool (writes a sentinel file — survives restarts), or
- `FIVERR_KILL_SWITCH=true` (env; cannot be cleared at runtime).

While engaged, **all** tools return `code: "emergency_stopped"`. It also trips
**automatically** the moment a CAPTCHA / anti-bot / account-verification page is
detected during any action — the action aborts and the agent drops to read-only.
Clear it with `clear_emergency_stop` after resolving the issue.

## 5. Session health (auto read-only)

If a session-expiry is detected, the agent switches to **read-only mode**: write
tools return `code: "read_only_mode"` while reads keep working. A successful
`login` / `restore_session` clears it automatically.

## 6. Retry policy

Safe operations (navigation, waiting for elements, filling fields) retry with
exponential backoff. **Destructive submits never auto-retry** — the final
click for send-message, send-offer, deliver, cancel, and gig pause/activate/delete
is attempted exactly once (`allow_retry=False`), so a mutation is never silently
repeated.

## 7. Production-mode banner

On startup the server logs a prominent banner making the mode unmistakable:

```
====================================================================
  Fiverr Agent MCP — MODE: LIVE
  🟢 LIVE — actions WILL affect your real Fiverr account
  auto_approve=False  rate=8/min,150/day  delay=1.5-5.0s
  emergency_stop=clear  audit=~/.fiverr-agent-mcp/audit.log
====================================================================
```

`DRY_RUN` shows a 🟡 banner instead. Query it any time with `safety_status`.

## 8. Metrics

The `metrics` tool reports, for the process lifetime: total actions, failed
actions, blocked actions, success rate, average execution time (ms), selector
failure rate, CAPTCHA count, and per-tool / per-outcome breakdowns.

---

## Control-plane tools

| Tool | Purpose |
| --- | --- |
| `safety_status` | Full status: mode, auto-approve, emergency stop, read-only, rate usage, metrics. |
| `metrics` | Aggregated action metrics. |
| `emergency_stop` | Engage the kill switch (with a reason). |
| `clear_emergency_stop` | Clear the sentinel file. |

These four are never gated by the safeguards, so you can always inspect state and
recover.

---

## Go-live checklist

LIVE mode (`FIVERR_DRY_RUN=false`) should be enabled only when **both** hold:

1. The [live-validation report](live-validation.md) shows **🟢 GO** — all Tier-1
   tools Production Ready.
2. These safeguards are configured for production: `FIVERR_AUTO_APPROVE=false`, a
   sane rate limit, an audit-log location you monitor, and `FIVERR_SESSION_KEY`
   set so the session is encrypted at rest.

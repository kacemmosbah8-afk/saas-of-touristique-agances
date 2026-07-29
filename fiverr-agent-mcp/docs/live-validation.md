# Live Validation Guide

This harness verifies every tool's **selectors against the real, current Fiverr
DOM** on **your** account, captures a screenshot at each step, and produces a
compatibility report marking each tool **Production Ready** or **Needs Fix**.

It is designed to run on **your own machine** (not a datacenter server) so that:

- you log in yourself and can clear any Fiverr anti-bot / 2FA challenge, and
- the run happens from an IP Fiverr already trusts for your account.

**Nothing is sent or created.** Write flows (`send_message`, `send_offer`,
`create_gig`, `update_gig`) are validated only up to — *not including* — the
submit control. The single exception is an **optional** real test message, which
only fires if you explicitly pass `--send-test-message --live --conversation-id
<thread>` and goes only to that thread.

---

## 1. Prerequisites

```bash
cd fiverr-agent-mcp
uv venv .venv && source .venv/bin/activate
uv pip install -e .
playwright install chromium
```

Set your credentials (env or `.env`) so the harness can log in if there's no
saved session:

```bash
export FIVERR_EMAIL="you@example.com"
export FIVERR_PASSWORD="…"
export FIVERR_SESSION_KEY="$(python -m fiverr_agent_mcp.smoke --gen-key)"
```

---

## 2. First login (headful)

The harness runs **headful by default**. On first run, a Chromium window opens;
log in / solve any challenge there. The session is then saved (encrypted) and
reused, so later runs need no interaction.

---

## 3. Run the validation

Read-only + dry-run write flows (safe — nothing sent):

```bash
fiverr-agent-mcp-validate
```

Useful flags:

| Flag | Purpose |
| --- | --- |
| `--headless` | Run without a visible window (only after the session is saved). |
| `--artifacts DIR` | Where to write screenshots + report (default `./validation-artifacts/<timestamp>`). |
| `--only list_orders,list_gigs` | Validate just these tools. |
| `--conversation-id <id>` | Thread to use for `read_message` / `send_message` compose checks. |
| `--gig-id <id>` | Real gig id to validate the edit-draft flow. |

### Optional: one real test message (safe target)

To also verify a real send, point it at a thread you control (e.g. message
yourself from a second account, or a known test buyer) and opt in explicitly:

```bash
fiverr-agent-mcp-validate \
  --conversation-id <your-test-thread> \
  --send-test-message --live \
  --test-text "Ignore — MCP validation"
```

Without both `--send-test-message` and `--live`, no real message is sent.

---

## 4. What you get

In the artifacts directory:

- `report.md` — human-readable compatibility report:
  - a summary line (production-ready / needs-fix / blocked / skipped),
  - an **overview table** (tool · group · write? · status · missing selectors),
  - **per-tool detail** with the screenshot and a table showing, for each logical
    element, *which selector variant matched* and how many nodes it hit,
  - a **"Selectors to fix"** section listing every required element that matched
    nothing, with the exact variants that were tried.
- `report.json` — the same data, machine-readable.
- `NN_<tool>.png` — a full-page screenshot per step.

**Status meaning**

| Status | Meaning |
| --- | --- |
| ✅ Production Ready | All required selectors matched live DOM nodes. |
| ⚠️ Needs Fix | At least one required selector matched nothing. |
| ⛔ Blocked | Page wouldn't load / session expired (often anti-bot). |
| ⏭️ Skipped | Needs an input you didn't provide (e.g. `--gig-id`). |

---

## 5. Fixing selectors

Every "Needs Fix" entry names the element and the variants that were tried.
Fixes go in **one place** — the corresponding list in
[`browser/selectors.py`](../src/fiverr_agent_mcp/browser/selectors.py). Add the
selector that matches the current DOM to the *front* of that list (fallbacks stay
behind it), then re-run the harness for just that tool:

```bash
fiverr-agent-mcp-validate --only list_orders
```

Repeat until it reports ✅. **Send me the `report.md` (and any screenshots of the
failing pages) and I'll update the selectors for you.**

---

## Notes & caveats

- **Buyer Requests / `send_offer`:** Fiverr has largely retired the public Buyer
  Requests feature. If that page is empty or 404s, the harness reports it — that
  reflects Fiverr's product change, not a selector bug.
- **`create_gig` / `update_gig`:** validated up to the field level only; the
  multi-step gig wizard is not driven to completion, so nothing is published.
- **Blocked results** usually mean Fiverr challenged the automation. Re-run
  headful, increase `FIVERR_SLOW_MO_MS`, and make sure you completed login in the
  browser window.
- A tool is only truthfully **Production Ready** once it reports ✅ against your
  live account — that is the bar this harness exists to measure.

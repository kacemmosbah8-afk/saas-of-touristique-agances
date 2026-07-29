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
| `--conversation-id <id>` | Thread for `read_message` / `send_message` / `send_offer` checks. |
| `--order-id <id>` | Real order id to validate the `open_order` detail page. |
| `--gig-id <id>` | Real gig id to validate `open_gig` / `update_gig`. |
| `--baseline path/to/report.json` | Compare selectors against a prior run to flag **DOM changes**. |

For the fullest Tier-1 run, pass a real buyer conversation and an order:

```bash
fiverr-agent-mcp-validate --conversation-id <thread> --order-id <order>
```

The command **exits 0 when the Tier-1 gate passes and 2 otherwise**, so it can
gate a CI/deploy step.

---

## Go-live gate (tiers)

The report opens with a **Go-Live Gate** verdict. `FIVERR_DRY_RUN=false` is only
permitted once **every Tier-1 tool is Production Ready**.

| Tier | Tools | Rule |
| --- | --- | --- |
| **1 — Critical** | `login`, `restore_session`, `verify_logged_in`, `list_messages`, `read_message`, `send_message`, `send_offer`, `list_orders`, `open_order` | Must pass 100% or the gate is **NO-GO** and live writes stay disabled. |
| **2 — Important** | `list_notifications`, `list_gigs`, `open_gig`, `read_dashboard`, `read_analytics`, `summarize_conversation`, `analyze_client`, `suggest_price` | Should pass before feature-complete; does not block initial production. |
| **3 — Optional / Phase 2** | `create_gig`, `update_gig`, `pause_gig`, `activate_gig`, `deliver_order`, `request_extension`, `archive_message`, legacy Buyer Requests | Stay in dry-run until individually validated. |

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
  - the **Go-Live Gate** verdict (🟢 GO / 🔴 NO-GO) and whether
    `FIVERR_DRY_RUN=false` is permitted,
  - the **overall success rate (%)**,
  - **per-tier metrics tables**, one row per tool with every requested field:

    | Field | Meaning |
    | --- | --- |
    | Status | Production Ready / Needs Fix / Blocked / Skipped |
    | Success | % of the tool's *required* selectors that matched |
    | Time (s) | execution time for that tool's check |
    | Retries | navigation/action retries incurred |
    | CAPTCHA | anti-bot challenge detected (Yes/No) |
    | Human? | human intervention required (Yes/No) |
    | DOM Δ | DOM change vs `--baseline` (Yes/No/n-a) |
    | Selector(s) → confidence | the selector that matched each required element + its confidence (high/medium/low) |

  - **per-tool detail** with the screenshot path, notes, and a table of every
    probed element (matched selector, node count, confidence),
  - a **"Selectors to fix"** section listing every required element that matched
    nothing, with the exact variants that were tried.
- `report.json` — the same data (including the `gate` verdict and per-tool
  telemetry), machine-readable. Reuse it as `--baseline` next run.
- `NN_<tool>.png` — a full-page screenshot per step.

**Selector confidence** rates how durable a matched selector is: `high` for
stable hooks (`data-testid`, `aria-label`, `name=`, `#id`), `medium` for
text/attribute heuristics (`:has-text`, `placeholder`), `low` for broad
structural fallbacks (`[class*=…]`, `table tbody tr`). Prefer promoting
high-confidence selectors to the front of each list in `selectors.py`.

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

- **`send_offer` (Custom Offer):** Fiverr retired public Buyer Requests, so
  `send_offer` now drives the **Custom Offer composer from inside a
  conversation**. The harness opens a conversation (`--conversation-id`, or the
  first thread), clicks "Create an offer", and probes the composer fields —
  nothing is sent. If the create-offer button isn't found, it may be named
  differently in your locale; note it in the report and I'll update
  `CREATE_OFFER_BUTTON`.
- **`list_available_leads` (legacy):** points at the deprecated Buyer Requests
  page and may return empty — expected, not a bug.
- **`create_gig` / `update_gig`:** validated up to the field level only; the
  multi-step gig wizard is not driven to completion, so nothing is published.
- **Blocked results** usually mean Fiverr challenged the automation. Re-run
  headful, increase `FIVERR_SLOW_MO_MS`, and make sure you completed login in the
  browser window.
- A tool is only truthfully **Production Ready** once it reports ✅ against your
  live account — that is the bar this harness exists to measure.

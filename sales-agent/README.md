# Fiverr Sales Agent

An **autonomous (opt-in) AI sales layer** that sits on top of the
[Fiverr Agent MCP](../fiverr-agent-mcp/). It reads your conversations, analyzes
them, drafts replies and Custom Offers, tracks client history, learns from
outcomes, and produces a dashboard and daily brief — while **keeping you in
control**.

> 🔒 **You decide.** The agent **never** sends a message or offer on its own
> unless you explicitly enable autonomous mode (`SALES_AUTONOMOUS=true`). Every
> action still flows through the MCP's safeguards (DRY_RUN, high-risk
> confirmation, rate limiting, audit log).

---

## Architecture: business logic ≠ browser automation

```
┌─────────────────────────────────────────────┐
│  fiverr_sales_agent  (business logic)        │
│  analysis · pricing · replies · offers ·     │
│  memory · learning · dashboard · daily       │
└───────────────┬─────────────────────────────┘
                │  ExecutionGateway (protocol)
                ▼
┌─────────────────────────────────────────────┐
│  fiverr_agent_mcp   (execution layer)        │
│  tools → FiverrClient → Playwright → Fiverr  │
│  + safeguards (DRY_RUN, confirm, rate, audit)│
└─────────────────────────────────────────────┘
```

The sales agent depends only on the `ExecutionGateway` protocol. The default
`InProcessMCPGateway` calls the MCP tools in-process, so all Fiverr I/O — and all
safety — lives in the MCP. Tests inject a fake gateway; **no MCP core changes.**

---

## What it does

| Capability | Module | Sends? |
| --- | --- | --- |
| Summarize + detect (project type, urgency, budget, complexity, missing info) | `analysis.py` | no |
| Estimate win probability, value, delivery | `analysis.py` | no |
| Recommend accept / decline / ask questions | `analysis.py` | no |
| Three replies (Conservative / Professional / Sales) in your style | `replies.py` | no |
| Pricing: price, delivery, revisions, upsells, premium + rationale | `pricing.py` | no |
| Build a complete Custom Offer **preview** | `offers.py` | no |
| Conversation memory (returning clients, offers, patterns) | `memory.py` | no |
| Learning from outcomes (won/lost, price, satisfaction, lessons) | `learning.py` | no |
| Dashboard (opportunities, waiting, follow-ups, win rate, forecast) | `dashboard.py` | no |
| Daily brief (priority inbox, suggested replies/offers, risks, actions) | `daily.py` | no |
| **Approve & send** a reply / offer | `agent.py` | **only on your approval** |

---

## Install

```bash
cd sales-agent
uv venv .venv && source .venv/bin/activate
uv pip install -e ../fiverr-agent-mcp -e ".[dev]"
```

## Configure (all optional; env prefix `SALES_`)

```bash
export SALES_SELLER_NAME="Alex"
export SALES_BASE_PRICE=75
export SALES_CURRENCY=USD
export SALES_TYPICAL_DELIVERY_DAYS=5
export SALES_GREETING="Hi{name},"
export SALES_SIGNOFF="Cheers"
# export SALES_AUTONOMOUS=true   # opt-in: allow automatic actions
```

## Use (CLI)

```bash
fiverr-sales-agent inbox                 # ranked opportunities (no sending)
fiverr-sales-agent analyze <conv_id>     # full analysis + 3 replies + offer preview
fiverr-sales-agent dashboard             # the sales cockpit
fiverr-sales-agent daily                 # morning brief
fiverr-sales-agent status                # MCP safety/production status

# Explicit approval (relayed to the MCP, still DRY_RUN/confirmation-gated):
fiverr-sales-agent approve-reply <conv_id> "Thanks — I'll get started!"
fiverr-sales-agent approve-offer <conv_id> --title "Custom logo" \
    --description "…" --price 150 --days 4 --revisions 2
```

## Use (Python)

```python
from fiverr_sales_agent import SalesAgent

agent = SalesAgent()                      # uses the in-process MCP gateway
analysis = await agent.analyze_conversation("buyer_acme")
print(analysis.recommendation.action, analysis.pricing.recommended_price)
for reply in analysis.replies:
    print(reply.style, reply.text)

# Nothing was sent. When YOU approve:
await agent.approve_offer(analysis.offer_preview)   # → goes through MCP safeguards
```

---

## Safety model

- **No autonomous sends** unless `SALES_AUTONOMOUS=true`. `autonomous_handle()`
  raises `ApprovalRequired` otherwise.
- **Sending is a separate, explicit step** (`approve_reply` / `approve_offer`).
- **The MCP still guards everything**: `FIVERR_DRY_RUN` previews instead of
  sending; high-risk actions need confirmation; rate limits and the audit log
  apply. If the MCP blocks (DRY_RUN, confirmation, read-only), the agent surfaces
  the reason instead of forcing it through.

---

## Testing

```bash
pytest        # runs entirely against a fake gateway — no browser, no Fiverr
```

## License

MIT. You are responsible for compliance with Fiverr's Terms of Service.

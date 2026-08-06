# Fiverr Agent MCP

A **production-ready [MCP](https://modelcontextprotocol.io) server** that lets an
LLM (e.g. Claude) **read and write on an authenticated Fiverr account** through
real browser automation with [Playwright](https://playwright.dev/python/) — not
public-page scraping.

It exposes ~45 tools across Inbox, Buyer Requests / Leads, Orders, Gigs,
Analytics, Notifications, Account/Session, and offline AI helpers.

> ⚠️ **Use responsibly.** Automating your own Fiverr account may conflict with
> Fiverr's Terms of Service. This project is provided for automating **your own**
> account, at your own risk. Keep a human in the loop for anything that touches
> money or client relationships, and use `FIVERR_DRY_RUN=true` while testing.

---

## Highlights

- **Real authenticated automation** — Playwright drives a Chromium session that
  is *actually logged in*, so it can send messages, offers, deliveries, etc.
- **Modular, typed, async** — clean packages (`browser/`, `tools/`, `ai/`,
  `security/`), full type hints, Pydantic v2 models everywhere.
- **Resilient selectors** — every element is resolved through ordered fallback
  locators centralized in `browser/selectors.py`; layout changes have one home.
- **Retries & recovery** — bounded exponential-backoff retries, network-idle
  waits, automatic login-expiration detection, and session restore.
- **Secure by construction** — credentials only from env vars, session encrypted
  at rest with Fernet, log redaction filter on every handler, `0600` session file.
- **Dry-run mode** — `FIVERR_DRY_RUN=true` makes every mutating tool return a
  preview instead of acting.
- **Offline AI tools** — deterministic lead scoring, spam detection, price
  suggestion, proposal/reply rewriting, conversation summarization.
- **Production safeguards** — high-risk confirmation, human-like rate limiting
  (per-minute + daily caps), an audit log, a global emergency stop that also
  trips on CAPTCHA, auto read-only on session expiry, a no-retry rule for
  destructive submits, a DRY_RUN/LIVE banner, and action metrics. See
  [`docs/safeguards.md`](docs/safeguards.md).

---

## Tool catalog

| Group | Tools |
| --- | --- |
| **Inbox** | `list_messages`, `read_message`, `send_message`, `reply_to_message`, `archive_message` |
| **Leads** | `list_available_leads`, `analyze_lead`, `generate_proposal`, `send_offer` |
| **Orders** | `list_orders`, `open_order`, `read_requirements`, `send_order_message`, `deliver_order`, `request_extension`, `cancel_order_request` |
| **Gigs** | `list_gigs`, `open_gig`, `create_gig`, `update_gig`, `pause_gig`, `activate_gig`, `delete_draft` |
| **Analytics** | `read_dashboard`, `read_conversion_rate`, `read_impressions`, `read_clicks`, `read_orders`, `export_statistics` |
| **Notifications** | `list_notifications`, `open_notification`, `mark_as_read` |
| **Account** | `login`, `logout`, `verify_logged_in`, `save_session`, `restore_session` |
| **AI** | `analyze_client`, `estimate_win_probability`, `score_lead`, `suggest_price`, `rewrite_proposal`, `improve_reply`, `detect_spam`, `summarize_conversation` |
| **Safety** | `safety_status`, `metrics`, `emergency_stop`, `clear_emergency_stop` |

Full per-tool reference (inputs, outputs, errors, examples): [`docs/tools.md`](docs/tools.md).

---

## Quick start

```bash
# 1. Install (from the fiverr-agent-mcp/ directory)
uv venv .venv && source .venv/bin/activate
uv pip install -e .
playwright install chromium

# 2. Configure
cp .env.example .env
#   edit .env: set FIVERR_EMAIL, FIVERR_PASSWORD, and a FIVERR_SESSION_KEY
python -m fiverr_agent_mcp.smoke --gen-key      # generate a session key

# 3. Verify the server wires up (no browser, no network)
fiverr-agent-mcp-smoke

# 4. Run it (stdio transport)
python -m fiverr_agent_mcp
```

See [`docs/installation.md`](docs/installation.md) for the full guide, including
MCP client wiring and headless/headful notes.

---

## Architecture

```
src/fiverr_agent_mcp/
├── config.py            # env-driven Settings (pydantic-settings)
├── logging_config.py    # stderr logging + redaction filter
├── exceptions.py        # typed error hierarchy
├── models.py            # Pydantic domain models
├── security/
│   ├── crypto.py        # Fernet session-at-rest encryption
│   └── redaction.py     # secret redaction for logs
├── browser/
│   ├── manager.py       # Playwright lifecycle + process singleton
│   ├── client.py        # FiverrClient page-object (all operations)
│   ├── navigation.py    # retries, waits, login-wall detection
│   ├── selectors.py     # URLs + fallback locator strategies
│   └── session.py       # encrypted storage_state persistence
├── ai/heuristics.py     # offline scoring & text tools
├── tools/               # one module per tool group (thin wrappers)
├── core/mcp_app.py      # the shared FastMCP instance
├── server.py            # entry point (imports tools, runs transport)
└── smoke.py             # smoke test + `--gen-key` / `--list-tools`
```

The tool layer never touches Playwright directly — it goes through
`FiverrClient`, which goes through the retry/wait helpers, which use the central
selector table. This keeps tools thin and makes Fiverr UI changes a one-file fix.

---

## Configuration

All configuration is environment-based; see [`.env.example`](.env.example) for
the annotated list. The most important:

| Variable | Purpose | Default |
| --- | --- | --- |
| `FIVERR_EMAIL` / `FIVERR_PASSWORD` | Login credentials (env only, never logged) | — |
| `FIVERR_SESSION_KEY` | Fernet key encrypting the saved session | *(unencrypted if unset)* |
| `FIVERR_HEADLESS` | Run Chromium headless | `true` |
| `FIVERR_DRY_RUN` | Refuse mutations, return previews | `false` |
| `FIVERR_STATE_DIR` | Where the session file lives | `~/.fiverr-agent-mcp` |
| `FIVERR_MAX_RETRIES` | Retries per action | `3` |
| `FIVERR_AUTO_APPROVE` | Skip high-risk confirmation gate | `false` |
| `FIVERR_MAX_ACTIONS_PER_MINUTE` / `_PER_DAY` | Rate-limit caps | `8` / `150` |
| `FIVERR_KILL_SWITCH` | Hard emergency stop (refuse all actions) | `false` |
| `FIVERR_LOG_LEVEL` | `DEBUG`…`CRITICAL` | `INFO` |

---

## Security

- **No secrets in code.** Credentials come only from environment variables.
- **Session encrypted at rest.** With `FIVERR_SESSION_KEY` set, the browser
  `storage_state` (cookies + localStorage) is Fernet-encrypted; the file is
  written `0600` in a `0700` directory. Without a key it falls back to plaintext
  and **warns loudly**.
- **Cookies are never exposed.** No tool returns cookies or session material.
- **Logs are redacted.** A `RedactingFilter` on every handler masks passwords,
  tokens, cookies, emails and long base64/hex blobs — even if code accidentally
  logs them.

---

## Testing

```bash
pytest                     # unit + integration tests (mocked browser)
fiverr-agent-mcp-smoke     # end-to-end wiring smoke test
fiverr-agent-mcp-smoke --list-tools
```

Tests mock the browser layer, so the full suite runs without Playwright browsers
or Fiverr credentials.

### Live validation (real Fiverr account)

To verify tool **selectors against the real Fiverr site** and produce a
compatibility report with screenshots, run the live-validation harness **on your
own machine** (headful, so you can clear any login/anti-bot challenge):

```bash
playwright install chromium
fiverr-agent-mcp-validate          # read-only + dry-run write flows; nothing is sent
```

It walks each tool, probes every selector variant against the live DOM,
screenshots each step, and writes `report.md` / `report.json` marking each tool
**Production Ready** or **Needs Fix** (with the exact selectors to update). Write
flows stop at the submit control; an optional real test message only fires with
`--send-test-message --live --conversation-id <thread>`. Full guide:
[`docs/live-validation.md`](docs/live-validation.md).

---

## Extending

Add a new capability in three steps:

1. Add a high-level method to `FiverrClient` (using `nav.*` helpers + selectors).
2. Add any new locators to `browser/selectors.py`.
3. Add a thin tool wrapper in the appropriate `tools/*.py` module.

The tool is auto-registered on import and picked up by the smoke test.

---

## License

MIT. Provided as-is; you are responsible for compliance with Fiverr's Terms of
Service and applicable law.

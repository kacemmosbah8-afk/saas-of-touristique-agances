# Installation Guide — Fiverr Agent MCP

This guide takes you from zero to a running, authenticated Fiverr Agent MCP
server wired into an MCP client (e.g. Claude Desktop / Claude Code).

> ⚠️ Automating your Fiverr account may conflict with Fiverr's Terms of Service.
> Use only on **your own** account and keep `FIVERR_DRY_RUN=true` until you have
> verified behavior. You are responsible for compliance.

---

## 1. Prerequisites

- **Python 3.10+**
- **[uv](https://docs.astral.sh/uv/)** (recommended) or `pip`
- A Chromium browser installed by Playwright (step 3)

```bash
# Install uv (optional but recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## 2. Install the package

From the `fiverr-agent-mcp/` directory:

```bash
uv venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uv pip install -e .                # or: uv pip install -e ".[dev]" for tests
```

With plain pip:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .
```

---

## 3. Install the Chromium browser

Playwright needs a browser binary:

```bash
playwright install chromium
```

> In some managed/CI environments Chromium is pre-installed and
> `PLAYWRIGHT_BROWSERS_PATH` is already set — in that case you can skip this.

---

## 4. Configure

```bash
cp .env.example .env
```

Edit `.env`:

1. Set `FIVERR_EMAIL` and `FIVERR_PASSWORD`.
2. Generate and set a session encryption key:

   ```bash
   python -m fiverr_agent_mcp.smoke --gen-key
   # copy the output into FIVERR_SESSION_KEY=...
   ```

3. Keep `FIVERR_DRY_RUN=true` for your first runs.

See [`.env.example`](../.env.example) for every option.

---

## 5. Verify the install

Run the smoke test (no browser, no network — just wiring/config/heuristics):

```bash
fiverr-agent-mcp-smoke
```

Expected:

```
[PASS] Fiverr Agent MCP smoke test
  - tools_registered: 45
  - missing_tools: []
  - config_loaded: True
  - has_credentials: True
  - session_encryption: True
  - heuristics_ok: True
```

List the tools:

```bash
fiverr-agent-mcp-smoke --list-tools
```

Run the test suite (needs the `[dev]` extra):

```bash
pytest
```

---

## 6. First login (recommended: headful)

For the very first login it is easiest to watch the browser and clear any
challenge/2FA manually. Temporarily set `FIVERR_HEADLESS=false`, then run a tiny
script:

```bash
python - <<'PY'
import asyncio
from fiverr_agent_mcp.browser import get_client, shutdown_client

async def main():
    client = await get_client()
    print(await client.login())      # solves + saves the session
    await shutdown_client()          # persists session on close

asyncio.run(main())
PY
```

After this, the encrypted session is saved to `~/.fiverr-agent-mcp/session.enc`
and subsequent runs restore it automatically — set `FIVERR_HEADLESS=true` again.

---

## 7. Wire it into an MCP client

### Claude Code / any project-scoped client (`.mcp.json`)

The repository root `.mcp.json` already includes a `fiverr-agent` entry:

```json
{
  "mcpServers": {
    "fiverr-agent": {
      "command": "fiverr-agent-mcp",
      "env": {
        "FIVERR_EMAIL": "you@example.com",
        "FIVERR_PASSWORD": "…",
        "FIVERR_SESSION_KEY": "…",
        "FIVERR_HEADLESS": "true",
        "FIVERR_DRY_RUN": "true"
      }
    }
  }
}
```

Point `command` at the console script inside your venv (e.g.
`/path/to/fiverr-agent-mcp/.venv/bin/fiverr-agent-mcp`) if it isn't on `PATH`.
You can also run it as a module:

```json
{
  "command": "python",
  "args": ["-m", "fiverr_agent_mcp"]
}
```

### Claude Desktop (`claude_desktop_config.json`)

Same shape under `mcpServers`. Restart the app after editing.

> **Do not put secrets in a committed file.** Prefer exporting the `FIVERR_*`
> variables in the environment that launches the client, and leave the `env`
> block out (or reference a secrets manager).

---

## 8. Going live

When you're confident:

1. Set `FIVERR_DRY_RUN=false`.
2. Start with read-only tools (`list_messages`, `list_orders`, `read_dashboard`).
3. Graduate to mutating tools (`send_message`, `send_offer`, `deliver_order`)
   with a human reviewing the agent's proposed actions.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Failed to launch Chromium` | Run `playwright install chromium`. |
| `session_expired` on every call | Re-run login (step 6); the saved cookies expired. |
| `Stored session could not be decrypted` | `FIVERR_SESSION_KEY` changed — delete `~/.fiverr-agent-mcp/session.enc` and log in again. |
| `rate_limited` / captcha | Set `FIVERR_HEADLESS=false`, solve it once, increase `FIVERR_SLOW_MO_MS`. |
| `authentication_error` | Wrong credentials, or a 2FA/social-login-only screen — log in headful first. |
| Selectors not found | Fiverr changed its UI; update the fallback lists in `browser/selectors.py`. |
| Session stored `PLAINTEXT` warning | Set `FIVERR_SESSION_KEY` to encrypt it. |

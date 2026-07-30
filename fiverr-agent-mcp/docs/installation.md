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
challenge/2FA manually. Temporarily set `FIVERR_HEADLESS=false`, then run:

```bash
fiverr-agent-mcp-login
```

Run this directly in your terminal — **not** via a `python - <<EOF` heredoc.
A heredoc feeds the whole script through stdin, so there is nothing left for
an interactive prompt to read; this command needs a real TTY.

You do **not** need to change `FIVERR_DRY_RUN` for this. Logging in is
authentication, not a Fiverr marketplace write, so `fiverr-agent-mcp-login`
creates and saves the encrypted session even with `FIVERR_DRY_RUN=true` (the
safe default shipped in `.env.example`). Dry-run keeps protecting real sends
(messages, offers, deliveries, gig edits) — it just never blocks login.

The flow does **not** assume `/login` shows the form. It logs the current URL
and detected page type first, then adapts: if Fiverr redirects `/login` to the
homepage (where only a "Sign in" button is shown), it clicks that button to open
the login UI — modal or dedicated page — waits for it, and only then fills the
email field. If it's already logged in it finishes immediately; a challenge
pauses as above; and a genuinely unexpected page saves diagnostics (below).

If Fiverr shows a Cloudflare/hCaptcha/anti-bot challenge at any point, the
browser is **left open** and login pauses with:

```
Press Enter after solving the challenge to continue (or type 'abort' to give up):
```

Solve the challenge in the browser window, then press Enter in the terminal —
login retries automatically and continues (filling credentials, submitting,
tolerating a 2FA page the same way) until it succeeds. Type `abort` (or Ctrl+C)
to give up instead; the browser then closes normally.

After this, the encrypted session is saved to `~/.fiverr-agent-mcp/session.enc`
and subsequent runs restore it automatically — set `FIVERR_HEADLESS=true` again.

### If Fiverr keeps showing "It needs a human touch"

If the anti-bot wall appears **only** in the automated browser (you can log in
fine in your normal Chrome on the same connection), the throwaway browser
profile is the problem — Fiverr doesn't recognize it as a trusted device. Reuse
your real Chrome profile so it sees your existing cookies, history and device
trust.

Point the agent at your Chrome **User Data root** (the folder that *contains*
`Default`, `Profile 1`, ... — **not** a profile subfolder), pick the profile,
and use real Chrome:

```bash
# Linux
export FIVERR_CHROME_USER_DATA_DIR="$HOME/.config/google-chrome"
# macOS:   "$HOME/Library/Application Support/Google/Chrome"
# Windows: "%LOCALAPPDATA%\Google\Chrome\User Data"

export FIVERR_CHROME_PROFILE_DIRECTORY=Default   # chrome://version → "Profile Path"
export FIVERR_BROWSER_CHANNEL=chrome
export FIVERR_HEADLESS=false
fiverr-agent-mcp-login
```

```powershell
# Windows PowerShell equivalent
$env:FIVERR_CHROME_USER_DATA_DIR = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$env:FIVERR_CHROME_PROFILE_DIRECTORY = "Default"
$env:FIVERR_BROWSER_CHANNEL = "chrome"
$env:FIVERR_HEADLESS = "false"
fiverr-agent-mcp-login
```

**How this avoids the Windows `TargetClosedError`.** `launch_persistent_context`
needs *exclusive* ownership of the user-data-dir. Chrome enforces a **process
singleton** per user-data-dir: if any Chrome process still owns your live *User
Data* root — and on Windows a background `chrome.exe` usually lingers after you
close every window ("Continue running background apps when Google Chrome is
closed", background extensions, ...) — a second Chrome launched against it just
hands its command to that instance ("Ouverture dans une session de navigateur
existante") and exits, which Playwright reports as `TargetClosedError`.

So by default (`FIVERR_CHROME_COPY_PROFILE=true`) the agent **clones** the
selected profile into a directory it owns
(`~/.fiverr-agent-mcp/chrome-automation-profile`) and drives *that*. The clone
carries your cookies and `Local State` (so the device stays trusted), but its
singleton is the agent's alone — it works **even while your normal Chrome is
open**. The user-data-dir stays the root; the profile is selected with Chrome's
`--profile-directory` flag.

- To instead drive your real directory in place, set
  `FIVERR_CHROME_COPY_PROFILE=false` — but then you must fully quit Chrome:
  close all windows **and** end every background `chrome.exe` (Task Manager, or
  `taskkill /F /IM chrome.exe`), and turn off "Continue running background apps".
- If a launch still fails with the singleton handoff, the agent raises a clear
  error telling you exactly this.

This login **also** writes `session.enc`, so afterwards you can unset the
`FIVERR_CHROME_*` / channel variables and run normally (headless, no profile) —
the saved session restores as before.

> The persistent-profile option only changes how the browser is launched; the
> encrypted session storage, all tools, and every safeguard are unchanged. Leave
> `FIVERR_CHROME_USER_DATA_DIR` unset to keep the original throwaway behavior.

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
| `Could not find the email field` / login page didn't match | The error now names the actual page state (already-logged-in, challenge, redirect, or changed DOM) and saves a screenshot, the page HTML, and a JSON metadata file under `~/.fiverr-agent-mcp/diagnostics/`. Open those to see exactly what Fiverr served, then act on the reported state. |
| Selectors not found | Fiverr changed its UI; update the fallback lists in `browser/selectors.py`. |
| Session stored `PLAINTEXT` warning | Set `FIVERR_SESSION_KEY` to encrypt it. |

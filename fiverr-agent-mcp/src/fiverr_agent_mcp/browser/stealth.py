"""Anti-automation-fingerprint hardening for *launched* browsers.

A browser Playwright launches differs from one a human starts, and anti-bot
services (PerimeterX, Cloudflare, ...) read those differences. The strongest and
most reliable signal is ``navigator.webdriver``:

* A Playwright-launched Chromium reports ``navigator.webdriver === true``
  (verified empirically against this project's Playwright build).
* Dropping Playwright's ``--enable-automation`` switch alone does **not** change
  it — the value is driven by Chromium's ``AutomationControlled`` blink feature.
* Adding ``--disable-blink-features=AutomationControlled`` flips it to ``false``.

These constants apply that hardening. They are intentionally minimal: only the
automation *tells* are removed. We do **not** spoof plugins, languages, the
``chrome`` runtime object, WebGL vendor, etc. — over-patching produces its own
inconsistencies that are themselves detectable, and the goal here is to look
like a normal Chrome, not a heavily-instrumented one.

None of this is needed (or applied) when attaching to a user-launched Chrome
over CDP: that browser is already genuine.
"""

from __future__ import annotations

# Chromium switch that turns off the AutomationControlled blink feature, which is
# what sets navigator.webdriver=true. Empirically the single effective flag.
STEALTH_ARGS: tuple[str, ...] = ("--disable-blink-features=AutomationControlled",)

# Playwright's own automation switch. Removing it drops the "Chrome is being
# controlled by automated test software" infobar and one more automation hint.
STEALTH_IGNORE_DEFAULT_ARGS: tuple[str, ...] = ("--enable-automation",)

# Belt-and-suspenders: ensure navigator.webdriver is undefined even if a future
# Chromium build changes how the flag behaves. Runs before any page script.
STEALTH_INIT_SCRIPT: str = (
    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
)


def merge_args(existing: list[str] | None) -> list[str]:
    """Return ``existing`` launch args plus the stealth args (no duplicates)."""
    args = list(existing or [])
    for flag in STEALTH_ARGS:
        if not any(flag.split("=")[0] in a for a in args):
            args.append(flag)
    return args

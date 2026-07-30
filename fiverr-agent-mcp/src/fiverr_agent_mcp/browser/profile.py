"""Helpers for driving a real Chrome profile with a persistent context.

Playwright's ``launch_persistent_context`` requires **exclusive** ownership of
the ``--user-data-dir`` it drives. Pointing it straight at the live Chrome
"User Data" root that everyday Chrome uses fails — most visibly on Windows —
because of Chrome's *process singleton*:

* Chrome keeps background processes alive after every window is closed (the
  "Continue running background apps when Google Chrome is closed" setting,
  background extensions, media keys, ...). One of them still holds the singleton
  lock on that User Data root.
* A second Chrome launched with the same ``--user-data-dir`` detects that
  singleton, hands its command line to the already-running instance ("Ouverture
  dans une session de navigateur existante" / "Opening in an existing browser
  session"), and the just-launched process exits immediately — which Playwright
  observes as ``TargetClosedError``.

Two facts follow, and this module encodes both:

1. **Profile selection.** ``--user-data-dir`` must stay the *root*; a specific
   profile inside it is chosen with ``--profile-directory=Default`` (or
   ``"Profile 1"``, ...), never by making the user-data-dir point at the
   subfolder.
2. **Exclusive ownership.** The robust way to get it — without asking the user
   to hunt down and kill every background ``chrome.exe`` — is to *clone* the
   chosen profile into a dedicated directory the agent owns, and drive that.
   The clone still carries the real cookies / Local State, so Fiverr sees the
   same trusted device, but Chrome's singleton for it is ours alone.

Stale singleton lock files left behind in an agent-owned directory are removed
before launch so a previous crash can't wedge it.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from ..logging_config import get_logger

logger = get_logger("browser.profile")

# The default Chrome profile subfolder when none is configured.
DEFAULT_PROFILE_DIRECTORY = "Default"

# Singleton / lock sentinels Chrome writes at the *root* of a user-data-dir.
# Safe to delete in a directory we own exclusively (no live Chrome holds it).
_SINGLETON_FILES = ("SingletonLock", "SingletonSocket", "SingletonCookie", "lockfile")

# Large, transient, or lock-prone subdirectories that carry no login/trust value
# and only bloat (or fail) the clone. Cookies, Local Storage, Login Data, Network
# and Preferences — the things that establish device trust — are NOT here, so
# they are copied.
_SKIP_DIR_NAMES = frozenset({
    "Cache",
    "Code Cache",
    "GPUCache",
    "GrShaderCache",
    "ShaderCache",
    "DawnCache",
    "DawnGraphiteCache",
    "DawnWebGPUCache",
    "Service Worker",
    "CacheStorage",
    "Crashpad",
    "component_crx_cache",
    "extensions_crx_cache",
    "optimization_guide_model_store",
})


def strip_singleton_locks(user_data_dir: Path) -> list[str]:
    """Delete stale Chrome singleton lock files at ``user_data_dir``'s root.

    Only call this for a directory the agent owns exclusively — deleting a lock
    a *running* Chrome still holds does nothing useful. Returns the names of the
    files actually removed.
    """
    removed: list[str] = []
    for name in _SINGLETON_FILES:
        target = user_data_dir / name
        try:
            if target.exists() or target.is_symlink():
                target.unlink()
                removed.append(name)
        except OSError as exc:  # pragma: no cover - platform dependent
            logger.debug("Could not remove singleton file %s: %s", target, exc)
    if removed:
        logger.info("Removed stale singleton lock(s) in %s: %s", user_data_dir, ", ".join(removed))
    return removed


def _resilient_copy_tree(src: Path, dst: Path) -> tuple[int, int]:
    """Copy ``src`` -> ``dst`` recursively, skipping caches and locked files.

    Best-effort: a file locked by a running Chrome (common on Windows for the
    Cookies DB) is skipped rather than aborting the whole clone. Returns
    ``(copied, skipped)`` file counts.
    """
    copied = skipped = 0
    for entry in src.iterdir():
        if entry.name in _SKIP_DIR_NAMES:
            continue
        if entry.name in _SINGLETON_FILES:
            continue
        target = dst / entry.name
        if entry.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            c, s = _resilient_copy_tree(entry, target)
            copied += c
            skipped += s
        else:
            try:
                shutil.copy2(entry, target)
                copied += 1
            except OSError as exc:  # locked / vanished / permission — skip it
                skipped += 1
                logger.debug("Skipped locked/unreadable profile file %s: %s", entry, exc)
    return copied, skipped


def clone_profile(source_root: Path, dest_root: Path, profile: str) -> dict[str, object]:
    """Clone one Chrome profile from ``source_root`` into ``dest_root``.

    Copies the top-level ``Local State`` file (holds the profile list and the
    cookie-encryption key material — cookies cannot be decrypted without it) and
    the ``<profile>`` subdirectory (minus caches / locks). Existing content in
    ``dest_root/<profile>`` is refreshed in place.

    Args:
        source_root: The real Chrome "User Data" root (contains ``Default`` etc.).
        dest_root: The agent-owned user-data-dir to populate.
        profile: The profile subfolder to clone (e.g. ``"Default"``).

    Returns:
        A small telemetry dict: ``{"profile", "copied", "skipped", "local_state",
        "source_present"}``.
    """
    dest_root.mkdir(parents=True, exist_ok=True)
    result: dict[str, object] = {
        "profile": profile,
        "copied": 0,
        "skipped": 0,
        "local_state": False,
        "source_present": False,
    }

    # Local State lives at the User Data root, not inside the profile.
    src_local_state = source_root / "Local State"
    if src_local_state.is_file():
        try:
            shutil.copy2(src_local_state, dest_root / "Local State")
            result["local_state"] = True
        except OSError as exc:  # pragma: no cover - platform dependent
            logger.debug("Could not copy Local State: %s", exc)

    src_profile = source_root / profile
    if src_profile.is_dir():
        result["source_present"] = True
        dst_profile = dest_root / profile
        dst_profile.mkdir(parents=True, exist_ok=True)
        copied, skipped = _resilient_copy_tree(src_profile, dst_profile)
        result["copied"] = copied
        result["skipped"] = skipped
        logger.info(
            "Cloned Chrome profile '%s' (%d files, %d skipped) from %s to %s",
            profile, copied, skipped, source_root, dest_root,
        )
    else:
        logger.warning(
            "Chrome profile directory '%s' not found under %s; launching a fresh "
            "profile in %s (it will NOT carry your existing cookies/trust). Set "
            "FIVERR_CHROME_PROFILE_DIRECTORY to the right profile (see chrome://version "
            "→ 'Profile Path').",
            profile, source_root, dest_root,
        )

    strip_singleton_locks(dest_root)
    return result

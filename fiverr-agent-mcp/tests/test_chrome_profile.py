"""Tests for the Chrome-profile clone / singleton-lock helpers."""

from __future__ import annotations

from pathlib import Path

from fiverr_agent_mcp.browser import profile as prof


def _make_user_data(root: Path, profile: str = "Default") -> Path:
    """Build a fake Chrome 'User Data' tree with trust data, caches, and locks."""
    root.mkdir(parents=True, exist_ok=True)
    (root / "Local State").write_text('{"os_crypt": {"encrypted_key": "abc"}}')
    (root / "SingletonLock").write_text("pid")
    (root / "lockfile").write_text("")
    p = root / profile
    p.mkdir(parents=True, exist_ok=True)
    # Trust-bearing files that MUST be cloned.
    (p / "Cookies").write_bytes(b"cookie-db")
    (p / "Preferences").write_text("{}")
    (p / "Login Data").write_bytes(b"logins")
    (p / "Network").mkdir()
    (p / "Network" / "Cookies").write_bytes(b"net-cookies")
    # Bulky/transient dirs that must be skipped.
    (p / "Cache").mkdir()
    (p / "Cache" / "big.bin").write_bytes(b"x" * 1000)
    (p / "Service Worker").mkdir()
    (p / "Service Worker" / "sw.bin").write_bytes(b"y" * 1000)
    (p / "GPUCache").mkdir()
    (p / "GPUCache" / "g.bin").write_bytes(b"z" * 1000)
    return root


def test_clone_copies_trust_data_and_local_state(tmp_path):
    src = _make_user_data(tmp_path / "User Data")
    dst = tmp_path / "automation"

    result = prof.clone_profile(src, dst, "Default")

    assert result["source_present"] is True
    assert result["local_state"] is True
    assert (dst / "Local State").exists()
    assert (dst / "Default" / "Cookies").read_bytes() == b"cookie-db"
    assert (dst / "Default" / "Preferences").exists()
    assert (dst / "Default" / "Login Data").exists()
    assert (dst / "Default" / "Network" / "Cookies").read_bytes() == b"net-cookies"


def test_clone_skips_caches_and_locks(tmp_path):
    src = _make_user_data(tmp_path / "User Data")
    dst = tmp_path / "automation"

    prof.clone_profile(src, dst, "Default")

    assert not (dst / "Default" / "Cache").exists()
    assert not (dst / "Default" / "Service Worker").exists()
    assert not (dst / "Default" / "GPUCache").exists()
    # Singleton files must not be carried into the clone either.
    assert not (dst / "SingletonLock").exists()
    assert not (dst / "lockfile").exists()


def test_clone_missing_profile_does_not_crash(tmp_path):
    """A wrong/absent profile name yields a fresh dir, not an exception."""
    src = tmp_path / "User Data"
    src.mkdir()
    dst = tmp_path / "automation"

    result = prof.clone_profile(src, dst, "Profile 7")

    assert result["source_present"] is False
    assert dst.exists()


def test_strip_singleton_locks_removes_only_lock_files(tmp_path):
    root = tmp_path / "ud"
    root.mkdir()
    (root / "SingletonLock").write_text("x")
    (root / "SingletonSocket").write_text("x")
    (root / "SingletonCookie").write_text("x")
    (root / "lockfile").write_text("x")
    (root / "Local State").write_text("{}")  # must NOT be removed

    removed = prof.strip_singleton_locks(root)

    assert set(removed) == {"SingletonLock", "SingletonSocket", "SingletonCookie", "lockfile"}
    assert not (root / "SingletonLock").exists()
    assert (root / "Local State").exists()


def test_strip_singleton_locks_noop_when_absent(tmp_path):
    root = tmp_path / "ud"
    root.mkdir()
    assert prof.strip_singleton_locks(root) == []

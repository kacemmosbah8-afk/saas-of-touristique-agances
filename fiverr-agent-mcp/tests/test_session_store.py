"""Tests for encrypted/plaintext session persistence."""

from __future__ import annotations

import os

import pytest

from fiverr_agent_mcp.browser.session import _ENC_MAGIC, SessionStore
from fiverr_agent_mcp.config import Settings
from fiverr_agent_mcp.security.crypto import generate_key, is_encryption_available

_STATE = {"cookies": [{"name": "x", "value": "secret"}], "origins": []}


def _settings(tmp_path, key=None) -> Settings:
    return Settings(
        FIVERR_STATE_DIR=str(tmp_path),
        FIVERR_SESSION_KEY=key,
        FIVERR_SESSION_FILE="session.enc",
    )


def test_plaintext_roundtrip(tmp_path):
    store = SessionStore(_settings(tmp_path))
    assert store.exists() is False
    store.save(_STATE)
    assert store.exists() is True
    assert store.load() == _STATE
    # plaintext file must NOT start with the encryption magic
    assert not store.path.read_bytes().startswith(_ENC_MAGIC)


@pytest.mark.skipif(not is_encryption_available(), reason="cryptography not installed")
def test_encrypted_roundtrip_and_at_rest(tmp_path):
    store = SessionStore(_settings(tmp_path, key=generate_key()))
    assert store.encrypted is True
    store.save(_STATE)
    raw = store.path.read_bytes()
    assert raw.startswith(_ENC_MAGIC)
    assert b"secret" not in raw  # plaintext value must not appear on disk
    assert store.load() == _STATE


def test_file_permissions_are_locked_down(tmp_path):
    store = SessionStore(_settings(tmp_path))
    store.save(_STATE)
    mode = os.stat(store.path).st_mode & 0o777
    assert mode == 0o600


def test_clear_removes_file(tmp_path):
    store = SessionStore(_settings(tmp_path))
    store.save(_STATE)
    assert store.clear() is True
    assert store.exists() is False
    assert store.clear() is False


def test_corrupt_file_returns_none(tmp_path):
    store = SessionStore(_settings(tmp_path))
    store.path.parent.mkdir(parents=True, exist_ok=True)
    store.path.write_bytes(b"not json at all")
    assert store.load() is None

"""Tests for redaction and session encryption."""

from __future__ import annotations

import pytest

from fiverr_agent_mcp.security.crypto import (
    SessionCipher,
    build_cipher,
    generate_key,
    is_encryption_available,
)
from fiverr_agent_mcp.security.redaction import RedactingFilter, redact


def test_redact_masks_passwords_and_tokens():
    out = redact("password=hunter2 token=abc123 authorization: Bearer xyz")
    assert "hunter2" not in out
    assert "REDACTED" in out


def test_redact_masks_email():
    out = redact("contact me at john.doe@example.com please")
    assert "john.doe@example.com" not in out
    assert "@example.com" in out


def test_redact_masks_long_blob():
    blob = "A" * 60
    assert blob not in redact(f"cookie value {blob}")


def test_redacting_filter_mutates_record():
    import logging

    record = logging.LogRecord(
        "x", logging.INFO, __file__, 1, "password=secret123value", None, None
    )
    RedactingFilter().filter(record)
    assert "secret123value" not in record.getMessage()


@pytest.mark.skipif(not is_encryption_available(), reason="cryptography not installed")
def test_session_cipher_roundtrip():
    key = generate_key()
    cipher = SessionCipher(key)
    token = cipher.encrypt(b"hello session")
    assert token != b"hello session"
    assert cipher.decrypt(token) == b"hello session"


@pytest.mark.skipif(not is_encryption_available(), reason="cryptography not installed")
def test_wrong_key_fails_to_decrypt():
    from fiverr_agent_mcp.exceptions import ConfigurationError

    token = SessionCipher(generate_key()).encrypt(b"data")
    other = SessionCipher(generate_key())
    with pytest.raises(ConfigurationError):
        other.decrypt(token)


def test_build_cipher_none_when_no_key():
    assert build_cipher(None) is None


def test_invalid_key_raises():
    from fiverr_agent_mcp.exceptions import ConfigurationError

    with pytest.raises(ConfigurationError):
        SessionCipher("not-a-valid-fernet-key")

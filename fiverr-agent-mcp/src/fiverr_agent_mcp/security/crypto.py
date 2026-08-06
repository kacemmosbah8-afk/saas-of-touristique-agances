"""Session-at-rest encryption using Fernet (AES-128-CBC + HMAC-SHA256).

The browser ``storage_state`` (cookies + localStorage) is the crown jewel: it is
equivalent to a logged-in session. We therefore encrypt it on disk with a key
supplied via the ``FIVERR_SESSION_KEY`` environment variable.

If the ``cryptography`` package is unavailable, or no key is configured, callers
are expected to fall back to plaintext *and warn loudly* — this module never
silently downgrades.
"""

from __future__ import annotations

try:  # cryptography is a hard dependency, but degrade gracefully if missing.
    from cryptography.fernet import Fernet, InvalidToken

    _CRYPTO_AVAILABLE = True
except Exception:  # pragma: no cover - only when dependency missing
    Fernet = None  # type: ignore[assignment]
    InvalidToken = Exception  # type: ignore[assignment,misc]
    _CRYPTO_AVAILABLE = False

from ..exceptions import ConfigurationError


def is_encryption_available() -> bool:
    """Return True when the ``cryptography`` backend is importable."""
    return _CRYPTO_AVAILABLE


def generate_key() -> str:
    """Generate a fresh URL-safe base64 Fernet key as a string.

    Used by the CLI/installation guide to help users create
    ``FIVERR_SESSION_KEY``.
    """
    if not _CRYPTO_AVAILABLE:  # pragma: no cover
        raise ConfigurationError(
            "cryptography is not installed; cannot generate a session key.",
            hint="pip install 'cryptography>=42.0.0'",
        )
    return Fernet.generate_key().decode("ascii")


class SessionCipher:
    """Encrypt/decrypt session bytes with a Fernet key.

    Args:
        key: A URL-safe base64-encoded 32-byte Fernet key.
    """

    def __init__(self, key: str) -> None:
        if not _CRYPTO_AVAILABLE:  # pragma: no cover
            raise ConfigurationError(
                "cryptography is not installed; session encryption unavailable.",
                hint="pip install 'cryptography>=42.0.0'",
            )
        try:
            self._fernet = Fernet(key.encode("ascii") if isinstance(key, str) else key)
        except Exception as exc:  # invalid key format
            raise ConfigurationError(
                "FIVERR_SESSION_KEY is not a valid Fernet key.",
                hint="Generate one with: python -m fiverr_agent_mcp.smoke --gen-key",
            ) from exc

    def encrypt(self, plaintext: bytes) -> bytes:
        """Return the encrypted token for ``plaintext``."""
        return self._fernet.encrypt(plaintext)

    def decrypt(self, token: bytes) -> bytes:
        """Return the decrypted plaintext for ``token``.

        Raises:
            ConfigurationError: If the token cannot be decrypted with this key
                (wrong key or corrupted file).
        """
        try:
            return self._fernet.decrypt(token)
        except InvalidToken as exc:
            raise ConfigurationError(
                "Stored session could not be decrypted with FIVERR_SESSION_KEY.",
                hint="The key changed or the file is corrupt. Re-run login to recreate it.",
            ) from exc


def build_cipher(key: str | None) -> SessionCipher | None:
    """Return a :class:`SessionCipher` if ``key`` is set and crypto is available.

    Returns ``None`` when no key is configured (caller falls back to plaintext).
    """
    if not key:
        return None
    if not _CRYPTO_AVAILABLE:  # pragma: no cover
        return None
    return SessionCipher(key)

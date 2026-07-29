"""Persist and restore the Playwright ``storage_state`` (the login session).

The storage state contains cookies and localStorage — i.e. a live Fiverr login.
It is written to ``settings.session_path`` and, when a ``FIVERR_SESSION_KEY`` is
configured, encrypted with Fernet. Without a key we fall back to plaintext and
warn loudly (never silently).

Nothing here is ever logged in plaintext; only high-level events are logged.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from ..config import Settings
from ..logging_config import get_logger
from ..security.crypto import build_cipher, is_encryption_available

logger = get_logger("browser.session")

# Magic prefix distinguishing encrypted files from plaintext JSON on disk.
_ENC_MAGIC = b"FVENC1\n"


class SessionStore:
    """Read/write the encrypted-at-rest browser session.

    Args:
        settings: Active configuration providing the path and optional key.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._path: Path = settings.session_path
        key = settings.session_key.get_secret_value() if settings.session_key else None
        self._cipher = build_cipher(key)
        if key and not is_encryption_available():  # pragma: no cover
            logger.warning(
                "FIVERR_SESSION_KEY is set but 'cryptography' is unavailable; "
                "session will be stored UNENCRYPTED."
            )
        elif not key:
            logger.warning(
                "No FIVERR_SESSION_KEY configured; session will be stored UNENCRYPTED "
                "at %s. Set FIVERR_SESSION_KEY to encrypt it at rest.",
                self._path,
            )

    @property
    def path(self) -> Path:
        return self._path

    @property
    def encrypted(self) -> bool:
        """True when saved sessions will be encrypted."""
        return self._cipher is not None

    def exists(self) -> bool:
        """Return True when a persisted session file is present."""
        return self._path.exists() and self._path.stat().st_size > 0

    def save(self, storage_state: dict[str, Any]) -> None:
        """Encrypt (if configured) and write ``storage_state`` to disk.

        The parent directory is created with ``0700`` permissions and the file
        with ``0600`` so other local users cannot read the session.
        """
        self._path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self._path.parent, 0o700)
        except OSError:  # pragma: no cover - platform dependent
            pass

        raw = json.dumps(storage_state, separators=(",", ":")).encode("utf-8")
        data = _ENC_MAGIC + self._cipher.encrypt(raw) if self._cipher else raw

        tmp = self._path.with_suffix(self._path.suffix + ".tmp")
        tmp.write_bytes(data)
        try:
            os.chmod(tmp, 0o600)
        except OSError:  # pragma: no cover
            pass
        tmp.replace(self._path)
        logger.info(
            "Saved browser session (%s) to %s",
            "encrypted" if self._cipher else "PLAINTEXT",
            self._path,
        )

    def load(self) -> dict[str, Any] | None:
        """Return the decrypted ``storage_state`` or ``None`` if absent.

        Raises:
            ConfigurationError: If an encrypted file cannot be decrypted.
        """
        if not self.exists():
            return None
        data = self._path.read_bytes()
        if data.startswith(_ENC_MAGIC):
            if not self._cipher:
                logger.error(
                    "Session file is encrypted but no valid FIVERR_SESSION_KEY is set."
                )
                return None
            raw = self._cipher.decrypt(data[len(_ENC_MAGIC) :])
        else:
            raw = data
        try:
            state = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            logger.error("Persisted session file is corrupt; ignoring it.")
            return None
        logger.info("Restored browser session from %s", self._path)
        return state

    def clear(self) -> bool:
        """Delete the persisted session file. Returns True if a file was removed."""
        if self._path.exists():
            self._path.unlink()
            logger.info("Cleared persisted session at %s", self._path)
            return True
        return False

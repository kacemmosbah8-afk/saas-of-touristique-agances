"""Log redaction utilities.

Guarantees that credentials, cookies, tokens and session blobs never reach the
logs, even if a developer accidentally passes them to a logger. The
:class:`RedactingFilter` is attached to every handler by
:mod:`fiverr_agent_mcp.logging_config`.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Iterable
from re import Pattern

# Ordered list of (pattern, replacement). Patterns are intentionally broad;
# false positives in logs are acceptable, leaking a secret is not.
_DEFAULT_PATTERNS: list[tuple[Pattern[str], str]] = [
    # key=value style secrets
    (
        re.compile(
            r"(?i)\b(password|passwd|pwd|secret|token|api[_-]?key|session[_-]?key"
            r"|authorization|cookie|set-cookie|csrf|xsrf)\b(\s*[:=]\s*)(\S+)"
        ),
        r"\1\2***REDACTED***",
    ),
    # Bearer tokens
    (re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._\-]+"), "Bearer ***REDACTED***"),
    # JSON-ish "cookies": [ ... ] / "cookie": "..."
    (
        re.compile(r'(?i)"(cookies?|storage_state|value|token)"\s*:\s*"[^"]*"'),
        r'"\1": "***REDACTED***"',
    ),
    # Long base64/hex blobs (likely session or key material)
    (re.compile(r"\b[A-Za-z0-9+/]{40,}={0,2}\b"), "***REDACTED_BLOB***"),
]

_EMAIL_RE = re.compile(r"\b([A-Za-z0-9._%+\-]{1,2})[A-Za-z0-9._%+\-]*@([A-Za-z0-9.\-]+)\b")


def redact(text: str, *, extra_patterns: Iterable[tuple[Pattern[str], str]] | None = None) -> str:
    """Return ``text`` with sensitive substrings masked.

    Args:
        text: Arbitrary string that may contain secrets.
        extra_patterns: Optional additional (compiled regex, replacement) pairs.

    Returns:
        The redacted string. Emails are partially masked (first 1-2 chars kept).
    """
    if not text:
        return text
    result = text
    for pattern, replacement in _DEFAULT_PATTERNS:
        result = pattern.sub(replacement, result)
    if extra_patterns:
        for pattern, replacement in extra_patterns:
            result = pattern.sub(replacement, result)
    result = _EMAIL_RE.sub(r"\1***@\2", result)
    return result


class RedactingFilter(logging.Filter):
    """Logging filter that redacts secrets from every record's message and args."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003 - stdlib name
        try:
            if isinstance(record.msg, str):
                record.msg = redact(record.msg)
            if record.args:
                if isinstance(record.args, dict):
                    record.args = {k: self._redact_value(v) for k, v in record.args.items()}
                else:
                    record.args = tuple(self._redact_value(a) for a in record.args)
        except Exception:  # pragma: no cover - never break logging
            pass
        return True

    @staticmethod
    def _redact_value(value: object) -> object:
        if isinstance(value, str):
            return redact(value)
        return value

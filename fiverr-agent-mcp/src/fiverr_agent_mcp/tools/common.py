"""Shared helpers for tool modules.

Centralizes the two things every tool needs:

* :func:`tool_guard` — a decorator that turns typed exceptions and unexpected
  errors into concise, actionable JSON error strings (never leaking secrets or
  stack traces to the model).
* :func:`dump` — consistent JSON serialization for Pydantic models / lists.

Keeping these here means individual tools stay thin and uniform.
"""

from __future__ import annotations

import functools
import json
from collections.abc import Awaitable, Callable, Sequence
from typing import Any, TypeVar

from pydantic import BaseModel

from ..exceptions import ConfirmationRequired, DryRunBlocked, FiverrAgentError
from ..logging_config import get_logger

logger = get_logger("tools")

F = TypeVar("F", bound=Callable[..., Awaitable[str]])


def dump(value: Any) -> str:
    """Serialize ``value`` to a pretty JSON string.

    Handles Pydantic models, sequences of models, dicts and primitives.
    """
    if isinstance(value, BaseModel):
        return value.model_dump_json(indent=2)
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        items = [v.model_dump() if isinstance(v, BaseModel) else v for v in value]
        return json.dumps(items, indent=2, default=str)
    return json.dumps(value, indent=2, default=str)


def ok(payload: Any, **extra: Any) -> str:
    """Wrap a successful result with a stable envelope."""
    body: dict[str, Any] = {"ok": True}
    if isinstance(payload, BaseModel):
        body["result"] = payload.model_dump()
    elif isinstance(payload, Sequence) and not isinstance(payload, (str, bytes)):
        body["result"] = [p.model_dump() if isinstance(p, BaseModel) else p for p in payload]
        body["count"] = len(body["result"])
    else:
        body["result"] = payload
    body.update(extra)
    return json.dumps(body, indent=2, default=str)


def tool_guard(func: F) -> F:
    """Decorator: run a tool and convert errors into safe JSON strings.

    * :class:`DryRunBlocked` becomes a ``{"ok": false, "dry_run": true, ...}``
      preview rather than an error, so agents can safely rehearse actions.
    * Any :class:`FiverrAgentError` becomes its ``to_dict()`` payload.
    * Anything else is logged (with redaction) and returned as a generic error
      — the raw exception text is never forwarded to the model.
    """

    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> str:
        try:
            return await func(*args, **kwargs)
        except ConfirmationRequired as exc:
            logger.info("Confirmation required in %s", func.__name__)
            payload = {"ok": False, "confirmation_required": True, **exc.to_dict()}
            if getattr(exc, "details", None):
                payload["action"] = exc.details
            return json.dumps(payload, indent=2, default=str)
        except DryRunBlocked as exc:
            logger.info("Dry-run blocked in %s: %s", func.__name__, exc.message)
            return json.dumps(
                {"ok": False, "dry_run": True, **exc.to_dict()}, indent=2
            )
        except FiverrAgentError as exc:
            logger.warning("%s failed: %s", func.__name__, exc.message)
            return json.dumps({"ok": False, **exc.to_dict()}, indent=2)
        except Exception as exc:  # pragma: no cover - defensive catch-all
            logger.exception("Unexpected error in %s", func.__name__)
            return json.dumps(
                {
                    "ok": False,
                    "error": True,
                    "code": "internal_error",
                    "message": f"Unexpected {type(exc).__name__} while running {func.__name__}.",
                    "hint": "Check server logs (stderr) for details.",
                },
                indent=2,
            )

    return wrapper  # type: ignore[return-value]

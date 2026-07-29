"""Selector probing.

The heart of the compatibility report: given a logical element and the ordered
list of fallback selectors from :mod:`fiverr_agent_mcp.browser.selectors`, probe
each variant against the *live* page and record how many nodes it matches. This
tells us exactly which selectors still work on the current Fiverr DOM and which
need updating — the actionable output for fixing selectors.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - typing only
    from playwright.async_api import Page


@dataclass
class ProbeResult:
    """Outcome of probing one logical element's selector variants."""

    label: str
    #: The first selector variant that matched (``None`` if none did).
    matched: str | None
    #: Per-variant match counts, in priority order.
    counts: dict[str, int] = field(default_factory=dict)

    @property
    def found(self) -> bool:
        return self.matched is not None

    @property
    def match_count(self) -> int:
        return self.counts.get(self.matched, 0) if self.matched else 0

    @property
    def confidence(self) -> str:
        return selector_confidence(self.matched, self.match_count)

    def to_dict(self) -> dict:
        return {
            "label": self.label,
            "found": self.found,
            "matched": self.matched,
            "match_count": self.match_count,
            "confidence": self.confidence,
            "counts": self.counts,
        }


def selector_confidence(selector: str | None, count: int) -> str:
    """Rate how trustworthy a matched selector is.

    Confidence reflects the *stability* of the selector kind (do we expect it to
    keep matching across Fiverr UI changes?), not just whether it matched now:

    * ``high``   — stable hooks: ``data-testid``, ``aria-label``, ``name=``,
      ``role=`` attributes, or an ``#id``.
    * ``medium`` — text/attribute heuristics: ``:has-text``, ``placeholder``,
      ``href`` — usually stable but locale/label sensitive.
    * ``low``    — broad structural fallbacks: ``[class*=...]``, ``table tbody
      tr``, bare tags — brittle, likely to drift.
    * ``none``   — nothing matched.
    """
    if not selector or count <= 0:
        return "none"
    s = selector.lower()
    if any(k in s for k in ("data-testid", "aria-label", "name=", "role=")) or s.strip().startswith("#"):
        return "high"
    if any(k in s for k in (":has-text", ":text", "placeholder", "href")):
        return "medium"
    return "low"


async def probe_selectors(page: Page, label: str, variants: list[str]) -> ProbeResult:
    """Probe every selector in ``variants`` against ``page``.

    Args:
        page: The live Playwright page (already navigated).
        label: Human label for the logical element (e.g. "conversation rows").
        variants: Ordered selector fallbacks to test.

    Returns:
        A :class:`ProbeResult` recording per-variant match counts and the first
        variant that matched.
    """
    counts: dict[str, int] = {}
    matched: str | None = None
    for selector in variants:
        try:
            count = await page.locator(selector).count()
        except Exception:
            count = 0
        counts[selector] = count
        if count and matched is None:
            matched = selector
    return ProbeResult(label=label, matched=matched, counts=counts)

"""Rule-based scoring and text-processing heuristics.

Pure functions with no I/O so they are trivially testable and side-effect free.
Each returns a Pydantic model from :mod:`fiverr_agent_mcp.models` (or plain data)
with an explicit list of the signals that drove the result, so the calling agent
can see *why*, not just *what*.
"""

from __future__ import annotations

import re

from ..models import ChatMessage, Lead, LeadScore, PriceSuggestion, SpamVerdict

# --------------------------------------------------------------------------- #
# Shared keyword banks
# --------------------------------------------------------------------------- #
_SPAM_PHRASES = (
    "whatsapp",
    "telegram",
    "contact me outside",
    "off fiverr",
    "gmail.com",
    "pay outside",
    "western union",
    "gift card",
    "crypto only",
    "send money first",
    "double your",
    "investment opportunity",
    "click this link",
    "verify your account",
)
_URGENCY_WORDS = ("urgent", "asap", "immediately", "right now", "today only")
_POSITIVE_LEAD_WORDS = (
    "long-term",
    "long term",
    "ongoing",
    "recurring",
    "professional",
    "detailed",
    "budget",
    "milestone",
)
_VAGUE_WORDS = ("cheap", "cheapest", "lowest price", "simple task", "quick job", "easy money")

_CURRENCY_RE = re.compile(r"(?:\$|usd\s*)(\d+(?:\.\d+)?)", re.IGNORECASE)
_URL_RE = re.compile(r"https?://|www\.", re.IGNORECASE)
_EMAIL_RE = re.compile(r"[\w.\-]+@[\w.\-]+\.\w+")


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _extract_budget(text: str) -> float | None:
    """Return the first dollar amount found in ``text`` (if any)."""
    match = _CURRENCY_RE.search(text or "")
    return float(match.group(1)) if match else None


# --------------------------------------------------------------------------- #
# Spam / scam detection
# --------------------------------------------------------------------------- #
def detect_spam(text: str) -> SpamVerdict:
    """Classify ``text`` as spam/scam using keyword and pattern heuristics.

    Args:
        text: Message or lead body to evaluate.

    Returns:
        A :class:`SpamVerdict` with a boolean, 0-1 confidence, and reasons.
    """
    reasons: list[str] = []
    lowered = (text or "").lower()
    score = 0.0

    for phrase in _SPAM_PHRASES:
        if phrase in lowered:
            reasons.append(f"Contains suspicious phrase: '{phrase}'")
            score += 0.35

    if _URL_RE.search(lowered):
        reasons.append("Contains an external link")
        score += 0.2
    if _EMAIL_RE.search(text or ""):
        reasons.append("Contains an email address (off-platform contact)")
        score += 0.25
    if sum(word in lowered for word in _URGENCY_WORDS) >= 2:
        reasons.append("High-pressure urgency language")
        score += 0.15
    if len(lowered) < 15 and lowered:
        reasons.append("Extremely short / low-effort message")
        score += 0.1

    confidence = _clamp(score)
    return SpamVerdict(is_spam=confidence >= 0.5, confidence=round(confidence, 2), reasons=reasons)


# --------------------------------------------------------------------------- #
# Lead scoring / win probability
# --------------------------------------------------------------------------- #
def score_lead(lead: Lead, seller_avg_price: float | None = None) -> LeadScore:
    """Score a lead 0-100 and estimate win probability.

    Combines budget quality, description richness, professionalism signals, and
    spam risk. ``seller_avg_price`` (if provided) rewards leads whose budget is
    close to or above the seller's typical price.

    Args:
        lead: The lead to score.
        seller_avg_price: Optional seller average gig price for budget fit.

    Returns:
        A :class:`LeadScore` with score, win probability, signals and risks.
    """
    signals: list[str] = []
    risks: list[str] = []
    score = 40.0  # neutral baseline

    text = f"{lead.title} {lead.description}".strip()
    lowered = text.lower()

    # Description richness
    length = len(lead.description or "")
    if length > 300:
        score += 15
        signals.append("Detailed request (>300 chars)")
    elif length < 40:
        score -= 10
        risks.append("Very short / vague request")

    # Professional language
    hits = [w for w in _POSITIVE_LEAD_WORDS if w in lowered]
    if hits:
        score += min(15, 5 * len(hits))
        signals.append(f"Professional signals: {', '.join(sorted(set(hits)))}")

    # Vague / bargain-hunter language
    vague = [w for w in _VAGUE_WORDS if w in lowered]
    if vague:
        score -= min(20, 7 * len(vague))
        risks.append(f"Bargain-hunter language: {', '.join(sorted(set(vague)))}")

    # Budget fit
    budget = _extract_budget(lead.budget or "") or _extract_budget(text)
    if budget is not None:
        if seller_avg_price:
            ratio = budget / seller_avg_price if seller_avg_price else 1.0
            if ratio >= 1.0:
                score += 15
                signals.append(f"Budget ${budget:.0f} meets/exceeds your avg ${seller_avg_price:.0f}")
            elif ratio >= 0.6:
                score += 5
                signals.append(f"Budget ${budget:.0f} is workable vs your avg")
            else:
                score -= 15
                risks.append(f"Budget ${budget:.0f} well below your avg ${seller_avg_price:.0f}")
        elif budget >= 100:
            score += 10
            signals.append(f"Healthy budget (${budget:.0f})")
        elif budget < 15:
            score -= 10
            risks.append(f"Low budget (${budget:.0f})")
    else:
        risks.append("No stated budget")

    # Spam penalty
    spam = detect_spam(text)
    if spam.is_spam:
        score -= 40
        risks.append("Flagged as likely spam/scam")

    score_int = int(_clamp(score, 0, 100))
    win = _clamp(score_int / 100.0 * (0.2 if spam.is_spam else 1.0))
    return LeadScore(
        score=score_int,
        win_probability=round(win, 2),
        signals=signals,
        risks=risks,
        recommended=score_int >= 55 and not spam.is_spam,
    )


def estimate_win_probability(
    lead: Lead,
    seller_rating: float | None = None,
    response_time_hours: float | None = None,
    seller_avg_price: float | None = None,
) -> float:
    """Estimate the 0-1 probability of winning ``lead``.

    Starts from the lead score and adjusts for seller reputation and speed.

    Args:
        lead: The lead in question.
        seller_rating: Seller rating out of 5 (higher improves odds).
        response_time_hours: Typical response time (faster improves odds).
        seller_avg_price: Optional seller average price for budget fit.

    Returns:
        A probability in ``[0.0, 1.0]`` rounded to 2 decimals.
    """
    base = score_lead(lead, seller_avg_price=seller_avg_price).win_probability
    if seller_rating is not None:
        base *= _clamp(0.6 + (seller_rating / 5.0) * 0.4, 0.5, 1.0)
    if response_time_hours is not None:
        if response_time_hours <= 1:
            base *= 1.15
        elif response_time_hours >= 12:
            base *= 0.8
    return round(_clamp(base), 2)


# --------------------------------------------------------------------------- #
# Pricing
# --------------------------------------------------------------------------- #
def suggest_price(
    scope_text: str,
    base_price: float = 50.0,
    complexity: str = "medium",
    currency: str = "USD",
) -> PriceSuggestion:
    """Suggest a price range for a piece of work.

    Args:
        scope_text: Description of the work / buyer request.
        base_price: The seller's baseline package price.
        complexity: One of ``"low"``, ``"medium"``, ``"high"``.
        currency: Currency code for the response.

    Returns:
        A :class:`PriceSuggestion` with low/recommended/high and rationale.
    """
    rationale: list[str] = []
    multiplier = {"low": 0.7, "medium": 1.0, "high": 1.6}.get(complexity.lower(), 1.0)
    rationale.append(f"Complexity '{complexity}' -> x{multiplier} baseline")

    lowered = (scope_text or "").lower()
    scope_bump = 0.0
    for word, bump in (("urgent", 0.25), ("rush", 0.25), ("revisions", 0.1), ("source file", 0.1)):
        if word in lowered:
            scope_bump += bump
            rationale.append(f"'{word}' detected -> +{int(bump * 100)}%")
    length_bump = min(0.4, len(lowered) / 2000.0)
    if length_bump:
        rationale.append(f"Detailed scope -> +{int(length_bump * 100)}%")

    recommended = base_price * multiplier * (1 + scope_bump + length_bump)
    return PriceSuggestion(
        currency=currency,
        low=round(recommended * 0.8, 2),
        recommended=round(recommended, 2),
        high=round(recommended * 1.35, 2),
        rationale=rationale,
    )


# --------------------------------------------------------------------------- #
# Text improvement
# --------------------------------------------------------------------------- #
def _tidy(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    if text and text[-1] not in ".!?":
        text += "."
    return text


def rewrite_proposal_text(draft: str, buyer_name: str | None = None) -> str:
    """Restructure a proposal draft into a clear, professional template.

    Adds a greeting, tightens whitespace, and appends a call to action while
    preserving the seller's content.

    Args:
        draft: The seller's raw proposal text.
        buyer_name: Optional buyer name for a personalized greeting.

    Returns:
        The rewritten proposal text.
    """
    greeting = f"Hi {buyer_name}," if buyer_name else "Hi there,"
    body = _tidy(draft)
    cta = "I'd love to help — happy to hop on a quick chat to align on details before we start."
    return f"{greeting}\n\n{body}\n\n{cta}\n\nBest regards"


def improve_reply_text(draft: str, tone: str = "professional") -> str:
    """Polish a short reply for clarity and tone.

    Args:
        draft: The raw reply text.
        tone: ``"professional"``, ``"friendly"``, or ``"concise"``.

    Returns:
        The improved reply text.
    """
    body = _tidy(draft)
    if tone == "friendly":
        return f"Thanks so much for reaching out! {body} Looking forward to working with you 😊"
    if tone == "concise":
        return body
    return f"Thank you for your message. {body} Please let me know if you have any questions."


# --------------------------------------------------------------------------- #
# Summarization / client analysis
# --------------------------------------------------------------------------- #
def summarize_conversation(messages: list[ChatMessage], max_points: int = 5) -> dict:
    """Produce an extractive summary of a conversation thread.

    Selects the most informative lines (longest, question-bearing, or
    money/deadline-mentioning) as bullet points — deterministic and dependency
    free.

    Args:
        messages: Ordered conversation messages.
        max_points: Maximum bullet points to return.

    Returns:
        Dict with ``message_count``, ``participants``, ``key_points`` and
        ``action_items``.
    """
    participants = sorted({m.sender for m in messages if m.sender})
    scored: list[tuple[float, str]] = []
    action_items: list[str] = []
    for msg in messages:
        body = (msg.body or "").strip()
        if not body:
            continue
        weight = min(len(body) / 100.0, 3.0)
        low = body.lower()
        if "?" in body:
            weight += 1.0
        if any(k in low for k in ("deadline", "budget", "$", "deliver", "revision")):
            weight += 1.5
        if any(k in low for k in ("please", "can you", "need you to", "make sure")):
            action_items.append(body)
        scored.append((weight, body))

    scored.sort(key=lambda x: x[0], reverse=True)
    key_points = [b for _, b in scored[:max_points]]
    return {
        "message_count": len(messages),
        "participants": participants,
        "key_points": key_points,
        "action_items": action_items[:max_points],
    }


def analyze_client_profile(
    messages: list[ChatMessage],
    country: str | None = None,
    stated_budget: str | None = None,
) -> dict:
    """Analyze a client's messaging behavior for tone, risk, and buying signals.

    Args:
        messages: Messages received from the client.
        country: Optional buyer country.
        stated_budget: Optional stated budget string.

    Returns:
        Dict with ``sentiment``, ``risk_level``, ``buying_signals``,
        ``red_flags`` and ``spam`` verdict.
    """
    joined = " ".join(m.body for m in messages if m.body)
    spam = detect_spam(joined)

    buying_signals: list[str] = []
    red_flags: list[str] = []
    low = joined.lower()
    for word in ("ready to start", "let's do it", "please send offer", "when can you"):
        if word in low:
            buying_signals.append(word)
    for word in ("free sample", "discount", "cheapest", "before payment"):
        if word in low:
            red_flags.append(word)

    positives = sum(low.count(w) for w in ("thanks", "great", "perfect", "appreciate", "please"))
    negatives = sum(low.count(w) for w in ("bad", "wrong", "angry", "refund", "terrible", "asap"))
    if positives > negatives:
        sentiment = "positive"
    elif negatives > positives:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    if spam.is_spam or len(red_flags) >= 2:
        risk = "high"
    elif red_flags:
        risk = "medium"
    else:
        risk = "low"

    return {
        "sentiment": sentiment,
        "risk_level": risk,
        "buying_signals": buying_signals,
        "red_flags": red_flags,
        "country": country,
        "stated_budget": stated_budget,
        "spam": spam.model_dump(),
    }

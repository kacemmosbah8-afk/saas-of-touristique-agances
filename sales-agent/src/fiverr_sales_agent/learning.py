"""Learning store — records outcomes and feeds insights back into scoring.

After each conversation you record whether it was won/lost, the final price,
satisfaction, response time and lessons. The aggregated insights (win rate,
average price by project type, response time) are used to nudge future
estimates via :meth:`LearningStore.adjust_win_probability`.
"""

from __future__ import annotations

import json
from pathlib import Path
from statistics import mean

from .models import Outcome, ProjectType


class LearningStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._outcomes: list[Outcome] = []
        self._load()

    def _load(self) -> None:
        if self._path.exists():
            try:
                data = json.loads(self._path.read_text(encoding="utf-8"))
                self._outcomes = [Outcome.model_validate(o) for o in data.get("outcomes", [])]
            except Exception:
                self._outcomes = []

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"outcomes": [o.model_dump() for o in self._outcomes]}
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
        tmp.replace(self._path)

    def record(self, outcome: Outcome) -> None:
        self._outcomes.append(outcome)
        self._save()

    @property
    def outcomes(self) -> list[Outcome]:
        return list(self._outcomes)

    # -- aggregates ------------------------------------------------------- #
    def win_rate(self) -> float | None:
        if not self._outcomes:
            return None
        return round(sum(1 for o in self._outcomes if o.won) / len(self._outcomes), 3)

    def average_response_time(self) -> float | None:
        times = [o.response_time_hours for o in self._outcomes if o.response_time_hours is not None]
        return round(mean(times), 2) if times else None

    def average_price(self, project_type: ProjectType | None = None) -> float | None:
        won = [o for o in self._outcomes if o.won and o.final_price > 0]
        if project_type is not None:
            won = [o for o in won if o.project_type == project_type]
        return round(mean(o.final_price for o in won), 2) if won else None

    def win_rate_for(self, project_type: ProjectType) -> float | None:
        rel = [o for o in self._outcomes if o.project_type == project_type]
        if not rel:
            return None
        return round(sum(1 for o in rel if o.won) / len(rel), 3)

    def lessons(self, limit: int = 10) -> list[str]:
        out: list[str] = []
        for o in reversed(self._outcomes):
            out.extend(o.lessons)
            if len(out) >= limit:
                break
        return out[:limit]

    def adjust_win_probability(self, base: float, project_type: ProjectType) -> float:
        """Blend the base estimate with the observed win rate for this type.

        With enough history, pull the estimate toward reality (70% base / 30%
        observed); with little history, keep the base estimate.
        """
        observed = self.win_rate_for(project_type)
        rel = [o for o in self._outcomes if o.project_type == project_type]
        if observed is None or len(rel) < 3:
            return round(base, 2)
        return round(0.7 * base + 0.3 * observed, 2)

    def insights(self) -> dict:
        return {
            "outcomes_recorded": len(self._outcomes),
            "win_rate": self.win_rate(),
            "average_response_time_hours": self.average_response_time(),
            "average_won_price": self.average_price(),
            "recent_lessons": self.lessons(5),
        }

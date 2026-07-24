# TravelOS

Read `PROJECT.md`'s **Status** section (top of file, "What TravelOS is
today" + "Capabilities removed...") first — it's the canonical, kept-current
summary of what this product actually is and does. Everything below that in
`PROJECT.md` is a chronological build log; later entries can override
earlier ones (e.g. §15–§33 describe capability later removed — read those as
history, not current behavior).

To pick up where a previous session left off:
1. `git log --oneline -20` — recent commits read like a changelog.
2. `git status` — uncommitted work in progress; don't discard without checking with the user first.
3. `docs/ARCHITECTURE_PIVOT_PLAN.md` for the migration rationale if touching
   anything pre-pivot.

See `README.md` for stack, setup, and commands.

# /startday Routine

Use this routine when Sergio types `/startday`.

Purpose: restart development from project memory, identify the current state, and propose a practical plan for the day.

## Procedure

1. Read `docs/SHADOW_BOARD_MEMORY.md`.
2. Inspect current repo state:
   - `git status --short`
   - recent files changed
   - package scripts
   - current app routes if relevant
3. Identify:
   - last completed work
   - open decisions
   - pending items
   - backlog items that are now relevant
   - bugs or blockers
4. Propose a plan of the day with:
   - primary objective
   - 3 to 5 concrete tasks
   - expected output
   - verification plan
5. If Sergio has already given a priority for the day, follow that priority over the default plan.
6. If the plan requires a product decision, ask only the minimum necessary question.
7. If no clarification is needed, start executing once the plan is accepted or if Sergio asks to proceed.

## Planning Bias

Prefer work that strengthens the approved architecture:
- Company Brain
- Governance Run
- Board Pack
- Shadow Board Review
- Decision Memory
- Dashboard and follow-ups
- billing and i18n foundations
- memory and agent architecture

Avoid starting with:
- cosmetic-only changes
- Resenha-only customization
- one-off demo shortcuts
- features that do not improve memory, decision quality, or follow-through

## Startday Output Format

Use this structure:

```
Startday readout

Last known state:
[short summary]

Highest-leverage focus today:
[one sentence]

Plan:
1. ...
2. ...
3. ...

Verification:
[how we will know the day worked]
```


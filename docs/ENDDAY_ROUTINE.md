# /endday Routine

Use this routine when Sergio types `/endday`.

Purpose: close the workday or sprint by updating project memory so the next session can restart with full context.

## Procedure

1. Read `docs/SHADOW_BOARD_MEMORY.md`.
2. Inspect current repo state:
   - `git status --short`
   - recent files changed
   - relevant tests or build results, if run
3. Ask no broad questions unless a blocking ambiguity prevents an accurate closeout.
4. Update `docs/SHADOW_BOARD_MEMORY.md` with:
   - date
   - sprint summary
   - completed work
   - files changed
   - decisions made
   - pending items
   - backlog additions
   - bugs found
   - tests/build checks run
   - unresolved risks or blockers
   - suggested next-day plan
5. If the repo has meaningful changes, summarize:
   - what changed
   - what was verified
   - what remains risky
6. Do not mark uncertain work as complete.
7. Do not delete old memory. Append or update sections carefully.

## Memory Update Rules

Always preserve:
- North Star
- approved architecture
- Resenha boundary
- agent definitions
- open decisions
- backlog
- bugs

When adding a backlog item:
- make it concrete
- state why it matters
- avoid vague items like "improve UX" without a target surface

When adding a bug:
- include observed behavior
- expected behavior
- likely file or module if known
- severity if obvious

When adding a decision:
- include the decision
- include the reason
- include any trade-off

## Endday Output Format

End the user-facing response with:

```
Endday complete.
Memory updated: docs/SHADOW_BOARD_MEMORY.md
Next recommended focus: [one sentence]
```


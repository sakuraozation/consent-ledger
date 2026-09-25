# AI use

Built with Claude Code (Opus 5). This file records where AI was used and where the
decisions were mine, per the event's attribution rule.

## How the work was directed

- `CLAUDE.md` — the working rules the agent operated under for the whole event.
- `specs/sketch.md` — the concept, written by me at the event.
- `specs/requirements.md` — the prize requirements, transcribed by me.
- `prompts/` — the instruction that opened each step, one entry per step.

## Per-file attribution

| File | Who |
|---|---|
| `specs/*` | me |
| `prompts/*` | me |
| `src/ledger.ts` | Claude Code, from my spec of the four outcomes and the check order |
| `src/api.ts` | Claude Code |
| `src/worldid.ts`, `scripts/*` | Claude Code, pre-event (disclosed scaffold) |

## What I decided, not the model

- the subject and why the agency is the customer (see `specs/sketch.md` 2–4)
- the four outcomes and which moment the demo shows
- the cut line for Saturday 18:00
- the order of the checks, and the rule that an expired consent asks the human rather than denying
- the pitch

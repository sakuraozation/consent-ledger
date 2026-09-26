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
| `src/chain.ts`, `scripts/ens-*.ts` | Claude Code, against the verified contract source (not the blog post); the fail-closed rule and the two-layer split are mine |
| `src/api.ts` | Claude Code |
| `src/approval.ts` | Claude Code, against the OIDC discovery document I had it read; rewritten for the device flow after the code flow failed |
| `migrations/*` | Claude Code |
| `src/ui.tsx`, `src/screens.tsx` | Claude Code, from the journey and intents I wrote |
| `docs/journey.md`, `docs/intents.md`, `docs/conventions.md`, `intel/market.md` | me (drafted with Claude Code, edited and decided by me) |
| `src/worldid.ts`, `scripts/*` | Claude Code, pre-event (disclosed scaffold) |

## What I decided, not the model

- the subject and why the agency is the customer (see `specs/sketch.md` 2–4)
- the four outcomes and which moment the demo shows
- the cut line for Saturday 18:00
- the two-minute deadline on a pending approval, and that expiry stops the action rather than erroring
- the order of the checks, and the rule that an expired consent asks the human rather than denying
- the decision to abandon the authorization-code flow rather than keep debugging it
- the pitch
- the decision to abandon app.ens.dev and call the ETHRegistrar directly, and to read the
  ABI from the verified source rather than trust the blog post
- swapping the third prize slot to ENS once the on-chain delegation worked
- that the chain wins when the two layers disagree, and that an unreadable chain must fall
  back to asking a human rather than allowing
- that the person is never asked to hold a wallet
- that the scopes divide by kind of use, not by media type — the shoot's outputs are the
  agency's and always have been; anything generated from their body data is theirs
- that per-scope withdrawal replaces taking back all authority, because the adversary is the
  third party and ending the agency's authority does nothing to them
- not connecting x402: the payee cannot vary per request, and paying them directly collides
  with the decision that they hold no key

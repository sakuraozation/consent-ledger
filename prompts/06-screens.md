# 06 — the three screens

## Instruction

> Build the screens from `docs/journey.md`, following `docs/conventions.md`: server-rendered
> Hono JSX, no client bundle, one hand-written stylesheet.
>
> Three surfaces, one per actor, and each shows only what that actor's intent needs
> (`docs/intents.md`): the agency sees the roster; the person sees a list with one button;
> the generating side sees a button and a verdict.
>
> A screen never decides anything — it prints the `reason` from the ledger unchanged. The
> waiting state polls with a meta refresh and shows the code, the countdown, and what
> happens if nobody answers.

## Outcome

`src/ui.tsx`, `src/screens.tsx`. Walked the whole journey on the deployed Worker:
expired → **ask** → user code with a countdown → approved on a phone → **allow** →
revoked on the person's page → the same request comes back **revoked**, and the screen
says nothing was generated.

The no-bundle choice paid off in the demo rather than in the build: because every state
survives a page reload, the refusal after a revocation is visibly a server fact, not a
client re-render.

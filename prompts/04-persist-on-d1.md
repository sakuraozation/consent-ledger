# 04 — persistence (D1)

## Instruction

> Deployed to Workers and the demo broke: put a consent, then check it, and the answer
> came back "no consent on file". Workers run each request in a fresh isolate, so the
> in-memory map only ever worked because local dev happened to be one process.
>
> Move both stores — consents and pending approvals — to D1. Keep the shape of the
> decision unchanged; only the storage moves. The waiting state has to survive too,
> because the callback arrives in a different request than the one that started it.

## Outcome

`migrations/0001_init.sql`, and `ledger.ts` / `approval.ts` rewritten against D1.
Verified on the deployed Worker: allow → deny (out of scope) → revoke → the same request
comes back refused.

Worth keeping for the debrief: this only showed up in production. Local dev gave a false
pass, which is the kind of thing that eats an hour at 2am if you find it on Sunday
instead of Friday.

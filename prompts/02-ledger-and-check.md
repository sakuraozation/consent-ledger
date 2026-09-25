# 02 — the ledger and the check endpoint

## Instruction

> Write the consent ledger and the endpoint an agent calls before generating. Four
> outcomes only — allow / deny / ask / revoked — and every one of them returns a reason
> string that can be shown on screen unchanged.
>
> The order of the checks carries the argument, so make it explicit in the code:
> revocation outranks everything (the subject's will sits above scope and expiry);
> out-of-scope is a flat denial and we do not ask a human, because it was never granted;
> **expiry falls through to "ask", not to "deny"** — an expired consent doesn't mean the
> person changed their mind, it means nobody asked them lately.
>
> Store nothing identifying: the subject is a World ID nullifier, and no images or scan
> data go in. Revocation must work without the custodian.

## Outcome

`src/ledger.ts` and `src/api.ts`. Verified by hand against all four paths, including the
one the demo turns on: allow → revoke → the same request comes back refused.

I set the check order and the expiry→ask rule; those are the argument of the project,
not an implementation detail. The default TTL of 60 seconds is a demo affordance — the
video has to show an expiry in real time, since speed-ups are disqualifying.

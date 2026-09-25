# 08 — delegation (the reframe)

## Instruction

> The framing is wrong and it shows in the screens. "The person revokes without the
> agency" reads as if the agency were the threat. It isn't: a model has an agency because
> selling herself is not her job, and she is not going to audit AI pipelines either. The
> adversary is whoever reuses the scan without asking, and right now **neither of them can
> do anything**.
>
> Rebuild around that. The agency operates: it issues consents and revokes them when it
> hears about a misuse — that is the daily path. The person delegates that authority and
> keeps one power: **withdrawing the delegation**, which invalidates everything issued
> under it at once and cannot be undone by the agency.
>
> Note what this is: delegated, revocable authority over a name. That is ENSv2's
> permission model exactly, so write the mapping into the README rather than pretending
> our table is the point.

## Outcome

`src/delegation.ts`, a `delegations` table, and the rule threaded through `check`: no live
delegation means nothing issued under it is honoured. Revocations now record whether the
custodian or the subject pressed the button, because the normal case is the agency acting
on a phone call and the exceptional case is the person acting alone.

Verified in production: no delegation → the agency cannot issue; delegate → issue → allow;
withdraw → every consent under it refused with that reason.

The reframe came from the user, not from me, and it is the better product: it stops
selling "protection from your agency" to agencies.

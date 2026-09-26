# 07 — showing their where it was used

## Instruction

> Their complaint was that they cannot tell when it happens. The screens so far only show
> what they agreed to, which solves half the problem.
>
> Record every check — allow, deny, ask and revoked alike — and show it on their page. The
> refusals matter as much as the approvals: knowing that someone tried and was turned
> away is part of knowing what is going on with your own data.
>
> Also: in this industry the message goes over chat. Do not build a LINE mini app for a
> room full of judges who do not use LINE, but write the approval request so it can be
> pasted into one, and let the screen show that it was written that way.

## Outcome

A `uses` table, `GET /uses/:subject`, and a log on `/me` with a one-line summary — how
many asked, how many went through, how many did not.

While testing it, the log exposed a real defect: **one revocation was poisoning every
later request for that person**, because the revocation check ran across all of them
consents rather than the ones matching the requested scope. An agency could grant a fresh
consent and it would never take effect. Fixed so that revocation kills a consent, not a
person — verified across all five cases including the one that was broken (revoke, grant
again, allowed).

That bug was invisible until the usage log made the history visible. Worth saying out
loud in the pitch: the feature that shows their what happened is also what showed us what
we got wrong.

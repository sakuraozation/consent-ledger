# Customer journey

Three people, one record. Written before the screens, so the screens have something to be
measured against; revised once the framing changed (the agency is the operator, not the
adversary).

---

## 1. The scan already happened

A model shoots a campaign. As part of it, she is photographed from many angles — this is
normal, paid, and agreed. Months later a friend sends her an ad. It is not her face
exactly, but it is her body, her posture, her proportions. Nobody asked.

She calls her agency — the people whose job is exactly this. **They cannot do anything
either.** Nobody can see it, so nobody can stop it. That is the state before anything we
build.

## 2. She delegates, and the agency puts the consent on the record

First she gives her agency the authority to act — the same thing she already does by
signing with them, made explicit enough for a machine to honour. Without it they cannot
issue anything, and nothing they issue is honoured.

Then they do the work. The agency already knows the terms — which medium, until when, how.
Until now that lived in a contract nobody can query at the speed generation happens.

They create a consent: **who**, **what use**, **until when**. The person is identified by
a World ID pairwise subject, so the record says *this human*, not *this name*. No images
and no scan data are stored.

> *Screen: agency dashboard — roster, scope, expiry, status.*

## 3. The generating side asks first

A brand's pipeline is about to produce an image from that body data. Before it generates,
it asks:

```
POST /check  { subject, scope }
```

Four things can come back, each with a reason written to be shown to a human unchanged:

- **allow** — in scope, not expired, not revoked
- **deny** — the use was never granted. Nobody is asked; there is nothing to ask about
- **ask** — no record yet, or the record expired. Expiry does not mean she said no; it
  means nobody has asked her lately
- **revoked** — she took it back

> *Screen: the requesting side — one button, and the verdict with its reason.*

## 4. When the answer is `ask`, a human decides

The pipeline stops and asks. It shows a short code. She approves on her phone — a
separate device, a separate session, nothing to install for the pipeline.

Her identity is verified **on our server** against the issuer's keys. Until that passes,
nothing is approved. The subject comes back the same as last time, which is how we know
it is the same person and not someone borrowing her account.

**While it waits, the generation does not happen.** If she does not answer within the
deadline, the request expires and the generation still does not happen. That is a
decision, not an oversight: an agent that proceeds on silence is not asking.

> *Screen: the waiting state — the code, the countdown, and what happens if nobody
> answers.*

## 5. Something is wrong, and it stops

Usually this is a message: she tells her agency, and they press Revoke. Seconds later the
same request from the same pipeline comes back **refused, with the reason**. That is the
daily path, and it is the one that has never existed before — until now neither of them
could stop anything.

> *Screen: the agency revokes, then the same request refused.*

The rarer path is hers alone. If she ever wants the authority back, she withdraws the
delegation, and **every consent issued under it stops at once** — the agency cannot undo
that. She will almost never use it. It is the reason the arrangement is worth trusting.

> *Screen: Withdraw authority, then every request under it refused.*

Ten seconds, either way, no explanation needed.

---

## What each person leaves with

- **The agency**: the ability to act at all — say what the data is for, stop a misuse the
  day they hear about it, and answer a brand that asks for proof.
- **The person**: someone handling it, and one thing she can press herself if she ever
  needs to.
- **The generating side**: a yes or no before they spend, with a reason they can act on.

What made this hard was never consent. It was that writing precise terms — duration,
scope, what counts as reuse — cost more than the vagueness did, until generation got fast
enough to make vagueness expensive.

# Customer journey

Three people, one record. Written before the screens, so the screens have something to
be measured against.

---

## 1. The scan already happened

A model shoots a campaign. As part of it, she is photographed from many angles — this is
normal, paid, and agreed. Months later a friend sends her an ad. It is not her face
exactly, but it is her body, her posture, her proportions. Nobody asked.

**She cannot tell when it happens, and she has nobody to call.** This is the state before
anything we build.

## 2. The agency puts the consent on the record

The agency already knows the terms — which medium, until when, how. Until now that lived
in a contract nobody can query at the speed generation happens.

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

## 5. She changes her mind

She opens her page and revokes. No email to the agency, no ticket, no waiting.

The next request — the same request, from the same pipeline, seconds later — comes back
**refused, with the reason**. The agency's dashboard shows it too, but the agency did not
have to act, and could not have stopped it.

> *Screen: the revoke button, then the same request refused.*

This is the moment the whole thing exists for. Ten seconds, no explanation needed.

---

## What each person leaves with

- **The person**: something to press, that works without asking anyone.
- **The agency**: an answer when a brand asks for proof, and something to tell their talent.
- **The generating side**: a yes or no before they spend, with a reason they can act on.

# Intents — who touches this, what they want, and where

One page. Each actor gets the smallest surface that serves their intent. **If an intent
cannot be named, the surface does not get built.**

## The line this product is drawn along

An agency does two different jobs, and only one of them can be held by a contract.

| | What it is | Where it goes | Us |
|---|---|---|---|
| **Representation** | Calls, introductions, scheduling, casting across markets, the negotiation itself, being the party a brand feels safe going through | Stays with people, and is **growing** rather than shrinking: one model cannot be in every market, and the booking side prefers a party that can | **Not built** |
| **Rights** | What may be used, in what scope, until when, and who may speak for whom | Moves into something programmable, because all four are things a contract already states | **This, and only this** |

So this is not a tool that disintermediates the agency. It takes the one part of their job
a contract can hold and leaves them the part that needs a person. That is also why the
agency is the customer: we are not asking them to give anything up.

Built on the premise that the rights half becomes programmable. If that premise is wrong,
the product is wrong — which is why it is stated here rather than implied.

## The actors

| Actor | Intent | Surface | Not built |
|---|---|---|---|
| **The agency** (the operator of all of this) | "Hold the terms we already agreed in a form a machine can answer with, and end a use when the deal says it ends." | A dashboard: who is represented, the term and scope of each engagement, what is live and what has lapsed, the log of refusals, and **Stop this use** for when a deal actually ends early. | Contract drafting, invoicing, talent CRM, and everything under Representation above. Those are their business, not a gap. |
| **The person** (model) | "Show me what I am tied to and until when — and let me raise it with them if it is wrong." | One page, mostly read-only: which engagements she is tied to, **the term of each**, the same authority as it stands on chain, and where her data was used. One thing she can send: **Ask to change this**, which goes to a person. | Buttons for the daily path. Stopping a single use is the agency's job, reached by asking them. She is not asked to hold a wallet either: the chain is shown as a state, not as a thing to operate. |
| **The generating side** (brand, or the agent acting for it) | "Tell me whether I may generate this, before I do, and tell me why if not." | One API call: `POST /check` → `allow` / `deny` / `ask` / `revoked`, each with a reason meant to be shown unchanged. | A UI. They already have one; this is a step inside their pipeline. |
| **The agent** (when the answer is `ask`) | "Get a human to decide, and do nothing until they do." | `POST /approvals` returns a user code; the human approves elsewhere; `GET /approvals/:id` reports waiting → approved / denied / expired. | Any default that proceeds without an answer. Waiting is the behaviour, not a failure to handle. |

The chain is not a fifth actor. Nobody's intent is "use ENS". The on-chain role exists
because one thing above has to survive this service being wrong, absent or dishonest: who
is allowed to speak for whom.

## The term is the primitive, not the button

The normal way permission ends is that **it runs out**. Nobody presses anything. A deal has
a period, that period is on the record, and when it passes the answer changes by itself.
Renewal — not revocation — is the event that needs a human.

This is the correction that reshaped the screens. An earlier version put *Take back all
authority* in front of the person as a standing button, which quietly assumed she can end a
representation agreement whenever she likes. She cannot, and neither can they: that is what
a term is for. Designing around a one-click exit also makes the product something an agency
would not install.

The three ways permission ends, ranked by how ordinary they are:

| | Who | When | Where it lives |
|---|---|---|---|
| **It lapses** | Nobody | The term passes | The record's own expiry. This is the normal case |
| **A deal ends early** | The agency | The parties agreed to end it | `Stop this use`, on the agency's side |
| **The authority is overridden** | The person, with Proof of Human | Something the contract does not cover — a leaked scan, generation outside any agreement, someone acting as her | `Take back all authority`, behind a confirmation |

The third is not a feature for daily use and is not presented as one. It requires proof that
a real human — the same human as before — is doing it, and that is proportionate precisely
*because* the action overrides an agreement instead of following one.

## Negotiation stays outside

When the person wants different terms, the product does not try to settle it. It carries the
request to a person and stops. Building negotiation here would mean building messaging,
counter-offers and a record of who said what — a second product, and the half we explicitly
left with the humans.

## Where each half lives

| | Holds | Why there |
|---|---|---|
| **ENSv2 (Sepolia)** | Who may speak for whom — the agency's role on the person's name, scoped to the consent record alone | This is the part that must not depend on us. Removing the role needs no cooperation from this service, and the scoping means a delegation cannot quietly widen |
| **This service (D1)** | What each request gets back — scope, term, early termination, the usage log, the human approval | A generation request needs an answer in one round trip, and an approval has to reach a phone. Neither is a transaction |

When the two disagree, the chain wins: a consent in our database whose delegation no longer
holds the on-chain role is refused. When the chain cannot be read at all, we do not assume
permission — the request falls back to asking the human.

## What we are not being

Not a marketplace, not discovery, not pricing, not detection of unauthorized use, not image
hosting, not messaging. Each of those is a different product with a different buyer.

Also not a one-sided instrument. The same record can carry the agency's own claims — a
scope and a period they hold, earned by investment — because a tool that protects only the
talent does not get installed by the people who would have to install it.

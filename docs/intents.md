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

## Delegation is partial, and the line is the kind of use

The scopes are not media types. Advertising, lookbooks and social are the outputs of a shoot,
and an agency handles those by definition — an enquiry about any of them goes to them, which
is the whole reason a model has representation. Cutting the scopes that way made "a scope they
kept" look implausible, because there is no version of this business where they personally
fields a lookbook request.

The line that actually exists is **the kind of use**:

| | Examples | Whose |
|---|---|---|
| **The shoot's images, published** | `campaign-print`, `campaign-social`, `lookbook` | The agency's, and has been for decades |
| **Anything generated from their body data** | `ai-generation`, `ai-training`, `digital-double` | Theirs — nobody has held this yet |

The second row is new enough that no standard practice covers it. It is not part of a shoot's
deliverables, it was not priced in the booking, and in most existing contracts it is simply
absent. So the enquiry, the decision and the payment should reach **their**, not a desk that was
built for bookings.

That is why delegation is a set rather than a switch, and why the default we seed hands over
the first row and withholds the second. A model who does delegate the second row is not an
error — it happens, at scale: Khaby Lame's likeness deal in January 2026 licensed exactly
that, an AI digital twin of his image, voice and behaviour. The point is that it should be a
separate decision from letting an agency book jobs.

ENSv2 was already shaped this way and our own layer was the coarse one:
`authorizeTextRoles(name, key, account, grant)` is scoped **per text key**, so
`consent.ad-image` and `consent.nsfw` are separate roles on the same name. The person is at
the centre and hands out some of the roles under their name — which is exactly what the
product needed to say.

**A scope they kept is where the live question lives.** There is no delegated path for it, so
no yes can exist unless they give one themselves — which is why a request for it goes to them
directly. That is the complement to the on-chain half, not an extra: ENS holds the standing
authority, and the person answers for whatever they did not hand over.

That split also fixes what `deny` and `ask` mean, which had blurred:

| | Means | Goes to |
|---|---|---|
| **`deny`** | Somebody could answer this, and it is not the person — the agency handles the scope and has not agreed to it | the agency, by phone |
| **`ask`** | Only the person can answer: they kept the scope, or a term they agreed lapsed | them, on their phone |

An earlier version returned a flat `deny` for a scope they kept, which refused the one case
that most needed a human to be asked.

## One agency, many models

An agency represents a roster, and the roster is the point: **what is delegated differs per
person**. So the agency's entry screen is the list of people with what each one handed over,
and the work happens on a person's page. Seeing three models side by side — one who
delegated everything, one who delegated advertising only, one in between — says more about
the permission model than any explanation of it.

The roster is deliberately not all women. Body scans and generated likeness are not a women's
problem — the roster shows that without a sentence explaining it.

The ledger holds no names. A row shows the agency's own label for the person — the subject
itself is an identifier (in production, a World ID pairwise subject), and no name appears on
a consent, a usage record or an approval. Who that identifier is belongs in the agency's
systems, the way it already does.

## The actors

| Actor | Intent | Surface | Not built |
|---|---|---|---|
| **The agency** (the operator of all of this) | "Hold the terms we already agreed in a form a machine can answer with, and end a use when the deal says it ends." | A dashboard: who is represented, the term and scope of each engagement, what is live and what has lapsed, the log of refusals, and **Stop this use** for when a deal actually ends early. | Contract drafting, invoicing, talent CRM, and everything under Representation above. Those are their business, not a gap. |
| **The person** (model) | "Show me what I am tied to and until when — and let me raise it with them if it is wrong." | Their own page, named as theirs: which engagements they are tied to, **the term of each**, which scopes they handed over and which they kept, the same authority as it stands on chain, and where their data was used. One thing they can send: **Ask to change this**, which goes to a person. One thing they can do: **take a scope back**, behind Proof of Human. | Buttons for the daily path. Stopping a single use is the agency's job, reached by asking them. They are not asked to hold a wallet either: the chain is shown as a state, not as a thing to operate. |
| **The generating side** (brand, or the agent acting for it) | "Tell me whether I may generate this, before I do, and tell me why if not." | One API call: `POST /check` → `allow` / `deny` / `ask` / `revoked`, each with a reason meant to be shown unchanged. **No human opens anything.** | A UI. They already have one, and this is a step inside it. The `/generate` page is a stand-in so a person can watch the call happen, and it says so on the page — otherwise it reads as a third product we built for brands. |
| **The agent** (when the answer is `ask`) | "Get a human to decide, and do nothing until they do." | `POST /approvals` returns a user code; the human approves elsewhere; `GET /approvals/:id` reports waiting → approved / denied / expired. | Any default that proceeds without an answer. Waiting is the behaviour, not a failure to handle. |

The chain is not a fifth actor. Nobody's intent is "use ENS". The on-chain role exists
because one thing above has to survive this service being wrong, absent or dishonest: who
is allowed to speak for whom.

Two questions are easy to merge and must not be. **Who holds the right** is established once
by people — the contract, and who owns the name — and no credential produces it; in this
industry it is actively contested, since an agency that developed someone has a claim of its
own, as do guardians and estates. **Who answered just now** is the only question we put a
credential in front of, and Proof of Human is the whole of what it needs: a real human,
the same one as before, enough to stop a script approving on its own. Everything the product
says about credentials should stay on the second question.

## The term is the primitive, not the button

The normal way permission ends is that **it runs out**. Nobody presses anything. A deal has
a period, that period is on the record, and when it passes the answer changes by itself.
Renewal — not revocation — is the event that needs a human.

This is the correction that reshaped the screens. An earlier version put *Take back all
authority* in front of the person as a standing button, which quietly assumed they can end a
representation agreement whenever they like. They cannot, and neither can they: that is what
a term is for. Designing around a one-click exit also makes the product something an agency
would not install.

The three ways permission ends, ranked by how ordinary they are:

| | Who | When | Where it lives |
|---|---|---|---|
| **It lapses** | Nobody | The term passes | The record's own expiry. This is the normal case |
| **A deal ends early** | The agency | The parties agreed to end it | `Stop this use`, on the agency's side |
| **A scope is taken back** | The person, with Proof of Human | The agency acted outside the scope itself | `Stop letting them handle <scope>`, behind a confirmation |

The third is not a feature for daily use and is not presented as one. It requires proof that
a real human — the same human as before — is doing it, and that is proportionate precisely
*because* the action changes what was agreed instead of following it.

### Why it is per scope, and not all of it at once

An earlier version offered *Take back all authority*, and it was wrong for a reason worth
writing down: **the adversary here is the third party who reuses the scan, and ending the
agency's authority does nothing to them.** It only closes the legitimate channel. The screen
even listed leaked scans and impersonation as the reasons to press it, which are exactly the
cases it cannot address.

The case where removing their authority *is* the right lever is narrow: the agency itself
acted outside what they gave them. And then the proportionate response is to take back **that
scope**, not everything — which is also the shape the chain already had, since
`authorizeTextRoles` is per key.

What makes it fit is where a taken-back scope lands: it becomes a scope they hold, so a
request for it now **comes to them** instead of being refused. Taking something back is not
switching it off; it is moving the decision to themselves. Consents the agency issued in that
scope stop applying — the authority they rested on is gone — while everything else they
handle is untouched.

Removing the role on chain is a signature only they can make. This service stops honouring the
scope immediately, and nothing here can remove the on-chain role on their behalf. That gap is
the point of the role being there.

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

# Intents — who touches this, what they want, and where

One page. Each actor gets the smallest surface that serves their intent. **If an intent
cannot be named, the surface does not get built.**

| Actor | Intent | Surface | Not built |
|---|---|---|---|
| **The agency** (custodian, and the operator of all of this) | "Say what our talent's body data may be used for, and stop a use the moment we hear about it." | A dashboard: consents by person, scope, expiry, status; issue and revoke; the log of refusals. | Contract drafting, invoicing, talent CRM. Those exist already and are not the gap. |
| **The person** (model) | "Let them handle it — and be able to take the authority back if I ever need to." | One page: who is acting for her, **Take back all authority** (confirmed with Proof of Human), the same authority shown as it stands on chain, what was agreed on her behalf, and where it was used. **Stop this use** on a single consent is there too, but the daily path is a message to her agency. Both buttons are named after what they end, not after the verb — the first reader could not tell "Revoke" from "Withdraw". | A profile. A portfolio. Anything to browse. Managing her own commercial use is not her job — that is why she has an agency. She is not asked to hold a wallet or read an address either: the chain is shown to her as a state, not as a thing to operate. |
| **The generating side** (brand, or the agent acting for it) | "Tell me whether I may generate this, before I do, and tell me why if not." | One API call: `POST /check` → `allow` / `deny` / `ask` / `revoked`, each with a reason meant to be shown unchanged. | A UI. They already have one; this is a step inside their pipeline. |
| **The agent** (when the answer is `ask`) | "Get a human to decide, and do nothing until they do." | `POST /approvals` returns a user code; the human approves elsewhere; `GET /approvals/:id` reports waiting → approved / denied / expired. | Any default that proceeds without an answer. Waiting is the behaviour, not a failure to handle. |

The chain is not a fifth actor. Nobody's intent is "use ENS" — the on-chain role exists
because *one* of the intents above has to survive our server being wrong, absent or
dishonest: the person's ability to take the authority back. Everything else stays in the
API, because the generating side needs an answer in one round trip and she needs to approve
on a phone.

## The one rule that shapes all four

**The agency operates; the person holds the authority.** Day to day she asks them and they
act — that is what representation is. What she keeps is the power to withdraw the
delegation itself, which no one can undo for her. That backstop is not a guard against her
agency; it is what makes delegating worth doing, and it is the only part that must be true
structurally rather than by policy.

The adversary is neither of them. It is whoever reuses the scan without asking.

Where each half lives, and why the split falls there:

| | Holds | Why there |
|---|---|---|
| **ENSv2 (Sepolia)** | Who may speak for whom — the agency's role on the person's name, scoped to the consent record alone | This is the part that must not depend on us. Revoking the role needs no cooperation from this service, and the scoping means a delegation cannot quietly widen |
| **This service (D1)** | What each request gets back — scope, expiry, per-consent revocation, the usage log, the human approval | A generation request needs an answer in one round trip, and an approval has to reach a phone. Neither is a transaction |

When the two disagree, the chain wins: a consent in our database whose delegation no longer
holds the on-chain role is refused. When the chain cannot be read at all, we do not assume
permission — the request falls back to asking the human.

## What we are not being

Not a marketplace, not discovery, not pricing, not detection of unauthorized use, not
image hosting. Each of those is a different product with a different buyer.

Also not a one-sided instrument. The same record can carry the agency's own claims — a
scope and a period they hold, earned by investment — because a tool that protects only the
talent does not get installed by the people who would have to install it.

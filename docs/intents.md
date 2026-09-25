# Intents — who touches this, what they want, and where

One page. Each actor gets the smallest surface that serves their intent. **If an intent
cannot be named, the surface does not get built.**

| Actor | Intent | Surface | Not built |
|---|---|---|---|
| **The agency** (custodian, and the operator of all of this) | "Say what our talent's body data may be used for, and stop a use the moment we hear about it." | A dashboard: consents by person, scope, expiry, status; issue and revoke; the log of refusals. | Contract drafting, invoicing, talent CRM. Those exist already and are not the gap. |
| **The person** (model) | "Let them handle it — and be able to take the authority back if I ever need to." | One page: who is acting for her, **Withdraw authority**, what was agreed on her behalf, and where it was used. Per-consent revoke is there too, but the daily path is a message to her agency. | A profile. A portfolio. Anything to browse. Managing her own commercial use is not her job — that is why she has an agency. |
| **The generating side** (brand, or the agent acting for it) | "Tell me whether I may generate this, before I do, and tell me why if not." | One API call: `POST /check` → `allow` / `deny` / `ask` / `revoked`, each with a reason meant to be shown unchanged. | A UI. They already have one; this is a step inside their pipeline. |
| **The agent** (when the answer is `ask`) | "Get a human to decide, and do nothing until they do." | `POST /approvals` returns a user code; the human approves elsewhere; `GET /approvals/:id` reports waiting → approved / denied / expired. | Any default that proceeds without an answer. Waiting is the behaviour, not a failure to handle. |

## The one rule that shapes all four

**The agency operates; the person holds the authority.** Day to day she asks them and they
act — that is what representation is. What she keeps is the power to withdraw the
delegation itself, which no one can undo for her. That backstop is not a guard against her
agency; it is what makes delegating worth doing, and it is the only part that must be true
structurally rather than by policy.

The adversary is neither of them. It is whoever reuses the scan without asking.

## What we are not being

Not a marketplace, not discovery, not pricing, not detection of unauthorized use, not
image hosting. Each of those is a different product with a different buyer.

Also not a one-sided instrument. The same record can carry the agency's own claims — a
scope and a period they hold, earned by investment — because a tool that protects only the
talent does not get installed by the people who would have to install it.

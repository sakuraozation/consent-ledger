# Intents — who touches this, what they want, and where

One page. Each actor gets the smallest surface that serves their intent. **If an intent
cannot be named, the surface does not get built.**

| Actor | Intent | Surface | Not built |
|---|---|---|---|
| **The person** (model) | "Stop this particular use, now, without asking anyone's permission." | One page listing their consents, each with a **Revoke** button. Approval happens on their phone through World ID. | A profile. A portfolio. Anything to browse. They should be able to leave in ten seconds. |
| **The agency** (custodian) | "Show me what our roster has agreed to, what is about to expire, and what was refused." | A dashboard: consents by person, scope, expiry, status; plus the log of refusals. | Contract drafting, invoicing, talent CRM. Those exist already and are not the gap. |
| **The generating side** (brand, or the agent acting for it) | "Tell me whether I may generate this, before I do, and tell me why if not." | One API call: `POST /check` → `allow` / `deny` / `ask` / `revoked`, each with a reason meant to be shown unchanged. | A UI. They already have one; this is a step inside their pipeline. |
| **The agent** (when the answer is `ask`) | "Get a human to decide, and do nothing until they do." | `POST /approvals` returns a user code; the human approves elsewhere; `GET /approvals/:id` reports waiting → approved / denied / expired. | Any default that proceeds without an answer. Waiting is the behaviour, not a failure to handle. |

## The one rule that shapes all four

The agency operates the surfaces; **the person holds the power**. Revocation takes effect
without the custodian's cooperation — everything else in the design is arrangement, and
that is the part that has to be true.

## What we are not being

Not a marketplace, not discovery, not pricing, not detection of unauthorized use, not
image hosting. Each of those is a different product with a different buyer.

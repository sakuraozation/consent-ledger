# Sketch (written at the event, 2026-09-25 21:xx)

1. **Who**: A talent agency that manages models, and the brands / agents that generate images from their body scans. **Revised at 01:00 Sat**: the agency is the operator, not the adversary — a model has an agency because managing her own commercial use is not her job. The adversary is whoever reuses the scan without asking, and today neither of them can act.
2. **The problem** (from a model I know): the body scan itself was taken legitimately, as part of a paid job. What she can't control is what happens **after** — the data gets reused for AI generation without permission. She can't even tell when it happens, because the output doesn't always look like her.
3. **What she actually wants**: not a ban. A **scope and an expiry**, and the ability to take it back.
4. **Why the agency is the customer, not the model**: since 2025–2026 the *user* side carries the burden of proof (NY Fashion Workers Act requires documented consent; EU AI Act Art.50 requires machine-readable marking of AI output; a US retailer was sued in 2026 for generating new images after the contract expired). Agencies already manage "which medium, until when, how" by contract — AI generation broke that, because it happens in seconds and leaves no trace they can audit.
5. **The one screen**: an agent about to generate asks the ledger first. Four outcomes, each with a reason shown — **allow** / **deny (out of scope)** / **ask a human (expired or first-time use)** / **denied after revocation**.
6. **The moment to show**: allow → the person revokes → the *same* request is now refused. Ten seconds, no explanation needed.
7. **Path (3 steps)**: agent requests → ledger checks scope + expiry + status → allow / deny / escalate to the human.
8. **On-chain**: the consent record and its status. **Not** on-chain: the images, the body data, anything identifying.
9. **World ID**: proves the person granting or revoking is a real human, and the *same* human each time. Choosing the credential is part of the point — see `specs/requirements.md`.
10. **Cut line (Sat 18:00)**: if the on-chain record doesn't work, keep the record off-chain with a signature and show the four outcomes anyway. If World ID for Agents doesn't work, fall back to IDKit.

**Not building**: a marketplace, pricing, discovery, detection of unauthorized use, image hosting, multi-tenant accounts.

**Open question to answer with the demo**: while waiting for a human, what should the agent do — stop, retry later, or proceed under a default? Right now it stops. That is a choice, not an accident.

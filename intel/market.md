# Market notes (researched during the event, 2026-09-25)

Why this section exists: the problem came from a person, not a whitepaper, so the
question worth answering is whether anyone has already solved it, and for whom.

## The problem, as stated by a working model

The scan itself was taken legitimately, as part of a paid job. What she cannot control is
what happens after: the data gets reused for AI generation without permission. She often
cannot tell when it happens, because the output does not always look like her. What she
wants is not a ban — it is a **scope, an expiry, and the ability to take it back**.

## The law moved to the buyer's side, in three places

- **New York Fashion Workers Act** (in force June 2025) — a brand must have **documented
  consent** before using a model's digital replica.
- **EU AI Act Art. 50** (applies from August 2026) — AI-generated output must carry
  machine-readable marking.
- **Japan, Ministry of Justice** — on 2026-04-17 it announced a review of civil liability
  for unauthorized AI use of likeness and voice, and by 2026-07-27 the expert panel's
  scope had grown to cover actors' likeness, singers' and voice actors' voices, sexual
  deepfakes, non-commercial use, **the rights relationship between an agency and the
  person it represents**, and the likeness of the deceased.
  ([Nikkei](https://www.nikkei.com/article/DGXZQOUA169E80W6A410C2000000/) ·
  [Japan Actors Union response](https://www.nippairen.com/about/post-moj-guideline-2026.html))
- **US, federal** — the NO FAKES Act advanced unanimously out of the Senate Judiciary
  Committee on 2026-06-18, creating a right to control AI replicas of voice and likeness.

The direction is consistent: **the party generating has to be able to prove it had
permission**. That party has a budget and a liability. The model has neither.

Note for Japan specifically: the panel is explicitly examining **the rights relationship
between agency and talent**. Whatever ships here has to survive that question, which is
another reason to keep revocation with the person rather than the custodian.

## Who is already building

| Who | Shape | Where it differs from this |
|---|---|---|
| **H&M × Uncut** (2025–) | Digital twins of 30 real models; the models keep the rights and are paid per use | A brand's private arrangement, negotiated by agencies. No ledger anyone can query, and no way for the person to revoke on their own |
| **TrueRights** | Talent, agents, brands, production and legal in one workflow; rights cleared before content goes live | Closest in intent. A platform that holds the record — the person's control is a feature the platform grants, not a property of the record |
| **TrueTake** | Authorization infrastructure for AI performances, consent-first, escrow payments | Same shape; payments-led |
| **Semblance** | Rights-cleared casting for AI production, available by API; verified people set terms | Marketplace-first — it solves discovery, not the scan that was already taken |
| **RSL Media** (launched 2026-05-12) | Built for the consent gap in AI-era agreements | Agreements layer |
| **Pixelz · ModelManagement.com** | Databases of consented digital twins, served to brands by API | Supply-side; the ledger belongs to the vendor |

What everyone shares: **the record lives with a platform or a brand**. Consent is
something the holder honours, not something the subject holds. That is fine until the
holder's interests diverge from the person's — which is exactly the moment consent is
supposed to matter.

## The gap this project aims at

Not a marketplace, not discovery, not detection. One property:

> **The person can revoke without the custodian's cooperation, and the refusal is
> visible to the party that was about to generate.**

Everything else here — scope, expiry, asking a human — exists to make that property
usable by an agency that is already doing this work on paper.

## Who pays

The agency, not the model. Agencies already manage "which medium, until when, how" by
contract; AI generation broke that, because it happens in seconds and leaves nothing they
can audit. What they get: a way to charge separately for AI use, an answer when asked for
proof of consent, and something to tell their talent. Japan's own panel putting the
agency–talent relationship on the agenda makes this more urgent, not less.

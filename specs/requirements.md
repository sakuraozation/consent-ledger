# Prize requirements (transcribed 2026-09-25, from the event prize page)

Targeting two World prizes. Each qualification line below is a checkbox to close before
submission. Wording is the sponsor's; the notes are mine.

> Amounts changed during the event: both World prizes are now **$5,000, split as up to
> 2 teams × $2,500** (the page earlier showed $7,500 each).

---

## World — Best Use of IDKit ($5,000, up to 2 × $2,500)

The brief: solve **a real trust moment** — an event where a product needs to know
something meaningful about a person before it grants access, completes an action, or
changes a user's experience. Explicitly: *"We are not rewarding the most credentials
used. We are rewarding the best decision about which credential is needed, why it is
needed, and how it improves a real product experience."*

- [ ] Integrate IDKit in a functioning application, mini app, or onchain flow
- [ ] Use at least one supported credential and **verify the result on the server or
      onchain** as appropriate
- [ ] **Clearly explain the specific product event requiring trust, and why the chosen
      credential is the minimum sufficient assurance**
- [ ] Demonstrate a successful verification **and one meaningful alternative path**
      (cancellation, unavailable credential, rejection, or an ineligible user)
- [ ] Include a short integration debrief: time to first success, friction encountered,
      missing capability or documentation, and the one improvement with the greatest
      impact → `FEEDBACK.md`

**Our answer to the credential question** (this is the graded part): the trust moment is
*granting or revoking consent over one's own body-scan data*. What has to be true is
that the person is a real human, and the **same** human who granted it. It does not
require knowing who they are — so Proof of Human is the floor. Document/passport is
disproportionate: identity is not needed, continuity is. Write this out in the README,
not just here.

Credentials: Proof of Human (`/credentials/1`), Passport/NFC (`/credentials/9303`),
Selfie Check with Sybil score (`/credentials/11`).

## World — Best Use of World ID for Agents ($5,000, up to 2 × $2,500)

The brief: show what becomes possible when an application can **ask a person to
authenticate or complete a fresh verification at the moment**. *"Strong submissions will
show a meaningful action that needs a human identity or approval layer, not simply a
login screen added to an existing product."*

**Note on the page: "We are mocking proofs now, so you don't need sandbox app anymore."**
Proofs are mocked in the dev environment — no sandbox World App setup required.

- [x] Integrate with the official **World ID for Agents dev environment provided for the
      event** (docs `sandbox.auth.world.org/docs`, portal `/portal`, plugin
      `github.com/worldcoin/world-id-agent-plugin`)
- [x] Demonstrate the complete journey: verification request → user completion →
      validated result → **the protected action** — verified in production 2026-09-25
- [x] Demonstrate a **denied, expired, cancelled or otherwise unsuccessful path where
      the protected action does not occur** — declined (no code), unknown state, and
      deadline expiry all refuse
- [x] **Validate identity results in a secure backend**; never expose client secrets or
      treat an unvalidated client response as authorization — ID token verified against
      JWKS in `src/approval.ts`
- [ ] Same integration debrief as above → `FEEDBACK.md`

**Our answer**: the protected action is *generating from someone's body-scan data*. The
agent asks the person at the moment, and if the answer is no, expired, or revoked, the
generation does not happen. That is the whole demo — the four outcomes in `sketch.md`.

---

## Shared, non-negotiable

- [ ] Public repo; README points to the files where each integration happens
- [ ] Demo video **2–4 min, 720p+, my own voice** — synthesized speech, music-with-captions,
      phone recordings and speed-ups all disqualify
- [ ] Commit history shows the sequence; no single giant commit
- [ ] `specs/`, `prompts/`, `AI-USE.md` present (how the AI was directed)
- [ ] Submit by **Sunday 09:00**; up to 3 partner prizes per project

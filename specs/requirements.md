# Prize requirements (transcribed 2026-09-25, from the event prize page)

Three partner prizes (the maximum): **World ×2** and **ENS**. Each qualification line below
is a checkbox to close before submission. Wording is the sponsor's; the notes are mine.

> Slot 3 changed on 09-26: **Curvegrid — Best AI Agent Project ($1,000) → ENS — Best Use of
> ENSv2 ($6,000)**. The reason is evidence, not the amount: the ENSv2 registration and the
> Enhanced Access Control delegation now run on Sepolia (`scripts/ens-register.ts`,
> `scripts/ens-delegate.ts`), whereas the Curvegrid application would have had to say
> MultiBaas was not used. The Curvegrid section is kept below, unchanged, in case ENS turns
> out not to accept the submission.

> Amounts changed during the event: both World prizes are now **$5,000, split as up to
> 2 teams × $2,500** (the page earlier showed $7,500 each).

---

## World — Best Use of IDKit ($5,000, up to 2 × $2,500)

The brief: solve **a real trust moment** — an event where a product needs to know
something meaningful about a person before it grants access, completes an action, or
changes a user's experience. Explicitly: *"We are not rewarding the most credentials
used. We are rewarding the best decision about which credential is needed, why it is
needed, and how it improves a real product experience."*

> Found 09-26, late: this checklist was empty because the prize was **actually unmet** —
> `src/worldid.ts` was the pre-event hello world sitting on its own route, wired to no
> product event. The fix was to gate the one action that must be the person's own.

- [x] Integrate IDKit in a functioning application, mini app, or onchain flow — the
      **Stop letting them handle `<scope>`** confirmation at `/me/scopes/:scope/withdraw`
- [x] Use at least one supported credential and **verify the result on the server or
      onchain** as appropriate — Proof of Human, verified server-side via
      `POST /api/v2/verify/{app_id}` in `verifyProof` (`src/worldid.ts`); the client's
      success is never treated as authorization, and the nullifier is recorded in D1
- [x] **Clearly explain the specific product event requiring trust, and why the chosen
      credential is the minimum sufficient assurance** — on the confirmation screen itself
      and in the README: taking a scope back is the one action nobody may do on her behalf,
      so what must be true is *a real human, the same one* — not who she is
- [x] Demonstrate a successful verification **and one meaningful alternative path**
      (cancellation, unavailable credential, rejection, or an ineligible user) — three
      refusals verified in production: no proof (`proof_required`), credential below the
      required level (`insufficient_credential`), proof rejected by World
      (`invalid_format`). In every case **the delegation is untouched**. Cancelling the
      modal withdraws nothing
- [ ] Confirm the success path on a phone with World App (needs the device — everything
      else is verified)
- [ ] Include a short integration debrief: time to first success, friction encountered,
      missing capability or documentation, and the one improvement with the greatest
      impact → `FEEDBACK.md`
- [x] A dedicated action for this event (`withdraw-authority`, unlimited verifications),
      created through `POST /api/v2/create-action/{app_id}` rather than reusing the
      approval action

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
      validated result → **the protected action** — verified in production 2026-09-25, and
      again on 09-26 for the case that matters most: a scope the person **never delegated**,
      where the agency cannot answer and only she can. Code `94USP-7THAM` → approved →
      `allow`, with the reason *"The person answered for nsfw themselves"*
- [x] The pairwise subject is stable: three separate approvals returned the identical `sub`
      (`YEPO2FZK…`), so the ledger can tell it is the same human without learning who she is.
      That is the credential argument, measured rather than asserted
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

---

## ENS — Best Use of ENSv2 ($6,000)  ← slot 3

The brief rewards work on ENSv2's hierarchical registry, subnames and **Enhanced Access
Control**, with a bonus for treating names as a namespace for agents — each with its own
identity and permissions.

- [x] A working demo, not a mockup — `consentledger.eth` is registered on Sepolia and the
      delegation runs against it (tx and addresses in the README)
- [x] Public code
- [x] Uses ENSv2 specifically, not v1 — ETHRegistrar commit/reveal, `PermissionedResolver`
      deployed through `VerifiableFactory`, EAC roles
- [x] Enhanced Access Control is load-bearing, not decorative — the delegation *is* the EAC
      role, and revoking the role is how a person takes authority back
- [x] **ENSv2 is central to the running product, not a side script** — `POST /check` reads
      the role before it answers, and refuses consents whose delegation lost it; `/me` shows
      the state; `/chain` returns it raw (added 09-26 after reading the requirement wording:
      *"ENSv2 features should be central to the product, not a cosmetic add-on"*)
- [x] Live demo link, and no hard-coded values — the role is read from Sepolia on every
      request
- [x] Integration debrief with what was hard — [`FEEDBACK.md`](../FEEDBACK.md), including
      three docs gaps and the blog/ABI mismatch
- [ ] Mention in the demo video that the record is not resolvable through
      `UpgradableUniversalResolverProxy` (returns `address(0)`) — say it plainly rather than
      let a judge find it

**Why we fit**: the product needed exactly one primitive — *delegated authority over a name
that the person can take back* — and that is what ENSv2 added. `authorizeTextRoles` scopes
the delegation per text key, so "the agency may write the consent record and nothing else"
is expressible without writing a contract. The agent angle is the same shape: an agent
asking to generate is checked against a permission that lives under a name.

## Curvegrid — Best AI Agent Project ($1,000)  ← held in reserve

The brief: *"What happens when AI agents can understand blockchain activity and take
action on-chain?"* Among the listed ideas: **Policy-Aware Transaction Agent** — "propose or
execute transactions while respecting rules such as spending limits, approved
counterparties, or **required human approvals**."

**Using MultiBaas is explicitly not a requirement for this prize.** Judging is on the idea
and the technical execution.

- [x] Public GitHub repo with project artifacts and a solid README
- [x] README: one-sentence summary of the project
- [ ] README: how MultiBaas was used — n/a, we did not use it (say so plainly)
- [x] README: team intro and social handles
- [x] README: clear setup and testing instructions
- [ ] README: MultiBaas experience — n/a

**Why we fit**: the project *is* a policy-aware agent gate. An agent about to act checks a
policy (scope, expiry, revocation) and, when the policy cannot answer, **requires a human
approval before the action happens** — which is the listed example almost word for word.
The agency dashboard is the enterprise-usable UI the sponsor said they care about, without
using their kit.

# consent-ledger

**Her agency can finally stop this — and she can take the authority back.**

A consent record for body-scan data, built so an AI pipeline has to ask before it
generates. The agency does the work, because that is what an agency is for. The person
holds one thing only: the authority itself, which she can withdraw without asking.

Live: **https://consent-ledger.yoshitatsu.workers.dev** · [`/generate`](https://consent-ledger.yoshitatsu.workers.dev/generate) ·
[`/me`](https://consent-ledger.yoshitatsu.workers.dev/me) · [`/agency`](https://consent-ledger.yoshitatsu.workers.dev/agency)

---

## The problem, from a person

A model shoots a campaign and is photographed from many angles. That part is normal, paid
and agreed. Months later the body data turns up in AI-generated ads. She often cannot tell
when it happens, because the output does not always look like her face.

What she wants is not a ban. It is a **scope**, an **expiry**, and the ability to **take it
back**.

## Who this is for, and who it is against

A model cannot police this herself — she cannot even tell when it happens, and she has an
agency precisely because managing her own commercial use is not her job. **The agency is
not the adversary here. The adversary is whoever reuses the scan without asking**, and
today neither the model nor her agency can do anything about it.

So the agency is the operator: it says what the body data may be used for, and it stops a
use the moment it hears about one. The person delegates that, and keeps exactly one power
— **withdrawing the delegation**, which kills every consent issued under it at once and
cannot be undone by the agency. That backstop is not a guard against the agency; it is
what makes the arrangement worth trusting in the first place.

## Why nobody solved this: precision was too expensive

Consent was never missing. Terms were — duration, scope, what counts as reuse. Writing
those precisely costs lawyer time and a negotiation per counterparty, so the industry
settled on vagueness, and vagueness was survivable because nothing generated at speed and
nobody outside needed to see the terms.

AI generation broke that equilibrium. A vague period cannot hold when thousands of images
come out of one scan in an afternoon.

**So the product is not a consent toggle. It is making precise terms cheap enough to be
worth writing.** Which is also why an agency would adopt it rather than tolerate it: the
same record expresses *their* legitimate claims. An agency that invested years in someone
can say so — this scope, this period, held by us — in the same structure, enforced the
same way. A tool that only protects one side of that relationship does not get installed.

## Why the agency is the customer

Since 2025–2026 the burden of proof sits with whoever generates: New York's Fashion
Workers Act requires documented consent, the EU AI Act requires machine-readable marking
from August 2026, and Japan's Ministry of Justice opened a review in April 2026 whose
scope now explicitly includes **the rights relationship between an agency and its
talent**. Agencies already manage "which medium, until when, how" by contract — AI
generation broke that, because it happens in seconds and leaves nothing they can audit.

So the agency operates this, and pays for it. The person holds the power. Details and
prior art: [`intel/market.md`](intel/market.md).

## What it does

One call before generating, four answers, each carrying a reason meant to be shown to a
human unchanged:

| | when | what happens |
|---|---|---|
| `allow` | in scope, unexpired, not revoked, issued under a live delegation | generation proceeds |
| `deny` | the use was never granted | nobody is asked — there is nothing to ask about |
| `ask` | no record, or it expired | a human decides; **nothing is generated while waiting** |
| `revoked` | she took it back | refused, and the reason says so |

The order of those checks is the argument. A withdrawn delegation outranks everything —
nothing issued under it survives. Within a scope, revocation outranks expiry. And an
expired consent falls through to `ask` rather than `deny`, because expiry means nobody has
asked her lately, not that she changed her mind.

## The same permission model runs on ENSv2, on chain

Delegated, revocable authority over a name is what ENSv2 added, so we put the delegation
there as well as in our own layer. It is registered and working on Sepolia:

- `consentledger.eth` — registered through the ETHRegistrar directly (commit/reveal, paid
  in MockUSDC): tx [`0x9ae0d240…`](https://eth-sepolia.blockscout.com/tx/0x9ae0d24042cb81bf0ad84a9a70e7bcd58ffd54ace12fa2b3e38734979bc49075)
- Resolver: a `PermissionedResolver` deployed through `VerifiableFactory`, with the person
  as admin — [`0x8591D727…`](https://eth-sepolia.blockscout.com/address/0x8591D727D6a7317f843de72Bd2D31AB31A2841C9)

`authorizeTextRoles(name, key, account, grant)` is the delegation, and it is scoped **per
text key** — which is finer than we expected and matches the product exactly: the agency
gets the consent record and nothing else.

| Here | On chain |
|---|---|
| The person | admin of the parent name's resolver |
| Delegating to the agency | `authorizeTextRoles(name, "consent.bodyscan", agency, true)` |
| The agency issuing a consent | `setText(node, "consent.bodyscan", …)` — succeeds |
| The agency reaching outside the scope | `setText(node, "avatar", …)` — reverts `EACUnauthorizedAccountRoles` |
| The person withdrawing the delegation | `authorizeTextRoles(…, false)` — only the admin can |
| Consents issued under a withdrawn delegation | the agency's next `setText` reverts |

[`scripts/ens-delegate.ts`](scripts/ens-delegate.ts) runs all seven steps against Sepolia,
including the three that must fail. [`scripts/ens-register.ts`](scripts/ens-register.ts)
does the registration. Both print their transactions.

Two layers, on purpose, and **the chain is the one that wins**. `POST /check` reads the
role before it answers: a consent sitting in our database whose delegation no longer holds
the on-chain role comes back `revoked`, naming the chain as the reason. Take the role away
with [`scripts/ens-role.ts`](scripts/ens-role.ts) and the live service refuses in about half
a second, without anything being written here. The person's page shows the same state
([`/me`](https://consent-ledger.yoshitatsu.workers.dev/me)), and
[`/chain`](https://consent-ledger.yoshitatsu.workers.dev/chain) returns it raw.

The split is deliberate: the chain holds *who may speak for whom*, which must not depend on
our server being honest or alive, and our layer holds *what each request gets back*, because
a generation request needs an answer in one round trip and a human approval has to reach a
phone. She is never asked to hold a wallet — the role is administered for her and shown to
her as a state.

**When the chain cannot be read, we do not assume permission.** The verdict becomes `ask`
and says so. Falling back to `allow` would reintroduce exactly the failure this project
exists to stop, so the RPC being down costs a human approval, not a silent yes.

## Integration points for judges

| What | Where |
|---|---|
| **World ID / IDKit** — the person's own action is gated on Proof of Human, verified server-side | [`src/worldid.ts`](src/worldid.ts) — `verifyProof`; the screen is `GET /me/delegations/:id/withdraw` in [`src/screens.tsx`](src/screens.tsx) |
| **World ID for Agents** — device flow, ID token verified server-side against the issuer's JWKS | [`src/approval.ts`](src/approval.ts) — `startApproval`, `pollApproval` (the `jwtVerify` call is the line that matters) |
| **ENSv2** — commit/reveal registration against the ETHRegistrar | [`scripts/ens-register.ts`](scripts/ens-register.ts) |
| **ENSv2 Enhanced Access Control** — delegation as a per-key role, granted and revoked | [`scripts/ens-delegate.ts`](scripts/ens-delegate.ts) — `authorizeTextRoles`, and the three calls that must revert |
| The four outcomes and their order | [`src/ledger.ts`](src/ledger.ts) — `check` |
| API surface | [`src/api.ts`](src/api.ts) |
| Screens (server-rendered, no client bundle) | [`src/screens.tsx`](src/screens.tsx), [`src/ui.tsx`](src/ui.tsx) |
| The on-chain role read from the running service, and the fail-closed rule | [`src/chain.ts`](src/chain.ts), and the block at the top of `check` in [`src/ledger.ts`](src/ledger.ts) |
| Every way this fails, and why none of them return `allow` | [`docs/journey.md`](docs/journey.md) §6; the handler is `app.onError` in [`src/index.ts`](src/index.ts) |
| Integration debrief | [`FEEDBACK.md`](FEEDBACK.md) |

### The one action nobody may do on her behalf

Everything else here is the agency's job, and that is deliberate. One thing is not:
**withdrawing the delegation**. If anyone could press it, the backstop would not be a
backstop — so that button leads to a confirmation that requires Proof of Human, verified on
our server before anything is written.

The refusals matter more than the success. No proof, a credential below the required level,
or a proof World rejects all leave the delegation **exactly as it was**; closing the modal
withdraws nothing. Refusing to verify is not a way to withdraw, and verifying is not
something the client can claim — the browser's success is only a proof to hand to the
server.

There is no login anywhere else. The agency dashboard and the generating side are open in
this demo, which is a deliberate omission rather than an oversight: a session layer is
ordinary B2B work that would prove nothing here, while the *one* action whose authority is
the whole argument had to be real.

### Why this credential, and not a stronger one

The trust moment is *granting or revoking consent over your own body-scan data*. What has
to be true is that the approver is a **real human**, and the **same human** as last time.
It does not require knowing who they are.

So Proof of Human is the floor and also the ceiling here. A document or passport check
would be disproportionate: identity is not what consent needs — **continuity** is. The
pairwise `sub` gives exactly that, and nothing more. It came back identical across
separate approvals, which is how the ledger can tell it is still her without ever learning
her name. `auth_time` is in the token too, so the freshness of an approval is available if
a scope ever needs it.

## Try it

> Starting state is set by [`scripts/reset-demo.ts`](scripts/reset-demo.ts): one live
> delegation for `model-a` and one valid consent, with an empty usage log. Run it again
> (plus `scripts/ens-role.ts grant`) to put the demo back.

1. [`/agency`](https://consent-ledger.yoshitatsu.workers.dev/agency) — grant a consent (60 seconds, so expiry is visible in real time)
2. [`/generate`](https://consent-ledger.yoshitatsu.workers.dev/generate) — press Generate → `allow`
3. [`/me`](https://consent-ledger.yoshitatsu.workers.dev/me) — press **Stop this use**
4. [`/generate`](https://consent-ledger.yoshitatsu.workers.dev/generate) — press Generate again → `revoked`, and nothing is produced

For the `ask` path, let a consent expire (or use a subject with no record), press Generate,
then **Ask the human** — a code appears, and the page waits. Approve it at
`sandbox.auth.world.org/device`. If nobody answers before the deadline, the request expires
and nothing is generated.

## Team

Solo. Sakurao Yoshitatsu — founder of ENVLOP (Tokyo), co-founder of Cross Philosophies.
We run our own services on AI-first operations and rebuild how work runs inside client
companies. GitHub [@sakuraozation](https://github.com/sakuraozation) · envlop.co

First web3 hackathon; the subject came from a conversation with a working model, not from
a list of ideas.

## Run it

```sh
bun install
cp .env.example .dev.vars   # fill in WORLD_OIDC_CLIENT_ID / _SECRET from the sandbox portal
bun run dev                 # http://localhost:8787
```

Deploy and apply the schema:

```sh
bunx wrangler d1 execute consent-ledger --remote --file=migrations/0001_init.sql
bunx wrangler secret put WORLD_OIDC_CLIENT_ID
bunx wrangler secret put WORLD_OIDC_CLIENT_SECRET
bunx wrangler deploy
```

Check it works, without a browser:

```sh
B=https://consent-ledger.yoshitatsu.workers.dev
ID=$(curl -s -X POST $B/consents -H 'content-type: application/json' \
  -d '{"subject":"model-a","scopes":["ad-image"]}' | jq -r .id)
curl -s -X POST $B/check -d '{"subject":"model-a","scope":"ad-image"}' \
  -H 'content-type: application/json'                     # -> allow
curl -s -X POST $B/consents/$ID/revoke -o /dev/null
curl -s -X POST $B/check -d '{"subject":"model-a","scope":"ad-image"}' \
  -H 'content-type: application/json'                     # -> revoked, with the reason
```

D1 schema in [`migrations/`](migrations). No images and no scan data are stored — a subject
is a World ID pairwise subject and nothing else.

## Disclosure

The first commit contains a **generic, project-agnostic scaffold** prepared before the
hackathon, as the rules permit ("you can familiarize yourself with all the tools and
technologies you intend to use beforehand"): a Hono/Workers skeleton, hello-world wiring
for x402, World ID and ENSv2, SDK notes in `docs/`, and the dated pre-event measurements
that open `FEEDBACK.md`. None of it is specific to this project. Everything from the second
commit was written during the event, and the history shows the order.

AI assistance is documented in [`AI-USE.md`](AI-USE.md); the specs and prompts that
directed it are in [`specs/`](specs) and [`prompts/`](prompts).

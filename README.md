# consent-ledger

**She can take it back, and the agency cannot stop her.**

A consent record for body-scan data, built so that an AI pipeline has to ask before it
generates — and so the person who was scanned can revoke without going through anyone.

Live: **https://consent-ledger.yoshitatsu.workers.dev** · [`/generate`](https://consent-ledger.yoshitatsu.workers.dev/generate) ·
[`/me`](https://consent-ledger.yoshitatsu.workers.dev/me) · [`/agency`](https://consent-ledger.yoshitatsu.workers.dev/agency)

---

## The problem, from a person

A model shoots a campaign and is photographed from many angles. That part is normal, paid
and agreed. Months later the body data turns up in AI-generated ads. She often cannot tell
when it happens, because the output does not always look like her face.

What she wants is not a ban. It is a **scope**, an **expiry**, and the ability to **take it
back**.

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
| `allow` | in scope, unexpired, not revoked | generation proceeds |
| `deny` | the use was never granted | nobody is asked — there is nothing to ask about |
| `ask` | no record, or it expired | a human decides; **nothing is generated while waiting** |
| `revoked` | she took it back | refused, and the reason says so |

The order of those checks is the argument: revocation outranks scope and expiry, and an
expired consent falls through to `ask` rather than `deny` — expiry means nobody has asked
her lately, not that she changed her mind.

## Integration points for judges

| What | Where |
|---|---|
| **World ID for Agents** — device flow, ID token verified server-side against the issuer's JWKS | [`src/approval.ts`](src/approval.ts) — `startApproval`, `pollApproval` (the `jwtVerify` call is the line that matters) |
| The four outcomes and their order | [`src/ledger.ts`](src/ledger.ts) — `check` |
| API surface | [`src/api.ts`](src/api.ts) |
| Screens (server-rendered, no client bundle) | [`src/screens.tsx`](src/screens.tsx), [`src/ui.tsx`](src/ui.tsx) |
| Integration debrief | [`FEEDBACK.md`](FEEDBACK.md) |

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

1. [`/agency`](https://consent-ledger.yoshitatsu.workers.dev/agency) — grant a consent (60 seconds, so expiry is visible in real time)
2. [`/generate`](https://consent-ledger.yoshitatsu.workers.dev/generate) — press Generate → `allow`
3. [`/me`](https://consent-ledger.yoshitatsu.workers.dev/me) — press Revoke
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

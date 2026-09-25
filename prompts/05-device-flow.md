# 05 — the device flow (what actually worked)

## Instruction

> The authorization-code flow is dead: `/authorize` answers `invalid_request` for every
> combination, including a deliberately bogus client_id, so it is not a missing
> parameter. Probe the discovery document for another grant. If `device_authorization`
> answers, switch to it.
>
> If it works, rewrite the ask path around it. Keep the rule that nothing counts as
> approved until the ID token verifies against the issuer's JWKS, and keep the deadline
> — expiry stops the protected action.

## Outcome

`device_authorization` answered `invalid_client` with only a client_id, which meant the
client existed and the call just needed authentication. With HTTP Basic it returned a
user code straight away. Rewrote `approval.ts` around RFC 8628 and verified the whole
path in production: ask → user code → human approves on their phone → ID token verified
→ consent created → the same check now allows.

The switch improved the design rather than compromising it. A device flow is what this
project actually is: **the agent shows a code, the human approves elsewhere**. No
redirect URI to register, and the human is not asked to visit the agent's website.

The pairwise `sub` came back identical across two separate approvals — that is the
continuity the consent model depends on. `auth_time` is in the token too, so freshness
of an approval is available if we want it.

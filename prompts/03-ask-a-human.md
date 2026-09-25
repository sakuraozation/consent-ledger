# 03 — asking a human (World ID for Agents)

## Instruction

> Implement the "ask" outcome. World ID for Agents is the Human Continuity IdP and it
> speaks plain OIDC — authorization code with PKCE, discovery at
> `sandbox.auth.world.org/.well-known/openid-configuration`.
>
> Send the person to the authorize endpoint, and when they come back, **verify the ID
> token on the server against the published JWKS before treating anything as approved**.
> A client-side claim is never authorization; that is an explicit qualification
> requirement, and it is also the only reason this design means anything.
>
> The `sub` is pairwise — anonymous, but stable per person. That is exactly what consent
> needs: not who they are, but whether it is the same person as last time.
>
> Give the waiting state a deadline. If nobody answers, the protected action does not
> happen. Expiry is an outcome, not an error.

## Outcome

`src/approval.ts` plus four endpoints in `src/api.ts`. Verified by hand: the authorize
URL is built with PKCE and state; an unknown state is refused; a callback with no code is
read as the human declining; a pending request reports `waiting` until it resolves.

Real approval still needs an OIDC client registered in the sandbox portal. The two-minute
deadline is mine — the open question in `specs/sketch.md` is what an agent should do while
it waits, and stopping is the answer I chose.

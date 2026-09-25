# Conventions

Small rules, chosen for a 36-hour build that has to be believable on a projector.

## No client bundle

Screens are server-rendered with Hono JSX. No React, no build step, no client-side state.

Two reasons, and the second is the one that matters here:

1. There is no bundler to break at 3am.
2. **The demo is a claim about state, so the state should not live in the browser.**
   When the same request comes back refused after a revocation, a page reload proves it.
   A client-side re-render only proves that the client re-rendered.

Polling (waiting for a human to approve) uses `<meta http-equiv="refresh">`. It looks
plain, and plain is the point.

## Styling

One `<style>` block, hand-written, sharing a few CSS custom properties. No framework, no
CDN. The screens are a list, a button and a verdict; a design system would be more code
than the thing it styles.

Dark mode via `prefers-color-scheme`, because half the room's laptops are dark and the
judging room's projector is not.

## Verdicts are shown, not translated

Every decision from the ledger carries a `reason` string written to be read by a person.
The screens print it unchanged. If a reason reads badly on screen, fix it in the ledger —
do not paper over it in the view.

## Naming

The four outcomes are `allow`, `deny`, `ask`, `revoked` everywhere — in the API, in the
database, in the UI copy, in the pitch. One word per outcome, no synonyms.

## What a screen may not do

- Decide anything. Screens render verdicts; `src/ledger.ts` decides.
- Hold a secret. Client ID and secret stay server-side; the browser never sees them.
- Hide a refusal. If something is denied, the reason is on screen, not in a console.

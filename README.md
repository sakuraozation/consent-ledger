# consent-ledger

ETHGlobal Tokyo 2026 submission. Work in progress.

## Disclosure

The first commit of this repository contains a **generic, project-agnostic scaffold**
prepared before the hackathon began, as permitted by the event rules ("you can
familiarize yourself with all the tools and technologies you intend to use beforehand"):

- a Hono / Cloudflare Workers skeleton
- hello-world wiring for x402 (paying side), World ID (server-side verification with
  failure paths), and ENSv2 (read side)
- `docs/` notes on the shortest call path for each SDK
- `FEEDBACK.md`, which starts with integration measurements taken during that
  pre-event familiarization (each entry is dated)

None of it is specific to this project — it works unchanged for any subject. Everything
from the second commit onward was written during the hackathon, and the commit history
shows the sequence. AI assistance is documented in `AI-USE.md`, with the specs and
prompts that directed it in `specs/` and `prompts/`.

## Run

```sh
bun install
cp .env.example .dev.vars   # fill in
bun run dev                 # http://localhost:8787
```

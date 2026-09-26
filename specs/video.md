# Demo video — script

Constraints from the rules: **2–4 minutes, 720p or better, my own voice.** Synthesized
speech, music-with-captions, phone recordings and speed-ups all disqualify. Screen recording
is fine; QuickTime is what I will use.

Target length **3:10**. Word counts assume ~140 words/minute, which is a slow, clear pace for
a non-native speaker. Read it slowly rather than trying to fit more in.

Before recording, reset the demo:

```bash
bun run scripts/reset-demo.ts && bun run scripts/ens-role.ts grant
```

That gives: Aoi with the shoot's scopes delegated and everything generative withheld, one
engagement running to the end of the year, one lapsing in 90 seconds, and the on-chain roles
granted.

---

## 0:00–0:35 · Where this came from (no screen — slide or plain背景)

> A model I know found an advertisement using her body. Not her face — her body, her posture,
> her proportions. It came from a scan taken during a normal, paid shoot. Nobody asked her
> about the ad.
>
> She called her agency, because that is what an agency is for. They could not do anything
> either. Not because they did not care — because nobody could see where the data had gone,
> and there was nothing to point at.

Pause.

> I am not going to claim this app would have stopped that advertisement. It would not have.
> What it addresses is the thing that made everyone powerless: **there was no record anyone
> could ask.**

*Note to self: do not name her, do not name the client, do not show any image. The story is
told in general terms on purpose.*

## 0:35–1:05 · Why now, and who this is for

> This is about to be asked of the whole industry, because the money has already moved.
> In January, Khaby Lame — the most-followed creator on TikTok — licensed an AI digital twin
> of his image, voice and behaviour as part of a deal reported at nine hundred and seventy
> five million dollars. That is a real market for generated likeness, and it exists now.
>
> When a market that size exists, the industry gets asked for transparency. Not asked
> politely — asked by brands who need to prove what they licensed, and eventually by
> regulators.
>
> So this is not a tool that protects a model from her agency. **It is built for the agency**,
> because they are the ones who will have to answer the question.

## 1:05–1:35 · The line the product is drawn along (screen: /agency roster)

Show the roster. Three people, different delegations.

> Here is what an agency actually holds. Three models, and **look at what each one delegated**
> — they are not the same.
>
> The split is not by media type. The images from a shoot — print, social, a lookbook — an
> agency has handled those for decades, and any enquiry about them goes to them. That is the
> job.
>
> What is generated from her body data is a different thing. It was not part of the shoot's
> deliverables, it was not priced in the booking, and in most contracts it is not mentioned at
> all. So that one stays with her.

Point at Aoi's row: shoot scopes delegated, generative scopes withheld.

## 1:35–2:05 · The agency's side works the way they already work (screen: /agency/Aoi)

> On her page, the term is the first thing you see, because the term is what does the work.
> Most of these end by running out. Nobody presses anything.

Show the engagement lapsing (the 90-second one), then:

> That one just expired. Same request, different answer, and no human involved.

Then press **Stop this use** on the live one.

> And when a deal genuinely ends early, that is theirs to press, because they are the party to
> it.

## 2:05–2:40 · The generating side, and the two ways it is answered (screen: /generate)

> Nobody opens this page in real life. A brand's pipeline makes one call from inside its own
> code, before it generates anything. This is a stand-in so you can watch it.

Pick Aoi + `lookbook` → `deny`.

> Lookbook: the agency handles it and has not agreed to it. So the answer is no — and the
> reason says to ask **them**. There is a desk for this.

Pick Aoi + `ai-generation` → `ask`. Press **Ask the human**, show the code.

> Generating from her body data: nobody was ever given this, so there is no desk. The request
> goes to her.

Before approving, switch to her screen — the request is there with a countdown — and then to
the agency's roster, where it says *1 waiting on them*.

> Three people can see it is waiting. Only she can end it. Her agency can see it and ring her
> — they do not get a button.

Approve it on the phone. Show the verdict flip to `allow`.

> She answered. The reason says she answered it herself — not her agency — and that consent is
> recorded under her, not under their delegation.

## 2:40–3:10 · Why this belongs on ENSv2 (screen: /me, then the script output)

> Who may speak for whom is on ENSv2, on Sepolia. Each scope is a separate role on her own
> name, so `campaign-print` is a role her agency holds and `ai-generation` is one they do not.
> That is Enhanced Access Control doing exactly what the product needed — I did not write a
> contract for it.

Run `bun run scripts/ens-role.ts withdraw campaign-print`, then re-run the same request.

*If the take-back is also shown on camera, press it on `lookbook` — the bottom one.
`campaign-print` is the scope that shows `allow` and `campaign-social` is the one that lapses,
so taking either of those back breaks a later beat.*

> I just removed one role on chain. Nothing was written in my database. The same request that
> was allowed a second ago is refused now, and it names the chain as the reason.
>
> That is the part that must not depend on me. If this service is wrong, or gone, the limit
> still holds — and taking a role back is a signature only she can make.

Close on the four outcomes.

> Three parties, and each one gets something. The agency can answer a brand at machine speed
> without giving up any of the work that makes them an agency. The model can see what she is
> tied to and keeps what nobody has ever held. And the generating side gets a yes or no before
> it spends, with a reason it can act on.
>
> One thing I want to be straight about, because it is the most interesting limit. World ID
> tells me a real human answered, and that it is the same human as last time. **It does not
> tell me she is the rights holder** — and a likeness licence belongs to an identified person.
> That link comes from her contract, established once by people. A passport check would not
> fix it either, because a passport proves an identity, not who owns the right. So I used the
> credential that is proportionate to the question I actually ask, and left the other question
> where it already lives.
>
> Two smaller ones: the name is not resolvable through the universal resolver on this
> deployment — it returns the zero address, so I read the registry directly. And I did not
> connect payment. Paying her directly would mean giving her a key, and I decided she should
> not need one. That is the next question, not a missing feature.

---

## Recording notes

- **Voice**: mine. No TTS anywhere, including for the intro.
- **Screen**: 1280×720 at least. Hide bookmarks; use a clean window.
- **Do not show**: `.dev.vars`, the terminal scrollback with keys, any real client name, any
  image of a person.
- If a judge asks why the screens have no photographs, the answer is one line: *the premise is
  that her images were used without her agreeing; putting a stock face here to make the demo
  prettier would be the same act, and nothing stores images anyway.*
- Two takes maximum per section; stitch rather than restart.
- If the World approval is slow on camera, keep talking — the waiting state is part of the
  argument, not dead air.

## If a section has to go to fit 4:00

Cut in this order: the lapsing engagement (2:05 can reference it verbally), then the
`Stop this use` press, then the roster. **Never cut** the `ai-generation` ask path, the
on-chain role removal, or the sentence about what the credential does not prove — the first
two are prize requirements that have to be seen, and the third is the part a judge will
otherwise ask about.

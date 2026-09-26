# Demo video — script

> The opening (0:00–1:05) is recorded separately, in my own words. The screen half has its own
> shot list with the exact clicks: [`video-screens.md`](video-screens.md). This file stays as the
> whole arc and the reasoning behind each beat.

Rules: **2–4 minutes, 720p or better, my own voice.** Synthesized speech, music-with-captions,
phone recordings and speed-ups all disqualify. Screen recording is fine; QuickTime for both.

Target **3:20 without the optional beat**, about 3:55 with it. That is 505 spoken words at 140
words a minute, a slow and clear pace for a non-native speaker, plus the pauses while screens load
and the approval lands. **Watch the clock at the 1:50 mark**: if you are behind, skip the optional
beat rather than speeding up — a speed-up disqualifies the entry.

Tone: first person, short sentences, plain words. This is me saying what I heard and what I
built, not a product pitch. If a sentence is hard to say out loud, cut it rather than slow down
for it.

Before recording:

```bash
bun run scripts/reset-demo.ts && bun run scripts/ens-role.ts grant
```

That gives three people with different delegations, one engagement running to the end of the
year, and the on-chain roles granted. The seeded short engagement expires ninety seconds after
the reset, so by filming time it is already lapsed — which is useful in the list. The lapse
itself gets created on camera.

---

## 0:00–0:40 · What I heard

*One still card, large type, nothing else. Three lines the voice does not read out:*

```
A handheld 3D scanner.
Not in the agreement.
Nobody could do anything.
```

> I took on a problem in the acting and modelling industry, to see whether web3 has anything real
> to offer it.
>
> Here is what I heard. A model's data does not only get used for the shoot they were paid for.
> Sometimes it is used to build an AI model of them. Not on the internet — **in the studio, on the
> day.** Someone walking around a model with a handheld 3D scanner. Not in the agreement, and
> plainly outside it.
>
> Neither the model nor their agency can do anything. They just feel uneasy.

*This is first-hand: someone in the industry told me directly. Say "I was told" — do not imply I
saw it. No names, no studio, no images, nothing on screen but the card.*

## 0:40–1:05 · Why it matters soon, and who it is for

*Card can stay up, or cut to black.*

> The loud conversation now is whether to ban this. I think the voices of actors and models will
> get louder — and once that settles, **the industry will be asked for transparency.** By brands
> who have to prove what they licensed. This is a prototype for that moment.
>
> The money is already there. In January, Khaby Lame licensed an AI twin of his image, voice and
> behaviour, in a deal reported at close to a billion dollars.
>
> So I did not build this to protect a model from their agency. **I built it for the agency** —
> they will be asked, and today they cannot answer either.

## 1:05–1:30 · The line I drew

*Screen: `/agency` — the roster. Three people, three different delegations.*

> Three models, and **look at what each one handed over.** They are not the same.
>
> I did not split this by media type. Print, social, a lookbook — an agency has handled those for
> decades. That is the job.
>
> What gets *generated* from body data is different. Not part of the shoot, not priced, usually not
> in the contract. So I left that one with the person.

*Point at Aoi's row: the shoot's scopes delegated, the generative ones withheld.*

## 1:30–1:50 · The term does the work  ·  **optional**

*This beat costs about 35 seconds including the wait, and it is the first thing to drop. Skip it
if you are past 1:40 when you get here — the term is already visible on the cards, and 1:50 can
say "most of these end by running out" in passing.*

*Screen: `/agency/Aoi`.*

> The first thing you see is the term, because the term is what does the work. Most of these end
> by running out.

*Now create the lapse on camera: pick a scope, choose **90 seconds**, press **Record it**. Then
keep talking through the next lines and come back to it when it flips.*

*Press **Stop this use** on the live one.*

> When a deal really does end early, that is theirs to press.

## 1:50–2:30 · Two different answers

*Screen: `/generate`.*

> Nobody opens this page in real life. A brand's pipeline makes this call from its own code.

*Pick Aoi + `lookbook` → `deny`.*

> The agency handles this and has not agreed to it. So the answer is no, and the reason says to ask
> **them**. There is a desk for it.

*Pick Aoi + `ai-generation` → `ask`. Press **Ask the human**; the code appears.*

> Nobody was ever given this one, so there is no desk. The question goes to the person.

*Switch to `/me` — the request is there with a countdown — then to `/agency`, which now says
**1 waiting on them**. Then approve it on the phone.*

> Three people can see it is waiting. Only one of them can end it. The agency can see it and ring
> them — they do not get a button.
>
> They answered themselves, and the record says so.

## 2:30–3:10 · Why this is on ENSv2, and what it does not prove

*Screen: `/me`, the on-chain panel.*

> Who may speak for whom is on ENSv2, on Sepolia. Each scope is a separate role on the person's own
> name: `campaign-print` their agency holds, `ai-generation` they do not. That is Enhanced Access
> Control — I wrote no contract.

*Terminal, once: `bun run scripts/ens-role.ts withdraw campaign-print`. Then re-run the same
request on `/generate`.*

> One role removed on chain, nothing written in my database. The same request is refused now, and
> it names the chain as the reason. That is the part that must not depend on me.

*Back to `/me`, or stay on the verdict.*

> One thing I want to be straight about. World ID tells me a real human answered, and the same one
> as last time. **It does not tell me they are the rights holder.** A likeness licence belongs to an
> identified person, and that comes from their contract. A passport would not fix it either — it
> proves an identity, not who owns the right.

*End there. Do not add a summary — the three screens were the summary.*

---

## What is on screen, and what is not

- **No webcam.** The rules ask for my own voice, not my face. The screens deliberately carry no
  photographs of anyone, so putting my own face in would sit oddly against that.
- **No editor, no source files.** Nobody needs to watch code being read. What has to be visible
  is that it runs; the README points at the exact files.
- **The terminal appears exactly once**, for `ens-role.ts withdraw`. The command and its
  transaction are the evidence that the refusal came from the chain and not from my database.
- **No documents on screen** beyond the opening card. Reading and listening compete, and the
  README's headings were written so a skimming reader gets the argument without the video.

## Recording notes

- **Voice**: mine. No TTS anywhere, including the intro.
- **Screen**: 1280×720 or better. Hide bookmarks; use a clean window.
- **Do not show**: `.dev.vars`, terminal scrollback with keys, any real name, any image of a
  person.
- Two takes per section at most; stitch rather than restart.
- If the approval is slow on camera, keep talking — the waiting state is part of the argument,
  not dead air.
- If the take-back is shown on camera, press it on `lookbook`. `campaign-print` is the scope that
  shows `allow` and `campaign-social` is the one that lapses; taking either back breaks a later
  beat.
- If a judge asks why there are no photographs: *the premise is that someone's images were used
  without them agreeing; putting a stock face here to make the demo prettier would be the same
  act, and nothing stores images anyway.*

## If it runs long

Cut in this order: the whole optional beat at 1:30, then the Khaby Lame sentence, then the
roster commentary (the screen makes the point without it). **Never cut** the `ai-generation` question going to the person, the
on-chain role removal, or the sentence about what the credential does not prove — the first two
are prize requirements that have to be seen, and the third is what a judge would otherwise ask.

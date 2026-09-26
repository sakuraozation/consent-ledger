# Screen recording — shot list

The opening (what I heard, why it matters, who it is for) is already recorded separately. This
file is only the screen half: **what I click, in what order, and what I say over it.**

Runtime of this half: **about 2:10**, plus the optional beat. Lines in `>` are spoken. Everything
else is an action.

## Recording tool, and why one take

**macOS built-in: `cmd+shift+5` → Options → Microphone → your mic → Record Selected Portion.**
No install, and it captures the mic alongside the screen. OBS is more control than this needs.

**Record the screen half in one take, narrating live.** It is less work than recording audio
separately, and the reason is not laziness: the voice has to land on the click. If the audio is
recorded apart, every screen action has to be nudged into place, and any correction risks a
drift that a judge can see. Stumbling is fine — the rules penalise **speed-ups**, not pauses.
If a shot goes badly, re-record that shot; the cuts are at tab switches so they stitch invisibly.

**Do not trim silences**, even though tools offer it. On a screen demo it desynchronises the
voice from the clicks, and pacing edits are the thing the rules are suspicious of. A pause while
the approval lands is evidence that it is real.

### Assembling the two pieces

The opening is already recorded, so there are exactly two files to join. `ffmpeg` is installed:

```bash
bun run scripts/video-assemble.ts <opening-audio> <screen-recording> submission.mp4
```

It builds the opening from `assets/opening-card.png` plus your voice, normalises the screen take
to the same format, concatenates, and then **checks the two things that disqualify**: the height
must be at least 720, and the total must land between 2:00 and 4:00. It re-encodes but never
changes speed or pitch.

To make the card image: open [`assets/opening-card.html`](../assets/opening-card.html) in the
browser, go full screen, and capture it with `cmd+shift+4` into `assets/opening-card.png`.

iMovie does the same job by hand if you would rather see it: card image stretched over the
opening audio, then the screen take after it. Either way, export at 1080p.

### What AI can do here, and what it must not

- **Captions: yes.** Auto-captions from CapCut or YouTube help a non-native narration land, and
  the rules only forbid *music-with-captions replacing a voice* — captions over your own voice
  are fine. Read them through; auto-captions mangle `ai-generation` and `ENSv2`.
- **Mild audio cleanup: fine.** Adobe Podcast Enhance or Descript's Studio Sound removes room
  noise without changing the voice. Keep it light — heavy processing starts to sound synthetic,
  which invites exactly the question you do not want.
- **Synthesized speech, voice cloning, "read my script for me": disqualifies the entry.** Not a
  judgement call, it is in the rules.
- **Filler-word and silence removal: do not.** See above.

## Before you hit record

```bash
cd ~/Universe/consent-ledger
bun run scripts/reset-demo.ts && bun run scripts/ens-role.ts grant
```

Then, in the browser:

1. Open `https://consent-ledger.yoshitatsu.workers.dev/agency`
2. Open a **second tab** on `/me` and a **third** on `/generate` — switching tabs is faster and
   quieter on camera than typing URLs.
3. Have a **fourth tab** with an empty terminal, sized so one command and its output fit. Clear
   the scrollback (`cmd+K`) so no keys are visible.
4. Phone in hand, World App already open, screen unlocked and set not to sleep.
5. Window at 1280×720 or larger, bookmarks bar hidden.

Expected starting state: Aoi delegated `campaign-print`, `campaign-social`, `lookbook`; holding
`ai-generation`, `ai-training`, `digital-double`. The short engagement seeded by the reset has
already lapsed — that is intended, it is what a lapsed term looks like.

---

## Shot 1 — the roster · ~30s

**Tab 1, `/agency`.** Do not scroll yet.

> Three models, and **look at what each one handed over.** They are not the same.

**Scroll slowly** so all three rows are visible. Hover Aoi's row, then Rin's.

> I did not split this by media type. Print, social, a lookbook — an agency has handled those for
> decades. That is the job.
>
> What gets *generated* from body data is different. Not part of the shoot, not priced, usually not
> in the contract. So I left that one with the person.

**Click `Aoi`** (the name in the first row).

---

## Shot 2 — the term · ~20s · **optional, drop this first**

**You are now on `/agency/<Aoi>`.** Scroll to **Live**.

> The first thing you see is the term, because the term is what does the work. Most of these end
> by running out.

Only if you are comfortably inside 1:00 for this half so far:

1. Scroll to **Put an engagement on the record**
2. Leave scope as `campaign-print`; change the term dropdown to **90 seconds — to watch a term lapse**
3. Click **Record it**
4. Keep talking; come back at the end of Shot 3 and reload to show it lapsed

Then scroll to **Live** and click **Stop this use** on one of them.

> When a deal really does end early, that is theirs to press.

*Skip this whole shot if you are behind. The cards already show the dates.*

---

## Shot 3 — two different answers · ~45s

**Tab 3, `/generate`.**

> Nobody opens this page in real life. A brand's pipeline makes this call from its own code.

1. **Subject** dropdown → **Aoi**
2. **Scope** dropdown → **lookbook**
3. Click **Generate**

Wait for the verdict box to render as `deny`, then read it.

> The agency handles this and has not agreed to it. So the answer is no, and the reason says to ask
> **them**. There is a desk for it.

4. **Scope** dropdown → **ai-generation**
5. Click **Generate** → the verdict is `ask`

> Nobody was ever given this one, so there is no desk. The question goes to the person.

6. Click **Ask the human** → a five-and-five character code appears with a countdown

**Switch to tab 2 (`/me`) and reload.** The panel **Someone is asking you, right now** is at the
top with the same code and the seconds left.

**Switch to tab 1 (`/agency`) and reload.** Aoi's row now carries **1 waiting on them**.

> Three people can see it is waiting. Only one of them can end it. The agency can see it and ring
> them — they do not get a button.

**Back to tab 2 (`/me`)**, click **Open it and answer** — or scan the code on the phone — and
approve in World App.

**Switch to tab 3 (`/generate`)** and click **Generate** again.

> They answered themselves, and the record says so.

*If the approval is slow, keep talking over the waiting screen. The countdown is part of the
argument, not dead air. Never speed the footage up.*

---

## Shot 4 — the role is on chain · ~35s

**Tab 2, `/me`.** Scroll to **The same authority, on chain**.

> Who may speak for whom is on ENSv2, on Sepolia. Each scope is a separate role on the person's own
> name: `campaign-print` their agency holds, `ai-generation` they do not. That is Enhanced Access
> Control — I wrote no contract.

**Switch to the terminal tab.** Type it live so the command is readable:

```bash
bun run scripts/ens-role.ts withdraw campaign-print
```

Wait for `success` and the transaction hash to print. Leave it on screen for a beat.

**Switch to tab 3 (`/generate`).** Scope → **campaign-print** → **Generate**.

> One role removed on chain, nothing written in my database. The same request is refused now, and it
> names the chain as the reason. That is the part that must not depend on me.

---

## Shot 5 — the close · ~25s

Stay on the verdict, or switch to `/me`. No new clicks.

> One thing I want to be straight about. World ID tells me a real human answered, and the same one
> as last time. **It does not tell me they are the rights holder.** A likeness licence belongs to an
> identified person, and that comes from their contract. A passport would not fix it either — it
> proves an identity, not who owns the right.

Stop recording. Do not add a summary; the screens were the summary.

---

## After recording

Put the demo back before anyone else opens the link:

```bash
bun run scripts/reset-demo.ts && bun run scripts/ens-role.ts grant
```

(Shot 4 removed a real on-chain role, so the second command matters.)

## Do not show

- `.dev.vars`, or any terminal scrollback that might contain a key
- the editor, or any source file
- any real person's name, and no photograph of anyone

## If a take goes wrong

Re-record the single shot, not the whole half. The shots are cut at tab switches on purpose, so
they stitch without a visible jump.

# Customer journey

Three people, one record. Written before the screens, so the screens have something to be
measured against. Revised twice since: once when the agency turned out to be the operator
rather than the adversary, and once when the term — not the button — turned out to be the
thing that ends permission.

---

## 1. The scan already happened

A model shoots a campaign. As part of it, she is photographed from many angles — this is
normal, paid, and agreed. Months later a friend sends her an ad. It is not her face exactly,
but it is her body, her posture, her proportions. Nobody asked.

She calls her agency — the people whose job is exactly this. **They cannot do anything
either.** Nobody can see it, so nobody can stop it. That is the state before anything we
build.

## 2. The agency puts the terms they already agreed onto the record

They are already her representatives: they take the calls, arrange the castings, negotiate
across markets. None of that changes, and none of it is what we build. What we take is the
one part a contract can hold.

First the authority to act is recorded. This is not a new decision she makes — it is the
representation agreement she already signed, made explicit enough for a machine to honour.
On ENSv2 it is a role on her name, scoped to the single record that holds her consent: the
agency can write that record and nothing else on the name.

Then the terms. The agency knows them — which medium, which market, **until when**. Until
now that lived in a contract nobody could query at the speed generation happens.

They create the record: **who**, **what use**, **until when**. The period is not an
afterthought; it is the part that does the work. The person is identified by a World ID
pairwise subject, so the record says *this human*, not *this name*. No images and no scan
data are stored.

> *Screen: agency dashboard — who is represented, the scope and term of each engagement,
> what is live and what has lapsed.*

## 3. The generating side asks first

A brand's pipeline is about to produce an image from that body data. Before it generates, it
asks:

```
POST /check  { subject, scope }
```

Four things can come back, each with a reason written to be shown to a human unchanged:

- **allow** — in scope, inside the term
- **deny** — the agency handles this scope and has not agreed to it. The brand's route is a
  phone call to them, not a question to her
- **ask** — only she can answer: either the term she agreed has run out, or **this is a scope
  she never delegated**. A lapsed term does not mean she said no; it means nobody renewed it.
  A scope she kept means nobody was ever allowed to answer for her
- **revoked** — the permission was ended

> *Screen: the requesting side — one button, and the verdict with its reason.*

## 4. When the answer is `ask`, she decides herself

This is the half the chain cannot do. ENS holds who may speak for whom; it cannot ask a
person a question right now. And for a scope she kept there is nobody else to ask — the
agency was never given it.



The pipeline stops and asks. It shows a short code. She approves on her phone — a separate
device, a separate session, nothing to install for the pipeline.

Her identity is verified **on our server** against the issuer's keys. Until that passes,
nothing is approved. The subject comes back the same as last time, which is how we know it
is the same person and not someone borrowing her account.

**While it waits, the generation does not happen.** If she does not answer within the
deadline, the request expires and the generation still does not happen. That is a decision,
not an oversight: an agent that proceeds on silence is not asking.

> *Screen: the waiting state — the code, the countdown, and what happens if nobody answers.*

## 5. Permission ends — and the ordinary way is that it runs out

Most permissions here are never revoked by anyone. **The term passes and the answer
changes.** No message, no button, nobody deciding anything: the same request that was
allowed last month comes back `ask`, because a deal ended the way deals end. Renewal is the
event that needs a person, not termination.

> *Screen: a live engagement and a lapsed one side by side, and the same request answered
> differently.*

When a deal genuinely ends early, that is the agency's to do — they are the party to it. She
tells them, they press **Stop this use**, and seconds later the same request from the same
pipeline comes back **refused, with the reason**. Her route to this is a phone call, which is
what representation is; putting the button in front of her instead would be pretending the
relationship works differently than it does.

> *Screen: the agency ends one use, then the same request refused.*

## 6. The exception: her agency went outside what she gave them

Not a deal she dislikes — that is a phone call. This is the narrow case where they acted
outside the scope itself. **Stop letting them handle `<scope>`** takes that one scope back and
leaves the rest alone. It requires proof that a real human, the same human as before, is
doing it: proportionate precisely because it changes what was agreed rather than following it.
Refusing to verify changes nothing; closing the window changes nothing.

What happens next is the part worth watching. The scope does not switch off — it becomes hers,
so the next request for it **comes to her** rather than being refused. Consents the agency
issued in that scope stop applying, because the authority they rested on is gone. Everything
else they handle is untouched.

> *Screen: Stop letting them handle ad-image — confirmed with Proof of Human — then the same
> request answered by her instead of by the record.*

An earlier version of this step offered *take back all authority*, and it was the wrong lever
for the stated reason: the adversary is the third party reusing her scan, and ending her
agency's authority does nothing to them — it only closes the legitimate channel. The screen
listed leaks and impersonation as the reasons to press it, which are the cases it cannot fix.

Removing the matching role on ENS is a signature only she can make. This service stops
honouring the scope the moment she confirms, and nothing here can remove the on-chain role for
her. That gap is why the role is on chain at all.

### If she just disagrees with the terms

That is not an override, and it is not something a product should settle. Her page carries
**Ask to change this** to a person and stops there. Negotiation is the half we deliberately
left with the humans, and building messaging and counter-offers here would be a second
product.

## 7. Two words, chosen for what they end

"Revoke" and "Withdraw" sat next to each other and could not be told apart at a glance — the
first person to use the screens asked what the difference was, which is the question a judge
would have had. So the labels name their scope: **Stop this use** ends one use, **Take back
all authority** ends everything under the delegation.

## 8. When something breaks, nothing is generated

The failure we designed for is not a crash, it is a *silent yes*. So every way this can fail
falls the same direction:

| What breaks | What happens |
|---|---|
| The chain cannot be read | The request does not proceed on the assumption of permission — it goes to **ask**, and the reason says the chain was unreadable |
| A human is asked and does not answer | The request expires. Nothing is generated. Waiting is the behaviour |
| This service throws | 500 with the error, and a page that says plainly that nothing was generated |
| A scope was never granted | **deny**, without asking anyone — there is nothing to ask about |

None of these return `allow`. The one bug we shipped and caught went the other way — a
revocation leaked across scopes and refused *too much* — and we found it because the usage
log makes every verdict visible after the fact.

---

## What each person leaves with

- **The agency**: the terms they already negotiated, in a form that can answer a machine at
  the speed generation happens — without giving up any of the work that makes them an
  agency.
- **The person**: sight of what she is tied to and until when, a way to raise it with a
  person, and one exceptional action that is genuinely hers.
- **The generating side**: a yes or no before they spend, with a reason they can act on.

What made this hard was never consent. It was that writing precise terms — duration, scope,
what counts as reuse — cost more than the vagueness did, until generation got fast enough to
make vagueness expensive.

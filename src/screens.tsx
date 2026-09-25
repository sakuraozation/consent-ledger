// 3つの画面。どれも判定を持たず、ledger の verdict をそのまま映す。
import { Hono } from "hono";
import { getPendingByRequest, pollApproval, startApproval, sweep } from "./approval";
import { activeFor, grant as grantDelegation, listFor, withdraw } from "./delegation";
import { all, bySubject, check, put, record, revoke, usesBySubject } from "./ledger";
import { ConsentCard, Page, UseLog, VerdictBox } from "./ui";

export const screens = new Hono<{ Bindings: Env }>();

const DEMO_SUBJECT = "model-a";

screens.get("/", (c) => c.redirect("/generate"));

/** 事務所の画面。所属の許諾・期限・取り消しを一覧する。操作はするが、権限は持たない。 */
screens.get("/agency", async (c) => {
  const [consents, delegation] = await Promise.all([all(c.env.DB), activeFor(c.env.DB, DEMO_SUBJECT)]);
  return c.html(
    <Page title="Agency — protect your roster" here="agency">
      <h1>Protect your roster</h1>
      <p class="sub">
        Your talent cannot police this themselves — that is why you represent them. Here you can say what
        their body data may be used for, and stop a use the moment you hear about it.
      </p>
      {delegation ? (
        <p class="meta">
          {DEMO_SUBJECT} has delegated to <strong>{delegation.custodian}</strong> since{" "}
          {new Date(delegation.grantedAt).toISOString().slice(11, 19)}Z. You act on their behalf. They can
          withdraw this at any time, and you cannot stop that — which is what makes the arrangement worth
          trusting.
        </p>
      ) : (
        <p class="meta deny">
          No live delegation for {DEMO_SUBJECT}. Until they delegate, you cannot act for them — nothing you
          issue will be honoured.
        </p>
      )}
      <form method="post" action="/agency/consents">
        <input type="text" name="subject" value={DEMO_SUBJECT} aria-label="subject" />{" "}
        <select name="scope" aria-label="scope">
          <option value="ad-image">ad-image</option>
          <option value="social-post">social-post</option>
          <option value="lookbook">lookbook</option>
        </select>{" "}
        <button type="submit">Grant for 60s</button>
      </form>
      <h2>On the record</h2>
      {consents.length === 0 ? (
        <p class="dim">Nothing yet.</p>
      ) : (
        consents.map((x) => <ConsentCard c={x} revocable revokeAction={`/agency/${x.id}/revoke`} />)
      )}
    </Page>,
  );
});

screens.post("/agency/consents", async (c) => {
  const f = await c.req.formData();
  const subject = String(f.get("subject") ?? DEMO_SUBJECT);
  const delegation = await activeFor(c.env.DB, subject);
  // 委任が無ければ事務所は発行できない。ここが権限の線。
  if (!delegation) return c.redirect("/agency");
  await put(c.env.DB, {
    id: crypto.randomUUID(),
    subject,
    scopes: [String(f.get("scope") ?? "ad-image")],
    expiresAt: Date.now() + 60_000,
    custodian: delegation.custodian,
    delegationId: delegation.id,
  });
  return c.redirect("/agency");
});

/** 日常の取り消しは事務所がやる（本人から連絡が来たら押す）。 */
screens.post("/agency/:id/revoke", async (c) => {
  await revoke(c.env.DB, c.req.param("id"), "custodian");
  return c.redirect("/agency");
});

/** 本人の画面。押す物がひとつだけある。窓口を通さずに効く。 */
screens.get("/me", async (c) => {
  const subject = c.req.query("subject") ?? DEMO_SUBJECT;
  const [mine, uses, delegations] = await Promise.all([
    bySubject(c.env.DB, subject),
    usesBySubject(c.env.DB, subject),
    listFor(c.env.DB, subject),
  ]);
  const live = delegations.find((d) => d.withdrawnAt === undefined);
  return c.html(
    <Page title="Your consents" here="me">
      <h1>What your agency is doing for you</h1>
      <p class="sub">
        They handle this so you do not have to. Ask them to stop a use and they will — and if you ever want
        the authority back, you can take it back yourself, without asking.
      </p>
      <h2>Your agency</h2>
      {live ? (
        <div class="card">
          <div class="row">
            <strong>{live.custodian}</strong>
            <form method="post" action={`/me/delegations/${live.id}/withdraw`}>
              <button type="submit" class="ghost">
                Withdraw authority
              </button>
            </form>
          </div>
          <div class="meta">
            Acting for you since {new Date(live.grantedAt).toISOString().slice(11, 19)}Z. Withdrawing stops
            every consent they issued under it, at once. They cannot undo it.
          </div>
        </div>
      ) : (
        <div class="card">
          <div class="row">
            <strong class="dim">Nobody is acting for you</strong>
            <form method="post" action="/me/delegations">
              <input type="hidden" name="subject" value={subject} />
              <button type="submit">Delegate to your agency</button>
            </form>
          </div>
          <div class="meta">Until you delegate, your agency cannot act — and neither can anyone else.</div>
        </div>
      )}
      <h2>What they have agreed to on your behalf</h2>
      {mine.length === 0 ? <p class="dim">Nothing on file.</p> : mine.map((x) => <ConsentCard c={x} revocable />)}
      <h2>Where it was used</h2>
      <p class="sub">
        Every time someone asked to generate from your data, it is here — including the times they were
        refused. This is the part you could never see before.
      </p>
      <UseLog uses={uses} />
    </Page>,
  );
});

screens.post("/me/:id/revoke", async (c) => {
  await revoke(c.env.DB, c.req.param("id"), "subject");
  return c.redirect("/me");
});

/** 委任する。実運用では World ID の承認を通す（デモでは1クリック）。 */
screens.post("/me/delegations", async (c) => {
  const f = await c.req.formData();
  await grantDelegation(c.env.DB, {
    subject: String(f.get("subject") ?? DEMO_SUBJECT),
    custodian: "Tokyo Model Agency",
  });
  return c.redirect("/me");
});

/** 本人だけの一手。以後、その下の許諾はすべて効かない。 */
screens.post("/me/delegations/:id/withdraw", async (c) => {
  await withdraw(c.env.DB, c.req.param("id"));
  return c.redirect("/me");
});

/** 生成する側。押すと、生成の前に照会が走る。 */
screens.get("/generate", async (c) => {
  const subject = c.req.query("subject") ?? DEMO_SUBJECT;
  const scope = c.req.query("scope") ?? "ad-image";
  const asked = c.req.query("asked");
  const v = asked ? await check(c.env.DB, { subject, scope }) : undefined;
  if (v) await record(c.env.DB, { subject, scope, verdict: v, requester: "pipeline-a (demo)" });

  return c.html(
    <Page title="Generate — consent check" here="generate">
      <h1>Generate from this person's body data</h1>
      <p class="sub">
        The pipeline asks the ledger before it generates. Nothing is produced until the answer comes back.
      </p>
      <form method="get" action="/generate">
        <input type="hidden" name="asked" value="1" />
        <input type="text" name="subject" value={subject} aria-label="subject" />{" "}
        <select name="scope" aria-label="scope">
          <option value="ad-image" selected={scope === "ad-image"}>
            ad-image
          </option>
          <option value="social-post" selected={scope === "social-post"}>
            social-post
          </option>
          <option value="nsfw" selected={scope === "nsfw"}>
            nsfw
          </option>
        </select>{" "}
        <button type="submit">Generate</button>
      </form>

      {v ? (
        <>
          <VerdictBox v={v} />
          {v.decision === "allow" ? (
            <p class="dim">The image would be produced here. Revoke it on the person's page and press Generate again.</p>
          ) : null}
          {v.decision === "ask" && v.requestId ? (
            <form method="post" action="/generate/ask">
              <input type="hidden" name="requestId" value={v.requestId} />
              <input type="hidden" name="subject" value={subject} />
              <input type="hidden" name="scope" value={scope} />
              <button type="submit">Ask the human</button>
            </form>
          ) : null}
          {v.decision === "deny" || v.decision === "revoked" ? (
            <p class="dim">Nothing was generated.</p>
          ) : null}
        </>
      ) : null}
    </Page>,
  );
});

/** 人に聞く。コードを出して待つ。待っている間は何も生成しない。 */
screens.post("/generate/ask", async (c) => {
  const f = await c.req.formData();
  const requestId = String(f.get("requestId"));
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  const clientSecret = c.env.WORLD_OIDC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.text("World OIDC client is not configured", 500);
  await startApproval(c.env.DB, {
    requestId,
    subject: String(f.get("subject")),
    scope: String(f.get("scope")),
    clientId,
    clientSecret,
  });
  return c.redirect(`/generate/waiting/${requestId}`);
});

screens.get("/generate/waiting/:requestId", async (c) => {
  const requestId = c.req.param("requestId");
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  const clientSecret = c.env.WORLD_OIDC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.text("World OIDC client is not configured", 500);

  await sweep(c.env.DB);
  const r = await pollApproval(c.env.DB, { requestId, clientId, clientSecret });
  const p = r.pending ?? (await getPendingByRequest(c.env.DB, requestId));

  if (r.status === "approved" && p) {
    await put(c.env.DB, {
      id: crypto.randomUUID(),
      subject: p.subject,
      scopes: [p.scope],
      expiresAt: Date.now() + 60_000,
      custodian: p.sub,
    });
  }

  const left = p ? Math.max(0, Math.round((p.expiresAt - Date.now()) / 1000)) : 0;
  return c.html(
    <Page
      title="Waiting for a human"
      here="generate"
      refresh={r.status === "waiting" ? 3 : undefined}
    >
      <h1>Asking the person</h1>
      <p class="sub">The generation has not started. It will not start unless they say yes.</p>
      {p && r.status === "waiting" ? (
        <div class="card">
          <div class="meta">They enter this code at sandbox.auth.world.org/device</div>
          <div class="code">{p.userCode}</div>
          <div class="meta">
            {left}s left. If nobody answers, this request expires and nothing is generated.
          </div>
          <div class="meta dim" style="margin-top:.75rem">
            In this industry the message goes over chat, so it is written to be pasted:
          </div>
          <pre class="paste">{`Approval needed for "${p.scope}".\nCode: ${p.userCode}\nOpen: https://sandbox.auth.world.org/device\nExpires in ${left}s — nothing is generated until you answer.`}</pre>
        </div>
      ) : null}
      <div class={`verdict ${r.status === "approved" ? "allow" : r.status === "waiting" ? "ask" : "deny"}`}>
        <h3>{r.status}</h3>
        <p>{r.reason}</p>
      </div>
      <p>
        <a href="/generate?asked=1">Back to the pipeline</a>
      </p>
    </Page>,
  );
});

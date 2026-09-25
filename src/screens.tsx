// 3つの画面。どれも判定を持たず、ledger の verdict をそのまま映す。
import { Hono } from "hono";
import { getPendingByRequest, pollApproval, startApproval, sweep } from "./approval";
import { all, bySubject, check, put, record, revoke, usesBySubject } from "./ledger";
import { ConsentCard, Page, UseLog, VerdictBox } from "./ui";

export const screens = new Hono<{ Bindings: Env }>();

const DEMO_SUBJECT = "model-a";

screens.get("/", (c) => c.redirect("/generate"));

/** 事務所の画面。所属の許諾・期限・取り消しを一覧する。操作はするが、権限は持たない。 */
screens.get("/agency", async (c) => {
  const consents = await all(c.env.DB);
  return c.html(
    <Page title="Agency — consent ledger" here="agency">
      <h1>Roster consents</h1>
      <p class="sub">
        The agency operates this view. It cannot un-revoke anything — revocation belongs to the person.
      </p>
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
      {consents.length === 0 ? <p class="dim">Nothing yet.</p> : consents.map((x) => <ConsentCard c={x} />)}
    </Page>,
  );
});

screens.post("/agency/consents", async (c) => {
  const f = await c.req.formData();
  await put(c.env.DB, {
    id: crypto.randomUUID(),
    subject: String(f.get("subject") ?? DEMO_SUBJECT),
    scopes: [String(f.get("scope") ?? "ad-image")],
    expiresAt: Date.now() + 60_000,
  });
  return c.redirect("/agency");
});

/** 本人の画面。押す物がひとつだけある。窓口を通さずに効く。 */
screens.get("/me", async (c) => {
  const subject = c.req.query("subject") ?? DEMO_SUBJECT;
  const [mine, uses] = await Promise.all([bySubject(c.env.DB, subject), usesBySubject(c.env.DB, subject)]);
  return c.html(
    <Page title="Your consents" here="me">
      <h1>What you have agreed to</h1>
      <p class="sub">Revoking takes effect immediately. You do not need the agency to do it for you.</p>
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
  await revoke(c.env.DB, c.req.param("id"));
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

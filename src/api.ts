// 照会の口。生成する側（エージェント）はここだけ見ればよい。
import { Hono } from "hono";
import { completeApproval, getPendingByRequest, startApproval, sweep } from "./approval";
import { type Consent, all, check, put, revoke } from "./ledger";

export const api = new Hono<{ Bindings: Env }>();

/** 許諾を置く。実運用では事務所の画面から、デモでは直接叩く。 */
api.post("/consents", async (c) => {
  const b = (await c.req.json().catch(() => null)) as Partial<Consent> | null;
  if (!b?.subject || !Array.isArray(b.scopes) || b.scopes.length === 0) {
    return c.json({ error: "subject and scopes are required" }, 400);
  }
  const consent = await put(c.env.DB, {
    id: b.id ?? crypto.randomUUID(),
    subject: b.subject,
    scopes: b.scopes,
    expiresAt: typeof b.expiresAt === "number" ? b.expiresAt : Date.now() + 60_000, // デモ既定は60秒
    custodian: b.custodian,
  });
  return c.json(consent, 201);
});

/** 生成の前にここを呼ぶ。4状態を理由つきで返す。 */
api.post("/check", async (c) => {
  const b = (await c.req.json().catch(() => null)) as { subject?: string; scope?: string } | null;
  if (!b?.subject || !b.scope) return c.json({ error: "subject and scope are required" }, 400);
  // allow 以外も 200 で返す＝呼ぶ側が判定を読む。HTTP のエラーにしない。
  return c.json(await check(c.env.DB, { subject: b.subject, scope: b.scope }));
});

/** 本人が取り消す。窓口（事務所）を通さずに効く＝ここが設計の芯。 */
api.post("/consents/:id/revoke", async (c) => {
  const found = await revoke(c.env.DB, c.req.param("id"));
  if (!found) return c.json({ error: "not found" }, 404);
  return c.json(found);
});

api.get("/consents", async (c) => c.json(await all(c.env.DB)));

/** 「人に聞く」を開始する。check が ask を返した時に呼ぶ。 */
api.post("/approvals", async (c) => {
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  if (!clientId) return c.json({ error: "WORLD_OIDC_CLIENT_ID is not configured" }, 500);
  const b = (await c.req.json().catch(() => null)) as
    | { requestId?: string; subject?: string; scope?: string }
    | null;
  if (!b?.requestId || !b.subject || !b.scope) {
    return c.json({ error: "requestId, subject and scope are required" }, 400);
  }
  const { url, pending } = await startApproval(c.env.DB, {
    requestId: b.requestId,
    subject: b.subject,
    scope: b.scope,
    clientId,
    redirectUri: new URL("/approvals/callback", c.req.url).toString(),
  });
  return c.json({ approveUrl: url, expiresAt: pending.expiresAt });
});

/** 認可画面からの戻り。承認されたら許諾を作り直す（期限切れの更新もここ）。 */
api.get("/approvals/callback", async (c) => {
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  if (!clientId) return c.text("WORLD_OIDC_CLIENT_ID is not configured", 500);
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) {
    return c.text("The human declined or the provider returned no code — the action does not proceed.", 400);
  }
  const r = await completeApproval(c.env.DB, {
    code,
    state,
    clientId,
    clientSecret: c.env.WORLD_OIDC_CLIENT_SECRET,
    redirectUri: new URL("/approvals/callback", c.req.url).toString(),
  });
  if (!r.ok || !r.pending) return c.text(r.reason, 403);

  await put(c.env.DB, {
    id: crypto.randomUUID(),
    subject: r.pending.subject,
    scopes: [r.pending.scope],
    expiresAt: Date.now() + 60_000,
  });
  return c.text(`${r.reason}\nConsent granted for "${r.pending.scope}".`);
});

/** 承認の状態を見る。待っている間に何が起きているかを画面に出すため。 */
api.get("/approvals/:requestId", async (c) => {
  await sweep(c.env.DB);
  const p = await getPendingByRequest(c.env.DB, c.req.param("requestId"));
  if (!p) return c.json({ error: "not found" }, 404);
  return c.json({
    requestId: p.requestId,
    scope: p.scope,
    status: p.result ?? "waiting",
    expiresAt: p.expiresAt,
    sub: p.sub,
  });
});

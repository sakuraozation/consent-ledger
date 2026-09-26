// 照会の口。生成する側（エージェント）はここだけ見ればよい。
import { Hono } from "hono";
import { getPendingByRequest, pollApproval, startApproval, sweep } from "./approval";
import { readChainDelegation } from "./chain";
import { type Consent, all, check, put, record, revoke, usesBySubject } from "./ledger";

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
  const b = (await c.req.json().catch(() => null)) as
    | { subject?: string; scope?: string; requester?: string }
    | null;
  if (!b?.subject || !b.scope) return c.json({ error: "subject and scope are required" }, 400);
  // 委任の権限はチェーンが正本なので、判定の前に読む（読めない時は ask に倒れる）
  const chain = await readChainDelegation(c.env, c.env.ENS_CUSTODIAN, b.scope, b.subject);
  const verdict = await check(c.env.DB, { subject: b.subject, scope: b.scope, chain });
  // 判定は全部残す。拒否も含めて、本人が後から見られるように。
  await record(c.env.DB, {
    subject: b.subject,
    scope: b.scope,
    verdict,
    requester: b.requester ?? c.req.header("user-agent") ?? undefined,
  });
  // allow 以外も 200 で返す＝呼ぶ側が判定を読む。HTTP のエラーにしない。
  return c.json({ ...verdict, chain: chain.configured ? { ok: chain.ok, granted: chain.granted, name: chain.name, key: chain.key, error: chain.error } : undefined });
});

/** 本人が取り消す。窓口（事務所）を通さずに効く＝ここが設計の芯。 */
api.post("/consents/:id/revoke", async (c) => {
  const found = await revoke(c.env.DB, c.req.param("id"));
  if (!found) return c.json({ error: "not found" }, 404);
  return c.json(found);
});

api.get("/consents", async (c) => c.json(await all(c.env.DB)));

/** 本人が「いつ・誰に・どう使われたか」を見る。 */
api.get("/uses/:subject", async (c) => c.json(await usesBySubject(c.env.DB, c.req.param("subject"))));

/** 「人に聞く」を開始する。check が ask を返した時に呼ぶ。人間に見せるコードを返す。 */
api.post("/approvals", async (c) => {
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  const clientSecret = c.env.WORLD_OIDC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.json({ error: "World OIDC client is not configured" }, 500);
  const b = (await c.req.json().catch(() => null)) as
    | { requestId?: string; subject?: string; scope?: string }
    | null;
  if (!b?.requestId || !b.subject || !b.scope) {
    return c.json({ error: "requestId, subject and scope are required" }, 400);
  }
  try {
    const p = await startApproval(c.env.DB, {
      requestId: b.requestId,
      subject: b.subject,
      scope: b.scope,
      clientId,
      clientSecret,
    });
    // 人間に見せるのはこの2つだけ。エージェントは待つ。
    return c.json({ userCode: p.userCode, verifyUrl: p.verifyUrl, expiresAt: p.expiresAt });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});

/** 承認されたか見に行く。承認されていれば許諾を作り直す（期限切れの更新もここ）。 */
api.get("/approvals/:requestId", async (c) => {
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  const clientSecret = c.env.WORLD_OIDC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.json({ error: "World OIDC client is not configured" }, 500);
  await sweep(c.env.DB);
  const r = await pollApproval(c.env.DB, { requestId: c.req.param("requestId"), clientId, clientSecret });

  if (r.status === "approved" && r.pending) {
    const existing = await getPendingByRequest(c.env.DB, r.pending.requestId);
    // 承認された時だけ許諾を作る。ここを通らない限り生成は起きない。
    // 本人が直接答えたもの＝事務所の委任の下ではない。delegationId は付けず、
    // 誰が答えたかを approvedBySub に残す（chain の役割の確認も通らない＝別系統）。
    await put(c.env.DB, {
      id: crypto.randomUUID(),
      subject: r.pending.subject,
      scopes: [r.pending.scope],
      expiresAt: Date.now() + 60_000,
      approvedBySub: existing?.sub,
    });
  }

  return c.json({
    requestId: c.req.param("requestId"),
    status: r.status,
    reason: r.reason,
    scope: r.pending?.scope,
    userCode: r.pending?.userCode,
    expiresAt: r.pending?.expiresAt,
    approvedBy: r.pending?.sub,
  });
});

/** 委任の権限をチェーンから読んだ生の状態。審査で開けるように口を1つ出す。 */
api.get("/chain", async (c) =>
  c.json(await readChainDelegation(c.env, c.env.ENS_CUSTODIAN, c.req.query("scope") ?? undefined)),
);

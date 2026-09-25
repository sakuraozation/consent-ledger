// 照会の口。生成する側（エージェント）はここだけ見ればよい。
import { Hono } from "hono";
import { type Consent, check, revoke, store } from "./ledger";

export const api = new Hono<{ Bindings: Env }>();

/** 許諾を置く。実運用では事務所の画面から、デモでは直接叩く。 */
api.post("/consents", async (c) => {
  const b = (await c.req.json().catch(() => null)) as Partial<Consent> | null;
  if (!b?.subject || !Array.isArray(b.scopes) || b.scopes.length === 0) {
    return c.json({ error: "subject and scopes are required" }, 400);
  }
  const ttl = typeof b.expiresAt === "number" ? b.expiresAt : Date.now() + 60_000; // デモ既定は60秒
  const consent = store.put({
    id: b.id ?? crypto.randomUUID(),
    subject: b.subject,
    scopes: b.scopes,
    expiresAt: ttl,
    custodian: b.custodian,
  });
  return c.json(consent, 201);
});

/** 生成の前にここを呼ぶ。4状態を理由つきで返す。 */
api.post("/check", async (c) => {
  const b = (await c.req.json().catch(() => null)) as { subject?: string; scope?: string } | null;
  if (!b?.subject || !b.scope) {
    return c.json({ error: "subject and scope are required" }, 400);
  }
  const verdict = check({ subject: b.subject, scope: b.scope });
  // allow 以外は 200 で返す＝呼ぶ側が判定を読む。HTTP のエラーにしない。
  return c.json(verdict);
});

/** 本人が取り消す。窓口（事務所）を通さずに効く＝ここが設計の芯。 */
api.post("/consents/:id/revoke", (c) => {
  const found = revoke(c.req.param("id"));
  if (!found) return c.json({ error: "not found" }, 404);
  return c.json(found);
});

api.get("/consents", (c) => c.json(store.all()));

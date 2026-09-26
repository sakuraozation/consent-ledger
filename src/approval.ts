// 「人に聞く」の実装。World ID for Agents（Human Continuity IdP）は RFC 8628 の
// device 認可フローで動かす——エージェントがコードを出し、**人間はスマホで承認する**。
// リダイレクトが要らないので、エージェントが主語の設計にそのまま乗る。
//
// 重要な線: 承認と認めるのは **ID トークンをサーバで JWKS 検証した後だけ**。
// クライアントの申告は一切 authorization に使わない（賞の必須要件）。
// sub は pairwise＝誰かは分からないが「前と同じ人か」は分かる。auth_time で
// 「いつ承認したか」も取れるので、承認の鮮度を条件にできる。
import { createRemoteJWKSet, jwtVerify } from "jose";

const ISSUER = "https://sandbox.auth.world.org";
const DEVICE = `${ISSUER}/api/v1/device_authorization`;
const TOKEN = `${ISSUER}/api/v1/token`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

import { recordOutcome } from "./ledger";

export type Pending = {
  requestId: string;
  subject: string;
  scope: string;
  deviceCode: string;
  userCode: string;
  verifyUrl: string;
  createdAt: number;
  /** 返事の期限。切れたら実行しない＝失敗経路のひとつ */
  expiresAt: number;
  result?: "approved" | "denied" | "expired";
  /** 承認した人の pairwise sub */
  sub?: string;
  /** 承認した時刻（ID トークンの auth_time） */
  authTime?: number;
};

type Row = {
  state: string;
  request_id: string;
  subject: string;
  scope: string;
  verifier: string; // device_code をここに持つ
  verify_url: string | null;
  created_at: number;
  expires_at: number;
  result: string | null;
  sub: string | null;
};

const toPending = (r: Row): Pending => ({
  requestId: r.request_id,
  subject: r.subject,
  scope: r.scope,
  deviceCode: r.verifier,
  userCode: r.state,
  // コード入りの直リンク（IdP の verification_uri_complete）。無ければ一般の入口。
  verifyUrl: r.verify_url ?? `${ISSUER}/device`,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  result: (r.result as Pending["result"]) ?? undefined,
  sub: r.sub ?? undefined,
});

function basic(clientId: string, clientSecret: string) {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

const HEADERS = { "content-type": "application/x-www-form-urlencoded", "user-agent": "consent-ledger/0.1" };

/**
 * 人に聞きに行く。返すのは、人間に見せるコードと URL。
 * 待ち時間の既定は2分＝返事が来なければ実行しない（sketch の open question への答え）。
 */
export async function startApproval(
  db: D1Database,
  input: {
    requestId: string;
    subject: string;
    scope: string;
    clientId: string;
    clientSecret: string;
    ttlMs?: number;
  },
): Promise<Pending> {
  const res = await fetch(DEVICE, {
    method: "POST",
    headers: { ...HEADERS, authorization: basic(input.clientId, input.clientSecret) },
    body: new URLSearchParams({ scope: "openid" }),
  });
  const text = await res.text();
  if (!res.ok || !text.startsWith("{")) {
    throw new Error(`device_authorization failed (HTTP ${res.status}): ${text.slice(0, 160)}`);
  }
  const d = JSON.parse(text) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
  };

  const now = Date.now();
  const p: Pending = {
    requestId: input.requestId,
    subject: input.subject,
    scope: input.scope,
    deviceCode: d.device_code,
    userCode: d.user_code,
    verifyUrl: d.verification_uri_complete ?? d.verification_uri,
    createdAt: now,
    expiresAt: now + (input.ttlMs ?? 120_000),
  };

  await db
    .prepare(
      "INSERT INTO approvals (state, request_id, subject, scope, verifier, verify_url, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(p.userCode, p.requestId, p.subject, p.scope, p.deviceCode, p.verifyUrl, now, p.expiresAt)
    .run();
  return p;
}

async function setResult(db: D1Database, userCode: string, result: string, sub?: string) {
  await db.prepare("UPDATE approvals SET result = ?, sub = ? WHERE state = ?").bind(result, sub ?? null, userCode).run();
}

/**
 * 承認されたかを見に行く。承認されていれば ID トークンを検証し、そこで初めて認める。
 * 保留中は pending のまま返す＝呼ぶ側は待つか、諦めるかを選べる。
 */
export async function pollApproval(
  db: D1Database,
  input: { requestId: string; clientId: string; clientSecret: string },
): Promise<{
  status: "waiting" | "approved" | "denied" | "expired";
  reason: string;
  pending?: Pending;
  /** この呼び出しで状態が確定したか。結末をログに二度書かないための印 */
  settledNow?: boolean;
}> {
  let settled = false;
  const row = await db
    .prepare("SELECT * FROM approvals WHERE request_id = ? ORDER BY created_at DESC")
    .bind(input.requestId)
    .first<Row>();
  if (!row) return { status: "denied", reason: "No such approval request." };
  const p = toPending(row);
  if (p.result) return { status: p.result, reason: `Already ${p.result}.`, pending: p };

  if (Date.now() > p.expiresAt) {
    await setResult(db, p.userCode, "expired");
    p.result = "expired";
    settled = true;
    return {
      settledNow: settled,
      status: "expired",
      reason: "The human did not answer in time; the action does not proceed.",
      pending: p,
    };
  }

  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { ...HEADERS, authorization: basic(input.clientId, input.clientSecret) },
    body: new URLSearchParams({ grant_type: DEVICE_GRANT, device_code: p.deviceCode }),
  });
  const text = await res.text();
  const body = text.startsWith("{") ? (JSON.parse(text) as Record<string, string>) : {};

  if (!res.ok) {
    // まだ承認されていない／急ぎすぎ＝失敗ではない
    if (body.error === "authorization_pending" || body.error === "slow_down") {
      return { status: "waiting", reason: "Waiting for the human to approve.", pending: p };
    }
    await setResult(db, p.userCode, "denied");
    p.result = "denied";
    settled = true;
    return {
      status: "denied",
      reason: `The human declined or the request failed (${body.error ?? res.status}); the action does not proceed.`,
      pending: p,
    };
  }

  if (!body.id_token) {
    await setResult(db, p.userCode, "denied");
    return { status: "denied", reason: "No id_token in the response.", pending: p };
  }

  // ここが線: 検証を通ったものだけを承認として扱う。
  try {
    const { payload } = await jwtVerify(body.id_token, JWKS, { issuer: ISSUER, audience: input.clientId });
    p.sub = String(payload.sub);
    p.authTime = typeof payload.auth_time === "number" ? payload.auth_time : undefined;
    p.result = "approved";
    settled = true;
    await setResult(db, p.userCode, "approved", p.sub);
    return {
      settledNow: settled,
      status: "approved",
      reason: `Approved by ${p.sub} (pairwise subject), verified against the issuer's JWKS.`,
      pending: p,
    };
  } catch (e) {
    await setResult(db, p.userCode, "denied");
    return {
      status: "denied",
      reason: `ID token failed verification: ${e instanceof Error ? e.message : String(e)}`,
      pending: p,
    };
  }
}

export async function getPendingByRequest(db: D1Database, requestId: string) {
  const row = await db
    .prepare("SELECT * FROM approvals WHERE request_id = ? ORDER BY created_at DESC")
    .bind(requestId)
    .first<Row>();
  return row ? toPending(row) : undefined;
}

/**
 * 時間切れを掃く。待たせたまま通してしまわないため。
 * **掃く側が結末も書く**——先に result を立てるのはここなので、ポーリング側に任せると
 * 「答えなかった」が誰にも記録されずに消える（09-26 実測）。
 */
export async function sweep(db: D1Database, now = Date.now()): Promise<Pending[]> {
  const { results } = await db
    .prepare("SELECT * FROM approvals WHERE result IS NULL AND expires_at < ?")
    .bind(now)
    .all<Row>();
  if (results.length === 0) return [];
  await db.prepare("UPDATE approvals SET result = 'expired' WHERE result IS NULL AND expires_at < ?").bind(now).run();
  const swept = results.map(toPending);
  for (const p of swept) {
    await recordOutcome(db, {
      subject: p.subject,
      scope: p.scope,
      outcome: "unanswered",
      requester: "nobody answered in time",
      requestId: p.requestId,
    });
  }
  return swept;
}

/** いまこの人に向かって開いている要求。本人の画面に「誰かが聞いている」を出すため。 */
export async function pendingFor(db: D1Database, subject: string, now = Date.now()): Promise<Pending[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM approvals WHERE subject = ? AND result IS NULL AND expires_at > ? ORDER BY created_at DESC",
    )
    .bind(subject, now)
    .all<Row>();
  return results.map(toPending);
}

/** 名簿に待機件数を出すため（誰を待たせているかは事務所も知るべき）。 */
export async function pendingCounts(db: D1Database, now = Date.now()): Promise<Record<string, number>> {
  const { results } = await db
    .prepare(
      "SELECT subject, COUNT(*) as n FROM approvals WHERE result IS NULL AND expires_at > ? GROUP BY subject",
    )
    .bind(now)
    .all<{ subject: string; n: number }>();
  const out: Record<string, number> = {};
  for (const r of results) out[r.subject] = r.n;
  return out;
}

// 「人に聞く」の実装。World ID for Agents（Human Continuity IdP）は標準の OIDC で、
// 認可コード + PKCE。本人を認可画面へ送り、戻ってきた ID トークンを**サーバで**検証する。
// 検証は jose で JWKS を引いて行う＝クライアントの申告は一切 authorization に使わない
// （賞の必須要件: "do not treat an unvalidated client response as authorization"）。
//
// sub は pairwise（このクライアント固有の匿名 ID）。誰かは分からないが、
// **同じ人が戻ってきたか**は分かる＝許諾の連続性に必要なのはこれだけ。
import { createRemoteJWKSet, jwtVerify } from "jose";

const ISSUER = "https://sandbox.auth.world.org";
const AUTHORIZE = `${ISSUER}/api/v1/authorize`;
const TOKEN = `${ISSUER}/api/v1/token`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

export type Pending = {
  requestId: string;
  subject: string;
  scope: string;
  /** PKCE の検証子と CSRF 対策の state */
  verifier: string;
  state: string;
  createdAt: number;
  /** 承認が返るまでの猶予。切れたら実行しない＝失敗経路のひとつ */
  expiresAt: number;
  result?: "approved" | "denied" | "expired";
  /** 承認した人の pairwise sub。前回と同じ人かの判定に使う */
  sub?: string;
};

const pending = new Map<string, Pending>();

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function random(n = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(n)));
}

async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

/** 人に聞きに行く。返した URL へ本人を送る。 */
export async function startApproval(input: {
  requestId: string;
  subject: string;
  scope: string;
  clientId: string;
  redirectUri: string;
  ttlMs?: number;
}) {
  const verifier = random(48);
  const state = random();
  const now = Date.now();
  const p: Pending = {
    requestId: input.requestId,
    subject: input.subject,
    scope: input.scope,
    verifier,
    state,
    createdAt: now,
    expiresAt: now + (input.ttlMs ?? 120_000), // 既定2分。返事が来ない時間の設計は sketch の open question
  };
  pending.set(state, p);

  const url = new URL(AUTHORIZE);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await challenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return { url: url.toString(), pending: p };
}

/** 認可画面から戻ってきたところ。ここで初めて「承認された」と認める。 */
export async function completeApproval(input: {
  code: string;
  state: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}): Promise<{ ok: boolean; reason: string; pending?: Pending }> {
  const p = pending.get(input.state);
  if (!p) return { ok: false, reason: "Unknown or reused state — refusing." };
  if (p.result) return { ok: false, reason: `This request was already ${p.result}.`, pending: p };
  if (Date.now() > p.expiresAt) {
    p.result = "expired";
    return { ok: false, reason: "The human did not answer in time; the action does not proceed.", pending: p };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    code_verifier: p.verifier,
  });
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "consent-ledger/0.1",
  };
  if (input.clientSecret) {
    headers.authorization = `Basic ${btoa(`${input.clientId}:${input.clientSecret}`)}`;
  }

  const res = await fetch(TOKEN, { method: "POST", headers, body });
  const text = await res.text();
  if (!res.ok || !text.startsWith("{")) {
    p.result = "denied";
    return { ok: false, reason: `Token exchange failed (HTTP ${res.status}): ${text.slice(0, 160)}`, pending: p };
  }
  const token = JSON.parse(text) as { id_token?: string };
  if (!token.id_token) {
    p.result = "denied";
    return { ok: false, reason: "No id_token in the response.", pending: p };
  }

  // サーバ側の検証。ここを通らないものは承認として扱わない。
  try {
    const { payload } = await jwtVerify(token.id_token, JWKS, {
      issuer: ISSUER,
      audience: input.clientId,
    });
    p.sub = String(payload.sub);
    p.result = "approved";
    return { ok: true, reason: `Approved by ${p.sub} (pairwise subject).`, pending: p };
  } catch (e) {
    p.result = "denied";
    return { ok: false, reason: `ID token failed verification: ${e instanceof Error ? e.message : String(e)}`, pending: p };
  }
}

export function getPendingByRequest(requestId: string) {
  return [...pending.values()].find((p) => p.requestId === requestId);
}

/** 時間切れを掃く。実行前に必ず通す＝待たせたまま通してしまわないため。 */
export function sweep(now = Date.now()) {
  for (const p of pending.values()) {
    if (!p.result && now > p.expiresAt) p.result = "expired";
  }
}

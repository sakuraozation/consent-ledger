// World ID の hello world（売る側＝サーバ）。賞の必須要件を最初から形にしてある:
//   ①検証はサーバ側でやる（クライアントの返事を authorization に使わない）
//   ②失敗経路も見せる（拒否・資格不足・二重検証・未設定）
//   ③どの資格を要求したかと、その理由を1箇所に置く（Best Use of IDKit の評価軸）
// 証明の作成はブラウザ側（IDKit）。ここは受け取って Developer Portal に検証を投げるだけ。
import { Hono } from "hono";

// 要求する資格の最小十分（賞の評価軸＝多く使うほど良い、ではない）。
// device: 端末ベース（弱い・デモで回る） / orb: 虹彩登録済み（強い）
const LEVEL_RANK: Record<string, number> = { device: 1, orb: 2 };
const REQUIRED_LEVEL = "device";
const WHY_THIS_LEVEL =
  "承認が要るのは『この操作をしたのが同じ人間か』の一点で、誰かを特定する必要はない。端末レベルで十分。";

type Proof = {
  nullifier_hash: string;
  merkle_root: string;
  proof: string;
  verification_level: string;
};

type VerifyResult = { success: boolean; code?: string; detail?: string; attribute?: string | null };

export type ProofCheck =
  | { ok: true; nullifier: string; level: string; firstTime: boolean }
  | { ok: false; reason: string; detail?: string; status: 400 | 403 | 500 };

/**
 * 証明をサーバ側で検証する。**クライアントの返事を authorization に使わない**のが
 * この関数が存在する理由＝呼ぶ側は必ずここを通す（賞の必須要件）。
 * 記録は D1（Worker はリクエストごとに別インスタンスなので、メモリでは持てない
 * ＝09-25 に同じ間違いを許諾の保存でやっている）。
 */
export async function verifyProof(
  env: Env,
  proof: Proof,
  opts: { action: string; requiredLevel?: string; db?: D1Database },
): Promise<ProofCheck> {
  const appId = env.WORLD_APP_ID;
  if (!appId) return { ok: false, reason: "not_configured", status: 500 };
  if (!proof?.nullifier_hash || !proof.proof) return { ok: false, reason: "malformed_proof", status: 400 };

  const required = opts.requiredLevel ?? REQUIRED_LEVEL;
  // 失敗経路: 要求した資格に足りない（弱い証明を送ってきた）
  if ((LEVEL_RANK[proof.verification_level] ?? 0) < (LEVEL_RANK[required] ?? 0)) {
    return { ok: false, reason: "insufficient_credential", detail: `requires ${required}`, status: 403 };
  }

  const res = await fetch(`https://developer.worldcoin.org/api/v2/verify/${appId}`, {
    method: "POST",
    // user-agent は必須（09-22 実測）。無いと nginx の 403 HTML で弾かれる。
    headers: { "content-type": "application/json", "user-agent": "consent-ledger/0.1" },
    body: JSON.stringify({ ...proof, action: opts.action }),
  });
  const body = await res.text();
  const result: VerifyResult = body.startsWith("{")
    ? (JSON.parse(body) as VerifyResult)
    : { success: false, code: "portal_not_json", detail: `HTTP ${res.status}` };
  console.log("[worldid] verify", opts.action, res.status, body.slice(0, 200));

  // 失敗経路: 無効・期限切れ・取消（World 側の code をそのまま見せる）
  if (!result.success) {
    return { ok: false, reason: result.code ?? "verification_failed", detail: result.detail, status: 400 };
  }

  let firstTime = true;
  if (opts.db) {
    const seenRow = await opts.db
      .prepare("SELECT nullifier FROM verifications WHERE nullifier = ? AND action = ?")
      .bind(proof.nullifier_hash, opts.action)
      .first<{ nullifier: string }>();
    firstTime = seenRow === null;
    if (firstTime) {
      await opts.db
        .prepare("INSERT INTO verifications (nullifier, action, level, at) VALUES (?, ?, ?, ?)")
        .bind(proof.nullifier_hash, opts.action, proof.verification_level, Date.now())
        .run();
    }
  }
  return { ok: true, nullifier: proof.nullifier_hash, level: proof.verification_level, firstTime };
}

export { REQUIRED_LEVEL, WHY_THIS_LEVEL };
export type { Proof };

// 同じ人が同じ action を2回通らないことの確認用（hello world 側だけの簡易版）。
const seen = new Set<string>();

export const worldId = new Hono<{ Bindings: Env }>();

worldId.get("/worldid", (c) => {
  const appId = c.env.WORLD_APP_ID;
  const action = c.env.WORLD_ACTION;
  if (!appId || !action) {
    return c.html(
      page(null, null, "WORLD_APP_ID / WORLD_ACTION が未設定（wrangler.toml の [vars]）"),
    );
  }
  return c.html(page(appId, action, null));
});

worldId.post("/worldid/verify", async (c) => {
  const appId = c.env.WORLD_APP_ID;
  const action = c.env.WORLD_ACTION;
  if (!appId || !action) return c.json({ ok: false, reason: "not_configured" }, 500);

  const proof = (await c.req.json().catch(() => null)) as Proof | null;
  if (!proof?.nullifier_hash || !proof.proof) {
    return c.json({ ok: false, reason: "malformed_proof" }, 400);
  }

  // 失敗経路その1: 要求した資格に足りない（クライアントが弱い証明を送ってきた）
  if ((LEVEL_RANK[proof.verification_level] ?? 0) < (LEVEL_RANK[REQUIRED_LEVEL] ?? 0)) {
    return c.json({ ok: false, reason: "insufficient_credential", required: REQUIRED_LEVEL }, 403);
  }

  // 検証は必ずサーバから Developer Portal へ（SDK を使わず HTTP 1本＝Workers でそのまま動く）
  const res = await fetch(`https://developer.worldcoin.org/api/v2/verify/${appId}`, {
    method: "POST",
    // user-agent は必須（09-22 実測）。Workers の fetch は既定で UA を送らず、World 側は
    // UA 無しのリクエストを nginx の 403 HTML で弾く＝JSON を期待していると原因が見えない。
    headers: { "content-type": "application/json", "user-agent": "hack-kit/0.1" },
    body: JSON.stringify({ ...proof, action }),
  });
  // 未知の app_id だと Portal は JSON でなく HTML を返す（09-22 実測）。json() を素で呼ぶと
  // "Unexpected token '<'" で 500 になり、本当の原因（app_id が違う）が見えなくなる。
  const body = await res.text();
  const result: VerifyResult = body.startsWith("{")
    ? (JSON.parse(body) as VerifyResult)
    : { success: false, code: "portal_not_json", detail: `HTTP ${res.status} — app_id を確認` };

  // 何が返ったかをサーバログにも出す（ブラウザを見ていない時に原因を追えるように）
  console.log("[worldid] portal", res.status, body.slice(0, 300));

  // 失敗経路その2: 証明が無効・期限切れ・取消（World 側が返す code をそのまま見せる）
  if (!result.success) {
    return c.json(
      { ok: false, reason: result.code ?? "verification_failed", detail: result.detail },
      400,
    );
  }

  // 失敗経路その3: 同じ人が同じ action を二度（nullifier は人を特定しないが重複は分かる）
  if (seen.has(proof.nullifier_hash)) {
    return c.json({ ok: false, reason: "already_verified" }, 409);
  }
  seen.add(proof.nullifier_hash);

  return c.json({ ok: true, nullifier: proof.nullifier_hash, level: proof.verification_level });
});

function page(appId: string | null, action: string | null, error: string | null) {
  const config = JSON.stringify({ app_id: appId, action, verification_level: REQUIRED_LEVEL });
  return `<!doctype html><meta charset="utf-8"><title>World ID hello world</title>
<body style="font:16px/1.6 system-ui;max-width:42rem;margin:3rem auto;padding:0 1rem">
<h1>World ID hello world</h1>
<p>要求する資格: <b>${REQUIRED_LEVEL}</b><br><small>${WHY_THIS_LEVEL}</small></p>
${error ? `<p style="color:#b00">${error}</p>` : ""}
<button id="go" ${error ? "disabled" : ""}>Verify with World ID</button>
<pre id="out" style="background:#f4f4f5;padding:1rem;white-space:pre-wrap"></pre>
<script type="module">
import "https://cdn.jsdelivr.net/npm/@worldcoin/idkit-standalone@2/build/index.global.js";
const out = document.getElementById("out");
const log = (label, v) => { out.textContent += label + " " + JSON.stringify(v, null, 2) + "\\n"; };
const cfg = ${config};
if (cfg.app_id) {
  IDKit.init({
    ...cfg,
    handleVerify: async (proof) => {
      const r = await fetch("/worldid/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(proof) });
      const body = await r.json();
      log(r.ok ? "server ok:" : "server rejected (" + r.status + "):", body);
      if (!r.ok) throw new Error(body.reason); // IDKit のモーダルにエラーを出す＝失敗経路の見せ方
    },
    onSuccess: (r) => log("client success:", r),
  });
  document.getElementById("go").addEventListener("click", () => IDKit.open());
}
</script>`;
}

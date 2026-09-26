// World ID の検証（サーバ側）。**クライアントの返事を authorization に使わない**のが
// この層が存在する理由で、呼ぶ側は必ず verifyProof を通す。
// 証明の作成はブラウザ側（IDKit）。ここは受け取って Developer Portal に検証を投げるだけ。
//
// 事前に作った hello world のページ（/worldid）は 09-26 に削除した——製品の判断に
// 繋がっていない2つ目の IDKit 統合があると、どちらが本物か分からなくなる。

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

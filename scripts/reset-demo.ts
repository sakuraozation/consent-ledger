// デモの初期状態に戻す。撮り直しのたびに使う。
//
//   bun run scripts/reset-demo.ts            # 本番
//   bun run scripts/reset-demo.ts --local    # ローカル
//
// 作る状態: model-a に生きた委任が1つ、その下に有効な許諾が1件（ad-image）。
// 過去の記録（許諾・使用ログ・検証）は消す＝画面が前回の撮影の残骸で埋まらないように。
// チェーン側の役割は付与に戻す（scripts/ens-role.ts grant を別に叩く）。
const local = process.argv.includes("--local");
const flag = local ? "--local" : "--remote";
const SUBJECT = "model-a";
const CUSTODIAN = "Tokyo Model Agency";
const MINUTES = 10; // 撮影中に切れない長さ。/agency から出す既定は60秒

const sql = (q: string) =>
  Bun.spawnSync(["bunx", "wrangler", "d1", "execute", "consent-ledger", flag, "--command", q], {
    stdout: "pipe",
    stderr: "pipe",
  });

const run = (label: string, q: string) => {
  const r = sql(q);
  const err = new TextDecoder().decode(r.stderr);
  if (r.exitCode !== 0) {
    console.error(`${label}: 失敗\n${err.split("\n").slice(-6).join("\n")}`);
    process.exit(1);
  }
  console.log(`${label}: ok`);
};

const now = Date.now();
const delegationId = crypto.randomUUID();
const consentId = crypto.randomUUID();

run("古い記録を消す", `DELETE FROM uses; DELETE FROM consents; DELETE FROM delegations; DELETE FROM verifications;`);
run(
  "委任を1つ置く",
  `INSERT INTO delegations (id, subject, custodian, granted_at) VALUES ('${delegationId}', '${SUBJECT}', '${CUSTODIAN}', ${now});`,
);
run(
  "有効な許諾を1件置く",
  `INSERT INTO consents (id, subject, scopes, expires_at, revoked_at, custodian, created_at, delegation_id) VALUES ('${consentId}', '${SUBJECT}', '["ad-image"]', ${now + MINUTES * 60_000}, NULL, '${CUSTODIAN}', ${now}, '${delegationId}');`,
);

console.log(`\n${local ? "ローカル" : "本番"}のデモを初期化した`);
console.log(`  subject   ${SUBJECT}`);
console.log(`  委任      ${delegationId.slice(0, 8)}（生きている）`);
console.log(`  許諾      ${consentId.slice(0, 8)} ad-image・${MINUTES}分有効`);
console.log(`\nチェーン側の役割は別に戻す: bun run scripts/ens-role.ts grant`);

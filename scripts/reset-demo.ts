// デモの初期状態に戻す。撮り直しのたびに使う。
//
//   bun run scripts/reset-demo.ts            # 本番
//   bun run scripts/reset-demo.ts --local    # ローカル
//
// 作る状態: model-a に権限の記録が1つ、その下に engagement が2件——
//   ①現実的な期間（2026-12-31 まで・live）＝「契約の期間」として読める
//   ②90秒で満了（demo）＝満了が画面上で起きるところを見せる
// 期間が全部秒単位だと「契約の期間」ではなく「タイマー」に見えるので、二本立てにする。
// 過去の記録（許諾・使用ログ・検証・申し出）は消す＝前回の撮影の残骸を残さない。
// チェーン側の役割は付与に戻す（scripts/ens-role.ts grant を別に叩く）。
const local = process.argv.includes("--local");
const flag = local ? "--local" : "--remote";
const SUBJECT = "model-a";
const CUSTODIAN = "Tokyo Model Agency";
const LAPSE_SECONDS = 90; // 満了を見せる用。短すぎると撮影中に間に合わない

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
const longId = crypto.randomUUID();
const shortId = crypto.randomUUID();
const endOfYear = Date.UTC(2026, 11, 31, 23, 59, 59);

const consent = (id: string, scope: string, expiresAt: number) =>
  `INSERT INTO consents (id, subject, scopes, expires_at, revoked_at, custodian, created_at, delegation_id) VALUES ('${id}', '${SUBJECT}', '["${scope}"]', ${expiresAt}, NULL, '${CUSTODIAN}', ${now}, '${delegationId}');`;

run(
  "古い記録を消す",
  `DELETE FROM uses; DELETE FROM consents; DELETE FROM delegations; DELETE FROM verifications; DELETE FROM change_requests;`,
);
run(
  "権限の記録を1つ置く",
  `INSERT INTO delegations (id, subject, custodian, granted_at) VALUES ('${delegationId}', '${SUBJECT}', '${CUSTODIAN}', ${now});`,
);
run("契約期間の engagement（2026-12-31 まで）", consent(longId, "ad-image", endOfYear));
run(`満了を見せる engagement（${LAPSE_SECONDS}秒）`, consent(shortId, "social-post", now + LAPSE_SECONDS * 1000));

console.log(`\n${local ? "ローカル" : "本番"}のデモを初期化した`);
console.log(`  subject     ${SUBJECT}`);
console.log(`  権限の記録  ${delegationId.slice(0, 8)}`);
console.log(`  engagement  ${longId.slice(0, 8)} ad-image    until 2026-12-31`);
console.log(`  engagement  ${shortId.slice(0, 8)} social-post ${LAPSE_SECONDS}秒で満了`);
console.log(`\nチェーン側の役割は別に戻す: bun run scripts/ens-role.ts grant`);

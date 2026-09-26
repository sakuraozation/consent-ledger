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
const CUSTODIAN = "Tokyo Model Agency";
const LAPSE_SECONDS = 90;
const endOfYear = Date.UTC(2026, 11, 31, 23, 59, 59);

// 事務所は複数のモデルを代理しており、**渡されている範囲は人ごとに違う**。
// それが分かる初期状態にする（全か無かではないことを画面で見せるため）。
//
// 名前はすべて架空。**subject は識別子**（実運用では World ID の pairwise sub）で、
// 名前は事務所の名簿にだけ載る＝許諾・使用ログ・承認には現れない。
const PEOPLE = [
  {
    // 本人の画面に出るのはこの人（一部だけ委ねている＝いちばん説明が要らない例）
    label: "Aoi",
    subject: "4KQXW7ZP2NTLD6YHS3MRVA9JBC5EGU8F",
    delegated: ["ad-image", "social-post"],
    engagements: [
      { scope: "ad-image", expiresAt: endOfYear },
      { scope: "social-post", expiresAt: Date.now() + LAPSE_SECONDS * 1000 },
    ],
  },
  {
    // 全部任せている（よくある形）
    label: "Mei",
    subject: "9TMRJ4VC8ZPQKD2NLXAS7HYE3BWFU6GO",
    delegated: ["ad-image", "social-post", "lookbook", "nsfw"],
    engagements: [{ scope: "lookbook", expiresAt: Date.now() + 90 * 86_400_000 }],
  },
  {
    // 広告だけ。残りは自分で判断する
    label: "Rin",
    subject: "Q2WLZ6XNBK9SDT4YRJ7PMHFAE3CVU8G5",
    delegated: ["ad-image"],
    engagements: [{ scope: "ad-image", expiresAt: endOfYear }],
  },
];

const sql = (q: string) =>
  Bun.spawnSync(["bunx", "wrangler", "d1", "execute", "consent-ledger", flag, "--command", q], {
    stdout: "pipe",
    stderr: "pipe",
  });

const run = (label: string, q: string) => {
  const r = sql(q);
  if (r.exitCode !== 0) {
    console.error(`${label}: 失敗\n${new TextDecoder().decode(r.stderr).split("\n").slice(-6).join("\n")}`);
    process.exit(1);
  }
  console.log(`${label}: ok`);
};

const now = Date.now();
run(
  "古い記録を消す",
  `DELETE FROM uses; DELETE FROM consents; DELETE FROM delegations; DELETE FROM verifications; DELETE FROM change_requests;`,
);

for (const p of PEOPLE) {
  const did = crypto.randomUUID();
  const rows = [
    `INSERT INTO delegations (id, subject, label, custodian, scopes, granted_at) VALUES ('${did}', '${p.subject}', '${p.label}', '${CUSTODIAN}', '${JSON.stringify(p.delegated)}', ${now});`,
    ...p.engagements.map(
      (e) =>
        `INSERT INTO consents (id, subject, scopes, expires_at, revoked_at, custodian, created_at, delegation_id) VALUES ('${crypto.randomUUID()}', '${p.subject}', '["${e.scope}"]', ${e.expiresAt}, NULL, '${CUSTODIAN}', ${now}, '${did}');`,
    ),
  ];
  run(`${p.label}（委任 ${p.delegated.join("/")}）`, rows.join(" "));
}

console.log(`\n${local ? "ローカル" : "本番"}のデモを初期化した`);
for (const p of PEOPLE) {
  const kept = ["ad-image", "social-post", "lookbook", "nsfw"].filter((sc) => !p.delegated.includes(sc));
  console.log(
    `  ${p.label.padEnd(4)} ${p.subject.slice(0, 10)}…  委任 ${p.delegated.join(", ")}${kept.length ? ` / 本人が保持 ${kept.join(", ")}` : ""}`,
  );
}
console.log(`  Aoi の social-post は ${LAPSE_SECONDS} 秒で満了する（本人の画面＝Aoi）`);
console.log(`\nチェーン側の役割は別に戻す: bun run scripts/ens-role.ts grant`);

// 壊れ方の向き。**どの失敗も allow を返さない**ことを固定する。
// 期限切れは拒否ではなく「人に聞く」に倒す——切れたのは意思が変わったからではない。
import { describe, expect, test } from "bun:test";
import { pendingFor, sweep } from "../src/approval";
import { AGENCY_SIDE } from "../src/config";
import { grant } from "../src/delegation";
import { check, put, record, recordOutcome, usesBySubject } from "../src/ledger";
import { verifyProof } from "../src/worldid";
import { asD1, freshDb } from "./d1";

const SUBJECT = "TEST-SUBJECT-0002";

describe("期限と範囲", () => {
  test("期限切れは deny ではなく ask（意思が変わったわけではない）", async () => {
    const db = asD1(freshDb());
    const d = await grant(db, { subject: SUBJECT, custodian: "A", scopes: [...AGENCY_SIDE] });
    await put(db, {
      id: crypto.randomUUID(),
      subject: SUBJECT,
      scopes: ["campaign-print"],
      expiresAt: Date.now() - 1,
      custodian: "A",
      delegationId: d.id,
    });
    const v = await check(db, { subject: SUBJECT, scope: "campaign-print" });
    expect(v.decision).toBe("ask");
    expect(v.requestId).toBeString();
  });

  test("事務所が扱う範囲で記録が無ければ deny（本人に聞かない）", async () => {
    const db = asD1(freshDb());
    const d = await grant(db, { subject: SUBJECT, custodian: "A", scopes: [...AGENCY_SIDE] });
    await put(db, {
      id: crypto.randomUUID(),
      subject: SUBJECT,
      scopes: ["campaign-print"],
      expiresAt: Date.now() + 3_600_000,
      custodian: "A",
      delegationId: d.id,
    });
    const v = await check(db, { subject: SUBJECT, scope: "lookbook" });
    expect(v.decision).toBe("deny");
    // 本人に振らない＝答えを持っているのは事務所
    expect(v.requestId).toBeUndefined();
  });

  test("何も記録が無い人は ask", async () => {
    const db = asD1(freshDb());
    expect((await check(db, { subject: "NOBODY", scope: "campaign-print" })).decision).toBe("ask");
  });
});

describe("承認の時間切れ", () => {
  test("sweep が expired にし、『答えなかった』をログに残す", async () => {
    const db = asD1(freshDb());
    await db
      .prepare(
        "INSERT INTO approvals (state, request_id, subject, scope, verifier, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("AAAAA-BBBBB", "req-1", SUBJECT, "ai-generation", "device-code", Date.now() - 10_000, Date.now() - 1)
      .run();

    expect((await pendingFor(db, SUBJECT)).length).toBe(0); // 期限切れは pending に出ない
    const swept = await sweep(db);
    expect(swept.length).toBe(1);

    const log = await usesBySubject(db, SUBJECT);
    expect(log.map((u) => u.decision)).toContain("unanswered");
  });

  test("生きている要求は pending に出る", async () => {
    const db = asD1(freshDb());
    await db
      .prepare(
        "INSERT INTO approvals (state, request_id, subject, scope, verifier, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("CCCCC-DDDDD", "req-2", SUBJECT, "ai-generation", "device-code", Date.now(), Date.now() + 60_000)
      .run();
    const p = await pendingFor(db, SUBJECT);
    expect(p.length).toBe(1);
    expect(p[0]?.userCode).toBe("CCCCC-DDDDD");
  });
});

describe("使用ログ", () => {
  test("結末は判定とは別の行として残る", async () => {
    const db = asD1(freshDb());
    await recordOutcome(db, { subject: SUBJECT, scope: "ai-generation", outcome: "approved" });
    const log = await usesBySubject(db, SUBJECT);
    expect(log[0]?.decision).toBe("approved");
    expect(log[0]?.consentId).toBeUndefined();
  });

  test("ask の行と結末が requestId で紐づく（画面が1行に畳める）", async () => {
    const db = asD1(freshDb());
    const verdict = await check(db, { subject: SUBJECT, scope: "ai-generation" });
    expect(verdict.decision).toBe("ask");
    await record(db, { subject: SUBJECT, scope: "ai-generation", verdict, requester: "pipeline" });
    await recordOutcome(db, {
      subject: SUBJECT,
      scope: "ai-generation",
      outcome: "approved",
      requestId: verdict.requestId,
    });
    const log = await usesBySubject(db, SUBJECT);
    const ask = log.find((u) => u.decision === "ask");
    const end = log.find((u) => u.decision === "approved");
    expect(ask?.requestId).toBe(verdict.requestId as string);
    // 同じ requestId で引ける＝承認されたあと ask が ask のまま並ばない
    expect(end?.requestId).toBe(ask?.requestId as string);
  });

  test("sweep の『答えなかった』も requestId で紐づく", async () => {
    const db = asD1(freshDb());
    await db
      .prepare(
        "INSERT INTO approvals (state, request_id, subject, scope, verifier, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("EEEEE-FFFFF", "req-3", SUBJECT, "ai-training", "device-code", Date.now() - 10_000, Date.now() - 1)
      .run();
    await sweep(db);
    const log = await usesBySubject(db, SUBJECT);
    expect(log.find((u) => u.decision === "unanswered")?.requestId).toBe("req-3");
  });
});

describe("証明の検証は通信の前に弾く", () => {
  const env = { WORLD_APP_ID: "app_test" } as unknown as Env;

  test("資格が足りない証明は拒否（ネットワークに出ない）", async () => {
    const r = await verifyProof(
      env,
      { nullifier_hash: "0x1", merkle_root: "0x1", proof: "0x1", verification_level: "lite" },
      { action: "withdraw-authority" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("insufficient_credential");
  });

  test("形の壊れた証明は拒否", async () => {
    const r = await verifyProof(
      env,
      { nullifier_hash: "", merkle_root: "", proof: "", verification_level: "device" },
      { action: "withdraw-authority" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("malformed_proof");
  });

  test("app_id が無ければ拒否（未設定を成功にしない）", async () => {
    const r = await verifyProof(
      {} as unknown as Env,
      { nullifier_hash: "0x1", merkle_root: "0x1", proof: "0x1", verification_level: "device" },
      { action: "withdraw-authority" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_configured");
  });
});

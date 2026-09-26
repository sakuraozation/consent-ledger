// 権限の境界。**「allow が出てはいけない場合」に集中する**——この作品が防ごうとしている
// 失敗は crash ではなく「黙って通ること」なので、守るべき不変条件はほぼ全部
// 「ここで allow を返さない」の形をとる。
import { describe, expect, test } from "bun:test";
import type { ChainState } from "../src/chain";
import { AGENCY_SIDE } from "../src/config";
import { grant, removeScope } from "../src/delegation";
import { check, put } from "../src/ledger";
import { asD1, freshDb } from "./d1";

const SUBJECT = "TEST-SUBJECT-0001";
const AGENCY = "Test Agency";
const chainOk = (granted: boolean): ChainState => ({
  configured: true,
  ok: true,
  granted,
  name: "consentledger.eth",
  key: "consent.campaign-print",
});

/** 事務所が engagement を1件載せた状態を作る。 */
async function seeded(opts: { delegated: string[]; scope: string; expiresAt?: number }) {
  const db = asD1(freshDb());
  const d = await grant(db, { subject: SUBJECT, custodian: AGENCY, scopes: opts.delegated });
  const consent = await put(db, {
    id: crypto.randomUUID(),
    subject: SUBJECT,
    scopes: [opts.scope],
    expiresAt: opts.expiresAt ?? Date.now() + 3_600_000,
    custodian: AGENCY,
    delegationId: d.id,
  });
  return { db, delegation: d, consent };
}

describe("委任していない範囲は事務所の許諾では通らない", () => {
  test("本人が保持している範囲は ask（事務所には答えられない）", async () => {
    const { db } = await seeded({ delegated: [...AGENCY_SIDE], scope: "campaign-print" });
    const v = await check(db, { subject: SUBJECT, scope: "ai-generation" });
    expect(v.decision).toBe("ask");
    expect(v.reason).toContain("kept");
  });

  test("渡していない範囲に事務所が出した許諾は revoked（allow にならない）", async () => {
    const { db } = await seeded({ delegated: ["campaign-print"], scope: "ai-generation" });
    const v = await check(db, { subject: SUBJECT, scope: "ai-generation" });
    expect(v.decision).toBe("revoked");
  });

  test("範囲を引き上げると、その範囲だけが通らなくなる", async () => {
    const { db } = await seeded({ delegated: ["campaign-print", "campaign-social"], scope: "campaign-print" });
    await put(db, {
      id: crypto.randomUUID(),
      subject: SUBJECT,
      scopes: ["campaign-social"],
      expiresAt: Date.now() + 3_600_000,
      custodian: AGENCY,
      delegationId: (await check(db, { subject: SUBJECT, scope: "campaign-print" })).consentId
        ? undefined
        : undefined,
    });
    await removeScope(db, SUBJECT, "campaign-print");
    expect((await check(db, { subject: SUBJECT, scope: "campaign-print" })).decision).toBe("revoked");
    // 引き上げていない範囲は影響を受けない（巻き込み防止）
    expect((await check(db, { subject: SUBJECT, scope: "campaign-social" })).decision).not.toBe("revoked");
  });

  test("委任が1件も無いのに委任の下の許諾が残っていれば revoked", async () => {
    const db = asD1(freshDb());
    await put(db, {
      id: crypto.randomUUID(),
      subject: SUBJECT,
      scopes: ["campaign-print"],
      expiresAt: Date.now() + 3_600_000,
      custodian: AGENCY,
      delegationId: "a-delegation-that-is-gone",
    });
    expect((await check(db, { subject: SUBJECT, scope: "campaign-print" })).decision).toBe("revoked");
  });
});

describe("チェーンが権限の正本", () => {
  test("役割が剥奪されていれば、台帳に許諾が残っていても revoked", async () => {
    const { db } = await seeded({ delegated: [...AGENCY_SIDE], scope: "campaign-print" });
    const v = await check(db, { subject: SUBJECT, scope: "campaign-print", chain: chainOk(false) });
    expect(v.decision).toBe("revoked");
    expect(v.reason).toContain("On chain");
  });

  test("**読めなかった時は allow に倒さない**（fail closed）", async () => {
    const { db } = await seeded({ delegated: [...AGENCY_SIDE], scope: "campaign-print" });
    const unreadable: ChainState = { configured: true, ok: false, error: "RPC down" };
    const v = await check(db, { subject: SUBJECT, scope: "campaign-print", chain: unreadable });
    expect(v.decision).toBe("ask");
    expect(v.decision).not.toBe("allow");
  });

  test("役割があれば通る（陽性対照）", async () => {
    const { db } = await seeded({ delegated: [...AGENCY_SIDE], scope: "campaign-print" });
    expect((await check(db, { subject: SUBJECT, scope: "campaign-print", chain: chainOk(true) })).decision).toBe(
      "allow",
    );
  });
});

describe("取り消しは範囲ごとに効く（2026-09-25 の回帰）", () => {
  test("ある範囲の取り消しが、別の範囲の新しい許諾を殺さない", async () => {
    const { db, delegation } = await seeded({
      delegated: [...AGENCY_SIDE],
      scope: "campaign-print",
      expiresAt: Date.now() - 1000,
    });
    // 期限切れ＋取り消し済みの1件を別の範囲に作る
    await put(db, {
      id: "revoked-one",
      subject: SUBJECT,
      scopes: ["lookbook"],
      expiresAt: Date.now() - 1000,
      revokedAt: Date.now() - 500,
      custodian: AGENCY,
      delegationId: delegation.id,
    });
    // そのあと事務所が campaign-social を新しく出す
    await put(db, {
      id: "fresh-one",
      subject: SUBJECT,
      scopes: ["campaign-social"],
      expiresAt: Date.now() + 3_600_000,
      custodian: AGENCY,
      delegationId: delegation.id,
    });
    const v = await check(db, { subject: SUBJECT, scope: "campaign-social" });
    expect(v.decision).toBe("allow");
  });
});

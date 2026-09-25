// 許諾台帳。判定は4つだけ返す＝allow / deny / ask / revoked。
// 保存は D1（Worker はリクエストごとに別インスタンスなので、メモリでは持てない）。
// ここに写真も体のデータも入れない。subject は World ID の pairwise sub＝
// 「誰か」は分からないが「前と同じ人か」は分かる（specs/sketch.md 8-9）。

export type Decision = "allow" | "deny" | "ask" | "revoked";

export type Consent = {
  id: string;
  subject: string;
  scopes: string[];
  expiresAt: number;
  revokedAt?: number;
  custodian?: string;
};

export type Verdict = {
  decision: Decision;
  /** 理由は必ず返す。画面にそのまま出す（止まる理由が見えることが賞の要件） */
  reason: string;
  consentId?: string;
  requestId?: string;
};

type Row = {
  id: string;
  subject: string;
  scopes: string;
  expires_at: number;
  revoked_at: number | null;
  custodian: string | null;
};

const toConsent = (r: Row): Consent => ({
  id: r.id,
  subject: r.subject,
  scopes: JSON.parse(r.scopes) as string[],
  expiresAt: r.expires_at,
  revokedAt: r.revoked_at ?? undefined,
  custodian: r.custodian ?? undefined,
});

export async function put(db: D1Database, c: Consent): Promise<Consent> {
  await db
    .prepare(
      "INSERT INTO consents (id, subject, scopes, expires_at, revoked_at, custodian, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(c.id, c.subject, JSON.stringify(c.scopes), c.expiresAt, c.revokedAt ?? null, c.custodian ?? null, Date.now())
    .run();
  return c;
}

export async function bySubject(db: D1Database, subject: string): Promise<Consent[]> {
  const { results } = await db
    .prepare("SELECT * FROM consents WHERE subject = ? ORDER BY created_at DESC")
    .bind(subject)
    .all<Row>();
  return results.map(toConsent);
}

export async function all(db: D1Database): Promise<Consent[]> {
  const { results } = await db.prepare("SELECT * FROM consents ORDER BY created_at DESC").all<Row>();
  return results.map(toConsent);
}

/**
 * 生成の前に呼ぶ。判定の順番に意味がある:
 * 取り消しが最優先（本人の意思は範囲や期限より上）、範囲外は聞かずに拒否、
 * 期限切れは拒否でなく「人に聞く」（切れたのは意思が変わったからではない）。
 */
export async function check(
  db: D1Database,
  input: { subject: string; scope: string; now?: number },
): Promise<Verdict> {
  const now = input.now ?? Date.now();
  const found = await bySubject(db, input.subject);

  if (found.length === 0) {
    return {
      decision: "ask",
      reason: "No consent on file for this person and scope — asking the human.",
      requestId: crypto.randomUUID(),
    };
  }

  // 範囲の中で判断する。取り消しは「その用途について」効く——別の用途の許諾まで
  // 巻き込むと、事務所が新しく出し直した許諾も死ぬ（09-25 デモ中に発見）。
  const inScope = found.filter((c) => c.scopes.includes(input.scope));
  if (inScope.length === 0) {
    const known = [...new Set(found.flatMap((c) => c.scopes))].join(", ");
    return { decision: "deny", reason: `Scope "${input.scope}" is outside the granted scopes (${known}).` };
  }

  // 生きている許諾が1つでもあれば通す。取り消しはその許諾に効くのであって、人に効くのではない。
  const live = inScope.find((c) => c.revokedAt === undefined && c.expiresAt > now);
  if (live) {
    return {
      decision: "allow",
      reason: `Consent ${live.id} covers "${input.scope}" until ${new Date(live.expiresAt).toISOString()}.`,
      consentId: live.id,
    };
  }

  // 生きているものが無い時、取り消されたものがあれば、それが答え。期限切れより強い。
  const revoked = inScope.find((c) => c.revokedAt !== undefined);
  if (revoked) {
    return {
      decision: "revoked",
      reason: `Consent ${revoked.id} was revoked by the subject at ${new Date(revoked.revokedAt as number).toISOString()}.`,
      consentId: revoked.id,
    };
  }

  // 残るのは期限切れだけ。拒否でなく「人に聞く」＝切れたのは意思が変わったからではない。
  const latest = inScope.sort((a, b) => b.expiresAt - a.expiresAt)[0] as Consent;
  return {
    decision: "ask",
    reason: `Consent ${latest.id} expired at ${new Date(latest.expiresAt).toISOString()} — asking the human to renew.`,
    consentId: latest.id,
    requestId: crypto.randomUUID(),
  };
}


export type Use = {
  id: string;
  subject: string;
  scope: string;
  decision: Decision;
  consentId?: string;
  requester?: string;
  at: number;
};

type UseRow = {
  id: string;
  subject: string;
  scope: string;
  decision: string;
  consent_id: string | null;
  requester: string | null;
  at: number;
};

/**
 * 照会を記録する。彼女の証言の核心は「使われても気づけない」だったので、
 * 判定そのものを残して本人に見せる（拒否も含めて全部。断られた事実も知る権利がある）。
 */
export async function record(
  db: D1Database,
  u: { subject: string; scope: string; verdict: Verdict; requester?: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO uses (id, subject, scope, decision, consent_id, requester, at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(
      crypto.randomUUID(),
      u.subject,
      u.scope,
      u.verdict.decision,
      u.verdict.consentId ?? null,
      u.requester ?? null,
      Date.now(),
    )
    .run();
}

export async function usesBySubject(db: D1Database, subject: string, limit = 50): Promise<Use[]> {
  const { results } = await db
    .prepare("SELECT * FROM uses WHERE subject = ? ORDER BY at DESC LIMIT ?")
    .bind(subject, limit)
    .all<UseRow>();
  return results.map((r) => ({
    id: r.id,
    subject: r.subject,
    scope: r.scope,
    decision: r.decision as Decision,
    consentId: r.consent_id ?? undefined,
    requester: r.requester ?? undefined,
    at: r.at,
  }));
}

/** 本人が取り消す。窓口を通さずに効く＝ここが設計の芯。 */
export async function revoke(db: D1Database, id: string, now = Date.now()): Promise<Consent | undefined> {
  const row = await db.prepare("SELECT * FROM consents WHERE id = ?").bind(id).first<Row>();
  if (!row) return undefined;
  if (row.revoked_at === null) {
    await db.prepare("UPDATE consents SET revoked_at = ? WHERE id = ?").bind(now, id).run();
    row.revoked_at = now;
  }
  return toConsent(row);
}

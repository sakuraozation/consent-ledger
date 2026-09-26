// 許諾台帳。判定は4つだけ返す＝allow / deny / ask / revoked。
// 保存は D1（Worker はリクエストごとに別インスタンスなので、メモリでは持てない）。
// ここに写真も体のデータも入れない。subject は World ID の pairwise sub＝
// 「誰か」は分からないが「前と同じ人か」は分かる（specs/sketch.md 8-9）。

export type Decision = "allow" | "deny" | "ask" | "revoked";

import type { ChainState } from "./chain";
import { activeFor, covers } from "./delegation";

export type Consent = {
  id: string;
  subject: string;
  scopes: string[];
  expiresAt: number;
  revokedAt?: number;
  /** 誰が取り消したか。custodian が日常・subject は本人の一手 */
  revokedBy?: "custodian" | "subject";
  custodian?: string;
  /** どの委任の下で出したか。委任が切れればこの許諾も効かない */
  delegationId?: string;
  /** 本人が World ID で直接答えた場合の pairwise sub。事務所の委任とは別系統 */
  approvedBySub?: string;
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
  revoked_by: string | null;
  custodian: string | null;
  delegation_id: string | null;
  approved_by_sub: string | null;
};

const toConsent = (r: Row): Consent => ({
  id: r.id,
  subject: r.subject,
  scopes: JSON.parse(r.scopes) as string[],
  expiresAt: r.expires_at,
  revokedAt: r.revoked_at ?? undefined,
  revokedBy: (r.revoked_by as Consent["revokedBy"]) ?? undefined,
  custodian: r.custodian ?? undefined,
  delegationId: r.delegation_id ?? undefined,
  approvedBySub: r.approved_by_sub ?? undefined,
});

export async function put(db: D1Database, c: Consent): Promise<Consent> {
  await db
    .prepare(
      "INSERT INTO consents (id, subject, scopes, expires_at, revoked_at, custodian, created_at, delegation_id, approved_by_sub) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      c.id,
      c.subject,
      JSON.stringify(c.scopes),
      c.expiresAt,
      c.revokedAt ?? null,
      c.custodian ?? null,
      Date.now(),
      c.delegationId ?? null,
      c.approvedBySub ?? null,
    )
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
  input: { subject: string; scope: string; now?: number; chain?: ChainState },
): Promise<Verdict> {
  const now = input.now ?? Date.now();
  const [found, delegation] = await Promise.all([bySubject(db, input.subject), activeFor(db, input.subject)]);
  const underDelegation = found.filter((c) => c.delegationId !== undefined);

  // 委任が無い／取り下げられている＝事務所が出した許諾は効かない。本人の最後の一手。
  if (!delegation) {
    if (underDelegation.length > 0) {
      return {
        decision: "revoked",
        reason:
          "The person withdrew the delegation to their agency, so every consent issued under it no longer applies.",
      };
    }
  } else if (!covers(delegation, input.scope)) {
    // 本人が保持している範囲＝委任の経路が存在しない。**ここは本人しか答えられない**。
    // 平坦に deny を返していたが、それでは World（いま本人に聞く）が不可欠な唯一の
    // ケースを聞かずに断ることになっていた（09-26 に本人が指摘）。
    // deny と ask の線＝deny は「事務所に聞けば答えられる」・ask は「本人しか答えられない」。
    const inScope = found.filter((c) => c.scopes.includes(input.scope));
    // 本人が自分で答えたものだけが通る。approvedBySub の有無で見分ける——これを
    // 見ずに「生きている許諾」で通していたため、剥奪後も事務所の許諾が allow に
    // なり、しかも理由が「本人が答えた」と誤って名乗っていた（09-26 に発見）。
    const own = inScope.find(
      (c) => c.approvedBySub !== undefined && c.revokedAt === undefined && c.expiresAt > now,
    );
    if (own) {
      return {
        decision: "allow",
        reason: `The person answered for "${input.scope}" themselves; it holds until ${new Date(own.expiresAt).toISOString()}.`,
        consentId: own.id,
      };
    }
    // 事務所が出したものは効かない。範囲を渡していない（または引き上げた）ので、
    // その範囲で彼らが合意したことは根拠を失っている。
    const byAgency = inScope.find((c) => c.delegationId !== undefined);
    if (byAgency) {
      return {
        decision: "revoked",
        reason: `"${input.scope}" is not the agency's to handle, so what they agreed in it (${byAgency.id}) no longer applies.`,
        consentId: byAgency.id,
      };
    }
    return {
      decision: "ask",
      reason: `The person kept "${input.scope}" for themselves — the agency holds ${delegation.scopes.join(", ") || "nothing"}, so nobody can answer this on their behalf. Asking them.`,
      requestId: crypto.randomUUID(),
    };
  }

  // 委任の権限の正本はチェーン（ENSv2 の EAC）。D1 に許諾が残っていても、
  // 事務所の役割が剥奪されていれば通さない。読めなかった時は allow に倒さず人に聞く
  // ＝RPC の不調で許諾の範囲が広がらないようにする（src/chain.ts の fail closed）。
  const chain = input.chain;
  if (chain?.configured && underDelegation.length > 0) {
    if (!chain.ok) {
      return {
        decision: "ask",
        reason: `Could not read the delegation from ENSv2 (${chain.error ?? "unknown error"}) — asking the human instead of assuming permission.`,
        requestId: crypto.randomUUID(),
      };
    }
    if (chain.granted === false) {
      return {
        decision: "revoked",
        reason: `On chain, the agency no longer holds the role that lets it write "${chain.key}" on ${chain.name} — so consents it issued no longer apply.`,
      };
    }
  }

  if (found.length === 0) {
    return {
      decision: "ask",
      reason: "Nothing is on the record for this person yet — asking them directly.",
      requestId: crypto.randomUUID(),
    };
  }

  // 範囲の中で判断する。取り消しは「その用途について」効く——別の用途の許諾まで
  // 巻き込むと、事務所が新しく出し直した許諾も死ぬ（09-25 デモ中に発見）。
  const inScope = found.filter((c) => c.scopes.includes(input.scope));
  if (inScope.length === 0) {
    // この範囲は事務所が扱う＝答えを持っているのは事務所。本人に聞くのは筋が違う。
    const known = [...new Set(found.flatMap((c) => c.scopes))].join(", ");
    return {
      decision: "deny",
      reason: `Nothing on the record covers "${input.scope}" (the agency has agreed to ${known}). They handle this scope — ask them, not the person.`,
    };
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
      reason: `Consent ${revoked.id} was revoked by the ${revoked.revokedBy ?? "custodian"} at ${new Date(revoked.revokedAt as number).toISOString()}.`,
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
export async function revoke(
  db: D1Database,
  id: string,
  by: "custodian" | "subject" = "custodian",
  now = Date.now(),
): Promise<Consent | undefined> {
  const row = await db.prepare("SELECT * FROM consents WHERE id = ?").bind(id).first<Row>();
  if (!row) return undefined;
  if (row.revoked_at === null) {
    await db.prepare("UPDATE consents SET revoked_at = ?, revoked_by = ? WHERE id = ?").bind(now, by, id).run();
    row.revoked_at = now;
    row.revoked_by = by;
  }
  return toConsent(row);
}

/** 一覧に出す1行ぶんの集計。詳細を開かずに、見るべき相手が分かるように。 */
export async function summaryFor(
  db: D1Database,
  subject: string,
  now = Date.now(),
): Promise<{ live: number; lapsed: number; ended: number; refusals: number }> {
  const [consents, uses] = await Promise.all([bySubject(db, subject), usesBySubject(db, subject, 200)]);
  return {
    live: consents.filter((c) => c.revokedAt === undefined && c.expiresAt > now).length,
    lapsed: consents.filter((c) => c.revokedAt === undefined && c.expiresAt <= now).length,
    ended: consents.filter((c) => c.revokedAt !== undefined).length,
    refusals: uses.filter((u) => u.decision !== "allow").length,
  };
}

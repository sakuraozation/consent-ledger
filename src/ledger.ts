// 許諾台帳。判定は4つだけ返す＝allow / deny / ask / revoked。
// 保存は当面メモリ（デモの寿命は36時間）。チェーンに載せるのは記録のハッシュだけで、
// ここには写真も体のデータも入れない（specs/sketch.md 8）。

export type Decision = "allow" | "deny" | "ask" | "revoked";

export type Consent = {
  id: string;
  /** 許諾した人（World ID の nullifier。人を特定しないが、同じ人かは分かる） */
  subject: string;
  /** 使ってよい用途。ここに無いものは deny */
  scopes: string[];
  /** 期限（ms）。過ぎたら ask に落ちる＝自動で拒否せず、人に聞き直す */
  expiresAt: number;
  /** 取り消された時刻。以後は何があっても revoked */
  revokedAt?: number;
  /** 誰が窓口か（事務所）。操作の導線であって権限の所有者ではない */
  custodian?: string;
};

export type Verdict = {
  decision: Decision;
  /** 理由は必ず返す。画面にそのまま出す（賞の要件＝止まる理由が見えること） */
  reason: string;
  consentId?: string;
  /** ask の時だけ。人に聞きに行くための識別子 */
  requestId?: string;
};

const consents = new Map<string, Consent>();
const store = {
  put(c: Consent) {
    consents.set(c.id, c);
    return c;
  },
  get(id: string) {
    return consents.get(id);
  },
  bySubject(subject: string) {
    return [...consents.values()].filter((c) => c.subject === subject);
  },
  all() {
    return [...consents.values()];
  },
};

export { store };

/**
 * 生成の前に呼ぶ。4状態のどれかを理由つきで返す。
 * 判定の順番に意味がある: 取り消しが最優先で、期限切れは拒否でなく「人に聞く」に落ちる。
 */
export function check(input: { subject: string; scope: string; now?: number }): Verdict {
  const now = input.now ?? Date.now();
  const found = store.bySubject(input.subject);

  if (found.length === 0) {
    return {
      decision: "ask",
      reason: "No consent on file for this person and scope — asking the human.",
      requestId: crypto.randomUUID(),
    };
  }

  // 1. 取り消しが最優先。本人の意思は期限や範囲より上に置く。
  const revoked = found.find((c) => c.revokedAt !== undefined);
  if (revoked) {
    return {
      decision: "revoked",
      reason: `Consent ${revoked.id} was revoked by the subject at ${new Date(revoked.revokedAt as number).toISOString()}.`,
      consentId: revoked.id,
    };
  }

  // 2. 用途が範囲外なら拒否。ここは人に聞かない＝そもそも許諾の外側。
  const inScope = found.filter((c) => c.scopes.includes(input.scope));
  if (inScope.length === 0) {
    const known = [...new Set(found.flatMap((c) => c.scopes))].join(", ");
    return {
      decision: "deny",
      reason: `Scope "${input.scope}" is outside the granted scopes (${known}).`,
    };
  }

  // 3. 期限切れは拒否でなく「人に聞く」。切れただけで意思が変わったとは限らない。
  const live = inScope.find((c) => c.expiresAt > now);
  if (!live) {
    const latest = inScope.sort((a, b) => b.expiresAt - a.expiresAt)[0] as Consent;
    return {
      decision: "ask",
      reason: `Consent ${latest.id} expired at ${new Date(latest.expiresAt).toISOString()} — asking the human to renew.`,
      consentId: latest.id,
      requestId: crypto.randomUUID(),
    };
  }

  return {
    decision: "allow",
    reason: `Consent ${live.id} covers "${input.scope}" until ${new Date(live.expiresAt).toISOString()}.`,
    consentId: live.id,
  };
}

export function revoke(id: string, now = Date.now()): Consent | undefined {
  const c = store.get(id);
  if (!c || c.revokedAt !== undefined) return c;
  c.revokedAt = now;
  return store.put(c);
}

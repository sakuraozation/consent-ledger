// 委任。この作品の権限モデルの中心。
//
// 前提: モデルは自分を売り込めないので事務所が居る。その関係は守るべき前提であって、
// 疑う対象ではない。守る相手は**無断で使う第三者**。したがって:
//   - 日常の操作（許諾の発行・取り消し）は事務所が持つ
//   - 本人が持つのは「委任そのものを取り下げる」一手だけ
//   - 委任が取り下げられた時点で、その下で出した許諾は全部効力を失う
//
// これは ENSv2 の権限モデルと同じ形＝親名（本人）の下に役割を委任し（Enhanced
// Access Control）、親だけが役割を剥奪できる。README の対応表を参照。

export type Delegation = {
  id: string;
  subject: string;
  custodian: string;
  /**
   * 渡した範囲だけ。モデルによって事務所に委ねる範囲は違う（広告は任せるが
   * 下着や NSFW は自分で判断する等）ので、全か無かで持たない。
   * ENSv2 側は `consent.<scope>` のテキストキーごとの役割として同じ形で存在する。
   */
  scopes: string[];
  grantedAt: number;
  grantedBySub?: string;
  withdrawnAt?: number;
};

/** その範囲は事務所に委ねられているか。 */
export const covers = (d: Delegation | undefined, scope: string): boolean =>
  d !== undefined && d.withdrawnAt === undefined && d.scopes.includes(scope);

type Row = {
  id: string;
  subject: string;
  custodian: string;
  scopes: string | null;
  granted_at: number;
  granted_by_sub: string | null;
  withdrawn_at: number | null;
};

const toDelegation = (r: Row): Delegation => ({
  id: r.id,
  subject: r.subject,
  custodian: r.custodian,
  scopes: r.scopes ? (JSON.parse(r.scopes) as string[]) : [],
  grantedAt: r.granted_at,
  grantedBySub: r.granted_by_sub ?? undefined,
  withdrawnAt: r.withdrawn_at ?? undefined,
});

export async function grant(
  db: D1Database,
  d: { subject: string; custodian: string; scopes: string[]; grantedBySub?: string },
): Promise<Delegation> {
  const row: Delegation = {
    id: crypto.randomUUID(),
    subject: d.subject,
    custodian: d.custodian,
    scopes: d.scopes,
    grantedAt: Date.now(),
    grantedBySub: d.grantedBySub,
  };
  await db
    .prepare(
      "INSERT INTO delegations (id, subject, custodian, scopes, granted_at, granted_by_sub) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(row.id, row.subject, row.custodian, JSON.stringify(row.scopes), row.grantedAt, row.grantedBySub ?? null)
    .run();
  return row;
}

/** いま生きている委任。無ければ事務所は何もできない。 */
export async function activeFor(db: D1Database, subject: string): Promise<Delegation | undefined> {
  const row = await db
    .prepare("SELECT * FROM delegations WHERE subject = ? AND withdrawn_at IS NULL ORDER BY granted_at DESC")
    .bind(subject)
    .first<Row>();
  return row ? toDelegation(row) : undefined;
}

export async function listFor(db: D1Database, subject: string): Promise<Delegation[]> {
  const { results } = await db
    .prepare("SELECT * FROM delegations WHERE subject = ? ORDER BY granted_at DESC")
    .bind(subject)
    .all<Row>();
  return results.map(toDelegation);
}

/** 本人だけが押せる一手。これ以降、その下の許諾はすべて効かない。 */
export async function withdraw(db: D1Database, id: string, now = Date.now()): Promise<Delegation | undefined> {
  const row = await db.prepare("SELECT * FROM delegations WHERE id = ?").bind(id).first<Row>();
  if (!row) return undefined;
  if (row.withdrawn_at === null) {
    await db.prepare("UPDATE delegations SET withdrawn_at = ? WHERE id = ?").bind(now, id).run();
    row.withdrawn_at = now;
  }
  return toDelegation(row);
}

/** 事務所が代理している相手の一覧。名前は持たない（台帳に名前を置かない設計）。 */
export async function roster(db: D1Database): Promise<Delegation[]> {
  const { results } = await db
    .prepare("SELECT * FROM delegations WHERE withdrawn_at IS NULL ORDER BY granted_at DESC")
    .all<Row>();
  return results.map(toDelegation);
}

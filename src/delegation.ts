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
  /**
   * 事務所が名簿で使っている呼び名。**台帳には名前を入れない**——subject は識別子
   * （実運用では World ID の pairwise sub）で、許諾・使用ログ・承認のどれにも
   * 名前は現れない。誰なのかは事務所の側の情報。
   */
  label?: string;
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
  label: string | null;
  custodian: string;
  scopes: string | null;
  granted_at: number;
  granted_by_sub: string | null;
  withdrawn_at: number | null;
};

const toDelegation = (r: Row): Delegation => ({
  id: r.id,
  subject: r.subject,
  label: r.label ?? undefined,
  custodian: r.custodian,
  scopes: r.scopes ? (JSON.parse(r.scopes) as string[]) : [],
  grantedAt: r.granted_at,
  grantedBySub: r.granted_by_sub ?? undefined,
  withdrawnAt: r.withdrawn_at ?? undefined,
});

export async function grant(
  db: D1Database,
  d: { subject: string; custodian: string; scopes: string[]; label?: string; grantedBySub?: string },
): Promise<Delegation> {
  const row: Delegation = {
    id: crypto.randomUUID(),
    subject: d.subject,
    label: d.label,
    custodian: d.custodian,
    scopes: d.scopes,
    grantedAt: Date.now(),
    grantedBySub: d.grantedBySub,
  };
  await db
    .prepare(
      "INSERT INTO delegations (id, subject, label, custodian, scopes, granted_at, granted_by_sub) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      row.id,
      row.subject,
      row.label ?? null,
      row.custodian,
      JSON.stringify(row.scopes),
      row.grantedAt,
      row.grantedBySub ?? null,
    )
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

/**
 * 範囲ひとつを事務所から引き上げる。**全か無かではない**——比例する対応は
 * 「この範囲は任せるのをやめる」であって全権の引き上げではない（09-26 に組み替え。
 * 全部やめたい時は全範囲に対して押す＝特別扱いしない）。
 *
 * 引き上げた範囲は「本人が保持している範囲」に戻る＝以後その範囲の要求は本人に
 * 聞く経路に入る。だから剥奪は「拒否」ではなく「自分で判断する」への変化になる。
 */
export async function removeScope(
  db: D1Database,
  subject: string,
  scope: string,
): Promise<Delegation | undefined> {
  const current = await activeFor(db, subject);
  if (!current) return undefined;
  const left = current.scopes.filter((s) => s !== scope);
  await db
    .prepare("UPDATE delegations SET scopes = ? WHERE id = ?")
    .bind(JSON.stringify(left), current.id)
    .run();
  return { ...current, scopes: left };
}

/** 事務所が代理している相手の一覧。名前は持たない（台帳に名前を置かない設計）。 */
export async function roster(db: D1Database): Promise<Delegation[]> {
  const { results } = await db
    .prepare("SELECT * FROM delegations WHERE withdrawn_at IS NULL ORDER BY granted_at DESC")
    .all<Row>();
  return results.map(toDelegation);
}

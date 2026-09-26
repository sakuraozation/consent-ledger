// テスト用の D1。bun:sqlite の上に、コードが使っている D1 の面だけを被せる。
// **本物のマイグレーションを当てて本物の SQL を走らせる**のが目的——スタブで
// 差し替えると、判定の順番は試せてもスキーマとの食い違いが出ない。
import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(import.meta.dir, "..", "migrations");

type Row = Record<string, unknown>;

/** D1 の prepare/bind/first/all/run だけを持つ最小の実装。 */
class Stmt {
  constructor(
    private readonly db: Database,
    private readonly sql: string,
    private readonly args: unknown[] = [],
  ) {}
  bind(...args: unknown[]) {
    return new Stmt(this.db, this.sql, args);
  }
  async first<T = Row>(): Promise<T | null> {
    return (this.db.query(this.sql).get(...(this.args as never[])) as T) ?? null;
  }
  async all<T = Row>(): Promise<{ results: T[] }> {
    return { results: this.db.query(this.sql).all(...(this.args as never[])) as T[] };
  }
  async run() {
    this.db.run(this.sql, ...(this.args as never[]));
    return { success: true };
  }
}

export type TestDb = { prepare: (sql: string) => Stmt; raw: Database };

/** マイグレーションを順に当てた空のデータベース。 */
export function freshDb(): TestDb {
  const db = new Database(":memory:");
  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    for (const stmt of sql.split(";")) {
      // コメント行を落としてから判定する。チャンクの先頭がコメントだと
      // そのチャンクごと捨ててしまい、直後の CREATE TABLE が消える。
      const t = stmt
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .trim();
      if (t) db.run(t);
    }
  }
  return { prepare: (sql: string) => new Stmt(db, sql), raw: db };
}

/** D1Database として渡すための型合わせ（テストの中だけ）。 */
export const asD1 = (db: TestDb) => db as unknown as D1Database;

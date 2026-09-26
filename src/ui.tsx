// 画面。判定はしない（src/ledger.ts の仕事）。理由の文字列はそのまま出す。
import type { FC, PropsWithChildren } from "hono/jsx";
import type { ChainState } from "./chain";
import type { Consent, Use, Verdict } from "./ledger";

const CSS = `
:root { --bg:#fff; --fg:#111; --muted:#666; --line:#e5e5e5; --card:#fafafa;
  --allow:#0a7a3f; --deny:#b00020; --ask:#8a5a00; --revoked:#5b21b6; }
@media (prefers-color-scheme: dark) { :root { --bg:#0e0e10; --fg:#f2f2f2; --muted:#9a9a9a;
  --line:#2a2a2e; --card:#17171a; --allow:#4ade80; --deny:#f87171; --ask:#fbbf24; --revoked:#c4b5fd; } }
* { box-sizing:border-box }
a.btnlink { display:inline-block; padding:.5rem .9rem; border:1px solid var(--line);
  border-radius:8px; background:var(--card); color:var(--fg); text-decoration:none; font-size:.95rem }
body { margin:0; background:var(--bg); color:var(--fg);
  font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Hiragino Kaku Gothic ProN",sans-serif }
main { max-width:44rem; margin:0 auto; padding:2.5rem 1.25rem 4rem }
h1 { font-size:1.5rem; margin:0 0 .25rem } h2 { font-size:1.05rem; margin:2rem 0 .5rem }
.sub { color:var(--muted); margin:0 0 2rem }
nav { display:flex; gap:1rem; flex-wrap:wrap; align-items:baseline; border-bottom:1px solid var(--line); padding-bottom:.75rem; margin-bottom:2rem; font-size:.9rem }
nav a { color:var(--muted); text-decoration:none } nav a[aria-current] { color:var(--fg); font-weight:600 }
.card { border:1px solid var(--line); background:var(--card); border-radius:10px; padding:1rem 1.15rem; margin:0 0 .75rem }
.row { display:flex; justify-content:space-between; align-items:baseline; gap:1rem; flex-wrap:wrap }
.meta { color:var(--muted); font-size:.85rem }
button { font:inherit; padding:.5rem 1rem; border-radius:8px; border:1px solid var(--line);
  background:var(--fg); color:var(--bg); cursor:pointer }
button.ghost { background:transparent; color:var(--fg) }
form { display:inline }
input, select { font:inherit; padding:.45rem .6rem; border-radius:8px; border:1px solid var(--line);
  background:var(--bg); color:var(--fg) }
.verdict { border-radius:10px; padding:1.1rem 1.25rem; border:1px solid currentColor; margin:1.25rem 0 }
.verdict h3 { margin:0 0 .35rem; font-size:1.25rem; letter-spacing:.02em; text-transform:uppercase }
.verdict p { margin:0; color:var(--fg) }
.allow { color:var(--allow) } .deny { color:var(--deny) } .ask { color:var(--ask) } .revoked { color:var(--revoked) }
.code { font:1.9rem/1.2 ui-monospace,monospace; letter-spacing:.12em; margin:.5rem 0 }
pre.paste { white-space:pre-wrap; background:var(--bg); border:1px dashed var(--line); border-radius:8px;
  padding:.75rem; font:.85rem/1.5 ui-monospace,monospace; color:var(--fg); margin:.35rem 0 0 }
table.log { width:100%; border-collapse:collapse; margin:.5rem 0 1.5rem; font-size:.9rem }
table.log td { padding:.35rem .5rem .35rem 0; border-bottom:1px solid var(--line); vertical-align:baseline }
table.log td:first-child { white-space:nowrap }
.dim { color:var(--muted) } .strike { text-decoration:line-through; color:var(--muted) }
/* 状態はラベルで言う（色だけに頼らない） */
.pill { font-size:.72rem; letter-spacing:.06em; text-transform:uppercase; border:1px solid currentColor;
  border-radius:999px; padding:.12rem .55rem; white-space:nowrap }
/* この画面が何を扱い、何を人に残すかの1行。事務所が最初に確かめるのがここ */
.boundary { border-left:3px solid var(--line); padding:.1rem 0 .1rem .8rem; margin:0 0 1.75rem;
  color:var(--muted); font-size:.85rem }
/* 期間を主役にする＝カードの見出しは期日、範囲はその下 */
.term { font-size:1.05rem; font-weight:600 }
.term.gone { color:var(--muted) }
/* 例外は本文から切り離す。一等地に置くと日常の操作に見える */
.exception { margin-top:3.5rem; border-top:1px solid var(--line); padding-top:1.25rem }
.exception h2 { margin-top:0 }
/* 名簿の行に頭文字。**顔写真は置かない**——同意なく画像を使われたことが題材なのに、
   こちらがストックや生成の顔を置けば同じことをすることになる（画像は保存しない設計）。 */
.who { display:flex; align-items:center; gap:.6rem }
.mono { display:grid; place-items:center; width:2.1rem; height:2.1rem; flex:0 0 auto;
  border-radius:50%; border:1px solid var(--line); background:var(--bg);
  font:600 .85rem/1 ui-sans-serif,system-ui; letter-spacing:.02em; color:var(--muted) }
`;

export const Page: FC<
  PropsWithChildren<{ title: string; here?: string; refresh?: number; who?: string }>
> = ({ title, here, refresh, who, children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>{title}</title>
      {refresh ? <meta http-equiv="refresh" content={String(refresh)} /> : null}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 自前の定数 CSS */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <main>
        <nav>
          {/* 3人の別々の画面だと一目で分かるように、それぞれ「誰の画面」と書く
              （"Three views" では設定タブに見えた・09-26） */}
          <span class="dim">Three people, three screens:</span>
          <a href="/agency" aria-current={here === "agency" ? "page" : undefined}>
            The agency's screen
          </a>
          <a href="/me" aria-current={here === "me" ? "page" : undefined}>
            {who ? `${who}'s screen` : "The model's screen"}
          </a>
          <a href="/generate" aria-current={here === "generate" ? "page" : undefined}>
            The brand's screen
          </a>
        </nav>
        {children}
      </main>
    </body>
  </html>
);

const when = (ms: number) => new Date(ms).toISOString().slice(11, 19) + "Z";

/** 期日の書き方。秒単位の期限（デモ用）と月単位の契約期間を同じ形で出さない。 */
const untilLabel = (ms: number) => {
  const d = new Date(ms);
  const secs = Math.round((ms - Date.now()) / 1000);
  if (Math.abs(secs) > 86_400) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  // 短い期間はデモ用。「あと何秒」を添えないと時刻だけでは読めない
  const rel = secs > 0 ? `in ${secs}s` : `${-secs}s ago`;
  return `${d.toISOString().slice(11, 19)}Z (${rel})`;
};

/**
 * 1件の engagement。**見出しは期間**で、範囲はその下（docs/intents.md「The term is
 * the primitive, not the button」）。操作は渡された分だけ出す＝本人の面には渡さない。
 */
export const EngagementCard: FC<{
  c: Consent;
  action?: { label: string; href: string; method?: "post" | "get"; ghost?: boolean };
}> = ({ c, action }) => {
  const stopped = c.revokedAt !== undefined;
  const lapsed = !stopped && c.expiresAt <= Date.now();
  const state = stopped ? "stopped" : lapsed ? "lapsed" : "live";
  const tone = stopped ? "revoked" : lapsed ? "ask" : "allow";
  return (
    <div class="card">
      <div class="row">
        <span class={`term${state === "live" ? "" : " gone"}`}>
          {stopped
            ? `Ended ${untilLabel(c.revokedAt as number)}`
            : lapsed
              ? `Lapsed ${untilLabel(c.expiresAt)}`
              : `Until ${untilLabel(c.expiresAt)}`}
        </span>
        <span class={`pill ${tone}`}>{state}</span>
      </div>
      <div class="meta">
        {c.scopes.join(", ")}
        {c.custodian ? ` · agreed by ${c.custodian}` : ""}
      </div>
      <div class="meta dim">
        {stopped
          ? `ended early by the ${c.revokedBy === "subject" ? "person" : "agency"} — no longer usable by anyone`
          : lapsed
            ? "the term ran out; nobody ended it. The next request asks again"
            : "inside the term — requests in this scope are answered yes"}
      </div>
      {action ? (
        <p style="margin:.75rem 0 0">
          {action.method === "post" ? (
            <form method="post" action={action.href}>
              <button type="submit" class={action.ghost ? "ghost" : undefined}>
                {action.label}
              </button>
            </form>
          ) : (
            <a href={action.href} class="btnlink">
              {action.label}
            </a>
          )}
        </p>
      ) : null}
      <div class="meta dim" style="margin-top:.5rem">
        id {c.id.slice(0, 8)}
      </div>
    </div>
  );
};

/** ページが何を扱い、何を人に残すかの1行。 */
export const Boundary: FC<{ holds: string; stays: string }> = ({ holds, stays }) => (
  <p class="boundary">
    {holds}
    <br />
    {stays}
  </p>
);

const OUTCOMES = new Set(["approved", "declined", "unanswered"]);

/**
 * 使用ログ。**ask のあと何が起きたかを同じ行に畳む**——別の行として並べると、
 * 承認されたあとも ask の行が ask のまま残り、状態が古く見える（09-26 に指摘）。
 * 行を書き換えるのではなく紐づけて畳むのは、聞かれた事実そのものを残すため。
 */
export const UseLog: FC<{ uses: Use[] }> = ({ uses }) => {
  if (uses.length === 0) return <p class="dim">Nobody has asked for this yet.</p>;

  // requestId で結末を引けるようにしてから、判定の行だけを並べる
  const settled = new Map<string, Use>();
  for (const u of uses) {
    if (OUTCOMES.has(u.decision) && u.requestId) settled.set(u.requestId, u);
  }
  const requests = uses.filter((u) => !OUTCOMES.has(u.decision));
  // 紐づかない結末（requestId を持たない古い行）は、そのまま1行として残す
  const orphans = uses.filter((u) => OUTCOMES.has(u.decision) && (!u.requestId || !requests.some((r) => r.requestId === u.requestId)));
  const rows = [...requests, ...orphans].sort((a, b) => b.at - a.at);

  const wentThrough = rows.filter((u) => {
    const end = u.requestId ? settled.get(u.requestId) : undefined;
    return u.decision === "allow" || u.decision === "approved" || end?.decision === "approved";
  }).length;

  return (
    <>
      <p class="meta">
        {rows.length} request{rows.length === 1 ? "" : "s"} · {wentThrough} went through ·{" "}
        {rows.length - wentThrough} did not
      </p>
      <table class="log">
        <tbody>
          {rows.map((u) => {
            const end = u.requestId ? settled.get(u.requestId) : undefined;
            return (
              <tr>
                <td class="meta">{new Date(u.at).toISOString().slice(11, 19)}Z</td>
                <td>
                  <span class={u.decision}>{u.decision}</span>
                  {end ? (
                    <>
                      {" → "}
                      <span class={end.decision === "approved" ? "allow" : "revoked"}>{end.decision}</span>
                    </>
                  ) : null}
                </td>
                <td>{u.scope}</td>
                <td class="meta dim">
                  {end
                    ? end.decision === "approved"
                      ? "they said yes"
                      : end.decision === "declined"
                        ? "they said no"
                        : "nobody answered in time"
                    : (u.requester ?? "unknown").slice(0, 28)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export const VerdictBox: FC<{ v: Verdict }> = ({ v }) => (
  <div class={`verdict ${v.decision}`}>
    <h3>{v.decision}</h3>
    <p>{v.reason}</p>
  </div>
);

/**
 * 委任の権限をチェーン（ENSv2）から読んだ状態。読めなかった時も隠さずに出す
 * ＝止まっている理由が画面から分かることを優先する。
 */
export const ChainPanel: FC<{ s: ChainState }> = ({ s }) => {
  if (!s.configured) return null;
  const label = !s.ok ? "unreadable" : s.granted ? "delegated" : "not delegated";
  return (
    <div class="card">
      <div class="row">
        <strong>
          {s.name} <span class="dim">/ {s.key}</span>
        </strong>
        <span class={`pill ${s.ok ? (s.granted ? "allow" : "revoked") : "ask"}`}>{label}</span>
      </div>
      <div class="meta">
        {s.ok ? (
          <>
            {s.granted
              ? "On ENSv2 (Sepolia), the agency holds the role that lets it write this one record — and nothing else on the name."
              : "On ENSv2 (Sepolia), the agency holds no role here, so anything it issued does not apply."}
            {s.record ? (
              <>
                {" "}
                Record on chain: <code>{s.record}</code>
              </>
            ) : (
              " No record written yet."
            )}
          </>
        ) : (
          <>
            Could not read the chain, so permission is not assumed — requests fall back to asking the human.{" "}
            <code>{s.error}</code>
          </>
        )}
      </div>
      <div class="meta dim">
        resolver <code>{s.resolver}</code>
      </div>
    </div>
  );
};

/**
 * 何を委ね、何を渡していないかの一覧。**これが委任の本体**——モデルによって
 * 事務所に渡す範囲は違うので、全か無かでは表現できない（docs/intents.md）。
 * withheld は「まだ押していない」ではなく「渡していない」と読めるように書く。
 */
export const ScopeGrid: FC<{
  all: readonly string[];
  delegated: string[];
  chainOk?: boolean;
  onChain?: Record<string, boolean>;
  audience: "agency" | "model";
  /** 各範囲が何を指すか。用語だけでは読めないので必ず添える */
  notes?: Record<string, string>;
  /** 従来の仕事の側（残りは生成 AI 以降のもの）。見出しで区切る */
  conventional?: readonly string[];
}> = ({ all, delegated, chainOk, onChain, audience, notes, conventional }) => (
  <div class="card">
    <table class="log">
      {all.map((sc, i) => {
        const yes = delegated.includes(sc);
        const chain = onChain?.[sc];
        const firstNew = conventional !== undefined && i > 0 && conventional.includes(all[i - 1] as string) && !conventional.includes(sc);
        return (
          <>
            {firstNew ? (
              <tr>
                <td colspan={3} class="meta dim" style="padding-top:.75rem">
                  — anything generated from their body data, which is not part of a shoot —
                </td>
              </tr>
            ) : null}
          <tr>
            <td>
              <strong>{sc}</strong>
              {notes?.[sc] ? <div class="meta dim">{notes[sc]}</div> : null}
            </td>
            <td>
              <span class={`pill ${yes ? "allow" : "deny"}`}>{yes ? "delegated" : "withheld"}</span>
            </td>

            <td class="meta dim">
              {chainOk === false ? "chain unreadable" : chain === undefined ? "" : chain ? "role on chain" : "no role"}
            </td>
          </tr>
          </>
        );
      })}
    </table>
    <div class="meta dim">
      {audience === "agency"
        ? "delegated = yours to put engagements on the record for · withheld = the person kept it, and a request for it goes to them"
        : "delegated = your agency handles it · withheld = you kept it, and nobody can agree to it on your behalf"}
    </div>
  </div>
);

/** 名簿の頭文字。顔は使わない（本文の CSS コメント参照）。 */
export const Monogram: FC<{ name: string }> = ({ name }) => (
  <span class="mono" aria-hidden="true">
    {name.slice(0, 2)}
  </span>
);

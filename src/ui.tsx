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
body { margin:0; background:var(--bg); color:var(--fg);
  font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Hiragino Kaku Gothic ProN",sans-serif }
main { max-width:44rem; margin:0 auto; padding:2.5rem 1.25rem 4rem }
h1 { font-size:1.5rem; margin:0 0 .25rem } h2 { font-size:1.05rem; margin:2rem 0 .5rem }
.sub { color:var(--muted); margin:0 0 2rem }
nav { display:flex; gap:1rem; border-bottom:1px solid var(--line); padding-bottom:.75rem; margin-bottom:2rem; font-size:.9rem }
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
`;

export const Page: FC<PropsWithChildren<{ title: string; here?: string; refresh?: number }>> = ({
  title,
  here,
  refresh,
  children,
}) => (
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
          <a href="/agency" aria-current={here === "agency" ? "page" : undefined}>
            Agency
          </a>
          <a href="/me" aria-current={here === "me" ? "page" : undefined}>
            The person
          </a>
          <a href="/generate" aria-current={here === "generate" ? "page" : undefined}>
            Generating side
          </a>
        </nav>
        {children}
      </main>
    </body>
  </html>
);

const when = (ms: number) => new Date(ms).toISOString().slice(11, 19) + "Z";

export const ConsentCard: FC<{ c: Consent; revocable?: boolean; revokeAction?: string }> = ({
  c,
  revocable,
  revokeAction,
}) => {
  const revoked = c.revokedAt !== undefined;
  const expired = !revoked && c.expiresAt <= Date.now();
  return (
    <div class="card">
      <div class="row">
        <strong class={revoked ? "strike" : undefined}>{c.scopes.join(", ")}</strong>
        {revocable && !revoked ? (
          <form method="post" action={revokeAction ?? `/me/${c.id}/revoke`}>
            <button type="submit">Revoke</button>
          </form>
        ) : null}
      </div>
      <div class="meta">
        {revoked
          ? `revoked by the ${c.revokedBy ?? "custodian"} at ${when(c.revokedAt as number)} — no longer usable by anyone`
          : expired
            ? `expired at ${when(c.expiresAt)} — the next request will ask you again`
            : `valid until ${when(c.expiresAt)}`}
      </div>
      <div class="meta dim">
        subject {c.subject.slice(0, 12)}… · id {c.id.slice(0, 8)}
      </div>
    </div>
  );
};

export const UseLog: FC<{ uses: Use[] }> = ({ uses }) => {
  if (uses.length === 0) return <p class="dim">Nobody has asked for this yet.</p>;
  const allowed = uses.filter((u) => u.decision === "allow").length;
  const refused = uses.length - allowed;
  return (
    <>
      <p class="meta">
        {uses.length} request{uses.length === 1 ? "" : "s"} · {allowed} went through · {refused} did not
      </p>
      <table class="log">
        <tbody>
          {uses.map((u) => (
            <tr>
              <td class="meta">{new Date(u.at).toISOString().slice(11, 19)}Z</td>
              <td>
                <span class={u.decision}>{u.decision}</span>
              </td>
              <td>{u.scope}</td>
              <td class="meta dim">{(u.requester ?? "unknown").slice(0, 28)}</td>
            </tr>
          ))}
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

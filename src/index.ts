// 入口。判定は src/ledger.ts、画面は src/screens.tsx。
//
// x402（HTTP 402 でエージェントに払わせる配線）は 09-26 に取り除いた。動くことは
// 確認したうえでの削除＝README に「支払いは接続していない」と書いてあるのに 402 を
// 返す口が生きている状態は、言っていないものが動いていることになる。受取先を
// リクエストごとに変えられず、本人に直接払うには鍵を持たせる必要があり、それは
// この設計が意図的に避けた判断と衝突する（理由は README・実測は FEEDBACK.md）。
import { Hono } from "hono";
import { api } from "./api";
import { screens } from "./screens";

const app = new Hono<{ Bindings: Env }>();

app.get("/api", (c) =>
  c.text(
    [
      "consent-ledger — API",
      "POST /check                  -> allow | deny | ask | revoked (with a reason)",
      "POST /approvals              -> ask the person (World ID for Agents, device flow)",
      "GET  /approvals/:requestId   -> waiting | approved | denied | expired",
      "GET  /chain                  -> the delegation as it stands on ENSv2",
      "",
      "Screens: /agency  /me  /generate",
    ].join("\n"),
  ),
);

app.get("/health", (c) => c.json({ ok: true }));

// 想定外の例外は Workers の素の 500 になり、何が落ちたか残らない。呼ぶ側には
// 機械が読める形で返し、内容はログへ（judge がデモ中の失敗を追えるように）。
app.onError((err, c) => {
  console.error("[error]", c.req.method, c.req.path, err instanceof Error ? err.stack : String(err));
  const wantsJson = c.req.path.startsWith("/api") || c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
  return c.html(
    `<!doctype html><meta charset="utf-8"><title>Something broke</title>
<body style="font:16px/1.6 system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem">
<h1>Something broke, and nothing was generated</h1>
<p>That is the intended direction of failure: when this service cannot answer, the action does not happen.</p>
<pre style="white-space:pre-wrap;background:#f4f4f5;padding:1rem;border-radius:8px">${
      err instanceof Error ? err.message : String(err)
    }</pre>
<p><a href="/generate">Back</a></p>`,
    500,
  );
});

app.notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404));

app.route("/", api);
app.route("/", screens);

export default app;

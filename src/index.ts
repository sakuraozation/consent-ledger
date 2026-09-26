import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { Hono } from "hono";
import { api } from "./api";
import { screens } from "./screens";
import { worldId } from "./worldid";

// Workers では module スコープで env を読めないので、最初のリクエストで組み立てて使い回す。
type PaidMiddleware = ReturnType<typeof paymentMiddleware>;
let paid: PaidMiddleware | undefined;

function buildPaid(env: Env): PaidMiddleware {
  const network = env.NETWORK;
  const server = new x402ResourceServer(
    new HTTPFacilitatorClient({ url: env.FACILITATOR_URL }),
  ).register(network, new ExactEvmScheme());
  return paymentMiddleware(
    {
      "GET /paid": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network,
          payTo: env.PAY_TO,
        },
        description: "hello, paid by an agent",
        mimeType: "application/json",
      },
    },
    server,
  );
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api", (c) =>
  c.text(
    [
      "consent-ledger — API",
      "POST /check                  -> allow | deny | ask | revoked (with a reason)",
      "POST /consents               -> put a consent on the record",
      "POST /consents/:id/revoke    -> the person takes it back",
      "POST /approvals              -> ask a human (World ID for Agents, device flow)",
      "GET  /approvals/:requestId   -> waiting | approved | denied | expired",
      "",
      "Screens: /generate  /me  /agency",
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

app.use("/paid", async (c, next) => {
  paid ??= buildPaid(c.env);
  return paid(c, next);
});

app.get("/paid", (c) => c.json({ hello: "paid", at: new Date().toISOString() }));

app.route("/", worldId);
app.route("/", api);
app.route("/", screens);

export default app;

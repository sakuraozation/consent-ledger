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

app.use("/paid", async (c, next) => {
  paid ??= buildPaid(c.env);
  return paid(c, next);
});

app.get("/paid", (c) => c.json({ hello: "paid", at: new Date().toISOString() }));

app.route("/", worldId);
app.route("/", api);
app.route("/", screens);

export default app;

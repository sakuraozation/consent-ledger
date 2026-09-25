import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { Hono } from "hono";
import { api } from "./api";
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

app.get("/", (c) =>
  c.text(
    [
      "hack-kit",
      "GET /health  -> ok",
      "GET /paid    -> 402 until paid (x402, $0.001 USDC on Base Sepolia)",
      "GET /worldid -> World ID hello world (server-side verify, failure paths)",
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

export default app;

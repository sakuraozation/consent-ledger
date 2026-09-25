// 手書き。wrangler.toml の [vars] と .dev.vars に合わせる。
interface Env {
  PAY_TO: string;
  FACILITATOR_URL: string;
  NETWORK: `${string}:${string}`; // CAIP-2（例 eip155:84532）
  // World ID（IDKit・Developer Portal）
  WORLD_APP_ID?: string;
  WORLD_ACTION?: string;
  // World ID for Agents（Human Continuity IdP・標準 OIDC）
  WORLD_OIDC_CLIENT_ID?: string;
  WORLD_OIDC_CLIENT_SECRET?: string;
}

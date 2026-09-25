// 捨てる前提の雛形なので `wrangler types`（1.4万行）は使わず手書き。wrangler.toml の [vars] と揃える。
interface Env {
  PAY_TO: string;
  FACILITATOR_URL: string;
  NETWORK: `${string}:${string}`; // CAIP-2（例 eip155:84532）
  // World ID（Developer Portal で作る staging アプリ）。未設定なら /worldid は案内だけ出す。
  WORLD_APP_ID?: string;
  WORLD_ACTION?: string;
}

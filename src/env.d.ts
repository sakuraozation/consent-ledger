// バインディングとランタイムの型は worker-configuration.d.ts（`bunx wrangler types` 生成）が正本。
// secret は wrangler.toml に現れないので、ここで足す。
declare global {
  interface Env {
    /** World ID for Agents の OIDC クライアント（secret put で設定） */
    WORLD_OIDC_CLIENT_ID?: string;
    WORLD_OIDC_CLIENT_SECRET?: string;
    /** World ID（IDKit・Developer Portal） */
    WORLD_APP_ID?: string;
    WORLD_ACTION?: string;
  }
}
export {};

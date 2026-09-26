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
    WORLD_WITHDRAW_ACTION?: string;
    /** ENSv2（Sepolia）。委任の権限はここが正本＝src/chain.ts */
    ENS_NAME?: string;
    ENS_RESOLVER?: string;
    ENS_CONSENT_KEY?: string;
    /** 既定の公開 RPC を使わない場合だけ設定する */
    SEPOLIA_RPC_URL?: string;
    ENS_CUSTODIAN?: string;
    /** チェーン上の名前を持っている subject。他は app レイヤのみ */
    ENS_SUBJECT?: string;
    DEMO_SUBJECT?: string;
  }
}
export {};

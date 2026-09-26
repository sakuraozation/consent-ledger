// 設定を1箇所に置く。Worker とスクリプトの両方から読む＝同じ値を2箇所に書かない。
// チェーン上のアドレスと名前は wrangler.toml の [vars] が正本で、ここは既定値と
// スクリプト用の出口。値を変える時は wrangler.toml → ここ の順で見る。

/** ENSv2（Sepolia beta）。登録＝scripts/ens-register.ts / 委任＝scripts/ens-delegate.ts */
export const ENS = {
  name: "consentledger.eth",
  /** VerifiableFactory 経由でデプロイした PermissionedResolver */
  resolver: "0x8591D727D6a7317f843de72Bd2D31AB31A2841C9",
  /** テキストキーの接頭辞。範囲ごとに `consent.<scope>` になる */
  keyPrefix: "consent",
  /** チェーン上の名前を持っているのはこの1人。他は app レイヤのみ */
  subject: "4KQXW7ZP2NTLD6YHS3MRVA9JBC5EGU8F",
} as const;

/**
 * 扱う範囲。**軸は「成果物の種類」ではなく「使い方」**——広告もルックブックも事務所が
 * 当然やる仕事なので、成果物で切ると「本人が保持する範囲」が不自然になる。線は1本で、
 * 撮影の成果物の掲載は事務所、**体のデータを生成 AI に使うことは本人**。後者は事務所が
 * まだコントロールしていない領域で、連絡も支払いも直接本人に来るべきもの。
 */
export const SCOPES = [
  "campaign-print",
  "campaign-social",
  "lookbook",
  "ai-generation",
  "ai-training",
  "digital-double",
] as const;

export type Scope = (typeof SCOPES)[number];

/** 従来の仕事の側（残りは生成 AI 以降のもの）。画面の並びと区切りがこれで決まる。 */
export const AGENCY_SIDE: readonly string[] = ["campaign-print", "campaign-social", "lookbook"];

/** 範囲名だけでは読めないので必ず添える1行。 */
export const SCOPE_NOTE: Record<string, string> = {
  "campaign-print": "the shoot's images, in print and out-of-home",
  "campaign-social": "the shoot's images, on the brand's channels",
  lookbook: "the shoot's images, in trade and wholesale material",
  "ai-generation": "new images generated from their body data — not from the shoot",
  "ai-training": "their body data used to train a model",
  "digital-double": "a persistent likeness that can be posed and reused without them",
};

/** 期間。契約の期間は月単位で、90秒は満了を画面で見せるためのデモ用。 */
export const TERMS = {
  /** 年内まで（契約期間として読める長さ） */
  endOfYear: () => Date.UTC(2026, 11, 31, 23, 59, 59),
  quarter: () => Date.now() + 90 * 86_400_000,
  /** 満了を見せる用 */
  demoSeconds: 90,
} as const;

/** 本人が自分で答えた時に作る許諾の長さ。デモが回る程度に短く保つ。 */
export const SELF_ANSWERED_MS = 60_000;

/** 承認を待つ上限。これを過ぎたら何も生成されない。 */
export const APPROVAL_WINDOW_MS = 120_000;

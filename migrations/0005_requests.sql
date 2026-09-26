-- 本人からの「条件を変えたい」。交渉そのものは製品に入れない＝会話は持たず、
-- 事務所の画面に1行立てて電話に戻す（docs/intents.md「Negotiation stays outside」）。
CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  consent_id TEXT,
  at INTEGER NOT NULL,
  handled_at INTEGER
);

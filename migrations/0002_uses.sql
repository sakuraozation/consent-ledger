-- 照会の記録。彼女の証言の核心は「使われても気づけない」だったので、
-- 判定を1件ずつ残して本人に見せる。requester は呼んだ側の名乗り（自己申告）。
CREATE TABLE IF NOT EXISTS uses (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  scope TEXT NOT NULL,
  decision TEXT NOT NULL,      -- allow / deny / ask / revoked
  consent_id TEXT,
  requester TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_uses_subject ON uses (subject, at DESC);
CREATE INDEX IF NOT EXISTS idx_uses_consent ON uses (consent_id);

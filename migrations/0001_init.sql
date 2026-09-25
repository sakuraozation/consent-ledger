-- 許諾。ここに写真も体のデータも入れない（subject は World ID の pairwise sub）。
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  scopes TEXT NOT NULL,          -- JSON 配列
  expires_at INTEGER NOT NULL,   -- ms
  revoked_at INTEGER,            -- 取り消した時刻。NULL なら有効
  custodian TEXT,                -- 窓口（事務所）。権限の所有者ではない
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consents_subject ON consents (subject);

-- 人に聞いている途中の状態。待ち時間も記録に残す。
CREATE TABLE IF NOT EXISTS approvals (
  state TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  scope TEXT NOT NULL,
  verifier TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  result TEXT,                   -- approved / denied / expired。NULL なら waiting
  sub TEXT                       -- 承認した人の pairwise sub
);
CREATE INDEX IF NOT EXISTS idx_approvals_request ON approvals (request_id);

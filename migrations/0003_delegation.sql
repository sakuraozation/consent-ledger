-- 委任。モデルは自分を売り込めないから事務所が居る——その関係が前提であって、
-- 守る対象は「無断で使う第三者」。だから日常の操作は事務所が持ち、
-- 本人が持つのは「委任そのものを取り下げる」最後の一手だけ。
CREATE TABLE IF NOT EXISTS delegations (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,        -- 本人（World ID の pairwise sub）
  custodian TEXT NOT NULL,      -- 事務所
  granted_at INTEGER NOT NULL,
  -- 委任を承認した World ID の sub。誰が委ねたのかの証跡
  granted_by_sub TEXT,
  withdrawn_at INTEGER          -- 本人が取り下げた時刻
);
CREATE INDEX IF NOT EXISTS idx_delegations_subject ON delegations (subject);

-- 許諾は委任の下で発行される。委任が切れれば、その下の許諾も効かない。
ALTER TABLE consents ADD COLUMN delegation_id TEXT;
-- 誰が取り消したか（custodian / subject）。代理が普通で、本人も常に可能。
ALTER TABLE consents ADD COLUMN revoked_by TEXT;

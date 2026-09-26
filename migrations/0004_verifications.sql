-- 「権限を取り戻す」操作の前に通した World ID の検証を残す。
-- nullifier は人を特定しないが「前と同じ人か」は分かる＝本人の一手であった証拠。
CREATE TABLE IF NOT EXISTS verifications (
  nullifier TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  level TEXT NOT NULL,
  at INTEGER NOT NULL
);
ALTER TABLE delegations ADD COLUMN withdrawn_by_nullifier TEXT;

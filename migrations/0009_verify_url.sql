-- IdP が返す verification_uri_complete（コード入りの直リンク）を保存する。
-- 持っていないとコードを手で打つしかなく、画面から1タップで開けない。
ALTER TABLE approvals ADD COLUMN verify_url TEXT;

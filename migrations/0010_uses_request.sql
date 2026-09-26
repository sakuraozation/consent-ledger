-- ask の行と、そのあとの結末（approved / declined / unanswered）を紐づける。
-- 持っていないと、承認されたあとも ask の行が ask のまま並び、状態が古く見える。
-- 行を書き換えるのではなく紐づけるのは、**聞かれた事実そのものを残す**ため。
ALTER TABLE uses ADD COLUMN request_id TEXT;
CREATE INDEX IF NOT EXISTS idx_uses_request ON uses (request_id);

-- 本人が World ID で直接答えた許諾。事務所の委任の下ではない（delegation_id は空）ので、
-- 「誰の判断でここに在るのか」を残す。画面でも事務所が載せたものと区別して出す。
ALTER TABLE consents ADD COLUMN approved_by_sub TEXT;

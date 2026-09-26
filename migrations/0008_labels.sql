-- 事務所が自分の名簿で使っている呼び名。台帳の subject は識別子のままで、
-- 許諾・使用ログ・承認のどれにも名前は入らない（名前は事務所側の情報）。
ALTER TABLE delegations ADD COLUMN label TEXT;

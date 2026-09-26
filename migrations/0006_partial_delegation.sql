-- 委任は範囲ごとに掛かる。モデルによって事務所に渡す範囲が違うのが実態で、
-- 全か無かで持つと「NSFW は絶対に渡していない」が表現できない。
-- ENSv2 側は最初からキー単位（authorizeTextRoles）なので、こちらを合わせる。
ALTER TABLE delegations ADD COLUMN scopes TEXT;
UPDATE delegations SET scopes = '["ad-image","social-post","lookbook"]' WHERE scopes IS NULL;

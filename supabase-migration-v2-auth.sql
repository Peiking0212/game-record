-- ========================================
-- 游戏记录 - 多人账号迁移 v2
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 前置：已执行 supabase-migration.sql
-- 可重复执行
-- ========================================

-- 1. site_data 先加 user_id（v1 表无此列，不可在 ADD 前引用 user_id）
ALTER TABLE site_data ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. 清理旧版「全站共享」数据（无 user_id 的行）
DELETE FROM site_data WHERE user_id IS NULL;
DELETE FROM media WHERE user_id IS NULL;

-- 3. site_data：改为按用户隔离

ALTER TABLE site_data DROP CONSTRAINT IF EXISTS site_data_pkey;
ALTER TABLE site_data ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE site_data ADD PRIMARY KEY (user_id, key);

DROP POLICY IF EXISTS "站点数据可读写" ON site_data;
DROP POLICY IF EXISTS "用户读写自己的站点数据" ON site_data;
CREATE POLICY "用户读写自己的站点数据" ON site_data
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. media：按用户 RLS
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "匿名用户可读写" ON media;
DROP POLICY IF EXISTS "用户读写自己的媒体" ON media;
CREATE POLICY "用户读写自己的媒体" ON media
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Storage：路径规范 {user_id}/...
-- 删除旧的全局策略
DROP POLICY IF EXISTS "匿名用户可上传" ON storage.objects;
DROP POLICY IF EXISTS "匿名用户可读取" ON storage.objects;
DROP POLICY IF EXISTS "匿名用户可删除" ON storage.objects;
DROP POLICY IF EXISTS "匿名用户可更新" ON storage.objects;

DROP POLICY IF EXISTS "用户上传自己的文件" ON storage.objects;
DROP POLICY IF EXISTS "用户读取自己的文件" ON storage.objects;
DROP POLICY IF EXISTS "用户删除自己的文件" ON storage.objects;
DROP POLICY IF EXISTS "用户更新自己的文件" ON storage.objects;

CREATE POLICY "用户上传自己的文件" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "用户读取自己的文件" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "用户删除自己的文件" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "用户更新自己的文件" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

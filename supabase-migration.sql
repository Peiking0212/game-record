-- ========================================
-- 游戏记录 - Supabase 数据库初始化
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ========================================

-- 0. 站点 JSON 数据（游戏、成就、简介等，所有人共享）
CREATE TABLE IF NOT EXISTS site_data (
    key         TEXT PRIMARY KEY,
    data        JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "站点数据可读写" ON site_data
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 1. 创建媒体表
CREATE TABLE IF NOT EXISTS media (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL CHECK (type IN ('image', 'video')),
    url         TEXT NOT NULL,
    thumbnail   TEXT,
    name        TEXT NOT NULL,
    game_name   TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    user_id     UUID REFERENCES auth.users(id) NULL
);

-- 2. 启用 Row Level Security（建议）
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- 3. 匿名用户可读写（单用户场景）
CREATE POLICY "匿名用户可读写" ON media
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. 创建存储桶（图片）
-- 注：需在 Supabase Dashboard → Storage 中手动创建名为 "media" 的公开桶
-- 或者在 SQL Editor 执行以下 INSERT：

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 52428800, '{image/*,video/*}')
ON CONFLICT (id) DO NOTHING;

-- 5. 存储桶访问策略
CREATE POLICY "匿名用户可上传" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'media');

CREATE POLICY "匿名用户可读取" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'media');

CREATE POLICY "匿名用户可删除" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'media');

CREATE POLICY "匿名用户可更新" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'media')
    WITH CHECK (bucket_id = 'media');

-- ==================== 澳洁618抽奖系统 - Supabase 数据库初始化 ====================
-- 在 Supabase SQL Editor 中运行此脚本

-- 创建抽奖记录表
CREATE TABLE IF NOT EXISTS lottery_records (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL,
    prize_level INTEGER NOT NULL,
    prize_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_phone ON lottery_records(phone);
CREATE INDEX IF NOT EXISTS idx_created_at ON lottery_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prize_level ON lottery_records(prize_level);

-- 启用行级安全（可选）
ALTER TABLE lottery_records ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户读取和写入
CREATE POLICY "Allow anonymous insert" ON lottery_records
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous select" ON lottery_records
    FOR SELECT TO anon
    USING (true);

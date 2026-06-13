-- 给手机号加唯一约束，防止重复抽奖
ALTER TABLE lottery_records ADD CONSTRAINT unique_phone UNIQUE (phone);

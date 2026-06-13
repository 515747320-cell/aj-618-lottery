const express = require('express');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aojie618admin';

// ==================== Supabase 连接 ====================
const supabaseUrl = process.env.SUPABASE_URL || 'https://szudhoecxrdmyejsuvno.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bLecDFzaf2zLRxoCbO1nxA_nHiAvs6-';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== 奖品配置 ====================
const PRIZES = {
    1: { name: '一等奖 - 免费洗衣卡（价值200元）', level: 1, weight: 10 },
    2: { name: '二等奖 - 10元洗衣优惠券', level: 2, weight: 10 },
    3: { name: '三等奖 - 5元洗衣优惠券', level: 3, weight: 80 }
};
const TOTAL_WEIGHT = Object.values(PRIZES).reduce((sum, p) => sum + p.weight, 0);

// ==================== 抽奖算法 ====================
function drawPrize() {
    const random = Math.random() * TOTAL_WEIGHT;
    let cumulative = 0;
    for (const prize of Object.values(PRIZES)) {
        cumulative += prize.weight;
        if (random < cumulative) return prize;
    }
    return PRIZES[3];
}

// ==================== 中间件 ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'aojie-618-lottery-secret-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           'unknown';
}

// ==================== API 路由 ====================

// 抽奖接口
app.post('/api/draw', async (req, res) => {
    try {
        const { name = '', phone = '' } = req.body;
        
        // 每个手机号只能抽一次
        if (phone) {
            const { data: existing } = await supabase
                .from('lottery_records')
                .select('id')
                .eq('phone', phone)
                .limit(1);
            
            if (existing && existing.length > 0) {
                return res.json({
                    success: false,
                    message: '该手机号已参与过抽奖，每人仅限一次'
                });
            }
        }
        
        const ip = getClientIP(req);
        const userId = req.session.userId || uuidv4();
        req.session.userId = userId;
        
        const prize = drawPrize();
        
        const { data, error } = await supabase
            .from('lottery_records')
            .insert({
                user_id: userId,
                name: name,
                phone: phone,
                ip_address: ip,
                prize_level: prize.level,
                prize_name: prize.name
            })
            .select('id')
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            recordId: data.id,
            prize: { level: prize.level, name: prize.name },
            message: `恭喜 ${name} 获得${prize.name}！`
        });
    } catch (error) {
        console.error('抽奖错误:', error);
        res.status(500).json({ success: false, message: '抽奖失败，请重试' });
    }
});

// 统计数据接口（公开）
app.get('/api/stats', async (req, res) => {
    try {
        const { count: total } = await supabase
            .from('lottery_records')
            .select('*', { count: 'exact', head: true });
        
        const { data: byLevel } = await supabase
            .from('lottery_records')
            .select('prize_level, count')
            .select('count')
            // Use raw query for group by
            .then(async () => {
                const { data } = await supabase
                    .rpc('get_prize_stats');
                return { data };
            });
        
        // Fallback: query all and count in JS
        const { data: all } = await supabase
            .from('lottery_records')
            .select('prize_level');
        
        const levelCounts = { 1: 0, 2: 0, 3: 0 };
        if (all) {
            all.forEach(r => { levelCounts[r.prize_level]++; });
        }
        
        const stats = {
            totalDraws: total || 0,
            byLevel: {}
        };
        
        for (let level of [1, 2, 3]) {
            stats.byLevel[level] = {
                count: levelCounts[level],
                percentage: total > 0 ? ((levelCounts[level] / total) * 100).toFixed(2) : 0,
                name: PRIZES[level].name
            };
        }
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('统计错误:', error);
        res.status(500).json({ success: false, message: '获取统计失败' });
    }
});

// 抽奖记录列表接口（公开，仅限自己）
app.get('/api/records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const { count: total } = await supabase
            .from('lottery_records')
            .select('*', { count: 'exact', head: true });
        
        const { data: records, error } = await supabase
            .from('lottery_records')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        res.json({
            success: true,
            data: {
                records: records || [],
                pagination: {
                    page, limit,
                    total: total || 0,
                    totalPages: Math.ceil((total || 0) / limit)
                }
            }
        });
    } catch (error) {
        console.error('查询记录错误:', error);
        res.status(500).json({ success: false, message: '获取记录失败' });
    }
});

// ==================== 管理后台 ====================
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true, message: '登录成功' });
    } else {
        res.status(401).json({ success: false, message: '密码错误' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true, message: '已退出' });
});

function requireAdmin(req, res, next) {
    if (req.session.isAdmin) next();
    else res.status(401).json({ success: false, message: '未授权访问' });
}

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const { count: total } = await supabase
            .from('lottery_records')
            .select('*', { count: 'exact', head: true });
        
        const { data: all } = await supabase
            .from('lottery_records')
            .select('prize_level');
        
        const levelCounts = { 1: 0, 2: 0, 3: 0 };
        if (all) all.forEach(r => { levelCounts[r.prize_level]++; });
        
        const stats = {
            totalDraws: total || 0,
            byLevel: {}
        };
        
        for (let level of [1, 2, 3]) {
            stats.byLevel[level] = {
                count: levelCounts[level],
                percentage: total > 0 ? ((levelCounts[level] / total) * 100).toFixed(2) : 0,
                name: PRIZES[level].name,
                targetWeight: PRIZES[level].weight
            };
        }
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取统计失败' });
    }
});

app.get('/api/admin/records', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const { count: total } = await supabase
            .from('lottery_records')
            .select('*', { count: 'exact', head: true });
        
        const { data: records } = await supabase
            .from('lottery_records')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        res.json({
            success: true,
            data: {
                records: records || [],
                pagination: {
                    page, limit,
                    total: total || 0,
                    totalPages: Math.ceil((total || 0) / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取记录失败' });
    }
});

app.get('/api/admin/export', requireAdmin, async (req, res) => {
    try {
        const { data: records } = await supabase
            .from('lottery_records')
            .select('*')
            .order('created_at', { ascending: false });
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('抽奖记录');
        
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: '姓名', key: 'name', width: 15 },
            { header: '手机号', key: 'phone', width: 15 },
            { header: 'IP地址', key: 'ip_address', width: 15 },
            { header: '奖项等级', key: 'prize_level', width: 10 },
            { header: '奖品名称', key: 'prize_name', width: 30 },
            { header: '抽奖时间', key: 'created_at', width: 20 }
        ];
        
        (records || []).forEach(record => worksheet.addRow(record));
        
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: 'FFD700' }
        };
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=lottery_records_${Date.now()}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: '导出失败' });
    }
});

// ==================== 启动 ====================
// Vercel serverless: 导出 app
module.exports = app;

// 本地开发: 监听端口
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🎰 澳洁618抽奖系统已启动 (Supabase)`);
        console.log(`📍 前端地址: http://localhost:${PORT}`);
        console.log(`🔧 管理后台: http://localhost:${PORT}/admin.html`);
        console.log(`🔑 管理密码: ${ADMIN_PASSWORD}`);
        console.log(`🗄️  数据库: Supabase (${supabaseUrl})`);
    });
}

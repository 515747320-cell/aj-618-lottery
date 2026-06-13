const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://szudhoecxrdmyejsuvno.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'sb_publishable_bLecDFzaf2zLRxoCbO1nxA_nHiAvs6-'
);

const ADMIN_PASSWORD = 'aojie618admin';
const adminTokens = new Set();

const PRIZES = {
    1: { name: '一等奖 - 免费洗衣卡（价值200元）', level: 1, weight: 10 },
    2: { name: '二等奖 - 10元洗衣优惠券', level: 2, weight: 10 },
    3: { name: '三等奖 - 5元洗衣优惠券', level: 3, weight: 80 }
};
const TOTAL_WEIGHT = Object.values(PRIZES).reduce((s, p) => s + p.weight, 0);

function drawPrize() {
    const r = Math.random() * TOTAL_WEIGHT;
    let c = 0;
    for (const p of Object.values(PRIZES)) { c += p.weight; if (r < c) return p; }
    return PRIZES[3];
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Draw
app.post('/api/draw', async (req, res) => {
    try {
        const { name = '', phone = '' } = req.body;
        if (phone) {
            const { data: e } = await supabase.from('lottery_records').select('id').eq('phone', phone).limit(1);
            if (e?.length) return res.json({ success: false, message: '该手机号已参与过抽奖' });
        }
        const prize = drawPrize();
        const { data } = await supabase.from('lottery_records').insert({
            user_id: uuidv4(), name, phone,
            ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
            prize_level: prize.level, prize_name: prize.name
        }).select('id').single();
        res.json({ success: true, recordId: data.id, prize: { level: prize.level, name: prize.name }, message: `恭喜 ${name} 获得${prize.name}！` });
    } catch (e) {
        res.status(500).json({ success: false, message: '抽奖失败' });
    }
});

// Stats
app.get('/api/stats', async (req, res) => {
    try {
        const { count } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
        const { data: all } = await supabase.from('lottery_records').select('prize_level');
        const lc = { 1: 0, 2: 0, 3: 0 };
        if (all) all.forEach(r => lc[r.prize_level]++);
        const total = count || 0;
        const byLevel = {};
        for (const l of [1, 2, 3]) byLevel[l] = { count: lc[l], percentage: total > 0 ? ((lc[l] / total) * 100).toFixed(2) : 0, name: PRIZES[l].name };
        res.json({ success: true, data: { totalDraws: total, byLevel } });
    } catch (e) {
        res.status(500).json({ success: false, message: '获取统计失败' });
    }
});

app.get('/api/records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { count: total } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
        const { data: records } = await supabase.from('lottery_records').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        res.json({ success: true, data: { records: records || [], pagination: { page, limit, total: total || 0, totalPages: Math.ceil((total || 0) / limit) } } });
    } catch (e) {
        res.status(500).json({ success: false, message: '获取记录失败' });
    }
});

// Admin
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        const t = uuidv4(); adminTokens.add(t);
        res.json({ success: true, token: t });
    } else res.status(401).json({ success: false, message: '密码错误' });
});

app.post('/api/admin/logout', (req, res) => {
    if (req.headers['x-admin-token']) adminTokens.delete(req.headers['x-admin-token']);
    res.json({ success: true });
});

const guard = (req, res, next) => {
    const t = req.headers['x-admin-token'] || req.query.token;
    if (t && adminTokens.has(t)) next();
    else res.status(401).json({ success: false, message: '未授权' });
};

app.get('/api/admin/stats', guard, async (req, res) => {
    try {
        const { count } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
        const { data: all } = await supabase.from('lottery_records').select('prize_level');
        const lc = { 1: 0, 2: 0, 3: 0 };
        if (all) all.forEach(r => lc[r.prize_level]++);
        const total = count || 0;
        const byLevel = {};
        for (const l of [1, 2, 3]) byLevel[l] = { count: lc[l], percentage: total > 0 ? ((lc[l] / total) * 100).toFixed(2) : 0, name: PRIZES[l].name, targetWeight: PRIZES[l].weight };
        res.json({ success: true, data: { totalDraws: total, byLevel } });
    } catch (e) { res.status(500).json({ success: false, message: '获取统计失败' }); }
});

app.get('/api/admin/records', guard, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { count: total } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
        const { data: records } = await supabase.from('lottery_records').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        res.json({ success: true, data: { records: records || [], pagination: { page, limit, total: total || 0, totalPages: Math.ceil((total || 0) / limit) } } });
    } catch (e) { res.status(500).json({ success: false, message: '获取记录失败' }); }
});

app.get('/api/admin/export', guard, async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const { data: records } = await supabase.from('lottery_records').select('*').order('created_at', { ascending: false });
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('抽奖记录');
        ws.columns = [
            { header: 'ID', key: 'id', width: 8 }, { header: '姓名', key: 'name', width: 12 },
            { header: '手机号', key: 'phone', width: 15 }, { header: 'IP', key: 'ip_address', width: 14 },
            { header: '奖项', key: 'prize_level', width: 8 }, { header: '奖品', key: 'prize_name', width: 28 },
            { header: '时间', key: 'created_at', width: 18 }
        ];
        (records || []).forEach(r => ws.addRow(r));
        ws.getRow(1).font = { bold: true };
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=lottery_${Date.now()}.xlsx`);
        await wb.xlsx.write(res);
        res.end();
    } catch (e) { res.status(500).json({ success: false, message: '导出失败' }); }
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🎰 澳洁618抽奖系统 http://localhost:${PORT}`));

import { createClient } from '@supabase/supabase-js';

const PRIZES = {
  1: { name: '一等奖 - 免费洗1双鞋', level: 1, weight: 10 },
  2: { name: '二等奖 - 10元现金优惠', level: 2, weight: 10 },
  3: { name: '三等奖 - 5元复购券', level: 3, weight: 80 }
};
const TW = Object.values(PRIZES).reduce((s, p) => s + p.weight, 0);
function draw() { let r = Math.random() * TW, c = 0; for (const p of Object.values(PRIZES)) { c += p.weight; if (r < c) return p; } return PRIZES[3]; }

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,x-admin-token' };
function j(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } }); }
function makeToken(pwd) { return btoa(Date.now() + ':' + pwd); }
function verifyToken(t, pwd) { try { const d = atob(t), p = d.split(':'); return p.length === 2 && (Date.now() - parseInt(p[0]) < 86400000) && p[1] === pwd; } catch { return false; } }

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname, method = request.method;
  if (method === 'OPTIONS') return new Response(null, { headers: cors });

  const supabase = createClient(
    env.SUPABASE_URL || 'https://szudhoecxrdmyejsuvno.supabase.co',
    env.SUPABASE_ANON_KEY || 'sb_publishable_bLecDFzaf2zLRxoCbO1nxA_nHiAvs6-'
  );
  const ADMIN_PASSWORD=*** || 'aojie618admin';
  const admin = verifyToken(request.headers.get('x-admin-token') || '', ADMIN_PASSWORD);

  // DRAW
  if (path === '/api/draw' && method === 'POST') {
    try {
      const { name = '', phone = '' } = await request.json();
      if (!phone) return j({ success: false, message: '请输入手机号' });

      // 检查是否已存在
      const { data: ex } = await supabase.from('lottery_records').select('id').eq('phone', phone).limit(1);
      if (ex && ex.length > 0) {
        return j({ success: false, message: '该手机号已参与过抽奖，每人仅限一次' });
      }

      const prize = draw();
      const { error } = await supabase.from('lottery_records').insert({
        name, phone, ip_address: request.headers.get('x-forwarded-for') || '',
        prize_level: prize.level, prize_name: prize.name,
      });
      
      if (error) {
        // 唯一约束冲突
        return j({ success: false, message: '该手机号已参与过抽奖，每人仅限一次' });
      }
      
      return j({ success: true, prize: { level: prize.level, name: prize.name }, message: `恭喜 ${name} 获得${prize.name}！` });
    } catch (e) {
      return j({ success: false, message: '系统繁忙: ' + (e.message || e).toString().substring(0, 200) }, 500);
    }
  }

  // STATS
  if (path === '/api/stats' && method === 'GET') {
    try {
      const { count } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
      const { data: all } = await supabase.from('lottery_records').select('prize_level');
      const lc = { 1: 0, 2: 0, 3: 0 }; if (all) all.forEach(r => lc[r.prize_level]++);
      const t = count || 0; const bl = {};
      for (const l of [1, 2, 3]) bl[l] = { count: lc[l], percentage: t > 0 ? ((lc[l] / t) * 100).toFixed(2) : 0, name: PRIZES[l].name };
      return j({ success: true, data: { totalDraws: t, byLevel: bl } });
    } catch (e) { return j({ success: false }, 500); }
  }

  // ADMIN LOGIN
  if (path === '/api/admin/login' && method === 'POST') {
    try {
      const { password } = await request.json();
      if (password === ADMIN_PASSWORD) return j({ success: true, token: makeToken(ADMIN_PASSWORD) });
      return j({ success: false }, 401);
    } catch (e) { return j({ success: false }, 500); }
  }

  // ADMIN STATS
  if (path === '/api/admin/stats' && method === 'GET') {
    if (!admin) return j({ success: false }, 401);
    try {
      const { count } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
      const { data: all } = await supabase.from('lottery_records').select('prize_level');
      const lc = { 1: 0, 2: 0, 3: 0 }; if (all) all.forEach(r => lc[r.prize_level]++);
      const t = count || 0; const bl = {};
      for (const l of [1, 2, 3]) bl[l] = { count: lc[l], percentage: t > 0 ? ((lc[l] / t) * 100).toFixed(2) : 0, name: PRIZES[l].name, targetWeight: PRIZES[l].weight };
      return j({ success: true, data: { totalDraws: t, byLevel: bl } });
    } catch (e) { return j({ success: false }, 500); }
  }

  // ADMIN RECORDS
  if (path === '/api/admin/records' && method === 'GET') {
    if (!admin) return j({ success: false }, 401);
    try {
      const page = parseInt(url.searchParams.get('page')) || 1, limit = parseInt(url.searchParams.get('limit')) || 20, off = (page - 1) * limit;
      const { count: total } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
      const { data: records, error } = await supabase.from('lottery_records').select('*').order('created_at', { ascending: false }).range(off, off + limit - 1);
      return j({ success: true, data: { records: records || [], pagination: { page, limit, total: total || 0, totalPages: Math.ceil((total || 0) / limit) } } });
    } catch (e) { return j({ success: false }, 500); }
  }

  return j({ success: false }, 404);
}

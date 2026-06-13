import { createClient } from '@supabase/supabase-js';

const PRIZES = {
  1: { name: '一等奖 - 免费洗衣卡（价值200元）', level: 1, weight: 10 },
  2: { name: '二等奖 - 10元洗衣优惠券', level: 2, weight: 10 },
  3: { name: '三等奖 - 5元洗衣优惠券', level: 3, weight: 80 }
};
const TOTAL = 100;
function draw() { let r = Math.random() * TOTAL, c = 0; for (const p of Object.values(PRIZES)) { c += p.weight; if (r < c) return p; } return PRIZES[3]; }

const adminTokens = new Set();
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,x-admin-token' };

function sb(env) { return createClient(env.SUPABASE_URL || 'https://szudhoecxrdmyejsuvno.supabase.co', env.SUPABASE_ANON_KEY || 'sb_publishable_bLecDFzaf2zLRxoCbO1nxA_nHiAvs6-'); }
function j(data, s = 200) { return new Response(JSON.stringify(data), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } }); }

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { headers: cors });

  const supabase = sb(env);
  const ADMIN_PASSWORD=env.ADMIN_PASSWORD || 'aojie618admin';

  // Draw
  if (path === '/api/draw' && method === 'POST') {
    try {
      const { name = '', phone = '' } = await request.json();
      if (phone) {
        const { data: e } = await supabase.from('lottery_records').select('id').eq('phone', phone).limit(1);
        if (e?.length) return j({ success: false, message: '该手机号已参与过抽奖' });
      }
      const prize = draw();
      const { data } = await supabase.from('lottery_records').insert({
        name, phone, ip_address: request.headers.get('x-forwarded-for') || '',
        prize_level: prize.level, prize_name: prize.name,
      }).select('id').single();
      return j({ success: true, recordId: data?.id, prize: { level: prize.level, name: prize.name }, message: `恭喜 ${name} 获得${prize.name}！` });
    } catch (e) { return j({ success: false, message: '抽奖失败' }, 500); }
  }

  // Stats (public)
  if (path === '/api/stats' && method === 'GET') {
    try {
      const { count } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
      const { data: all } = await supabase.from('lottery_records').select('prize_level');
      const lc = { 1: 0, 2: 0, 3: 0 }; if (all) all.forEach(r => lc[r.prize_level]++);
      const t = count || 0; const bl = {};
      for (const l of [1, 2, 3]) bl[l] = { count: lc[l], percentage: t > 0 ? ((lc[l] / t) * 100).toFixed(2) : 0, name: PRIZES[l].name };
      return j({ success: true, data: { totalDraws: t, byLevel: bl } });
    } catch (e) { return j({ success: false, message: '获取统计失败' }, 500); }
  }

  // Admin login
  if (path === '/api/admin/login' && method === 'POST') {
    try {
      const { password } = await request.json();
      if (password === ADMIN_PASSWORD) { const t = crypto.randomUUID(); adminTokens.add(t); return j({ success: true, token: t }); }
      return j({ success: false, message: '密码错误' }, 401);
    } catch (e) { return j({ success: false, message: '登录失败' }, 500); }
  }

  const getToken = () => request.headers.get('x-admin-token') || url.searchParams.get('token');
  const isAdmin = () => { const t = getToken(); return t && adminTokens.has(t); };

  // Admin stats
  if (path === '/api/admin/stats' && method === 'GET') {
    if (!isAdmin()) return j({ success: false, message: '未授权' }, 401);
    try {
      const { count } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
      const { data: all } = await supabase.from('lottery_records').select('prize_level');
      const lc = { 1: 0, 2: 0, 3: 0 }; if (all) all.forEach(r => lc[r.prize_level]++);
      const t = count || 0; const bl = {};
      for (const l of [1, 2, 3]) bl[l] = { count: lc[l], percentage: t > 0 ? ((lc[l] / t) * 100).toFixed(2) : 0, name: PRIZES[l].name, targetWeight: PRIZES[l].weight };
      return j({ success: true, data: { totalDraws: t, byLevel: bl } });
    } catch (e) { return j({ success: false, message: '获取统计失败' }, 500); }
  }

  // Admin records
  if (path === '/api/admin/records' && method === 'GET') {
    if (!isAdmin()) return j({ success: false, message: '未授权' }, 401);
    try {
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      const off = (page - 1) * limit;
      const { count: total } = await supabase.from('lottery_records').select('*', { count: 'exact', head: true });
      const { data: records } = await supabase.from('lottery_records').select('*').order('created_at', { ascending: false }).range(off, off + limit - 1);
      return j({ success: true, data: { records: records || [], pagination: { page, limit, total: total || 0, totalPages: Math.ceil((total || 0) / limit) } } });
    } catch (e) { return j({ success: false, message: '获取记录失败' }, 500); }
  }

  return j({ success: false, message: 'Not found' }, 404);
}

const PRIZES = {
  1: { name: '一等奖 - 免费洗1双鞋', weight: 10 },
  2: { name: '二等奖 - 10元现金优惠', weight: 10 },
  3: { name: '三等奖 - 5元复购券', weight: 80 }
};
const TW = Object.values(PRIZES).reduce((s, p) => s + p.weight, 0);
function draw() { let r = Math.random() * TW, c = 0; for (const p of Object.values(PRIZES)) { c += p.weight; if (r < c) return p; } return PRIZES[3]; }

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,x-admin-token' };
function j(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } }); }

function makeAdminToken(pwd) { return btoa(Date.now() + ':' + pwd); }
function verifyAdminToken(t, pwd) { try { const d = atob(t), parts = d.split(':'); return parts.length === 2 && (Date.now() - parseInt(parts[0]) < 86400000) && parts[1] === pwd; } catch { return false; } }

// Supabase REST API 直调（兼容 Cloudflare Edge Runtime）
async function sb(env, { table, select, eq, limit, order, range, method, body, count } = {}) {
  const key = env.SUPABASE_ANON_KEY || 'sb_publishable_bLecDFzaf2zLRxoCbO1nxA_nHiAvs6-';
  const base = env.SUPABASE_URL || 'https://szudhoecxrdmyejsuvno.supabase.co';
  let url = `${base}/rest/v1/${table}?select=${select || '*'}`;
  if (eq) url += `&${eq.col}=eq.${eq.val}`;
  if (limit) url += `&limit=${limit}`;
  if (order) url += `&order=${order}`;
  if (range) url += `&offset=${range[0]}&limit=${range[1]}`;
  
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  
  if (count) { headers['Prefer'] = 'count=exact'; const r = await fetch(url, { method: 'HEAD', headers }); return { count: parseInt(r.headers.get('content-range')?.split('/')[1] || '0') }; }
  if (method === 'POST') { const r = await fetch(url, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body) }); const d = await r.json(); return { data: d, error: r.status > 299 ? { code: r.status, msg: r.statusText } : null }; }
  const r = await fetch(url, { method: 'GET', headers }); const d = await r.json();
  return { data: d, error: r.status > 299 ? { code: r.status } : null };
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname, method = request.method;
  if (method === 'OPTIONS') return new Response(null, { headers: cors });

  const ADMIN_PASSWORD=env.AD...WORD || 'aojie618admin';
  const isAdmin = verifyAdminToken(request.headers.get('x-admin-token') || '', ADMIN_PASSWORD);

  // DRAW - 用数据库唯一约束阻挡重复
  if (path === '/api/draw' && method === 'POST') {
    try {
      const { name = '', phone = '' } = await request.json();
      if (!phone) return j({ success: false, message: '请输入手机号' });
      const prize = draw();
      // 先查是否已存在
      const { data: existing } = await sb(env, { table: 'lottery_records', eq: { col: 'phone', val: phone }, limit: 1 });
      if (existing && existing.length > 0) return j({ success: false, message: '该手机号已参与过抽奖' });
      // 不存在则插入
      const { error } = await sb(env, { table: 'lottery_records', method: 'POST', body: { name, phone, ip_address: request.headers.get('x-forwarded-for') || '', prize_level: prize.level, prize_name: prize.name } });
      if (error) {
        if (error.code === 409 || error.code === 23505) return j({ success: false, message: '该手机号已参与过抽奖' });
        throw new Error(error.msg || 'insert failed');
      }
      return j({ success: true, prize: { level: prize.level, name: prize.name }, message: `恭喜 ${name} 获得${prize.name}！` });
    } catch (e) { return j({ success: false, message: '系统繁忙，请重试' }, 500); }
  }

  // STATS
  if (path === '/api/stats' && method === 'GET') {
    try {
      const { count } = await sb(env, { table: 'lottery_records', count: true });
      const { data: all } = await sb(env, { table: 'lottery_records' });
      const lc = { 1: 0, 2: 0, 3: 0 }; if (all) all.forEach(r => lc[r.prize_level]++);
      const t = count || 0; const bl = {};
      for (const l of [1, 2, 3]) bl[l] = { count: lc[l], percentage: t > 0 ? ((lc[l] / t) * 100).toFixed(2) : 0, name: PRIZES[l].name };
      return j({ success: true, data: { totalDraws: t, byLevel: bl } });
    } catch (e) { return j({ success: false, message: '获取统计失败' }, 500); }
  }

  // ADMIN LOGIN
  if (path === '/api/admin/login' && method === 'POST') {
    try {
      const { password } = await request.json();
      return j({ success: password === ADMIN_PASSWORD, token: password === ADMIN_PASSWORD ? makeAdminToken(ADMIN_PASSWORD) : undefined }, password === ADMIN_PASSWORD ? 200 : 401);
    } catch (e) { return j({ success: false }, 500); }
  }

  // ADMIN STATS
  if (path === '/api/admin/stats' && method === 'GET') {
    if (!isAdmin) return j({ success: false }, 401);
    try {
      const { count } = await sb(env, { table: 'lottery_records', count: true });
      const { data: all } = await sb(env, { table: 'lottery_records' });
      const lc = { 1: 0, 2: 0, 3: 0 }; if (all) all.forEach(r => lc[r.prize_level]++);
      const t = count || 0; const bl = {};
      for (const l of [1, 2, 3]) bl[l] = { count: lc[l], percentage: t > 0 ? ((lc[l] / t) * 100).toFixed(2) : 0, name: PRIZES[l].name, targetWeight: PRIZES[l].weight };
      return j({ success: true, data: { totalDraws: t, byLevel: bl } });
    } catch (e) { return j({ success: false }, 500); }
  }

  // ADMIN RECORDS
  if (path === '/api/admin/records' && method === 'GET') {
    if (!isAdmin) return j({ success: false }, 401);
    try {
      const page = parseInt(url.searchParams.get('page')) || 1, limit = parseInt(url.searchParams.get('limit')) || 20, off = (page - 1) * limit;
      const { count: total } = await sb(env, { table: 'lottery_records', count: true });
      const { data: records } = await sb(env, { table: 'lottery_records', order: 'created_at.desc', range: [off, limit] });
      return j({ success: true, data: { records: records || [], pagination: { page, limit, total: total || 0, totalPages: Math.ceil((total || 0) / limit) } } });
    } catch (e) { return j({ success: false }, 500); }
  }

  return j({ success: false }, 404);
}

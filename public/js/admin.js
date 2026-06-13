let currentPage = 1;
const pageSize = 20;

function getToken() { return localStorage.getItem('adminToken'); }

async function checkAuth() {
    if (getToken()) {
        const r = await fetch('/api/admin/stats', { headers: { 'x-admin-token': getToken() } });
        if (r.ok) { showAdmin(); loadStats(); loadRecords(); return; }
    }
    showLogin();
}

function showLogin() {
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
}

function showAdmin() {
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
}

async function login() {
    const password = document.getElementById('passwordInput').value;
    const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const data = await r.json();
    if (data.success) {
        localStorage.setItem('adminToken', data.token);
        showAdmin();
        loadStats();
        loadRecords();
    } else {
        alert('密码错误');
    }
}

async function logout() {
    await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': getToken() }
    });
    localStorage.removeItem('adminToken');
    showLogin();
}

async function loadStats() {
    const r = await fetch('/api/admin/stats', { headers: { 'x-admin-token': getToken() } });
    const data = await r.json();
    if (data.success) {
        const s = data.data;
        document.getElementById('totalDraws').textContent = s.totalDraws;
        for (let l = 1; l <= 3; l++) {
            document.getElementById(`prize${l}Count`).textContent = s.byLevel[l].count;
            document.getElementById(`prize${l}Percent`).textContent = `${s.byLevel[l].percentage}% (设定: ${s.byLevel[l].targetWeight}%)`;
        }
    }
}

async function loadRecords(page = 1) {
    currentPage = page;
    const r = await fetch(`/api/admin/records?page=${page}&limit=${pageSize}`, {
        headers: { 'x-admin-token': getToken() }
    });
    const data = await r.json();
    if (data.success) {
        renderRecords(data.data.records);
        renderPagination(data.data.pagination);
    }
}

function renderRecords(records) {
    const tbody = document.getElementById('recordsBody');
    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">暂无记录</td></tr>';
        return;
    }
    const names = { 1: '一等奖', 2: '二等奖', 3: '三等奖' };
    tbody.innerHTML = records.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${r.name || '-'}</td>
            <td>${r.phone || '-'}</td>
            <td>${r.ip_address}</td>
            <td><span class="prize-badge level-${r.prize_level}">${names[r.prize_level] || '未知'}</span></td>
            <td>${formatTime(r.created_at)}</td>
        </tr>
    `).join('');
}

function renderPagination(p) {
    const c = document.getElementById('pagination');
    if (p.totalPages <= 1) { c.innerHTML = ''; return; }
    let html = `<button ${p.page === 1 ? 'disabled' : ''} onclick="loadRecords(${p.page - 1})">上一页</button>`;
    for (let i = Math.max(1, p.page - 2); i <= Math.min(p.totalPages, p.page + 2); i++) {
        html += `<button class="${i === p.page ? 'active' : ''}" onclick="loadRecords(${i})">${i}</button>`;
    }
    html += `<button ${p.page === p.totalPages ? 'disabled' : ''} onclick="loadRecords(${p.page + 1})">下一页</button>`;
    c.innerHTML = html;
}

function exportExcel() {
    window.location.href = '/api/admin/export?token=' + getToken();
}

function formatTime(t) {
    if (!t) return '-';
    return new Date(t).toLocaleString('zh-CN');
}

document.getElementById('passwordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') login();
});

checkAuth();
setInterval(() => {
    if (!document.getElementById('adminView').classList.contains('hidden')) loadStats();
}, 30000);

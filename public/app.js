/* ============================================================
   三国霸业 · 前端逻辑
   ============================================================ */
'use strict';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const SG_KEY = 'sg_player_id';
let state = null;
let recruiting = false;

/* ---------------- API ---------------- */
async function api(path, body) {
  const res = await fetch(path, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  let data;
  try { data = await res.json(); } catch { data = { ok: false, error: '服务器响应异常' }; }
  if (!data.ok) throw new Error(data.error || '请求失败');
  return data;
}

/* ---------------- 视图切换 ---------------- */
function showView(name) {
  $('#login-view').classList.toggle('hidden', name !== 'login');
  $('#game-view').classList.toggle('hidden', name !== 'game');
}

function switchTab(tab) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  $$('.tab-page').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + tab));
  if (tab === 'rank') loadLeaderboard();
}

/* ---------------- 轻提示 / 弹窗 ---------------- */
let toastTimer = null;
function toast(msg, isErr = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', isErr);
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

function showModal(title, bodyHtml, onOk) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal').classList.remove('hidden');
  $('#modal-ok').onclick = () => {
    $('#modal').classList.add('hidden');
    if (onOk) onOk();
  };
}

/* ---------------- 主城 ---------------- */
function renderHome() {
  const p = state.player;
  $('#lord-name').textContent = '· ' + p.name;
  $('#home-greeting').textContent = p.victory ? '主公，天下已定，四海归一！' : '主公，欢迎归来';
  $('#home-progress').innerHTML = `已据 <b>${p.provinceCount}</b>/13 州 · ${p.victory ? '已一统天下' : '距一统天下尚远'}`;
  $('#home-progress-bar').style.width = (p.provinceCount / 13 * 100) + '%';
  $('#p-silver').textContent = '+' + p.production.silver + '/时';
  $('#p-grain').textContent = '+' + p.production.grain + '/时';
  $('#p-troops').textContent = '+' + p.production.troops + '/时';
  $('#home-capital').textContent = p.capital;
  $('#home-count').textContent = p.provinceCount;
  $('#home-generals').textContent = state.generals.length;
  const owned = state.map.filter((m) => m.status === 'owned');
  const attackable = state.map.filter((m) => m.status === 'attackable');
  $('#home-notice').innerHTML = p.victory
    ? '<b>四海升平。</b>十三州尽归治下，可往「排行」一展英名，亦可继续练兵屯粮。'
    : attackable.length
      ? `治下州郡：<b>${owned.map((m) => m.name).join('、')}</b>。可征讨邻州：<b>${attackable.map((m) => m.name).join('、')}</b>，请前往「天下」调兵。`
      : `治下州郡：<b>${owned.map((m) => m.name).join('、')}</b>。先练兵屯粮、招揽贤才，再图进取。`;
}

/* ---------------- 天下地图 ---------------- */
function renderMap() {
  const grid = $('#map-grid');
  grid.innerHTML = '';
  for (const p of state.map) {
    const el = document.createElement('div');
    el.className = 'prov ' + p.status + (state.victory ? ' victory' : '');
    el.style.gridArea = p.id;
    el.innerHTML = `
      <span class="p-name">${p.name}</span>
      <span class="p-city">治所·${p.capital}</span>
      <span class="p-meta">${p.status === 'owned' ? '治下' : '守军 ' + p.garrison.toLocaleString()}</span>`;
    if (p.status === 'attackable') {
      el.onclick = () => confirmAttack(p);
    } else if (p.status === 'owned') {
      el.onclick = () => showModal(p.name, `治所：${p.capital}。此州已在治下，每时产银 ${prodText(p, 'silver')}、粮 ${prodText(p, 'grain')}、兵 ${prodText(p, 'troops')}。`, null);
    } else {
      el.onclick = () => toast('此州与治下不相邻，暂不可征讨');
    }
    grid.appendChild(el);
  }
}

function prodText(province, key) {
  const v = 1; // 1 小时
  const sBase = 20, gBase = 15, tBase = 2;
  const map = { silver: Math.floor((sBase + province.reward / 5) * v), grain: Math.floor((gBase + province.reward / 5) * v), troops: Math.floor((tBase + province.reward / 40) * v) };
  return map[key];
}

function confirmAttack(p) {
  showModal(
    `征讨 · ${p.name}`,
    `<div class="sub">治所：${p.capital}　守军：${p.garrison.toLocaleString()}</div>
     <br/>我军兵力 <b>${state.player.troops.toLocaleString()}</b>、士气 ${state.player.morale}、武将 ${state.generals.length} 员。
     <br/>胜负在天，成事在人。是否点将出征？`,
    () => doAttack(p.id)
  );
}

async function doAttack(cityId) {
  try {
    const res = await api('/api/action', { playerId: state.player.id, action: 'attack', cityId });
    await loadState();
    const r = res.result;
    const lines = [
      `<span class="battle-line ${r.win ? 'win' : 'lose'}">${r.win ? '大捷！攻克' + res.message.replace('捷报！', '').replace('！', '') : '失利……'}</span>`,
      `<span class="battle-line ${r.win ? 'win' : 'lose'}">折损兵力：${r.troopsLost.toLocaleString()}</span>`,
    ];
    if (r.reward > 0) lines.push(`<span class="loot">缴获：银两 ${r.reward.toLocaleString()}、粮草 ${r.reward.toLocaleString()}</span>`);
    for (const e of r.events) lines.push(`<span class="battle-line sub">${e}</span>`);
    if (state.victory) lines.push('<br/><b style="color:#ffd97a">十三州尽收，主公一统天下！</b>');
    showModal('军情战报', lines.join(''), null);
    renderHome();
  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------------- 武将 ---------------- */
function renderGenerals() {
  $('#gen-count').textContent = state.generals.length;
  const list = $('#gen-list');
  if (!state.generals.length) {
    list.innerHTML = '<p class="empty-tip">帐下尚无将才，速去「招募武将」招揽贤良。</p>';
    return;
  }
  list.innerHTML = '';
  for (const g of state.generals) {
    const el = document.createElement('div');
    el.className = 'gen-card';
    el.innerHTML = `
      <span class="badge badge-${g.tier}">${g.tier === 'SSR' ? '名将' : g.tier === 'SR' ? '良将' : '勇将'}</span>
      <div class="g-name">${g.name}</div>
      <div class="g-stats">武 <b>${g.attack}</b>　·　御 <b>${g.defense}</b></div>
      <div class="g-loyalty">忠诚 ${g.loyalty}</div>`;
    list.appendChild(el);
  }
}

async function doRecruit() {
  if (recruiting) return;
  recruiting = true;
  const btn = $('#btn-recruit');
  btn.disabled = true;
  try {
    const res = await api('/api/action', { playerId: state.player.id, action: 'recruit' });
    await loadState();
    const g = res.general;
    const tierName = g.tier === 'SSR' ? '名将' : g.tier === 'SR' ? '良将' : '勇将';
    showModal('招募成功',
      `<span class="badge badge-${g.tier}">${tierName}</span>
       <div style="font-size:26px;letter-spacing:4px;color:${g.tier === 'SSR' ? '#ffd97a' : '#f0e2c0'};margin:8px 0">${g.name}</div>
       <div class="sub">武 ${g.attack} · 御 ${g.defense} · 忠诚 ${g.loyalty}</div>
       <br/><div class="sub">耗费银两 ${g.cost.toLocaleString()}，${g.name} 愿效犬马之劳！</div>`, null);
    renderGenerals();
    renderHome();
  } catch (e) {
    toast(e.message, true);
  } finally {
    recruiting = false;
    btn.disabled = false;
  }
}

/* ---------------- 战报 ---------------- */
function renderLogs() {
  const list = $('#battle-list');
  if (!state.battles.length) {
    list.innerHTML = '<li class="empty-tip" style="list-style:none">尚无战事，往「天下」攻城略地吧。</li>';
    return;
  }
  list.innerHTML = '';
  for (const b of state.battles) {
    const el = document.createElement('li');
    el.className = b.result;
    el.innerHTML = `
      <div class="b-head"><span>${b.city} · ${b.result === 'win' ? '攻克' : '失利'}</span><span>${fmtTime(b.created_at)}</span></div>
      <div class="b-detail">${b.detail || ''}</div>`;
    list.appendChild(el);
  }
}

function fmtTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------------- 排行 ---------------- */
async function loadLeaderboard() {
  try {
    const res = await api('/api/leaderboard');
    const body = $('#rank-body');
    body.innerHTML = '';
    const me = state ? state.player.id : null;
    for (const r of res.list) {
      const tr = document.createElement('tr');
      if (me && r.id === me) tr.className = 'me';
      tr.innerHTML = `
        <td class="${r.rank <= 3 ? 'rank-' + r.rank : ''}">${r.rank}</td>
        <td>${r.name}</td>
        <td>${r.provinces}/13</td>
        <td>${r.troops.toLocaleString()}</td>
        <td>${r.silver.toLocaleString()}</td>`;
      body.appendChild(tr);
    }
  } catch (e) { /* 静默 */ }
}

/* ---------------- 状态加载 ---------------- */
async function loadState() {
  const id = localStorage.getItem(SG_KEY);
  if (!id) return false;
  const res = await api('/api/state', { playerId: Number(id) });
  state = res.state;
  const p = state.player;
  $('#r-silver').textContent = p.silver.toLocaleString();
  $('#r-grain').textContent = p.grain.toLocaleString();
  $('#r-troops').textContent = p.troops.toLocaleString();
  $('#r-morale').textContent = p.morale;
  return true;
}

async function refreshAll() {
  renderHome();
  renderMap();
  renderGenerals();
  renderLogs();
}

/* ---------------- 初始化 ---------------- */
async function init() {
  $('#btn-register').onclick = async () => {
    const name = $('#player-name').value.trim();
    if (!name) { $('#login-error').textContent = '请先留下主公名号'; $('#login-error').classList.remove('hidden'); return; }
    try {
      const res = await api('/api/register', { name });
      localStorage.setItem(SG_KEY, String(res.playerId));
      $('#login-error').classList.add('hidden');
      await enterGame();
    } catch (e) {
      $('#login-error').textContent = e.message;
      $('#login-error').classList.remove('hidden');
    }
  };
  $('#player-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-register').click(); });

  $$('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $('#btn-train').onclick = async () => {
    try {
      const res = await api('/api/action', { playerId: state.player.id, action: 'train' });
      toast(res.message);
      await loadState();
      renderHome();
    } catch (e) { toast(e.message, true); }
  };
  $('#btn-recruit').onclick = doRecruit;
  $('#btn-recruit-home').onclick = () => { switchTab('generals'); doRecruit(); };

  const entered = await enterGame();
  if (!entered) showView('login');
  else showView('game');
}

async function enterGame() {
  try {
    const okLoad = await loadState();
    if (!okLoad) return false;
    showView('game');
    switchTab('home');
    await refreshAll();
    setInterval(async () => {
      try { await loadState(); refreshAll(); } catch (e) { /* 静默 */ }
    }, 60000);
    return true;
  } catch (e) {
    localStorage.removeItem(SG_KEY);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', init);

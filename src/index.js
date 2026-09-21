/**
 * 三国霸业 · Cloudflare Worker 入口
 * 路由：
 *   /api/register   POST  注册主公（名号已存在则直接登录继续）
 *   /api/state      POST  获取完整游戏状态（自动结算离线产出）
 *   /api/action     POST  执行动作（练兵 / 招募 / 攻城）
 *   /api/leaderboard GET  天下排行榜
 *   其他路径        由 ASSETS 静态资源处理（public/）
 */
import { PROVINCES } from './data.js';
import {
  PROVINCE_BY_ID,
  rollGeneral,
  computeProduction,
  computeCombat,
  applyMoraleAndLoyalty,
} from './game.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

function ok(data) {
  return json({ ok: true, ...data });
}

function fail(message, status = 400, extra = {}) {
  return json({ ok: false, error: message, ...extra }, status);
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function safeParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ==================== 核心：离线产出结算 ====================
async function refreshPlayer(db, player, vars) {
  const now = Date.now();
  const capHours = Number(vars.PRODUCTION_HOURS_CAP) || 12;
  const capMs = capHours * 3600 * 1000;
  const elapsedMs = Math.max(0, Math.min(now - player.last_updated, capMs));
  if (elapsedMs < 1000) return player;
  const hours = elapsedMs / 3600000;
  const provinces = safeParse(player.provinces, []);
  const prod = computeProduction(provinces, hours, vars);
  const silver = Math.max(0, player.silver + prod.silver);
  const grain = Math.max(0, player.grain + prod.grain);
  const troops = Math.max(0, player.troops + prod.troops);
  await db
    .prepare('UPDATE players SET silver=?, grain=?, troops=?, last_updated=? WHERE id=?')
    .bind(silver, grain, troops, now, player.id)
    .run();
  return { ...player, silver, grain, troops, last_updated: now };
}

// ==================== 状态组装 ====================
function buildMap(ownedProvinceIds, vars = {}) {
  const owned = new Set(ownedProvinceIds);
  const sBase = Number(vars.SILVER_PER_PROVINCE_PER_HOUR) || 20;
  const gBase = Number(vars.GRAIN_PER_PROVINCE_PER_HOUR) || 15;
  const tBase = Number(vars.TROOPS_PER_PROVINCE_PER_HOUR) || 2;
  return PROVINCES.map((p) => {
    let status = 'locked';
    if (owned.has(p.id)) status = 'owned';
    else if (p.neighbors.some((n) => owned.has(n))) status = 'attackable';
    return {
      ...p,
      status,
      prod: {
        silver: Math.floor(sBase + p.reward / 5),
        grain: Math.floor(gBase + p.reward / 5),
        troops: Math.floor(tBase + p.reward / 40),
      },
    };
  });
}

async function getFullState(db, playerId, vars) {
  const player = await db.prepare('SELECT * FROM players WHERE id=?').bind(playerId).first();
  if (!player) return null;
  const fresh = await refreshPlayer(db, player, vars);
  const generals = await db
    .prepare('SELECT id, name, tier, attack, defense, loyalty, cost, created_at FROM generals WHERE player_id=? ORDER BY (tier="SSR") DESC, (tier="SR") DESC, attack DESC')
    .bind(playerId)
    .all();
  const battles = await db
    .prepare('SELECT city, result, troops_lost, reward, detail, created_at FROM battle_logs WHERE player_id=? ORDER BY id DESC LIMIT 20')
    .bind(playerId)
    .all();
  const provinces = safeParse(fresh.provinces, []);
  return {
    player: {
      id: fresh.id,
      name: fresh.name,
      silver: fresh.silver,
      grain: fresh.grain,
      troops: fresh.troops,
      morale: fresh.morale,
      capital: fresh.capital,
      provinces,
      provinceCount: provinces.length,
      created_at: fresh.created_at,
      last_updated: fresh.last_updated,
      production: computeProduction(provinces, 1, vars),
    },
    generals: generals.results,
    battles: battles.results,
    map: buildMap(provinces, vars),
    victory: provinces.length >= PROVINCES.length,
  };
}

// ==================== 业务动作 ====================
async function handleAction(env, body) {
  const db = env.DB;
  const playerId = Number(body.playerId);
  const action = body.action;
  if (!playerId || !action) return fail('参数不完整');
  const player = await db.prepare('SELECT * FROM players WHERE id=?').bind(playerId).first();
  if (!player) return fail('主公不存在', 404);
  const fresh = await refreshPlayer(db, player, env);
  const provinces = safeParse(fresh.provinces, []);

  // ---- 练兵 ----
  if (action === 'train') {
    const costSilver = Number(env.TRAIN_COST_SILVER) || 100;
    const costGrain = Number(env.TRAIN_COST_GRAIN) || 80;
    const gain = Number(env.TRAIN_GAIN_TROOPS) || 100;
    if (fresh.silver < costSilver || fresh.grain < costGrain) {
      return fail('粮草银两不足，无法练兵');
    }
    await db
      .prepare('UPDATE players SET silver=?, grain=?, troops=? WHERE id=?')
      .bind(fresh.silver - costSilver, fresh.grain - costGrain, fresh.troops + gain, playerId)
      .run();
    return ok({ message: `操练完毕，新募 ${gain} 兵马入营`, action: 'train' });
  }

  // ---- 招募武将 ----
  if (action === 'recruit') {
    const general = rollGeneral();
    if (fresh.silver < general.cost) {
      return fail('银两不足，招募失败', 400, { recruitCost: general.cost });
    }
    await db
      .prepare('INSERT INTO generals (player_id, name, tier, attack, defense, loyalty, cost, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(playerId, general.name, general.tier, general.attack, general.defense, general.loyalty, general.cost, Date.now())
      .run();
    await db
      .prepare('UPDATE players SET silver=? WHERE id=?')
      .bind(fresh.silver - general.cost, playerId)
      .run();
    return ok({ message: `${general.name}（${general.tier}）愿效犬马之劳！`, general, action: 'recruit' });
  }

  // ---- 攻城 ----
  if (action === 'attack') {
    const cityId = body.cityId;
    const province = PROVINCE_BY_ID[cityId];
    if (!province) return fail('没有这座城');
    if (provinces.includes(cityId)) return fail('此州已在治下');
    if (!province.neighbors.some((n) => provinces.includes(n))) return fail('须先攻占相邻州，方可挥师此城');
    if (fresh.troops < 50) return fail('兵力不足 50，无法出征');

    const gRes = await db
      .prepare('SELECT id, name, tier, attack, defense, loyalty FROM generals WHERE player_id=?')
      .bind(playerId)
      .all();
    const generals = gRes.results.map((g) => ({ ...g }));
    const result = computeCombat(fresh, province, generals);

    const newTroops = Math.max(0, fresh.troops - result.troopsLost);
    let newMorale = fresh.morale;
    let newProvinces = provinces;
    let silver = fresh.silver;
    let grain = fresh.grain;
    let reward = 0;

    if (result.win) {
      newProvinces = [...provinces, cityId];
      newMorale = Math.min(100, fresh.morale + 2);
      reward = Math.floor(province.garrison * 0.3);
      silver += reward;
      grain += reward;
      result.events.push(`缴获银两 ${reward}、粮草 ${reward}，州郡归心。`);
    } else {
      newMorale = Math.max(10, fresh.morale - 12);
    }

    // 武将忠诚结算
    const loyalty = applyMoraleAndLoyalty(generals, result.win);
    const desertIds = [];
    const surviveIds = [];
    for (const g of generals) {
      if (g.loyalty < 20) desertIds.push(g.id);
      else surviveIds.push(g);
    }
    // 持久化：存活武将的新忠诚写回，弃主武将删除
    for (const g of surviveIds) {
      await db.prepare('UPDATE generals SET loyalty=? WHERE id=?').bind(g.loyalty, g.id).run();
    }
    if (desertIds.length) {
      await db.prepare(`DELETE FROM generals WHERE id IN (${desertIds.map(() => '?').join(',')})`).bind(...desertIds).run();
    }
    result.events.push(...loyalty.events);

    await db
      .prepare('UPDATE players SET silver=?, grain=?, troops=?, morale=?, provinces=? WHERE id=?')
      .bind(silver, grain, newTroops, newMorale, JSON.stringify(newProvinces), playerId)
      .run();
    await db
      .prepare('INSERT INTO battle_logs (player_id, city, result, troops_lost, reward, detail, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(playerId, province.name, result.win ? 'win' : 'lose', result.troopsLost, reward, result.events.join(' '), Date.now())
      .run();

    return ok({
      message: result.win ? `捷报！攻克${province.name}！` : `${province.name}久攻不下……`,
      result: { win: result.win, troopsLost: result.troopsLost, reward, events: result.events },
      action: 'attack',
    });
  }

  return fail('未知操作');
}

// ==================== 路由 ====================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 注册 / 登录（无密码：名号即账号，已存在则直接回到旧档）
    if (url.pathname === '/api/register' && request.method === 'POST') {
      const body = await readJson(request);
      const name = String(body?.name || '').trim().slice(0, 12);
      if (!name) return fail('请留下主公名号');
      const dup = await env.DB.prepare('SELECT id, name FROM players WHERE name=?').bind(name).first();
      if (dup) return ok({ playerId: dup.id, name: dup.name, resumed: true });
      const now = Date.now();
      const res = await env.DB
        .prepare('INSERT INTO players (name, silver, grain, troops, morale, capital, provinces, last_updated, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(
          name,
          Number(env.BASE_SILVER) || 1500,
          Number(env.BASE_GRAIN) || 1500,
          Number(env.BASE_TROOPS) || 500,
          Number(env.BASE_MORALE) || 100,
          '许昌',
          JSON.stringify(['yuzhou']),
          now,
          now
        )
        .run();
      return ok({ playerId: res.meta.last_row_id, name });
    }

    // 游戏状态
    if (url.pathname === '/api/state' && request.method === 'POST') {
      const body = await readJson(request);
      const playerId = Number(body?.playerId);
      if (!playerId) return fail('参数不完整');
      const state = await getFullState(env.DB, playerId, env);
      if (!state) return fail('主公不存在', 404);
      return ok({ state });
    }

    // 执行动作
    if (url.pathname === '/api/action' && request.method === 'POST') {
      const body = await readJson(request);
      return handleAction(env, body);
    }

    // 排行榜
    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      const rows = await env.DB
        .prepare('SELECT id, name, silver, troops, provinces FROM players ORDER BY troops DESC LIMIT 200')
        .all();
      const list = rows.results
        .map((r) => ({ id: r.id, name: r.name, silver: r.silver, troops: r.troops, provinces: safeParse(r.provinces, []).length }))
        .sort((a, b) => b.provinces - a.provinces || b.troops - a.troops)
        .slice(0, 20)
        .map((r, i) => ({ rank: i + 1, ...r }));
      return ok({ list });
    }

    // 其余请求交给静态资源（public/）
    return env.ASSETS.fetch(request);
  },
};

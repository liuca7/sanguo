/**
 * 三国霸业 · 纯游戏逻辑（不依赖运行时，可单测）
 */
import { PROVINCES, GENERAL_POOL } from './data.js';

export const PROVINCE_BY_ID = Object.fromEntries(PROVINCES.map((p) => [p.id, p]));

const TIER_WEIGHTS = { SSR: 0.05, SR: 0.25, R: 0.7 };

/**
 * 随机抽一名武将（按稀有度权重）
 */
export function rollGeneral(rand = Math.random) {
  const r = rand();
  let tier = 'R';
  if (r < TIER_WEIGHTS.SSR) tier = 'SSR';
  else if (r < TIER_WEIGHTS.SSR + TIER_WEIGHTS.SR) tier = 'SR';
  const pool = GENERAL_POOL.filter((g) => g.tier === tier);
  const g = pool[Math.floor(rand() * pool.length)];
  return { ...g };
}

/**
 * 计算离线/在线期间的生产产出
 * 每州每小时基础产出（来自 wrangler.toml [vars]）+ 州 reward 加成
 */
export function computeProduction(provinceIds, hours, vars = {}) {
  const sBase = Number(vars.SILVER_PER_PROVINCE_PER_HOUR) || 20;
  const gBase = Number(vars.GRAIN_PER_PROVINCE_PER_HOUR) || 15;
  const tBase = Number(vars.TROOPS_PER_PROVINCE_PER_HOUR) || 2;
  let silver = 0;
  let grain = 0;
  let troops = 0;
  for (const id of provinceIds) {
    const p = PROVINCE_BY_ID[id];
    if (!p) continue;
    silver += sBase + p.reward / 5;
    grain += gBase + p.reward / 5;
    troops += tBase + p.reward / 40;
  }
  return {
    silver: Math.floor(silver * hours),
    grain: Math.floor(grain * hours),
    troops: Math.floor(troops * hours),
  };
}

/**
 * 攻城战结算
 * 我方战力 = 兵力 × (1 + 武将攻防/1000) × (0.9 + 士气/1000)
 * 城防战力 = 守军 × 随机浮动，双方再各掷随机波动
 */
export function computeCombat(player, province, generals, rand = Math.random) {
  const totalAtk = generals.reduce((s, g) => s + g.attack, 0);
  const totalDef = generals.reduce((s, g) => s + g.defense, 0);
  const generalFactor = 1 + (totalAtk + totalDef) / 1000;
  const playerPower = player.troops * generalFactor * (0.9 + player.morale / 1000);
  const cityPower = province.garrison * (0.85 + rand() * 0.3);
  const playerRoll = playerPower * (0.85 + rand() * 0.3);
  const cityRoll = cityPower * (0.85 + rand() * 0.3);
  const win = playerRoll > cityRoll;
  const troopsLost = Math.max(1, Math.floor(player.troops * (win ? 0.1 + rand() * 0.15 : 0.3 + rand() * 0.25)));
  const events = [];
  if (win) {
    events.push(`攻克${province.name}，兵锋所指，望风披靡！`);
  } else {
    events.push(`攻打${province.name}失利，折损${troopsLost}兵马，鸣金收兵。`);
  }
  return { win, troopsLost, events };
}

/**
 * 战后士气与武将忠诚变化，返回事件
 * 忠诚 < 20 的武将会弃主离去
 */
export function applyMoraleAndLoyalty(generals, win) {
  const events = [];
  const gone = [];
  for (const g of generals) {
    let loyalty = g.loyalty + (win ? 1 : -5);
    loyalty = Math.max(0, Math.min(100, loyalty));
    g.loyalty = loyalty;
    if (loyalty < 20) gone.push(g.name);
  }
  for (const name of gone) {
    events.push(`${name} 因军心涣散，弃主而去……`);
  }
  return { events, gone };
}

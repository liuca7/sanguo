-- ============================================================
-- 三国霸业 · D1 数据库初始化脚本
-- 执行方式（二选一）：
--   远程库：wrangler d1 execute sanguo-db --remote --file=./db/schema.sql
--   本地库：wrangler d1 execute sanguo-db --local  --file=./db/schema.sql
-- 可重复执行（全部使用 IF NOT EXISTS）
-- ============================================================

-- 主公表：核心资源与占领状态
-- provinces 存 JSON 数组，如 ["yuzhou","xuzhou"]
-- last_updated / created_at 存 Unix 毫秒时间戳（JS Date.now()）
CREATE TABLE IF NOT EXISTS players (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,              -- 主公名号
  silver       INTEGER NOT NULL DEFAULT 1500,        -- 银两
  grain        INTEGER NOT NULL DEFAULT 1500,        -- 粮草
  troops       INTEGER NOT NULL DEFAULT 500,         -- 兵力
  morale       INTEGER NOT NULL DEFAULT 100,         -- 士气 0-100
  capital      TEXT    NOT NULL DEFAULT '许昌',      -- 初始治所
  provinces    TEXT    NOT NULL DEFAULT '["yuzhou"]',-- 已占领州（JSON 数组）
  last_updated INTEGER NOT NULL,                     -- 上次结算时间（ms）
  created_at   INTEGER NOT NULL                      -- 创建时间（ms）
);

-- 武将表：每位主公麾下武将
CREATE TABLE IF NOT EXISTS generals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  tier       TEXT    NOT NULL,                       -- SSR 名将 / SR 良将 / R 勇将
  attack     INTEGER NOT NULL,
  defense    INTEGER NOT NULL,
  loyalty    INTEGER NOT NULL,                       -- 忠诚 0-100
  cost       INTEGER NOT NULL,                       -- 招募花费
  created_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- 战报表：攻城记录
CREATE TABLE IF NOT EXISTS battle_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   INTEGER NOT NULL,
  city        TEXT    NOT NULL,                      -- 城名
  result      TEXT    NOT NULL,                      -- win / lose
  troops_lost INTEGER NOT NULL,
  reward      INTEGER NOT NULL DEFAULT 0,            -- 缴获
  detail      TEXT    NOT NULL DEFAULT '',           -- 战况详情
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_generals_player ON generals(player_id);
CREATE INDEX IF NOT EXISTS idx_battles_player  ON battle_logs(player_id);

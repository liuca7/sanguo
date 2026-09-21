# 三国霸业 · Sanguo

基于 **Cloudflare 全栈**（Workers 静态资源 + Workers API + D1 数据库）的三国策略小游戏，全部跑在 Cloudflare 免费额度内（白嫖方案）。

> 汉室倾颓，群雄并起。你从许昌起兵，招募武将、练兵屯粮、攻城略地，剑指十三州，一统天下。

---

## 技术架构

```
浏览器（public/ 静态页面）
   │  https://sanguo.<你的子域>.workers.dev
   ▼
Cloudflare Workers（src/index.js）
   ├── 静态资源路由 → public/（HTML/CSS/JS）
   └── /api/* 接口   → D1 数据库（sanguo-db）
        ├── 注册 / 游戏状态（自动结算离线产出）
        ├── 练兵 / 招募武将 / 攻城
        └── 排行榜
```

- 免费额度参考：Workers 10 万请求/天、D1 5GB 存储 + 500 万行读/天，个人小游戏完全够用。
- 无任何外部依赖：字体、图标、地图全部自绘，纯 HTML/CSS/JS。

---

## 目录结构

```
sanguo/
├── wrangler.toml        # 部署配置 + 全部环境变量 + D1 绑定
├── package.json
├── README.md
├── public/              # 前端（静态资源）
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/                 # 后端（Worker）
│   ├── index.js         # 路由 + API + D1 访问
│   ├── data.js          # 十三州地图 + 武将卡池
│   └── game.js          # 战斗/产出/招募纯逻辑
└── db/
    └── schema.sql       # 数据库初始化脚本（3 张表）
```

---

## 本地开发

```bash
npm install
# 初始化本地 D1 数据库
npx wrangler d1 execute sanguo-db --local --file=./db/schema.sql
# 启动本地服务（默认 http://localhost:8787）
npx wrangler dev
```

> 注意：本地运行前，`wrangler.toml` 里的 `database_id` 可先保持占位符，`--local` 模式会自动用本地 SQLite 模拟；部署远程才必须替换。

---

## 部署到 Cloudflare（免费）

前置：安装 [Node.js](https://nodejs.org) ≥ 18，然后 `npm install`（或全局 `npm i -g wrangler`）。

### 第 1 步：登录
```bash
npx wrangler login
```

### 第 2 步：创建数据库
```bash
npx wrangler d1 create sanguo-db
```
执行后会输出类似：
```
✅ Successfully created DB 'sanguo-db' in region APAC
Created your new D1 database.
[[d1_databases]]
binding = "DB"
database_name = "sanguo-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
**把输出的 `database_id` 粘贴到 `wrangler.toml` 中**（搜索 `PASTE_YOUR_D1_DATABASE_ID_HERE` 替换即可，其余配置都已就绪）。

### 第 3 步：初始化数据库（远程）
```bash
npx wrangler d1 execute sanguo-db --remote --file=./db/schema.sql
```
看到 `Executed 5 statements`（3 张表 + 2 个索引）即成功。

> 数据库初始命令汇总（复制即用）：
> ```bash
> npx wrangler d1 create sanguo-db
> npx wrangler d1 execute sanguo-db --remote --file=./db/schema.sql
> ```

### 第 4 步：部署
```bash
npx wrangler deploy
```

### 第 5 步：开玩
打开输出的地址 `https://sanguo.<你的子域>.workers.dev`，输入主公名号出山。

> 更新代码后重新 `npx wrangler deploy` 即可；改了 `wrangler.toml` 的环境变量同样需要重新部署生效。

---

## 环境变量说明

所有配置都集中在 `wrangler.toml`：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `BASE_SILVER` / `BASE_GRAIN` | 1500 | 初始银两 / 粮草 |
| `BASE_TROOPS` / `BASE_MORALE` | 500 / 100 | 初始兵力 / 士气 |
| `TRAIN_COST_SILVER` / `TRAIN_COST_GRAIN` | 100 / 80 | 练兵消耗 |
| `TRAIN_GAIN_TROOPS` | 100 | 每次练兵新增兵力 |
| `SILVER_PER_PROVINCE_PER_HOUR` | 20 | 每州每小时基础产银 |
| `GRAIN_PER_PROVINCE_PER_HOUR` | 15 | 每州每小时基础产粮 |
| `TROOPS_PER_PROVINCE_PER_HOUR` | 2 | 每州每小时基础募兵 |
| `PRODUCTION_HOURS_CAP` | 12 | 离线产出最多累计小时数 |
| `[[d1_databases]]` | — | D1 绑定（database_id 需替换） |

---

## 玩法说明

- **起兵**：从豫州许昌出发，拥有初始资源与 500 兵马。
- **资源**：每州每时产出银两/粮草/兵力，离线最多累计 12 小时；占领更多州产出更高。
- **练兵**：消耗银两粮草补充兵力。
- **武将**：花费银两招募武将，SSR 名将（5%）＞ SR 良将（25%）＞ R 勇将（70%）。武将武/御越高，攻城战力越强；忠诚过低会弃主离去。
- **攻城**：只能攻打相邻州。战力 = 兵力 × 武将加成 × 士气加成，胜负带随机波动，胜则占州、缴获资源。
- **胜利**：占领全部 13 州即一统天下，登顶「天下英豪榜」。

---

## 数据库结构

| 表 | 说明 |
|---|---|
| `players` | 主公资源、士气、占领州（JSON） |
| `generals` | 麾下武将（稀有度/武/御/忠诚） |
| `battle_logs` | 攻城战报 |

> 建表脚本 `db/schema.sql` 全部使用 `IF NOT EXISTS`，可重复执行。

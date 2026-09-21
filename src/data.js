/**
 * 三国霸业 · 世界静态数据
 * 十三州地图与武将卡池（数据固化在代码中，玩家占领状态存 D1）
 */

// 十三州：id / 名称 / 治所 / 守军强度 / 每州每小时产出加成 / 相邻州
export const PROVINCES = [
  { id: 'yuzhou',   name: '豫州', capital: '许昌', garrison: 400,  reward: 40,  neighbors: ['sili', 'yanzhou', 'xuzhou', 'yangzhou', 'jingzhou'] },
  { id: 'yanzhou',  name: '兖州', capital: '濮阳', garrison: 900,  reward: 70,  neighbors: ['sili', 'yuzhou', 'jizhou', 'qingzhou', 'xuzhou'] },
  { id: 'xuzhou',   name: '徐州', capital: '下邳', garrison: 800,  reward: 60,  neighbors: ['yanzhou', 'yuzhou', 'qingzhou', 'yangzhou'] },
  { id: 'qingzhou', name: '青州', capital: '临淄', garrison: 1000, reward: 80,  neighbors: ['jizhou', 'yanzhou', 'xuzhou', 'youzhou'] },
  { id: 'sili',     name: '司隶', capital: '洛阳', garrison: 2400, reward: 150, neighbors: ['yuzhou', 'yanzhou', 'bingzhou', 'liangzhou', 'jingzhou'] },
  { id: 'jingzhou', name: '荆州', capital: '襄阳', garrison: 1700, reward: 115, neighbors: ['sili', 'yuzhou', 'yangzhou', 'yizhou', 'jiaozhou'] },
  { id: 'yangzhou', name: '扬州', capital: '建业', garrison: 1500, reward: 100, neighbors: ['yuzhou', 'xuzhou', 'jingzhou', 'jiaozhou'] },
  { id: 'jizhou',   name: '冀州', capital: '邺城', garrison: 1600, reward: 110, neighbors: ['yanzhou', 'bingzhou', 'youzhou', 'qingzhou'] },
  { id: 'bingzhou', name: '并州', capital: '晋阳', garrison: 1400, reward: 90,  neighbors: ['sili', 'jizhou', 'youzhou', 'liangzhou'] },
  { id: 'youzhou',  name: '幽州', capital: '蓟城', garrison: 1800, reward: 120, neighbors: ['jizhou', 'bingzhou', 'qingzhou'] },
  { id: 'liangzhou',name: '凉州', capital: '武威', garrison: 2000, reward: 140, neighbors: ['sili', 'bingzhou', 'yizhou'] },
  { id: 'yizhou',   name: '益州', capital: '成都', garrison: 1900, reward: 130, neighbors: ['jingzhou', 'liangzhou', 'jiaozhou'] },
  { id: 'jiaozhou', name: '交州', capital: '番禺', garrison: 1300, reward: 85,  neighbors: ['yangzhou', 'jingzhou', 'yizhou'] },
];

// 武将卡池
// tier: SSR 名将 / SR 良将 / R 勇将
export const GENERAL_POOL = [
  // ===== SSR 名将 =====
  { name: '吕布',   tier: 'SSR', attack: 100, defense: 78, loyalty: 50, cost: 1500 },
  { name: '关羽',   tier: 'SSR', attack: 97,  defense: 93, loyalty: 95, cost: 1200 },
  { name: '张飞',   tier: 'SSR', attack: 95,  defense: 88, loyalty: 90, cost: 1000 },
  { name: '赵云',   tier: 'SSR', attack: 96,  defense: 95, loyalty: 96, cost: 1200 },
  { name: '马超',   tier: 'SSR', attack: 96,  defense: 84, loyalty: 80, cost: 1000 },
  { name: '典韦',   tier: 'SSR', attack: 93,  defense: 96, loyalty: 98, cost: 1000 },
  { name: '诸葛亮', tier: 'SSR', attack: 82,  defense: 99, loyalty: 99, cost: 1400 },
  { name: '周瑜',   tier: 'SSR', attack: 94,  defense: 92, loyalty: 90, cost: 1200 },
  { name: '曹操',   tier: 'SSR', attack: 92,  defense: 94, loyalty: 88, cost: 1300 },
  { name: '司马懿', tier: 'SSR', attack: 90,  defense: 97, loyalty: 60, cost: 1400 },
  // ===== SR 良将 =====
  { name: '张辽',   tier: 'SR', attack: 90, defense: 85, loyalty: 88, cost: 600 },
  { name: '孙策',   tier: 'SR', attack: 92, defense: 80, loyalty: 85, cost: 600 },
  { name: '黄忠',   tier: 'SR', attack: 90, defense: 80, loyalty: 90, cost: 550 },
  { name: '夏侯惇', tier: 'SR', attack: 89, defense: 82, loyalty: 92, cost: 550 },
  { name: '太史慈', tier: 'SR', attack: 88, defense: 86, loyalty: 88, cost: 550 },
  { name: '徐晃',   tier: 'SR', attack: 88, defense: 84, loyalty: 86, cost: 500 },
  { name: '甘宁',   tier: 'SR', attack: 89, defense: 78, loyalty: 82, cost: 500 },
  { name: '张郃',   tier: 'SR', attack: 86, defense: 86, loyalty: 85, cost: 500 },
  { name: '姜维',   tier: 'SR', attack: 86, defense: 88, loyalty: 90, cost: 550 },
  { name: '吕蒙',   tier: 'SR', attack: 85, defense: 85, loyalty: 84, cost: 500 },
  { name: '陆逊',   tier: 'SR', attack: 84, defense: 90, loyalty: 89, cost: 550 },
  { name: '庞统',   tier: 'SR', attack: 80, defense: 92, loyalty: 87, cost: 500 },
  { name: '魏延',   tier: 'SR', attack: 87, defense: 80, loyalty: 75, cost: 450 },
  { name: '郭嘉',   tier: 'SR', attack: 78, defense: 93, loyalty: 93, cost: 500 },
  // ===== R 勇将 =====
  { name: '颜良',   tier: 'R', attack: 82, defense: 60, loyalty: 70, cost: 210 },
  { name: '华雄',   tier: 'R', attack: 79, defense: 62, loyalty: 72, cost: 180 },
  { name: '高览',   tier: 'R', attack: 78, defense: 66, loyalty: 74, cost: 190 },
  { name: '关平',   tier: 'R', attack: 76, defense: 74, loyalty: 92, cost: 200 },
  { name: '关兴',   tier: 'R', attack: 76, defense: 70, loyalty: 90, cost: 190 },
  { name: '张苞',   tier: 'R', attack: 75, defense: 68, loyalty: 88, cost: 180 },
  { name: '乐进',   tier: 'R', attack: 75, defense: 72, loyalty: 85, cost: 190 },
  { name: '马岱',   tier: 'R', attack: 74, defense: 72, loyalty: 87, cost: 180 },
  { name: '文聘',   tier: 'R', attack: 74, defense: 72, loyalty: 84, cost: 180 },
  { name: '陈到',   tier: 'R', attack: 74, defense: 76, loyalty: 90, cost: 200 },
  { name: '曹洪',   tier: 'R', attack: 73, defense: 70, loyalty: 80, cost: 170 },
  { name: '徐盛',   tier: 'R', attack: 72, defense: 74, loyalty: 83, cost: 170 },
  { name: '周仓',   tier: 'R', attack: 72, defense: 70, loyalty: 95, cost: 150 },
  { name: '严颜',   tier: 'R', attack: 72, defense: 72, loyalty: 89, cost: 170 },
  { name: '丁奉',   tier: 'R', attack: 73, defense: 68, loyalty: 82, cost: 160 },
  { name: '王平',   tier: 'R', attack: 70, defense: 74, loyalty: 88, cost: 160 },
  { name: '李典',   tier: 'R', attack: 70, defense: 73, loyalty: 85, cost: 160 },
  { name: '廖化',   tier: 'R', attack: 68, defense: 66, loyalty: 90, cost: 120 },
  { name: '凌统',   tier: 'R', attack: 76, defense: 70, loyalty: 85, cost: 180 },
  { name: '潘凤',   tier: 'R', attack: 80, defense: 50, loyalty: 60, cost: 150 },
];

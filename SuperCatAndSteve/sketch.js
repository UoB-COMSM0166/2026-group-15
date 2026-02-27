// ====== 常量定义 ======
const WORLD_WIDTH = 1920;
const CANVAS_W = 640;
const CANVAS_H = 360;
const TILE_SIZE = 32;
const TERRAIN_COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
const INVENTORY_SLOTS = 6;
const HINT_CAT_DELAY_MS = 500;
const HINT_CAT_GAP = 8;
const MINE_PRESS_MS = 500;  // 长按多久后破坏方块
const ATTACK_COOLDOWN_MS = 400;  // 攻击冷却
const PLAYER_ATTACK_RANGE = 48;   // 玩家可攻击敌人的距离（鼠标点击时）
const ENEMY_DAMAGE_RANGE = 32;    // 敌人可伤害玩家的距离（≤此距离时每 1 秒扣 1 生命）
const ENEMY_CONTACT_DAMAGE_INTERVAL_MS = 1000;

// 贴图类型（地面/平台可选 assets/pic/ground 中任意图片）
const T = {
  NONE: 0,
  GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4,
  COPPER: 5, DEEP_COPPER: 6, DEEP_DIAMOND: 7, DEEP_GOLD: 8, DEEP_IRON: 9,
  DIAMOND: 10, GOLD: 11, IRON: 12,  LAVA: 13, ACID: 14, WATER: 15
};

// UI 常量
const SLOT_SIZE = 24, SLOT_GAP = 8, INV_BAR_W = 200, INV_BAR_H = 40, INV_PADDING = 8;
const MAX_HEARTS = 10, HEART_SIZE = 20;

// 手持武器绘制：大小固定 24×24，偏移量相对玩家贴图（朝右时 +X 向右、+Y 向下；朝左时镜像）
const WEAPON_DRAW_SIZE = 24;
const WEAPON_OFFSET_X = 18;   // 相对手部基准的 x 偏移，可调
const WEAPON_OFFSET_Y = -12;  // 相对手部基准的 y 偏移，可调

// ====== 工具函数 ======
function rectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// 贴图和回退颜色映射（与 T 对应，来自 assets/pic/ground）
function getTextures() {
  return {
    [T.GRASS]: window.tile_grass_block_side,
    [T.DIRT]: window.tile_dirt,
    [T.STONE]: window.tile_stone,
    [T.DEEP]: window.tile_deepslate,
    [T.COPPER]: window.tile_copper_ore,
    [T.DEEP_COPPER]: window.tile_deepslate_copper_ore,
    [T.DEEP_DIAMOND]: window.tile_deepslate_diamond_ore,
    [T.DEEP_GOLD]: window.tile_deepslate_gold_ore,
    [T.DEEP_IRON]: window.tile_deepslate_iron_ore,
    [T.DIAMOND]: window.tile_diamond_ore,
    [T.GOLD]: window.tile_gold_ore,
    [T.IRON]: window.tile_iron_ore,
    [T.LAVA]: window.tile_lava,
    [T.ACID]: window.tile_acid,
    [T.WATER]: window.tile_water
  };
}
const FALLBACK_COLORS = {
  [T.GRASS]: [100, 180, 100], [T.DIRT]: [139, 90, 43], [T.STONE]: [128, 128, 128], [T.DEEP]: [80, 80, 80],
  [T.COPPER]: [180, 100, 80], [T.DEEP_COPPER]: [100, 70, 60], [T.DEEP_DIAMOND]: [80, 180, 220],
  [T.DEEP_GOLD]: [200, 160, 60], [T.DEEP_IRON]: [160, 140, 120], [T.DIAMOND]: [100, 200, 230],
  [T.GOLD]: [220, 180, 50], [T.IRON]: [180, 160, 140], [T.LAVA]: [255, 80, 0],[T.ACID]: [120, 255, 120],
  [T.WATER]: [80, 140, 255]
};

function drawTile(tileType, x, y) {
  const img = getTextures()[tileType];
  if (img && img.width > 0) {
    image(img, x, y, TILE_SIZE, TILE_SIZE);
  } else {
    const c = FALLBACK_COLORS[tileType] || [80, 80, 80];
    fill(c[0], c[1], c[2]);
    rect(x, y, TILE_SIZE, TILE_SIZE);
  }
}

// ====== Game 类 ======
let game;

class Game {
  constructor() {
    this.level = new ForestLevel();
    this.level.loadAssets();
    //this.player = new Player(80, 60); 
    this.uiManager = new UIManager();
    this.playerHistory = [];
    this.cameraX = 0;
    this.mouseDownTime = 0;
    this.lastAttackTime = 0;
    this.lastEnemyContactDamageTime = 0;  // 上次因接触敌人扣血的时间
    //游戏状态：start playing gameover victory
    this.state = "start";
  }

  setup() { 
    const groundY = this.level.terrainHeights[0];
    this.player = new Player(80, groundY - 64);
   }

  update() {
    this.player.update(this.level.platforms);
    this.updateCamera();
    this.updateHintCat();
    // 更新所有带 update 方法的物体（比如 TNT）
    const now = millis();
    for (const item of this.level.items) {
     if (typeof item.update === "function") {
      item.update(now, this.player);
     }
   }
    this.checkCollisions();
    this.updateMining();

  // ===== Hazard pools: lava / acid with conversion =====
const colUnder = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
const rowUnder = this.getPlayerTerrainRow(colUnder);

if (colUnder >= 0 && colUnder < TERRAIN_COLS && rowUnder >= 0) {
  const t = this.level.tileMap[colUnder]?.[rowUnder];


  // LAVA -> STONE（需要 enlarged_water_bucket）
  if (t === T.LAVA) {
  // 不再自动变石头
  this.player.health = 0;
}
else if (t === T.ACID) {
  this.player.health = 0;
}

  // ACID -> WATER（需要 limestone）
  else if (t === T.ACID) {
    if (this.hasTool('limestone')) {
      this.level.tileMap[colUnder][rowUnder] = T.WATER;
      this.consumeTool('limestone');
    } else {
      this.player.health = 0;
    }
  }
}



    if (this.player.health <= 0) {
      this.state = "gameover";
    }
    // 胜利条件：收集到 2 分
      if (this.player.score >= 2) this.state = "victory";
  }

  /** 获取玩家脚下所在的地形行（列 col 的表面起算） */
  getPlayerTerrainRow(col) {
    const surfaceY = this.level.terrainHeights[col];
    if (surfaceY === undefined) return -1;
    const feetY = this.player.y + this.player.h;
    const row = Math.floor((feetY - surfaceY) / TILE_SIZE);
    return row;
  }

  /** 统一触及范围：身前2格、身后2格、头顶1格、脚下1格（世界坐标矩形） */
  getReachZone() {
    const px = this.player.x, py = this.player.y, pw = this.player.w, ph = this.player.h;
    return {
      left: px - TILE_SIZE,
      right: px + pw + TILE_SIZE,
      top: py - TILE_SIZE,
      bottom: py + ph + TILE_SIZE
    };
  }

  /** 矩形 (x,y,w,h) 是否与触及范围相交 */
  isInReachZone(x, y, w, h) {
    const z = this.getReachZone();
    return rectCollision(x, y, w, h, z.left, z.top, z.right - z.left, z.bottom - z.top);
  }

  /** 获取处于触及范围内的所有地形格 (col, row) */
  getMineableTiles() {
    const z = this.getReachZone();
    const out = [];
    const colMin = Math.max(0, Math.floor(z.left / TILE_SIZE));
    const colMax = Math.min(TERRAIN_COLS - 1, Math.floor((z.right - 1) / TILE_SIZE));
    for (let col = colMin; col <= colMax; col++) {
      const surfaceY = this.level.terrainHeights[col];
      if (surfaceY === undefined) continue;
      const rowMin = Math.max(0, Math.floor((z.top - surfaceY) / TILE_SIZE));
      const rowMax = Math.floor((z.bottom - 1 - surfaceY) / TILE_SIZE);
      for (let row = rowMin; row <= rowMax; row++) {
        if (!this.level.terrainBlocks[col]?.[row]) continue;
        out.push({ col, row });
      }
    }
    return out;
  }

  /** 世界坐标 (wx, wy) 是否在格子 (col, row) 内 */
  isPointInTerrainTile(wx, wy, col, row) {
    const surfaceY = this.level.terrainHeights[col];
    if (surfaceY === undefined) return false;
    const tx = col * TILE_SIZE;
    const ty = surfaceY + row * TILE_SIZE;
    return wx >= tx && wx < tx + TILE_SIZE && wy >= ty && wy < ty + TILE_SIZE;
  }

  updateMining() {
    if (!mouseIsPressed) {
      this.mouseDownTime = 0;
      return;
    }
    const now = millis();
    if (this.mouseDownTime === 0) this.mouseDownTime = now;
    if (now - this.mouseDownTime < MINE_PRESS_MS) return;

    const worldX = mouseX + this.cameraX;
    const worldY = mouseY;
    const candidates = this.getMineableTiles();

    for (const t of candidates) {
      if (!this.isPointInTerrainTile(worldX, worldY, t.col, t.row)) continue;
      const tileType = this.level.tileMap[t.col][t.row];
      this.level.removeTerrainBlock(t.col, t.row);
      this.tryWeaponUpgrade(tileType);
      this.mouseDownTime = 0;
      return;
    }
    // 浮空平台：鼠标指向的格子在触及范围内则可挖
    for (let i = this.level.platforms.length - 1; i >= 0; i--) {
      const p = this.level.platforms[i];
      if (!p._floating) continue;
      if (worldX < p.x || worldX >= p.x + p.w || worldY < p.y || worldY >= p.y + p.h) continue;
      if (!this.isInReachZone(p.x, p.y, p.w, p.h)) continue;
      const tileType = p._tileType;
      this.level.platforms.splice(i, 1);
      this.tryWeaponUpgrade(tileType);
      this.mouseDownTime = 0;
      return;
    }
  }

  updateCamera() {
    const halfW = CANVAS_W / 2;
    if (this.player.x < halfW) this.cameraX = 0;
    else if (this.player.x > WORLD_WIDTH - halfW) this.cameraX = WORLD_WIDTH - CANVAS_W;
    else this.cameraX = this.player.x - halfW;
  }

  updateHintCat() {
    this.playerHistory.push({ x: this.player.x, y: this.player.y, h: this.player.h, facingRight: this.player.facingRight, t: millis() });
    const cutoff = millis() - HINT_CAT_DELAY_MS - 50;
    while (this.playerHistory.length && this.playerHistory[0].t < cutoff) this.playerHistory.shift();
    this.level.hintCat.follow(this.getDelayedState());
  }

  getDelayedState() {
    const targetT = millis() - HINT_CAT_DELAY_MS;
    if (!this.playerHistory.length) return { x: this.player.x, y: this.player.y, h: this.player.h, facingRight: this.player.facingRight };
    let best = this.playerHistory[0];
    for (let s of this.playerHistory) {
      if (s.t <= targetT) best = s; else break;
    }
    return best;
  }

  /** 玩家当前攻击力：手持武器的伤害，无武器为 1 */
  getAttackDamage() {
    const w = this.player.equippedWeaponType;
    return (WEAPON_CONFIG[w] && WEAPON_CONFIG[w].damage) || 1;
  }

  /** 挖掘到矿石时若对应武器更高级则升级手持武器 */
  tryWeaponUpgrade(tileType) {
    const weapon = ORE_TO_WEAPON[tileType];
    if (!weapon) return;
    const currentTier = WEAPON_TIER[this.player.equippedWeaponType] || 0;
    const newTier = WEAPON_TIER[weapon] || 0;
    if (newTier > currentTier) this.player.equippedWeaponType = weapon;
  }

  hasTool(toolType) {
  return this.player.inventory.some(
    it => it instanceof Tool && it.toolType === toolType
  );
}

consumeTool(toolType) {
  const idx = this.player.inventory.findIndex(
    it => it instanceof Tool && it.toolType === toolType
  );
  if (idx !== -1) {
    this.player.inventory.splice(idx, 1);
  }
}

  /** 玩家与敌人的中心距离 */
  distanceToEnemy(enemy) {
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    const ex = enemy.x + enemy.w / 2;
    const ey = enemy.y + enemy.h / 2;
    return Math.sqrt((px - ex) ** 2 + (py - ey) ** 2);
  }

  /** 按 F 键攻击：对距离 ≤ PLAYER_ATTACK_RANGE 的最近敌人造成一次伤害 */
  tryAttack() {
    const now = millis();
    if (now - this.lastAttackTime < ATTACK_COOLDOWN_MS) return;
    const dmg = this.getAttackDamage();
    if (dmg <= 0) return;
    let closest = null;
    let closestDist = PLAYER_ATTACK_RANGE + 1;
    for (const enemy of this.level.enemies) {
      if (enemy.isDead) continue;
      const d = this.distanceToEnemy(enemy);
      if (d <= PLAYER_ATTACK_RANGE && d < closestDist) {
        closestDist = d;
        closest = enemy;
      }
    }
    if (closest) {
      closest.takeDamage(dmg);
      this.lastAttackTime = now;
    }
  }

handleMousePressed(mx, my) {
  const slotIndex = this.getInventorySlotAt(mx, my);
  if (slotIndex === -1) return;

  // 记录选中的格子
  this.player.selectedSlot = slotIndex;

  const item = this.player.inventory[slotIndex];
  if (!item) return;

  // 只处理工具类
  if (item instanceof Tool) {
    // 点击的是水桶：尝试倒水（成功才消耗）
    if (item.toolType === 'enlarged_water_bucket') {
      const ok = this.tryUseWaterBucket();
    }
    // 点击的是石灰石：后面做 acid 时再加
    if (item.toolType === 'limestone') {
      this.tryUseLimestone();
    }
    console.log("clicked", item, item instanceof Tool ? item.toolType : null);

  }
}

getInventorySlotAt(mx, my) {
  // 复用你们 UIManager.drawHUD 里背包的计算方式
  const invX = (width - INV_BAR_W) / 2;
  const invY = height - INV_BAR_H - 12;

  // 点击区域只算背包内部 6 个格子
  const y0 = invY + INV_PADDING;
  const y1 = y0 + SLOT_SIZE;
  if (my < y0 || my > y1) return -1;

  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    const x0 = invX + INV_PADDING + i * (SLOT_SIZE + SLOT_GAP);
    const x1 = x0 + SLOT_SIZE;
    if (mx >= x0 && mx <= x1) return i;
  }
  return -1;
}

tryUseWaterBucket() {
  // 玩家脚底中心点（世界坐标）
  const wx = this.player.x + this.player.w / 2;
  const wy = this.player.y + this.player.h - 1;

  // 我们检查：脚下这一列，以及右边一列（两格池）
  const cols = [
    Math.floor(wx / TILE_SIZE),
    Math.floor((wx + TILE_SIZE) / TILE_SIZE)
  ];

  for (const col of cols) {
    if (col < 0 || col >= TERRAIN_COLS) continue;

    const surfaceY = this.level.terrainHeights[col];
    if (surfaceY === undefined) continue;

    // 关键：根据世界坐标 wy 反推 row（地表起算）
    const row = Math.floor((wy - surfaceY) / TILE_SIZE);

    // 同时检查 row 和 row+1（有的池子在坑里会低一格）
    const rows = [row, row + 1];

    for (const r of rows) {
      const t = this.level.tileMap[col]?.[r];
      if (t === T.LAVA) {
  // 1) 当前命中的 lava → stone
  this.level.tileMap[col][r] = T.STONE;

  // 2) 右边一格（同一行）如果也是 lava，也一起变 stone
  const rightCol = col + 1;
  if (rightCol >= 0 && rightCol < TERRAIN_COLS) {
    // 优先同一 row，再兜底 row+1（坑深一格时）
    if (this.level.tileMap[rightCol]?.[r] === T.LAVA) {
      this.level.tileMap[rightCol][r] = T.STONE;
    } else if (this.level.tileMap[rightCol]?.[r + 1] === T.LAVA) {
      this.level.tileMap[rightCol][r + 1] = T.STONE;
    }
  }

  // 3) 消耗选中的水桶（从背包移除）
  const s = this.player.selectedSlot;
  if (s >= 0 && s < this.player.inventory.length) {
    const item = this.player.inventory[s];
    if (item instanceof Tool && item.toolType === 'enlarged_water_bucket') {
      this.player.inventory.splice(s, 1);
      this.player.selectedSlot = -1;
    }
  }
  return true;
    }
    }
  }

  return false;
}

tryUseLimestone() {
  // 以玩家脚下附近为中心，扫描一个小范围内的 ACID 并全部转化成 WATER
  const wx = this.player.x + this.player.w / 2;
  const wy = this.player.y + this.player.h - 1;

  const baseCol = Math.floor(wx / TILE_SIZE);

  // 左右多扫几列，保证站在池边也能命中（你池子在 21/22/23，玩家常站 20）
  const cols = [baseCol - 1, baseCol, baseCol + 1, baseCol + 2,baseCol + 3];

  let changed = 0;

  for (const col of cols) {
    if (col < 0 || col >= TERRAIN_COLS) continue;

    const surfaceY = this.level.terrainHeights[col];
    if (surfaceY === undefined) continue;

    const row = Math.floor((wy - surfaceY) / TILE_SIZE);

    // 上下多扫几行，避免池子“垫高/加深”后 row 对不上
    const rows = [row - 1, row, row + 1, row + 2];

    for (const r of rows) {
      if (r < 0) continue;

      const t = this.level.tileMap[col]?.[r];
      if (t === T.ACID) {
        this.level.tileMap[col][r] = T.WATER;
        changed++;
      }
    }
  }

  // 只要转化过至少 1 格，就消耗一次 limestone
  if (changed > 0) {
    const s = this.player.selectedSlot;
    if (s >= 0 && s < this.player.inventory.length) {
      const item = this.player.inventory[s];
      if (item instanceof Tool && item.toolType === 'limestone') {
        this.player.inventory.splice(s, 1);
        this.player.selectedSlot = -1;
      }
    }
    return true;
  }

  return false;
}

  checkCollisions() {
    const now = millis();
    for (const enemy of this.level.enemies) {
      if (enemy.isDead) continue;
      if (this.distanceToEnemy(enemy) > ENEMY_DAMAGE_RANGE) continue;
      if (now - this.lastEnemyContactDamageTime < ENEMY_CONTACT_DAMAGE_INTERVAL_MS) break;
      this.player.takeDamage(1);
      this.lastEnemyContactDamageTime = now;
      break;
    }
for (let i = this.level.items.length - 1; i >= 0; i--) {
  const item = this.level.items[i]; 
// TNT 爆炸后延迟移除
if (item instanceof TNT && item.exploded && millis() >= item.removeAfter) {
  this.level.items.splice(i, 1);
  continue;
}
  if (this.player.collidesWith(item)) {

    // 先判断 TNT
    if (item instanceof TNT) {
      item.arm(millis());
      continue;   // 关键：不执行下面的 collect 和移除
    }

    // 普通污染物
    if (item instanceof Pollutant) {
      this.player.score += 1;
      console.log("得分！当前总分:", this.player.score);
    }
    
    this.player.collect(item);
    this.level.items.splice(i, 1);
  }
}
  }

  draw() {
    background(168, 193, 254);
    push();
    translate(-this.cameraX, 0);
    this.level.draw();
    this.level.hintCat.draw();
    this.player.draw();
    pop();
    this.uiManager.drawHUD(this.player);
  }
}

// ====== Level 类 ======
class Level {
  constructor() {
    this.platforms = [];
    this.enemies = [];
    this.items = [];
    this.hintCat = new HintCat(32, 48);
    this.terrainHeights = [];
    this.tileMap = Array.from({ length: TERRAIN_COLS }, () => []);
    this.terrainBlocks = Array.from({ length: TERRAIN_COLS }, () => []);  // [col][row] = Platform
    this.pollutants = []; 
  }
  loadAssets() {}
  draw() {}
  /** 移除地形方块（挖掘） */
  removeTerrainBlock(col, row) {
    if (col < 0 || col >= TERRAIN_COLS) return false;
    if (!this.terrainBlocks[col][row]) return false;
    const platform = this.terrainBlocks[col][row];
    const i = this.platforms.indexOf(platform);
    if (i >= 0) this.platforms.splice(i, 1);
    this.tileMap[col][row] = T.NONE;
    this.terrainBlocks[col][row] = null;
    return true;
  }
}

class ForestLevel extends Level {
  loadAssets() {
    // 贴图简写（pic/ground 中全部可用）: G草 D土 S石 X深板岩 | COPPER铜 DIAMOND钻石 GOLD金 IRON铁 | DEEP_COPPER/GOLD/IRON/DIAMOND 深板岩矿
    const G = T.GRASS, D = T.DIRT, S = T.STONE, X = T.DEEP;
    const Cu = T.COPPER, CuX = T.DEEP_COPPER, Dx = T.DEEP_DIAMOND, Gx = T.DEEP_GOLD, Ix = T.DEEP_IRON;
    const Di = T.DIAMOND, Go = T.GOLD, Ir = T.IRON;

    // 地形定义：addTerrainColumn(列号, 高度, [贴图])
    const terrain = [
      [0,5,[G,S,S,X,X]], [1,5,[G,Ir,S,X,X]], [2,5,[G,D,S,X,X]], [3,4,[G,S,S,X]], [4,4,[G,D,S,X]],
      [5,4,[G,D,S,X]], [6,3,[S,S,X]], [7,3,[S,S,X]], [8,2,[S,X]], [9,2,[T.LAVA]],, [10,2,[T.LAVA]],
      [11,3,[S,S,X]], [12,3,[S,Ir,X]], [13,3,[G,S,X]], [14,3,[G,S,X]], [15,3,[G,S,X]],
      [16,4,[G,D,S,X]], [17,4,[G,S,S,X]], [18,4,[G,S,S,X]], [19,4,[G,D,S,X]],
      [20,3,[D,D,S]], [21,2,[T.ACID,S]], [22,2,[T.ACID,S]], [23,2,[T.ACID,S]], [24,3,[D,Ir,X]],
      [25,4,[G,D,S,X]], [26,5,[G,D,S,X,X]], [27,6,[G,D,S,S,X,X]], [28,6,[G,D,S,X,X,X]],
      [29,6,[G,D,S,S,X,X]], [30,5,[G,D,S,Ir,X]], [31,4,[G,D,S,X]], [32,3,[G,D,S]], [33,3,[G,D,S]],
      [34,3,[G,D,S]], [35,2,[G,D]], [36,2,[G,D]], [37,2,[G,D]], [38,3,[G,D,S]], [39,4,[G,D,S,X]],
      [40,4,[G,D,S,S]], [41,4,[G,D,S,X]], [42,4,[G,D,Dx,S]], [43,3,[G,D,S]], [44,2,[G,D]],
      [45,2,[G,D]], [46,2,[G,D]], [47,2,[G,D]], [48,1,[G]], [49,1,[G]], [50,2,[G,D]], [51,2,[G,D]],
      [52,3,[G,D,S]], [53,4,[G,D,S,X]], [54,4,[G,D,Di,S]], [55,3,[G,D,S]], [56,3,[G,D,S]],
      [57,3,[G,D,S]], [58,3,[G,D,S]], [59,3,[G,D,S]]
    ];
    terrain.forEach(([col, h, tiles]) => this.addTerrainColumn(col, h, tiles));

    // 浮空平台：addFloatingPlatform(列号, 距底部格数, [贴图])
    const p1 = this.addFloatingPlatform(11, 6, [G]);
    const p2 = this.addFloatingPlatform(12, 5, [G, D]);
    const p3 = this.addFloatingPlatform(13, 5, [G, D]);
    const p4 = this.addFloatingPlatform(14, 5, [G, S]);
    const p5 = this.addFloatingPlatform(15, 6, [G]);
    const p6 = this.addFloatingPlatform(18, 7, [G]);
    const p7 = this.addFloatingPlatform(19, 7, [G]);
    const p8 = this.addFloatingPlatform(20, 7, [G]);
    const p9 = this.addFloatingPlatform(21, 7, [G]);
    const p10 = this.addFloatingPlatform(22, 7, [G]);
    const p11 = this.addFloatingPlatform(23, 7, [G]);

    // 辅助函数：获取地面 y 坐标
    const groundY = (col) => this.terrainHeights[col];

    // 敌人（僵尸 64x64）
    this.enemies.push(new Enemy(p7.x - 16, p7.y - 64, 64, 64));
    this.enemies.push(new Enemy(p11.x - 16, p11.y - 64, 64, 64));
    this.enemies.push(new Enemy(17 * TILE_SIZE, groundY(17) - 64, 64, 64));  // 第17列地面

    // 污染物（平台上 + 地面上）
    //this.items.push(new Pollutant(450, groundY(15) - 30, 24, 18,"cigarette"));
    //this.items.push(new Pollutant(600, groundY(17) - 30, 24, 18,"plastic_bottle"));
    this.items.push(new Pollutant(p1.x + 4, p1.y - 18, 24, 18, "cigarette"));           // 平台
    this.items.push(new Pollutant(36 * TILE_SIZE + 4, groundY(36) - 18, 24, 18, "cigarette")); // 地面 col 36
    this.items.push(new Pollutant(48 * TILE_SIZE + 4, groundY(48) - 18, 24, 18, "plastic_bottle")); // 地面 col 48
    this.items.push(new TNT(7 * TILE_SIZE - 30,groundY(7) - 18,24,18));
    this.items.push(new Pollutant(200, groundY(10) - TILE_SIZE, "cigarette", 1));
    this.items.push(new Pollutant(400, groundY(20) - TILE_SIZE, "plastic_bottle", 1));

    // 工具（平台上 + 地面上，居中放置）Tool(x, y, w, h, toolType)
    // toolType 为 pic/tool 下文件名不含 .png，如 'scissor' 'bucket'
    const toolOffset = (TILE_SIZE - 24) / 2;
    this.items.push(new Tool(p3.x + toolOffset, p3.y - 24, 24, 24, 'scissor'));
    this.items.push(new Tool(8 * TILE_SIZE + toolOffset, groundY(8) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(32 * TILE_SIZE + toolOffset, groundY(32) - 24, 24, 24, 'scissor'));
    this.items.push(new Tool(55 * TILE_SIZE + toolOffset, groundY(55) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(14 * TILE_SIZE + toolOffset, groundY(14) - 24, 24, 24, 'limestone'));
  }

  addTerrainColumn(col, heightTiles, tiles) {
    const surfaceY = 360 - heightTiles * TILE_SIZE;
    this.terrainHeights[col] = surfaceY;
    for (let row = 0; row < heightTiles; row++) {
      this.tileMap[col][row] = tiles[row] || T.DEEP;
      const platform = new Platform(col * TILE_SIZE, surfaceY + row * TILE_SIZE, TILE_SIZE, TILE_SIZE, true);
      platform._col = col;
      platform._row = row;
      this.platforms.push(platform);
      this.terrainBlocks[col][row] = platform;
    }
  }

  addFloatingPlatform(col, bottomTiles, tiles) {
    const h = tiles.length * TILE_SIZE;
    const baseY = 360 - bottomTiles * TILE_SIZE - h;
    let firstPlatform = null;
    for (let i = 0; i < tiles.length; i++) {
      const platform = new Platform(col * TILE_SIZE, baseY + i * TILE_SIZE, TILE_SIZE, TILE_SIZE, false);
      platform._floating = true;
      platform._tileType = tiles[i];
      this.platforms.push(platform);
      if (i === 0) firstPlatform = platform;
    }
    return firstPlatform;
  }

  draw() {
    // 绘制地形（T.NONE 不绘制）
    for (let col = 0; col < TERRAIN_COLS; col++) {
      const surfaceY = this.terrainHeights[col];
      if (surfaceY === undefined) continue;
      for (let row = 0; row < (this.tileMap[col]?.length || 0); row++) {
        const type = this.tileMap[col][row];
        if (type === T.NONE || type === undefined) continue;
        drawTile(type, col * TILE_SIZE, surfaceY + row * TILE_SIZE);
      }
    }
    // 绘制浮空平台、敌人、物品（生命值≤0 的敌人不绘制，已在 checkCollisions 中从列表移除）
    this.platforms.filter(p => !p.isTerrain).forEach(p => p.draw());
    this.enemies.filter(e => !e.isDead).forEach(e => e.draw());
    this.items.forEach(it => it.draw());
  }
}

// ====== Platform 类 ======
class Platform {
  constructor(x, y, w, h, isTerrain = false) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.isTerrain = isTerrain;
  }

  draw() {
    if (this._tileType !== undefined) {
      drawTile(this._tileType, this.x, this.y);
    } else if (this.tiles) {
      this.tiles.forEach((t, i) => drawTile(t, this.x, this.y + i * TILE_SIZE));
    } else {
      const img = window.grassBlock;
      if (img && img.width > 0) {
        for (let y = this.y; y < this.y + this.h; y += TILE_SIZE)
          for (let x = this.x; x < this.x + this.w; x += TILE_SIZE)
            image(img, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        fill(120, 80, 40);
        rect(this.x, this.y, this.w, this.h);
      }
    }
  }
}

// ====== Player 类 ======
class Player {
  constructor(x, y) {
    Object.assign(this, { x, y, w: 32, h: 64, vx: 0, vy: 0, speed: 2, jumpForce: -6.32, gravity: 0.5, onGround: false, maxHealth: 10, health: 10, inventory: [], facingRight: true });
    this.equippedWeaponType = 'wooden_sword';  // 手持武器，通过挖掘对应矿石升级
    this.score = 0;
    this.selectedSlot = -1;   // 当前鼠标选中的背包格子
  }

  update(platforms) {
    this.vx = 0;
    if (keyIsDown(LEFT_ARROW)) this.vx = -this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.vx = this.speed;
    if (this.vx !== 0) this.facingRight = this.vx > 0;
    this.vy += this.gravity;

    this.x += this.vx;
    this.resolveCollision(platforms, true);
    this.x = constrain(this.x, 0, WORLD_WIDTH - this.w);

    this.y += this.vy;
    this.onGround = false;
    this.resolveCollision(platforms, false);
  }

  resolveCollision(platforms, horizontal) {
    for (let p of platforms) {
      if (rectCollision(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) {
        if (horizontal) {
          this.x = this.vx > 0 ? p.x - this.w : p.x + p.w;
          this.vx = 0;
        } else {
          if (this.vy > 0) { this.y = p.y - this.h; this.onGround = true; }
          else if (this.vy < 0) this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }
  }

  jump() { if (this.onGround) { this.vy = this.jumpForce; this.onGround = false; } }
  collidesWith(obj) { return rectCollision(this.x, this.y, this.w, this.h, obj.x, obj.y, obj.w, obj.h); }
  collect(item) { if (this.inventory.length < INVENTORY_SLOTS) this.inventory.push(item); }
  takeDamage(amount) { this.health = max(0, this.health - amount); }

  draw() {
    const img = this.facingRight ? window.alexSpriteRight : window.alexSpriteLeft;
    const offsetY = 0;
    if (img && img.width > 0) image(img, this.x, this.y + offsetY, this.w, this.h);
    else { fill(50, 100, 255); rect(this.x, this.y, this.w, this.h); }
    // 手持武器：24×24，位置由 WEAPON_OFFSET_X/Y 相对玩家贴图微调
    if (this.equippedWeaponType) {
      const weaponImg = window['weapon_' + this.equippedWeaponType];
      const S = WEAPON_DRAW_SIZE;
      const baseY = this.y + this.h * 0.45;
      const baseXRight = this.x + this.w - S;
      const baseXLeft = this.x;
      const drawX = this.facingRight ? baseXRight + WEAPON_OFFSET_X : baseXLeft + WEAPON_OFFSET_X;
      const drawY = baseY + WEAPON_OFFSET_Y;
      if (weaponImg && weaponImg.width > 0) {
        push();
        if (this.facingRight) {
          image(weaponImg, drawX, drawY, S, S);
        } else {
          translate(drawX + S, drawY);
          scale(-1, 1);
          image(weaponImg, 0, 0, S, S);
        }
        pop();
      } else {
        fill(180, 120, 80);
        rect(drawX, drawY, S, S);
      }
    }
  }
}

// ====== Enemy / Item / Pollutant 类 ======
const ENEMY_DEFAULT_HEALTH = 5;

class Enemy {
  constructor(x, y, w, h, health = ENEMY_DEFAULT_HEALTH) {
    Object.assign(this, { x, y, w, h, health, maxHealth: health });
  }
  takeDamage(amount) {
    this.health = max(0, this.health - amount);
  }
  get isDead() { return this.health <= 0; }
  draw() {
    const img = window.zombieSprite;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(200, 50, 50); rect(this.x, this.y, this.w, this.h); }
  }
}

class Item {
  constructor(x, y, w, h, sprite) { Object.assign(this, { x, y, w, h, sprite }); }
  draw() {
    if (this.sprite) image(this.sprite, this.x, this.y, this.w, this.h);
    else { fill(255, 255, 0); rect(this.x, this.y, this.w, this.h); }
  }
}

class Pollutant extends Item {

   constructor(x, y, w, h, type) {
    super(x, y, w, h, null);
    this.type = type;
    this.value = 1;
  }

  draw() {
    if (this.collected) return;
    // 每一帧绘制时尝试获取最新的图片资源
    let currentSprite = window[this.type]; 
    
    if (currentSprite && currentSprite.width > 0) {
      image(currentSprite, this.x, this.y, this.w, this.h);
    } else {
      // 备选方案：如果图片没加载出来，画个色块
      fill(100, 200, 100);
      rect(this.x, this.y, this.w, this.h);
    }
  }

}

class TNT extends Pollutant {
  constructor(x, y, w = 24, h = 18) {
    super(x, y, w, h, "tnt");

    // 状态
    this.armed = false;       // 是否已被触发（开始倒计时）
    this.exploded = false;    // 是否已爆炸
    this.armTime = 0;         // 触发时刻（millis）
    this.removeAfter = 0;     // 爆炸后多久移除（合并时用）

    // 参数（先写死在类里，避免和组员全局常量冲突）
    this.fuseMs = 2000;       // 2 秒后爆炸
    this.blastRadius = 80;    // 爆炸范围（像素）
    this.damage = 3;         // 伤害（玩家 maxHealth=10，10=直接秒杀）
    this.postExplodeMs = 300; // 爆炸圈显示 0.3s
  }

  // 玩家第一次碰到时调用：开始倒计时（不要反复重置）
  arm(now) {
    if (this.armed || this.exploded) return;
    this.armed = true;
    this.armTime = now;
  }

  // 每帧更新：先留空，下一段我们加“到点爆炸”
  update(now, player) {
  // 还没触发或已经爆炸：不做事
  if (!this.armed || this.exploded) return;

  // 到点爆炸
  if (now - this.armTime >= this.fuseMs) {
    this.explode(now, player);
  }
}

explode(now, player) {
  if (this.exploded) return;
  this.exploded = true;
  this.removeAfter = now + this.postExplodeMs;

  // 计算玩家是否在爆炸范围内（中心点距离）
  const tx = this.x + this.w / 2;
  const ty = this.y + this.h / 2;
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const d = Math.hypot(px - tx, py - ty);

  if (d <= this.blastRadius) {
    player.takeDamage(this.damage);
  }
}

draw() {
  if (this.exploded) {
  return;   // 不画任何东西
}

  // 点燃后：闪烁（每 100ms 变暗一次）
  if (this.armed) {
    const blink = Math.floor(millis() / 100) % 2 === 0;
    if (blink) {
      push();
      tint(255, 90);
    }
    // 按你们现有方式取贴图：window['tnt']
    const img = window[this.type];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 0, 0); rect(this.x, this.y, this.w, this.h); }
    if (blink) pop();
    return;
  }

  // 未触发：正常显示
  const img = window[this.type];
  if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
  else { fill(255, 0, 0); rect(this.x, this.y, this.w, this.h); }
}

}


class Tool extends Item {
  constructor(x, y, w = 24, h = 24, toolType = 'scissor') {
    super(x, y, w, h, null);
    this.displayName = '工具';
    this.toolType = toolType;  // 对应 pic/tool 下文件名（不含 .png）
  }
  draw() {
    const img = window['tool_' + this.toolType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(100, 150, 255); rect(this.x, this.y, this.w, this.h); }
  }
}

// 武器威力与对应矿石（贴图名 assets/pic/weapon 与 assets/pic/ground）
const WEAPON_CONFIG = {
  wooden_sword:  { damage: 2, oreTiles: [] },
  stone_sword:   { damage: 3, oreTiles: [T.DEEP, T.STONE] },
  iron_sword:    { damage: 4, oreTiles: [T.DEEP_IRON, T.IRON] },
  diamond_sword: { damage: 5, oreTiles: [T.DEEP_DIAMOND, T.DIAMOND] }
};
const WEAPON_TIER = { wooden_sword: 1, stone_sword: 2, iron_sword: 3, diamond_sword: 4 };
// 矿石贴图类型 -> 对应武器（挖掘到该矿石且该武器更高级则升级）
const ORE_TO_WEAPON = {
  [T.DEEP]: 'stone_sword', [T.STONE]: 'stone_sword',
  [T.DEEP_IRON]: 'iron_sword', [T.IRON]: 'iron_sword',
  [T.DEEP_DIAMOND]: 'diamond_sword', [T.DIAMOND]: 'diamond_sword'
};

class Weapon extends Item {
  constructor(x, y, w = 24, h = 24, weaponType = 'wooden_sword') {
    super(x, y, w, h, null);
    this.displayName = '武器';
    this.weaponType = weaponType;
    const cfg = WEAPON_CONFIG[weaponType] || WEAPON_CONFIG.wooden_sword;
    this.damage = cfg.damage;
    this.oreTiles = cfg.oreTiles;
  }
  draw() {
    const img = window['weapon_' + this.weaponType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(180, 120, 80); rect(this.x, this.y, this.w, this.h); }
  }
}

// ====== HintCat 类 ======
class HintCat {
  constructor(x, y) { Object.assign(this, { x, y, w: 32, h: 16, facingRight: true, messages: ["按 ←/→ 移动", "按空格跳跃", "收集污染物！"] }); }

  follow(state) {
    this.x = max(0, state.x - this.w - HINT_CAT_GAP);
    this.y = state.y + state.h - this.h;
    this.facingRight = state.facingRight !== false;
  }

  draw() {
    const img = this.facingRight ? window.catSpriteRight : window.catSpriteLeft;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 200, 0); rect(this.x, this.y, this.w, this.h); }
    fill(255); textSize(14);
    text(this.messages[0], this.x + this.w + 4, this.y + 8);
  }
}

// ====== UIManager 类 ======
class UIManager {
  drawHUD(player) {
    // 生命条
    const heartX = 20, heartY = 20;
    for (let i = 0; i < MAX_HEARTS; i++) {
      const x = heartX + i * HEART_SIZE;
      const container = window.heartContainer, fillImg = window.heartFill;
      if (container && container.width > 0) image(container, x, heartY, HEART_SIZE, HEART_SIZE);
      else { fill(80); rect(x, heartY, HEART_SIZE, HEART_SIZE); }
      if (i < player.health) {
        if (fillImg && fillImg.width > 0) image(fillImg, x, heartY, HEART_SIZE, HEART_SIZE);
        else { fill(200, 50, 50); rect(x + 2, heartY + 2, HEART_SIZE - 4, HEART_SIZE - 4); }
      }
    }

    // 背包
    const invX = (width - INV_BAR_W) / 2, invY = height - INV_BAR_H - 12;
    const invBg = window.invContainer;
    if (invBg && invBg.width > 0) image(invBg, invX, invY, INV_BAR_W, INV_BAR_H);
    else { fill(40, 40, 50); noStroke(); rect(invX, invY, INV_BAR_W, INV_BAR_H, 4); }

    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const x = invX + INV_PADDING + i * (SLOT_SIZE + SLOT_GAP);
      const y = invY + INV_PADDING;
      const item = player.inventory[i];
      if (item) {
        let img = item.sprite;
        if (item instanceof Tool) img = window['tool_' + item.toolType];
        if (item instanceof Weapon) img = window['weapon_' + item.weaponType];
        if (img && img.width > 0) {
          image(img, x, y, SLOT_SIZE, SLOT_SIZE);
        } else {
          if (item instanceof Pollutant) fill(100, 200, 100);
          else if (item instanceof Tool) fill(100, 150, 255);
          else if (item instanceof Weapon) fill(180, 120, 80);
          else fill(255, 255, 0);
          rect(x + 2, y + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 2);
        }
      }
    }
    // 分数显示
    fill(255);
    textSize(20);
    text("Score: " + game.player.score, 50, 50);
  }
}


// ====== p5.js 生命周期 ======
function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.elt.tabIndex = 0;
  c.elt.focus();
  c.elt.classList.add('game-canvas');
  c.elt.addEventListener('click', () => c.elt.focus());
  c.parent('game-container');

  game = new Game();
  game.setup();

  // 加载贴图
  const load = (path, key) => loadImage(path, img => window[key] = img, () => console.warn(`${path} 加载失败`));

  // 新增：污染物图片
  load('assets/pic/pollutant/cigarette.png', 'cigarette');
  load('assets/pic/pollutant/plastic_bottle.png', 'plastic_bottle');
  load('assets/pic/pollutant/tnt_side.png', 'tnt');
  // 玩家与猫（assets/pic/player_cat）
  load('assets/pic/player_cat/Alex_left.png', 'alexSpriteLeft');
  load('assets/pic/player_cat/Alex_right.png', 'alexSpriteRight');
  load('assets/pic/player_cat/cat_left.png', 'catSpriteLeft');
  load('assets/pic/player_cat/cat_right.png', 'catSpriteRight');

  // 敌人（assets/pic/enemy）
  load('assets/pic/enemy/zombie.png', 'zombieSprite');

  // 工具（assets/pic/tool 中全部，新增图片时在此数组加入文件名不含 .png）
  ['scissor', 'limestone', 'enlarged_water_bucket'].forEach(name =>load(`assets/pic/tool/${name}.png`, `tool_${name}`));
  // 武器（assets/pic/weapon，威力从低到高：wooden / stone / iron / diamond）
  ['wooden_sword', 'stone_sword', 'iron_sword', 'diamond_sword'].forEach(name => load(`assets/pic/weapon/${name}.png`, `weapon_${name}`));

  // UI 等（心形在 assets 根目录，背包在 assets/pic）
  load('assets/heart_container.png', 'heartContainer');
  load('assets/heart_fill.png', 'heartFill');
  load('assets/pic/inventory_container.png', 'invContainer');




  // 地面/平台贴图（assets/pic/ground 中全部）
  const groundTiles = [
    'grass_block_side', 'dirt', 'stone', 'deepslate',
    'copper_ore', 'deepslate_copper_ore', 'deepslate_diamond_ore', 'deepslate_gold_ore', 'deepslate_iron_ore',
    'diamond_ore', 'gold_ore', 'iron_ore','lava', 'acid', 'water'
  ];
  groundTiles.forEach(name => loadImage(`assets/pic/ground/${name}.png`, img => window[`tile_${name.replace(/-/g, '_')}`] = img, () => console.warn(`pic/ground/${name}.png 加载失败`)));
  //加载游戏开始界面
  loadImage('assets/pic/bg/startscreen.png', img => window.startBg = img, () => console.warn('加载失败'));



}

//每一帧更新游戏状态并绘制
//加入游戏状态管理：开始界面、游戏进行中、结束界面
function draw() {
  if (game.state === "start") {
    drawStartScreen();
  }
  else if (game.state === "playing") {
    game.update();
    game.draw();
      if (game.player.score >= 2) { // 假设收集2个污染物胜利
        game.state = "victory";
      }
      if (game.player.health <= 0) {
        game.state = "gameover";
      }
  }

  if (game.state === "gameover") {
    drawGameOverScreen();
  }
  if (game.state === "victory") {
    drawVictoryScreen();
  }
}

function keyPressed() {
   console.log("按键按下:", key, keyCode); // 测试用
  //按ENTER开始游戏
  if (game.state === "start" && (keyCode === ENTER ||keyCode === 13) ){
    game.state = "playing";
    return;
  }

  //游戏结束之后按ENTER重启游戏
  if ((game.state === "gameover"|| game.state === "victory") &&(keyCode === ENTER ||keyCode === 13)) {
    game.state = "playing";
    game = new Game();   // 重置
    game.setup();
    return;
  }
  if (game.state === "playing"){
      //人物控制
    if (key === ' ' || keyCode === UP_ARROW  || keyCode === 38) {
      game.player.jump();
      return false;
    }
    if (key === 'f' || key === 'F' || keyCode === 70) {
      game.tryAttack();
      return false;
    }
    if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(keyCode)) return false;
  }
}

function mousePressed() {
  

  if (!game || game.state !== "playing") return;
  if (typeof game.handleMousePressed === "function") {
    game.handleMousePressed(mouseX, mouseY);
  }
}


// ====== startscreen ======
function drawStartScreen() {
  if (window.startBg && startBg.width > 0) {
    image(startBg, 0, 0, width, height); // 填满画布
  } else {
    background(50, 50, 100); // 加载失败显示背景色
  }
  fill(255, 165, 0)
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Press ENTER to Start", width / 2, height / 2 + 50);
}

//===== gameover screen ======
function drawGameOverScreen() {
  background(0);
  fill(255, 0, 0);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("GAME OVER", width / 2, height / 2 - 40);
  textSize(20);
  fill(255);
  text("Press ENTER to Restart", width / 2, height / 2 + 20);
}


function drawVictoryScreen() {
  background(0, 100, 50); // 深绿色背景
  fill(200, 255, 150); // 浅绿色文字
  textAlign(CENTER, CENTER);
  textSize(36);
  text("Victory!", width / 2, height / 2 - 20);
  textSize(24);
  text("Press ENTER to Play Again", width / 2, height / 2 + 40);
}
// ====== 常量定义 ======
const WORLD_WIDTH = 640 * 6; // 将游戏范围限制为 6 个屏幕宽
const CANVAS_W = 640;
const CANVAS_H = 360;
const TILE_SIZE = 32;
const TERRAIN_COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
const INVENTORY_SLOTS = 10;
const HINT_CAT_DELAY_MS = 500;
const HINT_CAT_GAP = 8;
const HINT_POLLUTANT_RANGE = 96;
const MINE_PRESS_MS = 500;  // 长按多久后破坏方块
const WIN_SCORE = 12;
const VICTORY_DELAY_MS = 1500;
const ATTACK_COOLDOWN_MS = 400;  // 攻击冷却
const MUTUAL_ATTACK_RANGE = 1.3 * TILE_SIZE;  // 敌人和玩家相互攻击的距离（中心距离 < 1.3格）
const ENEMY_CONTACT_DAMAGE_INTERVAL_MS = 1000;

// 贴图类型（地面/平台可选 assets/pic/ground 中任意图片）
const T = {
  NONE: 0,
  GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4,
  COPPER: 5, DEEP_COPPER: 6, DEEP_DIAMOND: 7, DEEP_GOLD: 8, DEEP_IRON: 9,
  DIAMOND: 10, GOLD: 11, IRON: 12,  LAVA: 13, ACID: 14, WATER: 15
};

// UI 常量
const SLOT_SIZE = 24, SLOT_GAP = 8, INV_PADDING = 8;
const INV_BAR_W = 10 * (SLOT_SIZE + SLOT_GAP) + INV_PADDING * 2 - SLOT_GAP, INV_BAR_H = 40;
const MAX_HEARTS = 10, HEART_SIZE = 20;

// 手持武器绘制：大小固定 24×24，偏移量相对玩家贴图（朝右时 +X 向右、+Y 向下；朝左时镜像）
const WEAPON_DRAW_SIZE = 24;
const WEAPON_OFFSET_X = 18;   // 相对手部基准的 x 偏移，可调
const WEAPON_OFFSET_Y = -12;  // 相对手部基准的 y 偏移，可调

// ====== 工具函数 ======
function rectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// 用于“装饰物/背景物”生成的稳定随机（同一 col 每次都一致）
function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
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
    this.victoryAt = 0;
    //游戏状态：start playing gameover victory
    this.state = "start";
  }

  setup() { 
    const groundY = this.level.terrainHeights[0];
    this.player = new Player(80, groundY - 64);
   }

  resetHintState() {
    this.victoryAt = 0;
  }

  update() {
    this.player.update(this.level.platforms);
    this.updateCamera();
    this.updateHintCat();
    
    // 更新所有敌人（追踪玩家）
    for (const enemy of this.level.enemies) {
      if (!enemy.isDead && typeof enemy.update === "function") {
        enemy.update(this.player, this.level.platforms);
      }
    }
    
    // 更新所有带 update 方法的物体（比如 TNT）
    const now = millis();
    for (const item of this.level.items) {
     if (typeof item.update === "function") {
      item.update(now, this.player);
     }
   }
    this.checkCollisions();
    this.updateMining();

    // ===== 岩浆 / 酸池伤害判定：玩家碰撞箱底部接触岩浆/酸就立即死亡 =====
    const box = this.player.getCollisionBox();
    const colUnder = Math.floor((box.x + box.w / 2) / TILE_SIZE);
    const feetY = box.y + box.h;  // 玩家碰撞箱底部的屏幕Y坐标

    if (colUnder >= 0 && colUnder < TERRAIN_COLS) {
      const surfaceY = this.level.terrainHeights[colUnder];
      if (surfaceY !== undefined) {
        // 计算相对于地形表面的行号（正确的坐标转换）
        const rowUnder = Math.floor((feetY - surfaceY) / TILE_SIZE);
        if (rowUnder >= 0) {
          const column = this.level.tileMap[colUnder];
          const tt = column?.[rowUnder];
          if (tt === T.LAVA || tt === T.ACID) {
            this.player.health = 0;
          }
        }
      }
    }

    if (this.player.health <= 0) {
      this.state = "gameover";
      this.victoryAt = 0;
      return;
    }
    
    // 胜利条件：到达最后一列（TERRAIN_COLS - 1）且生命值 > 0
    const playerCol = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
    if (playerCol >= TERRAIN_COLS - 1 && this.player.health > 0) {
      if (!this.victoryAt) this.victoryAt = millis() + VICTORY_DELAY_MS;
      if (millis() >= this.victoryAt) this.state = "victory";
    } else {
      this.victoryAt = 0;
    }
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
    const box = this.player.getCollisionBox();
    const px = box.x, py = box.y, pw = box.w, ph = box.h;
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
    const tx = col * TILE_SIZE;
    // 与 draw() 中地形绘制保持一致：从屏幕底部往上排布
    const ty = 360 - (row + 1) * TILE_SIZE;
    return wx >= tx && wx < tx + TILE_SIZE && wy >= ty && wy < ty + TILE_SIZE;
  }

  updateMining() {
    const miningPressed = mouseIsPressed;
    if (!miningPressed) {
      this.mouseDownTime = 0;
      return;
    }
    const now = millis();
    if (this.mouseDownTime === 0) this.mouseDownTime = now;
    if (now - this.mouseDownTime < MINE_PRESS_MS) return;

    const worldX = mouseX + this.cameraX;
    const worldY = mouseY;
    const pointedTile = this.getPointedMineableTile(worldX, worldY);
    if (pointedTile) {
      if (pointedTile.row === pointedTile.bottomRow) {
        this.state = "gameover";
        this.mouseDownTime = 0;
        return;
      }
      const tileType = this.level.tileMap[pointedTile.col][pointedTile.row];
      this.level.removeTerrainBlock(pointedTile.col, pointedTile.row);
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
    const box = this.player.getCollisionBox();
    this.playerHistory.push({ x: box.x, y: box.y, w: box.w, h: box.h, facingRight: this.player.facingRight, t: millis() });
    const cutoff = millis() - HINT_CAT_DELAY_MS - 50;
    while (this.playerHistory.length && this.playerHistory[0].t < cutoff) this.playerHistory.shift();
    this.level.hintCat.follow(this.getDelayedState());
    this.level.hintCat.setMessage(this.getHintMessage());
  }

  getDelayedState() {
    const targetT = millis() - HINT_CAT_DELAY_MS;
    const box = this.player.getCollisionBox();
    if (!this.playerHistory.length) return { x: box.x, y: box.y, w: box.w, h: box.h, facingRight: this.player.facingRight };
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
    const box = this.player.getCollisionBox();
    const px = box.x + box.w / 2;
    const py = box.y + box.h / 2;
    const eBox = enemy.getCollisionBox();
    const ex = eBox.x + eBox.w / 2;
    const ey = eBox.y + eBox.h / 2;
    return Math.sqrt((px - ex) ** 2 + (py - ey) ** 2);
  }

  distanceToItem(item) {
    const box = this.player.getCollisionBox();
    const px = box.x + box.w / 2;
    const py = box.y + box.h / 2;
    const ix = item.x + item.w / 2;
    const iy = item.y + item.h / 2;
    return Math.sqrt((px - ix) ** 2 + (py - iy) ** 2);
  }

  getClosestDistance(list, predicate, distanceFn) {
    let best = Infinity;
    for (const obj of list) {
      if (!predicate(obj)) continue;
      const d = distanceFn.call(this, obj);
      if (d < best) best = d;
    }
    return best;
  }

  getPointedMineableTile(worldX, worldY) {
    const col = Math.floor(worldX / TILE_SIZE);
    if (col < 0 || col >= TERRAIN_COLS) return null;

    const column = this.level.tileMap[col];
    if (!column || column.length === 0) return null;

    // 从上往下找：优先命中视觉上靠上的那一格
    let targetRow = -1;
    for (let row = column.length - 1; row >= 0; row--) {
      const tileType = column[row];
      if (tileType === T.NONE || tileType === undefined) continue;

      const tx = col * TILE_SIZE;
      const ty = 360 - (row + 1) * TILE_SIZE;

      // 鼠标必须落在这格范围内
      if (!(worldX >= tx && worldX < tx + TILE_SIZE && worldY >= ty && worldY < ty + TILE_SIZE)) {
        continue;
      }

      // 同时该格必须在玩家触及范围内
      if (!this.isInReachZone(tx, ty, TILE_SIZE, TILE_SIZE)) continue;

      targetRow = row;
      break;
    }

    if (targetRow === -1) return null;

    // 计算这一列中“最底下的实心方块行号”（用于最后一层判定）
    // 注意：row=0 是最底部，从下往上找第一个非空格子
    let bottomRow = -1;
    for (let row = 0; row < column.length; row++) {
      const tileType = column[row];
      if (tileType === T.NONE || tileType === undefined) continue;
      bottomRow = row;
      break;
    }

    if (bottomRow === -1) return null;

    return { col, row: targetRow, bottomRow };
  }

  playerHasScissor() {
    return this.player.inventory.some(item => item instanceof Tool && item.toolType === 'scissor');
  }

  canCollectItem() {
    return this.player.inventory.length < INVENTORY_SLOTS;
  }

  isOreTile(tileType) {
    return [
      T.COPPER, T.DEEP_COPPER, T.DEEP_DIAMOND, T.DEEP_GOLD, T.DEEP_IRON,
      T.DIAMOND, T.GOLD, T.IRON
    ].includes(tileType);
  }

  isNearOre() {
    const box = this.player.getCollisionBox();
    const px = box.x + box.w / 2;
    const py = box.y + box.h / 2;
    const range = HINT_POLLUTANT_RANGE;
    const colMin = Math.max(0, Math.floor((px - range) / TILE_SIZE));
    const colMax = Math.min(TERRAIN_COLS - 1, Math.floor((px + range) / TILE_SIZE));
    for (let col = colMin; col <= colMax; col++) {
      const surfaceY = this.level.terrainHeights[col];
      if (surfaceY === undefined) continue;
      const rows = this.level.tileMap[col] || [];
      for (let row = 0; row < rows.length; row++) {
        const tileType = rows[row];
        if (!this.isOreTile(tileType)) continue;
        const tx = col * TILE_SIZE + TILE_SIZE / 2;
        const ty = surfaceY + row * TILE_SIZE + TILE_SIZE / 2;
        if (Math.hypot(px - tx, py - ty) <= range) {
          return true;
        }
      }
    }
    return false;
  }

  isNearFloating() {
    for (const p of this.level.platforms) {
      if (!p._floating) continue;
      if (this.isInReachZone(p.x, p.y, p.w, p.h)) return true;
    }
    return false;
  }

  isNearLava() {
  // 玩家中心所在列
  const playerCol = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);

  // 左右 2 格内检查是否出现 LAVA
  for (let dx = -2; dx <= 2; dx++) {
    const col = playerCol + dx;
    if (col < 0 || col >= TERRAIN_COLS) continue;

    const column = this.level.tileMap[col];
    if (!column) continue;

    if (column.includes(T.LAVA)) return true;
  }
  return false;
}

isNearAcid() {
  const playerCol = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);

  for (let dx = -2; dx <= 2; dx++) {
    const col = playerCol + dx;
    if (col < 0 || col >= TERRAIN_COLS) continue;

    const column = this.level.tileMap[col];
    if (!column) continue;

    if (column.includes(T.ACID)) return true;
  }
  return false;
}

  getHintMessage() {
    const worldX = mouseX + this.cameraX;
    const worldY = mouseY;
    const pointedTile = this.getPointedMineableTile(worldX, worldY);
    if (pointedTile && pointedTile.row === pointedTile.bottomRow) return "最后一层不能挖 否则会掉下去";

    const closestEnemyDist = this.getClosestDistance(
      this.level.enemies,
      (enemy) => !enemy.isDead,
      this.distanceToEnemy
    );
    if (closestEnemyDist <= MUTUAL_ATTACK_RANGE) return "遇到僵尸！按F攻击";

    if (this.isNearFloating()) return "两次跳跃：双击空格";

    if (this.isNearOre()) return "挖矿石提升武器";

    const closestTntDist = this.getClosestDistance(
     this.level.items,
     (item) => item instanceof TNT,
     this.distanceToItem
);

    if (closestTntDist <= HINT_POLLUTANT_RANGE)return "小心TNT！靠近会爆炸";

    if (this.isNearLava()) return "靠近岩浆！收集水桶到背包并用鼠标点击倒水";

    if (this.isNearAcid()) return "靠近酸池！收集石灰石到背包并用鼠标点击中和";

    const closestScissorDist = this.getClosestDistance(
      this.level.items,
      (item) => item instanceof Tool && item.toolType === 'scissor',
      this.distanceToItem
    );
    if (closestScissorDist <= HINT_POLLUTANT_RANGE && !this.playerHasScissor()) {
      return "获取剪刀解救动物";
    }

    const closestBirdDist = this.getClosestDistance(
      this.level.items,
      (item) => item instanceof TrappedBird,
      this.distanceToItem
    );
    if (closestBirdDist <= HINT_POLLUTANT_RANGE) {
      return this.playerHasScissor() ? "用剪刀解救小鸟" : "获取剪刀解救小鸟";
    }

    const closestPollutantDist = this.getClosestDistance(
      this.level.items,
      (item) => item instanceof Pollutant,
      this.distanceToItem
    );
    if (closestPollutantDist <= HINT_POLLUTANT_RANGE) return "发现污染物，靠近即可收集";

    return null;
  }

  /** 按 F 键攻击：对距离 ≤ 2格 的最近敌人造成一次伤害 */
  tryAttack() {
    const now = millis();
    if (now - this.lastAttackTime < ATTACK_COOLDOWN_MS) return;
    const dmg = this.getAttackDamage();
    if (dmg <= 0) return;
    let closest = null;
    let closestDist = MUTUAL_ATTACK_RANGE + 1;
    for (const enemy of this.level.enemies) {
      if (enemy.isDead) continue;
      const d = this.distanceToEnemy(enemy);
      if (d <= MUTUAL_ATTACK_RANGE && d < closestDist) {
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
  // 玩家碰撞箱中心点列索引（用于确定最近的岩浆列）
  const box = this.player.getCollisionBox();
  const wx = box.x + box.w / 2;
  const playerCol = Math.floor(wx / TILE_SIZE);

  // 在玩家左右各 3 列范围内，寻找“最近的”一格岩浆
  let targetCol = -1;
  let targetRow = -1;
  let bestDist = Infinity;

  for (let col = playerCol - 3; col <= playerCol + 3; col++) {
    if (col < 0 || col >= TERRAIN_COLS) continue;
    const column = this.level.tileMap[col];
    if (!column) continue;

    for (let r = 0; r < column.length; r++) {
      if (column[r] !== T.LAVA) continue;
      const d = Math.abs(col - playerCol);
      if (d < bestDist) {
        bestDist = d;
        targetCol = col;
        targetRow = r;
      }
    }
  }

  // 附近没有岩浆就不消耗水桶
  if (targetCol === -1) return false;

  let changed = 0;

  // 从命中的那一格出发，向左右扩展，把同一行连续的一整片岩浆全部变为石头
  const convertLine = (startCol, row, dir) => {
    let col = startCol;
    while (col >= 0 && col < TERRAIN_COLS) {
      const column = this.level.tileMap[col];
      if (!column || column[row] !== T.LAVA) break;
      column[row] = T.STONE;
      changed++;
      col += dir;
    }
  };

  convertLine(targetCol, targetRow, -1); // 向左
  convertLine(targetCol + 1, targetRow, 1); // 向右（从右边一格开始，避免重复）

  // 只要转换过至少一格，就消耗水桶
  if (changed > 0) {
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

  return false;
}

tryUseLimestone() {
  // 以玩家碰撞箱中心为基准，扫描一个小范围内的 ACID 并全部转化成 WATER
  const box = this.player.getCollisionBox();
  const wx = box.x + box.w / 2;
  const wy = box.y + box.h - 1;

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
  // 敌人伤害判定：距离小于1.3格时可以攻击玩家
  for (const enemy of this.level.enemies) {
    if (enemy.isDead) continue;
    if (this.distanceToEnemy(enemy) >= MUTUAL_ATTACK_RANGE) continue;
    if (now - this.lastEnemyContactDamageTime < ENEMY_CONTACT_DAMAGE_INTERVAL_MS) break;
    this.player.takeDamage(1);
    this.lastEnemyContactDamageTime = now;
    break;
  }

  for (let i = this.level.items.length - 1; i >= 0; i--) {
    const item = this.level.items[i];

    // TNT 爆炸后延迟移除（不需要玩家碰到）
    if (item instanceof TNT && item.exploded && millis() >= item.removeAfter) {
      this.level.items.splice(i, 1);
      continue;
    }

    // 只有碰撞到才处理拾取/触发
    if (!this.player.collidesWith(item)) continue;

    // 0) TNT：碰到就触发，不进背包、不加分、不移除
    if (item instanceof TNT) {
      item.arm(millis());
      continue;
    }

    // 1) TrappedBird：必须有剪刀才能救
    if (item instanceof TrappedBird) {
      if (!this.playerHasScissor()) continue;
      if (!this.canCollectItem()) continue;
      this.player.collect(new LittleBird(0, 0, 24, 24));
      this.player.score += 1;
      this.level.items.splice(i, 1);
      continue;
    }

    // 2) 污染物加分
    if (item instanceof Pollutant) {
      this.player.score += 1;
      console.log("得分！当前总分:", this.player.score);
    }

  if (!this.player.collidesWith(item)) continue;

    // Food 单独处理（吃掉回血并消失，不进背包）
    if (item instanceof Food) {
        if (item.foodType === 'apple') {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 3);
        } 
        else if (item.foodType === 'enlarged_golden_apple') {
        this.player.health = this.player.maxHealth;
        }
    this.level.items.splice(i, 1); // 吃掉消失
    continue; // 跳过后面的 collect(item)
    }

    // 3) 普通收集并移除（Tool/Weapon/Pollutant 都走这里）
    this.player.collect(item);
    this.level.items.splice(i, 1);
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
    const N = T.NONE; // 空格子简写

    // 统一地形定义：addTerrainColumn(列号, 总高度, [贴图数组])
    // - 数组从底部往上：[0] 是最底下那格，越往后越高
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木（'log'/'leaves'）：只绘制背景，不碰撞
    // - N (T.NONE)：空格子
    const terrain = [
      // 第1屏 - 包含树木
      [0,8,[X,X,S,S,G,N,'leaves','leaves']], 
      [1,10,[X,X,S,S,G,N,'leaves','leaves','leaves','leaves']], 
      [2,10,[X,X,S,D,G,'log','log','log','leaves','leaves']], 
      [3,10,[X,S,S,G,N,N,'leaves','leaves','leaves','leaves']], 
      [4,8,[X,S,D,G,N,N,'leaves','leaves']],
      [5,4,[X,S,D,G]], 
      [6,3,[X,S,S]], 
      [7,6,[X,S,S,N,N,G]], 
      [8,7,[X,S,N,N,N,D,G]], 
      [9,7,[X,T.LAVA,N,N,N,S,G]], 
      [10,8,[X,T.LAVA,N,N,N,S,D,G]],
      [11,8,[X,T.LAVA,N,N,N,N,D,G]],
      [12,2,[X,T.LAVA]],
      [13,3,[X,S,S]],
      [14,6,[X,S,S,N,'leaves','leaves']],
      [15,8,[X,S,G,N,'leaves','leaves','leaves','leaves']], 
      [16,8,[X,S,G,'log','log','log','leaves','leaves']], 
      [17,8,[X,S,G,N,'leaves','leaves','leaves','leaves']],
      [18,6,[X,S,G,N,'leaves','leaves']],
      [19,7,[X,S,D,G,N,'leaves','leaves']],
      // 第2屏
      [20,9,[S,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [21,9,[S,S,D,G,'log','log','log','leaves','leaves']], 
      [22,9,[S,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [23,7,[S,S,G,N,N,'leaves','leaves']], 
      [24,3,[S,S,G]],
      [25,3,[S,S,G]], 
      [26,3,[X,S,S]], 
      [27,3,[X,S,S]], 
      [28,5,[X,X,S,S,S]],
      [29,3,[X,S,S]], 
      [30,2,[S,S]],
      [31,2,[X,T.LAVA]], 
      [32,2,[X,T.LAVA]], 
      [33,2,[X,T.LAVA]],
      [34,2,[X,T.LAVA]], 
      [35,2,[X,T.LAVA]], 
      [36,7,[X,S,S,N,N,'leaves','leaves']], 
      [37,9,[X,S,G,N,N,'leaves','leaves','leaves','leaves']], 
      [38,9,[S,S,D,G,'log','log','log','leaves','leaves']], 
      [39,9,[S,S,D,G,N,'leaves','leaves','leaves','leaves']],
      // 第3屏
      [40,7,[S,S,G,N,N,'leaves','leaves']], 
      [41,3,[X,S,G]], 
      [42,2,[S,S]], 
      [43,2,[S,S]], 
      [44,8,[S,S,Ir,N,N,N,'leaves','leaves']],
      [45,10,[X,X,S,G,N,N,'leaves','leaves','leaves','leaves']], 
      [46,10,[X,X,S,D,G,'log','log','log','leaves','leaves']], 
      [47,10,[X,S,S,D,G,'leaves','leaves','leaves','leaves','leaves']], 
      [48,9,[X,X,S,G,N,'leaves','leaves','leaves','leaves']], 
      [49,9,[X,S,D,G,'log','log','log','leaves','leaves']], 
      [50,9,[X,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [51,7,[X,S,D,G,N,'leaves','leaves']],
      [52,3,[S,S,G]], 
      [53,3,[X,S,G]], 
      [54,3,[X,S,G]], 
      [55,3,[X,S,G]], 
      [56,3,[X,S,G]],
      [57,5,[X,D,G,'leaves','leaves']], 
      [58,7,[S,G,N,'leaves','leaves','leaves','leaves']], 
      [59,7,[S,G,'log','log','log','leaves','leaves']], 
      // 第4屏
      [60,7,[S,G,N,'leaves','leaves','leaves','leaves']], 
      [61,5,[S,G,N,'leaves','leaves']],
      [62,3,[S,S,G]], 
      [63,2,[S,T.LAVA]], 
      [64,2,[S,T.LAVA]], 
      [65,2,[S,T.LAVA]], 
      [66,2,[S,T.LAVA]],
      [67,2,[S,T.LAVA]],
      [68,2,[S,S]], 
      [69,3,[S,D,G]], 
      [70,3,[S,D,G]], 
      [71,6,[S,D,G,N,N,G]],
      [72,7,[S,G,N,N,N,S,G]], 
      [73,7,[S,G,N,N,N,S,G]], 
      [74,7,[S,G,N,N,N,N,G]], 
      [75,3,[X,S,G]],
      [76,7,[X,S,G,N,N,'leaves','leaves']], 
      [77,9,[X,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [78,9,[X,S,D,G,'log','log','log','leaves','leaves']], 
      [79,9,[X,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      // 第5屏
      [80,7,[X,S,D,G,N,'leaves','leaves']], 
      [81,4,[X,S,D,G]],
      [82,6,[X,S,G,N,'leaves','leaves']], 
      [83,8,[X,S,G,N,'leaves','leaves','leaves','leaves']], 
      [84,8,[X,S,G,'log','log','log','leaves','leaves']], 
      [85,8,[X,S,G,N,'leaves','leaves','leaves','leaves']], 
      [86,6,[X,S,G,N,'leaves','leaves']],
      [87,2,[S,G]], 
      [88,2,[S,G]], 
      [89,2,[S,G]], 
      [90,7,[S,D,G,N,N,N,G]], 
      [91,8,[S,D,G,N,N,N,D,G]],
      [92,8,[S,D,G,N,N,N,D,G]], 
      [93,8,[S,D,G,N,N,N,D,G]], 
      [94,7,[S,D,G,N,N,N,G]], 
      [95,4,[X,S,S,S]],
      [96,6,[X,X,X,S,S,S]], 
      [97,3,[X,Di,G]], 
      [98,3,[X,S,G]], 
      [99,4,[X,S,D,G]],
      // 第6屏
      [100,4,[X,S,D,G]], 
      [101,4,[X,S,D,G]], 
      [102,4,[X,S,D,G]], 
      [103,7,[X,S,G,N,N,N,S]], 
      [104,7,[X,S,G,N,N,N,S]],
      [105,8,[X,S,G,N,N,N,S,G]], 
      [106,8,[X,S,G,N,N,N,N,G]], 
      [107,8,[X,S,G,N,N,N,N,G]], 
      [108,4,[X,X,S,S]], 
      [109,3,[X,S,S]], 
      [110,5,[S,G,N,'leaves','leaves']], 
      [111,7,[S,G,N,'leaves','leaves','leaves','leaves']],
      [112,7,[S,G,'log','log','log','leaves','leaves']], 
      [113,7,[S,G,N,'leaves','leaves','leaves','leaves']], 
      [114,5,[S,T.LAVA,N,'leaves','leaves']], 
      [115,2,[S,T.LAVA]], 
      [116,2,[S,T.LAVA]],
      [117,2,[S,T.LAVA]], 
      [118,2,[S,S]], 
      [119,3,[S,D,G]], 
    ];
    terrain.forEach(([col, h, tiles]) => this.addTerrainColumn(col, h, tiles));

    // 辅助函数：获取“最高地表” y 坐标（通常用于放置物体/敌人）
    const groundY = (col) => this.terrainHeights[col];

    // 辅助函数：获取“底层地面” y 坐标（忽略中间悬空台阶）
    const baseGroundY = (col) => {
      const column = this.tileMap[col];
      if (!column || column.length === 0) return this.terrainHeights[col];

      const baseY = 360;
      let lastSolidRow = -1;

      for (let row = 0; row < column.length; row++) {
        const t = column[row];
        if (t === T.NONE || t === undefined) {
          // 已经过了一段连续地面，再遇到空格说明“底层地面”结束
          if (lastSolidRow !== -1) break;
          continue;
        }
        // 仍在底部连续地面区域内，记录最后一行
        lastSolidRow = row;
      }

      if (lastSolidRow === -1) return this.terrainHeights[col];
      return baseY - (lastSolidRow + 1) * TILE_SIZE;
    };
    
    // 辅助函数：获取浮空平台位置
    const getPlatform = (col) => {
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        if (p._col === col && !p.isTerrain) {
          return p;
        }
      }
      return { x: col * TILE_SIZE, y: 360 };
    };

    // ===== 敌人和物品生成（基于当前地形）=====
    // 敌人
    this.enemies.push(new Enemy(54 * TILE_SIZE, groundY(54) - 64, 64, 64));
    this.enemies.push(new Enemy(104 * TILE_SIZE, baseGroundY(104) - 64, 64, 64));

    // 污染物
    // this.items.push(new Pollutant(36 * TILE_SIZE + 4, groundY(36) - 18, 24, 18, "cigarette")); // 地面 col 36
    // this.items.push(new Pollutant(48 * TILE_SIZE + 4, groundY(48) - 18, 24, 18, "plastic_bottle")); // 地面 col 48

    // TNT（不可收集，触发后爆炸）
    this.items.push(new TNT(97 * TILE_SIZE, groundY(97) - TILE_SIZE, TILE_SIZE, TILE_SIZE));

    // 食物（地面上，吃了回血，不进背包）
    this.items.push(new Food(70 * TILE_SIZE + 4, groundY(70) - 24, 24, 24, 'apple'));
    this.items.push(new Food(107 * TILE_SIZE + 4, groundY(107) - 24, 24, 24, 'enlarged_golden_apple'));

    // 被困小鸟
    const birdOffset = (TILE_SIZE - 24) / 2;
    this.items.push(new TrappedBird(73 * TILE_SIZE + birdOffset, groundY(73) - 21, 24, 24));
    this.items.push(new TrappedBird(92 * TILE_SIZE + birdOffset, groundY(92) - 21, 24, 24));

    // 工具（平台上 + 地面上，居中放置）Tool(x, y, w, h, toolType)
    // toolType 为 pic/tool 下文件名不含 .png，如 'scissor' 'bucket'
    const toolOffset = (TILE_SIZE - 24) / 2;
    // 剪刀
    this.items.push(new Tool(28 * TILE_SIZE + toolOffset, groundY(28) - 24, 24, 24, 'scissor'));
    this.items.push(new Tool(92 * TILE_SIZE + toolOffset, baseGroundY(92) - 24, 24, 24, 'scissor'));
    // 水桶
    this.items.push(new Tool(8 * TILE_SIZE + toolOffset, groundY(8) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(23 * TILE_SIZE + toolOffset, groundY(23) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(29 * TILE_SIZE + toolOffset, groundY(29) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(103 * TILE_SIZE + toolOffset, groundY(103) - 24, 24, 24, 'enlarged_water_bucket'));
    // 石灰石
    // this.items.push(new Tool(14 * TILE_SIZE + toolOffset, groundY(14) - 24, 24, 24, 'limestone'));

    // ===== 结束：敌人和物品生成 =====
  }

  addTreeColumn(col, heightTiles, tiles) {
    // 已废弃：现在统一使用 addTerrainColumn
    console.warn('addTreeColumn is deprecated, use addTerrainColumn instead');
  }

  drawTrees() {
    const leavesImg = window.tile_oak_leaves;
    const logImg = window.tile_oak_log;

    if (!this.treeColumns) return;

    push();
    imageMode(CORNER);

    for (let col = 0; col < this.treeColumns.length; col++) {
      const column = this.treeColumns[col] || [];
      for (let i = 0; i < column.length; i++) {
        const kind = column[i];
        if (kind === T.NONE || kind === undefined || kind === null) continue;

        const x = col * TILE_SIZE;
        const y = 360 - (i + 1) * TILE_SIZE; // 从底部往上

        if (kind === 'log') {
          if (logImg && logImg.width > 0) image(logImg, x, y, TILE_SIZE, TILE_SIZE);
          else { noStroke(); fill(120, 86, 54); rect(x, y, TILE_SIZE, TILE_SIZE); }
        } else if (kind === 'leaves') {
          if (leavesImg && leavesImg.width > 0) image(leavesImg, x, y, TILE_SIZE, TILE_SIZE);
          else { noStroke(); fill(60, 140, 70, 230); rect(x, y, TILE_SIZE, TILE_SIZE); }
        }
      }
    }

    pop();
  }

  addTerrainColumn(col, heightTiles, tiles) {
    // 统一处理：地形、树木、浮空平台
    // - 数组从底部往上：tiles[0] 是最底下那格
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木（'log'/'leaves'）：只绘制，不碰撞
    // - T.NONE：空格子
    
    const baseY = 360; // 地面基准线
    if (!this.treeColumns) this.treeColumns = Array.from({ length: TERRAIN_COLS }, () => []);
    
    // 找到第一个非 T.NONE/log/leaves 的地形块，作为地表高度
    let terrainHeight = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      if (tile !== T.NONE && tile !== 'log' && tile !== 'leaves') {
        terrainHeight = i + 1;
      }
    }
    
    if (terrainHeight > 0) {
      const surfaceY = baseY - terrainHeight * TILE_SIZE;
      this.terrainHeights[col] = surfaceY;
    }
    
    // 逐格处理
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const y = baseY - (i + 1) * TILE_SIZE;
      
      if (tile === T.NONE || tile === undefined || tile === null) {
        continue;
      }
      
      // 树木：只记录到 treeColumns，不创建平台
      if (tile === 'log' || tile === 'leaves') {
        if (!this.treeColumns[col]) this.treeColumns[col] = [];
        this.treeColumns[col][i] = tile;
        continue;
      }
      
      // 地形：创建碰撞平台
      const row = i; // 从底部开始的行号
      this.tileMap[col][row] = tile;
      const platform = new Platform(col * TILE_SIZE, y, TILE_SIZE, TILE_SIZE, terrainHeight > 0);
      platform._col = col;
      platform._row = row;
      platform._tileType = tile;
      this.platforms.push(platform);
      if (!this.terrainBlocks[col]) this.terrainBlocks[col] = [];
      this.terrainBlocks[col][row] = platform;
    }
  }

  draw() {
    // 绘制地形（从 tileMap 读取，T.NONE 不绘制）
    for (let col = 0; col < TERRAIN_COLS; col++) {
      for (let row = 0; row < (this.tileMap[col]?.length || 0); row++) {
        const type = this.tileMap[col][row];
        if (type === T.NONE || type === undefined) continue;
        const y = 360 - (row + 1) * TILE_SIZE; // 从底部往上
        drawTile(type, col * TILE_SIZE, y);
      }
    }

    // 背景树：画在地形之后、实体之前（纯背景，无碰撞/交互）
    this.drawTrees();

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
    
    // 碰撞箱尺寸（独立于贴图尺寸）
    this.collisionW = 24;
    this.collisionH = 56;
    this.collisionOffsetX = (this.w - this.collisionW) / 2;  // 水平居中：(32-24)/2 = 4
    this.collisionOffsetY = this.h - this.collisionH;  // 底部对齐：(64-56) = 8

    this.score = 0;
    this.selectedSlot = -1;   // 当前鼠标选中的背包格子
    this.maxJumps = 2;
    this.jumpsRemaining = this.maxJumps;

  }
  
  // 获取碰撞箱的实际坐标
  getCollisionBox() {
    return {
      x: this.x + this.collisionOffsetX,
      y: this.y + this.collisionOffsetY,
      w: this.collisionW,
      h: this.collisionH
    };
  }

  update(platforms) {
    this.vx = 0;
    if (keyIsDown(LEFT_ARROW)) this.vx = -this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.vx = this.speed;
    if (this.vx !== 0) this.facingRight = this.vx > 0;
    this.vy += this.gravity;

    // 水平移动：分步移动防止穿墙
    this.moveWithCollision(platforms, this.vx, 0, true);
    this.x = constrain(this.x, 0, WORLD_WIDTH - this.w);

    // 垂直移动：分步移动防止穿墙
    this.onGround = false;
    this.moveWithCollision(platforms, 0, this.vy, false);
    
    // 即使没有垂直移动，也要检测脚下是否有地面
    if (!this.onGround && Math.abs(this.vy) < 0.1) {
      this.checkGroundStatus(platforms);
    }
  }

  // 分步移动：将大的移动量拆分成多个小步，每步都检测碰撞
  moveWithCollision(platforms, dx, dy, horizontal) {
    const maxStepSize = 0.5; // 每步最多移动0.5像素，确保不会穿过任何方块
    const totalDistance = Math.abs(horizontal ? dx : dy);
    const steps = Math.ceil(totalDistance / maxStepSize);
    
    if (steps === 0) return;
    
    const stepX = dx / steps;
    const stepY = dy / steps;
    
    for (let i = 0; i < steps; i++) {
      // 先尝试移动
      const oldX = this.x;
      const oldY = this.y;
      
      if (horizontal) {
        this.x += stepX;
      } else {
        this.y += stepY;
      }
      
      // 移动后检测碰撞
      const collided = this.checkCollision(platforms, horizontal);
      
      // 如果发生碰撞，回退并停止
      if (collided) {
        this.x = oldX;
        this.y = oldY;
        if (horizontal) this.vx = 0;
        else this.vy = 0;
        
        // 精确定位到碰撞边界
        this.resolveCollisionPrecise(platforms, horizontal);
        break;
      }
    }
  }

  // 检测当前位置是否与任何平台碰撞
  checkCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    for (let p of platforms) {
      if (rectCollision(box.x, box.y, box.w, box.h, p.x, p.y, p.w, p.h)) {
        return true;
      }
    }
    return false;
  }

  // 检测脚下是否有地面（用于静止时更新 onGround 状态）
  checkGroundStatus(platforms) {
    const box = this.getCollisionBox();
    // 检测脚下 1 像素处是否有平台
    const testY = box.y + box.h + 1;
    
    for (let p of platforms) {
      // 检测玩家脚底是否刚好在平台顶部
      if (box.x < p.x + p.w && box.x + box.w > p.x) {
        if (Math.abs(testY - p.y) <= 2) {
          this.onGround = true;
          this.jumpsRemaining = this.maxJumps;
          this.vy = 0;
          return;
        }
      }
    }
  }

  // 精确定位到碰撞边界
  resolveCollisionPrecise(platforms, horizontal) {
    const box = this.getCollisionBox();
    
    for (let p of platforms) {
      if (rectCollision(box.x, box.y, box.w, box.h, p.x, p.y, p.w, p.h)) {
        // 调试：检测到 94-95 列附近的碰撞
        if (p._col >= 94 && p._col <= 96) {
          console.log(`碰撞修正: col=${p._col}, row=${p._row}, horizontal=${horizontal}, playerX=${this.x.toFixed(1)}, playerY=${this.y.toFixed(1)}, vy=${this.vy.toFixed(2)}`);
        }
        
        if (horizontal) {
          // 水平碰撞：调整玩家的 x（考虑偏移量）
          if (this.vx > 0) {
            this.x = p.x - this.collisionW - this.collisionOffsetX;
          } else {
            this.x = p.x + p.w - this.collisionOffsetX;
          }
          this.vx = 0;
        } else {
          if (this.vy > 0) { 
            this.y = p.y - this.h; 
            this.onGround = true; 
            this.jumpsRemaining = this.maxJumps; 
          } else if (this.vy < 0) {
            this.y = p.y + p.h;
          }
          this.vy = 0;
        }
        return;
      }
    }
  }

  resolveCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    let collided = false;
    
    for (let p of platforms) {
      if (rectCollision(box.x, box.y, box.w, box.h, p.x, p.y, p.w, p.h)) {
        collided = true;
        if (horizontal) {
          // 水平碰撞：调整玩家的 x（考虑偏移量）
          if (this.vx > 0) this.x = p.x - this.collisionW - this.collisionOffsetX;
          else this.x = p.x + p.w - this.collisionOffsetX;
          this.vx = 0;
        } else {
          if (this.vy > 0) { this.y = p.y - this.h; this.onGround = true; this.jumpsRemaining = this.maxJumps; }
          else if (this.vy < 0) this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }
    
    return collided;
  }

  jump() {
    if (this.jumpsRemaining <= 0) return;
    const isSecondJump = this.jumpsRemaining === 1;
    const boost = isSecondJump ? 1.35 : 1;
    this.vy = this.jumpForce * boost;
    this.onGround = false;
    this.jumpsRemaining -= 1;
  }
  collidesWith(obj) { 
    const box = this.getCollisionBox();
    return rectCollision(box.x, box.y, box.w, box.h, obj.x, obj.y, obj.w, obj.h); 
  }
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
const ENEMY_DETECT_RANGE = 4 * TILE_SIZE; // 4格检测范围
const ENEMY_SPEED = 1; // 敌人移动速度

class Enemy {
  constructor(x, y, w, h, health = ENEMY_DEFAULT_HEALTH) {
    Object.assign(this, { x, y, w, h, health, maxHealth: health });
    this.activated = false; // 是否已被激活（玩家进入检测范围）
    this.vx = 0; // 水平速度
    this.vy = 0; // 垂直速度
    this.gravity = 0.5; // 重力
    this.onGround = false; // 是否在地面上
    this.facingRight = true; // 朝向：true=右，false=左
    
    // 碰撞箱：24*64，居中底部对齐
    this.collisionW = 24;
    this.collisionH = 64;
    this.collisionOffsetX = (this.w - this.collisionW) / 2;  // 水平居中
    this.collisionOffsetY = this.h - this.collisionH;  // 底部对齐
  }
  
  getCollisionBox() {
    return {
      x: this.x + this.collisionOffsetX,
      y: this.y + this.collisionOffsetY,
      w: this.collisionW,
      h: this.collisionH
    };
  }
  
  takeDamage(amount) {
    this.health = max(0, this.health - amount);
  }
  
  get isDead() { return this.health <= 0; }
  
  // 更新敌人状态（追踪玩家）
  update(player, platforms) {
    if (this.isDead) return;
    
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const distance = Math.hypot(px - ex, py - ey);
    
    // 首次进入4格范围内，激活敌人
    if (!this.activated && distance <= ENEMY_DETECT_RANGE) {
      this.activated = true;
    }
    
    // 激活后持续追踪玩家
    if (this.activated) {
      // 水平移动：朝向玩家
      if (px < ex - 5) {
        this.vx = -ENEMY_SPEED;
        this.facingRight = false; // 向左移动
      } else if (px > ex + 5) {
        this.vx = ENEMY_SPEED;
        this.facingRight = true; // 向右移动
      } else {
        this.vx = 0;
      }
      
      // 应用重力
      this.vy += this.gravity;
      
      // 水平移动
      this.x += this.vx;
      this.resolveCollision(platforms, true);
      
      // 垂直移动
      this.y += this.vy;
      this.onGround = false;
      this.resolveCollision(platforms, false);
    }
  }
  
  // 碰撞检测（与平台，使用碰撞箱）
  resolveCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    for (let p of platforms) {
      if (rectCollision(box.x, box.y, box.w, box.h, p.x, p.y, p.w, p.h)) {
        if (horizontal) {
          if (this.vx > 0) this.x = p.x - box.w - this.collisionOffsetX;
          else this.x = p.x + p.w - this.collisionOffsetX;
          this.vx = 0;
        } else {
          if (this.vy > 0) {
            this.y = p.y - this.h;
            this.onGround = true;
          } else if (this.vy < 0) {
            this.y = p.y + p.h;
          }
          this.vy = 0;
        }
      }
    }
  }
  
  draw() {
    const img = this.facingRight ? window.zombieSpriteRight : window.zombieSpriteLeft;
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
  constructor(x, y, w = 32, h = 32) {
    super(x, y, w, h, "tnt");

    // 状态
    this.armed = false;       // 是否已被触发（开始倒计时）
    this.exploded = false;    // 是否已爆炸
    this.armTime = 0;         // 触发时刻（millis）
    this.removeAfter = 0;     // 爆炸后移除时间（ms）

    // 参数（写在类里，避免和组员全局常量冲突）
    this.fuseMs = 2000;        // 2 秒后爆炸
    this.blastRadius = 80;     // 爆炸范围（像素）
    this.damage = 3;           // 伤害
    this.postExplodeMs = 300;  // 爆炸后显示/保留时间
  }

  // 玩家第一次碰到时调用：开始倒计时（不要反复重置）
  arm(now) {
    if (this.armed || this.exploded) return;
    this.armed = true;
    this.armTime = now;
  }

  // 每帧更新：到点爆炸
  update(now, player) {
    if (!this.armed || this.exploded) return;
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
    if (this.exploded) return; // 爆炸后不画

    const img = window[this.type];

    // 点燃后：闪烁（每 100ms 变暗一次）
    if (this.armed) {
      const blink = Math.floor(millis() / 100) % 2 === 0;
      if (blink) { push(); tint(255, 90); }

      if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
      else { fill(255, 0, 0); rect(this.x, this.y, this.w, this.h); }

      if (blink) pop();
      return;
    }

    // 未触发：正常显示
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 0, 0); rect(this.x, this.y, this.w, this.h); }
  }
}

class TrappedBird extends Item {
  constructor(x, y, w = 24, h = 24) {
    super(x, y, w, h, null);
  }
  draw() {
    const img = window.trappedbird;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(200, 180, 80); rect(this.x, this.y, this.w, this.h); }
  }
}

class LittleBird extends Item {
  constructor(x, y, w = 24, h = 24) {
    super(x, y, w, h, null);
  }
  draw() {
    const img = window.littlebird;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(180, 200, 220); rect(this.x, this.y, this.w, this.h); }
  }
}

class Food extends Item {
  // foodType: 'apple' | 'enlarged_golden_apple'
  constructor(x, y, w = 24, h = 24, foodType = 'apple') {
    super(x, y, w, h, null);
    this.foodType = foodType;
  }

  draw() {
    const img = window['food_' + this.foodType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 200, 0); rect(this.x, this.y, this.w, this.h); }
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
  constructor(x, y) { Object.assign(this, { x, y, w: 32, h: 16, facingRight: true, messages: ["移动: ←↑→ 跳跃: 空格键 挖矿: 长按鼠标"], message: null }); }

  setMessage(message) {
    this.message = message;
  }

  follow(state) {
    const playerW = state.w || 32;
    const behindX = (state.facingRight !== false)
      ? (state.x - this.w - HINT_CAT_GAP)
      : (state.x + playerW + HINT_CAT_GAP);
    this.x = constrain(behindX, 0, WORLD_WIDTH - this.w);
    this.y = state.y + state.h - this.h;
    this.facingRight = state.facingRight !== false;
  }

  draw() {
    const img = this.facingRight ? window.catSpriteRight : window.catSpriteLeft;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 200, 0); rect(this.x, this.y, this.w, this.h); }
    const msg = this.message || this.messages[0];
    if (msg) {
      push();
      textSize(12);
      const paddingX = 6;
      const paddingY = 5;
      const maxCharsPerLine = 5;
      let lines = [];
      const defaultMsg = this.messages[0];
      if (msg === defaultMsg) {
        lines = ["移动: ←↑→", "跳跃: 空格键", "挖矿: 长按鼠标"];
      } else {
        const words = msg.split(" ");
        let current = "";
        for (const word of words) {
          const needsSpace = current.length > 0;
          const next = (needsSpace ? current + " " : current) + word;
          if (next.length <= maxCharsPerLine) {
            current = next;
            continue;
          }
          if (current.length > 0) {
            lines.push(current);
            current = "";
          }
          if (word.length <= maxCharsPerLine) {
            current = word;
          } else {
            for (let i = 0; i < word.length; i += maxCharsPerLine) {
              lines.push(word.slice(i, i + maxCharsPerLine));
            }
          }
        }
        if (current) lines.push(current);
      }
      const lineH = 16;
      const bubbleW = max(...lines.map(l => textWidth(l))) + paddingX * 2;
      const bubbleH = lines.length * lineH + paddingY * 2;
      const bubbleX = this.x + this.w / 2 - bubbleW / 2;
      const bubbleY = max(6, this.y - bubbleH - 6);
      noStroke();
      fill(255, 210);
      rect(bubbleX, bubbleY, bubbleW, bubbleH, 4);
      fill(130);
      textAlign(CENTER, CENTER);
      for (let i = 0; i < lines.length; i++) {
        const y = bubbleY + paddingY + lineH / 2 + i * lineH;
        text(lines[i], bubbleX + bubbleW / 2, y);
      }
      pop();
    }
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

      // 背包 - 使用背包贴图（10格）
      const invX = (width - INV_BAR_W) / 2, invY = height - INV_BAR_H - 12;

      // 画背包贴图作为背景
      const invContainerImg = window.invContainer;
      if (invContainerImg && invContainerImg.width > 0) {
        image(invContainerImg, invX, invY, INV_BAR_W, INV_BAR_H);
      } else {
        // 备选：半透明背景矩形
        fill(40, 40, 50, 200);
        noStroke();
        rect(invX, invY, INV_BAR_W, INV_BAR_H, 8);
      }

      // 画格子边框和物品
      for (let i = 0; i < INVENTORY_SLOTS; i++) {
        const x = invX + INV_PADDING + i * (SLOT_SIZE + SLOT_GAP);
        const y = invY + INV_PADDING;
        
        const item = player.inventory[i];
        if (item) {
          let img = item.sprite;
          if (item instanceof Pollutant) img = window[item.type];
          if (item instanceof Tool) img = window['tool_' + item.toolType];
          if (item instanceof Weapon) img = window['weapon_' + item.weaponType];
          if (item instanceof LittleBird) img = window.littlebird;
          
          if (img && img.width > 0) {
            // 有图片就显示图片
            image(img, x, y, SLOT_SIZE, SLOT_SIZE);
          } else {
            // 没图片显示色块
            if (item instanceof Pollutant) fill(100, 200, 100);
            else if (item instanceof Tool) fill(100, 150, 255);
            else if (item instanceof Weapon) fill(180, 120, 80);
            else if (item instanceof LittleBird) fill(180, 200, 220);
            else fill(255, 255, 0);
            noStroke();
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

  // 新增：污染物及被困小动物
  load('assets/pic/pollutant/cigarette.png', 'cigarette');
  load('assets/pic/pollutant/plastic_bottle.png', 'plastic_bottle');
  load('assets/pic/pollutant/tnt_side.png', 'tnt');
  load('assets/pic/animals/trappedbird.png', 'trappedbird');
  load('assets/pic/animals/littlebird.png', 'littlebird');
  // 玩家与猫（assets/pic/player_cat）
  load('assets/pic/player_cat/Alex_left.png', 'alexSpriteLeft');
  load('assets/pic/player_cat/Alex_right.png', 'alexSpriteRight');
  load('assets/pic/player_cat/cat_left.png', 'catSpriteLeft');
  load('assets/pic/player_cat/cat_right.png', 'catSpriteRight');

  // 敌人（assets/pic/enemy）
  load('assets/pic/enemy/zombie_left.png', 'zombieSpriteLeft');
  load('assets/pic/enemy/zombie_right.png', 'zombieSpriteRight');

  // 工具（assets/pic/tool 中全部，新增图片时在此数组加入文件名不含 .png）
  ['scissor', 'limestone', 'enlarged_water_bucket'].forEach(name =>load(`assets/pic/tool/${name}.png`, `tool_${name}`));
  // 武器（assets/pic/weapon，威力从低到高：wooden / stone / iron / diamond）
  ['wooden_sword', 'stone_sword', 'iron_sword', 'diamond_sword'].forEach(name => load(`assets/pic/weapon/${name}.png`, `weapon_${name}`));

  // 食物（assets/pic/food）
  load('assets/pic/food/apple.png', 'food_apple');
  load('assets/pic/food/enlarged_golden_apple.png', 'food_enlarged_golden_apple');

  // UI 等（心形在 assets 根目录，背包在 assets/pic）
  load('assets/heart_container.png', 'heartContainer');
  load('assets/heart_fill.png', 'heartFill');
  load('assets/pic/ui/inventory_container.png', 'invContainer');




  // 地面/平台贴图（assets/pic/ground 中全部）
  const groundTiles = [
    'grass_block_side', 'dirt', 'stone', 'deepslate',
    'copper_ore', 'deepslate_copper_ore', 'deepslate_diamond_ore', 'deepslate_gold_ore', 'deepslate_iron_ore',
    'diamond_ore', 'gold_ore', 'iron_ore','lava', 'acid', 'water',
    // 树（仅作为背景装饰使用）
    'oak_leaves', 'oak_log'
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
    game.resetHintState();
    return;
  }

  //游戏结束之后按ENTER重启游戏
  if ((game.state === "gameover"|| game.state === "victory") &&(keyCode === ENTER ||keyCode === 13)) {
    game.state = "playing";
    game = new Game();   // 重置
    game.setup();
    game.resetHintState();
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
  textSize(48);
  text("Victory!", width / 2, height / 2 - 60);
  
  // 显示分数
  textSize(32);
  fill(255, 255, 100); // 金黄色
  text("Score: " + game.player.score, width / 2, height / 2);
  
  textSize(24);
  fill(200, 255, 150);
  text("Press ENTER to Play Again", width / 2, height / 2 + 60);
}

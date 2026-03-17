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
const ENEMY_ATTACK_START_DELAY_MS = 1000;  // 敌人进入攻击范围后延迟才开始造成伤害（毫秒）

// 水中物理（可按需调参）
const WATER_SINK_VY = 0.8;   // 在水中不按空格：匀速下沉
const WATER_RISE_VY = -0.9;  // 在水中按住W：匀速上浮

// 贴图类型（地面/平台可选 assets/pic/ground 中任意图片）
const T = {
  NONE: 0,
  GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4,
  COPPER: 5, DEEP_COPPER: 6, DEEP_DIAMOND: 7, DEEP_GOLD: 8, DEEP_IRON: 9,
  DIAMOND: 10, GOLD: 11, IRON: 12,  LAVA: 13, ACID: 14, WATER: 15, SAND: 16, GRAVEL: 17
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
    [T.WATER]: window.tile_water,
    [T.SAND]: window.tile_sand,
    [T.GRAVEL]: window.tile_gravel
  };
}
const FALLBACK_COLORS = {
  [T.GRASS]: [100, 180, 100], [T.DIRT]: [139, 90, 43], [T.STONE]: [128, 128, 128], [T.DEEP]: [80, 80, 80],
  [T.COPPER]: [180, 100, 80], [T.DEEP_COPPER]: [100, 70, 60], [T.DEEP_DIAMOND]: [80, 180, 220],
  [T.DEEP_GOLD]: [200, 160, 60], [T.DEEP_IRON]: [160, 140, 120], [T.DIAMOND]: [100, 200, 230],
  [T.GOLD]: [220, 180, 50], [T.IRON]: [180, 160, 140], [T.LAVA]: [255, 80, 0],[T.ACID]: [120, 255, 120],
  [T.WATER]: [80, 140, 255],
  [T.SAND]: [230, 220, 170],
  [T.GRAVEL]: [150, 150, 150]
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

// ====== 按键状态管理 ======
let keys = {};
let pressedKeys = new Set(); // 使用 Set 跟踪当前按下的键

// ====== Game 类 ======
let game;

class Game {
  constructor(levelType = "forest") {
    this.levelType = levelType; // 'forest' | 'water'
    this.level = levelType === "water" ? new WaterLevel() : new ForestLevel();
    this.level.loadAssets();
    //this.player = new Player(80, 60); 
    this.uiManager = new UIManager();
    this.playerHistory = [];
    this.cameraX = 0;
    this.mouseDownTime = 0;
    this.lastAttackTime = 0;
    this.lastEnemyContactDamageTime = 0;  // 上次因接触敌人扣血的时间
    this.victoryAt = 0;
    this.showGuideMenu = false;
    this.activeGuideTab = 0;
    this.lavaFirstHintShown = false;
    this.hintPriorityMessage = null;
    this.hintPriorityHoldUntil = 0;
    this.baseHintIntroUntil = 0;
    // 游戏状态：start playing gameover victory
    this.state = "start";

    // --- 新增：统一的得分反馈提示（污染物/救援共用） ---
    this.scoreToastMessage = null;   // 当前显示的得分提示文案
    this.scoreToastUntil = 0;        // 提示显示截止时间戳（millis）
  }
  
  tryAttack() {
    const now = millis();
    // 1. 检查攻击冷却
    if (now - this.lastAttackTime < ATTACK_COOLDOWN_MS) return;

    // 2. 攻击力保底
    let dmg = 2; 
    if (typeof this.getAttackDamage === "function") {
      let calcDmg = this.getAttackDamage();
      if (calcDmg > 0) dmg = calcDmg;
    }

    let closest = null;
    // 3. 扩大判定范围到 2.2 格，确保好用
    let scanRange = 2.2 * TILE_SIZE; 
    let closestDist = scanRange + 1;

    // 4. 遍历并寻找最近的敌人
    if (this.level && this.level.enemies) {
      for (const enemy of this.level.enemies) {
        if (enemy.isDead) continue;
        
        const d = this.distanceToEnemy(enemy);
        
        if (d <= scanRange && d < closestDist) {
          closestDist = d;
          closest = enemy;
        }
      }
    }

    // 5. 应用伤害
    if (closest) {
      closest.takeDamage(dmg);
      this.lastAttackTime = now;
      console.log("💥 击中目标！伤害:", dmg, "距离:", closestDist.toFixed(1));
    } else {
      console.log("☁️ 攻击挥空：附近没有敌人");
    }
  }

  setup() { 
    const groundY = this.level.terrainHeights[0];
    this.player = new Player(80, groundY - 64);
   }

  resetGameToState(state) {
    game = new Game(this.levelType);
    game.setup();
    game.state = state;
    game.showGuideMenu = false;
    game.activeGuideTab = 0;
    game.resetHintState();
  }

  resetToStartScreen() {
    this.resetGameToState("start");
  }

  resetToPlayingFromBeginning() {
    this.resetGameToState("playing");
  }

  beginPlaying() {
    this.state = "playing";
    this.showGuideMenu = false;
    this.activeGuideTab = 0;
    this.resetHintState();
  }

  resetHintState() {
    this.victoryAt = 0;
    this.lavaFirstHintShown = false;
    this.hintPriorityMessage = null;
    this.hintPriorityHoldUntil = 0;
    this.baseHintIntroUntil = millis() + 3800;
    // 重置得分反馈提示状态（避免关卡切换残留文案）
    this.scoreToastMessage = null;
    this.scoreToastUntil = 0;
}

  update() {
    this.player.update(this.level.platforms, this.level);
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
  if (item instanceof TNT) {
    item.update(now, this.player);
  } else if (item instanceof Item) {
    item.update(this.level.platforms);
  }
}
    this.checkCollisions();
    this.updateMining();

    // ===== 岩浆 / 酸池伤害判定：玩家碰撞箱底部接触岩浆/酸就立即死亡 =====
    // 使用玩家贴图位置而不是碰撞箱检测岩浆
    const pxCenter = this.player.x + this.player.w / 2;
    const colUnder = Math.floor(pxCenter / TILE_SIZE);
    const feetY = this.player.y + this.player.h;  // 玩家贴图底部的屏幕 Y

    if (colUnder >= 0 && colUnder < TERRAIN_COLS) {
      // 减去1像素以正确处理踩在格子上边界的情况
      const rowUnder = Math.floor((360 - feetY - 1) / TILE_SIZE);
      if (rowUnder >= 0) {
        const column = this.level.tileMap[colUnder];
        const tt = column?.[rowUnder];
        if (tt === T.LAVA || tt === T.ACID) {
          this.player.health = 0;
        }
      }
    }

    if (this.player.health <= 0) {
      this.state = "gameover";
      this.showGuideMenu = false;
      this.victoryAt = 0;
      return;
    }
    
    // 胜利条件：到达最后一列（TERRAIN_COLS - 1）且生命值 > 0
    const playerCol = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
    if (playerCol >= TERRAIN_COLS - 1 && this.player.health > 0) {
      if (!this.victoryAt) this.victoryAt = millis() + VICTORY_DELAY_MS;
      if (millis() >= this.victoryAt) {
        this.state = "victory";
        this.showGuideMenu = false;
      }
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
    if (!this.player || !this.level || !this.level.hintCat) return;

    const now = millis();

    // 记录历史
    this.playerHistory.push({
      x: this.player.x, y: this.player.y,
      w: this.player.w, h: this.player.h,
      facingRight: this.player.facingRight, t: now
    });

    const cutoff = now - HINT_CAT_DELAY_MS;
    while (this.playerHistory.length && this.playerHistory[0].t < cutoff) {
      this.playerHistory.shift();
    }

    let pastState = this.getDelayedState();
    
    // 如果开局还没有 500ms 的历史，就让猫先跟着玩家当前的位置
    let targetState = pastState ? pastState : this.player;

    // 执行跟随
    this.level.hintCat.follow(targetState, this.level);

    const liveHint = this.getHintMessage();
    const isBaseHint =
      liveHint === "Move: A / D\nCrouch: S\n(Double)Jump: W(x2)" ||
      liveHint === "Move: A / D\nDive: S\nSwim Up: Hold W";

    if (liveHint && !isBaseHint) {
      this.hintPriorityMessage = liveHint;
      this.hintPriorityHoldUntil = now + 1600;
      this.level.hintCat.setMessage(liveHint);
      return;
    }

    if (this.hintPriorityMessage && now < this.hintPriorityHoldUntil) {
      this.level.hintCat.setMessage(this.hintPriorityMessage);
      return;
    }

    this.hintPriorityMessage = null;
    this.hintPriorityHoldUntil = 0;
    this.level.hintCat.setMessage(liveHint || null);
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
    if (idx !== -1) this.player.inventory.splice(idx, 1);
  }

  consumeSelectedTool(toolType) {
    const s = this.player.selectedSlot;
    if (s < 0 || s >= this.player.inventory.length) return false;
    const item = this.player.inventory[s];
    if (!(item instanceof Tool) || item.toolType !== toolType) return false;
    this.player.inventory.splice(s, 1);
    this.player.selectedSlot = -1;
    return true;
  }

  getFoodHealAmount(foodType) {
    if (foodType === 'apple') return 1;
    if (foodType === 'enlarged_golden_apple') return 3;
    return 0;
  }

  handleSelectedToolUse(slotIndex, item) {
    switch (item.toolType) {
      case 'scissor':
        this.tryRescueBirdWithScissor(slotIndex);
        break;
      case 'enlarged_water_bucket':
        this.tryUseWaterBucket();
        break;
      case 'limestone':
        this.tryUseLimestone();
        break;
    }
  }

tryRescueBirdWithScissor(slotIndex) {
    const rescueRange = TILE_SIZE * 1.45;
    const trappedBird = this.level.items.find(item =>
      item instanceof TrappedBird && item.isTrapped() && this.distanceToItem(item) <= rescueRange
    );
    if (!trappedBird) return false;
    
    const target = this.getNearestTreeCrownTarget(trappedBird);
    trappedBird.startRescue(target.x, target.y);
    this.player.inventory.splice(slotIndex, 1);
    this.player.selectedSlot = -1;
    this.player.score += 1;
    // 成功解救小动物：弹出统一得分提示
    this.scoreToastMessage = "Wildlife rescued! +1";
    this.scoreToastUntil = millis() + 1800;
    return true;
  }

  getNearestTreeCrownTarget(bird) {
    const trees = this.level.getTreeInfos();
    if (!trees.length) return { x: bird.x + TILE_SIZE, y: Math.max(24, bird.y - TILE_SIZE) };
    const birdCx = bird.x + bird.w / 2;
    let nearest = trees[0];
    let best = Math.abs(nearest.trunkX - birdCx);
    for (let i = 1; i < trees.length; i++) {
      const d = Math.abs(trees[i].trunkX - birdCx);
      if (d < best) {
        best = d;
        nearest = trees[i];
      }
    }
    const pool = nearest.upperCrown.length ? nearest.upperCrown : nearest.crown;
    const trunkColCenter = nearest.trunkX / TILE_SIZE - 0.5;
    let pick = pool[0];
    let bestScore = Infinity;
    for (const p of pool) {
      const dx = Math.abs(p.col - trunkColCenter);
      const score = dx * 1000 - p.row;
      if (score < bestScore) {
        bestScore = score;
        pick = p;
      }
    }
    const targetX = pick.col * TILE_SIZE + (TILE_SIZE - 16) / 2;
    const tileTop = 360 - (pick.row + 1) * TILE_SIZE;
    const targetY = tileTop + TILE_SIZE * 0.25;
    return { x: targetX, y: targetY };
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

  getClosestToolDistance(toolType) {
    return this.getClosestDistance(
      this.level.items,
      (item) => item instanceof Tool && item.toolType === toolType,
      this.distanceToItem
    );
  }

  getClosestItemDistanceByClass(Cls) {
    return this.getClosestDistance(
      this.level.items,
      (item) => item instanceof Cls,
      this.distanceToItem
    );
  }

  getClosestOreDistance() {
    const box = this.player.getCollisionBox();
    const px = box.x + box.w / 2;
    const py = box.y + box.h / 2;
    let best = Infinity;
    for (let col = 0; col < TERRAIN_COLS; col++) {
      const surfaceY = this.level.terrainHeights[col];
      if (surfaceY === undefined) continue;
      const rows = this.level.tileMap[col] || [];
      for (let row = 0; row < rows.length; row++) {
        const tileType = rows[row];
        if (!this.isOreTile(tileType)) continue;
        const tx = col * TILE_SIZE + TILE_SIZE / 2;
        const ty = surfaceY + row * TILE_SIZE + TILE_SIZE / 2;
        const d = Math.hypot(px - tx, py - ty);
        if (d < best) best = d;
      }
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
    return this.getClosestOreDistance() <= HINT_POLLUTANT_RANGE;
  }

  isNearFloating() {
    for (const p of this.level.platforms) {
      if (!p._floating) continue;
      if (this.isInReachZone(p.x, p.y, p.w, p.h)) return true;
    }
    return false;
  }

  isNearHazard(tileType, range = TILE_SIZE * 1.1) {
    const box = this.player.getCollisionBox();
    const bx = box.x;
    const by = box.y;
    const bw = box.w;
    const bh = box.h;

    const colMin = Math.max(0, Math.floor((bx - range) / TILE_SIZE));
    const colMax = Math.min(TERRAIN_COLS - 1, Math.floor((bx + bw + range) / TILE_SIZE));

    for (let col = colMin; col <= colMax; col++) {
      const rows = this.level.tileMap[col] || [];
      for (let row = 0; row < rows.length; row++) {
        if (rows[row] !== tileType) continue;
        const rx = col * TILE_SIZE;
        const ry = 360 - (row + 1) * TILE_SIZE;
        const rw = TILE_SIZE;
        const rh = TILE_SIZE;

        const dx = Math.max(rx - (bx + bw), 0, bx - (rx + rw));
        const dy = Math.max(ry - (by + bh), 0, by - (ry + rh));
        if (Math.hypot(dx, dy) <= range) return true;
      }
    }

    return false;
  }

  isNearLava() {
    return this.isNearHazard(T.LAVA);
  }

  isNearAcid() {
    return this.isNearHazard(T.ACID);
  }

  getHintMessage() {
    // 优先显示短时得分反馈，覆盖普通环境提示
    if (this.scoreToastMessage && millis() < this.scoreToastUntil) {
      return this.scoreToastMessage;
    }

    // 1. 设置基础提示词（作为没有紧急事件时的默认显示）
    let baseHint = null;
    if (this.levelType === "water") {
      baseHint = "Move: A / D\nDive: S\nSwim Up: Hold W";
    } else if (this.levelType === "forest") {
      baseHint = "Move: A / D\nCrouch: S\n(Double)Jump: W(x2)";
    }

    // 2. 环境与道具检测（如果下方条件满足，会直接 return，从而覆盖上面的 baseHint）
    const nearLavaNow = this.isNearLava();
    const worldX = mouseX + this.cameraX;
    const worldY = mouseY;

    // 最后一层方块警告
    const pointedTile = this.getPointedMineableTile(worldX, worldY);
    if (pointedTile && pointedTile.row === pointedTile.bottomRow) return "Careful! Keep the last tile.";

    // 敌人警告
    const closestEnemyDist = this.getClosestDistance(
      this.level.enemies,
      (enemy) => !enemy.isDead,
      this.distanceToEnemy
    );
    const zombieHintRange = MUTUAL_ATTACK_RANGE * 1.6;
    if (closestEnemyDist <= zombieHintRange) return "Zombie close! Press F.";

    // TNT 警告
    const closestTntDist = this.getClosestItemDistanceByClass(TNT);
    if (closestTntDist <= HINT_POLLUTANT_RANGE) return "❗️TNT nearby. Keep away.";

    // 岩浆与水桶逻辑
    const hasBucket = this.hasTool('enlarged_water_bucket');
    if (nearLavaNow) {
      if (!hasBucket) return "‼️ Near lava:\nneed water to extinguish.";
      return "‼️ Near lava:\nClick bucket to extinguish.";
    }

    // 道具/矿石/鸟类提示 (如果靠近这些物体，提示会优先显示)
    const closestBucketDist = this.getClosestToolDistance('enlarged_water_bucket');
    if (closestBucketDist <= HINT_POLLUTANT_RANGE && !hasBucket) return "Collect water source.";

    const hasLimestone = this.hasTool('limestone');
    const closestLimestoneDist = this.getClosestToolDistance('limestone');
    if (closestLimestoneDist <= HINT_POLLUTANT_RANGE && !hasLimestone) return "Collect limestone.";
    if (this.isNearAcid()) return "‼️ Near acid pool:\nClick limestone to treat.";

    const closestScissorDist = this.getClosestToolDistance('scissor');
    if (closestScissorDist <= HINT_POLLUTANT_RANGE && !this.playerHasScissor()) return "Pick up scissors first.";

    const closestBirdDist = this.getClosestDistance(
      this.level.items,
      (item) => item instanceof TrappedBird && item.isTrapped(),
      this.distanceToItem
    );
    if (closestBirdDist <= HINT_POLLUTANT_RANGE * 1.7) {
      if (closestBirdDist <= HINT_POLLUTANT_RANGE * 0.9) return "Click scissors to rescue.";
      return "Bird needs rescue.";
    }

    const closestPollutantDist = this.getClosestItemDistanceByClass(Pollutant);
    if (closestPollutantDist <= HINT_POLLUTANT_RANGE) return "Collect nearby pollutants.";

    const closestOreDist = this.getClosestOreDistance();
    if (closestOreDist <= HINT_POLLUTANT_RANGE * 1.35) {
      if (closestOreDist <= HINT_POLLUTANT_RANGE * 0.85) return "Hold mouse to mine ore.";
      return "Mine ore to upgrade sword.";
    }

    // 3. 基础提示：仅开局短暂停留，后续仅玩家静止时显示
    const now = millis();
    const noMoveInput = !keys['a'] && !keys['d'] && !keys['w'] && !keys['s'];
    const isPlayerStill = Math.abs(this.player.vx || 0) < 0.06 && Math.abs(this.player.vy || 0) < 0.08;
    const shouldShowBaseHint = now <= this.baseHintIntroUntil || (noMoveInput && isPlayerStill);
    if (baseHint && shouldShowBaseHint) return baseHint;
    return null;
  }

handleMousePressed(mx, my) {
  const topRight = this.uiManager.getTopRightButtons();
  if (this.uiManager.isInsideRect(mx, my, topRight.exitRect)) {
    this.resetToStartScreen();
    return;
  }
  if (this.uiManager.isInsideRect(mx, my, topRight.menuRect)) {
    this.showGuideMenu = !this.showGuideMenu;
    return;
  }

  if (this.showGuideMenu) {
    const tabs = this.uiManager.getGuideTabRects();
    for (let i = 0; i < tabs.length; i++) {
      if (this.uiManager.isInsideRect(mx, my, tabs[i])) {
        this.activeGuideTab = i;
        return;
      }
    }
  }

  const slotIndex = this.getInventorySlotAt(mx, my);
  if (slotIndex === -1) return;

  // 记录选中的格子
  this.player.selectedSlot = slotIndex;

  const item = this.player.inventory[slotIndex];
  if (!item) return;

  if (item instanceof Tool) {
    this.handleSelectedToolUse(slotIndex, item);
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

  if (changed > 0) {
    this.consumeSelectedTool('enlarged_water_bucket');
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

  if (changed > 0) {
    this.consumeSelectedTool('limestone');
    return true;
  }

  return false;
}

 checkCollisions() {
  const now = millis();
  // 敌人伤害判定：距离小于1.3格时可以攻击玩家
  for (const enemy of this.level.enemies) {
    if (enemy.isDead) continue;
    
    const distToEnemy = this.distanceToEnemy(enemy);
    const inAttackRange = distToEnemy < MUTUAL_ATTACK_RANGE;
    
    // 更新敌人是否在攻击范围内
    if (inAttackRange) {
      // 首次进入攻击范围
      if (enemy.enteredAttackRangeAt === -1) {
        enemy.enteredAttackRangeAt = now;
      }
    } else {
      // 离开攻击范围，重置
      enemy.enteredAttackRangeAt = -1;
    }
    
    // 检查是否可以造成伤害：已在范围内超过延迟时间 且 上次伤害冷却已过
    if (!inAttackRange) continue;  // 不在范围内不伤害
    if (enemy.enteredAttackRangeAt === -1) continue;  // 不应该发生，但保险起见检查
    if (now - enemy.enteredAttackRangeAt < ENEMY_ATTACK_START_DELAY_MS) continue;  // 延迟未过
    if (now - this.lastEnemyContactDamageTime < ENEMY_CONTACT_DAMAGE_INTERVAL_MS) continue;  // 伤害冷却未过
    
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

    if (item instanceof TrappedBird) {
      continue;
    }

    if (item instanceof Pollutant) {
      this.player.score += 1;
      // 收集污染物：弹出统一得分提示
      this.scoreToastMessage = "Pollutant collected! +1";
      this.scoreToastUntil = millis() + 1400;
    }

    if (item instanceof Food) {
      const heal = this.getFoodHealAmount(item.foodType);
      if (heal > 0) this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
      this.level.items.splice(i, 1);
      continue;
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
    this.player.draw();
    this.level.hintCat.draw();

    // 如果玩家在水中，叠加一层半透明水贴图在玩家前面
    // if (typeof this.player.isInWater === "function" && this.player.isInWater(this.level)) {
    //   const img = window.tile_water;
    //   const px = this.player.x;
    //   const py = this.player.y;
    //   const pw = this.player.w;
    //   const ph = this.player.h;
    //   push();
    //   noStroke();
    //   if (img && img.width > 0) {
    //     tint(255, 160);
    //     // 用水贴图在玩家范围内平铺
    //     const tileW = TILE_SIZE;
    //     const tileH = TILE_SIZE;
    //     for (let y = py; y < py + ph; y += tileH) {
    //       for (let x = px; x < px + pw; x += tileW) {
    //         image(img, x, y, tileW, tileH);
    //       }
    //     }
    //   } else {
    //     fill(80, 140, 255, 120);
    //     rect(px, py, pw, ph);
    //   }
    //   pop();
    // }
    pop();
    this.uiManager.drawHUD(this.player, this.showGuideMenu, this.activeGuideTab);
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

  /** 世界坐标 (wx, wy) -> tileMap 的 tileType（wy 用画布坐标：上小下大） */
  getTileAtWorld(wx, wy) {
    const col = Math.floor(wx / TILE_SIZE);
    if (col < 0 || col >= TERRAIN_COLS) return T.NONE;
    const row = Math.floor((CANVAS_H - wy - 1) / TILE_SIZE);
    if (row < 0) return T.NONE;
    return this.tileMap[col]?.[row] ?? T.NONE;
  }

  isWaterAtWorld(wx, wy) {
    return this.getTileAtWorld(wx, wy) === T.WATER;
  }
  getTreeInfos() {
    if (!this.treeColumns) return [];
    const infos = [];
    let col = 0;
    while (col < this.treeColumns.length) {
      const hasLog = (this.treeColumns[col] || []).includes('log');
      if (!hasLog) { col++; continue; }
      const start = col;
      while (col + 1 < this.treeColumns.length && (this.treeColumns[col + 1] || []).includes('log')) col++;
      const end = col;
      const crown = [];
      for (let c = Math.max(0, start - 2); c <= Math.min(TERRAIN_COLS - 1, end + 2); c++) {
        const column = this.treeColumns[c] || [];
        for (let r = 0; r < column.length; r++) {
          if (column[r] === 'leaves') crown.push({ col: c, row: r });
        }
      }
      if (crown.length) {
        const rows = crown.map(p => p.row);
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const split = minRow + (maxRow - minRow) * 0.45;
        infos.push({
          trunkX: ((start + end) / 2 + 0.5) * TILE_SIZE,
          crown,
          upperCrown: crown.filter(p => p.row >= split)
        });
      }
      col++;
    }
    return infos;
  }
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
    const V = T.GRAVEL, SA = T.SAND, W = T.WATER; // 水关地形简写（ForestLevel 地形数据复用）

    // 统一地形定义：addTerrainColumn(列号, 总高度, [贴图数组])
    // - 数组从底部往上：[0] 是最底下那格，越往后越高
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木 / 水下植物（'log'/'leaves'/海草珊瑚标记字符串）：只绘制背景，不碰撞
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

    // 被困小鸟（网 48x36，鸟 24x30）
    const birdOffset = (TILE_SIZE - 48) / 2;
    this.items.push(new TrappedBird(73 * TILE_SIZE + birdOffset, groundY(73) - 36, 48, 36));
    this.items.push(new TrappedBird(92 * TILE_SIZE + birdOffset, groundY(92) - 36, 48, 36));

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
    // 在水关中，复用 treeColumns 作为“背景装饰层”，包括树木与水下植物/珊瑚
    if (!this.treeColumns) return;

    const spriteMap = {
      // 森林关中复用的树
      log: window.tile_oak_log,
      leaves: window.tile_oak_leaves,
      // 海草
      seagrass: window.tile_seagrass,
      tall_seagrass_1: window.tile_tall_seagrass_1,
      tall_seagrass_2: window.tile_tall_seagrass_2,
      // 珊瑚块 & 扇形珊瑚
      tube_coral: window.tile_tube_coral,
      tube_coral_fan: window.tile_tube_coral_fan,
      horn_coral: window.tile_horn_coral,
      horn_coral_fan: window.tile_horn_coral_fan,
      fire_coral: window.tile_fire_coral,
      fire_coral_fan: window.tile_fire_coral_fan,
      bubble_coral: window.tile_bubble_coral,
      bubble_coral_fan: window.tile_bubble_coral_fan,
      brain_coral: window.tile_brain_coral,
      brain_coral_fan: window.tile_brain_coral_fan,
      // 海带（多格高，用不同贴图拼接）
      kelp_1: window.tile_kelp_1,
      kelp_2: window.tile_kelp_2,
      kelp_3: window.tile_kelp_3,
      kelp_4: window.tile_kelp_4,
      kelp_5: window.tile_kelp_5
    };

    push();
    imageMode(CORNER);

    for (let col = 0; col < this.treeColumns.length; col++) {
      const column = this.treeColumns[col] || [];
      for (let i = 0; i < column.length; i++) {
        const kind = column[i];
        if (!kind || kind === T.NONE) continue;

        const x = col * TILE_SIZE;
        const y = 360 - (i + 1) * TILE_SIZE; // 从底部往上

        const img = spriteMap[kind];
        if (img && img.width > 0) {
          image(img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          // 根据种类给一些大致的颜色，作为贴图加载失败时的占位
          noStroke();
          if (kind === 'log') {
            fill(120, 86, 54);
          } else if (kind === 'leaves' || kind.startsWith('kelp') || kind.includes('seagrass')) {
            fill(60, 140, 70, 230);
          } else if (kind.includes('fire')) {
            fill(220, 80, 60, 230);
          } else if (kind.includes('bubble')) {
            fill(200, 80, 210, 230);
          } else if (kind.includes('brain')) {
            fill(230, 120, 190, 230);
          } else if (kind.includes('horn')) {
            fill(230, 210, 80, 230);
          } else if (kind.includes('tube')) {
            fill(80, 120, 220, 230);
          } else {
            fill(80, 150, 120, 230);
          }
          rect(x, y, TILE_SIZE, TILE_SIZE);
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
    
    // 找到第一个非 T.NONE/背景装饰 的地形块，作为地表高度
    let terrainHeight = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const isBackground =
        tile === 'log' || tile === 'leaves' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5';

      if (tile !== T.NONE && !isBackground) {
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
      
      // 树木 / 水下装饰：只记录到 treeColumns，不创建平台
      if (
        tile === 'log' || tile === 'leaves' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5'
      ) {
        if (!this.treeColumns[col]) this.treeColumns[col] = [];
        this.treeColumns[col][i] = tile;
        continue;
      }

      // 水：只绘制，不创建碰撞平台（玩家/实体可以落入水中）
      if (tile === T.WATER) {
        const row = i;
        this.tileMap[col][row] = tile;
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

// 关卡2
class WaterLevel extends Level {
  loadAssets() {
    // 贴图简写（pic/ground 中全部可用）: G草 D土 S石 X深板岩 | COPPER铜 DIAMOND钻石 GOLD金 IRON铁 | DEEP_COPPER/GOLD/IRON/DIAMOND 深板岩矿
    const G = T.GRASS, D = T.DIRT, S = T.STONE, X = T.DEEP;
    const Cu = T.COPPER, CuX = T.DEEP_COPPER, Dx = T.DEEP_DIAMOND, Gx = T.DEEP_GOLD, Ix = T.DEEP_IRON;
    const Di = T.DIAMOND, Go = T.GOLD, Ir = T.IRON;
    const V = T.GRAVEL;
    const W = T.WATER;
    const SA = T.SAND;
    const N = T.NONE; // 空格子简写

    // 统一地形定义：addTerrainColumn(列号, 总高度, [贴图数组])
    // - 数组从底部往上：[0] 是最底下那格，越往后越高
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木（'log'/'leaves'）：只绘制背景，不碰撞
    // - N (T.NONE)：空格子
    const terrain = [
      // 第1屏
      [0,12,[V,V,SA,W,W,W,W,W,W,W,W,W]],
      [1,12,[V,SA,SA,'fire_coral_fan',W,W,W,W,W,W,W,W]],
      [2,12,[V,SA,SA,'horn_coral',W,W,W,W,W,W,W,W]],
      [3,12,[V,SA,SA,'bubble_coral_fan',W,W,W,W,W,W,W,W]],
      [4,12,[V,SA,'fire_coral',W,W,W,W,W,W,W,W,W]],
      [5,12,[V,SA,'fire_coral_fan',W,W,W,W,W,W,W,W,W]],
      [6,12,[V,SA,'bubble_coral',W,W,SA,W,W,W,W,W,W]],
      [7,12,[V,SA,W,W,W,SA,SA,W,W,W,W,W]],
      [8,12,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,SA,W,W,W,W,W]],
      [9,12,[V,SA,'seagrass',W,W,W,SA,W,W,W,W,W]],
      [10,12,[V,SA,'horn_coral_fan',W,W,W,SA,W,W,W,W,W]],
      [11,12,[V,SA,SA,W,W,W,W,W,W,W,W,W]],
      [12,12,[V,SA,SA,W,W,W,W,W,W,W,W,W]],
      [13,12,[V,SA,SA,W,W,W,W,W,W,W,W,W]],
      [14,12,[V,V,SA,'horn_coral',W,W,W,W,W,W,W,W]],
      [15,12,[V,V,SA,SA,'fire_coral_fan',W,W,W,SA,W,W,W]],
      [16,12,[V,V,SA,SA,W,W,W,W,SA,'horn_coral_fan',W,W]],
      [17,12,[V,V,SA,SA,W,W,W,W,SA,W,W,W]],
      [18,12,[V,V,SA,W,W,W,W,SA,SA,W,W,W]],
      [19,12,[V,V,SA,W,W,W,W,SA,SA,'tall_seagrass_1','tall_seagrass_2',W]],
      // 第2屏
      [20,12,[V,V,SA,'bubble_coral',W,W,W,SA,'bubble_coral_fan',W,W,N]],
      [21,12,[V,V,SA,'bubble_coral_fan',W,W,W,W,W,W,W,N]],
      [22,12,[V,V,SA,W,W,W,W,W,W,W,W,N]],
      [23,12,[V,V,SA,'seagrass',W,W,W,W,W,W,W,N]],
      [24,12,[V,V,SA,'kelp_1','kelp_2','kelp_3',W,W,W,W,W,N]],
      [25,12,[V,V,SA,SA,W,W,W,W,W,W,W,N]],
      [26,12,[V,V,SA,SA,'fire_coral_fan',W,W,W,W,SA,W,N]],
      [27,12,[V,V,SA,SA,'horn_coral',W,W,W,W,SA,W,N]],
      [28,12,[V,V,V,SA,SA,W,W,W,V,SA,'horn_coral_fan',N]],
      [29,12,[V,V,V,SA,SA,'fire_coral',W,W,V,SA,'fire_coral_fan',N]],
      [30,12,[V,V,V,SA,SA,W,W,W,V,SA,W,N]],
      [31,12,[V,V,SA,SA,SA,W,W,W,W,SA,W,N]],
      [32,12,[V,V,SA,'fire_coral',W,W,W,W,W,W,W,N]],
      [33,12,[V,V,SA,'fire_coral_fan',W,W,W,W,W,W,W,N]],
      [34,12,[V,SA,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,N]],
      [35,12,[V,SA,SA,W,W,W,W,W,W,W,W,N]],
      [36,12,[V,SA,'bubble_coral_fan',W,W,W,W,W,W,W,W,N]],
      [37,12,[V,SA,W,W,W,W,W,W,W,W,W,N]],
      [38,12,[V,SA,'horn_coral',W,W,W,W,W,W,W,W,N]],
      [39,12,[V,SA,SA,SA,SA,W,W,W,W,W,W,N]],
      // 第3屏
      [40,11,[V,V,V,SA,SA,SA,SA,W,W,W,W]],
      [41,11,[V,V,SA,SA,SA,SA,W,W,W,W,W]],
      [42,11,[V,V,SA,'horn_coral_fan',W,W,W,W,W,W,W]],
      [43,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [44,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [45,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [46,11,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,W]],
      [47,11,[V,SA,'seagrass',W,W,W,W,SA,W,W,W]],
      [48,11,[V,SA,SA,W,W,W,W,SA,'fire_coral_fan',W,W]],
      [49,11,[V,SA,SA,SA,'horn_coral',W,W,SA,'horn_coral_fan',W,W]],
      [50,11,[V,SA,SA,'fire_coral',W,W,W,SA,SA,W,W]],
      [51,11,[V,SA,SA,'bubble_coral',W,W,W,SA,W,W,W]],
      [52,11,[V,SA,W,W,W,W,W,SA,'bubble_coral_fan',W,W]],
      [53,11,[V,SA,W,W,W,W,W,SA,W,W,W]],
      [54,11,[V,SA,'kelp_1','kelp_2','kelp_3',W,W,W,W,W,W]],
      [55,11,[V,SA,SA,SA,W,W,W,W,W,W,W]],
      [56,11,[V,SA,SA,SA,SA,SA,W,W,W,W,W]],
      [57,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [58,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [59,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      // 第4屏
      [60,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [61,11,[V,SA,SA,W,W,W,W,W,W,SA,W]],
      [62,11,[V,SA,SA,'fire_coral',W,W,W,W,V,SA,W]],
      [63,11,[V,V,SA,'horn_coral',W,W,W,W,V,SA,'fire_coral_fan']],
      [64,11,[V,V,SA,'bubble_coral',W,W,W,W,SA,SA,W]],
      [65,11,[V,V,SA,SA,W,W,W,W,SA,W,W]],
      [66,11,[V,V,SA,SA,'fire_coral',W,W,W,SA,'bubble_coral_fan',W]],
      [67,11,[V,SA,SA,'bubble_coral_fan',W,W,W,W,SA,W,W]],
      [68,11,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,W]],
      [69,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [70,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [71,11,[V,SA,'fire_coral_fan',W,W,W,W,W,W,W,W]],
      [72,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [73,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [74,11,[V,V,SA,'bubble_coral_fan',W,W,W,W,W,W,W]],
      [75,11,[V,V,SA,'fire_coral',W,W,W,W,W,W,W]],
      [76,11,[V,V,SA,SA,SA,SA,W,W,W,W,W]],
      [77,11,[V,SA,SA,SA,SA,W,W,W,W,W,W]],
      [78,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [79,11,[V,SA,'horn_coral_fan',W,W,W,W,W,SA,'horn_coral',W]],
      // 第5屏
      [80,11,[V,SA,'bubble_coral_fan',W,W,W,W,W,SA,SA,'fire_coral']],
      [81,11,[V,SA,W,W,W,W,W,W,SA,SA,W]],
      [82,11,[V,SA,W,W,W,W,W,W,SA,W,W]],
      [83,11,[V,SA,SA,'kelp_1','kelp_2','kelp_3',W,W,SA,W,W]],
      [84,11,[V,SA,SA,W,W,W,W,W,SA,'tall_seagrass_1','tall_seagrass_2']],
      [85,11,[V,V,SA,'bubble_coral',W,W,W,W,W,W,W]],
      [86,11,[V,V,SA,SA,W,W,W,W,W,W,W]],
      [87,11,[V,V,SA,SA,'horn_coral_fan',W,W,W,W,W,W]],
      [88,11,[V,SA,SA,'fire_coral_fan',W,W,W,W,W,W,W]],
      [89,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [90,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [91,11,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,W]],
      [92,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [93,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [94,11,[V,SA,SA,'bubble_coral',W,W,W,W,SA,'bubble_coral_fan',W]],
      [95,11,[V,SA,SA,SA,W,W,W,W,SA,SA,'seagrass']],
      [96,11,[V,SA,SA,SA,W,W,W,W,V,SA,W]],
      [97,11,[V,V,SA,SA,SA,W,W,W,V,SA,'horn_coral']],
      [98,11,[V,V,V,SA,SA,W,W,W,W,SA,'fire_coral']],
      [99,11,[V,V,SA,SA,SA,'horn_coral_fan',W,W,W,SA,W]],
      // 第6屏
      [100,11,[V,V,SA,SA,'kelp_1','kelp_2','kelp_3',W,W,W,W]],
      [101,11,[V,V,SA,SA,'fire_coral_fan',W,W,W,W,W,W]],
      [102,11,[V,V,SA,SA,W,W,W,W,W,W,W]],
      [103,11,[V,SA,SA,'bubble_coral',W,W,W,W,W,W,W]],
      [104,11,[V,SA,SA,'horn_coral_fan',W,W,W,W,W,W,W]],
      [105,11,[V,SA,SA,'fire_coral',W,W,W,W,W,W,W]],
      [106,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [107,11,[V,SA,W,W,W,W,W,SA,W,W,W]],
      [108,11,[V,SA,SA,W,W,W,W,SA,'fire_coral_fan',W,W]],
      [109,11,[V,SA,W,W,W,W,W,SA,'seagrass',W,W]],
      [110,11,[V,SA,SA,'seagrass',W,W,W,SA,SA,W,W]],
      [111,11,[V,V,SA,SA,W,W,W,SA,SA,W,W]],
      [112,11,[V,V,SA,SA,'horn_coral',W,W,V,SA,'bubble_coral_fan',W]],
      [113,11,[V,SA,SA,W,W,W,W,W,SA,W,W]],
      [114,11,[V,SA,'bubble_coral',W,W,W,W,W,W,W,W]],
      [115,11,[V,SA,'fire_coral_fan',W,W,W,W,W,W,W,W]],
      [116,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [117,11,[V,SA,SA,'fire_coral',W,W,W,W,W,W,W]],
      [118,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [119,11,[V,V,SA,SA,W,W,W,W,W,W,W]],
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

    // ===== 敌人和物品生成（基于当前地形）=====
    // 敌人
    // this.enemies.push(new Enemy(54 * TILE_SIZE, groundY(54) - 64, 64, 64));
    // this.enemies.push(new Enemy(104 * TILE_SIZE, baseGroundY(104) - 64, 64, 64));

    
    // 污染物
   this.items.push(new Pollutant(40 * TILE_SIZE + 4, groundY(40) - 18, 24, 18, "plastic_bottle"));
   this.items.push(new Pollutant(46 * TILE_SIZE + 4, groundY(46) - 18, 24, 18, "plastic_bag"));
   this.items.push(new Pollutant(60 * TILE_SIZE + 4, groundY(60) - 18, 24, 18, "plastic_bottle"));

    // TNT（不可收集，触发后爆炸）
    // this.items.push(new TNT(97 * TILE_SIZE, groundY(97) - TILE_SIZE, TILE_SIZE, TILE_SIZE));

    // 食物（地面上，吃了回血，不进背包）
    // this.items.push(new Food(70 * TILE_SIZE + 4, groundY(70) - 24, 24, 24, 'apple'));
    //this.items.push(new Food(107 * TILE_SIZE + 4, groundY(107) - 24, 24, 24, 'enlarged_golden_apple'));

    // 被困小鸟（网 32x24，鸟 16x20）
    // const birdOffset = (TILE_SIZE - 32) / 2;
    // this.items.push(new TrappedBird(73 * TILE_SIZE + birdOffset, groundY(73) - 24, 32, 24));
    // this.items.push(new TrappedBird(92 * TILE_SIZE + birdOffset, groundY(92) - 24, 32, 24));

    // 工具（平台上 + 地面上，居中放置）Tool(x, y, w, h, toolType)
    // toolType 为 pic/tool 下文件名不含 .png，如 'scissor' 'bucket'
    const toolOffset = (TILE_SIZE - 24) / 2;
    // 剪刀
    // this.items.push(new Tool(28 * TILE_SIZE + toolOffset, groundY(28) - 24, 24, 24, 'scissor'));
    // this.items.push(new Tool(92 * TILE_SIZE + toolOffset, baseGroundY(92) - 24, 24, 24, 'scissor'));
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
    // 水关：treeColumns 既包含树木，也包含水下植物/珊瑚，只做装饰，不参与碰撞
    if (!this.treeColumns) return;

    const spriteMap = {
      log: window.tile_oak_log,
      leaves: window.tile_oak_leaves,
      seagrass: window.tile_seagrass,
      tall_seagrass_1: window.tile_tall_seagrass_1,
      tall_seagrass_2: window.tile_tall_seagrass_2,
      tube_coral: window.tile_tube_coral,
      tube_coral_fan: window.tile_tube_coral_fan,
      horn_coral: window.tile_horn_coral,
      horn_coral_fan: window.tile_horn_coral_fan,
      fire_coral: window.tile_fire_coral,
      fire_coral_fan: window.tile_fire_coral_fan,
      bubble_coral: window.tile_bubble_coral,
      bubble_coral_fan: window.tile_bubble_coral_fan,
      brain_coral: window.tile_brain_coral,
      brain_coral_fan: window.tile_brain_coral_fan,
      kelp_1: window.tile_kelp_1,
      kelp_2: window.tile_kelp_2,
      kelp_3: window.tile_kelp_3,
      kelp_4: window.tile_kelp_4,
      kelp_5: window.tile_kelp_5
    };

    push();
    imageMode(CORNER);

    for (let col = 0; col < this.treeColumns.length; col++) {
      const column = this.treeColumns[col] || [];
      for (let i = 0; i < column.length; i++) {
        const kind = column[i];
        if (!kind || kind === T.NONE) continue;

        const x = col * TILE_SIZE;
        const y = 360 - (i + 1) * TILE_SIZE;

        const img = spriteMap[kind];
        if (img && img.width > 0) {
          image(img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          noStroke();
          if (kind === 'log') {
            fill(120, 86, 54);
          } else if (kind === 'leaves' || kind.startsWith('kelp') || kind.includes('seagrass')) {
            fill(60, 140, 70, 230);
          } else if (kind.includes('fire')) {
            fill(220, 80, 60, 230);
          } else if (kind.includes('bubble')) {
            fill(200, 80, 210, 230);
          } else if (kind.includes('brain')) {
            fill(230, 120, 190, 230);
          } else if (kind.includes('horn')) {
            fill(230, 210, 80, 230);
          } else if (kind.includes('tube')) {
            fill(80, 120, 220, 230);
          } else {
            fill(80, 150, 120, 230);
          }
          rect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    pop();
  }

  addTerrainColumn(col, heightTiles, tiles) {
    // 统一处理：地形、树木、水下装饰
    // - 数组从底部往上：tiles[0] 是最底下那格
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木 / 水下植物（字符串标记）：只绘制，不碰撞
    // - T.NONE：空格子
    
    const baseY = 360;
    if (!this.treeColumns) this.treeColumns = Array.from({ length: TERRAIN_COLS }, () => []);
    
    // 找到第一个非 T.NONE/装饰 的地形块，作为地表高度
    let terrainHeight = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const isBackground =
        tile === 'log' || tile === 'leaves' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5';

      if (tile !== T.NONE && !isBackground) {
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
      
      if (tile === T.NONE || tile === undefined || tile === null) continue;
      
      // 树木 / 水下装饰：只记录到 treeColumns，不创建平台
      if (
        tile === 'log' || tile === 'leaves' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5'
      ) {
        if (!this.treeColumns[col]) this.treeColumns[col] = [];
        this.treeColumns[col][i] = tile;
        continue;
      }

      // 水：只绘制，不创建碰撞平台
      if (tile === T.WATER) {
        const row = i;
        this.tileMap[col][row] = tile;
        continue;
      }
      
      // 其它地形：创建碰撞平台
      const row = i;
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

  // 在水关中，整个屏幕都是水中环境。
  // 只要玩家所在格子不是 SAND 或 GRAVEL，一律视为水中。
  // （T.NONE = 空气格子就是水；装饰字符串不进 tileMap，也是水）
  isWaterAtWorld(wx, wy) {
    const tile = this.getTileAtWorld(wx, wy);
    if (tile === T.SAND || tile === T.GRAVEL) return false;
    return true;
  }

  draw() {
    // ===== 底层：整屏水背景（仅视觉效果，不影响碰撞和判定）=====
    const waterImg = window.tile_water;
    const tileW = TILE_SIZE;
    const tileH = TILE_SIZE;

    if (waterImg && waterImg.width > 0) {
      // 用水贴图在整个关卡宽度范围内平铺
      for (let y = 0; y < CANVAS_H; y += tileH) {
        for (let x = 0; x < WORLD_WIDTH; x += tileW) {
          image(waterImg, x, y, tileW, tileH);
        }
      }
    } else {
      // 贴图加载失败时，用纯色填充背景水层
      noStroke();
      fill(80, 140, 255);
      rect(0, 0, WORLD_WIDTH, CANVAS_H);
    }

    // ===== 上层：正常地形（沙子/石头/水池等），逻辑与判定保持不变 =====
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
    this.swimUpHeld = false;  // 水中是否按住上浮键（空格）

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

  isInWater(level) {
    if (!level) return false;
    const b = this.getCollisionBox();
    const pts = [
      // 中心
      { x: b.x + b.w / 2, y: b.y + b.h / 2 },
      // 左右中部
      { x: b.x + 2, y: b.y + b.h / 2 },
      { x: b.x + b.w - 2, y: b.y + b.h / 2 },
      // 脚部附近
      { x: b.x + b.w / 2, y: b.y + b.h - 2 }
    ];
    return pts.some(p => level.isWaterAtWorld(p.x, p.y));
  }

  update(platforms, level) {
    // 地面上：每帧重置速度，完全由按键控制
    // 空中：保持惯性，但有空气阻力
    if (this.onGround) {
      this.vx = 0;
    } else {
      // 空中减速：每帧减少 5% 的水平速度（模拟空气阻力）
      this.vx *= 0.85;
      // 速度太小时直接归零，避免永远飘
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }
    
    // 仅 WASD：A/D 水平移动，S 下蹲
    const leftHeld = !!keys['a'];
    const rightHeld = !!keys['d'];
    const crouchHeld = !!keys['s'];
    this.isCrouching = crouchHeld && this.onGround;
    if (leftHeld && !rightHeld) {
      this.vx = -this.speed;
    } else if (rightHeld && !leftHeld) {
      this.vx = this.speed;
    } else if (this.onGround) {
      // 只有在地面上且没有按键时才停止
      this.vx = 0;
    }
    // 如果在空中且没有按键，保持原有的 vx 但会逐渐减速
    
    // 空中控制加成：在空中时水平移动速度提升 20%
    if (!this.onGround && this.vx !== 0 && (leftHeld || rightHeld)) {
      this.vx *= 1.2;
    }
    
    if (this.vx !== 0) this.facingRight = this.vx > 0;

    const inWater = this.isInWater(level);
    if (inWater) {
      // 水中左右移动速度减小
      this.vx *= 0.3;
      // 水中：不走正常重力/跳跃，改为匀速下沉；按住空格匀速上浮
      const swimUp = this.swimUpHeld;
      this.vy = swimUp ? WATER_RISE_VY : (crouchHeld ? WATER_SINK_VY * 1.35 : WATER_SINK_VY);
    } else {
      this.vy += this.gravity;
    }

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

    // 世界下边界：防止掉出画布（即使底部全是水/无碰撞）
    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
      this.jumpsRemaining = this.maxJumps;
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
    const crouchScale = this.isCrouching ? 0.78 : 1;
    const drawH = this.h * crouchScale;
    const drawY = this.y + (this.h - drawH);
    if (img && img.width > 0) image(img, this.x, drawY, this.w, drawH);
    else { fill(50, 100, 255); rect(this.x, drawY, this.w, drawH); }
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
    this.enteredAttackRangeAt = -1; // 进入攻击范围的时间（毫秒），-1表示未在范围内
    
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

    // 世界下边界：防止敌人掉出画布
    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
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
  constructor(x, y, w, h, sprite) {
    Object.assign(this, { x, y, w, h, sprite });
    this.vy = 0;
    this.gravity = 0.5;
  }

  update(platforms) {
    this.vy += this.gravity;
    this.y += this.vy;

    for (let p of platforms) {
      if (rectCollision(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) {
        this.y = p.y - this.h;
        this.vy = 0;
        break;
      }
    }

    // 世界下边界：防止物品掉出画布
    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
    }
  }

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
  constructor(x, y, w = 48, h = 36) {
    super(x, y, w, h, null);
    this.state = 'trapped';
    this.targetX = x;
    this.targetY = y;
    this.flightSpeed = 1.9;
    this.wingTick = 0;
    this.facingRight = false;
  }
  isTrapped() {
    return this.state === 'trapped';
  }
  startRescue(targetX, targetY) {
    if (this.state !== 'trapped') return;
    this.state = 'flying';
    this.targetX = targetX;
    this.targetY = targetY;
    this.facingRight = targetX > this.x;
    this.vy = 0;
  }
  update(platforms) {
    if (this.state === 'trapped') {
      super.update(platforms);
      return;
    }
    if (this.state !== 'flying') return;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.abs(dx) > 0.2) this.facingRight = dx > 0;
    const d = Math.hypot(dx, dy);
    if (d <= this.flightSpeed) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.state = 'landed';
      return;
    }
    this.x += (dx / d) * this.flightSpeed;
    this.y += (dy / d) * this.flightSpeed;
    this.wingTick++;
  }
  drawBird(img, x, y, w, h) {
    if (!img || img.width <= 0) {
      fill(180, 200, 220);
      rect(x, y, w, h);
      return;
    }
    if (!this.facingRight) {
      image(img, x, y, w, h);
      return;
    }
    push();
    translate(x + w, y);
    scale(-1, 1);
    image(img, 0, 0, w, h);
    pop();
  }
  draw() {
    const webBack = window.web_back;
    const webFront = window.web_front;
    const bird = window.bird;
    const birdFlip = window.bird_flip;
    if (this.state === 'trapped') {
      if (webBack && webBack.width > 0) image(webBack, this.x, this.y, this.w, this.h);
      const bx = this.x + (this.w - 24) / 2;
      const by = this.y + (this.h - 30) / 2;
      if (bird && bird.width > 0) image(bird, bx, by, 24, 30);
      else { fill(200, 180, 80); rect(bx, by, 24, 30); }
      if (webFront && webFront.width > 0) image(webFront, this.x, this.y, this.w, this.h);
      return;
    }
    const flap = this.state === 'flying' && Math.floor(this.wingTick / 6) % 2 === 1;
    const img = flap ? birdFlip : bird;
    this.drawBird(img, this.x, this.y, 24, 30);
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
  constructor(x, y) { Object.assign(this, { x, y, w: 32, h: 16, vy: 0, facingRight: true, messages: ["Move: A / D, Crouch: S", "Double Jump: W x2"], message: null }); }

  getCollisionBox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  isSolidTile(tile) {
    return tile !== undefined && tile !== null && tile !== T.NONE && tile !== T.WATER;
  }

  getSolidTileRects(level, box) {
    if (!level || !level.tileMap) return [];
    const colStart = Math.max(0, Math.floor(box.x / TILE_SIZE));
    const colEnd = Math.min(TERRAIN_COLS - 1, Math.floor((box.x + box.w - 1) / TILE_SIZE));
    const rowTop = Math.floor((CANVAS_H - box.y - 1) / TILE_SIZE);
    const rowBottom = Math.max(0, Math.floor((CANVAS_H - (box.y + box.h) - 1) / TILE_SIZE));

    const rects = [];
    const seen = new Set();
    for (let col = colStart; col <= colEnd; col++) {
      const column = level.tileMap[col];
      if (!column) continue;
      const rowMax = Math.min(column.length - 1, rowTop);
      for (let row = rowBottom; row <= rowMax; row++) {
        const tile = column[row];
        if (!this.isSolidTile(tile)) continue;
        const key = `${col}:${row}`;
        if (seen.has(key)) continue;
        const tb = level.terrainBlocks?.[col]?.[row];
        if (tb) rects.push(tb);
        else rects.push({ x: col * TILE_SIZE, y: CANVAS_H - (row + 1) * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
        seen.add(key);
      }
    }
    return rects;
  }

  getCollisionCandidates(level, box) {
    return [
      ...(level?.platforms || []),
      ...this.getSolidTileRects(level, box)
    ];
  }

  moveWithCollision(level, dx, dy) {
    const maxStep = 0.5;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps; i++) {
      const oldX = this.x, oldY = this.y;
      this.x += stepX;
      this.y += stepY;

      const box = this.getCollisionBox();
      const candidates = this.getCollisionCandidates(level, box);
      let collided = false;
      for (const p of candidates) {
        if (rectCollision(box.x, box.y, box.w, box.h, p.x, p.y, p.w, p.h)) {
          collided = true;
          break;
        }
      }
      if (collided) {
        this.x = oldX;
        this.y = oldY;
        break;
      }
    }
  }

  snapDownToGround(level) {
    const box = this.getCollisionBox();
    const bottom = box.y + box.h;
    const maxSnap = TILE_SIZE * 0.95;
    let bestGap = Infinity;
    const candidates = this.getCollisionCandidates(level, box);
    for (const p of candidates) {
      if (box.x < p.x + p.w && box.x + box.w > p.x) {
        const gap = p.y - bottom;
        if (gap >= 0 && gap <= maxSnap && gap < bestGap) bestGap = gap;
      }
    }
    if (bestGap !== Infinity) {
      this.y += bestGap;
    }
  }

  setMessage(message) {
    this.message = message;
  }

  follow(state, level) {
    // 1. 基础安全检查：数据不完整直接退出，不执行任何逻辑
    if (!state || typeof state.x === 'undefined' || !level) return;

    // 2. 水平跟随：紧跟 state (玩家历史位置)
    const gap = 48;
    const targetX = state.x + (state.facingRight ? -gap : gap);
    const dx = lerp(this.x, targetX, 0.15) - this.x;
    // 先尝试水平移动并做碰撞阻挡
    this.moveWithCollision(level, dx, 0);
    this.facingRight = state.facingRight;

    // 3. 垂直逻辑
    // 水关卡：让猫的 Y 轴直接跟随玩家（或延迟后的玩家状态），实现“在水里一起游”
    const isWaterLevel = level && level.constructor && level.constructor.name === 'WaterLevel';
    if (isWaterLevel) {
      // 水关：Y 轴也要阻挡实心方块
      const dy = state.y - this.y;
      this.moveWithCollision(level, 0, dy);
      return;
    }

    // 非水关：寻找“当前猫 X 轴下且不高于玩家脚底太多的安全表面”（地形列 + 平台），让猫贴着这一层走
    let groundY = CANVAS_H;
    const candidates = [];
    const cxCenter = this.x + this.w / 2; // 只看猫当前位置，不预判玩家
    const playerFeetY = (state.y || 0) + (state.h || this.h); // 玩家脚底（越大越低）

    // 3.1 收集整列地形的所有非空且非岩浆的格子顶面
    if (level.tileMap) {
      const col = Math.floor(cxCenter / TILE_SIZE);
      if (col >= 0 && col < level.tileMap.length) {
        const column = level.tileMap[col] || [];
        for (let row = column.length - 1; row >= 0; row--) {
          const t = column[row];
          if (t === undefined || t === T.NONE || t === T.LAVA) continue;
          const surfaceY = CANVAS_H - (row + 1) * TILE_SIZE;
          candidates.push(surfaceY);
          break; // 只要最高一块，避免提前踩更高层
        }
      }
    }

    // 3.2 再看浮空平台：平台顶面也作为候选，X 轴需要覆盖当前猫身
    if (level.platforms) {
      for (let p of level.platforms) {
        if (cxCenter > p.x && cxCenter < p.x + p.w) {
          candidates.push(p.y);
        }
      }
    }

    // 3.3 约束：不高于玩家脚底（无容差），防止玩家在下层时猫跳到上层；否则取最近
    if (candidates.length) {
      const notHigher = candidates.filter(y => y >= playerFeetY); // y 越小越高
      if (notHigher.length) {
        groundY = Math.min(...notHigher);
      } else {
        const sorted = [...candidates].sort((a, b) => Math.abs(a - playerFeetY) - Math.abs(b - playerFeetY));
        groundY = sorted[0];
      }
    }

    // 4. 先按“贴地”逻辑计算一个原始 Y
    let targetY = groundY - this.h;

    // 4.1 防穿模：如果目标位置与固体方块重叠，向上推到方块顶
    if (typeof level.getTileAtWorld === 'function') {
      const solidTiles = (x, y) => {
        const t = level.getTileAtWorld(x, y);
        return t !== undefined && t !== T.NONE && t !== T.LAVA;
      };
      const pushOutOfSolid = () => {
        const left = this.x;
        const right = this.x + this.w;
        const bottom = targetY + this.h;
        // 采样猫的左右脚和中点，若落在固体内则推到方块顶
        const samples = [
          { x: left + 2, y: bottom - 1 },
          { x: (left + right) / 2, y: bottom - 1 },
          { x: right - 2, y: bottom - 1 }
        ];
        for (const s of samples) {
          if (solidTiles(s.x, s.y)) {
            const tileTop = Math.floor(s.y / TILE_SIZE) * TILE_SIZE;
            targetY = tileTop - this.h;
            return true;
          }
        }
        return false;
      };
      // 可能需要多次推，直到不重叠或推不动
      let guard = 0;
      while (pushOutOfSolid() && guard++ < 4) {}
    }

    // 5. 检查脚下是否是岩浆，如果是，就把 groundY 往上抬 1.5 格
    if (typeof level.getTileAtWorld === 'function') {
      const cx = this.x + this.w / 2;
      const feetY = targetY + this.h; // 猫脚底的 Y 坐标

      let lavaNearFeet = false;
      const offsets = [0, TILE_SIZE]; // 脚底这一格，以及再往下 1 格

      for (const off of offsets) {
        const sampleY = feetY + off;
        const tile = level.getTileAtWorld(cx, sampleY);
        if (tile === T.LAVA) {
          lavaNearFeet = true;
          break;
        }
      }

      if (lavaNearFeet) {
        const raiseTiles = 1.5;            // 抬高 1.5 格，可按手感微调
        groundY -= raiseTiles * TILE_SIZE; 
        targetY = groundY - this.h;        // 基于新的 groundY 重新计算 Y
      }
    }

    // 6. 应用高度并做最终碰撞阻挡（含台阶吸附）
    const dy = targetY - this.y;
    this.moveWithCollision(level, 0, dy);
    this.snapDownToGround(level);
  }

  
  draw() {
    const img = this.facingRight ? window.catSpriteRight : window.catSpriteLeft;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 200, 0); rect(this.x, this.y, this.w, this.h); }
    const msg = this.message;
    if (msg) {
      push();
      textSize(9);
      const paddingX = 5;
      const paddingY = 4;
      const maxCharsPerLine = 16;
      let lines = [];
      const parts = msg.split("\n");
      for (const part of parts) {
        const words = part.split(" ");
        let current = "";
        for (const word of words) {
          const needsSpace = current.length > 0;
          const next = (needsSpace ? current + " " : current) + word;
          if (next.length <= maxCharsPerLine) {
            current = next;
          } else {
            if (current.length > 0) lines.push(current);
            current = word;
          }
        }
        if (current) lines.push(current);
      }
      const lineH = 11;
      const bubbleW = min(132, max(...lines.map(l => textWidth(l))) + paddingX * 2);
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
  getTopRightButtons() {
    const size = HEART_SIZE;
    const gap = 8;
    const y = 20;
    const right = 20;
    return {
      menuRect: { x: width - right - size * 2 - gap, y, w: size, h: size },
      exitRect: { x: width - right - size, y, w: size, h: size }
    };
  }

  getGuideMenuRect() {
    const menuRect = this.getTopRightButtons().menuRect;
    const rightEdge = Math.round(menuRect.x + menuRect.w);
    const panelW = Math.min(Math.floor(width * 0.48), 360, rightEdge - 8);
    const panelH = 186;
    const x = Math.min(width - panelW, Math.round(rightEdge - panelW + 3));
    const y = constrain(menuRect.y + menuRect.h, 0, height - panelH);
    return { x, y, w: panelW, h: panelH };
  }

  getGuideTabRects() {
    const panel = this.getGuideMenuRect();
    const tabW = (panel.w - 20) / 4;
    const tabY = panel.y + 22;
    return [0, 1, 2, 3].map(i => ({ x: panel.x + 10 + i * tabW, y: tabY, w: tabW - 4, h: 18 }));
  }

  isInsideRect(mx, my, rect) {
    if (!rect) return false;
    return mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
  }

  drawTopRightIcon(rectInfo, img, fallbackColor) {
    fill(18, 28, 44, 210);
    rect(rectInfo.x - 2, rectInfo.y - 2, rectInfo.w + 4, rectInfo.h + 4, 4);
    if (img && img.width > 0) image(img, rectInfo.x, rectInfo.y, rectInfo.w, rectInfo.h);
    else { fill(...fallbackColor); rect(rectInfo.x, rectInfo.y, rectInfo.w, rectInfo.h, 3); }
  }

  drawScore(score, x, y) {
    push();
    fill(255);
    textAlign(LEFT, BASELINE);
    textSize(20);
    text("Score: " + score, x, y);
    pop();
  }

  drawHUD(player, showGuideMenu = false, activeGuideTab = 0) {
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

      const topRight = this.getTopRightButtons();
      this.drawTopRightIcon(topRight.menuRect, window.uiMenu, [240, 210, 80]);
      this.drawTopRightIcon(topRight.exitRect, window.uiExit, [240, 120, 90]);

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
    this.drawScore(game.player.score, heartX, heartY + HEART_SIZE + 18);

    if (showGuideMenu) this.drawGuideMenu(activeGuideTab);
  }

  drawGuideEntry(x, y, icon, name, desc) {
    if (icon && icon.width > 0) image(icon, x, y - 10, 12, 12);
    else { fill(120, 160, 220); rect(x, y - 10, 12, 12, 2); }
    fill(255);
    textSize(9);
    text(name, x + 16, y - 1);
    fill(196, 214, 255);
    textSize(8);
    text(desc, x + 16, y + 8, 126);
  }

  drawGuideRow(x, y, w, icon, name, desc) {
    fill(34, 52, 76, 210);
    rect(x, y, w, 28, 6);

    const iconX = x + 6;
    const iconY = y + 6;
    if (icon && icon.width > 0) image(icon, iconX, iconY, 16, 16);
    else { fill(120, 160, 220); rect(iconX, iconY, 16, 16, 3); }

    fill(255);
    textSize(10);
    text(name, x + 28, y + 12);
    fill(196, 214, 255);
    textSize(9);
    text(desc, x + 28, y + 23);
  }

  drawGuideMenu(activeGuideTab = 0) {
    const panel = this.getGuideMenuRect();
    noStroke();
    fill(20, 32, 50, 230);
    rect(panel.x, panel.y, panel.w, panel.h, 4);

    fill(255);
    textSize(12);
    textAlign(LEFT, BASELINE);
    text("Field Guide", panel.x + 10, panel.y + 16);

    const tabLabels = ["Tools", "Pollutants", "Trapped", "Enemy / Danger"];
    const tabs = this.getGuideTabRects();
    textAlign(CENTER, CENTER);
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      fill(i === activeGuideTab ? color(68, 110, 162, 240) : color(40, 58, 86, 210));
      rect(t.x, t.y, t.w, t.h, 4);
      fill(255);
      textSize(9);
      text(tabLabels[i], t.x + t.w / 2, t.y + t.h / 2);
    }
    textAlign(LEFT, BASELINE);

    const rowsByTab = [
      [
        [window.tool_scissor, "Scissors", "Cut webs to rescue"],
        [window.tool_enlarged_water_bucket, "Bucket", "Use near lava"],
        [window.tool_limestone, "Limestone", "Use near acid"]
      ],
      [
        [window.cigarette, "Cigarette", "Collect"],
        [window.plastic_bottle, "Plastic Bottle", "Collect"],
        [null, "Wrapper", "Collect"],
        [null, "Acid Pool", "Treat with limestone"]
      ],
      [
        [window.bird, "Bird", "Click scissors to rescue"]
      ],
      [
        [window.zombieSpriteRight, "Zombie", "Press F to attack"],
        [window.tnt, "TNT", "Keep away"]
      ]
    ];

    const tabIndex = constrain(activeGuideTab, 0, rowsByTab.length - 1);
    const rows = rowsByTab[tabIndex];
    const rowX = panel.x + 12;
    const rowW = panel.w - 24;
    let rowY = panel.y + 48;

    for (const [icon, name, desc] of rows) {
      this.drawGuideRow(rowX, rowY, rowW, icon, name, desc);
      rowY += 34;
    }
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

  // 添加原生键盘事件监听器（备用方案，防止 p5.js 事件丢失）
  window.addEventListener('keyup', (e) => {
    let k = (e.key || '').toLowerCase();
    if (e.keyCode === 32) k = ' ';
    if (k === 'a' || k === 'd' || k === 'w' || k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === ' ') {
      if (keys[k]) {
        console.log(`[原生事件] 检测到 ${k} 键松开`);
        keys[k] = false;
        pressedKeys.delete(k);
        if ((k === 'w' || k === 'arrowup' || k === ' ') && game?.player) {
          game.player.swimUpHeld = false;
        }
      }
    }
  });

  game = new Game();
  game.setup();

  // 加载贴图
  const load = (path, key) => loadImage(path, img => window[key] = img, () => console.warn(`${path} 加载失败`));

  // 新增：污染物及被困小动物
  load('assets/pic/pollutant/cigarette.png', 'cigarette');
  load('assets/pic/pollutant/plastic_bottle.png', 'plastic_bottle');
  load('assets/pic/pollutant/plastic_bag.png', 'plastic_bag');
  load('assets/pic/pollutant/tnt_side.png', 'tnt');
  load('assets/pic/animals/bird.png', 'bird');
  load('assets/pic/animals/bird_flip.png', 'bird_flip');
  load('assets/pic/animals/web_back.png', 'web_back');
  load('assets/pic/animals/web_front.png', 'web_front');
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
  load('assets/pic/ui/menu.png', 'uiMenu');
  load('assets/pic/ui/exit.png', 'uiExit');




  // 地面/平台贴图（assets/pic/ground 中全部）
  const groundTiles = [
    'grass_block_side', 'dirt', 'stone', 'deepslate',
    'copper_ore', 'deepslate_copper_ore', 'deepslate_diamond_ore', 'deepslate_gold_ore', 'deepslate_iron_ore',
    'diamond_ore', 'gold_ore', 'iron_ore','lava', 'acid', 'water', 'sand', 'gravel',
    // 树（仅作为背景装饰使用）
    'oak_leaves', 'oak_log',
    // 关卡2：水下植物与珊瑚（仅背景装饰）
    'seagrass', 'tall_seagrass_1', 'tall_seagrass_2',
    'tube_coral', 'tube_coral_fan',
    'kelp_1', 'kelp_2', 'kelp_3', 'kelp_4', 'kelp_5',
    'horn_coral', 'horn_coral_fan',
    'fire_coral', 'fire_coral_fan',
    'bubble_coral', 'bubble_coral_fan',
    'brain_coral', 'brain_coral_fan'
  ];
  groundTiles.forEach(name => loadImage(`assets/pic/ground/${name}.png`, img => window[`tile_${name.replace(/-/g, '_')}`] = img, () => console.warn(`pic/ground/${name}.png 加载失败`)));
  //加载游戏开始界面
  loadImage('assets/pic/bg/startscreen.png', img => window.startBg = img, () => console.warn('加载失败'));



}

//每一帧更新游戏状态并绘制
//加入游戏状态管理：开始界面、游戏进行中、结束界面
function draw() {
  // 主动同步按键状态（修复浏览器 keyReleased 事件丢失的问题）
  if (game && game.state === "playing") {
    // 检查 Set 中记录的按键，如果 keys 字典中有但 Set 中没有，说明事件丢失了
    ['a', 'd', 's', 'w'].forEach(k => {
      if (keys[k] && !pressedKeys.has(k)) {
        keys[k] = false;
        if (k === 'w' && game.player) game.player.swimUpHeld = false;
      }
    });
  }
  
  if (game.state === "start") {
    drawStartScreen();
  }
  else if (game.state === "levelSelect") {
    drawLevelSelectScreen();
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
  // 1. 基础按键处理
  let inputKey = null;
  if (key && key.length === 1) inputKey = key.toLowerCase();
  
  // 防止键盘长按重复触发逻辑
  if (inputKey && keys[inputKey] === true) {
    return false; 
  }

  // 记录按键状态
  if (inputKey) {
    keys[inputKey] = true;
    pressedKeys.add(inputKey);
    // console.log("按键按下:", inputKey, "当前队列:", Array.from(pressedKeys));
  }
  
  // 2. 状态机逻辑
  
  // 开始界面 -> 关卡选择
  if (game.state === "start" && (keyCode === ENTER || keyCode === 13)) {
    game.state = "levelSelect";
    return false;
  }

  // 关卡选择界面
  if (game.state === "levelSelect") {
    if (key === '1' || keyCode === 49) {
      game = new Game("forest");
      game.setup();
      game.beginPlaying();
      return false;
    }
    if (key === '2' || keyCode === 50) {
      game = new Game("water");
      game.setup();
      game.beginPlaying();
      return false;
    }
  }

  // 结算界面重启
  if ((game.state === "gameover" || game.state === "victory") && (keyCode === ENTER || keyCode === 13)) {
    game.resetToPlayingFromBeginning();
    return false;
  }
  
  // 3. 游戏内操作 (核心修改区)
  if (game.state === "playing") {
    
    // 攻击逻辑：放在跳跃之前，确保 F 键响应优先级
    if (inputKey === 'f' || keyCode === 70) {
      game.tryAttack(); // 确保 Game 类里这个方法没被删掉
      return false;
    }

    // 跳跃/上浮逻辑（仅 W）
    const jumpPressed = inputKey === 'w';
    if (jumpPressed) {
      if (game.level && game.player && typeof game.player.isInWater === "function") {
        if (game.player.isInWater(game.level)) {
          game.player.swimUpHeld = true;
          return false;
        }
      }
      // 陆地跳跃
      if (game.player) {
        game.player.jump();
      }
      return false;
    }
  }
  
  return false; // 阻止浏览器默认行为（如按空格翻页）
}

function keyReleased() {
  let releasedKey = null;
  if (key && key.length === 1) releasedKey = key.toLowerCase();

  if (!releasedKey) return;

  keys[releasedKey] = false;
  pressedKeys.delete(releasedKey);
  
  console.log("按键释放:", key, keyCode, "a:", keys['a'], "d:", keys['d'], "w:", keys['w'], "Set:", Array.from(pressedKeys));
  
  // 松开上浮键时，取消水中上浮标志
  if (releasedKey === 'w') {
    if (game?.player) game.player.swimUpHeld = false;
  }
}

// 窗口失焦时清除所有按键状态（防止切换窗口导致按键卡住）
function windowBlurred() {
  console.log("窗口失焦，清除所有按键"); // 调试用
  keys = {};
  pressedKeys.clear(); // 清空 Set
  if (game?.player) {
    game.player.swimUpHeld = false;
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
  if (window.startBg && window.startBg.width > 0) {
    image(window.startBg, 0, 0, width, height); // 填满画布
  } else {
    background(50, 50, 100); // 加载失败显示背景色
  }
  fill(255, 165, 0)
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Press ENTER to Start", width / 2, height / 2 + 50);
}

function drawLevelSelectScreen() {
  if (window.startBg && window.startBg.width > 0) {
    image(window.startBg, 0, 0, width, height); // 复用开始界面背景
  } else {
    background(50, 50, 100);
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Press 1 or 2 to Choose Chapter", width / 2, height / 2 + 50);
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

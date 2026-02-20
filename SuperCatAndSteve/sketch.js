// ====== 常量定义 ======
const WORLD_WIDTH = 1920;
const CANVAS_W = 640;
const CANVAS_H = 360;
const TILE_SIZE = 32;
const TERRAIN_COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
const INVENTORY_SLOTS = 6;
const HINT_CAT_DELAY_MS = 500;
const HINT_CAT_GAP = 8;

// 贴图类型
const T = { NONE: 0, GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4 };

// UI 常量
const SLOT_SIZE = 24, SLOT_GAP = 8, INV_BAR_W = 200, INV_BAR_H = 40, INV_PADDING = 8;
const MAX_HEARTS = 10, HEART_SIZE = 20;

// ====== 工具函数 ======
function rectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// 贴图和回退颜色映射
function getTextures() {
  return {
    [T.GRASS]: window.grassBlock,
    [T.DIRT]: window.dirtBlock,
    [T.STONE]: window.stoneBlock,
    [T.DEEP]: window.deepslateBlock
  };
}
const FALLBACK_COLORS = {
  [T.GRASS]: [100, 180, 100],
  [T.DIRT]: [139, 90, 43],
  [T.STONE]: [128, 128, 128],
  [T.DEEP]: [80, 80, 80]
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
    this.player = new Player(80, 60);
    this.uiManager = new UIManager();
    this.playerHistory = [];
    this.cameraX = 0;
  }

  setup() { this.level.loadAssets(); }

  update() {
    this.player.update(this.level.platforms);
    this.updateCamera();
    this.updateHintCat();
    this.checkCollisions();
  }

  updateCamera() {
    const halfW = CANVAS_W / 2;
    if (this.player.x < halfW) this.cameraX = 0;
    else if (this.player.x > WORLD_WIDTH - halfW) this.cameraX = WORLD_WIDTH - CANVAS_W;
    else this.cameraX = this.player.x - halfW;
  }

  updateHintCat() {
    this.playerHistory.push({ x: this.player.x, y: this.player.y, h: this.player.h, t: millis() });
    const cutoff = millis() - HINT_CAT_DELAY_MS - 50;
    while (this.playerHistory.length && this.playerHistory[0].t < cutoff) this.playerHistory.shift();
    this.level.hintCat.follow(this.getDelayedState());
  }

  getDelayedState() {
    const targetT = millis() - HINT_CAT_DELAY_MS;
    if (!this.playerHistory.length) return { x: this.player.x, y: this.player.y, h: this.player.h };
    let best = this.playerHistory[0];
    for (let s of this.playerHistory) {
      if (s.t <= targetT) best = s; else break;
    }
    return best;
  }

  checkCollisions() {
    for (let enemy of this.level.enemies) {
      if (this.player.collidesWith(enemy)) this.player.takeDamage(1);
    }
    for (let i = this.level.items.length - 1; i >= 0; i--) {
      if (this.player.collidesWith(this.level.items[i])) {
        this.player.collect(this.level.items[i]);
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
  }
  loadAssets() {}
  draw() {}
}

class ForestLevel extends Level {
  loadAssets() {
    const G = T.GRASS, D = T.DIRT, S = T.STONE, X = T.DEEP;

    // 地形定义：addTerrainColumn(列号, 高度, [贴图])
    const terrain = [
      [0,5,[G,S,S,X,X]], [1,5,[G,S,S,X,X]], [2,5,[G,D,S,X,X]], [3,4,[G,S,S,X]], [4,4,[G,D,S,X]],
      [5,4,[G,D,S,X]], [6,3,[S,S,X]], [7,3,[S,S,X]], [8,2,[S,X]], [9,2,[S,X]], [10,2,[S,X]],
      [11,3,[S,S,X]], [12,3,[S,S,X]], [13,3,[G,S,X]], [14,3,[G,S,X]], [15,3,[G,S,X]],
      [16,4,[G,D,S,X]], [17,4,[G,S,S,X]], [18,4,[G,S,S,X]], [19,4,[G,D,S,X]],
      [20,3,[D,D,S]], [21,2,[D,S]], [22,2,[D,S]], [23,2,[D,S]], [24,3,[D,S,X]],
      [25,4,[G,D,S,X]], [26,5,[G,D,S,X,X]], [27,6,[G,D,S,S,X,X]], [28,6,[G,D,S,X,X,X]],
      [29,6,[G,D,S,S,X,X]], [30,5,[G,D,S,S,X]], [31,4,[G,D,S,X]], [32,3,[G,D,S]], [33,3,[G,D,S]],
      [34,3,[G,D,S]], [35,2,[G,D]], [36,2,[G,D]], [37,2,[G,D]], [38,3,[G,D,S]], [39,4,[G,D,S,X]],
      [40,4,[G,D,S,S]], [41,4,[G,D,S,X]], [42,4,[G,D,S,S]], [43,3,[G,D,S]], [44,2,[G,D]],
      [45,2,[G,D]], [46,2,[G,D]], [47,2,[G,D]], [48,1,[G]], [49,1,[G]], [50,2,[G,D]], [51,2,[G,D]],
      [52,3,[G,D,S]], [53,4,[G,D,S,X]], [54,4,[G,D,S,S]], [55,3,[G,D,S]], [56,3,[G,D,S]],
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

    // 敌人（僵尸 64x64）
    this.enemies.push(new Enemy(p7.x - 16, p7.y - 64, 64, 64));
    this.enemies.push(new Enemy(p11.x - 16, p11.y - 64, 64, 64));

    // 辅助函数：获取地面 y 坐标
    const groundY = (col) => this.terrainHeights[col];

    // 污染物（平台上 + 地面上）
    this.items.push(new Pollutant(p1.x + 4, p1.y - 18, 24, 18));           // 平台
    this.items.push(new Pollutant(36 * TILE_SIZE + 4, groundY(36) - 18, 24, 18)); // 地面 col 36
    this.items.push(new Pollutant(48 * TILE_SIZE + 4, groundY(48) - 18, 24, 18)); // 地面 col 48

    // 工具（平台上 + 地面上，居中放置）
    const toolOffset = (TILE_SIZE - 24) / 2;  // 水平居中偏移 = 4
    this.items.push(new Tool(p3.x + toolOffset, p3.y - 24));              // 平台
    this.items.push(new Tool(8 * TILE_SIZE + toolOffset, groundY(8) - 24));   // 地面 col 8
    this.items.push(new Tool(32 * TILE_SIZE + toolOffset, groundY(32) - 24)); // 地面 col 32
    this.items.push(new Tool(55 * TILE_SIZE + toolOffset, groundY(55) - 24)); // 地面 col 55
  }

  addTerrainColumn(col, heightTiles, tiles) {
    const surfaceY = 360 - heightTiles * TILE_SIZE;
    this.terrainHeights[col] = surfaceY;
    this.platforms.push(new Platform(col * TILE_SIZE, surfaceY, TILE_SIZE, heightTiles * TILE_SIZE, true));
    for (let row = 0; row < heightTiles; row++) {
      this.tileMap[col][row] = tiles[row] || T.DEEP;
    }
  }

  addFloatingPlatform(col, bottomTiles, tiles) {
    const h = tiles.length * TILE_SIZE;
    const y = 360 - bottomTiles * TILE_SIZE - h;
    const platform = new Platform(col * TILE_SIZE, y, TILE_SIZE, h);
    platform.tiles = tiles;
    this.platforms.push(platform);
    return platform;
  }

  draw() {
    // 绘制地形
    for (let col = 0; col < TERRAIN_COLS; col++) {
      const surfaceY = this.terrainHeights[col];
      if (surfaceY === undefined) continue;
      let row = 0;
      for (let y = surfaceY; y < 360; y += TILE_SIZE) {
        drawTile(this.tileMap[col][row++] || T.DEEP, col * TILE_SIZE, y);
      }
    }
    // 绘制浮空平台、敌人、物品
    this.platforms.filter(p => !p.isTerrain).forEach(p => p.draw());
    this.enemies.forEach(e => e.draw());
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
    if (this.tiles) {
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
    Object.assign(this, { x, y, w: 32, h: 64, vx: 0, vy: 0, speed: 2, jumpForce: -6.32, gravity: 0.5, onGround: false, maxHealth: 10, health: 10, inventory: [] });
  }

  update(platforms) {
    this.vx = 0;
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) this.vx = -this.speed;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) this.vx = this.speed;
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
    const img = window.steveSprite;
    const offsetY = 4;  // 向下偏移，让贴图底部贴地
    if (img && img.width > 0) image(img, this.x, this.y + offsetY, this.w, this.h);
    else { fill(50, 100, 255); rect(this.x, this.y, this.w, this.h); }
  }
}

// ====== Enemy / Item / Pollutant 类 ======
class Enemy {
  constructor(x, y, w, h) { Object.assign(this, { x, y, w, h }); }
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
  constructor(x, y, w, h) { super(x, y, w, h, null); this.displayName = '污染物'; }
  draw() {
    if (this.sprite) image(this.sprite, this.x, this.y, this.w, this.h);
    else { fill(100, 200, 100); rect(this.x, this.y, this.w, this.h); }  // 绿色
  }
}

class Tool extends Item {
  constructor(x, y, w = 24, h = 24) { 
    super(x, y, w, h, null); 
    this.displayName = '工具'; 
  }
  draw() {
    const img = window.scissorSprite;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(100, 150, 255); rect(this.x, this.y, this.w, this.h); }
  }
}

// ====== HintCat 类 ======
class HintCat {
  constructor(x, y) { Object.assign(this, { x, y, w: 32, h: 32, messages: ["按 A/D 或 ←/→ 移动", "按空格跳跃", "收集污染物！"] }); }

  follow(state) {
    this.x = max(0, state.x - this.w - HINT_CAT_GAP);
    this.y = state.y + state.h - this.h;  // 底部对齐
  }

  draw() {
    const img = window.catSprite;
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
        // 根据物品类型选择贴图
        let img = item.sprite;
        if (item instanceof Tool) img = window.scissorSprite;
        
        if (img && img.width > 0) {
          image(img, x, y, SLOT_SIZE, SLOT_SIZE);
        } else {
          if (item instanceof Pollutant) fill(100, 200, 100);
          else if (item instanceof Tool) fill(100, 150, 255);
          else fill(255, 255, 0);
          rect(x + 2, y + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 2);
        }
      }
    }
  }
}

// ====== p5.js 生命周期 ======
function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.elt.tabIndex = 0;
  c.elt.focus();
  c.elt.classList.add('game-canvas');
  c.parent('game-container');

  game = new Game();
  game.setup();

  // 加载贴图
  const assets = [
    ['player.png', 'steveSprite'], ['cat.png', 'catSprite'], ['zombie.png', 'zombieSprite'],
    ['scissor.png', 'scissorSprite'],
    ['heart_container.png', 'heartContainer'], ['heart_fill.png', 'heartFill'],
    ['inventory_container.png', 'invContainer'],
    ['enlarged_grass_block_side.png', 'grassBlock'], ['enlarged_dirt.png', 'dirtBlock'],
    ['enlarged_stone.png', 'stoneBlock'], ['enlarged_deepslate.png', 'deepslateBlock']
  ];
  assets.forEach(([file, key]) => loadImage(`/assets/${file}`, img => window[key] = img, () => console.warn(`${file} 加载失败`)));
}

function draw() {
  game.update();
  game.draw();
}

function keyPressed() {
  if (key === ' ' || keyCode === UP_ARROW || keyCode === 87) {
    game.player.jump();
    return false;
  }
  if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(keyCode)) return false;
}

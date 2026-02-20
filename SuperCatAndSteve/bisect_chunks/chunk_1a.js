// Backup of original sketch.js
// ====== 全局变量 ======
let game;
let steveSprite, enemySprite, pollutantSprite, catSprite, bgForest;

// ====== 工具函数：AABB 碰撞 ======
function rectRectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    ax < bx + bw &&
    ax + aw > bx &&
    ay < by + bh &&
    ay + ah > by
  );
}

// ====== Game 类 ======
class Game {
  constructor() {
    this.level = new ForestLevel();
    this.player = new Player(100, 100);
    this.uiManager = new UIManager();

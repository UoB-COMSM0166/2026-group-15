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
  }

  setup() {
    this.level.loadAssets();
  }

  update() {
    this.player.update(this.level.platforms);

    // 玩家与敌人碰撞
    for (let enemy of this.level.enemies) {
      if (this.player.collidesWith(enemy)) {
        this.player.takeDamage(1);
      }
    }

    // 玩家与物品碰撞
    for (let i = this.level.items.length - 1; i >= 0; i--) {
      let item = this.level.items[i];
      if (this.player.collidesWith(item)) {
        this.player.collect(item);
        this.level.items.splice(i, 1);

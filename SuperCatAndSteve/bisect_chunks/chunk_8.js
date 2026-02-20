
// ====== p5.js 生命周期 ======
function preload() {
  // 这里可以换成你的 MC 贴图路径
  // steveSprite = loadImage("assets/steve.png");
  // enemySprite = loadImage("assets/enemy.png");
  // pollutantSprite = loadImage("assets/pollutant.png");
  // catSprite = loadImage("assets/cat.png");
  // bgForest = loadImage("assets/forest.png");
}

function setup() {
  let c = createCanvas(800, 600);
  c.elt.tabIndex = 0;   // 让 canvas 可以被 focus
  c.elt.focus();        // 自动 focus
  game = new Game();
  game.setup();
}

function draw() {
  game.update();
  game.draw();
}

function keyPressed() {
  // 处理跳跃
  if (key === " " || keyCode === UP_ARROW || keyCode === 87) { // 空格 / ↑ / W
    game.player.jump();
    // 阻止默认行为（防止空格滚动页面）
    return false;
  }
  
  // 阻止方向键的默认行为（防止页面滚动）
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW || 
      keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
    return false;
  }
}

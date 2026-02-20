      }
    }
  }

  draw() {
    this.level.draw();
    this.player.draw();
    this.uiManager.drawHUD(this.player);
    this.level.hintCat.draw();
  }
}

// ====== Level 抽象类 & ForestLevel ======
class Level {
  constructor() {
    this.platforms = [];
    this.enemies = [];
    this.items = [];
    this.hintCat = new HintCat(40, 80);
  }

  loadAssets() {}
  update() {}
  draw() {}
}

class ForestLevel extends Level {
  constructor() {
    super();
  }

  loadAssets() {
    // 简单平台：x, y, w, h
    this.platforms.push(new Platform(0, 550, 800, 50));   // 地面
    this.platforms.push(new Platform(150, 420, 150, 20));
    this.platforms.push(new Platform(350, 320, 150, 20));
    this.platforms.push(new Platform(550, 250, 150, 20));

    // 敌人
    this.enemies.push(new Enemy(400, 280, 40, 40));

    // 污染物
    this.items.push(new Pollutant(580, 210, 30, 30));

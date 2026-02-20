    }
  }
}

class Pollutant extends Item {
  constructor(x, y, w, h) {
    super(x, y, w, h, pollutantSprite);
    this.value = 1;
  }
}

// ====== HintCat 小猫提示 ======
class HintCat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 32;
    this.messages = ["按 A/D 或 ←/→ 移动", "按空格跳跃", "收集污染物，远离怪物！"];
  }

  draw() {
    if (catSprite) {
      image(catSprite, this.x, this.y, this.w, this.h);
    } else {
      fill(255, 200, 0);
      rect(this.x, this.y, this.w, this.h);
    }
    fill(255);
    textSize(14);
    text(this.messages[0], this.x + 40, this.y + 10);
  }
}

// ====== UIManager ======
class UIManager {
  drawHUD(player) {
    fill(255);
    textSize(18);
    text("Health: " + player.health, 20, 30);
    text("Inventory: " + player.inventory.length, 20, 55);
  }
}

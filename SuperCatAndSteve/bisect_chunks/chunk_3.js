  }

  draw() {
    if (bgForest) {
      image(bgForest, 0, 0, width, height);
    } else {
      background(100, 200, 100);
    }

    // 平台
    for (let p of this.platforms) {
      p.draw();
    }

    // 敌人
    for (let e of this.enemies) {
      e.draw();
    }

    // 物品
    for (let it of this.items) {
      it.draw();
    }
  }
}

// ====== Platform 平台 ======
class Platform {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  draw() {
    fill(120, 80, 40);
    rect(this.x, this.y, this.w, this.h);
  }
}

// ====== Player 玩家 ======
class Player {

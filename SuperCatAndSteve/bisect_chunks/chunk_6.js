      image(steveSprite, this.x, this.y, this.w, this.h);
    } else {
      fill(50, 100, 255);
      rect(this.x, this.y, this.w, this.h);
    }
  }
}

// ====== Enemy 敌人 ======
class Enemy {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  draw() {
    if (enemySprite) {
      image(enemySprite, this.x, this.y, this.w, this.h);
    } else {
      fill(200, 50, 50);
      rect(this.x, this.y, this.w, this.h);
    }
  }
}

// ====== Item / Pollutant ======
class Item {
  constructor(x, y, w, h, sprite) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.sprite = sprite;
  }

  draw() {
    if (this.sprite) {
      image(this.sprite, this.x, this.y, this.w, this.h);
    } else {
      fill(255, 255, 0);
      rect(this.x, this.y, this.w, this.h);

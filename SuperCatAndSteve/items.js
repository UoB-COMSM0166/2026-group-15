// 食物类

class Food extends Item {
  constructor(x, y, w = 24, h = 24, type = "apple", healAmount = 2) {
    super(x, y, w, h, null);

    this.type = type;          // 食物类型
    this.healAmount = healAmount;
  }

  draw() {
    const img = window["food_" + this.type];

    if (img && img.width > 0) {
      image(img, this.x, this.y, this.w, this.h);
    } else {
      // 如果图片没加载成功，使用备用色块
      fill(255, 180, 80);
      rect(this.x, this.y, this.w, this.h, 4);
    }
  }
}
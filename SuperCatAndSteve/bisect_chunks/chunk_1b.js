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

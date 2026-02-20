  }

  resolveHorizontalCollision(platforms) {
    for (let p of platforms) {
      if (rectRectCollision(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) {
        if (this.vx > 0) {
          this.x = p.x - this.w;
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
        }
        this.vx = 0;
      }
    }
  }

  resolveVerticalCollision(platforms) {
    for (let p of platforms) {
      if (rectRectCollision(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) {
        if (this.vy > 0) {
          this.y = p.y - this.h;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = p.y + p.h;
        }
        this.vy = 0;
      }
    }
  }

  collidesWith(obj) {
    return rectRectCollision(this.x, this.y, this.w, this.h, obj.x, obj.y, obj.w, obj.h);
  }

  collect(item) {
    this.inventory.push(item);
  }

  takeDamage(amount) {
    this.health = max(0, this.health - amount);
  }

  draw() {
    if (steveSprite) {

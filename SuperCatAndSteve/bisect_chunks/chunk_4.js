  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 48;
    this.vx = 0;
    this.vy = 0;
    this.speed = 3;
    this.jumpForce = -10;
    this.gravity = 0.5;
    this.onGround = false;
    this.health = 100;
    this.inventory = [];
  }

  update(platforms) {
    // 水平移动输入
    this.vx = 0;
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // A
      this.vx = -this.speed;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // D
      this.vx = this.speed;
    }

    // 重力
    this.vy += this.gravity;

    // 尝试水平移动
    this.x += this.vx;
    this.resolveHorizontalCollision(platforms);

    // 尝试垂直移动
    this.y += this.vy;
    this.onGround = false;
    this.resolveVerticalCollision(platforms);
  }

  jump() {
    if (this.onGround) {
      this.vy = this.jumpForce;
      this.onGround = false;
    }

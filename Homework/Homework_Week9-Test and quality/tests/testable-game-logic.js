(function () {
  // Minimal test-only logic extracted from game behavior.
  // This file is isolated from sketch.js to keep white-box tests stable.

  const WORLD_WIDTH = 640 * 6;
  const CANVAS_W = 640;
  const TILE_SIZE = 32;
  const INVENTORY_SLOTS = 10;
  const HINT_CAT_GAP = 8;
  const ENEMY_CONTACT_DAMAGE_PER_SEC = 1;
  const ENEMY_MELEE_ATTACK_RANGE = 18;

  function rectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.w = 32;
      this.h = 64;
      this.jumpForce = -6.32;
      this.vy = 0;
      this.onGround = false;
      this.maxHealth = 5;
      this.health = 5;
      this.maxJumps = 2;
      this.jumpsRemaining = this.maxJumps;
      this.inventory = [];
    }

    jump() {
      if (this.jumpsRemaining <= 0) return;
      const isSecondJump = this.jumpsRemaining === 1;
      const boost = isSecondJump ? 1.35 : 1;
      this.vy = this.jumpForce * boost;
      this.onGround = false;
      this.jumpsRemaining -= 1;
    }

    collect(item) {
      if (this.inventory.length < INVENTORY_SLOTS) this.inventory.push(item);
    }

    takeDamage(amount) {
      this.health = Math.max(0, this.health - amount);
    }

    collidesWith(obj) {
      return rectCollision(this.x, this.y, this.w, this.h, obj.x, obj.y, obj.w, obj.h);
    }

    getCollisionBox() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
  }

  class HintCat {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.w = 32;
      this.h = 32;
    }

    follow(state) {
      this.x = Math.max(0, state.x - this.w - HINT_CAT_GAP);
      this.y = state.y + state.h - this.h;
    }
  }

  class Game {
    constructor() {
      this.player = new Player(0, 0);
      this.level = { enemies: [], items: [] };
      this.cameraX = 0;
      this.enemyContactLastTick = 0;
      this.enemyContactDamageCarry = 0;
    }

    updateCamera() {
      const halfW = CANVAS_W / 2;
      if (this.player.x < halfW) this.cameraX = 0;
      else if (this.player.x > WORLD_WIDTH - halfW) this.cameraX = WORLD_WIDTH - CANVAS_W;
      else this.cameraX = this.player.x - halfW;
    }

    distanceToEnemyBoxGap(enemy) {
      const a = this.player.getCollisionBox();
      const b = enemy.getCollisionBox();
      const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
      const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
      return Math.hypot(dx, dy);
    }

    checkCollisions(nowMs) {
      const now = typeof nowMs === "number" ? nowMs : Date.now();
      if (this.enemyContactLastTick === 0) this.enemyContactLastTick = now;
      const deltaSec = Math.max(0, (now - this.enemyContactLastTick) / 1000);
      this.enemyContactLastTick = now;

      let touchingDamagingEnemy = false;
      for (const enemy of this.level.enemies) {
        if (enemy.isDead) continue;
        if (typeof enemy.canDamagePlayer === "function" && !enemy.canDamagePlayer()) continue;
        const inAttackRange = this.distanceToEnemyBoxGap(enemy) < ENEMY_MELEE_ATTACK_RANGE;
        if (inAttackRange) touchingDamagingEnemy = true;
      }

      if (touchingDamagingEnemy) {
        this.enemyContactDamageCarry += deltaSec * ENEMY_CONTACT_DAMAGE_PER_SEC;
        const wholeDamage = Math.floor(this.enemyContactDamageCarry);
        if (wholeDamage > 0) {
          this.player.takeDamage(wholeDamage);
          this.enemyContactDamageCarry -= wholeDamage;
        }
      }

      for (let i = this.level.items.length - 1; i >= 0; i--) {
        const item = this.level.items[i];
        if (this.player.collidesWith(item)) {
          this.player.collect(item);
          this.level.items.splice(i, 1);
        }
      }
    }
  }

  window.TestableGameLogic = {
    constants: { WORLD_WIDTH, CANVAS_W, TILE_SIZE, INVENTORY_SLOTS, HINT_CAT_GAP },
    helpers: { rectCollision },
    classes: { Player, Game, HintCat }
  };
})();

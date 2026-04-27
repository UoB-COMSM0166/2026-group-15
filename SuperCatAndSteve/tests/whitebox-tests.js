(function () {
  function assert(condition, message) {
    if (!condition) throw new Error(message || "Assertion failed");
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error((message || "Values differ") + ` | expected=${expected}, actual=${actual}`);
    }
  }

  function runWhiteBoxTests() {
    const logic = window.TestableGameLogic;
    if (!logic) {
      const summary = {
        total: 1,
        passed: 0,
        failed: 1,
        results: [{
          id: "WB-00",
          area: "Setup",
          description: "Load testable game logic",
          expected: "window.TestableGameLogic should exist",
          actual: "Missing tests/testable-game-logic.js or failed to load",
          status: "FAIL"
        }],
        notes: ["Skipped because it depends on full p5.js runtime/rendering."]
      };
      console.error("[WhiteBox] Missing window.TestableGameLogic");
      return summary;
    }

    const { constants, helpers, classes } = logic;
    const { INVENTORY_SLOTS, WORLD_WIDTH, CANVAS_W, HINT_CAT_GAP } = constants;
    const { rectCollision } = helpers;
    const { Player, Game, HintCat } = classes;

    const tests = [];
    function addTest(id, area, description, expected, fn) {
      tests.push({ id, area, description, expected, fn });
    }

    addTest(
      "WB-01",
      "rectCollision",
      "Overlap and edge-touch checks.",
      "Overlap=true, edge-touch=false",
      function () {
        const overlap = rectCollision(0, 0, 10, 10, 5, 5, 10, 10);
        const edgeTouch = rectCollision(0, 0, 10, 10, 10, 0, 10, 10);
        assert(overlap === true, "Overlap failed");
        assert(edgeTouch === false, "Edge-touch should be false");
        return `overlap=${overlap}, edgeTouch=${edgeTouch}`;
      }
    );

    addTest(
      "WB-02",
      "Player.collect",
      "Collect multiple items.",
      "Item should be added to inventory",
      function () {
        const p = new Player(0, 0);
        p.collect({ id: 1 });
        assertEqual(p.inventory.length, 1, "Collect failed");
        return `inventoryLength=${p.inventory.length}`;
      }
    );

    addTest(
      "WB-03",
      "Inventory limit",
      "Collect items beyond slot limit.",
      `Inventory length should stay at ${INVENTORY_SLOTS}`,
      function () {
        const p = new Player(0, 0);
        for (let i = 0; i < INVENTORY_SLOTS + 5; i++) p.collect({ id: i });
        assertEqual(p.inventory.length, INVENTORY_SLOTS, "Inventory limit not enforced");
        return `inventoryLength=${p.inventory.length}`;
      }
    );

    addTest(
      "WB-04",
      "Player.takeDamage",
      "Damage should not make health negative.",
      "Health clamped to 0",
      function () {
        const p = new Player(0, 0);
        p.health = 2;
        p.takeDamage(10);
        assertEqual(p.health, 0, "Health should be 0");
        return `health=${p.health}`;
      }
    );

    addTest(
      "WB-05",
      "Player.jump",
      "First jump and second jump boost.",
      "Second jump uses boosted force",
      function () {
        const p = new Player(0, 0);
        p.jumpsRemaining = p.maxJumps;
        p.jump();
        const first = p.vy;
        p.jumpsRemaining = 1;
        p.jump();
        const second = p.vy;
        assert(second < first, "Second jump should be stronger upward");
        return `firstVy=${first.toFixed(2)}, secondVy=${second.toFixed(2)}`;
      }
    );

    addTest(
      "WB-06",
      "Game.updateCamera",
      "Left clamp / middle follow / right clamp.",
      "cameraX in expected range by player position",
      function () {
        const g = new Game();
        g.player.x = 10;
        g.updateCamera();
        const left = g.cameraX;
        g.player.x = WORLD_WIDTH / 2;
        g.updateCamera();
        const mid = g.cameraX;
        g.player.x = WORLD_WIDTH;
        g.updateCamera();
        const right = g.cameraX;
        assertEqual(left, 0, "Left clamp failed");
        assert(mid > 0, "Middle follow failed");
        assertEqual(right, WORLD_WIDTH - CANVAS_W, "Right clamp failed");
        return `left=${left}, mid=${mid.toFixed(1)}, right=${right}`;
      }
    );

    addTest(
      "WB-07",
      "HintCat.follow",
      "Follow should keep cat left and bottom aligned.",
      `cat.x=max(0, playerX-catW-${HINT_CAT_GAP}), cat bottom aligned`,
      function () {
        const h = new HintCat(0, 0);
        h.follow({ x: 100, y: 60, h: 64 });
        assertEqual(h.x, Math.max(0, 100 - h.w - HINT_CAT_GAP), "HintCat X mismatch");
        assertEqual(h.y, 60 + 64 - h.h, "HintCat Y mismatch");
        return `x=${h.x}, y=${h.y}`;
      }
    );

    addTest(
      "WB-08",
      "Game.checkCollisions",
      "Enemy contact damage and item collection.",
      "Health decreases and colliding item is collected",
      function () {
        const g = new Game();
        g.player.x = 0;
        g.player.y = 0;
        g.player.health = 5;
        g.level.items = [{ x: 0, y: 0, w: 10, h: 10, id: "item-1" }];
        g.level.enemies = [{
          isDead: false,
          canDamagePlayer: function () { return true; },
          getCollisionBox: function () { return { x: 0, y: 0, w: 16, h: 16 }; }
        }];

        g.enemyContactLastTick = 1000;
        g.checkCollisions(2000);

        assertEqual(g.player.health, 4, "Expected 1 point contact damage");
        assertEqual(g.level.items.length, 0, "Item should be removed");
        assertEqual(g.player.inventory.length, 1, "Item should be collected");
        return `health=${g.player.health}, inventory=${g.player.inventory.length}`;
      }
    );

    const results = [];
    let passed = 0;
    let failed = 0;
    for (const t of tests) {
      try {
        const actual = t.fn();
        results.push({
          id: t.id,
          area: t.area,
          description: t.description,
          expected: t.expected,
          actual: String(actual),
          status: "PASS"
        });
        passed++;
        console.log(`[WhiteBox PASS] ${t.id} ${t.area}`, actual);
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        results.push({
          id: t.id,
          area: t.area,
          description: t.description,
          expected: t.expected,
          actual: msg,
          status: "FAIL"
        });
        failed++;
        console.error(`[WhiteBox FAIL] ${t.id} ${t.area}`, msg);
      }
    }

    const notes = [
      "Skipped because it depends on full p5.js runtime/rendering: draw()/image()/fill()/text() and full asset loading.",
      "Skipped because it depends on full p5.js runtime/rendering: async level loading, full input loop, and complete sketch state machine."
    ];

    const summary = { total: results.length, passed, failed, results, notes };
    console.log("[WhiteBox] Summary:", summary);
    return summary;
  }

  function renderWhiteBoxResults(summary) {
    const totalEl = document.getElementById("wb-total");
    const passEl = document.getElementById("wb-passed");
    const failEl = document.getElementById("wb-failed");
    const tbody = document.getElementById("wb-results-body");
    const notesEl = document.getElementById("wb-notes");
    if (!totalEl || !passEl || !failEl || !tbody || !notesEl) return;

    totalEl.textContent = String(summary.total);
    passEl.textContent = String(summary.passed);
    failEl.textContent = String(summary.failed);

    tbody.innerHTML = "";
    for (const row of summary.results) {
      const tr = document.createElement("tr");
      tr.className = row.status === "FAIL" ? "fail-row" : "pass-row";
      tr.innerHTML =
        `<td>${row.id}</td>` +
        `<td>${row.area}</td>` +
        `<td>${row.description}</td>` +
        `<td>${row.expected}</td>` +
        `<td>${row.actual}</td>` +
        `<td><span class="status ${row.status.toLowerCase()}">${row.status}</span></td>`;
      tbody.appendChild(tr);
    }

    notesEl.innerHTML = "";
    for (const note of summary.notes || []) {
      const li = document.createElement("li");
      li.textContent = note;
      notesEl.appendChild(li);
    }
  }

  function initWhiteBoxTestRunnerUI() {
    const btn = document.getElementById("wb-run-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      const summary = runWhiteBoxTests();
      renderWhiteBoxResults(summary);
    });
  }

  window.runWhiteBoxTests = runWhiteBoxTests;
  window.renderWhiteBoxResults = renderWhiteBoxResults;
  window.initWhiteBoxTestRunnerUI = initWhiteBoxTestRunnerUI;
})();

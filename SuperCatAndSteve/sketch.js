// ====== 常量定义 ======
const WORLD_WIDTH = 640 * 6; // 将游戏范围限制为 6 个屏幕宽
const CANVAS_W = 640;
const CANVAS_H = 360;
const TILE_SIZE = 32;
const TERRAIN_COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
const INVENTORY_SLOTS = 10;
const MINE_PRESS_MS = 500;  // 长按多久后破坏方块
const WIN_SCORE = 12;
const VICTORY_DELAY_MS = 1500;
const ATTACK_COOLDOWN_MS = 400;  // 攻击冷却
const PLAYER_MELEE_ATTACK_RANGE = 24; // 玩家 F：与敌人碰撞箱空隙距离 <= 24px 可命中
const ENEMY_MELEE_ATTACK_RANGE = 18; // 敌人接触伤害：与玩家碰撞箱空隙距离 < 18px 开始结算
const ENEMY_CONTACT_DAMAGE_PER_SEC = 1;
const SPIKE_CONTACT_DAMAGE_PER_SEC = 3;
const ENEMY_ATTACK_START_DELAY_MS = 1000;  // 敌人进入攻击范围后延迟才开始造成伤害（毫秒）
const PLAYER_FOLLOW_CAT_DELAY_MS = 500;
const PLAYER_FOLLOW_CAT_TRACE_WINDOW_MS = 2000;
const PLAYER_FOLLOW_CAT_W = 36;
const PLAYER_FOLLOW_CAT_H = 16;

// ========== TEMP 调试：每列地形底部列序号（删改时整段移除 + Game.draw 内对应一行）==========
const DEBUG_DRAW_TERRAIN_COLUMN_INDEX = true;

function drawDebugTerrainColumnIndexLabels() {
  if (!DEBUG_DRAW_TERRAIN_COLUMN_INDEX) return;
  push();
  textAlign(CENTER, CENTER);
  textSize(8);
  fill(255, 230, 60, 230);
  stroke(0, 0, 0, 170);
  strokeWeight(1);
  const y = CANVAS_H * 0.5;
  for (let col = 0; col < TERRAIN_COLS; col++) {
    text(String(col), col * TILE_SIZE + TILE_SIZE * 0.5, y);
  }
  pop();
}
// ========== END TEMP ==========

// 水中物理（统一参数，应用于水关卡中的实体）
const WATER_GRAVITY = 0.1;   // 基础重力
const WATER_BUOYANCY = 0.08; // 浮力（抵消部分重力）
const WATER_DRAG = 0.8;     // 水中阻力系数
// 海豚道具强化效果：磁铁功能 
const DOLPHIN_START_COL = 40;
const DOLPHIN_END_COL = 70;
const DOLPHIN_W = 96;
const DOLPHIN_H = 32;
const DOLPHIN_MAGNET_RADIUS = 150;
const DOLPHIN_MAGNET_STRENGTH = 0.14;

// 两张海豚图切换速度：数值越小越快
const DOLPHIN_ANIM_FRAME_MS = 90;

// 贴图类型（地面/平台可选 assets/pic/ground 中任意图片）
const T = {
  NONE: 0,
  GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4,
  COPPER: 5, DEEP_COPPER: 6, DEEP_DIAMOND: 7, DEEP_GOLD: 8, DEEP_IRON: 9,
  DIAMOND: 10, GOLD: 11, IRON: 12,  LAVA: 13, ACID: 14, WATER: 15, SAND: 16, GRAVEL: 17,
  // 工厂关（assets/pic/ground：bricks / pipe_narrow / deepslate_bricks）
  BRICKS: 18, PIPE_NARROW: 19, DEEPSLATE_BRICKS: 20
};

// ====== 音效（步伐） ======
const SFX = {
  enabled: true,
  sounds: Object.create(null), // key -> p5.SoundFile[]
  nextIndexByKey: Object.create(null),
  debug: false,
  queuedPathsByKey: Object.create(null),
  startedLoading: false,
  mode: 'html', // 'html' | 'p5'（当前环境 p5.loadSound 返回 Promise 且回调不稳定，脚步音改用 html 更稳）
  html: {
    audiosByKey: Object.create(null), // key -> HTMLAudioElement[]
    nextIndexByKey: Object.create(null)
  },
  minIntervalMsByKey: {
    step_grass: 70,
    step_stone: 70,
    step_sand: 70,
    // 高触发频率音效做节流
    fall: 140,
    swim: 3000,
    lava: 420,
    // TNT：arm/explode 都是一次性触发；这里主要防双调用
    tnt_fuse: 200,
    tnt_explode: 200,
    dig_grass: 120,
    dig_sand: 120,
    dig_stone: 120,
    hit: 120,
    pour: 200,
    recover: 160,
    trophy: 100,
    click: 120,
    win: 500,
    lost: 500,
    bird: 520,
    spike: 520
  },
  lastPlayedAtByKey: Object.create(null)
};

SFX.activeRefCountByKey = Object.create(null);

function stopSfxNow(key) {
  if (!key) return;
  if (SFX.mode === 'html') {
    const list = SFX.html.audiosByKey[key];
    if (!Array.isArray(list) || list.length === 0) return;
    for (const a of list) {
      if (!a) continue;
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    }
    return;
  }
  const list = SFX.sounds[key];
  if (!Array.isArray(list) || list.length === 0) return;
  for (const snd of list) {
    if (!snd) continue;
    try {
      if (typeof snd.stop === 'function') snd.stop();
      else if (typeof snd.pause === 'function') snd.pause();
    } catch {}
  }
}

function sfxAcquire(key) {
  if (!key) return;
  const n = (SFX.activeRefCountByKey[key] ?? 0) + 1;
  SFX.activeRefCountByKey[key] = n;
}

function sfxRelease(key) {
  if (!key) return;
  const cur = SFX.activeRefCountByKey[key] ?? 0;
  const next = Math.max(0, cur - 1);
  SFX.activeRefCountByKey[key] = next;
  if (next === 0) stopSfxNow(key);
}

function canUseSound() {
  const hasLoadSound = (typeof loadSound === 'function') || (typeof window !== 'undefined' && typeof window.loadSound === 'function');
  const hasUserStartAudio = (typeof userStartAudio === 'function') || (typeof window !== 'undefined' && typeof window.userStartAudio === 'function');
  return hasLoadSound && hasUserStartAudio;
}

function ensureAudioUnlocked() {
  if (!canUseSound()) return false;
  try {
    if (typeof getAudioContext === 'function') {
      const ctx = getAudioContext();
      if (ctx && ctx.state !== 'running') {
        (typeof userStartAudio === 'function' ? userStartAudio : window.userStartAudio)();
      }
      return ctx?.state === 'running';
    }
    (typeof userStartAudio === 'function' ? userStartAudio : window.userStartAudio)();
    return true;
  } catch {
    return false;
  }
}

function loadSfx(key, path) {
  if (!canUseSound()) return;
  try {
    const _loadSound = (typeof loadSound === 'function') ? loadSound : window.loadSound;
    const ret = _loadSound(
      path,
      () => console.log(`[SFX] loaded: ${key} <- ${path}`),
      err => console.warn(`[SFX] load failed: ${key} (${path})`, err)
    );
    // p5.sound 在不同版本中可能返回 SoundFile 或 Promise<SoundFile>
    if (ret && typeof ret.then === 'function') {
      ret.then((snd) => {
        if (snd && typeof snd.play === 'function') {
          SFX.sounds[key] = [snd];
        } else if (SFX.debug) {
          console.warn(`[SFX] unexpected resolved sound for ${key} (${path})`, snd);
        }
      }).catch((e) => console.warn(`[SFX] load promise rejected: ${key} (${path})`, e));
      return;
    }
    const snd = ret;
    if (snd && typeof snd.play === 'function') SFX.sounds[key] = [snd];
    else if (SFX.debug) console.warn(`[SFX] unexpected sound object for ${key} (${path})`, snd);
  } catch (e) {
    console.warn(`[SFX] load threw: ${key} (${path})`, e);
  }
}

function loadSfxList(key, paths) {
  if (!canUseSound()) return;
  if (!Array.isArray(paths) || paths.length === 0) return;

  if (!Array.isArray(SFX.sounds[key])) SFX.sounds[key] = [];

  paths.forEach((path, idx) => {
    try {
      const _loadSound = (typeof loadSound === 'function') ? loadSound : window.loadSound;
      const ret = _loadSound(
        path,
        () => console.log(`[SFX] loaded: ${key} <- ${path}`),
        err => console.warn(`[SFX] load failed: ${key} (${path})`, err)
      );
      // 用 idx 保持“轮流播放”的顺序稳定
      if (ret && typeof ret.then === 'function') {
        ret.then((snd) => {
          if (!Array.isArray(SFX.sounds[key])) SFX.sounds[key] = [];
          if (snd && typeof snd.play === 'function') {
            SFX.sounds[key][idx] = snd;
          } else if (SFX.debug) {
            console.warn(`[SFX] unexpected resolved sound for ${key} (${path})`, snd);
          }
        }).catch((e) => console.warn(`[SFX] load promise rejected: ${key} (${path})`, e));
        return;
      }
      const snd = ret;
      if (snd && typeof snd.play === 'function') SFX.sounds[key][idx] = snd;
      else if (SFX.debug) console.warn(`[SFX] unexpected sound object for ${key} (${path})`, snd);
    } catch (e) {
      console.warn(`[SFX] load threw: ${key} (${path})`, e);
    }
  });
}

function loadHtmlAudioList(key, paths) {
  if (!Array.isArray(paths) || paths.length === 0) return;
  if (!Array.isArray(SFX.html.audiosByKey[key])) SFX.html.audiosByKey[key] = [];

  paths.forEach((path, idx) => {
    // 避免重复创建
    if (SFX.html.audiosByKey[key][idx]) return;
    try {
      const a = new Audio();
      a.preload = 'auto';
      a.src = path;
      a.load();
      a.addEventListener('canplaythrough', () => {
        if (SFX.debug) console.log(`[SFX][html] loaded: ${key} <- ${path}`);
      }, { once: true });
      a.addEventListener('error', () => {
        if (SFX.debug) console.warn(`[SFX][html] load failed: ${key} (${path})`);
      }, { once: true });
      SFX.html.audiosByKey[key][idx] = a;
    } catch (e) {
      if (SFX.debug) console.warn(`[SFX][html] load threw: ${key} (${path})`, e);
    }
  });
}

function pickNextLoadedHtmlAudio(key, { allowNotReady = false } = {}) {
  const list = SFX.html.audiosByKey[key];
  if (!Array.isArray(list) || list.length === 0) return null;

  const start = (SFX.html.nextIndexByKey[key] ?? 0) % list.length;
  for (let i = 0; i < list.length; i++) {
    const idx = (start + i) % list.length;
    const a = list[idx];
    if (!a) continue;
    // readyState: 0 HAVE_NOTHING, 4 HAVE_ENOUGH_DATA
    // click 这类 UI 音效要求“跟手”，允许在未完全就绪时也先尝试播放（让浏览器自行缓冲）
    if (!allowNotReady && a.readyState < 3) continue;
    SFX.html.nextIndexByKey[key] = (idx + 1) % list.length;
    return a;
  }
  return null;
}

function getLoadedHtmlAudioCount(key) {
  const list = SFX.html.audiosByKey[key];
  if (!Array.isArray(list) || list.length === 0) return 0;
  let n = 0;
  for (const a of list) {
    if (!a) continue;
    if (a.readyState >= 3) n++;
  }
  return n;
}

function queueSfxList(key, paths) {
  if (!Array.isArray(paths) || paths.length === 0) return;
  if (!Array.isArray(SFX.queuedPathsByKey[key])) SFX.queuedPathsByKey[key] = [];
  for (const p of paths) {
    if (!SFX.queuedPathsByKey[key].includes(p)) SFX.queuedPathsByKey[key].push(p);
  }
}

function startQueuedSfxLoads() {
  if (SFX.startedLoading) return;
  const keys = Object.keys(SFX.queuedPathsByKey || {});
  if (SFX.debug) {
    const lens = keys.map(k => `${k}=${(SFX.queuedPathsByKey[k] || []).length}`).join(', ');
    console.log('[SFX] startQueuedSfxLoads keys=', keys, 'lens=', lens);
  }
  // 队列为空时不“锁死”startedLoading，允许后续补齐队列后重试
  if (keys.length === 0) return;

  SFX.startedLoading = true;
  // 尽量在用户手势后开始加载，HTML Audio 也需要手势
  ensureAudioUnlocked();

  for (const key of keys) {
    const paths = SFX.queuedPathsByKey[key];
    if (SFX.mode === 'p5') loadSfxList(key, paths);
    else loadHtmlAudioList(key, paths);
  }
}

function pickNextLoadedSound(key) {
  const list = SFX.sounds[key];
  if (!Array.isArray(list) || list.length === 0) return null;

  // 如果 list 中存在空洞（加载失败/未完成），轮询跳过
  const start = (SFX.nextIndexByKey[key] ?? 0) % list.length;
  for (let i = 0; i < list.length; i++) {
    const idx = (start + i) % list.length;
    const snd = list[idx];
    if (!snd) continue;
    if (typeof snd.play !== 'function') continue;
    if (typeof snd.isLoaded !== 'function') continue;
    if (!snd.isLoaded()) continue;
    SFX.nextIndexByKey[key] = (idx + 1) % list.length;
    return snd;
  }
  return null;
}

function getLoadedSoundCount(key) {
  if (SFX.mode === 'html') return getLoadedHtmlAudioCount(key);
  const list = SFX.sounds[key];
  if (!Array.isArray(list) || list.length === 0) return 0;
  let n = 0;
  for (const snd of list) {
    if (!snd) continue;
    if (typeof snd.isLoaded !== 'function') continue;
    if (!snd.isLoaded()) continue;
    n++;
  }
  return n;
}

function getSfxMasterVolume01() {
  // 统一由设置页的 sfxVolume 控制（0..100）
  const v = (game?.settings?.sfxVolume ?? 80);
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.8;
  return constrain(n / 100, 0, 1);
}

function tryPlaySfx(key, { volume = 0.35, rate = 1 } = {}) {
  if (!SFX.enabled) return;
  // 先做节流，避免高频场景里每次都走解锁/加载检查
  const now = millis();
  const minGap = SFX.minIntervalMsByKey[key] ?? 60;
  const lastAt = SFX.lastPlayedAtByKey[key] ?? -Infinity;
  if (now - lastAt < minGap) return;

  // 兜底：即使没触发到 pointerdown/keydown 的 once 监听，也在首次尝试播放时启动加载
  if (!SFX.startedLoading) {
    if (SFX.debug) console.log('[SFX] tryPlaySfx triggers queued loads');
    ensureAudioUnlocked();
    startQueuedSfxLoads();
  }

  const master = getSfxMasterVolume01();
  // 传入的 volume 作为“相对音量”，统一受全局音效音量控制
  const finalVol = constrain((Number(volume) || 0) * master, 0, 1);
  if (finalVol <= 0) return;

  if (SFX.mode === 'html') {
    const a = pickNextLoadedHtmlAudio(key, { allowNotReady: key === 'click' });
    if (!a) return;
    SFX.lastPlayedAtByKey[key] = now;

    try {
      // 对 click：不强制 reset currentTime（未就绪时 reset 反而更容易被浏览器拒绝/延后）
      if (key !== 'click') {
        a.pause();
        a.currentTime = 0;
      } else {
        try { a.pause(); } catch {}
        try { if (a.currentTime > 0.02) a.currentTime = 0; } catch {}
      }
      a.playbackRate = rate;
      a.volume = finalVol;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      if (SFX.debug) console.log('[SFX][html] play', key, 'rate=', rate, 'vol=', volume);
    } catch (e) {
      if (SFX.debug) console.warn('[SFX][html] play threw', key, e);
    }
    return;
  }

  if (!canUseSound()) return;
  const snd = pickNextLoadedSound(key);
  if (!snd) return;
  if (typeof snd.isLoaded === 'function' && !snd.isLoaded()) return;
  SFX.lastPlayedAtByKey[key] = now;

  try {
    // 用带参数的 play 更稳定（避免 setVolume/rate 在某些情况下不生效）
    if (typeof snd.play === 'function') snd.play(0, rate, finalVol);
    else {
      if (typeof snd.rate === 'function') snd.rate(rate);
      if (typeof snd.setVolume === 'function') snd.setVolume(finalVol);
      snd.play();
    }
    if (SFX.debug) {
      const dur = typeof snd.duration === 'function' ? snd.duration() : undefined;
      console.log('[SFX] play', key, 'rate=', rate, 'vol=', volume, 'duration=', dur);
    }
  } catch (e) {
    // 某些浏览器在音频上下文未解锁时会抛错；这里静默失败即可
    if (SFX.debug) console.warn('[SFX] play threw', key, e);
  }
}

function tileTypeToFootstepKey(tileType) {
  // pipe tileType 是对象（textureKey/rotation），默认归到石质脚步
  if (typeof isPipeTileType === 'function' && isPipeTileType(tileType)) return 'step_stone';
  switch (tileType) {
    case T.GRASS:
    case T.DIRT:
      return 'step_grass';
    case T.SAND:
    case T.GRAVEL:
      return 'step_sand';
    case T.STONE:
    case T.DEEP:
    case T.BRICKS:
    case T.DEEPSLATE_BRICKS:
    case T.COPPER:
    case T.IRON:
    case T.GOLD:
    case T.DIAMOND:
    case T.DEEP_COPPER:
    case T.DEEP_IRON:
    case T.DEEP_GOLD:
    case T.DEEP_DIAMOND:
    default:
      return 'step_stone';
  }
}

function tileTypeToDigSfxKey(tileType) {
  // 管道类 tileType 是对象（textureKey/rotation），按石质挖掘音处理
  if (typeof isPipeTileType === 'function' && isPipeTileType(tileType)) return 'dig_stone';
  switch (tileType) {
    case T.GRASS:
    case T.DIRT:
      return 'dig_grass';
    case T.SAND:
    case T.GRAVEL:
      return 'dig_sand';
    case T.STONE:
    case T.DEEP:
    case T.BRICKS:
    case T.DEEPSLATE_BRICKS:
    case T.COPPER:
    case T.IRON:
    case T.GOLD:
    case T.DIAMOND:
    case T.DEEP_COPPER:
    case T.DEEP_IRON:
    case T.DEEP_GOLD:
    case T.DEEP_DIAMOND:
    default:
      return 'dig_stone';
  }
}

// UI 常量
const SLOT_SIZE = 24, SLOT_GAP = 8, INV_PADDING = 8;
const INV_BAR_W = 10 * (SLOT_SIZE + SLOT_GAP) + INV_PADDING * 2 - SLOT_GAP, INV_BAR_H = 40;
const INVENTORY_PROGRESS_CAT_W = 28, INVENTORY_PROGRESS_CAT_H = 14;
const MAX_HEARTS = 5, HEART_SIZE = 20;
/** 相邻心形容器左边缘间距增量（负值表示重叠） */
const HEART_GAP = 0;
/** 生命栏相对画布左上内边距 */
const HEART_UI_INSET = 4;
/** 得分奖杯栏：默认槽位数（未配置关卡时使用） */
const MAX_TROPHY_SLOTS = 5;
/** 得分奖杯栏：按关卡类型配置槽位上限 */
const TROPHY_SLOTS_BY_LEVEL = {
  forest: 2,
  water: 4
};
/** 奖杯图标绘制边长（与心形栏一致便于对齐） */
const TROPHY_SIZE = HEART_SIZE;
/** 奖杯栏相对画布上、右内边距（整条栏的顶边与最右格右缘） */
const TROPHY_UI_INSET = 4;
/** 顶部居中游戏进度条 */
const TOP_PROGRESS_BAR_W = 200;
const TOP_PROGRESS_BAR_H = 14;
const TOP_PROGRESS_BAR_Y = HEART_UI_INSET + HEART_SIZE - TOP_PROGRESS_BAR_H;
const TOP_PROGRESS_FILL_W = 196;
const TOP_PROGRESS_FILL_H = 10;
/** 退出按钮相对画布左、下边距（左缘、下缘各距屏幕边缘） */
const EXIT_BTN_SCREEN_INSET = 2;
/** 菜单按钮下缘与退出按钮上缘的间距 */
const MENU_EXIT_VERTICAL_GAP = 2;

// 手持武器绘制：大小固定 24×24，偏移量相对玩家贴图（朝右时 +X 向右、+Y 向下；朝左时镜像）
const WEAPON_DRAW_SIZE = 24;
const WEAPON_OFFSET_X = 18;   // 相对手部基准的 x 偏移，可调
const WEAPON_OFFSET_Y = -12;  // 相对手部基准的 y 偏移，可调

// ====== 字体定义 ======
const FONT_CONFIGS = {
  mojangRegular: {
    family: 'MojangRegular',
    file: 'assets/fonts/Mojang-Regular.ttf'
  },
  mojangBold: {
    family: 'MojangBold',
    file: 'assets/fonts/Mojang-Bold.ttf'
  },
  pixel10Regular: {
    family: 'PixelMplus10Regular',
    file: 'assets/fonts/PixelMplus10-Regular.ttf'
  },
  pixel10Bold: {
    family: 'PixelMplus10Bold',
    file: 'assets/fonts/PixelMplus10-Bold.ttf'
  },
  pixel12Regular: {
    family: 'PixelMplus12Regular',
    file: 'assets/fonts/PixelMplus12-Regular.ttf'
  },
  pixel12Bold: {
    family: 'PixelMplus12Bold',
    file: 'assets/fonts/PixelMplus12-Bold.ttf'
  },
  fusionZhHans: {
    family: 'FusionPixelZhHans',
    file: 'assets/fonts/fusion-pixel-12px-proportional-zh_hans.ttf'
  },
  fusionLatin: {
    family: 'FusionPixelLatin',
    file: 'assets/fonts/fusion-pixel-12px-proportional-latin.ttf'
  },
  fusionJa: {
    family: 'FusionPixelJa',
    file: 'assets/fonts/fusion-pixel-12px-proportional-ja.ttf'
  },
  fusionKo: {
    family: 'FusionPixelKo',
    file: 'assets/fonts/fusion-pixel-12px-proportional-ko.ttf'
  }
};
const DEFAULT_LANGUAGE = 'EN';
const SUPPORTED_LANGUAGES = ['EN', '中文', 'FR', 'RU', 'JA', 'KO'];
const LANGUAGE_FONT_KEY_MAP = {
  EN: 'mojangRegular',
  中文: 'fusionZhHans',
  FR: 'fusionLatin',
  RU: 'fusionLatin',
  JA: 'fusionJa',
  KO: 'fusionKo'
};
const I18N_BY_EN = {
  Start: { FR: 'Démarrer', RU: 'Старт', JA: 'スタート', KO: '시작' },
  Settings: { FR: 'Paramètres', RU: 'Настройки', JA: '設定', KO: '설정' },
  'Press  Start  to  begin  your  adventure': { FR: 'Appuyez sur Démarrer pour commencer votre aventure', RU: 'Нажмите Старт, чтобы начать приключение', JA: 'スタートを押して冒険を始めよう', KO: '시작을 눌러 모험을 시작하세요' },
  'Level 1': { FR: 'Niveau 1', RU: 'Уровень 1', JA: 'レベル1', KO: '레벨 1' },
  'Level 2': { FR: 'Niveau 2', RU: 'Уровень 2', JA: 'レベル2', KO: '레벨 2' },
  'Level 3': { FR: 'Niveau 3', RU: 'Уровень 3', JA: 'レベル3', KO: '레벨 3' },
  'Choose  your  level': { FR: 'Choisissez votre niveau', RU: 'Выберите уровень', JA: 'レベルを選択', KO: '레벨을 선택하세요' },
  Back: { FR: 'Retour', RU: 'Назад', JA: '戻る', KO: '뒤로' },
  'Music Volume': { FR: 'Volume de la musique', RU: 'Громкость музыки', JA: '音楽音量', KO: '음악 볼륨' },
  'SFX Volume': { FR: 'Volume des effets', RU: 'Громкость эффектов', JA: '効果音音量', KO: '효과음 볼륨' },
  Fullscreen: { FR: 'Plein écran', RU: 'Полный экран', JA: '全画面', KO: '전체 화면' },
  ON: { FR: 'ON', RU: 'ВКЛ', JA: 'オン', KO: '켜짐' },
  OFF: { FR: 'OFF', RU: 'ВЫКЛ', JA: 'オフ', KO: '꺼짐' },
  Language: { FR: 'Langue', RU: 'Язык', JA: '言語', KO: '언어' },
  'GAME OVER': { FR: 'FIN DE PARTIE', RU: 'КОНЕЦ ИГРЫ', JA: 'ゲームオーバー', KO: '게임 오버' },
  'Press ENTER to Restart': { FR: 'Appuyez sur ENTER pour recommencer', RU: 'Нажмите ENTER для перезапуска', JA: 'ENTERで再開', KO: 'ENTER를 눌러 재시작' },
  'Victory!': { FR: 'Victoire!', RU: 'ПОБЕДА!', JA: '勝利！', KO: '승리!' },
  Score: { FR: 'Score', RU: 'Очки', JA: 'スコア', KO: '점수' },
  'Press ENTER to Play Again': { FR: 'Appuyez sur ENTER pour rejouer', RU: 'Нажмите ENTER, чтобы играть снова', JA: 'ENTERでもう一度プレイ', KO: 'ENTER를 눌러 다시 플레이' },
  'Wildlife rescued! +1': { FR: 'Animal sauvé ! +1', RU: 'Животное спасено! +1', JA: '野生動物を救出！ +1', KO: '야생동물 구조! +1' },
  'Pollutant collected! +1': { FR: 'Polluant collecté ! +1', RU: 'Загрязнитель собран! +1', JA: '汚染物を回収！ +1', KO: '오염물 수집! +1' },
  'Field Guide': { FR: 'Guide', RU: 'Справочник', JA: 'ガイド', KO: '가이드' },
  Tools: { FR: 'Outils', RU: 'Инструменты', JA: '道具', KO: '도구' },
  Pollutants: { FR: 'Polluants', RU: 'Загрязнители', JA: '汚染物', KO: '오염물' },
  Trapped: { FR: 'Piégés', RU: 'В ловушке', JA: '要救助', KO: '구조 대상' },
  'Enemy / Danger': { FR: 'Ennemi / Danger', RU: 'Враг / Опасность', JA: '敵 / 危険', KO: '적 / 위험' },
  Scissors: { FR: 'Ciseaux', RU: 'Ножницы', JA: 'はさみ', KO: '가위' },
  Bucket: { FR: 'Seau', RU: 'Ведро', JA: 'バケツ', KO: '양동이' },
  Limestone: { FR: 'Calcaire', RU: 'Известняк', JA: '石灰石', KO: '석회암' },
  Cigarette: { FR: 'Cigarette', RU: 'Сигарета', JA: 'たばこ', KO: '담배' },
  'Plastic Bottle': { FR: 'Bouteille plastique', RU: 'Пластиковая бутылка', JA: 'ペットボトル', KO: '플라스틱 병' },
  Wrapper: { FR: 'Emballage', RU: 'Обертка', JA: '包装ごみ', KO: '포장지' },
  'Acid Pool': { FR: 'Bassin acide', RU: 'Кислотная лужа', JA: '酸の池', KO: '산성 웅덩이' },
  Bird: { FR: 'Oiseau', RU: 'Птица', JA: '鳥', KO: '새' },
  Zombie: { FR: 'Zombie', RU: 'Зомби', JA: 'ゾンビ', KO: '좀비' },
  'Cut webs to rescue': { FR: 'Coupez la toile pour sauver', RU: 'Разрежьте паутину, чтобы спасти', JA: 'クモの巣を切って救出', KO: '거미줄을 잘라 구조' },
  'Use near lava': { FR: 'Utiliser près de la lave', RU: 'Используйте рядом с лавой', JA: '溶岩の近くで使用', KO: '용암 근처에서 사용' },
  'Use near acid': { FR: 'Utiliser près de l’acide', RU: 'Используйте рядом с кислотой', JA: '酸の近くで使用', KO: '산 근처에서 사용' },
  Collect: { FR: 'Collecter', RU: 'Соберите', JA: '回収', KO: '수집' },
  'Treat with limestone': { FR: 'Traiter avec calcaire', RU: 'Обработайте известняком', JA: '石灰石で中和', KO: '석회암으로 처리' },
  'Click scissors to rescue': { FR: 'Cliquez les ciseaux pour sauver', RU: 'Нажмите ножницы, чтобы спасти', JA: 'はさみをクリックして救出', KO: '가위를 클릭해 구조' },
  'Press F to attack': { FR: 'Appuyez sur F pour attaquer', RU: 'Нажмите F для атаки', JA: 'Fキーで攻撃', KO: 'F키로 공격' },
  'Keep away': { FR: 'Restez à distance', RU: 'Держитесь подальше', JA: '近づかないで', KO: '가까이 가지 마세요' },
  'Vine Seed': { FR: 'Graine de vigne', RU: 'Семя лозы', JA: 'つるの種', KO: '덩굴 씨앗' },
  'Grow a ladder to climb': { FR: 'Fait pousser une échelle', RU: 'Выращивает лестницу', JA: 'つるのはしごを作る', KO: '덩굴 사다리를 만든다' },
  'Vine ladder grown': {FR: 'Échelle de liane créée',RU: 'Лестница из лозы создана',JA: 'つるのはしごを作った',KO: '덩굴 사다리가 생성되었습니다'},
  'Cannot plant vine here': {FR: 'Impossible de planter ici',RU: 'Здесь нельзя посадить лозу',JA: 'ここには植えられない',KO: '여기에는 심을 수 없습니다'},
  'Vine seed must be planted on nearby ground': {FR: 'La graine doit être plantée sur un sol proche',RU: 'Семя лозы можно сажать только на ближайшей земле',JA: '近くの地面にしか植えられない',KO: '가까운地面にのみ植えられます'},
  'Move  with  W/S/A/D,  press  F  to  attack,  click  inventory  items  to  use  them': {FR: 'Déplacez-vous avec W/S/A/D, appuyez sur F pour attaquer, cliquez sur les objets de l’inventaire pour les utiliser',RU: 'Двигайтесь с W/S/A/D, нажмите F для атаки, щёлкните предметы в инвентаре, чтобы использовать их',JA: 'W/S/A/Dで移動、Fキーで攻撃、インベントリ内のアイテムをクリックして使用',KO: 'W/S/A/D로 이동, F 키로 공격, 인벤토리의 아이템을 클릭해 사용'},
  'Lava  ahead.  Try  picking  up  the  bucket  and  using  it.': {FR: 'De la lave devant vous. Essayez de ramasser le seau et de l’utiliser.',RU: 'Впереди лава. Попробуйте подобрать ведро и использовать его.',JA: '前方に溶岩があります。バケツを拾って使ってみましょう。',KO: '앞에 용암이 있습니다. 양동이를 주워 사용해 보세요.'},
  'Great!  Water  and  fire  reacted  chemically.  You  can  pass  now.': {FR: 'Super ! L’eau et le feu ont réagi chimiquement. Vous pouvez passer maintenant.',RU: 'Отлично! Вода и огонь вступили в химическую реакцию. Теперь можно пройти.',JA: 'すごい！水と火が化学反応を起こしました。もう通れます。',KO: '좋아요! 물과 불이 화학 반응을 일으켰습니다. 이제 지나갈 수 있습니다.'},
  'It\'s  a  zombie!  Quickly  press  F  to  attack  it.': {FR: 'C’est un zombie ! Appuyez vite sur F pour l’attaquer.',RU: 'Это зомби! Быстро нажмите F, чтобы атаковать его.',JA: 'ゾンビです！すぐにFキーで攻撃しましょう。',KO: '좀비입니다! 빨리 F 키로 공격하세요.'},
  'It\'s  a  magic  seed.  It  will  grow  into  a  vine  ladder.': {FR: 'C’est une graine magique. Elle deviendra une échelle de lianes.',RU: 'Это волшебное семя. Оно вырастет в лиановую лестницу.',JA: '魔法の種です。つるのはしごに成長します。',KO: '마법의 씨앗입니다. 덩굴 사다리로 자랍니다.'},
  'A  pair  of  scissors!  You  can  use  them  to  rescue  trapped  animals.': {FR: 'Une paire de ciseaux ! Vous pouvez les utiliser pour sauver les animaux piégés.',RU: 'Ножницы! Их можно использовать, чтобы спасти пойманных животных.',JA: 'ハサミです！捕まった動物を助けるのに使えます。',KO: '가위입니다! 갇힌 동물을 구하는 데 사용할 수 있습니다.'},
  'Oh  no,  a  slime  is  blocking  the  way!': {FR: 'Oh non, un slime bloque le passage !',RU: 'О нет, слизень преградил путь!',JA: 'しまった、スライムが道をふさいでいる！',KO: '이런, 슬라임이 길을 막고 있어요!'},
  'Apples  are  a  gift  from  the  forest.  Eat  them  for  a  pleasant  surprise.': {FR: 'Les pommes sont un cadeau de la forêt. Mangez-les pour une agréable surprise.',RU: 'Яблоки — дар леса. Съешьте их, и вас ждёт приятный сюрприз.',JA: 'リンゴは森からの贈り物です。食べると嬉しい効果があります。',KO: '사과는 숲의 선물입니다. 먹으면 기분 좋은 효과가 있습니다.'},
  'Poor  little  bird  is  trapped  in  a  net.  Maybe  we  can  help  it.': {FR: 'Le pauvre petit oiseau est piégé dans un filet. Nous pouvons peut-être l’aider.',RU: 'Бедная маленькая птица попала в сеть. Возможно, мы сможем ей помочь.',JA: 'かわいそうな小鳥が網に捕まっています。助ける方法があるかもしれません。',KO: '불쌍한 작은 새가 그물에 갇혔어요. 우리가 도울 방법이 있을지도 몰라요.'},
  'It\'s  dynamite.  Do  not  touch  it!': {FR: 'C’est de la dynamite. N’y touchez pas !',RU: 'Это динамит. Не трогайте его!',JA: 'ダイナマイトです。触らないでください！',KO: '다이너마이트입니다. 절대 만지지 마세요!'},
  'There  seems  to  be  treasure  buried  in  the  seabed  gravel  ahead.  Click  to  mine  it.': {FR: 'Il semble y avoir un trésor enfoui dans le gravier du fond marin. Cliquez pour le miner.',RU: 'Похоже, в морском гравии впереди спрятано сокровище. Нажмите, чтобы добыть его.',JA: '前方の海底の砂利には宝が埋まっているようです。クリックして採掘しましょう。',KO: '앞쪽 해저 자갈에 보물이 묻혀 있는 것 같습니다. 클릭하여 채굴하세요.'},
  'Magic  seashell!  Maybe,  like  apples,  it  is  a  gift  from  nature.': {FR: 'Coquillage magique ! Peut-être, comme les pommes, est-ce un cadeau de la nature.',RU: 'Волшебная ракушка! Возможно, как и яблоки, это дар природы.',JA: '魔法の貝殻！リンゴのように自然からの贈り物かもしれません。',KO: '마법의 조개입니다! 사과처럼 자연이 준 선물일지도 모릅니다.'},
  'Meow!  Steve,  there  is  a  turtle  that  has  lost  its  freedom.': {FR: 'Miaou ! Steve, il y a une tortue qui a perdu sa liberté.',RU: 'Мяу! Стив, там черепаха, которая лишилась свободы.',JA: 'ニャー！スティーブ、自由を失ったカメがいるよ。',KO: '야옹! 스티브, 자유를 잃은 거북이가 있어요.'},
  'Meow!  I’ve  never  seen  such  a  big  fish!  Be  careful  in  the  deep  sea.': {FR: 'Miaou ! Je n’ai jamais vu un poisson aussi grand ! Fais attention dans les profondeurs.',RU: 'Мяу! Я никогда не видел такую большую рыбу! Будь осторожен в глубоком море.',JA: 'ニャー！こんなに大きな魚は初めて見た！深海では気をつけて。',KO: '야옹! 이렇게 큰 물고기는 처음 봐요! 깊은 바다에서는 조심하세요.'},
  'Another  glowing  treasure!  We  are  really  lucky.': {FR: 'Encore un trésor lumineux ! Nous avons vraiment de la chance.',RU: 'Ещё одно светящееся сокровище! Нам действительно повезло.',JA: 'また光る宝物だ！本当に運がいいね。',KO: '또 빛나는 보물이야! 정말 운이 좋네요.'},
  'My  excellent  sense  of  smell  tells  me  that  green  potion  is  something  good.': {FR: 'Mon excellent odorat me dit que cette potion verte est une bonne chose.',RU: 'Моё отличное обоняние подсказывает, что это зелёное зелье — хорошая вещь.',JA: '優れた嗅覚によると、あの緑の薬は良いものみたいです。',KO: '제 뛰어난 후각으로 보아 저 초록 물약은 좋은 것 같아요.'},
  'City  pipes…  I  really  don’t  like  water.  Can  we  go  somewhere  else,  meow?': {FR: 'Les tuyaux de la ville… je n’aime vraiment pas l’eau. On peut aller ailleurs, miaou ?',RU: 'Городские трубы… я правда не люблю воду. Может, пойдём в другое место, мяу?',JA: '街の配管…水は本当に苦手。別のところに行ける？ニャー？',KO: '도시의 파이프… 저는 물이 정말 싫어요. 다른 데로 갈 수 있을까요? 야옹?'},
  'The  dolphin  attracts  nearby  tools  and  seashells!': {FR: 'Le dauphin attire les outils et les coquillages proches !',RU: 'Дельфин притягивает ближайшие инструменты и ракушки!',JA: 'イルカが近くの道具や貝殻を引き寄せます！',KO: '돌고래가 근처의 도구와 조개를 끌어당깁니다!'},

};
let activeFont;

function getLanguageFontConfig(language) {
  const fontKey = LANGUAGE_FONT_KEY_MAP[language] || LANGUAGE_FONT_KEY_MAP[DEFAULT_LANGUAGE];
  return FONT_CONFIGS[fontKey] || FONT_CONFIGS[LANGUAGE_FONT_KEY_MAP[DEFAULT_LANGUAGE]];
}

function applyGameFont() {
  const language = game?.settings?.language || DEFAULT_LANGUAGE;
  const activeFontConfig = getLanguageFontConfig(language);
  textFont(activeFont || activeFontConfig.family);
}

function cloneSettings(settings) {
  if (!settings) return null;
  return {
    musicVolume: settings.musicVolume,
    sfxVolume: settings.sfxVolume,
    fullscreen: settings.fullscreen,
    language: settings.language,
    levelTrophies: settings.levelTrophies ? { ...settings.levelTrophies } : undefined
  };
}

function createGameWithSameSettings(levelType, previousSettings = game?.settings) {
  const nextGame = new Game(levelType);
  const preserved = cloneSettings(previousSettings);
  if (preserved) {
    nextGame.settings = { ...nextGame.settings, ...preserved };
  }
  return nextGame;
}

// ====== 工具函数 ======
function rectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function getCollisionRectsForCollider(collider) {
  if (!collider) return [];
  if (Array.isArray(collider.collisionRects) && collider.collisionRects.length > 0) {
    return collider.collisionRects;
  }
  return [{ x: collider.x, y: collider.y, w: collider.w, h: collider.h }];
}

function isEntityInWater(entity, level) {
  if (!entity || !level || typeof level.isWaterAtWorld !== 'function') return false;
  const getBox = typeof entity.getCollisionBox === 'function'
    ? () => entity.getCollisionBox()
    : () => ({ x: entity.x, y: entity.y, w: entity.w, h: entity.h });
  const b = getBox();
  const pts = [
    { x: b.x + b.w / 2, y: b.y + b.h / 2 },
    { x: b.x + 2, y: b.y + b.h / 2 },
    { x: b.x + b.w - 2, y: b.y + b.h / 2 },
    { x: b.x + b.w / 2, y: b.y + b.h - 2 }
  ];
  return pts.some(p => level.isWaterAtWorld(p.x, p.y));
}

function isEntityTouchingTileType(entity, level, tileType) {
  if (!entity || !level || typeof level.getTileAtWorld !== 'function') return false;
  const getBox = typeof entity.getCollisionBox === 'function'
    ? () => entity.getCollisionBox()
    : () => ({ x: entity.x, y: entity.y, w: entity.w, h: entity.h });
  const b = getBox();
  const pts = [
    { x: b.x + b.w / 2, y: b.y + b.h / 2 },
    { x: b.x + 2, y: b.y + b.h / 2 },
    { x: b.x + b.w - 2, y: b.y + b.h / 2 },
    { x: b.x + b.w / 2, y: b.y + b.h - 2 }
  ];
  return pts.some(p => level.getTileAtWorld(p.x, p.y) === tileType);
}

function isEntityTouchingBlueFlow(entity, level) {
  if (!entity || !level) return false;
  if (typeof level.getActivePipeFlowZones !== 'function') return false;
  const box = (typeof entity.getCollisionBox === 'function')
    ? entity.getCollisionBox()
    : { x: entity.x, y: entity.y, w: entity.w, h: entity.h };
  const zones = level.getActivePipeFlowZones();
  if (!Array.isArray(zones) || zones.length === 0) return false;
  return zones.some((z) => rectCollision(box.x, box.y, box.w, box.h, z.x, z.y, z.w, z.h));
}

const PIPE_WALL_THICKNESS = 5;

function isPipeTileType(tileType) {
  return !!(
    tileType &&
    typeof tileType === 'object' &&
    typeof tileType.textureKey === 'string' &&
    tileType.textureKey.startsWith('tile_pipe_')
  );
}

function isAnyPipeTileType(tileType) {
  return tileType === T.PIPE_NARROW || isPipeTileType(tileType);
}

function normalizeQuarterTurns(rotation = 0) {
  const quarter = Math.round(rotation / HALF_PI);
  return ((quarter % 4) + 4) % 4;
}

function rotateLocalRect(rect, quarterTurns) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 0) return { ...rect };
  if (turns === 1) {
    return {
      x: TILE_SIZE - (rect.y + rect.h),
      y: rect.x,
      w: rect.h,
      h: rect.w
    };
  }
  if (turns === 2) {
    return {
      x: TILE_SIZE - (rect.x + rect.w),
      y: TILE_SIZE - (rect.y + rect.h),
      w: rect.w,
      h: rect.h
    };
  }
  return {
    x: rect.y,
    y: TILE_SIZE - (rect.x + rect.w),
    w: rect.h,
    h: rect.w
  };
}

function getPipeBaseCollisionRects(textureKey) {
  const t = PIPE_WALL_THICKNESS;
  const edge = TILE_SIZE - t;
  const corner = t + 2;

  switch (textureKey) {
    // rotation=0 对应 LEFT：左壁
    case 'tile_pipe_wide':
      return [{ x: 0, y: 0, w: t, h: TILE_SIZE }];

    // rotation=0 对应 UP：左右壁
    case 'tile_pipe_narrow':
      return [
        { x: 0, y: 0, w: t, h: TILE_SIZE },
        { x: edge, y: 0, w: t, h: TILE_SIZE }
      ];

    // rotation=0 对应 UP：左上+右上补块
    case 'tile_pipe_narrow_to_wide':
      return [
        { x: 0, y: 0, w: corner, h: corner },
        { x: TILE_SIZE - corner, y: 0, w: corner, h: corner }
      ];

    // rotation=0 对应 UP：左上+右上补块 + 下壁
    case 'tile_pipe_narrow_to_narrow':
      return [
        { x: 0, y: 0, w: corner, h: corner },
        { x: TILE_SIZE - corner, y: 0, w: corner, h: corner },
        { x: 0, y: edge, w: TILE_SIZE, h: t }
      ];

    // rotation=0 对应 UP_RIGHT：右上内角块
    case 'tile_pipe_wide_inner_corner':
      return [{ x: TILE_SIZE - corner, y: 0, w: corner, h: corner }];

    // rotation=0 对应 DOWN_LEFT：左壁 + 下壁
    case 'tile_pipe_wide_outer_corner':
      return [
        { x: 0, y: 0, w: t, h: TILE_SIZE },
        { x: 0, y: edge, w: TILE_SIZE, h: t }
      ];

    // rotation=0 对应 DOWN_LEFT：左壁 + 下壁 + 右上角补块
    case 'tile_pipe_narrow_corner':
      return [
        { x: 0, y: 0, w: t, h: TILE_SIZE },
        { x: 0, y: edge, w: TILE_SIZE, h: t },
        { x: TILE_SIZE - corner, y: 0, w: corner, h: corner }
      ];

    default:
      return [{ x: 0, y: 0, w: TILE_SIZE, h: TILE_SIZE }];
  }
}

function buildTileCollisionRects(tileType, tileX, tileY) {
  // 液体：不作为实体方块，只保留底部 2px 的“底边”碰撞
  // 用于工厂关酸液/水的行为：可穿过液体，但在最底部有轻微阻挡
  if (tileType === T.ACID || tileType === T.WATER) {
    return [{ x: tileX, y: tileY + TILE_SIZE - 2, w: TILE_SIZE, h: 2 }];
  }
  if (!isPipeTileType(tileType)) {
    return [{ x: tileX, y: tileY, w: TILE_SIZE, h: TILE_SIZE }];
  }

  const baseRects = getPipeBaseCollisionRects(tileType.textureKey);
  const quarterTurns = normalizeQuarterTurns(tileType.rotation || 0);

  return baseRects.map(local => {
    const rotated = rotateLocalRect(local, quarterTurns);
    return {
      x: tileX + rotated.x,
      y: tileY + rotated.y,
      w: rotated.w,
      h: rotated.h
    };
  });
}

// 用于“装饰物/背景物”生成的稳定随机（同一 col 每次都一致）
function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

// 贴图和回退颜色映射（与 T 对应，来自 assets/pic/ground）
function getTextures() {
  return {
    [T.GRASS]: window.tile_grass_block_side,
    [T.DIRT]: window.tile_dirt,
    [T.STONE]: window.tile_stone,
    [T.DEEP]: window.tile_deepslate,
    // 兼容：项目当前未提供 copper/gold 对应贴图，先复用现有矿石贴图避免回退色块
    [T.COPPER]: window.tile_iron_ore,
    [T.DEEP_COPPER]: window.tile_deepslate_iron_ore,
    [T.DEEP_DIAMOND]: window.tile_deepslate_diamond_ore,
    [T.DEEP_GOLD]: window.tile_deepslate_diamond_ore,
    [T.DEEP_IRON]: window.tile_deepslate_iron_ore,
    [T.DIAMOND]: window.tile_diamond_ore,
    [T.GOLD]: window.tile_diamond_ore,
    [T.IRON]: window.tile_iron_ore,
    [T.LAVA]: window.tile_lava,
    [T.ACID]: window.tile_acid,
    [T.WATER]: window.tile_water,
    [T.SAND]: window.tile_sand,
    [T.GRAVEL]: window.tile_gravel,
    [T.BRICKS]: window.tile_bricks,
    [T.PIPE_NARROW]: window.tile_pipe_narrow,
    [T.DEEPSLATE_BRICKS]: window.tile_deepslate_bricks
  };
}
const FALLBACK_COLORS = {
  [T.GRASS]: [100, 180, 100], [T.DIRT]: [139, 90, 43], [T.STONE]: [128, 128, 128], [T.DEEP]: [80, 80, 80],
  [T.COPPER]: [180, 100, 80], [T.DEEP_COPPER]: [100, 70, 60], [T.DEEP_DIAMOND]: [80, 180, 220],
  [T.DEEP_GOLD]: [200, 160, 60], [T.DEEP_IRON]: [160, 140, 120], [T.DIAMOND]: [100, 200, 230],
  [T.GOLD]: [220, 180, 50], [T.IRON]: [180, 160, 140], [T.LAVA]: [255, 80, 0],[T.ACID]: [120, 255, 120],
  [T.WATER]: [80, 140, 255],
  [T.SAND]: [230, 220, 170],
  [T.GRAVEL]: [150, 150, 150],
  [T.BRICKS]: [91, 95, 98],
  [T.PIPE_NARROW]: [248, 246, 247],
  [T.DEEPSLATE_BRICKS]: [55, 55, 60]
};

function drawRotatedTile(img, x, y, rotation = 0, flipX = false, flipY = false) {
  push();
  imageMode(CENTER);
  translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
  scale(flipX ? -1 : 1, flipY ? -1 : 1);
  rotate(rotation);
  image(img, 0, 0, TILE_SIZE, TILE_SIZE);
  imageMode(CORNER);
  pop();
}

function drawTile(tileType, x, y) {
  if (tileType && typeof tileType === 'object' && tileType.textureKey) {
    const img = window[tileType.textureKey];
    if (img && img.width > 0) {
      drawRotatedTile(img, x, y, tileType.rotation || 0, !!tileType.flipX, !!tileType.flipY);
      return;
    }
    const c = [80, 80, 80];
    fill(c[0], c[1], c[2]);
    rect(x, y, TILE_SIZE, TILE_SIZE);
    return;
  }

  const img = getTextures()[tileType];
  if (img && img.width > 0) {
    image(img, x, y, TILE_SIZE, TILE_SIZE);
  } else {
    const c = FALLBACK_COLORS[tileType] || [80, 80, 80];
    fill(c[0], c[1], c[2]);
    rect(x, y, TILE_SIZE, TILE_SIZE);
  }
}

// ====== 按键状态管理 ======
let keys = {};
let pressedKeys = new Set(); // 使用 Set 跟踪当前按下的键

// A/D 同时按下时「谁后按谁生效」（滚键切换时常见一帧两键同按）
let lastHorizPhysDownMs = { a: 0, d: 0 };
// W/S 同上（爬梯 / 水中上浮与下潜）
let lastVertPhysDownMs = { w: 0, s: 0 };

// 与浏览器真实按键对齐：仅 WASD。
// p5.js 2.x 内部用 KeyboardEvent.code（如 KeyW）登记 _downKeyCodes，不能用旧版数字 keyCode。
const MOVEMENT_KEY_P5_INPUT = {
  a: 'KeyA',
  d: 'KeyD',
  s: 'KeyS',
  w: 'KeyW'
};

function movementKeyPhysicallyDown(k) {
  const p5Input = MOVEMENT_KEY_P5_INPUT[k];
  if (!p5Input) return false;
  try {
    return typeof keyIsDown === 'function' && keyIsDown(p5Input);
  } catch {
    return false;
  }
}

/** 水平移动以 p5 物理键为准，不依赖 keys[]（避免与 keyPressed / 同步差一帧导致顿挫） */
function readHorizontalMoveIntent() {
  const physA = movementKeyPhysicallyDown('a');
  const physD = movementKeyPhysicallyDown('d');
  if (physA !== physD) return physA ? -1 : 1;
  if (physA && physD) {
    return lastHorizPhysDownMs.a >= lastHorizPhysDownMs.d ? -1 : 1;
  }
  return 0;
}

/** 垂直方向（爬梯 W/S、水中上浮/下潜）读物理键；W+S 同按时后按者优先 */
function readVerticalMoveIntent() {
  const physW = movementKeyPhysicallyDown('w');
  const physS = movementKeyPhysicallyDown('s');
  let up = false;
  let down = false;
  if (physW && physS) {
    if (lastVertPhysDownMs.w >= lastVertPhysDownMs.s) {
      up = true;
      down = false;
    } else {
      up = false;
      down = true;
    }
  } else {
    up = physW;
    down = physS;
  }
  return { up, down };
}

// ====== Game 类 ======
let game;

class Game {
  constructor(levelType = "forest") {
    this.levelType = levelType; // 'forest' | 'water' | 'factory'
    this.level =
      levelType === "water" ? new WaterLevel() :
      levelType === "factory" ? new FactoryLevel() :
      new ForestLevel();
    this.level.loadAssets();
    //this.player = new Player(80, 60); 
    this.uiManager = new UIManager();
    this.cameraX = 0;
    this.mouseDownTime = 0;
    this.lastAttackTime = 0;
    this.enemyContactDamageCarry = 0;  // 敌人接触伤害累计（满 1 点才真正扣血）
    this.enemyContactLastTick = 0;     // 上次结算接触伤害的时间戳
    this.spikeContactDamageCarry = 0;  // 尖刺接触伤害累计（满 1 点才真正扣血）
    this.victoryAt = 0;
    this.showGuideMenu = false;
    this.activeGuideTab = 0;
    // 游戏状态：start playing gameover victory
    this.state = "start";

    this.settings = {
    musicVolume: 80,
    sfxVolume: 80,
    fullscreen: false,
    language: DEFAULT_LANGUAGE,
    // Persistent trophy progress shown on level select.
    // Values are 0..TROPHY_SLOTS_BY_LEVEL[levelType]
    levelTrophies: { forest: 0, water: 0, factory: 0 }
};

    // --- 新增：统一的得分反馈提示（污染物/救援共用） ---
    this.scoreToastMessage = null;   // 当前显示的得分提示文案
    this.scoreToastUntil = 0;        // 提示显示截止时间戳（millis）
    this.toolHintMessage = null;     // 工具使用结果提示（背包上方居中）
    this.toolHintUntil = 0;          // 工具提示显示截止时间戳（millis）

    this.tutorialHintMessage = null;
    this.tutorialHintUntil = 0;
    this.triggeredTutorialHints = new Set();
    this.bucketPourAnim = null;      // 水桶动画
    this.healEffectUntil = 0;        // 恢复动画
    this.maxPlayerProgress = 0;      // 本局已到达的最远进度（用于背包上的进度猫）
    this.displayedCatProgress = 0;   // HUD 中小猫当前显示的进度（带一点缓动）
    this.playerBottomCenterTrace = [];
    this.followCatFacingRight = true;
    this.lastFollowCatX = null;

    // 状态进入音效（避免 draw 每帧重复播放）
    this._playedWinSfx = false;
    this._playedLostSfx = false;
    this._spikeSfxActive = false;
  }

  getTrophySlotLimit() {
    return TROPHY_SLOTS_BY_LEVEL[this.levelType] ?? MAX_TROPHY_SLOTS;
  }

  addScore(points = 1) {
    if (!this.player) return;
    const prev = this.player.score;
    const next = this.player.score + points;
    this.player.score = Math.min(this.getTrophySlotLimit(), next);
    if (this.player.score > prev) {
      tryPlaySfx('trophy', { volume: 0.34, rate: 1 });
    }
  }

  recordLevelTrophies() {
    if (!this.settings) return;
    if (!this.settings.levelTrophies) {
      this.settings.levelTrophies = { forest: 0, water: 0, factory: 0 };
    }
    const slots = this.getTrophySlotLimit();
    const earned = Math.min(Math.max(0, Math.floor(this.player?.score ?? 0)), slots);
    const prev = Math.min(Math.max(0, Math.floor(this.settings.levelTrophies[this.levelType] ?? 0)), slots);
    this.settings.levelTrophies[this.levelType] = Math.max(prev, earned);
  }
  
  tryAttack() {
    const now = millis();
    // 1. 检查攻击冷却
    if (now - this.lastAttackTime < ATTACK_COOLDOWN_MS) return;
  
    if (this.player && typeof this.player.startAttackAnimation === "function") {
      this.player.startAttackAnimation();
    }

    // 2. 攻击力保底
    let dmg = 2; 
    if (typeof this.getAttackDamage === "function") {
      let calcDmg = this.getAttackDamage();
      if (calcDmg > 0) dmg = calcDmg;
    }

    let closest = null;
    
    let scanRange = PLAYER_MELEE_ATTACK_RANGE;
    let closestDist = scanRange + 1;

    // 4. 遍历并寻找最近的敌人
    if (this.level && this.level.enemies) {
      const playerBox = this.player.getCollisionBox();
      const playerCenterX = playerBox.x + playerBox.w / 2;
      for (const enemy of this.level.enemies) {
        if (enemy.isDead) continue;
        const enemyBox = enemy.getCollisionBox();
        const enemyCenterX = enemyBox.x + enemyBox.w / 2;
        const enemyIsInFront = this.player.facingRight
          ? enemyCenterX >= playerCenterX
          : enemyCenterX <= playerCenterX;
        if (!enemyIsInFront) continue;
        
        const d = this.distanceToEnemyBoxGap(enemy);
        
        if (d <= scanRange && d < closestDist) {
          closestDist = d;
          closest = enemy;
        }
      }
    }

    // 5. 应用伤害（传入玩家用于击退方向）
    if (closest) {
      closest.takeDamage(dmg, this.level, this.player);
      this.lastAttackTime = now;
      tryPlaySfx('hit', { volume: 0.35, rate: 1 });
      console.log("💥 击中目标！伤害:", dmg, "距离:", closestDist.toFixed(1));
    } else {
      console.log("☁️ 攻击挥空：附近没有敌人");
    }
  }

  setup() { 
    if (this.level instanceof WaterLevel) {
      const spawnCol = 2;
      const spawnSurfaceY = this.level.getSolidSurfaceY(spawnCol);
      const fallbackY = this.level.terrainHeights[0];
      const startY = (spawnSurfaceY !== null ? spawnSurfaceY : fallbackY) - 64;
      this.player = new Player(80, startY);
    } else {
      const groundY = this.level.terrainHeights[0];
      this.player = new Player(80, groundY - 64);
    }
    this.playerBottomCenterTrace = [];
    this.followCatFacingRight = true;
    this.lastFollowCatX = null;
   }

  recordPlayerBottomCenter(now) {
    if (!this.player || typeof this.player.getCollisionBox !== 'function') return;
    const box = this.player.getCollisionBox();
    this.playerBottomCenterTrace.push({
      t: now,
      x: box.x + box.w / 2,
      y: box.y + box.h
    });

    while (
      this.playerBottomCenterTrace.length > 0 &&
      now - this.playerBottomCenterTrace[0].t > PLAYER_FOLLOW_CAT_TRACE_WINDOW_MS
    ) {
      this.playerBottomCenterTrace.shift();
    }
  }

  getDelayedPlayerBottomCenter(now) {
    if (this.playerBottomCenterTrace.length === 0) return null;
    const targetTime = now - PLAYER_FOLLOW_CAT_DELAY_MS;
    let delayed = this.playerBottomCenterTrace[0];
    for (let i = this.playerBottomCenterTrace.length - 1; i >= 0; i--) {
      if (this.playerBottomCenterTrace[i].t <= targetTime) {
        delayed = this.playerBottomCenterTrace[i];
        break;
      }
    }
    return delayed;
  }

  drawFollowCat(now) {
    const img = window.followPlayerCat;
    if (!(img && img.width > 0 && img.height > 0)) return;
    const delayed = this.getDelayedPlayerBottomCenter(now);
    if (!delayed) return;
    if (this.lastFollowCatX !== null) {
      const dx = delayed.x - this.lastFollowCatX;
      if (dx < -0.01) this.followCatFacingRight = false;
      else if (dx > 0.01) this.followCatFacingRight = true;
    }
    this.lastFollowCatX = delayed.x;

    push();
    imageMode(CENTER);
    translate(delayed.x, delayed.y - PLAYER_FOLLOW_CAT_H / 2);
    scale(this.followCatFacingRight ? 1 : -1, 1);
    image(img, 0, 0, PLAYER_FOLLOW_CAT_W, PLAYER_FOLLOW_CAT_H);
    pop();
  }

drawBucketPourAnim(now) {
  if (!this.bucketPourAnim) return;

  const a = this.bucketPourAnim;
  const progress = constrain((now - a.start) / a.duration, 0, 1);

  if (progress >= 1) {
    if (!a.converted && Array.isArray(a.lavaTilesToConvert)) {
      for (const tile of a.lavaTilesToConvert) {
        const column = this.level.tileMap[tile.col];
        if (column && column[tile.row] === T.LAVA) {
          column[tile.row] = T.STONE;
        }
      }
      a.converted = true;
    }

    this.bucketPourAnim = null;
    return;
  }

  const bucketImg = window.tool_enlarged_water_bucket;
  const waterImg = window.effect_water_stream;

  const rotateEnd = 0.25;
  const waterStart = 0.18;
  const rotateProgress = constrain(progress / rotateEnd, 0, 1);

  const fadeStart = 0.8;
  const fadeProgress = constrain((progress - fadeStart) / (1 - fadeStart), 0, 1);
  const alpha = 255 * (1 - fadeProgress);

  const bucketAngle = lerp(-PI / 8, PI / 2.3, rotateProgress);
  const bucketBobY = sin(rotateProgress * PI) * -5;

  push();
  tint(255, alpha);

  // 水桶：先旋转到倾倒角度，然后保持倾倒状态直到淡出
  if (bucketImg && bucketImg.width > 0) {
    push();
    imageMode(CENTER);
    translate(a.x, a.y + bucketBobY);
    rotate(bucketAngle);
    image(bucketImg, 0, 0, 32, 32);
    pop();
  }

  // 水柱：水桶旋转完毕后，完整水流直接出现，不做向下延伸
  if (progress >= waterStart && waterImg && waterImg.width > 0) {
    push();
    imageMode(CENTER);
    translate(a.x + 10, a.y + 44);
    image(waterImg, 0, 0, 68, 68);
    pop();
  }

  noTint();
  pop();
}

  showHealEffect(durationMs = 700) {
  this.healEffectUntil = millis() + durationMs;
}

//恢复特效
drawHealEffect(now) {
  if (!this.player || now > this.healEffectUntil) return;

  const img = window.effect_heal;
  const box = this.player.getCollisionBox();

  const duration = 700;
  const progress = constrain(1 - (this.healEffectUntil - now) / duration, 0, 1);
  const alpha = 255 * (1 - progress);
  const bobY = sin(progress * PI) * -6;

  push();
  imageMode(CENTER);
  tint(255, alpha);

  const x = box.x + box.w / 2;
  const y = box.y - 18 + bobY;

  if (img && img.width > 0) {
    image(img, x, y, 24, 24);
  }

  noTint();
  pop();
}

  resetGameToState(state) {
    game = createGameWithSameSettings(this.levelType, this.settings);
    game.setup();
    game.state = state;
    game.showGuideMenu = false;
    game.activeGuideTab = 0;
    game.resetHintState();
  }

  resetToStartScreen() {
    this.state = "start";
    this.showGuideMenu = false;
    this.activeGuideTab = 0;
    this._playedWinSfx = false;
    this._playedLostSfx = false;
    if (this._spikeSfxActive) { this._spikeSfxActive = false; sfxRelease('spike'); }
  }

  resetToPlayingFromBeginning() {
    game = createGameWithSameSettings(this.levelType, this.settings);
    game.setup();
    game.state = "playing";
  }

  beginPlaying() {
    this.state = "playing";
    this.showGuideMenu = false;
    this.activeGuideTab = 0;
    this.maxPlayerProgress = 0;
    this.displayedCatProgress = 0;
    this.resetHintState();
    this._playedWinSfx = false;
    this._playedLostSfx = false;
    if (this._spikeSfxActive) { this._spikeSfxActive = false; sfxRelease('spike'); }
  }

  resetHintState() {
    this.victoryAt = 0;
    // 重置得分反馈提示状态（避免关卡切换残留文案）
    this.scoreToastMessage = null;
    this.scoreToastUntil = 0;
    this.toolHintMessage = null;
    this.toolHintUntil = 0;

    this.tutorialHintMessage = null;
    this.tutorialHintUntil = 0;
    this.triggeredTutorialHints = new Set();
}

  update() {
    this.player.update(this.level.platforms, this.level);
    if (typeof this.level.updateFactoryMechanisms === 'function') {
      this.level.updateFactoryMechanisms(this.player);
    }
    this.updateDolphinMagnet();
    this.recordPlayerBottomCenter(millis());
    this.updateCamera();
    this.checkTutorialHintZones();  //实现区域触发

    const playerCenterX = this.player.x + this.player.w / 2;
    const playerProgress = constrain(playerCenterX / WORLD_WIDTH, 0, 1);
    this.maxPlayerProgress = Math.max(this.maxPlayerProgress, playerProgress);
    this.displayedCatProgress = lerp(this.displayedCatProgress, this.maxPlayerProgress, 0.12);
    if (Math.abs(this.maxPlayerProgress - this.displayedCatProgress) < 0.001) {
      this.displayedCatProgress = this.maxPlayerProgress;
    }
    
    // 更新所有敌人（追踪玩家）
    for (const enemy of this.level.enemies) {
      if (!enemy.isDead && typeof enemy.update === "function") {
        enemy.update(this.player, this.level.platforms, this.level);
      }
    }
    this.resolveEnemyPlayerOverlap();
    
    // 更新所有带 update 方法的物体（比如 TNT）
    const now = millis();
    for (const item of this.level.items) {
      if (item instanceof TNT) {
        item.update(now, this.player, this.level.platforms, this.level);
      } else if (item instanceof Ladder) {
        // 梯子是放置物，不受重力影响
        continue;
        } else if (item instanceof Item || item instanceof Animal || item instanceof Dolphin) {
          item.update(this.level.platforms, this.level);
        }
    }
    this.checkCollisions();
    this.updateSpikeProximitySfx();
    this.updateMining();
    this.updateLavaSfx();

    // 全局坠落死亡：玩家碰撞箱上缘超过屏幕下缘则死亡
    const playerBox = this.player.getCollisionBox();
    if (playerBox.y > CANVAS_H) {
      this.player.health = 0;
    }

    // ===== 岩浆 / 酸池伤害判定：玩家碰撞箱底部接触岩浆/酸就立即死亡 =====
    // 使用玩家贴图位置而不是碰撞箱检测岩浆
    const pxCenter = this.player.x + this.player.w / 2;
    const colUnder = Math.floor(pxCenter / TILE_SIZE);
    const feetY = this.player.y + this.player.h;  // 玩家贴图底部的屏幕 Y

    if (colUnder >= 0 && colUnder < TERRAIN_COLS) {
      // 减去1像素以正确处理踩在格子上边界的情况
      const rowUnder = Math.floor((360 - feetY - 1) / TILE_SIZE);
      if (rowUnder >= 0) {
        const column = this.level.tileMap[colUnder];
        const tt = column?.[rowUnder];
        if (tt === T.LAVA || tt === T.ACID) {
          this.player.health = 0;
        }
      }
    }

    if (this.player.health <= 0) {
      this.recordLevelTrophies();
      this.state = "gameover";
      this.showGuideMenu = false;
      this.victoryAt = 0;
      if (!this._playedLostSfx) {
        this._playedLostSfx = true;
        tryPlaySfx('lost', { volume: 0.42, rate: 1 });
      }
      return;
    }
    
    // 胜利条件：到达最后一列（TERRAIN_COLS - 1）且生命值 > 0
    const playerCol = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
    if (playerCol >= TERRAIN_COLS - 1 && this.player.health > 0) {
      if (!this.victoryAt) this.victoryAt = millis() + VICTORY_DELAY_MS;
      if (millis() >= this.victoryAt) {
        this.recordLevelTrophies();
        this.state = "victory";
        this.showGuideMenu = false;
        if (!this._playedWinSfx) {
          this._playedWinSfx = true;
          tryPlaySfx('win', { volume: 0.42, rate: 1 });
        }
      }
    } else {
      this.victoryAt = 0;
    }
  }

  updateSpikeProximitySfx() {
    if (!this.player || !this.level || typeof this.level.getActiveSpikeZones !== 'function') {
      if (this._spikeSfxActive) { this._spikeSfxActive = false; sfxRelease('spike'); }
      return;
    }
    const playerBox = this.player.getCollisionBox();
    const zones = this.level.getActiveSpikeZones();
    const range = TILE_SIZE; // 1 格以内
    const nearSpike = zones.some((z) =>
      rectCollision(
        playerBox.x, playerBox.y, playerBox.w, playerBox.h,
        z.x - range, z.y - range, z.w + range * 2, z.h + range * 2
      )
    );

    if (nearSpike) {
      if (!this._spikeSfxActive) { this._spikeSfxActive = true; sfxAcquire('spike'); }
      tryPlaySfx('spike', { volume: 0.30, rate: 1 });
      return;
    }
    if (this._spikeSfxActive) { this._spikeSfxActive = false; sfxRelease('spike'); }
  }

  updateLavaSfx() {
    if (!this.player || !this.level || typeof this.level.getTileAtWorld !== 'function') return;
    const box = this.player.getCollisionBox();
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const probe = [
      { x: cx, y: cy },
      { x: cx + TILE_SIZE, y: cy },
      { x: cx - TILE_SIZE, y: cy },
      { x: cx, y: cy + TILE_SIZE },
      { x: cx, y: cy - TILE_SIZE }
    ];
    const nearLava = probe.some((p) => this.level.getTileAtWorld(p.x, p.y) === T.LAVA);
    if (nearLava) {
      tryPlaySfx('lava', { volume: 0.22, rate: 1 });
    }
  }

  /** 获取玩家脚下所在的地形行（列 col 的表面起算） */
  getPlayerTerrainRow(col) {
    const surfaceY = this.level.terrainHeights[col];
    if (surfaceY === undefined) return -1;
    const feetY = this.player.y + this.player.h;
    const row = Math.floor((feetY - surfaceY) / TILE_SIZE);
    return row;
  }

  /** 统一触及范围：身前2格、身后2格、头顶1格、脚下1格（世界坐标矩形） */
  getReachZone() {
    const box = this.player.getCollisionBox();
    const px = box.x, py = box.y, pw = box.w, ph = box.h;
    return {
      left: px - TILE_SIZE,
      right: px + pw + TILE_SIZE,
      top: py - TILE_SIZE,
      bottom: py + ph + TILE_SIZE
    };
  }

  /** 矩形 (x,y,w,h) 是否与触及范围相交 */
  isInReachZone(x, y, w, h) {
    const z = this.getReachZone();
    return rectCollision(x, y, w, h, z.left, z.top, z.right - z.left, z.bottom - z.top);
  }

  /** 获取处于触及范围内的所有地形格 (col, row) */
  getMineableTiles() {
    const z = this.getReachZone();
    const out = [];
    const colMin = Math.max(0, Math.floor(z.left / TILE_SIZE));
    const colMax = Math.min(TERRAIN_COLS - 1, Math.floor((z.right - 1) / TILE_SIZE));
    for (let col = colMin; col <= colMax; col++) {
      const surfaceY = this.level.terrainHeights[col];
      if (surfaceY === undefined) continue;
      const rowMin = Math.max(0, Math.floor((z.top - surfaceY) / TILE_SIZE));
      const rowMax = Math.floor((z.bottom - 1 - surfaceY) / TILE_SIZE);
      for (let row = rowMin; row <= rowMax; row++) {
        if (!this.level.terrainBlocks[col]?.[row]) continue;
        out.push({ col, row });
      }
    }
    return out;
  }

  /** 世界坐标 (wx, wy) 是否在格子 (col, row) 内 */
  isPointInTerrainTile(wx, wy, col, row) {
    const tx = col * TILE_SIZE;
    // 与 draw() 中地形绘制保持一致：从屏幕底部往上排布
    const ty = 360 - (row + 1) * TILE_SIZE;
    return wx >= tx && wx < tx + TILE_SIZE && wy >= ty && wy < ty + TILE_SIZE;
  }

  updateMining() {
    const miningPressed = mouseIsPressed;
    if (!miningPressed) {
      this.mouseDownTime = 0;
      return;
    }
    const now = millis();
    if (this.mouseDownTime === 0) this.mouseDownTime = now;
    if (now - this.mouseDownTime < MINE_PRESS_MS) return;

    const worldX = mouseX + this.cameraX;
    const worldY = mouseY;
    const pointedTile = this.getPointedMineableTile(worldX, worldY);
    if (pointedTile) {
      if (pointedTile.kind === 'terrain') {
        const digKey = tileTypeToDigSfxKey(pointedTile.tileType);
        this.level.removeTerrainBlock(pointedTile.col, pointedTile.row);
        this.tryWeaponUpgrade(pointedTile.tileType);
        tryPlaySfx(digKey, { volume: 0.30, rate: 1 });
      } else if (pointedTile.kind === 'background') {
        this.level.removeBackgroundDecorationBlock(pointedTile.col, pointedTile.row);
      }
      this.mouseDownTime = 0;
      return;
    }
    // 浮空平台：鼠标指向的格子在触及范围内则可挖
    for (let i = this.level.platforms.length - 1; i >= 0; i--) {
      const p = this.level.platforms[i];
      if (!p._floating) continue;
      if (worldX < p.x || worldX >= p.x + p.w || worldY < p.y || worldY >= p.y + p.h) continue;
      if (!this.isInReachZone(p.x, p.y, p.w, p.h)) continue;
      const tileType = p._tileType;
      if (isAnyPipeTileType(tileType)) continue;
      this.level.platforms.splice(i, 1);
      this.tryWeaponUpgrade(tileType);
      tryPlaySfx(tileTypeToDigSfxKey(tileType), { volume: 0.30, rate: 1 });
      this.mouseDownTime = 0;
      return;
    }
  }

  updateCamera() {
    const halfW = CANVAS_W / 2;
    if (this.player.x < halfW) this.cameraX = 0;
    else if (this.player.x > WORLD_WIDTH - halfW) this.cameraX = WORLD_WIDTH - CANVAS_W;
    else this.cameraX = this.player.x - halfW;
  }

  /** 玩家当前攻击力：手持武器的伤害，无武器为 1 */
  getAttackDamage() {
    const w = this.player.equippedWeaponType;
    return (WEAPON_CONFIG[w] && WEAPON_CONFIG[w].damage) || 1;
  }

  /**d 挖掘到矿石时若对应武器更高级则升级手持武器 */
  tryWeaponUpgrade(tileType) {
    const weapon = ORE_TO_WEAPON[tileType];
    if (!weapon) return;
    const currentTier = WEAPON_TIER[this.player.equippedWeaponType] || 0;
    const newTier = WEAPON_TIER[weapon] || 0;
    if (newTier > currentTier) this.player.equippedWeaponType = weapon;
  }

  hasTool(toolType) {
    return this.player.inventory.some(
      it => it instanceof Tool && it.toolType === toolType
    );
  }

  consumeTool(toolType) {
    const idx = this.player.inventory.findIndex(
      it => it instanceof Tool && it.toolType === toolType
    );
    if (idx !== -1) this.player.inventory.splice(idx, 1);
  }

  consumeSelectedTool(toolType) {
    const s = this.player.selectedSlot;
    if (s < 0 || s >= this.player.inventory.length) return false;
    const item = this.player.inventory[s];
    if (!(item instanceof Tool) || item.toolType !== toolType) return false;
    this.player.inventory.splice(s, 1);
    this.player.selectedSlot = -1;
    return true;
  }

  getHpHealAmount(hpType) {
    if (hpType === 'apple') return 1;  //第一关恢复道具
    if (hpType === 'golden_apple') return 3;  //第一关恢复道具，强化版
    if (hpType === 'seashell') return 1; // 第二关恢复道具
    if (hpType === 'potion_bottle') return 1;      // 第三关恢复道具
    return 0;
  }

  handleSelectedToolUse(slotIndex, item) {
    switch (item.toolType) {
      case 'scissor':
        return this.tryInteractAnimalWithTool(slotIndex, item.toolType);
      case 'wrench':
        return this.tryBreakIronBarWithWrench(slotIndex);
      case 'enlarged_water_bucket':
        return this.tryUseWaterBucket();
      case 'limestone':
        return this.tryUseLimestone();
      case 'vine_seed':
        return this.tryPlantVineSeed(slotIndex);
      default:
        return false;
    }
  }

  showToolHint(message, durationMs = 1200) {
    this.toolHintMessage = message;
    this.toolHintUntil = millis() + durationMs;
  }

  tryInteractAnimalWithTool(slotIndex, toolType) {
    if (toolType === 'scissor') return this.tryRescueAnimalWithScissor(slotIndex);
    return false;
  }

  findNearestRescuableAnimal(rescueRange, toolType = 'scissor') {
    let nearest = null;
    let bestDist = Infinity;
    for (const item of this.level.items) {
      if (!(item instanceof Animal)) continue;
      if (typeof item.canRescueWithTool !== 'function' || !item.canRescueWithTool(toolType)) continue;
      const d = this.distanceToItem(item);
      const needRange = typeof item.requiresRescueRange === 'function' ? item.requiresRescueRange(toolType) : true;
      if ((needRange && d > rescueRange) || d >= bestDist) continue;
      bestDist = d;
      nearest = item;
    }
    return nearest;
  }

  rescueAnimalWithScissor(animal, slotIndex) {
    if (typeof animal.onRescued !== 'function' || !animal.onRescued(this, 'scissor')) return false;
    this.player.inventory.splice(slotIndex, 1);
    this.player.selectedSlot = -1;
    this.grantWildlifeRescueReward(animal);
    return true;
  }

  tryRescueAnimalWithScissor(slotIndex) {
    const rescueRange = TILE_SIZE * 1.45;
    const animal = this.findNearestRescuableAnimal(rescueRange, 'scissor');
    if (!animal) return false;
    return this.rescueAnimalWithScissor(animal, slotIndex);
  }

  grantWildlifeRescueReward(animal) {
    if (!animal || animal.rescueAwarded) return false;
    animal.rescueAwarded = true;
    this.addScore(1);
    this.scoreToastMessage = t("Wildlife rescued! +1", "成功救援野生动物！+1");
    this.scoreToastUntil = millis() + 1800;
    return true;
  }

  getNearestTreeCrownTarget(bird) {
    const trees = this.level.getTreeInfos();
    if (!trees.length) return { x: bird.x + TILE_SIZE, y: Math.max(24, bird.y - TILE_SIZE) };
    const birdCx = bird.x + bird.w / 2;
    let nearest = trees[0];
    let best = Math.abs(nearest.trunkX - birdCx);
    for (let i = 1; i < trees.length; i++) {
      const d = Math.abs(trees[i].trunkX - birdCx);
      if (d < best) {
        best = d;
        nearest = trees[i];
      }
    }
    const pool = nearest.upperCrown.length ? nearest.upperCrown : nearest.crown;
    const trunkColCenter = nearest.trunkX / TILE_SIZE - 0.5;
    let pick = pool[0];
    let bestScore = Infinity;
    for (const p of pool) {
      const dx = Math.abs(p.col - trunkColCenter);
      const score = dx * 1000 - p.row;
      if (score < bestScore) {
        bestScore = score;
        pick = p;
      }
    }
    const targetX = pick.col * TILE_SIZE + (TILE_SIZE - 16) / 2;
    const tileTop = 360 - (pick.row + 1) * TILE_SIZE;
    const targetY = tileTop + TILE_SIZE * 0.25;
    return { x: targetX, y: targetY };
  }

  /** 玩家与敌人碰撞箱中心距离（保留给旧逻辑） */
  distanceToEnemy(enemy) {
    const box = this.player.getCollisionBox();
    const px = box.x + box.w / 2;
    const py = box.y + box.h / 2;
    const eBox = enemy.getCollisionBox();
    const ex = eBox.x + eBox.w / 2;
    const ey = eBox.y + eBox.h / 2;
    return Math.sqrt((px - ex) ** 2 + (py - ey) ** 2);
  }

  /** 玩家与敌人碰撞箱的最短距离（重叠时为 0） */
  distanceToEnemyBoxGap(enemy) {
    const a = this.player.getCollisionBox();
    const b = enemy.getCollisionBox();
    const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    return Math.hypot(dx, dy);
  }

  resolveEnemyPlayerOverlap() {
    if (!this.player || !this.level || !Array.isArray(this.level.enemies)) return;
    const playerBox = this.player.getCollisionBox();
    const allowedOverlap = 8;
    for (const enemy of this.level.enemies) {
      if (enemy.isDead) continue;
      // 通用玩家-敌人分离：避免敌人贴进玩家碰撞箱导致视觉重叠/卡位
      // 目前仅对需要“实体感”的敌人启用（包含飞行 Vex）
      const shouldSeparate =
        enemy instanceof Zombie ||
        enemy instanceof Drowned ||
        enemy instanceof Shark ||
        enemy instanceof Vex;
      if (!shouldSeparate) continue;
      const box = enemy.getCollisionBox();
      const overlapX = Math.min(playerBox.x + playerBox.w, box.x + box.w) - Math.max(playerBox.x, box.x);
      const overlapY = Math.min(playerBox.y + playerBox.h, box.y + box.h) - Math.max(playerBox.y, box.y);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const excessX = overlapX - allowedOverlap;
      const excessY = overlapY - allowedOverlap;
      if (excessX <= 0 && excessY <= 0) continue;

      const playerCx = playerBox.x + playerBox.w / 2;
      const playerCy = playerBox.y + playerBox.h / 2;
      const enemyCx = box.x + box.w / 2;
      const enemyCy = box.y + box.h / 2;

      // 分离策略：允许轻微穿透（allowedOverlap），超过后始终沿水平轴把敌人推出去
      if (excessX > 0) {
        const dirX = enemyCx >= playerCx ? 1 : -1;
        enemy.x += dirX * excessX;
      }
    }
  }

  distanceToItem(item) {
    const box = this.player.getCollisionBox();
    const px = box.x + box.w / 2;
    const py = box.y + box.h / 2;
    const ix = item.x + item.w / 2;
    const iy = item.y + item.h / 2;
    return Math.sqrt((px - ix) ** 2 + (py - iy) ** 2);
  }

  getPointedMineableTile(worldX, worldY) {
    const col = Math.floor(worldX / TILE_SIZE);
    if (col < 0 || col >= TERRAIN_COLS) return null;

    const column = this.level.tileMap[col];
    const bgColumn = this.level.treeColumns?.[col] || [];
    if ((!column || column.length === 0) && bgColumn.length === 0) return null;

    // 从上往下找：优先命中视觉上靠上的那一格
    let targetRow = -1;
    for (let row = column.length - 1; row >= 0; row--) {
      const tileType = column[row];
      if (tileType === T.NONE || tileType === undefined) continue;
      if (isAnyPipeTileType(tileType)) continue;

      const tx = col * TILE_SIZE;
      const ty = 360 - (row + 1) * TILE_SIZE;

      // 鼠标必须落在这格范围内
      if (!(worldX >= tx && worldX < tx + TILE_SIZE && worldY >= ty && worldY < ty + TILE_SIZE)) {
        continue;
      }

      // 同时该格必须在玩家触及范围内
      if (!this.isInReachZone(tx, ty, TILE_SIZE, TILE_SIZE)) continue;

      targetRow = row;
      break;
    }

    if (targetRow !== -1) {
      return { col, row: targetRow, kind: 'terrain', tileType: column[targetRow] };
    }

    // 地形未命中时，允许直接长按破坏背景装饰方块（treeColumns）
    for (let row = bgColumn.length - 1; row >= 0; row--) {
      const tileType = bgColumn[row];
      if (!this.level.isBackgroundDecorationTile(tileType)) continue;

      const tx = col * TILE_SIZE;
      const ty = 360 - (row + 1) * TILE_SIZE;
      if (!(worldX >= tx && worldX < tx + TILE_SIZE && worldY >= ty && worldY < ty + TILE_SIZE)) continue;
      if (!this.isInReachZone(tx, ty, TILE_SIZE, TILE_SIZE)) continue;

      return { col, row, kind: 'background', tileType };
    }
    return null;
  }

  playerHasScissor() {
    return this.player.inventory.some(item => item instanceof Tool && item.toolType === 'scissor');
  }

  canCollectItem() {
    return this.player.inventory.length < INVENTORY_SLOTS;
  }

  handleAnimalTouchInteraction(animal) {
    // 动物不走通用拾取逻辑，统一在此处理专属交互
    if (typeof animal.onPlayerTouch === 'function') return animal.onPlayerTouch(this);
    return false;
  }

handleMousePressed(mx, my) {
  const topRight = this.uiManager.getTopRightButtons();
  if (this.uiManager.isInsideRect(mx, my, topRight.exitRect)) {
    tryPlaySfx('click', { volume: 0.32, rate: 1 });
    this.state = "levelSelect";
    this.showGuideMenu = false;
    this.activeGuideTab = 0;
    return;
  }
  if (this.uiManager.isInsideRect(mx, my, topRight.menuRect)) {
    tryPlaySfx('click', { volume: 0.32, rate: 1 });
    this.showGuideMenu = !this.showGuideMenu;
    return;
  }

  if (this.showGuideMenu) {
    const tabs = this.uiManager.getGuideTabRects();
    for (let i = 0; i < tabs.length; i++) {
      if (this.uiManager.isInsideRect(mx, my, tabs[i])) {
        tryPlaySfx('click', { volume: 0.32, rate: 1 });
        this.activeGuideTab = i;
        return;
      }
    }
  }

  const slotIndex = this.getInventorySlotAt(mx, my);
  if (slotIndex === -1) return;
  tryPlaySfx('click', { volume: 0.32, rate: 1 });

  // 记录选中的格子
  this.player.selectedSlot = slotIndex;

  const item = this.player.inventory[slotIndex];
  if (!item) return;

  if (item instanceof Tool) {
    const used = this.handleSelectedToolUse(slotIndex, item);
    if (!used) {
      this.showToolHint(t("No  valid  target  nearby", "附近没有可交互目标"));
    }
  }
}

findNearestBreakableIronBar(breakRange) {
  let nearest = null;
  let bestDist = Infinity;
  for (const it of this.level.items) {
    if (!(it instanceof IronBar) || it.removed) continue;
    const d = this.distanceToItem(it);
    if (d > breakRange || d >= bestDist) continue;
    bestDist = d;
    nearest = it;
  }
  return nearest;
}

getAdjacentIronBarGroup(seedBar) {
  const bars = this.level.items.filter(it => it instanceof IronBar && !it.removed);
  const visited = new Set();
  const queue = [seedBar];
  const group = [];
  const isAdjacent = (a, b) => {
    const ax2 = a.x + a.w, ay2 = a.y + a.h;
    const bx2 = b.x + b.w, by2 = b.y + b.h;
    const touchX = Math.abs(ax2 - b.x) <= 0.1 || Math.abs(bx2 - a.x) <= 0.1;
    const overlapY = Math.max(a.y, b.y) <= Math.min(ay2, by2);
    const touchY = Math.abs(ay2 - b.y) <= 0.1 || Math.abs(by2 - a.y) <= 0.1;
    const overlapX = Math.max(a.x, b.x) <= Math.min(ax2, bx2);
    return (touchX && overlapY) || (touchY && overlapX);
  };

  while (queue.length) {
    const bar = queue.shift();
    if (!bar || visited.has(bar)) continue;
    visited.add(bar);
    group.push(bar);
    for (const other of bars) {
      if (visited.has(other) || other === bar) continue;
      if (isAdjacent(bar, other)) queue.push(other);
    }
  }
  return group;
}

tryBreakIronBarWithWrench(slotIndex) {
  const breakRange = TILE_SIZE * 1.45;
  const nearest = this.findNearestBreakableIronBar(breakRange);
  if (!nearest) return false;

  const barGroup = this.getAdjacentIronBarGroup(nearest);
  if (!barGroup.length) return false;

  const linkedTurtles = new Set();
  for (const bar of barGroup) {
    if (bar.linkedTurtle) linkedTurtles.add(bar.linkedTurtle);
  }
  for (const bar of barGroup) bar.removeByWrench();
  for (const turtle of linkedTurtles) {
    if (!(turtle instanceof Turtle)) continue;
    if (turtle.state === 'ascending' || turtle.state === 'patrol') {
      this.grantWildlifeRescueReward(turtle);
    }
  }
  this.player.inventory.splice(slotIndex, 1);
  this.player.selectedSlot = -1;
  return true;
}

getInventorySlotAt(mx, my) {
  // 复用你们 UIManager.drawHUD 里背包的计算方式
  const invX = (width - INV_BAR_W) / 2;
  const invY = height - INV_BAR_H;

  // 点击区域只算背包内部 6 个格子
  const y0 = invY + INV_PADDING;
  const y1 = y0 + SLOT_SIZE;
  if (my < y0 || my > y1) return -1;

  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    const x0 = invX + INV_PADDING + i * (SLOT_SIZE + SLOT_GAP);
    const x1 = x0 + SLOT_SIZE;
    if (mx >= x0 && mx <= x1) return i;
  }
  return -1;
}

tryUseWaterBucket() {
  // 玩家碰撞箱中心点列索引（用于确定最近的岩浆列）
  const box = this.player.getCollisionBox();
  const wx = box.x + box.w / 2;
  const playerCol = Math.floor(wx / TILE_SIZE);

  // 在玩家左右各 3 列范围内，寻找“最近的”一格岩浆
  let targetCol = -1;
  let targetRow = -1;
  let bestDist = Infinity;

  for (let col = playerCol - 3; col <= playerCol + 3; col++) {
    if (col < 0 || col >= TERRAIN_COLS) continue;
    const column = this.level.tileMap[col];
    if (!column) continue;

    for (let r = 0; r < column.length; r++) {
      if (column[r] !== T.LAVA) continue;
      const d = Math.abs(col - playerCol);
      if (d < bestDist) {
        bestDist = d;
        targetCol = col;
        targetRow = r;
      }
    }
  }

  // 附近没有岩浆就不消耗水桶
  if (targetCol === -1) return false;

let lavaTilesToConvert = [];

const collectLine = (startCol, row, dir) => {
  let col = startCol;
    while (col >= 0 && col < TERRAIN_COLS) {
      const column = this.level.tileMap[col];
      if (!column || column[row] !== T.LAVA) break;

      lavaTilesToConvert.push({ col, row });
      col += dir;
    }
};

collectLine(targetCol, targetRow, -1);
collectLine(targetCol + 1, targetRow, 1);

let changed = lavaTilesToConvert.length;

if (changed > 0) {
  // 第一关才播放水桶倾倒动画
  if (this.level instanceof ForestLevel) {
    const lavaX = targetCol * TILE_SIZE;
    const lavaY = 360 - (targetRow + 1) * TILE_SIZE;

    this.bucketPourAnim = {
      start: millis(),
      duration: 1500,
      x: lavaX + TILE_SIZE * 0.75,
      y: lavaY - TILE_SIZE * 2,
      lavaTilesToConvert,
      converted: false
    };
    tryPlaySfx('pour', { volume: 0.34, rate: 1 });
  }
  if (!this.triggeredTutorialHints.has('forest_water_lava_reaction_done')) {
    this.tutorialHintMessage = t(
      'Great!  Water  and  fire  reacted  chemically.  You  can  pass  now.',
      '太棒了！水火发生化学反应，可以正常通行了'
    );
    this.tutorialHintUntil = millis() + 5000;
    this.triggeredTutorialHints.add('forest_water_lava_reaction_done');
  }
  this.consumeSelectedTool('enlarged_water_bucket');
  return true;
}

return false;
}

tryUseLimestone() {
  // 参照第一关水桶处理岩浆的逻辑：先找最近酸液格，再沿行扩展处理整段酸池
  const box = this.player.getCollisionBox();
  const wx = box.x + box.w / 2;
  const playerCol = Math.floor(wx / TILE_SIZE);

  // 在玩家左右各 3 列范围内，寻找“最近的”一格酸液
  let targetCol = -1;
  let targetRow = -1;
  let bestDist = Infinity;

  for (let col = playerCol - 3; col <= playerCol + 3; col++) {
    if (col < 0 || col >= TERRAIN_COLS) continue;
    const column = this.level.tileMap[col];
    if (!column) continue;
    for (let r = 0; r < column.length; r++) {
      if (column[r] !== T.ACID) continue;
      const d = Math.abs(col - playerCol);
      if (d < bestDist) {
        bestDist = d;
        targetCol = col;
        targetRow = r;
      }
    }
  }

  // 附近没有酸液就不消耗石灰石
  if (targetCol === -1) return false;

  let changed = 0;

  // 从命中的那一格出发，向左右扩展，把同一行连续的一整片酸液全部变为水
  const convertLine = (startCol, row, dir) => {
    let col = startCol;
    while (col >= 0 && col < TERRAIN_COLS) {
      const column = this.level.tileMap[col];
      if (!column || column[row] !== T.ACID) break;
      column[row] = T.WATER;
      changed++;
      col += dir;
    }
  };

  // 同时处理目标行上下相邻一行，兼容更厚的酸池
  const rowsToTry = [targetRow - 1, targetRow, targetRow + 1];
  for (const row of rowsToTry) {
    if (row < 0) continue;
    convertLine(targetCol, row, -1);
    convertLine(targetCol + 1, row, 1);
  }

  if (changed > 0) {
    this.consumeSelectedTool('limestone');
    // 第三关：成功中和一次酸液，点亮 1 个 trophy
    if (this.level instanceof FactoryLevel) {
      this.addScore(1);
    }
    return true;
  }
  return false;
}

tryPlantVineSeed(slotIndex) {
  if (!(this.level instanceof ForestLevel)) {
    return false;
  }

  const box = this.player.getCollisionBox();
  const playerFeetX = this.player.x + this.player.w / 2;
  const playerCol = Math.floor(playerFeetX / TILE_SIZE);

  const ladderH = TILE_SIZE * 4;
  const ladderX = playerCol * TILE_SIZE;
  const ladderY = this.player.y + this.player.h - ladderH;

  // 已有梯子，禁止重复生成
  const overlap = this.level.items.some(it =>
    it instanceof Ladder &&
    Math.abs(it.x - ladderX) < TILE_SIZE &&
    Math.abs(it.y - ladderY) < TILE_SIZE
  );
  if (overlap) {
    return false;
  }

  // 检查梯子所在这一列，是否有实体方块挡住梯子生长空间
  const column = this.level.tileMap[playerCol] || [];
  for (let row = 0; row < column.length; row++) {
    const tileType = column[row];
    if (typeof tileType !== "number") continue;

    const tileTop = 360 - (row + 1) * TILE_SIZE;
    const tileBottom = tileTop + TILE_SIZE;

  const playerFeetY = this.player.y + this.player.h;

  // 忽略脚下及以下的方块（允许从地面长出来）
  if (tileBottom <= playerFeetY) continue;

  const intersects = ladderY < tileBottom && ladderY + ladderH > tileTop;
  if (intersects) {
    return false;
  }
  }

  // 成功生成后才消耗种子
  this.level.items.push(new Ladder(ladderX, ladderY, ladderH));
  this.player.inventory.splice(slotIndex, 1);
  this.player.selectedSlot = -1;

  return true;
}

updateDolphinMagnet() {
  if (!(this.level instanceof WaterLevel)) return;
  if (!this.player?.hasDolphinMagnet) return;

  const dolphin = this.player.activeDolphin;

  if (!dolphin || dolphin.swimAway) {
    this.player.hasDolphinMagnet = false;
    this.player.activeDolphin = null;
    return;
  }

  const playerCenterX = this.player.x + this.player.w / 2;
  const playerCenterY = this.player.y + this.player.h / 2;
  const playerCol = Math.floor(playerCenterX / TILE_SIZE);

  // 海豚离场只在第 70 列后生效
  if (playerCol > DOLPHIN_END_COL) {
    dolphin.dismount(this.player);
    this.showToolHint(t("The  dolphin  swims  away  after  helping  you!", "海豚完成帮助后游走了！"), 1800);
    return;
  }

  for (const item of this.level.items) {
  //海豚磁铁会吸引所有工具和回血恢复道具
  if (!(item instanceof Tool || item instanceof Hp)) continue;

    // 只吸第 40～70 列范围内的目标
    const itemCol = Math.floor((item.x + item.w / 2) / TILE_SIZE);
    if (itemCol < DOLPHIN_START_COL || itemCol > DOLPHIN_END_COL) continue;

    const itemCenterX = item.x + item.w / 2;
    const itemCenterY = item.y + item.h / 2;
    const d = dist(playerCenterX, playerCenterY, itemCenterX, itemCenterY);

    if (d > DOLPHIN_MAGNET_RADIUS) continue;

    item.x += (playerCenterX - itemCenterX) * DOLPHIN_MAGNET_STRENGTH;
    item.y += (playerCenterY - itemCenterY) * DOLPHIN_MAGNET_STRENGTH;
  }
}

 checkCollisions() {
  const now = millis();
  if (this.enemyContactLastTick === 0) this.enemyContactLastTick = now;
  const deltaSec = max(0, (now - this.enemyContactLastTick) / 1000);
  this.enemyContactLastTick = now;
  let touchingDamagingEnemy = false;
  // 敌人伤害判定：与玩家碰撞箱最短距离 < ENEMY_MELEE_ATTACK_RANGE 时结算接触伤害
  for (const enemy of this.level.enemies) {
    if (enemy.isDead) continue;
    if (typeof enemy.canDamagePlayer === "function" && !enemy.canDamagePlayer()) continue;
    
    const distToEnemy = this.distanceToEnemyBoxGap(enemy);
    const inAttackRange = distToEnemy < ENEMY_MELEE_ATTACK_RANGE;
    
    if (inAttackRange) touchingDamagingEnemy = true;
  }

  // 敌人在近距离内持续造成伤害；累计满 1 点生命值才真正扣血
  if (touchingDamagingEnemy) {
    this.enemyContactDamageCarry += deltaSec * ENEMY_CONTACT_DAMAGE_PER_SEC;
    const wholeDamage = Math.floor(this.enemyContactDamageCarry);
    if (wholeDamage > 0) {
      this.player.takeDamage(wholeDamage);
      this.enemyContactDamageCarry -= wholeDamage;
    }
  }

  // 第三关尖刺：接触期间持续扣血（与敌人接触伤害机制一致）
  if (typeof this.level.getActiveSpikeZones === 'function') {
    const playerBox = this.player.getCollisionBox();
    const touchingSpike = this.level.getActiveSpikeZones().some((z) =>
      rectCollision(playerBox.x, playerBox.y, playerBox.w, playerBox.h, z.x, z.y, z.w, z.h)
    );
    if (touchingSpike) {
      this.spikeContactDamageCarry += deltaSec * SPIKE_CONTACT_DAMAGE_PER_SEC;
      const wholeDamage = Math.floor(this.spikeContactDamageCarry);
      if (wholeDamage > 0) {
        this.player.takeDamage(wholeDamage);
        this.spikeContactDamageCarry -= wholeDamage;
      }
    } else {
      this.spikeContactDamageCarry = 0;
    }
  }

  for (let i = this.level.items.length - 1; i >= 0; i--) {
    const item = this.level.items[i];
    if (item instanceof IronBar || item instanceof FishingNet) continue;

    // TNT 爆炸后延迟移除（不需要玩家碰到）
    if (item instanceof TNT && item.exploded && millis() >= item.removeAfter) {
      this.level.items.splice(i, 1);
      continue;
    }

    // 只有碰撞到才处理拾取/触发
    if (!this.player.collidesWith(item)) continue;
    if (item instanceof Dolphin) {
      if (!this.player.dolphinUsed) {
      item.mount(this.player);
      this.showToolHint(t(
        "The  dolphin  attracts  nearby  tools  and  seashells!",
        "海豚会帮你吸引附近的工具和贝壳！"
    ), 3800);
  }
  continue;
}

    // 0) TNT：碰到就触发，不进背包、不加分、不移除
    if (item instanceof TNT) {
      item.arm(millis());
      continue;
    }

    if (item instanceof Animal) {
      this.handleAnimalTouchInteraction(item);
      continue;
    }

    if (item instanceof Ladder) {
      continue;
    }

    if (item instanceof Pollutant) {
      this.addScore(1);
      // 收集污染物：弹出统一得分提示
      this.scoreToastMessage = t("Pollutant collected! +1", "收集污染物！+1");
      this.scoreToastUntil = millis() + 1400;
    }

    if (item instanceof Hp) {
      const heal = this.getHpHealAmount(item.hpType);
      if (heal > 0) {
        const prevHealth = this.player.health;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
        if (this.player.health > prevHealth) {
          tryPlaySfx('recover', { volume: 0.34, rate: 1 });
        }
        this.showHealEffect();
      }
      this.level.items.splice(i, 1);
      continue;
    }

    // 3) 普通收集并移除（Tool/Weapon/Pollutant 都走这里）
    this.player.collect(item);
    this.level.items.splice(i, 1);
  }
}

  draw() {
    if (this.level instanceof FactoryLevel) {
      background(180);
    } else {
      background(168, 193, 254);
    }
    const now = millis();
    push();
    translate(-this.cameraX, 0);
    this.level.draw();
    this.player.draw();
    this.drawHealEffect(now);
    this.drawFollowCat(now);
    this.drawBucketPourAnim(now);
    drawDebugTerrainColumnIndexLabels();
    

    // 如果玩家在水中，叠加一层半透明水贴图在玩家前面
    // if (typeof this.player.isInWater === "function" && this.player.isInWater(this.level)) {
    //   const img = window.tile_water;
    //   const px = this.player.x;
    //   const py = this.player.y;
    //   const pw = this.player.w;
    //   const ph = this.player.h;
    //   push();
    //   noStroke();
    //   if (img && img.width > 0) {
    //     tint(255, 160);
    //     // 用水贴图在玩家范围内平铺
    //     const tileW = TILE_SIZE;
    //     const tileH = TILE_SIZE;
    //     for (let y = py; y < py + ph; y += tileH) {
    //       for (let x = px; x < px + pw; x += tileW) {
    //         image(img, x, y, tileW, tileH);
    //       }
    //     }
    //   } else {
    //     fill(80, 140, 255, 120);
    //     rect(px, py, pw, ph);
    //   }
    //   pop();
    // }
    pop();
    this.uiManager.drawHUD(this.player, this.showGuideMenu, this.activeGuideTab);
    this.drawTopCenterHint();
  }

checkTutorialHintZones() {
  if (!this.player) return;

  const playerCol = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);

  const zones = [
    // 三关通用的游戏提示
    {
      id: `${this.levelType}_basic_controls`,
      startCol: 0,
      endCol: 4,
      message: t(
        'Move  with  W/S/A/D,  press  F  to  attack,  click  inventory  items  to  use  them',
        'W/S/A/D 控制人物移动，按 F 键攻击，鼠标单击物品栏内的物品以使用物品'
      ),
      duration: 6000
    }
  ];

  // 第一关森林地图的专属提示
  if (this.levelType === 'forest') {
    zones.push(
      {
        id: 'forest_lava_bucket_hint',
        startCol: 6,
        endCol: 6,
        message: t(
          'Lava  ahead.  Try  picking  up  the  bucket  and  using  it.',
          '前面有岩浆，试试拾取水桶并使用吧'
        ),
        duration: 6000
      },
      {
        id: 'forest_zombie_attack_hint',
        startCol: 15,
        endCol: 15,
        message: t(
          'It\'s  a  zombie!  Quickly  press  F  to  attack  it.',
          '是僵尸！快使用 F 键攻击他'
        ),
        duration: 5000
      },
      {
        id: 'forest_magic_seed_hint',
        startCol: 21,
        endCol: 21,
        message: t(
          'It\'s  a  magic  seed.  It  will  grow  into  a  vine  ladder.',
          '是魔法种子，他会长成一个藤蔓梯子'
        ),
        duration: 5000
      },
      {
        id: 'forest_scissors_hint',
        startCol: 28,
        endCol: 28,
        message: t(
          'A  pair  of  scissors!  You  can  use  them  to  rescue  trapped  animals.',
          '一把剪刀！可以用来解救被困的小动物'
        ),
        duration: 5000
      },
      {
        id: 'forest_slime_block_hint',
        startCol: 75,
        endCol: 75,
        message: t(
          'Oh  no,  a  slime  is  blocking  the  way!',
          '哦不，史莱姆挡住了去路'
        ),
        duration: 5000
      },
      {
        id: 'forest_apple_hint',
        startCol: 42,
        endCol: 42,
        message: t(
          'Apples  are  a  gift  from  the  forest.  Eat  them  for  a  pleasant  surprise.',
          '苹果是森林的礼物，吃下会有惊喜哦'
        ),
        duration: 5000
      },
      {
        id: 'forest_trapped_bird_hint',
        startCol: 69,
        endCol: 71,
        message: t(
          'Poor  little  bird  is  trapped  in  a  net.  Maybe  we  can  help  it.',
          '可怜的小鸟被网困住了，也许我们有办法救他'
        ),
        duration: 8000
      },
      {
        id: 'forest_dynamite_hint',
        startCol: 96,
        endCol: 96,
        message: t(
          'It\'s  dynamite.  Do  not  touch  it!',
          '是炸药，千万不要接触他'
        ),
        duration: 5000
      ,}

    );
  }

  //第二关海洋地图的专属提示
  if (this.levelType === 'water') {
  zones.push(
    {
      id: 'water_mining_hint',
      startCol: 15,
      endCol: 15,
      message: t(
        'There  seems  to  be  treasure  buried  in  the  seabed  gravel  ahead.  Click  to  mine  it.',
        '前方的海底沙砾里似乎埋藏着宝藏，单击以挖矿'
      ),
      duration: 6000
    },
    {
      id: 'water_seashell_hint',
      startCol: 21,
      endCol: 23,
      message: t(
        'Magic  seashell!  Maybe,  like  apples,  it  is  a  gift  from  nature.',
        '神奇海螺！也许和苹果一样是自然的馈赠'
      ),
      duration: 5000
    },
    {
      id: 'water_turtle_hint',
      startCol: 41,
      endCol: 41,
      message: t(
        'Meow!  Steve,  there  is  a  turtle  that  has  lost  its  freedom.',
        '喵！史蒂夫，那儿有一只失去自由的海龟'
      ),
      duration: 5000
    },
    {
      id: 'water_big_fish_hint',
      startCol: 9,
      endCol: 9,
      message: t(
        'Meow!  I’ve  never  seen  such  a  big  fish!  Be  careful  in  the  deep  sea.',
        '从来没见过这么大的鱼，在深海里要小心'
      ),
      duration: 5000
    },
    {
      id: 'water_glowing_treasure_hint',
      startCol: 73,
      endCol: 73,
      message: t(
        'Another  glowing  treasure!  We  are  really  lucky.',
        '又有发光的宝藏了，我们运气真好'
      ),
      duration: 5000
    },

  );
}

  if (this.levelType === 'factory') {
    zones.push(
      {
        id: 'factory_green_potion_hint',
        startCol: 16,
        endCol: 16,
        message: t(
          'My  excellent  sense  of  smell  tells  me  that  green  potion  is  something  good.',
          '从我出色的嗅觉来看，那瓶绿色药剂是好东西呢'
        ),
        duration: 5000
      },
      {
        id: 'factory_pipe_water_hint',
        startCol: 25,
        endCol: 25,
        message: t(
          'City  pipes…  I  really  don’t  like  water.  Can  we  go  somewhere  else,  meow?',
          '人类的城市管道……我真的不喜欢水，我们可以去别的地方吗，喵'
        ),
        duration: 5000
      },
    );
  }

  for (const z of zones) {
    if (this.triggeredTutorialHints.has(z.id)) continue;

    if (playerCol >= z.startCol && playerCol <= z.endCol) {
      this.tutorialHintMessage = z.message;
      this.tutorialHintUntil = millis() + z.duration;
      this.triggeredTutorialHints.add(z.id);
      break;
    }
  }
}

drawTopCenterHint() {
  let message = null;

  // 工具失败提示优先，比如“附近没有可交互目标”
  if (this.toolHintMessage && millis() <= this.toolHintUntil) {
    message = this.toolHintMessage;
  } else if (this.tutorialHintMessage && millis() <= this.tutorialHintUntil) {
    message = this.tutorialHintMessage;
  }

  if (!message) return;
  const displayMessage = `: ${message}`;

  push();

  textSize(12);
  textAlign(CENTER, CENTER);
  noStroke();

  const catImg = window.uiCatHead;

  const catW = 12;
  const catH = 12;
  const catGap = 6;
  const paddingX = 12;

  const textW = textWidth(displayMessage);
  const totalW = catW + catGap + textW;
  const groupStartX = (width - totalW) / 2;
  const catX = groupStartX + catW / 2;
  const textX = groupStartX + catW + catGap + textW / 2;
  const textY = TOP_PROGRESS_BAR_Y + TOP_PROGRESS_BAR_H + 20;
  const catY = textY - 2;

  rectMode(CORNER);

  // 文字底部半透明黑色高亮
  const textHighlightH = 14;
  const textHighlightLeftExtend = catW + catGap + 4;
  const textHighlightW = textW + 16 + textHighlightLeftExtend;
  const textHighlightY = textY - textHighlightH / 2 - 2;
  const textHighlightX = textX - (textW + 16) / 2 - textHighlightLeftExtend;
  noStroke();
  fill(0, 0, 0, 85);
  rect(textHighlightX, textHighlightY, textHighlightW, textHighlightH);

  // 文字
  noStroke();
  fill(255);
  text(displayMessage, textX, textY);

  // 小猫贴图（置于高亮和文字上层）
  if (catImg && catImg.width > 0) {
    imageMode(CENTER);
    image(catImg, catX, catY, catW, catH);
  } else {
    fill(255, 220, 160);
    rect(catX - catW / 2, catY - catH / 2, catW, catH, 4);
  }

  pop();
}
}

// ====== Level 类 ======
class Level {
  constructor() {
    this.platforms = [];
    this.enemies = [];
    this.items = [];
    this.terrainHeights = [];
    this.tileMap = Array.from({ length: TERRAIN_COLS }, () => []);
    this.terrainBlocks = Array.from({ length: TERRAIN_COLS }, () => []);  // [col][row] = Platform
    this.pollutants = []; 
  }
  isBackgroundDecorationTile(tile) {
    return (
      tile === 'log' || tile === 'leaves' ||
      tile === 'dandelion' || tile === 'orange_tulip' || tile === 'pink_tulip' ||
      tile === 'poppy' || tile === 'red_mushroom' || tile === 'red_tulip' || tile === 'brown_mushroom' ||
      tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
      tile === 'tube_coral' || tile === 'tube_coral_fan' ||
      tile === 'horn_coral' || tile === 'horn_coral_fan' ||
      tile === 'fire_coral' || tile === 'fire_coral_fan' ||
      tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
      tile === 'brain_coral' || tile === 'brain_coral_fan' ||
      tile === 'kelp_1' || tile === 'kelp_2' || tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5'
    );
  }
  clearBackgroundDecorationsInColumn(col) {
    if (!this.treeColumns || col < 0 || col >= TERRAIN_COLS) return;
    const column = this.treeColumns[col];
    if (!column) return;
    for (let r = 0; r < column.length; r++) {
      if (
        this.isBackgroundDecorationTile(column[r]) &&
        column[r] !== 'log' &&
        column[r] !== 'leaves'
      ) {
        column[r] = undefined;
      }
    }
  }
  clearLogLeavesInColumn(col) {
    if (!this.treeColumns || col < 0 || col >= TERRAIN_COLS) return;
    const column = this.treeColumns[col];
    if (!column) return;
    for (let r = 0; r < column.length; r++) {
      if (column[r] === 'log' || column[r] === 'leaves') {
        column[r] = undefined;
      }
    }
  }
  removeBackgroundDecorationBlock(col, row) {
    if (!this.treeColumns || col < 0 || col >= TERRAIN_COLS || row < 0) return false;
    const tile = this.treeColumns[col]?.[row];
    if (!this.isBackgroundDecorationTile(tile)) return false;
    this.treeColumns[col][row] = undefined;
    return true;
  }
  loadAssets() {}
  draw() {}

  /** 世界坐标 (wx, wy) -> tileMap 的 tileType（wy 用画布坐标：上小下大） */
  getTileAtWorld(wx, wy) {
    const col = Math.floor(wx / TILE_SIZE);
    if (col < 0 || col >= TERRAIN_COLS) return T.NONE;
    const row = Math.floor((CANVAS_H - wy - 1) / TILE_SIZE);
    if (row < 0) return T.NONE;
    return this.tileMap[col]?.[row] ?? T.NONE;
  }

  isWaterAtWorld(wx, wy) {
    return this.getTileAtWorld(wx, wy) === T.WATER;
  }
  getTreeInfos() {
    if (!this.treeColumns) return [];
    const infos = [];
    let col = 0;
    while (col < this.treeColumns.length) {
      const hasLog = (this.treeColumns[col] || []).includes('log');
      if (!hasLog) { col++; continue; }
      const start = col;
      while (col + 1 < this.treeColumns.length && (this.treeColumns[col + 1] || []).includes('log')) col++;
      const end = col;
      const crown = [];
      for (let c = Math.max(0, start - 2); c <= Math.min(TERRAIN_COLS - 1, end + 2); c++) {
        const column = this.treeColumns[c] || [];
        for (let r = 0; r < column.length; r++) {
          if (column[r] === 'leaves') crown.push({ col: c, row: r });
        }
      }
      if (crown.length) {
        const rows = crown.map(p => p.row);
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const split = minRow + (maxRow - minRow) * 0.45;
        infos.push({
          trunkX: ((start + end) / 2 + 0.5) * TILE_SIZE,
          crown,
          upperCrown: crown.filter(p => p.row >= split)
        });
      }
      col++;
    }
    return infos;
  }
  /** 移除地形方块（挖掘） */
  removeTerrainBlock(col, row) {
    if (col < 0 || col >= TERRAIN_COLS) return false;
    if (!this.terrainBlocks[col][row]) return false;
    const bgAbove = this.treeColumns?.[col]?.[row + 1];
    const hasAdjacentBackgroundAbove = this.isBackgroundDecorationTile(bgAbove);
    const hasAdjacentLogAbove = bgAbove === 'log';
    const platform = this.terrainBlocks[col][row];
    const i = this.platforms.indexOf(platform);
    if (i >= 0) this.platforms.splice(i, 1);
    this.tileMap[col][row] = T.NONE;
    this.terrainBlocks[col][row] = null;
    if (hasAdjacentBackgroundAbove) {
      this.clearBackgroundDecorationsInColumn(col);
      if (hasAdjacentLogAbove) {
        this.clearLogLeavesInColumn(col - 2);
        this.clearLogLeavesInColumn(col - 1);
        this.clearLogLeavesInColumn(col);
        this.clearLogLeavesInColumn(col + 1);
        this.clearLogLeavesInColumn(col + 2);
      }
    }
    return true;
  }
}

class ForestLevel extends Level {
  loadAssets() {
    // 贴图简写（pic/ground 中全部可用）: G草 D土 S石 X深板岩 | COPPER铜 DIAMOND钻石 GOLD金 IRON铁 | DEEP_COPPER/GOLD/IRON/DIAMOND 深板岩矿
    const G = T.GRASS, D = T.DIRT, S = T.STONE, X = T.DEEP;
    const Cu = T.COPPER, CuX = T.DEEP_COPPER, Dx = T.DEEP_DIAMOND, Gx = T.DEEP_GOLD, Ix = T.DEEP_IRON;
    const Di = T.DIAMOND, Go = T.GOLD, Ir = T.IRON;
    const N = T.NONE; // 空格子简写
    const V = T.GRAVEL, SA = T.SAND, W = T.WATER; // 水关地形简写（ForestLevel 地形数据复用）

    // 统一地形定义：addTerrainColumn(列号, 总高度, [贴图数组])
    // - 数组从底部往上：[0] 是最底下那格，越往后越高
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木 / 水下植物（'log'/'leaves'/海草珊瑚标记字符串）：只绘制背景，不碰撞
    // - N (T.NONE)：空格子
    const terrain = [
      // 第1屏 - 包含树木
      [0,8,[X,X,S,S,G,N,'leaves','leaves']], 
      [1,10,[X,X,S,S,G,'red_tulip','leaves','leaves','leaves','leaves']], 
      [2,10,[X,X,S,D,G,'log','log','log','leaves','leaves']], 
      [3,10,[X,S,S,G,N,N,'leaves','leaves','leaves','leaves']], 
      [4,8,[X,S,D,G,'pink_tulip',N,'leaves','leaves']],
      [5,5,[X,S,D,G,'pink_tulip']],  
      [6,7,[X,S,S,N,N,D,G]], 
      [7,6,[X,T.LAVA,N,N,N,G]], 
      [8,2,[X,T.LAVA]],
      [9,2,[X,T.LAVA]], 
      [10,2,[X,T.LAVA]],
      [11,2,[X,T.LAVA]],
      [12,2,[X,T.LAVA]],
      [13,2,[X,T.LAVA]],
      [14,6,[X,S,S,N,'leaves','leaves']],
      [15,8,[X,S,G,N,'leaves','leaves','leaves','leaves']], 
      [16,8,[X,S,G,'log','log','log','leaves','leaves']], 
      [17,8,[X,S,G,N,'leaves','leaves','leaves','leaves']],
      [18,6,[X,S,G,N,'leaves','leaves']],
      [19,7,[X,S,D,G,N,'leaves','leaves']],
      // 第2屏
      [20,9,[S,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [21,9,[S,S,D,G,'log','log','log','leaves','leaves']], 
      [22,9,[S,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [23,7,[S,S,D,G,N,'leaves','leaves']],
      [24,8,[S,S,S,D,D,D,D,G]],
      [25,8,[S,S,S,D,D,D,D,G]], 
      [26,3,[X,S,S]], 
      [27,3,[X,S,S]], 
      [28,5,[X,X,S,S,S]],
      [29,3,[X,S,S]], 
      [30,2,[S,S]],
      [31,2,[X,T.LAVA]], 
      [32,2,[X,T.LAVA]], 
      [33,2,[X,T.LAVA]],
      [34,2,[X,T.LAVA]], 
      [35,2,[X,T.LAVA]], 
      [36,7,[X,S,S,N,N,'leaves','leaves']], 
      [37,9,[X,S,G,N,N,'leaves','leaves','leaves','leaves']], 
      [38,9,[S,S,D,G,'log','log','log','leaves','leaves']], 
      [39,9,[S,S,D,G,N,'leaves','leaves','leaves','leaves']],
      // 第3屏
      [40,7,[S,S,G,N,N,'leaves','leaves']], 
      [41,3,[X,S,G]], 
      [42,2,[S,S]], 
      [43,2,[S,S]], 
      [44,8,[S,S,Ir,N,N,N,'leaves','leaves']],
      [45,10,[X,X,S,G,N,N,'leaves','leaves','leaves','leaves']], 
      [46,10,[X,X,S,D,G,'log','log','log','leaves','leaves']], 
      [47,10,[X,S,S,D,G,'leaves','leaves','leaves','leaves','leaves']], 
      [48,9,[X,X,S,G,N,'leaves','leaves','leaves','leaves']], 
      [49,9,[X,S,D,G,'log','log','log','leaves','leaves']], 
      [50,9,[X,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [51,7,[X,S,D,G,N,'leaves','leaves']],
      [52,3,[S,S,G]], 
      [53,3,[X,S,G]], 
      [54,3,[X,S,G]], 
      [55,3,[X,S,G]], 
      [56,3,[X,S,G]],
      [57,5,[X,D,G,'leaves','leaves']], 
      [58,7,[S,G,N,'leaves','leaves','leaves','leaves']], 
      [59,7,[S,G,'log','log','log','leaves','leaves']], 
      // 第4屏
      [60,7,[S,G,N,'leaves','leaves','leaves','leaves']], 
      [61,5,[S,G,N,'leaves','leaves']],
      [62,3,[S,S,G]], 
      [63,2,[S,T.LAVA]], 
      [64,2,[S,T.LAVA]], 
      [65,2,[S,T.LAVA]], 
      [66,2,[S,T.LAVA]],
      [67,2,[S,T.LAVA]],
      [68,2,[S,S]], 
      [69,3,[S,D,G]], 
      [70,3,[S,D,G]], 
      [71,6,[S,D,G,N,N,G]],
      [72,7,[S,G,'orange_tulip',N,N,S,G]], 
      [73,7,[S,G,'red_tulip',N,N,S,G]], 
      [74,7,[S,G,N,N,N,N,G]], 
      [75,3,[X,S,G]],
      [76,7,[X,S,G,'brown_mushroom',N,'leaves','leaves']], 
      [77,9,[X,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      [78,9,[X,S,D,G,'log','log','log','leaves','leaves']], 
      [79,9,[X,S,D,G,N,'leaves','leaves','leaves','leaves']], 
      // 第5屏
      [80,7,[X,S,D,G,N,'leaves','leaves']], 
      [81,4,[X,S,D,G]],
      [82,6,[X,S,G,N,'leaves','leaves']], 
      [83,8,[X,S,G,'red_mushroom','leaves','leaves','leaves','leaves']], 
      [84,8,[X,S,G,'log','log','log','leaves','leaves']], 
      [85,8,[X,S,G,N,'leaves','leaves','leaves','leaves']], 
      [86,6,[X,S,G,N,'leaves','leaves']],
      [87,2,[S,G]], 
      [88,2,[S,G]], 
      [89,2,[S,G]], 
      [90,7,[S,D,G,N,N,N,G]], 
      [91,8,[S,D,G,N,N,N,D,G]],
      [92,8,[S,D,G,'pink_tulip',N,N,D,G]], 
      [93,8,[S,D,G,'pink_tulip',N,N,D,G]], 
      [94,7,[S,D,G,N,N,N,G]], 
      [95,4,[X,S,S,S]],
      [96,6,[X,X,X,S,S,S]], 
      [97,3,[X,Di,G]], 
      [98,3,[X,S,G]], 
      [99,4,[X,S,D,G]],
      // 第6屏
      [100,4,[X,S,D,G]], 
      [101,4,[X,S,D,G]], 
      [102,4,[X,S,D,G]], 
      [103,7,[X,S,G,'orange_tulip',N,N,S]], 
      [104,7,[X,S,G,'orange_tulip',N,N,S]],
      [105,8,[X,S,G,N,N,N,S,G]], 
      [106,8,[X,S,G,N,N,N,N,G]], 
      [107,8,[X,S,G,N,N,N,N,G]], 
      [108,4,[X,X,S,S]], 
      [109,3,[X,S,S]], 
      [110,5,[S,G,N,'leaves','leaves']], 
      [111,7,[S,G,'brown_mushroom','leaves','leaves','leaves','leaves']],
      [112,7,[S,G,'log','log','log','leaves','leaves']], 
      [113,7,[S,G,N,'leaves','leaves','leaves','leaves']], 
      [114,5,[S,T.LAVA,N,'leaves','leaves']], 
      [115,2,[S,T.LAVA]], 
      [116,2,[S,T.LAVA]],
      [117,2,[S,T.LAVA]], 
      [118,2,[S,S]], 
      [119,3,[S,D,G]], 
    ];
    terrain.forEach(([col, h, tiles]) => this.addTerrainColumn(col, h, tiles));

    // 辅助函数：获取“最高地表” y 坐标（通常用于放置物体/敌人）
    const groundY = (col) => this.terrainHeights[col];

    // 辅助函数：获取“底层地面” y 坐标（忽略中间悬空台阶）
    const baseGroundY = (col) => {
      const column = this.tileMap[col];
      if (!column || column.length === 0) return this.terrainHeights[col];

      const baseY = 360;
      let lastSolidRow = -1;

      for (let row = 0; row < column.length; row++) {
        const t = column[row];
        if (t === T.NONE || t === undefined || t === T.WATER) {
          // 已经过了一段连续地面，再遇到空格说明“底层地面”结束
          if (lastSolidRow !== -1) break;
          continue;
        }
        // 仍在底部连续地面区域内，记录最后一行
        lastSolidRow = row;
      }

      if (lastSolidRow === -1) return this.terrainHeights[col];
      return baseY - (lastSolidRow + 1) * TILE_SIZE;
    };
    
    // 辅助函数：获取浮空平台位置
    const getPlatform = (col) => {
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        if (p._col === col && !p.isTerrain) {
          return p;
        }
      }
      return { x: col * TILE_SIZE, y: 360 };
    };

    const solidSurfaceY = (col) => this.getSolidSurfaceY(col) ?? groundY(col);

    // ===== 敌人和物品生成（基于当前地形）=====
    // 敌人
    this.enemies.push(new Zombie(21 * TILE_SIZE, groundY(21) - 64, 64, 64));
    this.enemies.push(new Zombie(54 * TILE_SIZE, groundY(54) - 64, 64, 64));
    this.enemies.push(new Zombie(104 * TILE_SIZE, baseGroundY(104) - 64, 64, 64));
    // 新敌人：史莱姆（初始 128x128）
    this.enemies.push(new Slime(79 * TILE_SIZE, groundY(79) - 128, 160, 128));

    // 污染物
    // this.items.push(new Pollutant(36 * TILE_SIZE + 4, groundY(36) - 18, 24, 18, "cigarette")); // 地面 col 36
    // this.items.push(new Pollutant(48 * TILE_SIZE + 4, groundY(48) - 18, 24, 18, "plastic_bottle")); // 地面 col 48

    // TNT（不可收集，触发后爆炸）
    this.items.push(new TNT(97 * TILE_SIZE, groundY(97) - TILE_SIZE, TILE_SIZE, TILE_SIZE));

    // 食物（地面上，吃了回血，不进背包）
    this.items.push(new Hp(70 * TILE_SIZE + 4, groundY(70) - 24, 24, 24, 'apple'));
    this.items.push(new Hp(107 * TILE_SIZE + 4, groundY(107) - 24, 24, 24, 'golden_apple'));

    // 被困小鸟（网 48x36，鸟 24x30）
    const birdOffset = (TILE_SIZE - 48) / 2;
    this.items.push(new TrappedBird(73 * TILE_SIZE + birdOffset, groundY(73) - 36, 48, 36));
    this.items.push(new TrappedBird(92 * TILE_SIZE + birdOffset, groundY(92) - 36, 48, 36));

    // 工具（平台上 + 地面上，居中放置）Tool(x, y, w, h, toolType)
    // toolType 为 pic/item/tool 下文件名不含 .png，如 'scissor' 'bucket'
    const toolOffset = (TILE_SIZE - 24) / 2;
    // 剪刀
    this.items.push(new Tool(28 * TILE_SIZE + toolOffset, groundY(28) - 24, 24, 24, 'scissor'));
    this.items.push(new Tool(92 * TILE_SIZE + toolOffset, baseGroundY(92) - 24, 24, 24, 'scissor'));
    // 水桶
    this.items.push(new Tool(7 * TILE_SIZE + toolOffset, groundY(7) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(23 * TILE_SIZE + toolOffset, groundY(23) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(29 * TILE_SIZE + toolOffset, groundY(29) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(103 * TILE_SIZE + toolOffset, groundY(103) - 24, 24, 24, 'enlarged_water_bucket'));
    // 石灰石
    // this.items.push(new Tool(14 * TILE_SIZE + toolOffset, groundY(14) - 24, 24, 24, 'limestone'));
    // 藤蔓种子（放在前两屏）
    this.items.push(new Tool(21 * TILE_SIZE + toolOffset, groundY(21) - 24, 24, 24, 'vine_seed'));
    // 高台奖励
    this.items.push(new Hp(47 * TILE_SIZE + 4, groundY(47) - 24, 24, 24, 'apple'));

    // ===== 结束：敌人和物品生成 =====
  }

  addTreeColumn(col, heightTiles, tiles) {
    // 已废弃：现在统一使用 addTerrainColumn
    console.warn('addTreeColumn is deprecated, use addTerrainColumn instead');
  }

  drawTrees() {
    // 在水关中，复用 treeColumns 作为“背景装饰层”，包括树木与水下植物/珊瑚
    if (!this.treeColumns) return;

    const spriteMap = {
      // 森林关中复用的树
      log: window.tile_oak_log,
      leaves: window.tile_oak_leaves,
      dandelion: window.tile_dandelion,
      orange_tulip: window.tile_orange_tulip,
      pink_tulip: window.tile_pink_tulip,
      poppy: window.tile_poppy,
      red_mushroom: window.tile_red_mushroom,
      red_tulip: window.tile_red_tulip,
      brown_mushroom: window.tile_brown_mushroom,
      // 海草
      seagrass: window.tile_seagrass,
      tall_seagrass_1: window.tile_tall_seagrass_1,
      tall_seagrass_2: window.tile_tall_seagrass_2,
      // 珊瑚块 & 扇形珊瑚
      tube_coral: window.tile_tube_coral,
      tube_coral_fan: window.tile_tube_coral_fan,
      horn_coral: window.tile_horn_coral,
      horn_coral_fan: window.tile_horn_coral_fan,
      fire_coral: window.tile_fire_coral,
      fire_coral_fan: window.tile_fire_coral_fan,
      bubble_coral: window.tile_bubble_coral,
      bubble_coral_fan: window.tile_bubble_coral_fan,
      brain_coral: window.tile_brain_coral,
      brain_coral_fan: window.tile_brain_coral_fan,
      // 海带（多格高，用不同贴图拼接）
      kelp_1: window.tile_kelp_1,
      kelp_2: window.tile_kelp_2,
      kelp_3: window.tile_kelp_3,
      kelp_4: window.tile_kelp_4,
      kelp_5: window.tile_kelp_5
    };

    push();
    imageMode(CORNER);

    for (let col = 0; col < this.treeColumns.length; col++) {
      const column = this.treeColumns[col] || [];
      for (let i = 0; i < column.length; i++) {
        const kind = column[i];
        if (!kind || kind === T.NONE) continue;

        const x = col * TILE_SIZE;
        const y = 360 - (i + 1) * TILE_SIZE; // 从底部往上

        const img = spriteMap[kind];
        if (img && img.width > 0) {
          image(img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          // 根据种类给一些大致的颜色，作为贴图加载失败时的占位
          noStroke();
          if (kind === 'log') {
            fill(120, 86, 54);
          } else if (kind === 'leaves' || kind.startsWith('kelp') || kind.includes('seagrass')) {
            fill(60, 140, 70, 230);
          } else if (kind.includes('fire')) {
            fill(220, 80, 60, 230);
          } else if (kind.includes('bubble')) {
            fill(200, 80, 210, 230);
          } else if (kind.includes('brain')) {
            fill(230, 120, 190, 230);
          } else if (kind.includes('horn')) {
            fill(230, 210, 80, 230);
          } else if (kind.includes('tube')) {
            fill(80, 120, 220, 230);
          } else {
            fill(80, 150, 120, 230);
          }
          rect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    pop();
  }

  addTerrainColumn(col, heightTiles, tiles) {
    // 统一处理：地形、树木、浮空平台
    // - 数组从底部往上：tiles[0] 是最底下那格
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木（'log'/'leaves'）：只绘制，不碰撞
    // - T.NONE：空格子
    
    const baseY = 360; // 地面基准线
    if (!this.treeColumns) this.treeColumns = Array.from({ length: TERRAIN_COLS }, () => []);
    
    // 找到第一个非 T.NONE/背景装饰 的地形块，作为地表高度
    let terrainHeight = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const isBackground =
        tile === 'log' || tile === 'leaves' ||
        tile === 'dandelion' || tile === 'orange_tulip' || tile === 'pink_tulip' ||
        tile === 'poppy' || tile === 'red_mushroom' || tile === 'red_tulip' || tile === 'brown_mushroom' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5';

      if (tile !== T.NONE && !isBackground) {
        terrainHeight = i + 1;
      }
    }
    
    if (terrainHeight > 0) {
      const surfaceY = baseY - terrainHeight * TILE_SIZE;
      this.terrainHeights[col] = surfaceY;
    }
    
    // 逐格处理
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const y = baseY - (i + 1) * TILE_SIZE;
      
      if (tile === T.NONE || tile === undefined || tile === null) {
        continue;
      }
      
      // 树木 / 水下装饰：只记录到 treeColumns，不创建平台
      if (
        tile === 'log' || tile === 'leaves' ||
        tile === 'dandelion' || tile === 'orange_tulip' || tile === 'pink_tulip' ||
        tile === 'poppy' || tile === 'red_mushroom' || tile === 'red_tulip' || tile === 'brown_mushroom' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5'
      ) {
        if (!this.treeColumns[col]) this.treeColumns[col] = [];
        this.treeColumns[col][i] = tile;
        continue;
      }

      // 水：只绘制，不创建碰撞平台（玩家/实体可以落入水中）
      if (tile === T.WATER) {
        const row = i;
        this.tileMap[col][row] = tile;
        continue;
      }
      
      // 地形：创建碰撞平台
      const row = i; // 从底部开始的行号
      this.tileMap[col][row] = tile;
      const platform = new Platform(col * TILE_SIZE, y, TILE_SIZE, TILE_SIZE, terrainHeight > 0);
      platform._col = col;
      platform._row = row;
      platform._tileType = tile;
      platform.collisionRects = buildTileCollisionRects(tile, col * TILE_SIZE, y);
      this.platforms.push(platform);
      if (!this.terrainBlocks[col]) this.terrainBlocks[col] = [];
      this.terrainBlocks[col][row] = platform;
    }
  }

  draw() {
    // 绘制地形（从 tileMap 读取，T.NONE 不绘制）
    for (let col = 0; col < TERRAIN_COLS; col++) {
      for (let row = 0; row < (this.tileMap[col]?.length || 0); row++) {
        const type = this.tileMap[col][row];
        if (type === T.NONE || type === undefined) continue;
        const y = 360 - (row + 1) * TILE_SIZE; // 从底部往上
        drawTile(type, col * TILE_SIZE, y);
      }
    }

    // 背景树：画在地形之后、实体之前（纯背景，无碰撞/交互）
    this.drawTrees();

    // 绘制浮空平台、敌人、物品（生命值≤0 的敌人不绘制，已在 checkCollisions 中从列表移除）
    this.platforms.filter(p => !p.isTerrain).forEach(p => p.draw());
    this.enemies.filter(e => !e.isDead).forEach(e => e.draw());
    this.items.forEach(it => it.draw());
  }
}


// 关卡：工厂（地形数据由 assets/pic/stage_3.png 按色值最近邻分类生成）
class FactoryLevel extends ForestLevel {
  loadAssets() {
    const N = T.NONE, P = T.PIPE_NARROW, Bk = T.BRICKS, Db = T.DEEPSLATE_BRICKS, A = T.ACID;

    // 管道贴图方向常量（通过 rotation / flip 实现同图多方向）
    const PIPE_WIDE_UP = { textureKey: 'tile_pipe_wide', rotation: HALF_PI };
    const PIPE_WIDE_DOWN = { textureKey: 'tile_pipe_wide', rotation: -HALF_PI };
    const PIPE_WIDE_LEFT = { textureKey: 'tile_pipe_wide', rotation: 0 };
    const PIPE_WIDE_RIGHT = { textureKey: 'tile_pipe_wide', rotation: PI };

    const PIPE_NARROW_UP = { textureKey: 'tile_pipe_narrow', rotation: 0 };
    const PIPE_NARROW_LEFT = { textureKey: 'tile_pipe_narrow', rotation: -HALF_PI };

    const PIPE_WIDE_INNER_CORNER_UP_RIGHT = { textureKey: 'tile_pipe_wide_inner_corner', rotation: 0 };
    const PIPE_WIDE_INNER_CORNER_DOWN_LEFT = { textureKey: 'tile_pipe_wide_inner_corner', rotation: PI };
    const PIPE_WIDE_INNER_CORNER_UP_LEFT = { textureKey: 'tile_pipe_wide_inner_corner', rotation: -HALF_PI };
    const PIPE_WIDE_INNER_CORNER_DOWN_RIGHT = { textureKey: 'tile_pipe_wide_inner_corner', rotation: HALF_PI };

    const PIPE_WIDE_OUTER_CORNER_UP_RIGHT = { textureKey: 'tile_pipe_wide_outer_corner', rotation: PI };
    const PIPE_WIDE_OUTER_CORNER_DOWN_LEFT = { textureKey: 'tile_pipe_wide_outer_corner', rotation: 0 };
    const PIPE_WIDE_OUTER_CORNER_UP_LEFT = { textureKey: 'tile_pipe_wide_outer_corner', rotation: HALF_PI };
    const PIPE_WIDE_OUTER_CORNER_DOWN_RIGHT = { textureKey: 'tile_pipe_wide_outer_corner', rotation: -HALF_PI };

    const PIPE_NARROW_CORNER_UP_RIGHT = { textureKey: 'tile_pipe_narrow_corner', rotation: PI };
    const PIPE_NARROW_CORNER_DOWN_LEFT = { textureKey: 'tile_pipe_narrow_corner', rotation: 0 };
    const PIPE_NARROW_CORNER_UP_LEFT = { textureKey: 'tile_pipe_narrow_corner', rotation: HALF_PI };
    const PIPE_NARROW_CORNER_DOWN_RIGHT = { textureKey: 'tile_pipe_narrow_corner', rotation: -HALF_PI };

    const PIPE_NARROW_TO_WIDE_UP = { textureKey: 'tile_pipe_narrow_to_wide', rotation: 0 };
    const PIPE_NARROW_TO_WIDE_DOWN = { textureKey: 'tile_pipe_narrow_to_wide', rotation: PI };
    const PIPE_NARROW_TO_WIDE_LEFT = { textureKey: 'tile_pipe_narrow_to_wide', rotation: -HALF_PI };
    const PIPE_NARROW_TO_WIDE_RIGHT = { textureKey: 'tile_pipe_narrow_to_wide', rotation: HALF_PI };

    const PIPE_NARROW_TO_NARROW_UP = { textureKey: 'tile_pipe_narrow_to_narrow', rotation: 0 };
    const PIPE_NARROW_TO_NARROW_DOWN = { textureKey: 'tile_pipe_narrow_to_narrow', rotation: PI };
    const PIPE_NARROW_TO_NARROW_LEFT = { textureKey: 'tile_pipe_narrow_to_narrow', rotation: -HALF_PI };
    const PIPE_NARROW_TO_NARROW_RIGHT = { textureKey: 'tile_pipe_narrow_to_narrow', rotation: HALF_PI };

    const terrain = [
      [0,12,[Db,Db,Bk,N,N,N,N,N,N,Bk,Bk,Bk]],
      [1,12,[Db,Db,Bk,N,N,N,N,N,N,Bk,Bk,Bk]],
      [2,12,[Db,Db,Bk,N,N,N,N,N,N,Bk,Bk,Bk]],
      [3,12,[Db,Db,Bk,N,N,N,N,N,N,N,Bk,Bk]],
      [4,12,[Db,Db,Bk,N,N,N,N,N,N,N,Bk,Bk]],
      [5,12,[N,N,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [6,12,[N,N,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [7,12,[Db,Db,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [8,12,[Db,Db,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [9,12,[Db,Db,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [10,12,[Db,Db,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [11,12,[Db,Db,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [12,12,[Db,Db,Bk,Bk,N,N,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [13,12,[N,N,N,N,N,N,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [14,12,[N,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [15,12,[N,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [16,12,[Db,Bk,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [17,12,[Db,Bk,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [18,12,[Db,Bk,Bk,Bk,N,N,Bk,Bk,N,N,Bk,Bk]],
      [19,12,[Db,Bk,Bk,Bk,N,N,Bk,Bk,N,N,Bk,Bk]],
      [20,12,[Db,Bk,Bk,Bk,N,N,Bk,Bk,N,N,N,Bk]],
      [21,12,[Db,Bk,Bk,Bk,N,N,N,Bk,N,N,N,Bk]],
      [22,12,[Db,Bk,Bk,Bk,N,N,N,Bk,N,N,N,Bk]],
      [23,12,[Db,Bk,Bk,Bk,N,N,N,Bk,N,N,N,Bk]],
      [24,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,N,N,Bk]],
      [25,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_INNER_CORNER_UP_LEFT,PIPE_WIDE_LEFT,N,N,N,N,N,N,Bk,Bk]],
      [26,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_INNER_CORNER_UP_RIGHT,PIPE_WIDE_RIGHT,N,N,N,N,N,N,Bk,Bk]],
      [27,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,Bk,Bk,Bk]],
      [28,12,[Db,PIPE_WIDE_DOWN,PIPE_NARROW_TO_WIDE_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_CORNER_UP_LEFT,Bk,Bk,Bk]],
      [29,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [30,12,[Db,PIPE_WIDE_DOWN,PIPE_NARROW_TO_WIDE_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_CORNER_UP_LEFT,N,PIPE_NARROW_TO_NARROW_UP,PIPE_NARROW_UP,Bk,Bk]],
      [31,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,PIPE_NARROW_LEFT,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [32,12,[Db,PIPE_WIDE_DOWN,PIPE_NARROW_TO_WIDE_UP,PIPE_NARROW_UP,PIPE_NARROW_CORNER_UP_LEFT,N,PIPE_NARROW_CORNER_DOWN_RIGHT,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,Bk,Bk]],
      [33,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,PIPE_NARROW_LEFT,N,N,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [34,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,PIPE_NARROW_CORNER_DOWN_RIGHT,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,Bk,Bk]],
      [35,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [36,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,PIPE_NARROW_CORNER_DOWN_RIGHT,PIPE_NARROW_UP,Bk,Bk]],
      [37,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,Bk,Bk,Bk]],
      [38,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,N,Bk,Bk]],
      [39,12,[Db,N,N,N,N,N,N,N,N,N,N,Bk]],
      [40,12,[N,N,N,N,N,N,N,N,N,N,N,Bk]],
      [41,12,[Db,N,N,N,N,N,N,N,N,N,Bk,Bk]],
      [42,12,[Db,Db,N,N,N,N,N,N,N,N,Bk,Bk]],
      [43,12,[Db,Db,N,N,N,N,N,N,N,N,Bk,Bk]],
      [44,12,[Db,Bk,Bk,N,N,N,N,N,N,N,Bk,Bk]],
      [45,12,[Db,Bk,N,N,N,N,N,N,N,Bk,Bk,Bk]],
      [46,12,[Db,Bk,Bk,N,N,N,N,N,N,Bk,Bk,Bk]],
      [47,12,[Db,Bk,N,N,N,N,N,N,N,Bk,Bk,N]],
      [48,12,[N,N,N,N,N,N,N,N,N,Bk,Bk,N]],
      [49,12,[Db,Db,Bk,N,N,N,N,N,N,Bk,Bk,N]],
      [50,12,[Db,Db,Bk,N,N,N,N,N,Bk,Bk,Bk,N]],
      [51,12,[Bk,Bk,Bk,N,N,Bk,N,N,Bk,Bk,Bk,N]],
      [52,12,[A,N,N,N,N,Bk,N,N,Bk,N,N,N]],
      [53,12,[A,N,N,N,N,Bk,N,N,Bk,N,N,N]],
      [54,12,[A,N,N,N,N,Bk,N,N,Bk,N,N,Bk]],
      [55,12,[A,N,N,N,N,Bk,N,N,Bk,N,N,Bk]],
      [56,12,[A,N,N,N,N,Bk,N,N,Bk,N,N,Bk]],
      [57,12,[A,N,N,N,N,Bk,N,Bk,Bk,N,N,Bk]],
      [58,12,[Bk,N,N,N,N,Bk,Bk,Bk,Bk,N,N,Bk]],
      [59,12,[Bk,Bk,N,N,N,N,Bk,Bk,Bk,N,N,Bk]],
      [60,12,[Db,Bk,Bk,N,N,N,N,N,Bk,N,N,PIPE_NARROW_LEFT]],
      [61,12,[Db,Db,Bk,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [62,12,[Db,Db,Bk,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [63,12,[Db,Db,Bk,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [64,12,[Db,Db,Bk,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [65,12,[N,N,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [66,12,[Db,Db,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [67,12,[Db,Db,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [68,12,[Db,Db,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [69,12,[Db,Db,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [70,12,[Db,Db,Bk,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [71,12,[Db,Bk,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [72,12,[Bk,Bk,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [73,12,[A,N,N,N,N,N,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [74,12,[A,N,N,N,N,N,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [75,12,[A,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [76,12,[A,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [77,12,[A,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [78,12,[Db,N,N,N,N,N,Bk,Bk,N,N,Bk,Bk]],
      [79,12,[Db,Bk,N,N,N,N,Bk,Bk,N,N,Bk,Bk]],
      [80,12,[Db,Bk,Bk,Bk,N,N,Bk,Bk,N,N,N,Bk]],
      [81,12,[Db,Bk,Bk,Bk,N,N,N,Bk,N,N,N,Bk]],
      [82,12,[Db,Bk,Bk,Bk,N,N,N,Bk,N,N,N,Bk]],
      [83,12,[Db,Bk,Bk,Bk,N,N,N,Bk,N,N,N,Bk]],
      [84,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,N,N,Bk]],
      [85,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_INNER_CORNER_UP_LEFT,PIPE_WIDE_LEFT,N,N,N,N,N,N,Bk,Bk]],
      [86,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_INNER_CORNER_UP_RIGHT,PIPE_WIDE_RIGHT,N,N,N,N,N,N,Bk,Bk]],
      [87,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,Bk,Bk,Bk]],
      [88,12,[Db,PIPE_WIDE_DOWN,PIPE_NARROW_TO_WIDE_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_CORNER_UP_LEFT,Bk,Bk,Bk]],
      [89,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [90,12,[Db,PIPE_WIDE_DOWN,PIPE_NARROW_TO_WIDE_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_CORNER_UP_LEFT,N,PIPE_NARROW_TO_NARROW_UP,PIPE_NARROW_UP,Bk,Bk]],
      [91,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,PIPE_NARROW_LEFT,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [92,12,[Db,PIPE_WIDE_DOWN,PIPE_NARROW_TO_WIDE_UP,PIPE_NARROW_UP,PIPE_NARROW_CORNER_UP_LEFT,N,PIPE_NARROW_CORNER_DOWN_RIGHT,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,Bk,Bk]],
      [93,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,PIPE_NARROW_LEFT,N,N,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [94,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,PIPE_NARROW_CORNER_DOWN_RIGHT,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,PIPE_NARROW_UP,Bk,Bk]],
      [95,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,PIPE_NARROW_LEFT,Bk,Bk,Bk]],
      [96,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,PIPE_NARROW_CORNER_DOWN_RIGHT,PIPE_NARROW_UP,Bk,Bk]],
      [97,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,Bk,Bk,Bk]],
      [98,12,[Db,PIPE_WIDE_DOWN,PIPE_WIDE_UP,Bk,N,N,N,N,N,N,Bk,Bk]],
      [99,12,[Db,N,N,N,N,N,N,N,N,N,N,Bk]],
      [100,12,[N,N,N,N,N,N,N,N,N,N,N,Bk]],
      [101,12,[Db,N,N,N,N,N,N,N,N,N,Bk,Bk]],
      [102,12,[Db,N,N,N,N,N,N,N,N,N,Bk,Bk]],
      [103,12,[Db,N,N,N,N,N,N,N,N,N,Bk,Bk]],
      [104,12,[Db,N,N,N,N,N,N,Bk,Bk,Bk,Bk,Bk]],
      [105,12,[Db,N,N,N,N,N,N,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [106,12,[Db,N,N,N,N,N,N,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [107,12,[Db,Bk,Bk,N,N,N,N,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [108,12,[Db,Bk,Bk,N,N,N,N,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [109,12,[Db,Bk,Bk,N,N,N,N,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [110,12,[Db,Bk,N,N,N,N,N,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [111,12,[A,N,N,N,N,N,N,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [112,12,[A,N,N,N,Bk,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [113,12,[A,N,N,N,Bk,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [114,12,[A,N,N,N,Bk,Bk,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [115,12,[A,N,N,N,Bk,Bk,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [116,12,[Bk,N,N,N,Bk,Bk,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [117,12,[Bk,N,N,N,N,Bk,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [118,12,[Bk,Bk,N,N,N,Bk,Bk,N,N,N,Bk,Bk]],
      [119,12,[Db,Bk,N,N,N,Bk,Bk,Bk,Bk,Bk,Bk,Bk]],
    ];
    terrain.forEach(([col, h, tiles]) => this.addTerrainColumn(col, h, tiles));
    this.pipeFlowColumns = [];
    for (let col = 0; col < TERRAIN_COLS; col++) {
      const tile = this.tileMap[col]?.[1];
      if (
        tile &&
        typeof tile === 'object' &&
        tile.textureKey === 'tile_pipe_wide' &&
        tile.rotation === -HALF_PI
      ) {
        this.pipeFlowColumns.push(col);
      }
    }
    this.pipeFlowRuns = [];
    let currentRun = [];
    for (let i = 0; i < this.pipeFlowColumns.length; i++) {
      const col = this.pipeFlowColumns[i];
      if (currentRun.length === 0 || col === currentRun[currentRun.length - 1] + 1) {
        currentRun.push(col);
      } else {
        this.pipeFlowRuns.push(currentRun);
        currentRun = [col];
      }
    }
    if (currentRun.length > 0) this.pipeFlowRuns.push(currentRun);

    this.pipeFlowStartMs = null;
    this.pipeFlowStepMs = 500;
    this.pipeFlowVisibleMs = 3000;
    this.pipeFlowSquareVisibleMs = 3000;
    this.pipeFlowHeight = 26;
    this._pipeFlowZonesCacheFrame = -1;
    this._pipeFlowZonesCache = [];
    this.spikeTravelPx = 32;
    this.spikeCycleMs = 1400;
    this.spikes = [];
    this.setupFactoryTrapAndButton();
    // spike
    this.addSpikeOnTopBrick(9);
    this.addSpikeOnTopBrick(10);
    this.addSpikeOnTopBrick(20, { targetRow: 3 });
    this.addSpikeOnTopBrick(22, { targetRow: 3 });
    this.addSpikeOnTopBrick(81, { targetRow: 3 });
    this.addSpikeOnTopBrick(83, { targetRow: 3 });
    // 可按如下方式在局内手动添加：this.addSpikeOnTopBrick(18, { targetRow: 3, width: 32, height: 8, phaseOffsetMs: 0 });
    const groundY = (col) => this.terrainHeights[col];
    // vex
    this.enemies.push(new Vex(18 * TILE_SIZE, 2 * TILE_SIZE, 40, 22));
    this.enemies.push(new Vex(107 * TILE_SIZE, 6 * TILE_SIZE, 40, 22));
    // rabbit：两套机关各放 1 只（逻辑相同）
    // 42-45：第45列兔子在按钮按下后跳到 col=44，距底部 3*TILE_SIZE 的砖块位置
    this.items.push(new Rabbit(
      45 * TILE_SIZE,
      (CANVAS_H - 2 * TILE_SIZE) - 32,
      32,
      32,
      {
        scriptEnabled: true,
        listenButtonCol: 42,
        targetX: 44 * TILE_SIZE,
        targetY: (CANVAS_H - 3 * TILE_SIZE) - 32
      }
    ));
    // 66-70：第70列兔子在按钮按下后跳到 col=69，距底部 4*TILE_SIZE 的砖块位置
    this.items.push(new Rabbit(
      70 * TILE_SIZE,
      (CANVAS_H - 3 * TILE_SIZE) - 32,
      32,
      32,
      {
        scriptEnabled: true,
        listenButtonCol: 66,
        targetX: 69 * TILE_SIZE,
        targetY: (CANVAS_H - 4 * TILE_SIZE) - 32
      }
    ));

    // 第三关恢复道具药水瓶
    this.items.push(new Hp(18 * TILE_SIZE + 4, groundY(18) - 24, 24, 24, 'potion_bottle'));
    this.items.push(new Hp(52 * TILE_SIZE + 4, groundY(52) - 24, 24, 24, 'potion_bottle'));
    this.items.push(new Hp(88 * TILE_SIZE + 4, groundY(88) - 24, 24, 24, 'potion_bottle'));

    // 石灰石
    this.items.push(new Tool(7 * TILE_SIZE + 4, CANVAS_H - 2 * TILE_SIZE - 24, 24, 24, 'limestone'));
    this.items.push(new Tool(36 * TILE_SIZE + 4, CANVAS_H - 4 * TILE_SIZE - 24, 24, 24, 'limestone'));
    this.items.push(new Tool(55 * TILE_SIZE + 4, CANVAS_H - 6 * TILE_SIZE - 24, 24, 24, 'limestone'));
  }

  addTerrainColumn(col, heightTiles, tiles) {
    const baseY = 360;
    if (!this.treeColumns) this.treeColumns = Array.from({ length: TERRAIN_COLS }, () => []);

    let terrainHeight = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const isBackground =
        tile === 'log' || tile === 'leaves' ||
        tile === 'dandelion' || tile === 'orange_tulip' || tile === 'pink_tulip' ||
        tile === 'poppy' || tile === 'red_mushroom' || tile === 'red_tulip' || tile === 'brown_mushroom' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5';

      if (tile === T.NONE || tile === undefined || tile === null) break;
      if (isBackground) break;
      terrainHeight = i + 1;
    }

    if (terrainHeight > 0) {
      const surfaceY = baseY - terrainHeight * TILE_SIZE;
      this.terrainHeights[col] = surfaceY;
    }

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const y = baseY - (i + 1) * TILE_SIZE;

      if (tile === T.NONE || tile === undefined || tile === null) continue;

      if (
        tile === 'log' || tile === 'leaves' ||
        tile === 'dandelion' || tile === 'orange_tulip' || tile === 'pink_tulip' ||
        tile === 'poppy' || tile === 'red_mushroom' || tile === 'red_tulip' || tile === 'brown_mushroom' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5'
      ) {
        if (!this.treeColumns[col]) this.treeColumns[col] = [];
        this.treeColumns[col][i] = tile;
        continue;
      }

      const row = i;
      this.tileMap[col][row] = tile;
      const platform = new Platform(col * TILE_SIZE, y, TILE_SIZE, TILE_SIZE, terrainHeight > 0);
      platform._col = col;
      platform._row = row;
      platform._tileType = tile;
      platform.collisionRects = buildTileCollisionRects(tile, col * TILE_SIZE, y);
      this.platforms.push(platform);
      if (!this.terrainBlocks[col]) this.terrainBlocks[col] = [];
      this.terrainBlocks[col][row] = platform;
    }
  }

  draw() {
    this.drawFactorySpikes();
    super.draw();

    const flowState = this.getPipeFlowState();
    if (!flowState) return;
    noStroke();
    fill(70, 150, 255, 230);

    for (const zone of this.getActivePipeFlowZones(flowState)) {
      rect(zone.x, zone.y, zone.w, zone.h);
    }
  }

  getPipeFlowState() {
    if (!this.pipeFlowRuns || this.pipeFlowRuns.length === 0) return null;
    if (this.pipeFlowStartMs === null) this.pipeFlowStartMs = millis();

    return { elapsedMs: millis() - this.pipeFlowStartMs };
  }

  getActivePipeFlowZones(flowState = null) {
    const s = flowState || this.getPipeFlowState();
    if (!s) return [];
    const cacheFrame = (typeof frameCount === 'number') ? frameCount : -1;
    if (this._pipeFlowZonesCacheFrame === cacheFrame) {
      return this._pipeFlowZonesCache;
    }

    const zones = [];
    const y = 360 - 2 * TILE_SIZE; // row=1 对应 tile 的上边缘
    const stepMs = this.pipeFlowStepMs;

    for (const run of this.pipeFlowRuns) {
      const pipeCount = run.length;
      if (pipeCount <= 0) continue;
      const lastPipeAppearMs = (pipeCount - 1) * stepMs;
      const square1AppearMs = lastPipeAppearMs + stepMs;
      const square2AppearMs = square1AppearMs + stepMs;
      const square3AppearMs = square2AppearMs + stepMs;
      const firstPipeDisappearMs = square3AppearMs + this.pipeFlowSquareVisibleMs;
      const firstSquareDisappearMs = firstPipeDisappearMs + pipeCount * stepMs;
      const square1DisappearMs = firstSquareDisappearMs;
      const square2DisappearMs = firstSquareDisappearMs + stepMs;
      const square3DisappearMs = firstSquareDisappearMs + 2 * stepMs;
      const totalCycleMs = square3DisappearMs + stepMs;
      if (totalCycleMs <= 0) continue;
      const cycleElapsedMs = s.elapsedMs % totalCycleMs;

      for (let i = 0; i < pipeCount; i++) {
        const appearMs = i * stepMs;
        const disappearMs = firstPipeDisappearMs + i * stepMs;
        if (cycleElapsedMs >= appearMs && cycleElapsedMs < disappearMs) {
          zones.push({
            x: run[i] * TILE_SIZE,
            y,
            w: TILE_SIZE,
            h: this.pipeFlowHeight
          });
        }
      }

      const lastCol = run[pipeCount - 1];
      const squareBaseX = lastCol * TILE_SIZE + 64;
      const squareBaseY = y;
      if (cycleElapsedMs >= square1AppearMs && cycleElapsedMs < square1DisappearMs) {
        zones.push({ x: squareBaseX - TILE_SIZE, y: squareBaseY, w: TILE_SIZE, h: TILE_SIZE });
      }
      if (cycleElapsedMs >= square2AppearMs && cycleElapsedMs < square2DisappearMs) {
        zones.push({ x: squareBaseX, y: squareBaseY, w: TILE_SIZE, h: TILE_SIZE });
      }
      if (cycleElapsedMs >= square3AppearMs && cycleElapsedMs < square3DisappearMs) {
        zones.push({ x: squareBaseX, y: squareBaseY + TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
      }
    }
    this._pipeFlowZonesCacheFrame = cacheFrame;
    this._pipeFlowZonesCache = zones;
    return zones;
  }

  applyBlueFlowForceToPlayer(player) {
    if (!player || typeof player.getCollisionBox !== 'function') return;
    const box = player.getCollisionBox();
    const zones = this.getActivePipeFlowZones();
    const touchingBlueZone = zones.some((z) => rectCollision(box.x, box.y, box.w, box.h, z.x, z.y, z.w, z.h));
    if (!touchingBlueZone) return;

    player.vx += 0.45; // 额外向右推力
    player.vy += 0.35; // 额外向下推力
  }

  setupFactoryTrapAndButton() {
    // 支持多套机关（与 42-45 一致的逻辑可复用）
    this.factoryMechanisms = [];
    this.factoryButtons = [];
    this.factoryButtonPressed = false; // 向后兼容：第一套按钮状态

    this.addFactoryTrapButtonMechanism({ buttonCol: 42, buttonDbNth: 2, trapCol: 45, trapBottomTiles: 3 });
    this.addFactoryTrapButtonMechanism({ buttonCol: 66, buttonDbNth: 2, trapCol: 70, trapBottomTiles: 4 });

    // 向后兼容字段（指向第一套）
    const first = this.factoryMechanisms[0];
    if (first) {
      this.factoryTrapPlatform = first.trapPlatform;
      this.factoryTrapBaseY = first.trapBaseY;
      this.factoryTrapLiftPx = first.liftPx;
      this.factoryButtonPlatform = first.buttonPlatform;
    }

    this.updateFactoryMechanisms(null);
  }

  addFactoryTrapButtonMechanism({ buttonCol, buttonDbNth = 2, trapCol, trapBottomTiles = 3 }) {
    const liftPx = 4 * TILE_SIZE;

    // trap：默认放在距底部 3*TILE_SIZE 的高度（可通过 trapBottomTiles 调整）
    const trapX = trapCol * TILE_SIZE;
    const trapY = CANVAS_H - trapBottomTiles * TILE_SIZE;
    const trapBaseY = trapY;
    const trapPlatform = new Platform(trapX, trapY, TILE_SIZE, 8, false);
    trapPlatform.draw = function () {
      const img = window.tile_trap;
      if (img && img.width > 0 && img.height > 0) image(img, this.x, this.y, this.w, this.h);
      else { fill(150, 120, 80); rect(this.x, this.y, this.w, this.h); }
    };
    trapPlatform.collisionRects = [{ x: trapX, y: trapY, w: TILE_SIZE, h: 8 }];
    this.platforms.push(trapPlatform);

    // button：放在指定列的第 N 个 Db 上方
    const buttonSurfaceY = this.getNthTileSurfaceY(buttonCol, T.DEEPSLATE_BRICKS, buttonDbNth);
    if (buttonSurfaceY === null) return;
    const buttonX = buttonCol * TILE_SIZE;
    const buttonY = buttonSurfaceY - 8;
    const buttonPlatform = new Platform(buttonX, buttonY, TILE_SIZE, 8, false);

    const mechanism = {
      buttonCol,
      pressed: false,
      buttonPlatform,
      trapPlatform,
      trapBaseY,
      liftPx
    };

    buttonPlatform.draw = () => {
      const img = mechanism.pressed ? window.tile_button_pressed : window.tile_button;
      if (img && img.width > 0 && img.height > 0) image(img, buttonX, buttonY, TILE_SIZE, 8);
      else {
        if (mechanism.pressed) fill(170, 40, 40);
        else fill(220, 50, 50);
        rect(buttonX, buttonY, TILE_SIZE, 8);
      }
    };
    this.platforms.push(buttonPlatform);

    this.factoryMechanisms.push(mechanism);
    this.factoryButtons.push({ platform: buttonPlatform, pressed: false, buttonCol });
  }

  getNthTileSurfaceY(col, tileType, nth = 1) {
    if (col < 0 || col >= TERRAIN_COLS || nth <= 0) return null;
    const column = this.tileMap[col] || [];
    let count = 0;
    for (let row = 0; row < column.length; row++) {
      if (column[row] !== tileType) continue;
      count++;
      if (count === nth) return CANVAS_H - (row + 1) * TILE_SIZE;
    }
    return null;
  }

  updateFactoryMechanisms(player = null) {
    if (!Array.isArray(this.factoryMechanisms) || this.factoryMechanisms.length === 0) return;

    for (const m of this.factoryMechanisms) {
      const buttonX = m.buttonPlatform.x;
      const buttonY = m.buttonPlatform.y;
      const pressed = this.isPlayerStandingOnFactoryButton(player, m.buttonPlatform);
      m.pressed = pressed;

      // button 碰撞箱：与 pressed 一致（20x4，底部居中）
      const buttonCollisionH = 4;
      const buttonCollisionY = buttonY + 4;
      m.buttonPlatform.collisionRects = [{
        x: buttonX + 6,
        y: buttonCollisionY,
        w: 20,
        h: buttonCollisionH
      }];

      const trapY = m.trapBaseY - (pressed ? m.liftPx : 0);
      m.trapPlatform.y = trapY;
      m.trapPlatform.collisionRects = [{
        x: m.trapPlatform.x,
        y: trapY,
        w: m.trapPlatform.w,
        h: m.trapPlatform.h
      }];

      const btn = this.factoryButtons?.find(b => b.buttonCol === m.buttonCol);
      if (btn) btn.pressed = pressed;
    }

    // 向后兼容：第一套按钮状态
    this.factoryButtonPressed = !!this.factoryMechanisms[0]?.pressed;
  }

  isFactoryTrapAtTop() {
    // 兼容旧接口：任意 trap 到顶返回 true
    if (!Array.isArray(this.factoryMechanisms) || this.factoryMechanisms.length === 0) return false;
    for (const m of this.factoryMechanisms) {
      const topY = m.trapBaseY - m.liftPx;
      if (m.trapPlatform?.y <= topY + 0.01) return true;
    }
    return false;
  }

  getNearestFactoryButtonPressed(entity) {
    if (!entity || !Array.isArray(this.factoryButtons) || this.factoryButtons.length === 0) return false;
    const entityCenterX = entity.x + entity.w / 2;
    const entityCenterY = entity.y + entity.h / 2;
    let nearest = null;
    let nearestDistSq = Infinity;
    for (const btn of this.factoryButtons) {
      const p = btn?.platform;
      if (!p) continue;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const dx = cx - entityCenterX;
      const dy = cy - entityCenterY;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestDistSq) {
        nearestDistSq = d2;
        nearest = btn;
      }
    }
    return !!nearest?.pressed;
  }

  isPlayerStandingOnFactoryButton(player, buttonPlatform = null) {
    if (!player || typeof player.getCollisionBox !== 'function') return false;
    const p = player.getCollisionBox();
    const b = (buttonPlatform || this.factoryButtonPlatform)?.collisionRects?.[0];
    if (!b) return false;
    const overlapX = Math.min(p.x + p.w, b.x + b.w) - Math.max(p.x, b.x);
    if (overlapX <= 0) return false;
    const feetY = p.y + p.h;
    return feetY >= b.y - 2 && feetY <= b.y + 6 && (player.vy ?? 0) >= -0.05;
  }

  isFactoryButtonPressedAtCol(col) {
    if (!Array.isArray(this.factoryButtons)) return false;
    const b = this.factoryButtons.find(btn => btn.buttonCol === col);
    return !!b?.pressed;
  }

  addSpikeOnTopBrick(col, options = {}) {
    const surfaceY = this.getTopBrickSurfaceY(col, options.targetRow);
    if (surfaceY === null) return;
    this.spikes.push({
      x: col * TILE_SIZE,
      surfaceY,
      w: options.width ?? TILE_SIZE,
      h: options.height ?? 8,
      phaseOffsetMs: options.phaseOffsetMs ?? 0
    });
  }

  getTopBrickSurfaceY(col, targetRow = null) {
    const column = this.tileMap[col] || [];
    if (Number.isInteger(targetRow)) {
      if (targetRow < 0 || targetRow >= column.length) return null;
      if (column[targetRow] !== T.BRICKS) return null;
      return 360 - (targetRow + 1) * TILE_SIZE;
    }
    for (let row = column.length - 1; row >= 0; row--) {
      if (column[row] !== T.BRICKS) continue;
      return 360 - (row + 1) * TILE_SIZE;
    }
    return null;
  }

  getActiveSpikeZones() {
    if (!Array.isArray(this.spikes) || this.spikes.length === 0) return [];
    const now = millis();
    return this.spikes.map((spike) => {
      const t = (now + spike.phaseOffsetMs) % this.spikeCycleMs;
      const phase01 = (1 - cos((t / this.spikeCycleMs) * TWO_PI)) * 0.5;
      const y = spike.surfaceY - spike.h + phase01 * this.spikeTravelPx;
      return { x: spike.x, y, w: spike.w, h: spike.h };
    });
  }

  drawFactorySpikes() {
    const zones = this.getActiveSpikeZones();
    if (!zones.length) return;
    const img = window.tile_spike;
    for (const zone of zones) {
      if (img && img.width > 0 && img.height > 0) {
        image(img, zone.x, zone.y, zone.w, zone.h);
      } else {
        fill(210, 210, 220);
        rect(zone.x, zone.y, zone.w, zone.h);
      }
    }
  }
}

// 关卡2
class WaterLevel extends Level {
  getSolidSurfaceY(col) {
    if (col < 0 || col >= TERRAIN_COLS) return null;
    const column = this.tileMap[col] || [];
    let topSolidRow = -1;
    for (let row = 0; row < column.length; row++) {
      const tile = column[row];
      if (tile === T.NONE || tile === undefined || tile === T.WATER) continue;
      topSolidRow = Math.max(topSolidRow, row);
    }
    if (topSolidRow < 0) return null;
    return 360 - (topSolidRow + 1) * TILE_SIZE;
  }

  getBaseSolidSurfaceY(col) {
    if (col < 0 || col >= TERRAIN_COLS) return null;
    const column = this.tileMap[col] || [];
    let lastSolidRow = -1;
    for (let row = 0; row < column.length; row++) {
      const tile = column[row];
      if (tile === T.NONE || tile === undefined || tile === T.WATER) {
        if (lastSolidRow !== -1) break;
        continue;
      }
      lastSolidRow = row;
    }
    if (lastSolidRow < 0) return null;
    return 360 - (lastSolidRow + 1) * TILE_SIZE;
  }

  setSnapMode(entity, mode, col = null) {
    if (!entity) return entity;
    entity._snapSurfaceMode = mode; // 'top' | 'base'
    if (col !== null && col !== undefined) entity._snapCol = col;
    return entity;
  }

  snapEntityToSolidSurface(entity) {
    if (!entity) return;
    const centerX = entity.x + entity.w / 2;
    const colFromPos = constrain(Math.floor(centerX / TILE_SIZE), 0, TERRAIN_COLS - 1);
    const col = Number.isInteger(entity._snapCol) ? entity._snapCol : colFromPos;
    const mode = entity._snapSurfaceMode === 'base' ? 'base' : 'top';
    const surfaceY = mode === 'base' ? this.getBaseSolidSurfaceY(col) : this.getSolidSurfaceY(col);
    if (surfaceY === null) return;
    entity.y = surfaceY - entity.h;
    if ('vy' in entity) entity.vy = 0;
    if ('onGround' in entity) entity.onGround = true;
  }

  loadAssets() {
    // 贴图简写（pic/ground 中全部可用）: G草 D土 S石 X深板岩 | COPPER铜 DIAMOND钻石 GOLD金 IRON铁 | DEEP_COPPER/GOLD/IRON/DIAMOND 深板岩矿
    const G = T.GRASS, D = T.DIRT, S = T.STONE, X = T.DEEP;
    const Cu = T.COPPER, CuX = T.DEEP_COPPER, Dx = T.DEEP_DIAMOND, Gx = T.DEEP_GOLD, Ix = T.DEEP_IRON;
    const Di = T.DIAMOND, Go = T.GOLD, Ir = T.IRON;
    const V = T.GRAVEL;
    const W = T.WATER;
    const SA = T.SAND;
    const N = T.NONE; // 空格子简写

    // 统一地形定义：addTerrainColumn(列号, 总高度, [贴图数组])
    // - 数组从底部往上：[0] 是最底下那格，越往后越高
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木（'log'/'leaves'）：只绘制背景，不碰撞
    // - N (T.NONE)：空格子
    const terrain = [
      // 第1屏
      [0,12,[V,V,SA,W,W,W,W,W,W,W,W,W]],
      [1,12,[V,SA,SA,'fire_coral_fan',W,W,W,W,W,W,W,W]],
      [2,12,[V,SA,SA,'horn_coral',W,W,W,W,W,W,W,W]],
      [3,12,[V,SA,SA,'bubble_coral_fan',W,W,W,W,W,W,W,W]],
      [4,12,[V,SA,'fire_coral',W,W,W,W,W,W,W,W,W]],
      [5,12,[V,SA,'fire_coral_fan',W,W,W,W,W,W,W,W,W]],
      [6,12,[V,SA,'bubble_coral',W,W,SA,W,W,W,W,W,W]],
      [7,12,[V,SA,W,W,W,SA,SA,W,W,W,W,W]],
      [8,12,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,SA,W,W,W,W,W]],
      [9,12,[V,SA,'seagrass',W,W,W,SA,W,W,W,W,W]],
      [10,12,[V,SA,'horn_coral_fan',W,W,W,SA,W,W,W,W,W]],
      [11,12,[V,SA,SA,W,W,W,W,W,W,W,W,W]],
      [12,12,[V,SA,SA,W,W,W,W,W,W,W,W,W]],
      [13,12,[V,SA,SA,W,W,W,W,W,W,W,W,W]],
      [14,12,[V,V,SA,'horn_coral',W,W,W,W,W,W,W,W]],
      [15,12,[V,V,SA,SA,'fire_coral_fan',W,W,W,SA,W,W,W]],
      [16,12,[V,V,SA,SA,W,W,W,W,SA,'horn_coral_fan',W,W]],
      [17,12,[V,V,SA,SA,W,W,W,W,SA,W,W,W]],
      [18,12,[V,V,T.IRON,W,W,W,W,SA,SA,W,W,W]],
      [19,12,[V,V,SA,W,W,W,W,SA,SA,'tall_seagrass_1','tall_seagrass_2',W]],
      // 第2屏
      [20,12,[V,V,SA,'bubble_coral',W,W,W,SA,'bubble_coral_fan',W,W,N]],
      [21,12,[V,V,SA,'bubble_coral_fan',W,W,W,W,W,W,W,N]],
      [22,12,[V,V,SA,W,W,W,W,W,W,W,W,N]],
      [23,12,[V,V,SA,'seagrass',W,W,W,W,W,W,W,N]],
      [24,12,[V,V,SA,'kelp_1','kelp_2','kelp_3',W,W,W,W,W,N]],
      [25,12,[V,V,SA,SA,W,W,W,W,W,W,W,N]],
      [26,12,[V,V,SA,SA,'fire_coral_fan',W,W,W,W,SA,W,N]],
      [27,12,[V,V,SA,SA,'horn_coral',W,W,W,W,SA,W,N]],
      [28,12,[V,V,V,SA,SA,W,W,W,V,SA,'horn_coral_fan',N]],
      [29,12,[V,V,V,SA,SA,'fire_coral',W,W,V,SA,'fire_coral_fan',N]],
      [30,12,[V,V,V,SA,SA,W,W,W,V,SA,W,N]],
      [31,12,[V,V,SA,SA,SA,W,W,W,W,SA,W,N]],
      [32,12,[V,V,SA,'fire_coral',W,W,W,W,W,W,W,N]],
      [33,12,[V,V,SA,'fire_coral_fan',W,W,W,W,W,W,W,N]],
      [34,12,[V,SA,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,N]],
      [35,12,[V,SA,SA,W,W,W,W,W,W,W,W,N]],
      [36,12,[V,SA,'bubble_coral_fan',W,W,W,W,W,W,W,W,N]],
      [37,12,[V,SA,W,W,W,W,W,W,W,W,W,N]],
      [38,12,[V,SA,'horn_coral',W,W,W,W,W,W,W,W,N]],
      [39,12,[V,SA,SA,SA,SA,W,W,W,W,W,W,N]],
      // 第3屏
      [40,11,[V,V,V,SA,SA,SA,SA,W,W,W,W]],
      [41,11,[V,V,SA,SA,SA,SA,W,W,W,W,W]],
      [42,11,[V,V,SA,'horn_coral_fan',W,W,W,W,W,W,W]],
      [43,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [44,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [45,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [46,11,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,W]],
      [47,11,[V,SA,'seagrass',W,W,W,W,SA,W,W,W]],
      [48,11,[V,SA,SA,W,W,W,W,SA,'fire_coral_fan',W,W]],
      [49,11,[V,SA,SA,SA,'horn_coral',W,W,SA,'horn_coral_fan',W,W]],
      [50,11,[V,SA,SA,'fire_coral',W,W,W,SA,SA,W,W]],
      [51,11,[V,SA,SA,'bubble_coral',W,W,W,SA,W,W,W]],
      [52,11,[V,SA,W,W,W,W,W,SA,'bubble_coral_fan',W,W]],
      [53,11,[V,SA,W,W,W,W,W,SA,W,W,W]],
      [54,11,[V,SA,'kelp_1','kelp_2','kelp_3',W,W,W,W,W,W]],
      [55,11,[V,SA,SA,SA,W,W,W,W,W,W,W]],
      [56,11,[V,SA,SA,SA,SA,SA,W,W,W,W,W]],
      [57,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [58,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [59,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      // 第4屏
      [60,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [61,11,[V,SA,SA,W,W,W,W,W,W,SA,W]],
      [62,11,[V,SA,SA,'fire_coral',W,W,W,W,V,SA,W]],
      [63,11,[V,V,SA,'horn_coral',W,W,W,W,V,SA,'fire_coral_fan']],
      [64,11,[V,V,SA,'bubble_coral',W,W,W,W,SA,SA,W]],
      [65,11,[V,V,SA,SA,W,W,W,W,SA,W,W]],
      [66,11,[V,V,SA,SA,'fire_coral',W,W,W,SA,'bubble_coral_fan',W]],
      [67,11,[V,SA,SA,'bubble_coral_fan',W,W,W,W,SA,W,W]],
      [68,11,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,W]],
      [69,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [70,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [71,11,[V,SA,'fire_coral_fan',W,W,W,W,W,W,W,W]],
      [72,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [73,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [74,11,[V,V,SA,'bubble_coral_fan',W,W,W,W,W,W,W]],
      [75,11,[V,T.DIAMOND,SA,'fire_coral',W,W,W,W,W,W,W]],
      [76,11,[V,V,SA,SA,SA,SA,W,W,W,W,W]],
      [77,11,[V,SA,SA,SA,SA,W,W,W,W,W,W]],
      [78,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [79,11,[V,SA,'horn_coral_fan',W,W,W,W,W,SA,'horn_coral',W]],
      // 第5屏
      [80,11,[V,SA,'bubble_coral_fan',W,W,W,W,W,SA,SA,'fire_coral']],
      [81,11,[V,SA,W,W,W,W,W,W,SA,SA,W]],
      [82,11,[V,SA,W,W,W,W,W,W,SA,W,W]],
      [83,11,[V,SA,SA,'kelp_1','kelp_2','kelp_3',W,W,SA,W,W]],
      [84,11,[V,SA,SA,W,W,W,W,W,SA,'tall_seagrass_1','tall_seagrass_2']],
      [85,11,[V,V,SA,'bubble_coral',W,W,W,W,W,W,W]],
      [86,11,[V,V,SA,SA,W,W,W,W,W,W,W]],
      [87,11,[V,V,SA,SA,'horn_coral_fan',W,W,W,W,W,W]],
      [88,11,[V,SA,SA,'fire_coral_fan',W,W,W,W,W,W,W]],
      [89,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [90,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [91,11,[V,SA,'tall_seagrass_1','tall_seagrass_2',W,W,W,W,W,W,W]],
      [92,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [93,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [94,11,[V,SA,SA,'bubble_coral',W,W,W,W,SA,'bubble_coral_fan',W]],
      [95,11,[V,SA,SA,SA,W,W,W,W,SA,SA,'seagrass']],
      [96,11,[V,SA,SA,SA,SA,W,W,W,V,SA,W]],
      [97,11,[V,V,SA,SA,SA,W,W,W,V,SA,'horn_coral']],
      [98,11,[V,V,V,SA,SA,W,W,W,W,SA,'fire_coral']],
      [99,11,[V,V,SA,SA,SA,'horn_coral_fan',W,W,W,SA,W]],
      // 第6屏
      [100,11,[V,V,SA,SA,'kelp_1','kelp_2','kelp_3',W,W,W,W]],
      [101,11,[V,V,SA,SA,'fire_coral_fan',W,W,W,W,W,W]],
      [102,11,[V,V,SA,SA,W,W,W,W,W,W,W]],
      [103,11,[V,SA,SA,'bubble_coral',W,W,W,W,W,W,W]],
      [104,11,[V,SA,SA,'horn_coral_fan',W,W,W,W,W,W,W]],
      [105,11,[V,SA,SA,'fire_coral',W,W,W,W,W,W,W]],
      [106,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [107,11,[V,SA,W,W,W,W,W,SA,W,W,W]],
      [108,11,[V,SA,SA,W,W,W,W,SA,'fire_coral_fan',W,W]],
      [109,11,[V,SA,W,W,W,W,W,SA,'seagrass',W,W]],
      [110,11,[V,SA,SA,'seagrass',W,W,W,SA,SA,W,W]],
      [111,11,[V,V,SA,SA,W,W,W,SA,SA,W,W]],
      [112,11,[V,V,SA,SA,'horn_coral',W,W,V,SA,'bubble_coral_fan',W]],
      [113,11,[V,SA,SA,W,W,W,W,W,SA,W,W]],
      [114,11,[V,SA,'bubble_coral',W,W,W,W,W,W,W,W]],
      [115,11,[V,SA,'fire_coral_fan',W,W,W,W,W,W,W,W]],
      [116,11,[V,SA,W,W,W,W,W,W,W,W,W]],
      [117,11,[V,SA,SA,'fire_coral',W,W,W,W,W,W,W]],
      [118,11,[V,SA,SA,W,W,W,W,W,W,W,W]],
      [119,11,[V,V,SA,SA,W,W,W,W,W,W,W]],
    ];
    terrain.forEach(([col, h, tiles]) => this.addTerrainColumn(col, h, tiles));

    // 辅助函数：获取“最高地表” y 坐标（通常用于放置物体/敌人）
    const groundY = (col) => this.terrainHeights[col];

    // 辅助函数：获取“底层地面” y 坐标（忽略中间悬空台阶）
    const baseGroundY = (col) => {
      const column = this.tileMap[col];
      if (!column || column.length === 0) return this.terrainHeights[col];

      const baseY = 360;
      let lastSolidRow = -1;

      for (let row = 0; row < column.length; row++) {
        const t = column[row];
        if (t === T.NONE || t === undefined) {
          // 已经过了一段连续地面，再遇到空格说明“底层地面”结束
          if (lastSolidRow !== -1) break;
          continue;
        }
        // 仍在底部连续地面区域内，记录最后一行
        lastSolidRow = row;
      }

      if (lastSolidRow === -1) return this.terrainHeights[col];
      return baseY - (lastSolidRow + 1) * TILE_SIZE;
    };

    const solidSurfaceY = (col) => this.getSolidSurfaceY(col) ?? groundY(col);

    // ===== 敌人和物品生成（基于当前地形）=====
    this.enemies.push(new Drowned(6 * TILE_SIZE - 16, 96, 64, 64));
    this.enemies.push(new Drowned(17 * TILE_SIZE - 16, 32, 64, 64));
    this.enemies.push(new Drowned(39 * TILE_SIZE - 16, 96, 64, 64));
    this.enemies.push(new Drowned(52 * TILE_SIZE - 16, 232, 64, 64));
    this.enemies.push(new Shark(15 * TILE_SIZE, 150, 84, 68));
    this.enemies.push(new Shark(33 * TILE_SIZE, 140, 84, 68));
    this.enemies.push(new Shark(60 * TILE_SIZE, 125, 84, 68));
    this.enemies.push(new Shark(91 * TILE_SIZE, 125, 84, 68));
    this.enemies.push(new Shark(115 * TILE_SIZE, 110, 84, 68));

    // 污染物（进入关卡时直接贴到实体地形表面）
   // this.items.push(new Pollutant(40 * TILE_SIZE + 4, solidSurfaceY(40) - 18, 24, 18, "plastic_bottle"));
   // this.items.push(new Pollutant(46 * TILE_SIZE + 4, solidSurfaceY(46) - 18, 24, 18, "plastic_bag"));
   // this.items.push(new Pollutant(60 * TILE_SIZE + 4, solidSurfaceY(60) - 18, 24, 18, "plastic_bottle"));

    // 工具（平台上 + 地面上，居中放置）Tool(x, y, w, h, toolType)
    const toolOffset = (TILE_SIZE - 24) / 2;
    this.items.push(new Tool(7 * TILE_SIZE + toolOffset, 360 - 2 * TILE_SIZE, 24, 24, 'scissor'));
    this.items.push(new Tool(53 * TILE_SIZE + toolOffset, 360 - 2 * TILE_SIZE, 24, 24, 'scissor'));
    this.items.push(new Tool(37 * TILE_SIZE + toolOffset, solidSurfaceY(37) - 24, 24, 24, 'wrench'));
    this.items.push(new Tool(104 * TILE_SIZE + toolOffset, solidSurfaceY(104) - 24, 24, 24, 'wrench'));

    // 第48列海龟事件：初始静止，解锁条件为上方 47/48/49 三个铁栏杆全部被 wrench 拆除
    const turtleW = 62;
    const turtleH = 32;
    const turtleCol = 48;
    const turtleX = turtleCol * TILE_SIZE + (TILE_SIZE - turtleW) / 2;
    const turtleSurfaceY = this.getSolidSurfaceY(turtleCol) ?? groundY(turtleCol);
    const turtleY = turtleSurfaceY - turtleH;
    const turtle = new Turtle(turtleX, turtleY, turtleW, turtleH);
    this.items.push(turtle);

    const bars = [47, 48, 49].map(col => {
      const barSurfaceY = this.getSolidSurfaceY(col) ?? groundY(col);
      return new IronBar(col * TILE_SIZE, barSurfaceY - TILE_SIZE, TILE_SIZE, TILE_SIZE, turtle);
    });
    bars.forEach(bar => this.items.push(bar));
    turtle.bindBars(bars);

    // 第97列海龟事件：初始静止，解锁条件为上方 96/97/98 三个铁栏杆全部被 wrench 拆除
    const turtle97W = 62;
    const turtle97H = 32;
    const turtle97Col = 97;
    const turtle97X = turtle97Col * TILE_SIZE + (TILE_SIZE - turtle97W) / 2;
    const turtle97SurfaceY = this.getBaseSolidSurfaceY(turtle97Col) ?? groundY(turtle97Col);
    const turtle97Y = turtle97SurfaceY - turtle97H;
    const turtle97 = new Turtle(turtle97X, turtle97Y, turtle97W, turtle97H);
    this.items.push(turtle97);

    const bars97 = [96, 97, 98].map(col => {
      const barSurfaceY = this.getBaseSolidSurfaceY(col) ?? groundY(col);
      return new IronBar(col * TILE_SIZE, barSurfaceY - TILE_SIZE, TILE_SIZE, TILE_SIZE, turtle97);
    });
    bars97.forEach(bar => this.items.push(bar));
    turtle97.bindBars(bars97);

    // 第8列 fish 事件：在 fishing_net 范围中生成5条鱼，剪网后全部上浮并巡逻
    const fish8W = 32;
    const fish8H = 32;
    // 手动调整第8列5条鱼各自的巡逻范围（像素，按 fish8Offsets 顺序对应）
    const fish8PatrolRanges = [
      10 * TILE_SIZE,
      6 * TILE_SIZE,
      11 * TILE_SIZE,
      9 * TILE_SIZE,
      7 * TILE_SIZE
    ];
    // 手动调整第8列5条鱼各自的上移距离（网被破坏后，像素，按 fish8Offsets 顺序对应）
    const fish8RiseDistances = [
      0 * TILE_SIZE,
      2 * TILE_SIZE,
      0.5 * TILE_SIZE,
      1.5 * TILE_SIZE,
      0.7 * TILE_SIZE
    ];
    const net8X = 7 * TILE_SIZE;
    const fish8Offsets = [0, 20, 40, 64, 84];
    const fish8VerticalOffsets = [0, -40, -12, -25, -20];
    const fish8List = fish8Offsets.map((offsetX, idx) => {
      const fishX = net8X + offsetX;
      const centerCol = Math.floor((fishX + fish8W / 2) / TILE_SIZE);
      const fishSurfaceY = this.getSolidSurfaceY(centerCol) ?? groundY(centerCol);
      const fishY = fishSurfaceY - fish8H + fish8VerticalOffsets[idx];
      const f = new Fish(fishX, fishY, fish8W, fish8H);
      f.setPatrolRange(fish8PatrolRanges[idx] ?? 4 * TILE_SIZE);
      f.setReleaseRiseDistance(fish8RiseDistances[idx] ?? 2 * TILE_SIZE);
      this.items.push(f);
      return f;
    });

    const net8H = 3 * TILE_SIZE;
    const net8SurfaceY = this.getSolidSurfaceY(8) ?? groundY(8);
    const net8Y = net8SurfaceY - net8H;
    const fishingNet8 = new FishingNet(net8X, net8Y, 4 * TILE_SIZE, net8H, fish8List);
    this.items.push(fishingNet8);
    fish8List.forEach(f => f.bindNet(fishingNet8));

    // 第69列 fish 事件：在 fishing_net 范围中生成7条鱼，剪网后全部上浮并巡逻
    const fish69W = 32;
    const fish69H = 32;
    // 手动调整第69列7条鱼各自的巡逻范围（像素，按 fish69Offsets 顺序对应）
    const fish69PatrolRanges = [
      1 * TILE_SIZE,
      1 * TILE_SIZE,
      15 * TILE_SIZE,
      4 * TILE_SIZE,
      8 * TILE_SIZE,
      6 * TILE_SIZE,
      5 * TILE_SIZE
    ];
    // 手动调整第69列7条鱼各自的上移距离（网被破坏后，像素，按 fish69Offsets 顺序对应）
    const fish69RiseDistances = [
      1 * TILE_SIZE,
      5 * TILE_SIZE,
      4 * TILE_SIZE,
      2 * TILE_SIZE,
      3 * TILE_SIZE,
      2.5 * TILE_SIZE,
      4.7 * TILE_SIZE
    ];
    const net69X = 68 * TILE_SIZE;
    const fish69Offsets = [0, 16, 32, 48, 64, 80, 96];
    const fish69VerticalOffsets = [0, -16, -30, -10, -24, -6, -20];
    const fish69List = fish69Offsets.map((offsetX, idx) => {
      const fishX = net69X + offsetX;
      const centerCol = Math.floor((fishX + fish69W / 2) / TILE_SIZE);
      const fishSurfaceY = this.getSolidSurfaceY(centerCol) ?? groundY(centerCol);
      const fishY = fishSurfaceY - fish69H + fish69VerticalOffsets[idx];
      const f = new Fish(fishX, fishY, fish69W, fish69H);
      f.setPatrolRange(fish69PatrolRanges[idx] ?? 4 * TILE_SIZE);
      f.setReleaseRiseDistance(fish69RiseDistances[idx] ?? 2 * TILE_SIZE);
      this.items.push(f);
      return f;
    });

    const net69H = 3 * TILE_SIZE;
    const net69SurfaceY = this.getSolidSurfaceY(69) ?? groundY(69);
    const net69Y = net69SurfaceY - net69H;
    const fishingNet69 = new FishingNet(net69X, net69Y, 4 * TILE_SIZE, net69H, fish69List);
    this.items.push(fishingNet69);
    fish69List.forEach(f => f.bindNet(fishingNet69));

    //增加第二关的恢复道具贝壳
    this.items.push(new Hp(22 * TILE_SIZE + 4, solidSurfaceY(25) - 24, 24, 24, 'seashell'));
    this.items.push(new Hp(33 * TILE_SIZE + 4, solidSurfaceY(33) - 24, 24, 24, 'seashell'));
    this.items.push(new Hp(47 * TILE_SIZE + 4, solidSurfaceY(33) - 24, 24, 24, 'seashell'));
    this.items.push(new Hp(58 * TILE_SIZE + 4, solidSurfaceY(58) - 24, 24, 24, 'seashell'));
    this.items.push(new Hp(90 * TILE_SIZE + 4, solidSurfaceY(90) - 24, 24, 24, 'seashell'));

    //海豚生成
    this.items.push(new Dolphin(40 * TILE_SIZE, 120));

    // ===== 结束：敌人和物品生成 =====
  }

  addTreeColumn(col, heightTiles, tiles) {
    // 已废弃：现在统一使用 addTerrainColumn
    console.warn('addTreeColumn is deprecated, use addTerrainColumn instead');
  }

  drawTrees() {
    // 水关：treeColumns 既包含树木，也包含水下植物/珊瑚，只做装饰，不参与碰撞
    if (!this.treeColumns) return;

    const spriteMap = {
      log: window.tile_oak_log,
      leaves: window.tile_oak_leaves,
      dandelion: window.tile_dandelion,
      orange_tulip: window.tile_orange_tulip,
      pink_tulip: window.tile_pink_tulip,
      poppy: window.tile_poppy,
      red_mushroom: window.tile_red_mushroom,
      red_tulip: window.tile_red_tulip,
      brown_mushroom: window.tile_brown_mushroom,
      seagrass: window.tile_seagrass,
      tall_seagrass_1: window.tile_tall_seagrass_1,
      tall_seagrass_2: window.tile_tall_seagrass_2,
      tube_coral: window.tile_tube_coral,
      tube_coral_fan: window.tile_tube_coral_fan,
      horn_coral: window.tile_horn_coral,
      horn_coral_fan: window.tile_horn_coral_fan,
      fire_coral: window.tile_fire_coral,
      fire_coral_fan: window.tile_fire_coral_fan,
      bubble_coral: window.tile_bubble_coral,
      bubble_coral_fan: window.tile_bubble_coral_fan,
      brain_coral: window.tile_brain_coral,
      brain_coral_fan: window.tile_brain_coral_fan,
      kelp_1: window.tile_kelp_1,
      kelp_2: window.tile_kelp_2,
      kelp_3: window.tile_kelp_3,
      kelp_4: window.tile_kelp_4,
      kelp_5: window.tile_kelp_5
    };

    push();
    imageMode(CORNER);

    for (let col = 0; col < this.treeColumns.length; col++) {
      const column = this.treeColumns[col] || [];
      for (let i = 0; i < column.length; i++) {
        const kind = column[i];
        if (!kind || kind === T.NONE) continue;

        const x = col * TILE_SIZE;
        const y = 360 - (i + 1) * TILE_SIZE;

        const img = spriteMap[kind];
        if (img && img.width > 0) {
          image(img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          noStroke();
          if (kind === 'log') {
            fill(120, 86, 54);
          } else if (kind === 'leaves' || kind.startsWith('kelp') || kind.includes('seagrass')) {
            fill(60, 140, 70, 230);
          } else if (kind.includes('fire')) {
            fill(220, 80, 60, 230);
          } else if (kind.includes('bubble')) {
            fill(200, 80, 210, 230);
          } else if (kind.includes('brain')) {
            fill(230, 120, 190, 230);
          } else if (kind.includes('horn')) {
            fill(230, 210, 80, 230);
          } else if (kind.includes('tube')) {
            fill(80, 120, 220, 230);
          } else {
            fill(80, 150, 120, 230);
          }
          rect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    pop();
  }

  addTerrainColumn(col, heightTiles, tiles) {
    // 统一处理：地形、树木、水下装饰
    // - 数组从底部往上：tiles[0] 是最底下那格
    // - 地形贴图（G/D/S/X/矿石/LAVA/ACID）：创建碰撞平台
    // - 树木 / 水下植物（字符串标记）：只绘制，不碰撞
    // - T.NONE：空格子
    
    const baseY = 360;
    if (!this.treeColumns) this.treeColumns = Array.from({ length: TERRAIN_COLS }, () => []);
    
    // 找到第一个非 T.NONE/装饰 的地形块，作为地表高度
    let terrainHeight = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const isBackground =
        tile === 'log' || tile === 'leaves' ||
        tile === 'dandelion' || tile === 'orange_tulip' || tile === 'pink_tulip' ||
        tile === 'poppy' || tile === 'red_mushroom' || tile === 'red_tulip' || tile === 'brown_mushroom' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5';

      if (tile !== T.NONE && !isBackground) {
        terrainHeight = i + 1;
      }
    }
    
    if (terrainHeight > 0) {
      const surfaceY = baseY - terrainHeight * TILE_SIZE;
      this.terrainHeights[col] = surfaceY;
    }
    
    // 逐格处理
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const y = baseY - (i + 1) * TILE_SIZE;
      
      if (tile === T.NONE || tile === undefined || tile === null) continue;
      
      // 树木 / 水下装饰：只记录到 treeColumns，不创建平台
      if (
        tile === 'log' || tile === 'leaves' ||
        tile === 'dandelion' || tile === 'orange_tulip' || tile === 'pink_tulip' ||
        tile === 'poppy' || tile === 'red_mushroom' || tile === 'red_tulip' || tile === 'brown_mushroom' ||
        tile === 'seagrass' || tile === 'tall_seagrass_1' || tile === 'tall_seagrass_2' ||
        tile === 'tube_coral' || tile === 'tube_coral_fan' ||
        tile === 'horn_coral' || tile === 'horn_coral_fan' ||
        tile === 'fire_coral' || tile === 'fire_coral_fan' ||
        tile === 'bubble_coral' || tile === 'bubble_coral_fan' ||
        tile === 'brain_coral' || tile === 'brain_coral_fan' ||
        tile === 'kelp_1' || tile === 'kelp_2' ||
        tile === 'kelp_3' || tile === 'kelp_4' || tile === 'kelp_5'
      ) {
        if (!this.treeColumns[col]) this.treeColumns[col] = [];
        this.treeColumns[col][i] = tile;
        continue;
      }

      // 水：只绘制，不创建碰撞平台
      if (tile === T.WATER) {
        const row = i;
        this.tileMap[col][row] = tile;
        continue;
      }
      
      // 其它地形：创建碰撞平台
      const row = i;
      this.tileMap[col][row] = tile;
      const platform = new Platform(col * TILE_SIZE, y, TILE_SIZE, TILE_SIZE, terrainHeight > 0);
      platform._col = col;
      platform._row = row;
      platform._tileType = tile;
      platform.collisionRects = buildTileCollisionRects(tile, col * TILE_SIZE, y);
      this.platforms.push(platform);
      if (!this.terrainBlocks[col]) this.terrainBlocks[col] = [];
      this.terrainBlocks[col][row] = platform;
    }
  }

  // 在水关中，整个屏幕都采用水中物理；
  // 地形方块仅承担碰撞/阻挡，不影响是否处于水中。
  isWaterAtWorld(wx, wy) {
    return true;
  }

  draw() {
    // ===== 底层：整屏水背景（仅视觉效果，不影响碰撞和判定）=====
    const waterImg = window.tile_water;
    const tileW = TILE_SIZE;
    const tileH = TILE_SIZE;

    if (waterImg && waterImg.width > 0) {
      // 用水贴图在整个关卡宽度范围内平铺
      for (let y = 0; y < CANVAS_H; y += tileH) {
        for (let x = 0; x < WORLD_WIDTH; x += tileW) {
          image(waterImg, x, y, tileW, tileH);
        }
      }
    } else {
      // 贴图加载失败时，用纯色填充背景水层
      noStroke();
      fill(80, 140, 255);
      rect(0, 0, WORLD_WIDTH, CANVAS_H);
    }

    // ===== 上层：正常地形（沙子/石头/水池等），逻辑与判定保持不变 =====
    for (let col = 0; col < TERRAIN_COLS; col++) {
      for (let row = 0; row < (this.tileMap[col]?.length || 0); row++) {
        const type = this.tileMap[col][row];
        if (type === T.NONE || type === undefined) continue;
        const y = 360 - (row + 1) * TILE_SIZE; // 从底部往上
        drawTile(type, col * TILE_SIZE, y);
      }
    }

    // 背景树：画在地形之后、实体之前（纯背景，无碰撞/交互）
    this.drawTrees();

    // 绘制浮空平台、敌人、物品（生命值≤0 的敌人不绘制，已在 checkCollisions 中从列表移除）
    this.platforms.filter(p => !p.isTerrain).forEach(p => p.draw());
    this.enemies.filter(e => !e.isDead).forEach(e => e.draw());
    this.items.forEach(it => it.draw());
  }
}

// ====== Platform 类 ======
class Platform {
  constructor(x, y, w, h, isTerrain = false) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.isTerrain = isTerrain;
  }

  draw() {
    if (this._tileType !== undefined) {
      drawTile(this._tileType, this.x, this.y);
    } else if (this.tiles) {
      this.tiles.forEach((t, i) => drawTile(t, this.x, this.y + i * TILE_SIZE));
    } else {
      const img = window.grassBlock;
      if (img && img.width > 0) {
        for (let y = this.y; y < this.y + this.h; y += TILE_SIZE)
          for (let x = this.x; x < this.x + this.w; x += TILE_SIZE)
            image(img, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        fill(120, 80, 40);
        rect(this.x, this.y, this.w, this.h);
      }
    }
  }
}

// ====== Entity 基类 ======
class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.collisionW = w;
    this.collisionH = h;
    this.collisionOffsetX = 0;
    this.collisionOffsetY = 0;
  }

  getCollisionBox() {
    return {
      x: this.x + this.collisionOffsetX,
      y: this.y + this.collisionOffsetY,
      w: this.collisionW,
      h: this.collisionH
    };
  }

  collidesWith(obj) {
    if (!obj) return false;
    const a = this.getCollisionBox();
    const b = typeof obj.getCollisionBox === 'function'
      ? obj.getCollisionBox()
      : { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
    return rectCollision(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h);
  }
}

// ====== Player 类 ======
class Player extends Entity {
  constructor(x, y) {
    super(x, y, 32, 64);
    Object.assign(this, { vx: 0, vy: 0, speed: 2, jumpForce: -6.32, gravity: 0.5, onGround: false, maxHealth: 5, health: 5, inventory: [], facingRight: true });
    this.equippedWeaponType = 'wooden_sword';  // 手持武器，通过挖掘对应矿石升级
    
    this.isAttacking = false;
    this.attackAnimStart = 0;
    this.attackAnimDuration = 150; // 挥剑持续时间，毫秒

    // 第二关海洋图里海豚磁铁状态
    this.hasDolphinMagnet = false;
    this.activeDolphin = null;
    this.dolphinUsed = false;

    // 碰撞箱尺寸（独立于贴图尺寸）
    this.collisionW = 16;
    this.collisionH = 50;
    this.collisionOffsetX = (this.w - this.collisionW) / 2;  // 水平居中：(32-24)/2 = 4
    this.collisionOffsetY = this.h - this.collisionH;  // 底部对齐

    this.score = 0;
    this.selectedSlot = -1;   // 当前鼠标选中的背包格子
    this.maxJumps = 2;
    this.jumpsRemaining = this.maxJumps;

    this.onLadder = false;      //与梯子交互
    this.activeLadder = null;
    this.climbSpeed = 2.1;

    // 步伐节流 + 记录脚下材质
    this._nextFootstepAt = 0;
    this._groundTileType = T.NONE;
    this._footstepDebugPrinted = false;
    this._touchingLiquidLike = false;
    this._liquidProbeNextAt = 0;
  }
  
  isInWater(level) {
    return isEntityInWater(this, level);
  }
  
  findTouchingLadder(level) {
    if (!level) return null;
    const box = this.getCollisionBox();

    for (const item of level.items) {
      if (!(item instanceof Ladder)) continue;

      const probeX = item.x + 4;
      const probeW = item.w - 8;

      // 上下多给一点余量：防止爬到顶部附近突然丢失 ladder 状态
      const probeY = item.y - 10;
      const probeH = item.h + 20;

      if (rectCollision(box.x, box.y, box.w, box.h, probeX, probeY, probeW, probeH)) {
        return item;
      }
    }

    return null;
  }

  updateLadderState(level) {
    const ladder = this.findTouchingLadder(level);
    this.activeLadder = ladder;
    this.onLadder = !!ladder;
    return ladder;
  }

  update(platforms, level) {
    const prevOnGround = this.onGround;
    const prevVy = this.vy;
    const restrictTopByCollisionBox = (level instanceof WaterLevel) || (level instanceof FactoryLevel);
    const minPlayerY = -this.collisionOffsetY;

    // WASD：水平 A/D、垂直 W/S 均读物理键（Key*），与 keys[] / 事件顺序解耦
    const vert = readVerticalMoveIntent();
    const crouchHeld = vert.down;
    const moveH = readHorizontalMoveIntent();

    if (this.onGround) {
      this.vx = moveH * this.speed;
    } else if (moveH !== 0) {
      this.vx = moveH * this.speed;
    } else {
      this.vx *= 0.85;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // 空中控制加成：在空中时水平移动速度提升 20%（水关禁用）
    if (!(level instanceof WaterLevel) && !this.onGround && moveH !== 0) {
      this.vx *= 1.2;
    }
    
    if (this.vx !== 0) this.facingRight = this.vx > 0;

    const ladder = this.updateLadderState(level);
    const climbUp = vert.up;
    const climbDown = vert.down;

  if (ladder) {
    const ladderCenterX = ladder.x + ladder.w / 2;
    const playerCenterOffset = this.collisionOffsetX + this.collisionW / 2;

    const box = this.getCollisionBox();
    const playerFeetY = box.y + box.h;
    const playerHeadY = box.y;
    const ladderTopY = ladder.y;
    const ladderBottomY = ladder.y + ladder.h;

    const leftHeld = !!(keys['a'] || keys['arrowleft']);
    const rightHeld = !!(keys['d'] || keys['arrowright']);
    const horizontalHeld = leftHeld || rightHeld;

    // 顶部容差调大一点：到达顶端附近就把玩家放到平台上
    const topSnapTolerance = 14;
    const nearLadderTop = Math.abs(playerFeetY - ladderTopY) <= topSnapTolerance;

    // 只要人物还和梯子有接触，就允许挂在梯子上，不要松开 W 就掉落
    const stillInsideLadderY = playerHeadY < ladderBottomY && playerFeetY > ladderTopY;

    const canClimbDown = climbDown && playerFeetY < ladderBottomY - 2;

    // 到梯子顶端：直接吸附到平台顶面
    if (nearLadderTop && !climbDown) {
      this.y = ladderTopY - this.collisionH - this.collisionOffsetY;
      this.vy = 0;
      this.onGround = true;
      this.jumpsRemaining = this.maxJumps;

      // 不按左右时停住；按左右时允许离开梯子顶端
      if (!horizontalHeld) {
        this.vx = 0;
        return;
      }

      // 按左右时不要 return，后面会继续走水平碰撞
    } else if (climbUp || canClimbDown || stillInsideLadderY) {
      // 还在梯子主体上：禁用重力，让玩家挂住
      this.vy = 0;
      this.onGround = false;

      // 只有按上下时才吸附到梯子中心线
      if (climbUp || canClimbDown) {
        this.x = ladderCenterX - playerCenterOffset;
      }

      if (climbUp) {
        this.y -= this.climbSpeed;
      }

      if (canClimbDown) {
        this.y += this.climbSpeed;
      }

      // 允许在梯子上横向移动，方便从底部/中间离开
      let ladderDx = 0;

      if (movementKeyPhysicallyDown('a')) {
        ladderDx = -this.speed * 0.45;
        this.facingRight = false;
      }

      if (movementKeyPhysicallyDown('d')) {
        ladderDx = this.speed * 0.45;
        this.facingRight = true;
      }

      if (ladderDx !== 0) {
        this.moveWithCollision(platforms, ladderDx, 0, true);
      }

      this.x = constrain(this.x, 0, WORLD_WIDTH - this.w);
      if (restrictTopByCollisionBox && this.y < minPlayerY) {
        this.y = minPlayerY;
        if (this.vy < 0) this.vy = 0;
      }

      return;
    }
  }

    const inWater = this.isInWater(level);
    if (inWater) {
      // 统一水中物理：重力 + 浮力 + 阻力
      this.vy += WATER_GRAVITY - WATER_BUOYANCY;
      this.vx *= WATER_DRAG;
      this.vy *= WATER_DRAG;
      // 玩家输入额外影响垂直速度（保留上浮/下潜手感）
      if (vert.up) this.vy -= 0.38;
      if (crouchHeld) this.vy += 0.20;
      this.vy = constrain(this.vy, -1.8, 1.8);
    } else {
      this.vy += this.gravity;
    }

    if (level && typeof level.applyBlueFlowForceToPlayer === 'function') {
      level.applyBlueFlowForceToPlayer(this);
    }

    // 水平移动：分步移动防止穿墙
    this.moveWithCollision(platforms, this.vx, 0, true);
    this.x = constrain(this.x, 0, WORLD_WIDTH - this.w);

    // 垂直移动：分步移动防止穿墙
    this.onGround = false;
    this.moveWithCollision(platforms, 0, this.vy, false);
    
    // 即使没有垂直移动，也要检测脚下是否有地面
    const isWaterStage = level instanceof WaterLevel;
    const groundSnapVyThreshold = isWaterStage ? 0.03 : 0.1;
    if (!this.onGround && Math.abs(this.vy) < groundSnapVyThreshold) {
      this.checkGroundStatus(platforms, level);
    }

    // 世界下边界：防止掉出画布（即使底部全是水/无碰撞）
    const maxY = CANVAS_H + 64;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
      this.jumpsRemaining = this.maxJumps;
    }

    // 第二/三关：碰撞箱顶部不超出屏幕上缘
    if (restrictTopByCollisionBox && this.y < minPlayerY) {
      this.y = minPlayerY;
      if (this.vy < 0) this.vy = 0;
    }

    // ====== 跳落地音效：从空中 -> 落地的瞬间触发 ======
    if (!prevOnGround && this.onGround && !inWater && !this.onLadder && prevVy > 0.2) {
      tryPlaySfx('fall', { volume: 0.34, rate: 1 });
    }

    // ====== 液体/蓝色水流接触音效：仅 water/水管蓝色方块 ======
    // 液体接触检测做低频采样，避免每帧重复扫蓝色流体区域导致卡顿
    const nowMs = millis();
    if (nowMs >= (this._liquidProbeNextAt ?? 0)) {
      this._touchingLiquidLike =
        !!inWater ||
        isEntityTouchingBlueFlow(this, level);
      this._liquidProbeNextAt = nowMs + 90;
    } else if (!inWater && this._touchingLiquidLike) {
      // 水体状态退出时尽快刷新，避免缓存残留
      this._touchingLiquidLike =
        isEntityTouchingBlueFlow(this, level);
    } else if (inWater) {
      this._touchingLiquidLike = true;
    }

    // 仅在“接触液体/蓝色方块 + 玩家正在移动”时播放 swim
    const isMovingInLiquid = Math.abs(this.vx) > 0.12 || Math.abs(this.vy) > 0.12;
    if (this._touchingLiquidLike && isMovingInLiquid) {
      tryPlaySfx('swim', { volume: 0.26, rate: 1 });
    }

    // ====== 步伐音效：在地面上且水平移动时，按固定步频触发 ======
    // 不在水关播放“脚步”，避免在水里像走路一样响
    if (!(level instanceof WaterLevel) && this.onGround && Math.abs(this.vx) > 0.25) {
      const now = millis();
      if (now >= (this._nextFootstepAt ?? 0)) {
        if (!canUseSound()) {
          console.warn('[SFX] p5.sound not available (loadSound/userStartAudio missing)');
        }
        // 优先使用碰撞落地时记录的地面类型；否则用脚下坐标再查一次
        let tileType = this._groundTileType;
        if (tileType === T.NONE || tileType === undefined || tileType === null) {
          const feetX = this.x + this.collisionOffsetX + this.collisionW / 2;
          const feetY = this.y + this.collisionOffsetY + this.collisionH + 1;
          tileType = level?.getTileTypeAtWorld?.(feetX, feetY) ?? T.NONE;
        }
        const key = tileTypeToFootstepKey(tileType);
        const speedFactor = constrain(Math.abs(this.vx) / (this.speed || 1), 0.7, 1.35);
        if (SFX.debug && !this._footstepDebugPrinted) {
          this._footstepDebugPrinted = true;
          console.log(
            '[SFX] first footstep attempt:',
            'key=', key,
            'tileType=', tileType,
            'loadedCount=', getLoadedSoundCount(key),
            'audioState=', (typeof getAudioContext === 'function' ? getAudioContext()?.state : 'n/a')
          );
        }
        tryPlaySfx(key, { volume: 0.28, rate: speedFactor });

        // 步频：速度越快，间隔越短（单位 ms）
        const baseInterval = 210;
        this._nextFootstepAt = now + baseInterval / speedFactor;
      }
    } else {
      // 停止走动后稍微延后，避免抖动导致极密集触发
      this._nextFootstepAt = millis() + 60;
    }
  }

  // 分步移动：将大的移动量拆分成多个小步，每步都检测碰撞
  moveWithCollision(platforms, dx, dy, horizontal) {
    const maxStepSize = 0.5; // 每步最多移动0.5像素，确保不会穿过任何方块
    const totalDistance = Math.abs(horizontal ? dx : dy);
    const steps = Math.ceil(totalDistance / maxStepSize);
    
    if (steps === 0) return;
    
    const stepX = dx / steps;
    const stepY = dy / steps;
    
    for (let i = 0; i < steps; i++) {
      // 先尝试移动
      const oldX = this.x;
      const oldY = this.y;
      
      if (horizontal) {
        this.x += stepX;
      } else {
        this.y += stepY;
      }
      
      // 移动后检测碰撞
      const collided = this.checkCollision(platforms, horizontal);
      
      // 如果发生碰撞，回退并停止
      if (collided) {
        this.x = oldX;
        this.y = oldY;
        if (horizontal) this.vx = 0;
        else this.vy = 0;
        
        // 精确定位到碰撞边界
        this.resolveCollisionPrecise(platforms, horizontal);
        break;
      }
    }
  }

  // 检测当前位置是否与任何平台碰撞
  checkCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    for (let p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) {
          return true;
        }
      }
    }
    return false;
  }

  // 检测脚下是否有地面（用于静止时更新 onGround 状态）
  checkGroundStatus(platforms, level = null) {
    const box = this.getCollisionBox();
    // 检测脚下 1 像素处是否有平台
    const testY = box.y + box.h + 1;
    const isWaterStage = level instanceof WaterLevel;
    const groundProbeTolerance = isWaterStage ? 0.6 : 2;
    
    for (let p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (box.x < r.x + r.w && box.x + box.w > r.x) {
          if (Math.abs(testY - r.y) <= groundProbeTolerance) {
            this.onGround = true;
            this.jumpsRemaining = this.maxJumps;
            this.vy = 0;
            this._groundTileType = p?._tileType ?? T.NONE;
            return;
          }
        }
      }
    }
  }

  // 精确定位到碰撞边界
  resolveCollisionPrecise(platforms, horizontal) {
    const box = this.getCollisionBox();
    
    for (let p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (!rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) continue;

        // 调试：检测到 94-95 列附近的碰撞
        if (p._col >= 94 && p._col <= 96) {
          console.log(`碰撞修正: col=${p._col}, row=${p._row}, horizontal=${horizontal}, playerX=${this.x.toFixed(1)}, playerY=${this.y.toFixed(1)}, vy=${this.vy.toFixed(2)}`);
        }
        
        if (horizontal) {
          // 水平碰撞：调整玩家的 x（考虑偏移量）
          if (this.vx > 0) {
            this.x = r.x - this.collisionW - this.collisionOffsetX;
          } else {
            this.x = r.x + r.w - this.collisionOffsetX;
          }
          this.vx = 0;
        } else {
          if (this.vy > 0) { 
            this.y = r.y - this.h; 
            this.onGround = true; 
            this.jumpsRemaining = this.maxJumps; 
            this._groundTileType = p?._tileType ?? T.NONE;
          } else if (this.vy < 0) {
            this.y = r.y + r.h;
          }
          this.vy = 0;
        }
        return;
      }
    }
  }

  resolveCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    let collided = false;
    
    for (let p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (!rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) continue;
        collided = true;
        if (horizontal) {
          // 水平碰撞：调整玩家的 x（考虑偏移量）
          if (this.vx > 0) this.x = r.x - this.collisionW - this.collisionOffsetX;
          else this.x = r.x + r.w - this.collisionOffsetX;
          this.vx = 0;
        } else {
          if (this.vy > 0) { this.y = r.y - this.h; this.onGround = true; this.jumpsRemaining = this.maxJumps; this._groundTileType = p?._tileType ?? T.NONE; }
          else if (this.vy < 0) this.y = r.y + r.h;
          this.vy = 0;
        }
      }
    }
    
    return collided;
  }

  jump() {
    //在梯子上的跳跃动作
    if (this.onLadder) {
      this.onLadder = false;
      this.activeLadder = null;
      this.vy = this.jumpForce * 0.9;
      return;
    }

    if (this.jumpsRemaining <= 0) return;
    const isSecondJump = this.jumpsRemaining === 1;
    const boost = isSecondJump ? 1.35 : 1;
    this.vy = this.jumpForce * boost;
    this.onGround = false;
    this.jumpsRemaining -= 1;
  }

  collect(item) { if (this.inventory.length < INVENTORY_SLOTS) this.inventory.push(item); }
  takeDamage(amount) { this.health = max(0, this.health - amount); }

  startAttackAnimation() {
    this.isAttacking = true;
    this.attackAnimStart = millis();
  }
  draw() {
    const elapsed = millis() - this.attackAnimStart;
    const inAttackFrame = this.isAttacking && elapsed < this.attackAnimDuration;
    if (this.isAttacking && !inAttackFrame) this.isAttacking = false;
    const spriteKeyByWeapon = inAttackFrame
      ? {
          wooden_sword: 'alexSpriteWoodenSwordAttack',
          stone_sword: 'alexSpriteStoneSwordAttack',
          iron_sword: 'alexSpriteIronSwordAttack',
          diamond_sword: 'alexSpriteDiamondSwordAttack'
        }
      : {
          wooden_sword: 'alexSpriteWoodenSword',
          stone_sword: 'alexSpriteStoneSword',
          iron_sword: 'alexSpriteIronSword',
          diamond_sword: 'alexSpriteDiamondSword'
        };
    const spriteKey = spriteKeyByWeapon[this.equippedWeaponType] || (inAttackFrame ? 'alexSpriteWoodenSwordAttack' : 'alexSpriteWoodenSword');
    const img = window[spriteKey];
    const drawW = 128;
    const drawH = 64;
    const box = this.getCollisionBox();
    const drawCenterX = box.x + box.w / 2;
    const drawBottomY = box.y + box.h;
    const drawY = drawBottomY - drawH;
    if (img && img.width > 0) {
      push();
      imageMode(CENTER);
      translate(drawCenterX, drawY + drawH / 2);
      scale(this.facingRight ? 1 : -1, 1);
      image(img, 0, 0, drawW, drawH);
      pop();
    } else {
      fill(50, 100, 255);
      rect(drawCenterX - drawW / 2, drawY, drawW, drawH);
    }
    // 攻击表现改为切换玩家立绘，不再单独绘制 sword
  }
}

// ====== Enemy / Item / Pollutant 类 ======
const ENEMY_DEFAULT_HEALTH = 5;
const ENEMY_DETECT_RANGE = 4 * TILE_SIZE; // 4格检测范围
const ENEMY_SPEED = 1; // 敌人移动速度
const ENEMY_WATER_CHASE_SPEED_SCALE = 0.75; // 敌人在水中追踪时再降一档
const ENEMY_LOSE_TARGET_RANGE = ENEMY_DETECT_RANGE * 1.6; // 超出该范围后丢失目标
const ENEMY_HIT_KNOCKBACK_SPEED = 10; // 受玩家有效攻击时水平击退初速度（与追踪速度叠加，每帧衰减）
const ENEMY_HIT_KNOCKBACK_DECAY = 0.86; // 击退水平分量衰减（越大滑得越久）
const ENEMY_HIT_KNOCKBACK_UP = 5; // 受击时短暂上抛（加到 vy）
const ENEMY_HIT_KNOCKBACK_NUDGE_MAX = 12; // 受击时沿击退方向位移（像素），避开墙体时仍可见水平击退

class Enemy extends Entity {
  constructor(x, y, w, h, health = ENEMY_DEFAULT_HEALTH) {
    super(x, y, w, h);
    Object.assign(this, { health, maxHealth: health });
    this.activated = false; // 是否已被激活（玩家进入检测范围）
    this.hitKnockbackVx = 0; // 受击击退水平分量（每帧衰减，与 AI 目标速度相加）
    this.vyImpulsePending = 0; // 受击上抛（在下一帧 update 内合并进 vy，避免被飞行类覆盖）
    this.vx = 0; // 水平速度
    this.vy = 0; // 垂直速度
    this.gravity = 0.5; // 重力
    this.onGround = false; // 是否在地面上
    this.facingRight = true; // 朝向：true=右，false=左
    this.enteredAttackRangeAt = -1; // 进入攻击范围的时间（毫秒），-1表示未在范围内
    
    // 碰撞箱：24*64，居中底部对齐
    this.collisionW = 24;
    this.collisionH = 64;
    this.collisionOffsetX = (this.w - this.collisionW) / 2;  // 水平居中
    this.collisionOffsetY = this.h - this.collisionH;  // 底部对齐
  }
  
  decayHitKnockback() {
    this.hitKnockbackVx *= ENEMY_HIT_KNOCKBACK_DECAY;
    if (Math.abs(this.hitKnockbackVx) < 0.06) this.hitKnockbackVx = 0;
  }

  /** 受击时与地形碰撞箱是否重叠（用于位移击退） */
  _enemyBoxOverlapsPlatforms(platforms) {
    if (!platforms) return false;
    const box = this.getCollisionBox();
    for (const p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) return true;
      }
    }
    return false;
  }

  /** 沿击退方向平移，直到碰到地形或达到上限（贴墙/夹缝时仍保留速度击退尝试） */
  nudgeKnockbackPositionFromPlayer(player, platforms) {
    if (!player || !platforms || !Array.isArray(platforms)) return;
    const dir = player.facingRight ? 1 : -1;
    for (let s = 0; s < ENEMY_HIT_KNOCKBACK_NUDGE_MAX; s++) {
      this.x += dir;
      if (this._enemyBoxOverlapsPlatforms(platforms)) {
        this.x -= dir;
        break;
      }
    }
  }

  /** 玩家面朝方向为击退方向；由 takeDamage 在有效扣血后调用 */
  applyPlayerHitKnockback(player, level = null) {
    if (!player || this.isDead) return;
    const dir = player.facingRight ? 1 : -1;
    this.hitKnockbackVx += dir * ENEMY_HIT_KNOCKBACK_SPEED;
    this.hitKnockbackVx = constrain(this.hitKnockbackVx, -11, 11);
    this.vyImpulsePending += ENEMY_HIT_KNOCKBACK_UP;
    const platforms = level && Array.isArray(level.platforms) ? level.platforms : null;
    if (platforms) this.nudgeKnockbackPositionFromPlayer(player, platforms);
  }

  takeDamage(amount, level = null, attacker = null) {
    if (this.isDead) return;
    this.health = max(0, this.health - amount);
    if (attacker && amount > 0) this.applyPlayerHitKnockback(attacker, level);
  }

  canDamagePlayer() {
    return !this.isDead;
  }

  isInWater(level) {
    return isEntityInWater(this, level);
  }
  
  get isDead() { return this.health <= 0; }

  updateActivation(distance, detectRange = ENEMY_DETECT_RANGE, loseRange = ENEMY_LOSE_TARGET_RANGE) {
    if (!this.activated && distance <= detectRange) {
      this.activated = true;
    } else if (this.activated && distance > loseRange) {
      this.activated = false;
      this.enteredAttackRangeAt = -1;
      // 丢失目标时给一个轻微减速，避免出现瞬停感
      this.vx *= 0.6;
      this.vy *= 0.6;
    }
    return this.activated;
  }
  
  // 更新敌人状态（追踪玩家）
  update(player, platforms, level = null) {
    if (this.isDead) return;

    this.decayHitKnockback();
    
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const distance = Math.hypot(px - ex, py - ey);
    const inWater = this.isInWater(level);
    const chaseSpeed = ENEMY_SPEED * (inWater ? ENEMY_WATER_CHASE_SPEED_SCALE : 1);
    this.updateActivation(distance);
    
    // 激活后持续追踪玩家
    if (this.activated) {
      // 水平移动：朝向玩家
      let targetVx = 0;
      if (px < ex - 5) {
        targetVx = -chaseSpeed;
        this.facingRight = false; // 向左移动
      } else if (px > ex + 5) {
        targetVx = chaseSpeed;
        this.facingRight = true; // 向右移动
      } else {
        targetVx = 0;
      }
      this.vx = targetVx + this.hitKnockbackVx;

      if (inWater) {
        this.vy += WATER_GRAVITY - WATER_BUOYANCY;
        this.vx *= WATER_DRAG;
        this.vy *= WATER_DRAG;
      } else {
        // 应用重力
        this.vy += this.gravity;
      }
      if (this.vyImpulsePending) {
        this.vy -= this.vyImpulsePending;
        this.vyImpulsePending = 0;
      }

      // 水平移动
      this.x += this.vx;
      this.resolveCollision(platforms, true);
      
      // 垂直移动
      this.y += this.vy;
      this.onGround = false;
      this.resolveCollision(platforms, false);
    } else {
      // 未激活时仍可被击退滑动
      this.vx = this.hitKnockbackVx;
      if (inWater) {
        this.vy += WATER_GRAVITY - WATER_BUOYANCY;
        this.vx *= WATER_DRAG;
        this.vy *= WATER_DRAG;
      } else {
        this.vy += this.gravity;
      }
      if (this.vyImpulsePending) {
        this.vy -= this.vyImpulsePending;
        this.vyImpulsePending = 0;
      }
      this.x += this.vx;
      this.resolveCollision(platforms, true);
      this.y += this.vy;
      this.onGround = false;
      this.resolveCollision(platforms, false);
    }

    // 世界下边界：防止敌人掉出画布
    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
    }
  }
  
  // 碰撞检测（与平台，使用碰撞箱）
  resolveCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    for (let p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (!rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) continue;
        if (horizontal) {
          if (this.vx > 0) {
            this.x = r.x - box.w - this.collisionOffsetX;
          } else if (this.vx < 0) {
            this.x = r.x + r.w - this.collisionOffsetX;
          } else {
            continue;
          }
          this.vx = 0;
          this.hitKnockbackVx = 0;
        } else {
          if (this.vy > 0) {
            this.y = r.y - this.h;
            this.onGround = true;
          } else if (this.vy < 0) {
            this.y = r.y + r.h;
          }
          this.vy = 0;
        }
      }
    }
  }
  
  draw() {
    fill(200, 50, 50);
    rect(this.x, this.y, this.w, this.h);
  }
}


class Vex extends Enemy {
  constructor(x, y, w = 40, h = 22, health = ENEMY_DEFAULT_HEALTH) {
    super(x, y, w, h, health);
    this.facingRight = false; // 贴图原始朝左
    this.patrolOriginX = x;
    this.patrolRange = 4 * TILE_SIZE; // 出生点左右各 2*TILE_SIZE
    this.patrolDir = -1;
    this.collisionW = 30;
    this.collisionH = 22;
    this.collisionOffsetX = (this.w - this.collisionW) / 2;
    this.collisionOffsetY = (this.h - this.collisionH) / 2;
  }

  update(player, platforms, level = null) {
    if (this.isDead) return;

    this.decayHitKnockback();

    const px = player.x + player.w / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const py = player.y + player.h / 2;
    const distance = Math.hypot(px - ex, py - ey);
    this.updateActivation(distance);

    let targetVx;
    let targetVy;
    if (this.activated) {
      if (px < ex - 5) {
        targetVx = -ENEMY_SPEED;
        this.facingRight = false;
      } else if (px > ex + 5) {
        targetVx = ENEMY_SPEED;
        this.facingRight = true;
      } else {
        targetVx = 0;
      }

      const flySpeedY = ENEMY_SPEED * 0.85;
      if (py < ey - 4) {
        targetVy = -flySpeedY;
      } else if (py > ey + 4) {
        targetVy = flySpeedY;
      } else {
        targetVy = 0;
      }
    } else {
      const minX = this.patrolOriginX - 2 * TILE_SIZE;
      const maxX = this.patrolOriginX + 2 * TILE_SIZE;
      const patrolSpeed = ENEMY_SPEED * 0.85;
      targetVx = patrolSpeed * this.patrolDir;

      if (this.x <= minX) {
        this.x = minX;
        this.patrolDir = 1;
      } else if (this.x >= maxX) {
        this.x = maxX;
        this.patrolDir = -1;
      }
      this.facingRight = this.patrolDir > 0;
      targetVy = 0;
    }

    const vyKnock = this.vyImpulsePending;
    this.vyImpulsePending = 0;
    this.vx = targetVx + this.hitKnockbackVx;
    this.vy = targetVy - vyKnock;

    // Vex 可飞行：不受重力影响（vy 由飞行追踪逻辑决定）
    this.x += this.vx;
    this.resolveCollision(platforms, true);
    this.y += this.vy;
    this.onGround = false;
    this.resolveCollision(platforms, false);

    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
    }
  }

  draw() {
    const frames = [window.vexSprite0, window.vexSprite1];
    const frameDurationMs = 180;
    const frame = frames[Math.floor(millis() / frameDurationMs) % frames.length];
    if (frame && frame.width > 0) {
      push();
      imageMode(CENTER);
      translate(this.x + this.w / 2, this.y + this.h / 2);
      // vex 默认朝左，朝右时镜像
      scale(this.facingRight ? -1 : 1, 1);
      image(frame, 0, 0, this.w, this.h);
      pop();
    } else {
      super.draw();
    }
  }
}


class Zombie extends Enemy {
  draw() {
    const img = this.facingRight ? window.zombieSpriteRight : window.zombieSpriteLeft;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else super.draw();
  }
}


class Drowned extends Enemy {
  constructor(x, y, w = 64, h = 64, health = ENEMY_DEFAULT_HEALTH) {
    super(x, y, w, h, health);
    this.facingRight = false; // 贴图默认朝左，与基类默认朝右区分
    // 保持独立配置：24x64 碰撞箱，底对齐、水平居中
    this.collisionW = 24;
    this.collisionH = 64;
    this.collisionOffsetX = (this.w - this.collisionW) / 2;
    this.collisionOffsetY = this.h - this.collisionH;
  }

  isInWater(level) {
    return isEntityInWater(this, level);
  }

  update(player, platforms, level = null) {
    if (this.isDead) return;

    this.decayHitKnockback();

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const distance = Math.hypot(px - ex, py - ey);
    const inWater = this.isInWater(level);
    const chaseSpeed = ENEMY_SPEED * (inWater ? ENEMY_WATER_CHASE_SPEED_SCALE : 1);
    this.updateActivation(distance);

    let targetVx;
    if (this.activated) {
      if (px < ex - 5) {
        targetVx = -chaseSpeed;
        this.facingRight = false;
      } else if (px > ex + 5) {
        targetVx = chaseSpeed;
        this.facingRight = true;
      } else {
        targetVx = 0;
      }
    } else {
      const kbPrev = this.hitKnockbackVx / ENEMY_HIT_KNOCKBACK_DECAY;
      targetVx = (this.vx - kbPrev) * 0.92;
    }
    this.vx = targetVx + this.hitKnockbackVx;

    if (inWater) {
      // 统一水中物理：重力 + 浮力 + 阻力
      this.vy += WATER_GRAVITY - WATER_BUOYANCY;
      this.vx *= WATER_DRAG;
      this.vy *= WATER_DRAG;

      // 轻微漂浮波动
      const floatWave = Math.sin(millis() * 0.004 + this.x * 0.03) * 0.03;
      this.vy += floatWave;

      // 追踪时轻微跟随玩家高度，形成“漂浮追击”
      if (this.activated) {
        const dyToPlayer = py - ey;
        this.vy += constrain(dyToPlayer * 0.008, -0.06, 0.06);
      }

      // 水中速度上限（阻力）
      this.vy = constrain(this.vy, -1.2, 1.2);
    } else {
      this.vy += this.gravity;
    }
    if (this.vyImpulsePending) {
      this.vy -= this.vyImpulsePending;
      this.vyImpulsePending = 0;
    }

    this.x += this.vx;
    this.resolveCollision(platforms, true);

    this.y += this.vy;
    this.onGround = false;
    this.resolveCollision(platforms, false);

    // 活动高度限制：不允许超过屏幕顶端
    if (this.y < 0) {
      this.y = 0;
      if (this.vy < 0) this.vy = 0;
    }

    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
    }
  }

  draw() {
    const img = window.drownedSprite;
    if (img && img.width > 0) {
      push();
      imageMode(CENTER);
      translate(this.x + this.w / 2, this.y + this.h / 2);
      scale(this.facingRight ? -1 : 1, 1);
      image(img, 0, 0, this.w, this.h);
      pop();
    } else {
      super.draw();
    }
  }
}


class Shark extends Enemy {
  constructor(x, y, w = 84, h = 68, health = ENEMY_DEFAULT_HEALTH) {
    super(x, y, w, h, health);
    this.patrolOriginX = x;
    this.patrolRange = 4 * TILE_SIZE; // 总巡逻范围：4格（左右各2格）
    this.patrolDir = -1; // 贴图默认朝左，初始向左巡逻
    this.facingRight = false;
    this.collisionW = 44;
    this.collisionH = 32;
    this.refreshCollisionAnchor();
  }

  refreshCollisionAnchor() {
    // 默认朝左贴图时，碰撞箱紧贴左缘；翻转朝右时，镜像到右缘
    this.collisionOffsetX = this.facingRight ? (this.w - this.collisionW) : 0;
    // 上下相对于贴图居中
    this.collisionOffsetY = (this.h - this.collisionH) / 2;
  }

  isInWater(level) {
    return isEntityInWater(this, level);
  }

  update(player, platforms, level = null) {
    if (this.isDead) return;

    this.decayHitKnockback();

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const distance = Math.hypot(px - ex, py - ey);
    const inWater = this.isInWater(level);
    const chaseSpeed = ENEMY_SPEED * (inWater ? ENEMY_WATER_CHASE_SPEED_SCALE : 1);
    this.updateActivation(distance);

    let targetVx;
    if (this.activated) {
      if (px < ex - 5) {
        targetVx = -chaseSpeed;
        this.facingRight = false;
      } else if (px > ex + 5) {
        targetVx = chaseSpeed;
        this.facingRight = true;
      } else {
        targetVx = 0;
      }
    } else {
      const minX = this.patrolOriginX - this.patrolRange / 2;
      const maxX = this.patrolOriginX + this.patrolRange / 2;
      const patrolSpeed = ENEMY_SPEED * 0.85;
      targetVx = patrolSpeed * this.patrolDir;

      if (this.x <= minX) {
        this.x = minX;
        this.patrolDir = 1;
      } else if (this.x >= maxX) {
        this.x = maxX;
        this.patrolDir = -1;
      }
      this.facingRight = this.patrolDir > 0;
    }
    this.vx = targetVx + this.hitKnockbackVx;
    this.refreshCollisionAnchor();

    if (inWater) {
      // shark 在水中不受重力/浮力，仅受阻力影响
      this.vx *= WATER_DRAG;
      this.vy *= WATER_DRAG;

      const floatWave = Math.sin(millis() * 0.004 + this.x * 0.03) * 0.03;
      this.vy += floatWave;

      if (this.activated) {
        const dyToPlayer = py - ey;
        this.vy += constrain(dyToPlayer * 0.008, -0.06, 0.06);
      }
      this.vy = constrain(this.vy, -1.2, 1.2);
    } else {
      this.vy += this.gravity;
    }
    if (this.vyImpulsePending) {
      this.vy -= this.vyImpulsePending;
      this.vyImpulsePending = 0;
    }

    this.x += this.vx;
    this.resolveCollision(platforms, true);

    this.y += this.vy;
    this.onGround = false;
    this.resolveCollision(platforms, false);

    if (this.y < 0) {
      this.y = 0;
      if (this.vy < 0) this.vy = 0;
    }

    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
    }
  }

  draw() {
    const frames = [
      window.sharkSpriteStill,
      window.sharkSpriteUp,
      window.sharkSpriteStill,
      window.sharkSpriteDown
    ];
    const frameDurationMs = 160;
    const frame = frames[Math.floor(millis() / frameDurationMs) % frames.length];
    if (frame && frame.width > 0) {
      push();
      imageMode(CENTER);
      translate(this.x + this.w / 2, this.y + this.h / 2);
      // shark 贴图默认朝左；当需要朝右时做水平翻转
      scale(this.facingRight ? -1 : 1, 1);
      image(frame, 0, 0, this.w, this.h);
      pop();
    } else {
      super.draw();
    }
  }
}


class Slime extends Enemy {
  constructor(x, y, w = 160, h = 128, health = 1) {
    super(x, y, w, h, health);
    this.delayMs = 3000; // 追踪玩家 3 秒前的位置
    this.playerTrace = [];
    this.jumpIntervalMs = 950;
    this.jumpCooldownUntil = 0;
    this.jumpSpeedX = max(1.1, this.w / 90);
    this.jumpSpeedY = max(5.8, this.h / 18);
    this.gravity = 0.45;
    this.splitSpeedBase = max(2.2, this.w / 26);
    this.vx = random(-0.8, 0.8); // 出生时轻微漂移，降低完全重叠感
    this.slimeDriveVx = this.vx; // AI 水平分量，与受击击退分开便于摩擦/跳跃逻辑
    this.vy = 0;
    this.collisionW = this.w;
    this.collisionH = this.h;
    this.collisionOffsetX = 0;
    this.collisionOffsetY = 0;
  }

  canDamagePlayer() {
    // 16x16 及以下进入无害状态
    return !this.isDead && this.w > 16 && this.h > 16;
  }

  getDelayedTarget(now, player) {
    const sample = { t: now, x: player.x + player.w / 2, y: player.y + player.h / 2 };
    this.playerTrace.push(sample);
    const traceWindowMs = this.delayMs + 1000;
    while (this.playerTrace.length > 0 && now - this.playerTrace[0].t > traceWindowMs) {
      this.playerTrace.shift();
    }

    const targetTime = now - this.delayMs;
    let delayed = this.playerTrace[0] || sample;
    for (let i = this.playerTrace.length - 1; i >= 0; i--) {
      if (this.playerTrace[i].t <= targetTime) {
        delayed = this.playerTrace[i];
        break;
      }
    }
    return delayed;
  }

  update(player, platforms, level = null) {
    if (this.isDead) return;

    this.decayHitKnockback();

    const now = millis();
    const delayedTarget = this.getDelayedTarget(now, player);
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const dx = delayedTarget.x - ex;
    const dy = delayedTarget.y - ey;
    const distance = Math.hypot(dx, dy);
    const inWater = this.isInWater(level);
    this.updateActivation(distance, ENEMY_DETECT_RANGE * 1.25);

    if (this.activated) {
      const dirX = dx >= 0 ? 1 : -1;
      this.facingRight = dirX > 0;

      if (this.onGround && now >= this.jumpCooldownUntil) {
        // 史莱姆通过周期跳跃追踪目标
        this.slimeDriveVx = dirX * this.jumpSpeedX;
        this.vy = -this.jumpSpeedY;
        this.onGround = false;
        this.jumpCooldownUntil = now + this.jumpIntervalMs + random(-140, 160);
      } else if (this.onGround) {
        this.slimeDriveVx *= 0.82;
      }
    } else if (this.onGround) {
      this.slimeDriveVx *= 0.88;
    }

    this.vx = this.slimeDriveVx + this.hitKnockbackVx;

    if (inWater) {
      this.vy += WATER_GRAVITY - WATER_BUOYANCY;
      this.vx *= WATER_DRAG;
      this.vy *= WATER_DRAG;
    } else {
      this.vy += this.gravity;
    }
    if (this.vyImpulsePending) {
      this.vy -= this.vyImpulsePending;
      this.vyImpulsePending = 0;
    }
    this.x += this.vx;
    this.resolveCollision(platforms, true);
    this.slimeDriveVx = this.vx - this.hitKnockbackVx;
    this.y += this.vy;
    this.onGround = false;
    this.resolveCollision(platforms, false);
  }

  split(level, knockDir = 0) {
    if (!level || !Array.isArray(level.enemies)) return;
    const nextW = Math.floor(this.w / 2);
    const nextH = Math.floor(this.h / 2);
    if (nextW < 16 || nextH < 16) return;

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const halfSpawnW = nextW / 2;
    const halfSpawnH = nextH / 2;
    const splash = this.splitSpeedBase;
    const scatter = [
      { x: -1, y: -1 },
      { x: 1, y: -1 }
    ];

    for (let i = 0; i < scatter.length; i++) {
      const s = scatter[i];
      const child = new Slime(cx - halfSpawnW, cy - halfSpawnH, nextW, nextH, 1);
      child.activated = this.activated;
      child.playerTrace = this.playerTrace.slice();
      child.jumpCooldownUntil = millis() + random(120, 420);
      child.x += s.x * max(4, nextW * 0.12);
      child.y += s.y * max(2, nextH * 0.08);
      // 四散飞溅：给初速度（可选叠加玩家攻击方向的击退）
      const kbBoost = knockDir * ENEMY_HIT_KNOCKBACK_SPEED * 0.5;
      child.vx = s.x * splash * random(0.8, 1.15) + kbBoost;
      child.slimeDriveVx = child.vx;
      child.vy = s.y * splash * random(0.95, 1.25);
      child.onGround = false;
      level.enemies.push(child);
    }
  }

  takeDamage(amount, level = null, attacker = null) {
    if (this.isDead) return;
    if (attacker && amount > 0) this.applyPlayerHitKnockback(attacker, level);
    const knockDir = attacker && amount > 0 ? (attacker.facingRight ? 1 : -1) : 0;
    if (this.w <= 16 || this.h <= 16) {
      this.health = 0;
      return;
    }
    this.split(level, knockDir);
    this.health = 0;
  }

  draw() {
    const img = window.slimeSprite;
    if (img && img.width > 0) {
      image(img, this.x, this.y, this.w, this.h);
    } else {
      fill(90, 210, 120);
      rect(this.x, this.y, this.w, this.h, 8);
    }
  }
}


class Item extends Entity {
  constructor(x, y, w, h, sprite) {
    super(x, y, w, h);
    Object.assign(this, { sprite });
    this.vy = 0;
    this.gravity = 0.5;
  }

  update(platforms, level = null) {
    if (isEntityInWater(this, level)) {
      this.vy += WATER_GRAVITY - WATER_BUOYANCY;
      this.vy *= WATER_DRAG;
    } else {
      this.vy += this.gravity;
    }
    this.y += this.vy;

    for (let p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (!rectCollision(this.x, this.y, this.w, this.h, r.x, r.y, r.w, r.h)) continue;
        this.y = r.y - this.h;
        this.vy = 0;
        return;
      }
    }

    // 世界下边界：防止物品掉出画布
    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
    }
  }

  draw() {
    if (this.sprite) image(this.sprite, this.x, this.y, this.w, this.h);
    else { fill(255, 255, 0); rect(this.x, this.y, this.w, this.h); }
  }
}

class Animal extends Entity {
  constructor(x, y, w, h, sprite = null) {
    super(x, y, w, h);
    this.sprite = sprite;
    this.vy = 0;
    this.gravity = 0.5;
    this.rescueAwarded = false;
  }

  update(platforms, level = null) {
    if (isEntityInWater(this, level)) {
      this.vy += WATER_GRAVITY - WATER_BUOYANCY;
      this.vy *= WATER_DRAG;
    } else {
      this.vy += this.gravity;
    }
    this.y += this.vy;

    const box = this.getCollisionBox();
    for (let p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (!rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) continue;
        this.y = r.y - this.h;
        this.vy = 0;
        return;
      }
    }

    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
    }
  }

  draw() {
    if (this.sprite) image(this.sprite, this.x, this.y, this.w, this.h);
    else { fill(180, 200, 220); rect(this.x, this.y, this.w, this.h); }
  }

  canRescueWithTool(toolType) {
    return false;
  }

  requiresRescueRange(toolType) {
    return true;
  }

  onRescued(game, toolType) {
    return false;
  }

  onPlayerTouch(game) {
    return false;
  }
}

class Pollutant extends Item {

   constructor(x, y, w, h, type) {
    super(x, y, w, h, null);
    this.type = type;
    this.value = 1;
  }

  draw() {
    if (this.collected) return;
    // 每一帧绘制时尝试获取最新的图片资源
    let currentSprite = window[this.type]; 
    
    if (currentSprite && currentSprite.width > 0) {
      image(currentSprite, this.x, this.y, this.w, this.h);
    } else {
      // 备选方案：如果图片没加载出来，画个色块
      fill(100, 200, 100);
      rect(this.x, this.y, this.w, this.h);
    }
  }

}


class TNT extends Pollutant {
  constructor(x, y, w = 32, h = 32) {
    super(x, y, w, h, "tnt");

    // 状态
    this.armed = false;       // 是否已被触发（开始倒计时）
    this.exploded = false;    // 是否已爆炸
    this.armTime = 0;         // 触发时刻（millis）
    this.removeAfter = 0;     // 爆炸后移除时间（ms）

    // 参数（写在类里，避免和组员全局常量冲突）
    this.fuseMs = 2000;        // 2 秒后爆炸
    this.blastRadius = 80;     // 爆炸范围（像素）
    this.damage = 3;           // 伤害
    this.postExplodeMs = 300;  // 爆炸后显示/保留时间
  }

  // 玩家第一次碰到时调用：开始倒计时（不要反复重置）
  arm(now) {
    if (this.armed || this.exploded) return;
    this.armed = true;
    this.armTime = now;
    tryPlaySfx('tnt_fuse', { volume: 0.34, rate: 1 });
  }

  // 每帧更新：到点爆炸
  update(now, player, platforms = null, level = null) {
    // TNT 也遵循统一重力/浮力/阻力规则
    if (platforms) super.update(platforms, level);
    if (!this.armed || this.exploded) return;
    if (now - this.armTime >= this.fuseMs) {
      this.explode(now, player, level);
    }
  }

  explode(now, player, level = null) {
    if (this.exploded) return;
    this.exploded = true;
    this.removeAfter = now + this.postExplodeMs;
    tryPlaySfx('tnt_explode', { volume: 0.44, rate: 1 });

    // 计算玩家是否在爆炸范围内（中心点距离）
    const tx = this.x + this.w / 2;
    const ty = this.y + this.h / 2;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const d = Math.hypot(px - tx, py - ty);

    if (d <= this.blastRadius) {
      player.takeDamage(this.damage);
    }

    if (!level || typeof level.removeTerrainBlock !== 'function') return;

    const centerCol = Math.floor((this.x + this.w * 0.5) / TILE_SIZE);
    const anchorY = this.y + this.h - 1;
    const centerRow = Math.floor((CANVAS_H - anchorY - 1) / TILE_SIZE);
    const neighbors = [
      [centerCol, centerRow + 1], // up
      [centerCol, centerRow - 1], // down
      [centerCol - 1, centerRow], // left
      [centerCol + 1, centerRow]  // right
    ];
    for (const [col, row] of neighbors) {
      level.removeTerrainBlock(col, row);
    }
  }

  draw() {
    if (this.exploded) return; // 爆炸后不画

    const img = window[this.type];

    // 点燃后：闪烁（每 100ms 变暗一次）
    if (this.armed) {
      const blink = Math.floor(millis() / 100) % 2 === 0;
      if (blink) { push(); tint(255, 90); }

      if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
      else { fill(255, 0, 0); rect(this.x, this.y, this.w, this.h); }

      if (blink) pop();
      return;
    }

    // 未触发：正常显示
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 0, 0); rect(this.x, this.y, this.w, this.h); }
  }
}

class TrappedBird extends Animal {
  constructor(x, y, w = 48, h = 36) {
    super(x, y, w, h, null);
    this.state = 'trapped';
    this.targetX = x;
    this.targetY = y;
    this.flightSpeed = 1.9;
    this.wingTick = 0;
    this.facingRight = false;
    this._birdSfxActive = false;
  }
  isTrapped() {
    return this.state === 'trapped';
  }
  startRescue(targetX, targetY) {
    if (this.state !== 'trapped') return;
    this.state = 'flying';
    this.targetX = targetX;
    this.targetY = targetY;
    this.facingRight = targetX > this.x;
    this.vy = 0;
  }
  canRescueWithTool(toolType) {
    return toolType === 'scissor' && this.isTrapped();
  }
  onRescued(game, toolType) {
    if (toolType !== 'scissor' || !this.isTrapped()) return false;
    const target = game.getNearestTreeCrownTarget(this);
    this.startRescue(target.x, target.y);
    return true;
  }
  onPlayerTouch(game) {
    return this.state === 'trapped';
  }
  update(platforms, level = null) {
    if (this.state === 'trapped') {
      if (this._birdSfxActive) { this._birdSfxActive = false; sfxRelease('bird'); }
      super.update(platforms, level);
      return;
    }
    if (this.state !== 'flying') {
      if (this._birdSfxActive) { this._birdSfxActive = false; sfxRelease('bird'); }
      return;
    }
    if (!this._birdSfxActive) { this._birdSfxActive = true; sfxAcquire('bird'); }
    tryPlaySfx('bird', { volume: 0.24, rate: 1 });
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.abs(dx) > 0.2) this.facingRight = dx > 0;
    const d = Math.hypot(dx, dy);
    if (d <= this.flightSpeed) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.state = 'landed';
      if (this._birdSfxActive) { this._birdSfxActive = false; sfxRelease('bird'); }
      return;
    }
    this.x += (dx / d) * this.flightSpeed;
    this.y += (dy / d) * this.flightSpeed;
    this.wingTick++;
  }
  drawBird(img, x, y, w, h) {
    if (!img || img.width <= 0) {
      fill(180, 200, 220);
      rect(x, y, w, h);
      return;
    }
    if (!this.facingRight) {
      image(img, x, y, w, h);
      return;
    }
    push();
    translate(x + w, y);
    scale(-1, 1);
    image(img, 0, 0, w, h);
    pop();
  }
  draw() {
    const webBack = window.web_back;
    const webFront = window.web_front;
    const bird = window.bird;
    const birdFlip = window.bird_flip;
    if (this.state === 'trapped') {
      if (webBack && webBack.width > 0) image(webBack, this.x, this.y, this.w, this.h);
      const bx = this.x + (this.w - 24) / 2;
      const by = this.y + (this.h - 30) / 2;
      if (bird && bird.width > 0) image(bird, bx, by, 24, 30);
      else { fill(200, 180, 80); rect(bx, by, 24, 30); }
      if (webFront && webFront.width > 0) image(webFront, this.x, this.y, this.w, this.h);
      return;
    }
    const flap = this.state === 'flying' && Math.floor(this.wingTick / 6) % 2 === 1;
    const img = flap ? birdFlip : bird;
    this.drawBird(img, this.x, this.y, 24, 30);
  }
}

class Turtle extends Animal {
  constructor(x, y, w = 62, h = 32) {
    super(x, y, w, h, null);
    this.state = 'idle';
    this.releaseTargetY = y;
    this.releaseTargetX = x;
    this.patrolOriginX = x;
    this.patrolRange = 4 * TILE_SIZE;
    this.patrolDir = -1;
    this.facingRight = false;
    this.vx = 0;
    this.bars = [];
    // 初始静止：不受 Animal 默认重力影响
    this.gravity = 0;
  }

  bindBars(bars) {
    this.bars = Array.isArray(bars) ? bars : [];
  }

  onBarRemoved() {
    if (!this.bars.length) return;
    const allRemoved = this.bars.every(bar => bar.removed);
    if (allRemoved && this.state === 'idle') {
      this.state = 'ascending';
      this.releaseTargetY = this.y - TILE_SIZE;
      this.releaseTargetX = this.x - 2 * TILE_SIZE;
      this.facingRight = false;
      this.vx = 0;
      this.vy = 0;
    }
  }

  update(platforms, level = null) {
    if (this.state === 'idle') return;

    if (this.state === 'ascending') {
      const ascendSpeed = 1.25;
      this.y -= ascendSpeed;
      if (this.y <= this.releaseTargetY) {
        this.y = this.releaseTargetY;
        this.state = 'release_swim_left';
      }
      return;
    }

    if (this.state === 'release_swim_left') {
      const releaseSwimSpeed = ENEMY_SPEED * 0.75;
      this.facingRight = false;
      this.x -= releaseSwimSpeed;
      if (this.x <= this.releaseTargetX) {
        this.x = this.releaseTargetX;
        this.state = 'patrol';
        this.patrolOriginX = this.x;
      }
      return;
    }

    if (this.state !== 'patrol') return;

    const minX = this.patrolOriginX - this.patrolRange / 2;
    const maxX = this.patrolOriginX + this.patrolRange / 2;
    const patrolSpeed = ENEMY_SPEED * 0.75;
    this.vx = patrolSpeed * this.patrolDir;
    this.facingRight = this.patrolDir > 0;

    if (this.x <= minX) {
      this.x = minX;
      this.patrolDir = 1;
    } else if (this.x >= maxX) {
      this.x = maxX;
      this.patrolDir = -1;
    }

    // 复用 shark 的水中巡航手感：阻力 + 轻微上下起伏
    this.vx *= WATER_DRAG;
    this.vy *= WATER_DRAG;
    this.vy += Math.sin(millis() * 0.004 + this.x * 0.03) * 0.03;
    this.vy = constrain(this.vy, -1.0, 1.0);

    this.x += this.vx;
    this.resolveCollision(platforms, true);

    this.y += this.vy;
    this.resolveCollision(platforms, false);

    if (this.y < 0) {
      this.y = 0;
      if (this.vy < 0) this.vy = 0;
    }
    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      if (this.vy > 0) this.vy = 0;
    }
  }

  resolveCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    for (const p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (!rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) continue;
        if (horizontal) {
          if (this.vx > 0) this.x = r.x - box.w - this.collisionOffsetX;
          else if (this.vx < 0) this.x = r.x + r.w - this.collisionOffsetX;
          this.vx = 0;
        } else {
          if (this.vy > 0) this.y = r.y - this.h;
          else if (this.vy < 0) this.y = r.y + r.h;
          this.vy = 0;
        }
      }
    }
  }

  draw() {
    const frames = [window.turtle_0, window.turtle_1];
    const frame = frames[Math.floor(millis() / 220) % frames.length];
    if (frame && frame.width > 0) {
      push();
      imageMode(CENTER);
      translate(this.x + this.w / 2, this.y + this.h / 2);
      // turtle 贴图默认朝右；朝左游动时做水平翻转
      scale(this.facingRight ? 1 : -1, 1);
      image(frame, 0, 0, this.w, this.h);
      pop();
    } else {
      fill(90, 170, 110);
      rect(this.x, this.y, this.w, this.h);
    }
  }
}

class IronBar extends Entity {
  constructor(x, y, w = TILE_SIZE, h = TILE_SIZE, linkedTurtle = null) {
    super(x, y, w, h);
    this.removed = false;
    this.linkedTurtle = linkedTurtle;
  }

  removeByWrench() {
    if (this.removed) return;
    this.removed = true;
    if (this.linkedTurtle && typeof this.linkedTurtle.onBarRemoved === 'function') {
      this.linkedTurtle.onBarRemoved();
    }
  }

  draw() {
    if (this.removed) return;
    const img = window.iron_bar;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else {
      fill(150);
      rect(this.x, this.y, this.w, this.h);
    }
  }
}

class Fish extends Animal {
  constructor(x, y, w = 32, h = 32) {
    super(x, y, w, h, null);
    this.state = 'trapped';
    this.releaseTargetY = y;
    this.patrolOriginX = x;
    this.patrolRange = 4 * TILE_SIZE;
    this.patrolDir = -1;
    this.facingRight = false;
    this.linkedNet = null;
    this.gravity = 0;
    this.releaseRiseDistance = 2 * TILE_SIZE;
  }

  setPatrolRange(rangePx) {
    const n = Number(rangePx);
    if (!Number.isFinite(n)) return;
    // 保底给 1 格，避免范围过小导致左右抖动
    this.patrolRange = Math.max(TILE_SIZE, n);
  }

  setReleaseRiseDistance(distancePx) {
    const n = Number(distancePx);
    if (!Number.isFinite(n)) return;
    this.releaseRiseDistance = Math.max(0, n);
  }

  bindNet(net) {
    this.linkedNet = net || null;
  }

  isTrapped() {
    return this.state === 'trapped' && this.linkedNet && !this.linkedNet.removed;
  }

  canRescueWithTool(toolType) {
    return toolType === 'scissor' && this.isTrapped();
  }

  requiresRescueRange(toolType) {
    // Scissor rescue should only work when player is nearby.
    if (toolType === 'scissor') return true;
    return true;
  }

  onRescued(game, toolType) {
    if (toolType !== 'scissor' || !this.isTrapped()) return false;
    if (this.linkedNet) this.linkedNet.removeByScissor();
    this.state = 'ascending';
    this.releaseTargetY = this.y - this.releaseRiseDistance;
    this.vx = 0;
    this.vy = 0;
    return true;
  }

  onNetRemoved() {
    if (this.state !== 'trapped') return;
    this.state = 'ascending';
    this.releaseTargetY = this.y - this.releaseRiseDistance;
    this.vx = 0;
    this.vy = 0;
  }

  update(platforms, level = null) {
    if (this.state === 'trapped') return;

    if (this.state === 'ascending') {
      const ascendSpeed = 1.25;
      this.y -= ascendSpeed;
      if (this.y <= this.releaseTargetY) {
        this.y = this.releaseTargetY;
        this.state = 'patrol';
        this.patrolOriginX = this.x;
      }
      return;
    }

    if (this.state !== 'patrol') return;

    const minX = this.patrolOriginX - this.patrolRange / 2;
    const maxX = this.patrolOriginX + this.patrolRange / 2;
    const patrolSpeed = ENEMY_SPEED * 0.75;
    this.vx = patrolSpeed * this.patrolDir;
    this.facingRight = this.patrolDir > 0;

    if (this.x <= minX) {
      this.x = minX;
      this.patrolDir = 1;
    } else if (this.x >= maxX) {
      this.x = maxX;
      this.patrolDir = -1;
    }

    this.vx *= WATER_DRAG;
    this.vy *= WATER_DRAG;
    this.vy += Math.sin(millis() * 0.004 + this.x * 0.03) * 0.03;
    this.vy = constrain(this.vy, -1.0, 1.0);

    this.x += this.vx;
    this.resolveCollision(platforms, true);

    this.y += this.vy;
    this.resolveCollision(platforms, false);
  }

  resolveCollision(platforms, horizontal) {
    const box = this.getCollisionBox();
    for (const p of platforms) {
      const rects = getCollisionRectsForCollider(p);
      for (const r of rects) {
        if (!rectCollision(box.x, box.y, box.w, box.h, r.x, r.y, r.w, r.h)) continue;
        if (horizontal) {
          if (this.vx > 0) this.x = r.x - box.w - this.collisionOffsetX;
          else if (this.vx < 0) this.x = r.x + r.w - this.collisionOffsetX;
          this.vx = 0;
        } else {
          if (this.vy > 0) this.y = r.y - this.h;
          else if (this.vy < 0) this.y = r.y + r.h;
          this.vy = 0;
        }
      }
    }
  }

  draw() {
    const img = window.fish;
    if (img && img.width > 0) {
      push();
      imageMode(CENTER);
      translate(this.x + this.w / 2, this.y + this.h / 2);
      // fish 贴图默认朝左；向右游动时翻转
      scale(this.facingRight ? -1 : 1, 1);
      image(img, 0, 0, this.w, this.h);
      pop();
    } else {
      fill(255, 140, 90);
      rect(this.x, this.y, this.w, this.h);
    }
  }
}

class FishingNet extends Entity {
  constructor(x, y, w = 4 * TILE_SIZE, h = 3 * TILE_SIZE, linkedFish = null) {
    super(x, y, w, h);
    this.removed = false;
    const fishList = Array.isArray(linkedFish) ? linkedFish : (linkedFish ? [linkedFish] : []);
    this.linkedFishes = fishList;
    // 向后兼容：保留单鱼字段
    this.linkedFish = fishList[0] || null;
  }

  removeByScissor() {
    if (this.removed) return;
    this.removed = true;
    for (const fish of this.linkedFishes) {
      if (fish && typeof fish.onNetRemoved === 'function') {
        fish.onNetRemoved();
      }
    }
  }

  draw() {
    if (this.removed) return;
    const img = window.fishing_net;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else {
      noFill();
      stroke(160, 110, 70);
      rect(this.x, this.y, this.w, this.h);
    }
  }
}

class LittleBird extends Animal {
  constructor(x, y, w = 24, h = 24) {
    super(x, y, w, h, null);
  }
  draw() {
    const img = window.littlebird;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(180, 200, 220); rect(this.x, this.y, this.w, this.h); }
  }
}

class Rabbit extends Animal {
  constructor(x, y, w = 32, h = 32, opts = {}) {
    super(x, y, w, h, null);
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facingRight = false;

    // 碰撞箱：宽24高16，底部居中贴合 32x32 贴图
    this.collisionW = 24;
    this.collisionH = 16;
    this.collisionOffsetX = (w - this.collisionW) / 2;
    this.collisionOffsetY = h - this.collisionH;

    // 第3关脚本行为（仅用于特定兔子）
    this.scriptEnabled = !!opts.scriptEnabled;
    this.listenButtonCol = Number.isFinite(opts.listenButtonCol) ? opts.listenButtonCol : null;
    this.scriptTriggered = false;
    this.scriptJumping = false;
    this.scriptAwarded = false;
    this.scriptStartAt = 0;
    this.scriptDurationMs = 520;
    this.scriptStartX = x;
    this.scriptStartY = y;
    this.scriptTargetX = Number.isFinite(opts.targetX) ? opts.targetX : x;
    this.scriptTargetY = Number.isFinite(opts.targetY) ? opts.targetY : y;
    this.scriptArcHeight = 2 * TILE_SIZE;
  }

  update(platforms, level = null) {
    const now = millis();

    // 脚本兔子：只要第42列按钮被按下，就跳到指定目标点（其余逻辑清空）
    if (this.scriptEnabled && !this.scriptTriggered) {
      const buttonPressed = this.listenButtonCol !== null
        ? !!(level && typeof level.isFactoryButtonPressedAtCol === 'function' && level.isFactoryButtonPressedAtCol(this.listenButtonCol))
        : !!(level && level.factoryButtonPressed);
      if (buttonPressed && !this.scriptJumping) {
        this.scriptJumping = true;
        this.scriptStartAt = now;
        this.scriptStartX = this.x;
        this.scriptStartY = this.y;
        this.facingRight = this.scriptTargetX > this.scriptStartX;
      }
    }

    if (this.scriptEnabled && this.scriptJumping) {
      const t = constrain((now - this.scriptStartAt) / this.scriptDurationMs, 0, 1);
      const arc = -4 * this.scriptArcHeight * t * (1 - t);
      this.x = lerp(this.scriptStartX, this.scriptTargetX, t);
      this.y = lerp(this.scriptStartY, this.scriptTargetY, t) + arc;
      this.vx = 0;
      this.vy = 0;
      this.onGround = false;
      if (t >= 1) {
        this.x = this.scriptTargetX;
        this.y = this.scriptTargetY;
        this.onGround = true;
        this.scriptJumping = false;
        this.scriptTriggered = true;
        if (!this.scriptAwarded && typeof game?.addScore === 'function') {
          game.addScore(1);
          this.scriptAwarded = true;
        }
      }
      return;
    }

    // 非脚本兔子：保持静止
    this.vx = 0;
    this.vy = 0;
  }

  draw() {
    const img = window.rabbit;
    if (img && img.width > 0) {
      push();
      imageMode(CENTER);
      translate(this.x + this.w / 2, this.y + this.h / 2);
      scale(this.facingRight ? -1 : 1, 1);
      image(img, 0, 0, this.w, this.h);
      pop();
    } else {
      fill(220, 220, 220);
      rect(this.x, this.y, this.w, this.h);
    }
  }
}

class Hp extends Item {
  // hpType: 'apple' | 'golden_apple'
  constructor(x, y, w = 24, h = 24, hpType = 'apple') {
    super(x, y, w, h, null);
    this.hpType = hpType;
  }

  draw() {
    const img = window['food_' + this.hpType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 200, 0); rect(this.x, this.y, this.w, this.h); }
  }
}

class Tool extends Item {
  constructor(x, y, w = 24, h = 24, toolType = 'scissor') {
    super(x, y, w, h, null);
    this.displayName = '工具';
    this.toolType = toolType;  // 对应 pic/item/tool 下文件名（不含 .png）
  }
  draw() {
    const img = window['tool_' + this.toolType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(100, 150, 255); rect(this.x, this.y, this.w, this.h); }
  }
}

// 第二关海豚Dolphin类
class Dolphin extends Entity {
  constructor(x, y, w = DOLPHIN_W, h = DOLPHIN_H) {
    super(x, y, w, h);
    this.baseY = y;
    this.mounted = false;
    this.used = false;
    this.swimAway = false;
    this.facingRight = true;
  }

  getCurrentImage() {
    const frameIndex = Math.floor(millis() / DOLPHIN_ANIM_FRAME_MS) % 2;
    return frameIndex === 0 ? window.dolphin_1 : window.dolphin_2;
  }

  mount(player) {
    if (this.used || this.swimAway) return false;

    this.used = true;
    this.mounted = true;

    player.hasDolphinMagnet = true;
    player.activeDolphin = this;
    player.dolphinUsed = true;

    return true;
  }

  dismount(player) {
    this.mounted = false;
    this.swimAway = true;

    if (player) {
      player.hasDolphinMagnet = false;
      player.activeDolphin = null;
    }
  }

  update() {
    if (this.swimAway) {
      this.x += 3.2;
      this.y += sin(millis() / 120) * 0.4;
      return;
    }

    if (this.mounted && game?.player) {
      const p = game.player;

      // 海豚跟在人物下方，看起来像辅助游动
      this.x = p.x - 28;
      this.y = p.y + 38;
      this.facingRight = p.facingRight;
      return;
    }

    // 未被碰到前原地轻微上下浮动
    this.y = this.baseY + sin(millis() / 360) * 5;
  }

  draw() {
    const img = this.getCurrentImage();

    push();
    imageMode(CENTER);
    translate(this.x + this.w / 2, this.y + this.h / 2);
    scale(this.facingRight ? -1 : 1, 1);

    if (img && img.width > 0) {
      image(img, 0, 0, this.w, this.h);
    } else {
      fill(130, 190, 230);
      rect(-this.w / 2, -this.h / 2, this.w, this.h, 12);
    }

    pop();
  }
}

//藤蔓种子的梯子
class Ladder extends Item {
  constructor(x, y, h = TILE_SIZE * 4) {
    super(x, y, TILE_SIZE, h, null);
    this.displayName = '藤蔓梯子';
    this.isPlacedLadder = true;
  }

  update() {
    // 梯子不受重力影响
  }

draw() {
  const img = window.tool_vine_ladder;
  if (img && img.width > 0) {
    const drawW = TILE_SIZE;   // 梯子显示宽度
    const drawH = TILE_SIZE * 4; // 梯子贴图显示高度
    const drawX = this.x - (drawW - this.w) / 2;
    image(img, drawX, this.y, drawW, drawH);
    return;
  }

  // 贴图缺失时的回退绘制
  push();
  stroke(46, 120, 54);
  strokeWeight(4);
  const leftX = this.x + 9;
  const rightX = this.x + this.w - 9;
  line(leftX, this.y, leftX, this.y + this.h);
  line(rightX, this.y, rightX, this.y + this.h);

  stroke(112, 170, 86);
  strokeWeight(3);
  for (let yy = this.y + 10; yy < this.y + this.h - 4; yy += 12) {
    line(leftX, yy, rightX, yy);
  }
  pop();
}
}

// 武器威力与对应矿石（贴图名 assets/pic/weapon 与 assets/pic/ground）
const WEAPON_CONFIG = {
  wooden_sword:  { damage: 2, oreTiles: [] },
  stone_sword:   { damage: 3, oreTiles: [T.DEEP, T.STONE] },
  iron_sword:    { damage: 4, oreTiles: [T.DEEP_IRON, T.IRON] },
  diamond_sword: { damage: 5, oreTiles: [T.DEEP_DIAMOND, T.DIAMOND] }
};
const WEAPON_TIER = { wooden_sword: 1, stone_sword: 2, iron_sword: 3, diamond_sword: 4 };
// 矿石贴图类型 -> 对应武器（挖掘到该矿石且该武器更高级则升级）
const ORE_TO_WEAPON = {
  [T.DEEP]: 'stone_sword', [T.STONE]: 'stone_sword',
  [T.DEEP_IRON]: 'iron_sword', [T.IRON]: 'iron_sword',
  [T.DEEP_DIAMOND]: 'diamond_sword', [T.DIAMOND]: 'diamond_sword'
};

class Weapon extends Item {
  constructor(x, y, w = 24, h = 24, weaponType = 'wooden_sword') {
    super(x, y, w, h, null);
    this.displayName = '武器';
    this.weaponType = weaponType;
    const cfg = WEAPON_CONFIG[weaponType] || WEAPON_CONFIG.wooden_sword;
    this.damage = cfg.damage;
    this.oreTiles = cfg.oreTiles;
  }
  draw() {
    const img = window['weapon_' + this.weaponType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(180, 120, 80); rect(this.x, this.y, this.w, this.h); }
  }
}

// ====== UIManager 类 ======
class UIManager {
  getTopRightButtons() {
    const size = HEART_SIZE;
    const exitX = EXIT_BTN_SCREEN_INSET;
    const exitY = height - size - EXIT_BTN_SCREEN_INSET;
    const menuX = EXIT_BTN_SCREEN_INSET;
    const menuY = exitY - MENU_EXIT_VERTICAL_GAP - size;
    return {
      menuRect: { x: menuX, y: menuY, w: size, h: size },
      exitRect: { x: exitX, y: exitY, w: size, h: size }
    };
  }

  getGuideMenuRect() {
    const panelH = 186;
    const panelW = Math.min(Math.floor(width * 0.4), 300, Math.max(0, width));
    const x = Math.round((width - panelW) / 2);
    const y = Math.round((height - panelH) / 2);
    return { x, y, w: panelW, h: panelH };
  }

  getGuideTabRects() {
    const panel = this.getGuideMenuRect();
    const tabCount = 3;
    const tabGap = 4;
    const tabW = (panel.w - 28) / tabCount;
    const totalTabW = tabCount * tabW + (tabCount - 1) * tabGap;
    const tabStartX = panel.x + (panel.w - totalTabW) / 2;
    const tabY = panel.y + 30;
    return [0, 1, 2].map(i => ({ x: tabStartX + i * (tabW + tabGap), y: tabY, w: tabW, h: 22 }));
  }

  isInsideRect(mx, my, rect) {
    if (!rect) return false;
    return mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
  }

  drawTopRightIcon(rectInfo, img, fallbackColor) {
    // fill(18, 28, 44, 210);
    // rect(rectInfo.x - 2, rectInfo.y - 2, rectInfo.w + 4, rectInfo.h + 4, 4);
    if (img && img.width > 0) image(img, rectInfo.x, rectInfo.y, rectInfo.w, rectInfo.h);
    else { fill(...fallbackColor); rect(rectInfo.x, rectInfo.y, rectInfo.w, rectInfo.h, 3); }
  }

  drawHUD(player, showGuideMenu = false, activeGuideTab = 0) {
    // 生命条
    const heartX = HEART_UI_INSET, heartY = HEART_UI_INSET;
    for (let i = 0; i < MAX_HEARTS; i++) {
      const x = heartX + i * (HEART_SIZE + HEART_GAP);
      const container = window.heartContainer, fillImg = window.heartFill;
      if (container && container.width > 0) image(container, x, heartY, HEART_SIZE, HEART_SIZE);
      else { fill(80); rect(x, heartY, HEART_SIZE, HEART_SIZE); }
      if (i < player.health) {
        if (fillImg && fillImg.width > 0) image(fillImg, x, heartY, HEART_SIZE, HEART_SIZE);
        else { fill(200, 50, 50); rect(x + 2, heartY + 2, HEART_SIZE - 4, HEART_SIZE - 4); }
      }
    }

    // 得分奖杯栏（与生命栏相同：先画容器，再按分数从左到右叠填充；整条右对齐、顶对齐）
    const trophyY = TROPHY_UI_INSET;
    const trophyStride = TROPHY_SIZE + HEART_GAP;
    const trophyContainerImg = window.trophyContainer;
    const trophyFillImg = window.trophyFill;
    const trophySlots = game && typeof game.getTrophySlotLimit === 'function'
      ? game.getTrophySlotLimit()
      : MAX_TROPHY_SLOTS;
    const filledTrophies = Math.min(Math.max(0, Math.floor(player.score)), trophySlots);
    for (let i = 0; i < trophySlots; i++) {
      const x = width - TROPHY_UI_INSET - TROPHY_SIZE - (trophySlots - 1 - i) * trophyStride;
      if (trophyContainerImg && trophyContainerImg.width > 0) {
        image(trophyContainerImg, x, trophyY, TROPHY_SIZE, TROPHY_SIZE);
      } else {
        fill(55, 55, 65);
        noStroke();
        rect(x, trophyY, TROPHY_SIZE, TROPHY_SIZE);
      }
      if (i < filledTrophies) {
        if (trophyFillImg && trophyFillImg.width > 0) {
          image(trophyFillImg, x, trophyY, TROPHY_SIZE, TROPHY_SIZE);
        } else {
          fill(210, 175, 55);
          noStroke();
          rect(x + 2, trophyY + 2, TROPHY_SIZE - 4, TROPHY_SIZE - 4);
        }
      }
    }

      // 顶部居中游戏进度条（显示本局到达过的最远进度）
      const topProgress = constrain(game?.displayedCatProgress ?? 0, 0, 1);
      const progressBarX = (width - TOP_PROGRESS_BAR_W) / 2;
      const progressFrameImg = window.uiProgress;
      if (progressFrameImg && progressFrameImg.width > 0) {
        image(progressFrameImg, progressBarX, TOP_PROGRESS_BAR_Y, TOP_PROGRESS_BAR_W, TOP_PROGRESS_BAR_H);
      } else {
        noStroke();
        fill(0, 0, 0, 255);
        rect(progressBarX, TOP_PROGRESS_BAR_Y, TOP_PROGRESS_BAR_W, TOP_PROGRESS_BAR_H);
      }
      noStroke();
      const topProgressFillW = TOP_PROGRESS_FILL_W * topProgress;
      const progressFillX = progressBarX + 2;
      const progressFillY = TOP_PROGRESS_BAR_Y + 2;
      fill(40, 40, 40);
      rect(
        progressFillX,
        progressFillY,
        TOP_PROGRESS_FILL_W,
        TOP_PROGRESS_FILL_H
      );
      fill(23, 221, 98);
      rect(
        progressFillX,
        progressFillY,
        topProgressFillW,
        TOP_PROGRESS_FILL_H
      );
      if (topProgressFillW >= 4) {
        fill(219, 255, 235);
        rect(progressFillX + 2, progressFillY + 2, 2, 2);
      }
      if (topProgressFillW >= 6) {
        fill(175, 253, 205);
        rect(progressFillX + 4, progressFillY + 2, 2, 2);
      }
      if (topProgressFillW >= 4) {
        fill(175, 253, 205);
        rect(progressFillX + 2, progressFillY + 4, 2, 2);
      }
      if (topProgressFillW > 0) {
        fill(0);
        rect(
          progressFillX + Math.max(0, topProgressFillW - 2),
          progressFillY,
          2,
          TOP_PROGRESS_FILL_H
        );
      }

      const topRight = this.getTopRightButtons();
      this.drawTopRightIcon(topRight.menuRect, window.uiMenu, [240, 210, 80]);
      this.drawTopRightIcon(topRight.exitRect, window.uiExit, [240, 120, 90]);

      // 背包 - 使用背包贴图（10格）
      const invX = (width - INV_BAR_W) / 2, invY = height - INV_BAR_H;

      // 画背包贴图作为背景
      const invContainerImg = window.invContainer;
      if (invContainerImg && invContainerImg.width > 0) {
        image(invContainerImg, invX, invY, INV_BAR_W, INV_BAR_H);
      } else {
        // 备选：半透明背景矩形
        fill(40, 40, 50, 200);
        noStroke();
        rect(invX, invY, INV_BAR_W, INV_BAR_H, 8);
      }

      // 画格子边框和物品
      for (let i = 0; i < INVENTORY_SLOTS; i++) {
        const x = invX + INV_PADDING + i * (SLOT_SIZE + SLOT_GAP);
        const y = invY + INV_PADDING;
        
        const item = player.inventory[i];
        if (item) {
          let img = item.sprite;
          if (item instanceof Pollutant) img = window[item.type];
          if (item instanceof Tool) img = window['tool_' + item.toolType];
          if (item instanceof Weapon) img = window['weapon_' + item.weaponType];
          if (item instanceof LittleBird) img = window.littlebird;
          
          if (img && img.width > 0) {
            // 有图片就显示图片
            image(img, x, y, SLOT_SIZE, SLOT_SIZE);
          } else {
            // 没图片显示色块
            if (item instanceof Pollutant) fill(100, 200, 100);
            else if (item instanceof Tool) fill(100, 150, 255);
            else if (item instanceof Weapon) fill(180, 120, 80);
            else if (item instanceof LittleBird) fill(180, 200, 220);
            else fill(255, 255, 0);
            noStroke();
            rect(x + 2, y + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 2);
          }
        }
      }

    if (showGuideMenu) this.drawGuideMenu(activeGuideTab);
  }

  drawGuideEntry(x, y, icon, name, desc) {
    if (icon && icon.width > 0) image(icon, x, y - 10, 12, 12);
    else { fill(120, 160, 220); rect(x, y - 10, 12, 12, 2); }
    fill(255);
    textSize(10);
    text(name, x + 16, y - 1);
    fill(196, 214, 255);
    textSize(10);
    text(desc, x + 16, y + 8, 126);
  }

  drawGuideRow(x, y, w, icon, name, desc) {
    fill(0, 0, 0, 85);
    rect(x, y, w, 32);

    const iconX = x + 6;
    const iconY = y + 6;
    if (icon && icon.width > 0 && icon.height > 0) {
      const iconBoxW = 16;
      const iconBoxH = 16;
      const scale = Math.min(iconBoxW / icon.width, iconBoxH / icon.height);
      const drawW = icon.width * scale;
      const drawH = icon.height * scale;
      const drawX = iconX + (iconBoxW - drawW) / 2;
      const drawY = iconY + (iconBoxH - drawH) / 2;
      image(icon, drawX, drawY, drawW, drawH);
    } else { fill(120, 160, 220); rect(iconX, iconY, 16, 16, 3); }

    fill(255);
    textSize(10);
    text(name, x + 28, y + 12);
    fill(196, 214, 255);
    textSize(10);
    text(desc, x + 28, y + 23);
  }

  getGuideRowsByTab(levelType = "forest") {
    const commonTools = {
      scissor: [window.tool_scissor, t("Scissors", "剪刀"), t("Rescue trapped wildlife", "解救被困动物")],
      waterBucket: [window.tool_enlarged_water_bucket, t("Bucket", "水桶"), t("Use near lava", "在岩浆附近使用")],
      limestone: [window.tool_limestone, t("Limestone", "石灰石"), t("Use near acid", "在酸液附近使用")],
      vineSeed: [window.tool_vine_seed, t("Vine Seed", "藤蔓种子"), t("Grow a ladder to climb", "生成藤蔓梯子爬到高处")],
      wrench: [window.tool_wrench, t("Wrench", "扳手"), t("Remove iron bars", "拆除铁栏杆")]
    };

    if (levelType === "water") {
      return [
        [
          commonTools.scissor,
          commonTools.wrench,
          commonTools.waterBucket
        ],
        [
          [window.turtle_0, t("Turtle", "海龟"), t("Break iron bars to rescue", "拆除铁栏杆进行救援")],
          [window.fish, t("Fish", "小鱼"), t("Cut fishing net to rescue", "剪开渔网进行救援")]
        ],
        [
          [window.drownedSprite, t("Drowned", "溺尸"), t("Keep distance or attack", "保持距离或攻击")],
          [window.sharkSpriteStill, t("Shark", "鲨鱼"), t("Patrols in water", "会在水中巡逻")]
        ]
      ];
    }

    if (levelType === "factory") {
      return [
        [
          commonTools.waterBucket,
          commonTools.limestone
        ],
        [],
        [
          [window.tile_spike, t("Spike", "尖刺"), t("Retracts and extends periodically", "会周期性升降并持续造成伤害")],
          [window.slimeSprite, t("Slime", "史莱姆"), t("Press F to attack", "按 F 攻击")],
          [window.vexSprite0, t("Vex", "怨灵"), t("Keep distance or attack", "保持距离或攻击")]
        ]
      ];
    }

    // forest（默认）
    return [
      [
        commonTools.scissor,
        commonTools.waterBucket,
        commonTools.vineSeed
      ],
      [
        [window.bird, t("Bird", "小鸟"), t("Click scissors to rescue", "点击剪刀进行救援")]
      ],
      [
        [window.zombieSpriteRight, t("Zombie", "僵尸"), t("Press F to attack", "按 F 攻击")]
      ]
    ];
  }

  drawGuideMenu(activeGuideTab = 0) {
    const panel = this.getGuideMenuRect();
    noStroke();
    fill(0, 0, 0, 85);
    rect(panel.x, panel.y, panel.w, panel.h);

    fill(255);
    textSize(12);
    textAlign(CENTER, BASELINE);
    text(t("Field Guide", "图鉴"), panel.x + panel.w / 2, panel.y + 24);

    const tabLabels = [
      t("Tools", "工具"),
      t("Trapped", "待救援"),
      t("Danger", "危险")
    ];
    const tabs = this.getGuideTabRects();
    textAlign(CENTER, CENTER);
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      fill(i === activeGuideTab ? color(255, 255, 255, 85) : color(0, 0, 0, 85));
      rect(t.x, t.y, t.w, t.h);
      fill(255);
      textSize(10);
      text(tabLabels[i], t.x + t.w / 2, t.y + t.h / 2 + 2);
    }
    textAlign(LEFT, BASELINE);

    const rowsByTab = this.getGuideRowsByTab(game?.levelType || "forest");

    const tabIndex = constrain(activeGuideTab, 0, rowsByTab.length - 1);
    const rows = rowsByTab[tabIndex] || [];
    const rowLeft = tabs[0]?.x ?? (panel.x + 14);
    const lastTab = tabs[tabs.length - 1];
    const rowRight = lastTab ? (lastTab.x + lastTab.w) : (panel.x + panel.w - 14);
    const rowX = rowLeft;
    const rowW = Math.max(0, rowRight - rowLeft);
    const rowGap = 6;
    const firstTab = tabs[0];
    let rowY = firstTab ? (firstTab.y + firstTab.h + rowGap) : (panel.y + 56);

    if (!rows.length) {
      this.drawGuideRow(
        rowX,
        rowY,
        rowW,
        null,
        t("No entries in this level", "本关暂无该类条目"),
        t("Switch tab to view other categories", "可切换到其他标签查看")
      );
    } else {
      for (const [icon, name, desc] of rows) {
        this.drawGuideRow(rowX, rowY, rowW, icon, name, desc);
        rowY += 32 + rowGap;
      }
    }
  }
}


// ====== p5.js 生命周期 ======
function preload() {
  activeFont = null;

  // 让 p5.sound 更明确地识别常见格式（有些环境下可避免扩展名/解码问题）
  if (typeof soundFormats === 'function') {
    try { soundFormats('wav', 'mp3', 'ogg'); } catch {}
  }
  console.log('[SFX] preload canUseSound=', canUseSound(), 'hasLoadSound=', typeof window.loadSound, 'hasUserStartAudio=', typeof window.userStartAudio);

  // 约定：把音效放到 assets/sfx/ 下
  const numbered = (dir, count = 8, ext = 'wav') => Array.from({ length: count }, (_, i) => `${dir}/${i}.${ext}`);

  // 注意：不在 preload 直接 loadSound，避免 AudioContext 仍是 suspended 时解码卡住
  queueSfxList('step_grass', [...numbered('assets/sfx/step_grass', 8, 'wav'), 'assets/sfx/step_grass.wav']);
  queueSfxList('step_stone', [...numbered('assets/sfx/step_stone', 8, 'wav'), 'assets/sfx/step_stone.wav']);
  queueSfxList('step_sand', [...numbered('assets/sfx/step_sand', 8, 'wav'), 'assets/sfx/step_sand.wav']);
  queueSfxList('swim', ['assets/sfx/swim.wav']);
  queueSfxList('fall', ['assets/sfx/fall.wav']);
  queueSfxList('dig_grass', ['assets/sfx/dig_grass.wav']);
  queueSfxList('dig_sand', ['assets/sfx/dig_sand.wav']);
  queueSfxList('dig_stone', ['assets/sfx/dig_stone.wav']);
  queueSfxList('hit', ['assets/sfx/hit.wav']);
  queueSfxList('pour', ['assets/sfx/pour.wav']);
  queueSfxList('lava', ['assets/sfx/lava.wav']);
  queueSfxList('recover', ['assets/sfx/recover.wav']);
  queueSfxList('trophy', ['assets/sfx/trophy.wav']);
  queueSfxList('click', ['assets/sfx/click.mp3']);
  queueSfxList('win', ['assets/sfx/win.mp3']);
  queueSfxList('lost', ['assets/sfx/lost.mp3']);
  queueSfxList('bird', [
    ...numbered('assets/sfx/bird', 16, 'wav'),
    ...numbered('assets/sfx/bird', 16, 'mp3'),
    ...numbered('assets/sfx/bird', 16, 'ogg'),
    'assets/sfx/bird.wav',
    'assets/sfx/bird.mp3',
    'assets/sfx/bird.ogg'
  ]);
  queueSfxList('spike', ['assets/sfx/spike.mp3']);
  queueSfxList('tnt_fuse', ['assets/sfx/tnt/fuse.wav']);
  queueSfxList('tnt_explode', ['assets/sfx/tnt/explode.wav']);
}

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.elt.tabIndex = 0;
  c.elt.focus();
  c.elt.classList.add('game-canvas');
  c.elt.addEventListener('click', () => c.elt.focus());

  // 兜底：某些运行方式下 preload 可能未执行，这里确保队列一定被填充
  if (Object.keys(SFX.queuedPathsByKey || {}).length === 0) {
    const numbered = (dir, count = 8, ext = 'wav') => Array.from({ length: count }, (_, i) => `${dir}/${i}.${ext}`);
    queueSfxList('step_grass', [...numbered('assets/sfx/step_grass', 8, 'wav'), 'assets/sfx/step_grass.wav']);
    queueSfxList('step_stone', [...numbered('assets/sfx/step_stone', 8, 'wav'), 'assets/sfx/step_stone.wav']);
    queueSfxList('step_sand', [...numbered('assets/sfx/step_sand', 8, 'wav'), 'assets/sfx/step_sand.wav']);
    queueSfxList('swim', ['assets/sfx/swim.wav']);
    queueSfxList('fall', ['assets/sfx/fall.wav']);
    queueSfxList('dig_grass', ['assets/sfx/dig_grass.wav']);
    queueSfxList('dig_sand', ['assets/sfx/dig_sand.wav']);
    queueSfxList('dig_stone', ['assets/sfx/dig_stone.wav']);
    queueSfxList('hit', ['assets/sfx/hit.wav']);
    queueSfxList('pour', ['assets/sfx/pour.wav']);
    queueSfxList('lava', ['assets/sfx/lava.wav']);
    queueSfxList('recover', ['assets/sfx/recover.wav']);
    queueSfxList('trophy', ['assets/sfx/trophy.wav']);
    queueSfxList('click', ['assets/sfx/click.mp3']);
    queueSfxList('win', ['assets/sfx/win.mp3']);
    queueSfxList('lost', ['assets/sfx/lost.mp3']);
    queueSfxList('bird', [
      ...numbered('assets/sfx/bird', 16, 'wav'),
      ...numbered('assets/sfx/bird', 16, 'mp3'),
      ...numbered('assets/sfx/bird', 16, 'ogg'),
      'assets/sfx/bird.wav',
      'assets/sfx/bird.mp3',
      'assets/sfx/bird.ogg'
    ]);
    queueSfxList('spike', ['assets/sfx/spike.mp3']);
    queueSfxList('tnt_fuse', ['assets/sfx/tnt/fuse.wav']);
    queueSfxList('tnt_explode', ['assets/sfx/tnt/explode.wav']);
    if (SFX.debug) console.log('[SFX] queued in setup fallback');
  }

  // 解锁浏览器音频上下文（需要用户手势）
  const unlockAndLoadOnce = () => {
    try { ensureAudioUnlocked(); } catch {}
    try { startQueuedSfxLoads(); } catch {}
  };
  c.elt.addEventListener('pointerdown', unlockAndLoadOnce, { passive: true, once: true });
  window.addEventListener('keydown', unlockAndLoadOnce, { passive: true, once: true });
  c.parent('game-container');
  console.log('[SFX] setup canUseSound=', canUseSound());
  setTimeout(() => {
    if (!SFX.debug) return;
    console.log(
      '[SFX] loaded counts:',
      'grass=', getLoadedSoundCount('step_grass'),
      'stone=', getLoadedSoundCount('step_stone'),
      'sand=', getLoadedSoundCount('step_sand'),
      'audioState=', (typeof getAudioContext === 'function' ? getAudioContext()?.state : 'n/a')
    );
  }, 1000);

  // 记录 WASD 物理按下先后（捕获阶段，早于 p5；滚键时两键同按一帧也能分胜负）
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyA') lastHorizPhysDownMs.a = millis();
    else if (e.code === 'KeyD') lastHorizPhysDownMs.d = millis();
    else if (e.code === 'KeyW') lastVertPhysDownMs.w = millis();
    else if (e.code === 'KeyS') lastVertPhysDownMs.s = millis();
  }, true);

  // 添加原生键盘事件监听器（备用方案，防止 p5.js 事件丢失）
  window.addEventListener('keyup', (e) => {
    const k = (e.key || '').toLowerCase();
    if (k === 'a' || k === 'd' || k === 'w' || k === 's') {
      if (keys[k]) {
        console.log(`[原生事件] 检测到 ${k} 键松开`);
        keys[k] = false;
        pressedKeys.delete(k);
      }
    }
  });

  game = new Game();
  game.setup();

  // 加载贴图
  const load = (path, key) => loadImage(path, img => window[key] = img, () => console.warn(`${path} 加载失败`));

  // 新增：污染物及被困小动物
  // load('assets/pic/item/pollutant/cigarette.png', 'cigarette');
  load('assets/pic/item/pollutant/plastic_bottle.png', 'plastic_bottle');
  load('assets/pic/item/pollutant/plastic_bag.png', 'plastic_bag');
  load('assets/pic/item/pollutant/tnt_side.png', 'tnt');
  load('assets/pic/animals/bird.png', 'bird');
  load('assets/pic/animals/bird_flip.png', 'bird_flip');
  load('assets/pic/animals/fish.png', 'fish');
  load('assets/pic/animals/rabbit.png', 'rabbit');
  load('assets/pic/animals/turtle_0.png', 'turtle_0');
  load('assets/pic/animals/turtle_1.png', 'turtle_1');
  load('assets/pic/animals/iron_bar.png', 'iron_bar');
  load('assets/pic/animals/web_back.png', 'web_back');
  load('assets/pic/animals/web_front.png', 'web_front');
  load('assets/pic/item/restraint/fishing_net.png', 'fishing_net');
  // 玩家：根据武器等级与攻击状态切换对应立绘（朝向用水平翻转）
  load('assets/pic/player_cat/Alex_wooden_sword_0.png', 'alexSpriteWoodenSword');
  load('assets/pic/player_cat/Alex_stone_sword_0.png', 'alexSpriteStoneSword');
  load('assets/pic/player_cat/Alex_iron_sword_0.png', 'alexSpriteIronSword');
  load('assets/pic/player_cat/Alex_diamond_sword_0.png', 'alexSpriteDiamondSword');
  load('assets/pic/player_cat/Alex_wooden_sword_1.png', 'alexSpriteWoodenSwordAttack');
  load('assets/pic/player_cat/Alex_stone_sword_1.png', 'alexSpriteStoneSwordAttack');
  load('assets/pic/player_cat/Alex_iron_sword_1.png', 'alexSpriteIronSwordAttack');
  load('assets/pic/player_cat/Alex_diamond_sword_1.png', 'alexSpriteDiamondSwordAttack');

  // 敌人（assets/pic/enemy）
  load('assets/pic/enemy/zombie_left.png', 'zombieSpriteLeft');
  load('assets/pic/enemy/zombie_right.png', 'zombieSpriteRight');
  load('assets/pic/enemy/drowned.png', 'drownedSprite');
  load('assets/pic/enemy/shark_still.png', 'sharkSpriteStill');
  load('assets/pic/enemy/shark_up.png', 'sharkSpriteUp');
  load('assets/pic/enemy/shark_down.png', 'sharkSpriteDown');
  load("assets/pic/enemy/slime.png", "slimeSprite");
  load('assets/pic/enemy/vex_0.png', 'vexSprite0');
  load('assets/pic/enemy/vex_1.png', 'vexSprite1');

  // 工具（assets/pic/item/tool 中全部，新增图片时在此数组加入文件名不含 .png）
  ['scissor', 'limestone', 'enlarged_water_bucket', 'wrench'].forEach(name =>load(`assets/pic/item/tool/${name}.png`, `tool_${name}`));
  load('assets/pic/item/tool/seed.png', 'tool_vine_seed');
  load('assets/pic/item/tool/vine.png', 'tool_vine_ladder');
  load('assets/pic/item/effect/water_stream.png', 'effect_water_stream');
  load('assets/pic/item/effect/heal_effect.png', 'effect_heal');
  load('assets/pic/animals/dolphin_1.png', 'dolphin_1');
  load('assets/pic/animals/dolphin_2.png', 'dolphin_2');

  // 武器（assets/pic/weapon，威力从低到高：wooden / stone / iron / diamond）
  ['wooden_sword', 'stone_sword', 'iron_sword', 'diamond_sword'].forEach(name => load(`assets/pic/weapon/${name}.png`, `weapon_${name}`));

  // HP 物品（assets/pic/item/hp）- 与 Hp.draw() 的键名保持一致：food_<hpType>
  load('assets/pic/item/hp/apple.png', 'food_apple');
  load('assets/pic/item/hp/golden_apple.png', 'food_golden_apple');
  load('assets/pic/item/hp/potion_bottle.png', 'food_potion_bottle');
  load('assets/pic/item/hp/seashell.png', 'food_seashell');

  // UI
  load('assets/pic/ui/heart_container.png', 'heartContainer');
  load('assets/pic/ui/heart_fill.png', 'heartFill');
  load('assets/pic/ui/trophy_container.png', 'trophyContainer');
  load('assets/pic/ui/trophy_fill.png', 'trophyFill');
  load('assets/pic/ui/progress.png', 'uiProgress');
  load('assets/pic/ui/cat.png', 'followPlayerCat');
  load('assets/pic/ui/cat_head.png', 'uiCatHead');
  load('assets/pic/ui/inventory_container.png', 'invContainer');
  load('assets/pic/player_cat/cat_right.png', 'inventoryProgressCat');
  load('assets/pic/ui/menu.png', 'uiMenu');
  load('assets/pic/ui/exit.png', 'uiExit');
  load('assets/pic/ui/level_1.png', 'uiLevel1');
  load('assets/pic/ui/level_2.png', 'uiLevel2');
  load('assets/pic/ui/level_3.png', 'uiLevel3');




  // 地面/平台贴图（assets/pic/ground 中全部）
  const groundTiles = [
    'grass_block_side', 'dirt', 'stone', 'deepslate',
    'deepslate_diamond_ore', 'deepslate_iron_ore',
    'diamond_ore', 'iron_ore', 'lava', 'acid', 'water', 'sand', 'gravel',
    'bricks', 'pipe_narrow', 'deepslate_bricks', 'pipe_wide', 'pipe_wide_inner_corner', 'pipe_wide_outer_corner', 'pipe_narrow_corner', 'pipe_narrow_to_wide', 'pipe_narrow_to_narrow', 'spike', 'trap', 'button', 'button_pressed',
    // 树（仅作为背景装饰使用）
    'oak_leaves', 'oak_log',
    // 关卡2：水下植物与珊瑚（仅背景装饰）
    'seagrass', 'tall_seagrass_1', 'tall_seagrass_2',
    'tube_coral', 'tube_coral_fan',
    'kelp_1', 'kelp_2', 'kelp_3', 'kelp_4', 'kelp_5',
    'horn_coral', 'horn_coral_fan',
    'fire_coral', 'fire_coral_fan',
    'bubble_coral', 'bubble_coral_fan',
    'brain_coral', 'brain_coral_fan'
  ];
  groundTiles.forEach(name => loadImage(`assets/pic/ground/${name}.png`, img => window[`tile_${name.replace(/-/g, '_')}`] = img, () => console.warn(`pic/ground/${name}.png 加载失败`)));
  const surroundingTiles = ['dandelion', 'orange_tulip', 'pink_tulip', 'poppy', 'red_mushroom', 'red_tulip', 'brown_mushroom'];
  surroundingTiles.forEach(name => load(`assets/pic/surrounding/${name}.png`, `tile_${name}`));
  //加载游戏开始界面
  loadImage('assets/pic/bg/startscreen.png', img => window.startBg = img, () => console.warn('加载失败'));



}

//每一帧更新游戏状态并绘制
//加入游戏状态管理：开始界面、游戏进行中、结束界面
function draw() {

  applyGameFont();
  if (drawingContext) {
    drawingContext.fontKerning = 'none';
  }
  if (game.state === "start") {
    drawStartScreen();
  }
  else if (game.state === "levelSelect") {
    drawLevelSelectScreen();
  }
  else if (game.state === "settings") {
    drawSettingsScreen();
  }
  else if (game.state === "playing") {
    game.update();
    game.draw();
  }
  else if (game.state === "gameover") {
    game.draw();
    drawGameOverScreen();
  }
  else if (game.state === "victory") {
    game.draw();
    drawVictoryScreen();
  }
}

function keyPressed() {
  let inputKey = null;
  if (key && key.length === 1) inputKey = key.toLowerCase();

  // p5 常量 ENTER/ESCAPE 为 event.key 字符串；需同时兼容 keyCode（13 / 27）
  const enterPressed = key === ENTER || keyCode === 13;
  const escapePressed = key === ESCAPE || keyCode === 27;

  // 防止长按重复触发
  if (inputKey && keys[inputKey] === true) {
    return false;
  }

  // 记录按键状态
  if (inputKey) {
    keys[inputKey] = true;
    pressedKeys.add(inputKey);
  }

  // ===== 菜单状态 =====
  if (game.state === "start") {
    if (enterPressed) {
      game.state = "levelSelect";
    }
    return false;
  }

  if (game.state === "levelSelect") {
    if (inputKey === '1') {
      game = createGameWithSameSettings("forest");
      game.setup();
      game.beginPlaying();
      return false;
    }
    if (inputKey === '2') {
      game = createGameWithSameSettings("water");
      game.setup();
      game.beginPlaying();
      return false;
    }
    if (inputKey === '3') {
      game = createGameWithSameSettings("factory");
      game.setup();
      game.beginPlaying();
      return false;
    }
    if (escapePressed) {
      game.state = "start";
      return false;
    }
    return false;
  }

  if (game.state === "settings") {
    if (escapePressed) {
      game.state = "start";
    }
    return false;
  }

  if (game.state === "gameover" || game.state === "victory") {
    if (enterPressed) {
      game.resetToStartScreen();
    }
    return false;
  }

  // ===== 非 playing 状态直接结束 =====
  if (game.state !== "playing") return false;

  // ===== 游戏内操作 =====
  if (inputKey === 'f') {
    game.tryAttack();
    return false;
  }

  if (inputKey === 'w') {
    // 水中上浮由 update 内 readVerticalMoveIntent().up + keyIsDown 处理，此处不跳
    if (game.level && game.player && typeof game.player.isInWater === "function") {
      if (game.player.isInWater(game.level)) {
        return false;
      }
    }

    if (game.player) {
      game.player.jump();
    }
    return false;
  }

  return false;
}

function keyReleased() {
  let releasedKey = null;
  if (key && key.length === 1) releasedKey = key.toLowerCase();

  if (!releasedKey) return;

  keys[releasedKey] = false;
  pressedKeys.delete(releasedKey);
  
  console.log("按键释放:", key, keyCode, "a:", keys['a'], "d:", keys['d'], "w:", keys['w'], "Set:", Array.from(pressedKeys));
}

// 窗口失焦时清除所有按键状态（防止切换窗口导致按键卡住）
function windowBlurred() {
  console.log("窗口失焦，清除所有按键"); // 调试用
  keys = {};
  pressedKeys.clear(); // 清空 Set
}

function mousePressed() {
  if (!game) return;

  // 游戏中保留原本点击逻辑
  if (game.state === "playing") {
    if (typeof game.handleMousePressed === "function") {
      game.handleMousePressed(mouseX, mouseY);
    }
    return;
  }

  // 开始页面
  if (game.state === "start") {
    const ui = getStartScreenRects();

    if (isInside(mouseX, mouseY, ui.startBtn)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      game.state = "levelSelect";
      return;
    }

    if (isInside(mouseX, mouseY, ui.settingsBtn)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      game.state = "settings";
      return;
    }
  }

  // 选关页面
  if (game.state === "levelSelect") {
    const ui = getLevelSelectRects();

    if (isInside(mouseX, mouseY, ui.level1)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      game = createGameWithSameSettings("forest");
      game.setup();
      game.beginPlaying();
      return;
    }

    if (isInside(mouseX, mouseY, ui.level2)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      game = createGameWithSameSettings("water");
      game.setup();
      game.beginPlaying();
      return;
    }

    if (isInside(mouseX, mouseY, ui.level3)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      game = createGameWithSameSettings("factory");
      game.setup();
      game.beginPlaying();
      return;
    }

    if (isInside(mouseX, mouseY, ui.backBtn)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      game.state = "start";
      return;
    }
  }

  // 设置页面
  if (game.state === "settings") {
    const ui = getSettingsRects();
    const s = game.settings;

    if (isInside(mouseX, mouseY, ui.musicMinus)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      s.musicVolume = max(0, s.musicVolume - 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.musicPlus)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      s.musicVolume = min(100, s.musicVolume + 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.sfxMinus)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      s.sfxVolume = max(0, s.sfxVolume - 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.sfxPlus)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      s.sfxVolume = min(100, s.sfxVolume + 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.fullscreen)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      s.fullscreen = !s.fullscreen;
      let fs = fullscreen();
      fullscreen(!fs);
      return;
    }

    if (isInside(mouseX, mouseY, ui.language)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      const currentIndex = SUPPORTED_LANGUAGES.indexOf(s.language);
      const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
      s.language = SUPPORTED_LANGUAGES[nextIndex];
      return;
    }

    if (isInside(mouseX, mouseY, ui.backBtn)) {
      tryPlaySfx('click', { volume: 0.32, rate: 1 });
      game.state = "start";
      return;
    }
  }

  // game over / victory 页面，鼠标点击回开始页
  if (game.state === "gameover" || game.state === "victory") {
    tryPlaySfx('click', { volume: 0.32, rate: 1 });
    game.resetToStartScreen();
  }
}

// ====== startscreen ======
function t(en, zh) {
  if (!game || !game.settings) return en;
  const lang = game.settings.language || DEFAULT_LANGUAGE;
  if (lang === '中文') return zh;
  if (lang === 'EN') return en;
  return I18N_BY_EN[en]?.[lang] || en;
}

function isInside(mx, my, rect) {
  return mx >= rect.x && mx <= rect.x + rect.w &&
         my >= rect.y && my <= rect.y + rect.h;
}

function drawMenuButton(x, y, w, h, label, hovered = false, style = {}) {
  push();
  // Icon-only mode: render ONLY the icon, no border/fill/label.
  if (style.onlyIcon) {
    const iconImage = style.iconImage;
    if (iconImage && iconImage.width > 0) {
      const iconW = style.iconW ?? 20;
      const iconH = style.iconH ?? 20;
      const align = style.iconAlign ?? "bottomRight";
      let cx = x + w / 2;
      let cy = y + h / 2;
      if (align === "bottomRight") {
        cx = x + w - iconW / 2;
        cy = y + h - iconH / 2;
      }
      imageMode(CENTER);
      noTint();
      image(iconImage, cx, cy, iconW, iconH);
    }
    pop();
    return;
  }

  const borderColor = hovered
    ? (style.hoverBorderColor ?? color(255, 235, 160))
    : (style.borderColor ?? color(0));
  const topColor = hovered
    ? (style.hoverTopColor ?? color(255, 210, 70))
    : (style.topColor ?? color(110, 170, 255));
  const bottomColor = hovered
    ? (style.hoverBottomColor ?? color(234, 124, 0))
    : (style.bottomColor ?? color(73, 140, 253));
  const labelColor = hovered
    ? (style.hoverLabelColor ?? style.labelColor ?? color(255))
    : (style.labelColor ?? color(255));
  const labelStrokeColor = hovered
    ? (style.hoverLabelStrokeColor ?? style.labelStrokeColor ?? color(0))
    : (style.labelStrokeColor ?? color(0));
  const labelStrokeWeight = style.labelStrokeWeight ?? 2;
  const labelSize = style.labelSize ?? 20;
  const labelYFactor = style.labelYFactor ?? 0.5;
  const labelYOffset = style.labelYOffset ?? 0;
  const borderWeight = style.borderWeight ?? 10;
  const borderOffsetY = style.borderOffsetY ?? 2;
  const midY = y + h / 2;

  // Draw border first so it stays beneath the fill layers.
  const cutCorners = style.cutCorners ?? false;
  const cornerCutSize = style.cornerCutSize ?? 6;
  const bw = Math.max(1, Math.floor(borderWeight));
  // When using filled borders (cut-corner mode), we must keep fills inside the border,
  // otherwise the fill will cover the border entirely.
  const fillInset = cutCorners ? bw : 0;
  const fillX = x + fillInset;
  const fillY = y + fillInset;
  const fillW = Math.max(0, w - fillInset * 2);
  const fillH = Math.max(0, h - fillInset * 2);
  const fillMidY = fillY + fillH / 2;
  if (cutCorners) {
    const cut = Math.max(0, Math.floor(cornerCutSize));
    const by = y + borderOffsetY;
    noStroke();
    fill(borderColor);
    // Top / bottom edges (skip corner squares).
    rect(x + cut, by, Math.max(0, w - cut * 2), bw);
    rect(x + cut, by + h - bw, Math.max(0, w - cut * 2), bw);
    // Left / right edges (skip corner squares).
    rect(x, by + cut, bw, Math.max(0, h - cut * 2));
    rect(x + w - bw, by + cut, bw, Math.max(0, h - cut * 2));
  } else {
    stroke(borderColor);
    strokeWeight(borderWeight);
    noFill();
    rect(x, y + borderOffsetY, w, h);
  }

  // Fill top half.
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(fillX, fillY, fillW, fillH / 2);
  drawingContext.clip();
  noStroke();
  fill(topColor);
  rect(fillX, fillY, fillW, fillH);
  drawingContext.restore();

  // Fill bottom half.
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(fillX, fillMidY, fillW, fillH / 2);
  drawingContext.clip();
  noStroke();
  fill(bottomColor);
  rect(fillX, fillY, fillW, fillH);
  drawingContext.restore();

  stroke(labelStrokeColor);
  strokeWeight(labelStrokeWeight);
  fill(labelColor);
  textAlign(CENTER, CENTER);
  textSize(labelSize);
  text(label, x + w / 2, y + h * labelYFactor + labelYOffset);

  // Optional icon for rich menu buttons (e.g. level preview).
  const iconImage = style.iconImage;
  if (iconImage && iconImage.width > 0) {
    const iconW = style.iconW ?? 128;
    const iconH = style.iconH ?? 128;
    const iconCenterYOffset = style.iconCenterYOffset ?? h * 0.72;
    const iconOutlineColor = style.iconOutlineColor ?? labelStrokeColor;
    const iconOutlineWeight = style.iconOutlineWeight ?? labelStrokeWeight;
    imageMode(CENTER);
    noTint();
    image(iconImage, x + w / 2, y + iconCenterYOffset, iconW, iconH);

    // Outline for the icon (match label stroke style).
    if (iconOutlineWeight > 0) {
      push();
      rectMode(CENTER);
      noFill();
      stroke(iconOutlineColor);
      strokeWeight(iconOutlineWeight);
      rect(x + w / 2, y + iconCenterYOffset, iconW, iconH);
      pop();
    }

    // Optional trophy row (drawn beneath the icon).
    const trophySlots = Math.max(0, Math.floor(style.trophySlots ?? 0));
    if (trophySlots > 0) {
      const trophyFilled = Math.min(Math.max(0, Math.floor(style.trophyFilled ?? 0)), trophySlots);
      const trophySize = style.trophySize ?? 20;
      const trophyGap = style.trophyGap ?? 4;
      const trophyStride = trophySize + trophyGap;
      const trophiesW = trophySlots * trophySize + (trophySlots - 1) * trophyGap;
      const trophyX0 = x + w / 2 - trophiesW / 2;
      const trophyY = y + (style.trophyY ?? (iconCenterYOffset + iconH / 2 + 12));
      const trophyContainerImg = window.trophyContainer;
      const trophyFillImg = window.trophyFill;
      imageMode(CORNER);

      for (let i = 0; i < trophySlots; i++) {
        const tx = trophyX0 + i * trophyStride;
        if (trophyContainerImg && trophyContainerImg.width > 0) {
          image(trophyContainerImg, tx, trophyY, trophySize, trophySize);
        } else {
          noStroke();
          fill(80);
          rect(tx, trophyY, trophySize, trophySize);
        }
        if (i < trophyFilled) {
          if (trophyFillImg && trophyFillImg.width > 0) {
            image(trophyFillImg, tx, trophyY, trophySize, trophySize);
          } else {
            noStroke();
            fill(220, 200, 60);
            rect(tx + 2, trophyY + 2, trophySize - 4, trophySize - 4);
          }
        }
      }
    }
  }
  pop();
}

function getStartScreenRects() {
  const startBtnW = 140;
  const startBtnH = 52;
  const settingsBtnW = 140;
  const settingsBtnH = 52;

  return {
    startBtn: {
      x: width / 2 - startBtnW / 2,
      y: 150,
      w: startBtnW,
      h: startBtnH
    },
    settingsBtn: {
      x: width / 2 - settingsBtnW / 2,
      y: 220,
      w: settingsBtnW,
      h: settingsBtnH
    }
  };
}

function getLevelSelectRects() {
  const levelBtnW = 180;
  const levelBtnH = 200;
  const levelBtnGap = 30;
  const backBtnX = 20;
  const levelStartX = backBtnX;
  const levelBtnY = height / 2 - levelBtnH / 2;
  return {
    level1: { x: levelStartX, y: levelBtnY, w: levelBtnW, h: levelBtnH },
    level2: { x: levelStartX + levelBtnW + levelBtnGap, y: levelBtnY, w: levelBtnW, h: levelBtnH },
    level3: { x: levelStartX + (levelBtnW + levelBtnGap) * 2, y: levelBtnY, w: levelBtnW, h: levelBtnH },
    backBtn: { x: backBtnX, y: 20, w: 80, h: 52 }
  };
}

function getSettingsRects() {
  return {
    musicMinus: { x: 360, y: 100, w: 42, h: 42 },
    musicPlus:  { x: 500, y: 100, w: 42, h: 42 },

    sfxMinus:   { x: 360, y: 155, w: 42, h: 42 },
    sfxPlus:    { x: 500, y: 155, w: 42, h: 42 },

    fullscreen: { x: 360, y: 215, w: 180, h: 42 },
    language:   { x: 360, y: 275, w: 180, h: 42 },

    backBtn:    { x: 20, y: 20, w: 80, h: 52 }
  };
}

// ====== startscreen ======
function drawStartScreen() {
  imageMode(CORNER);
  if (window.startBg && window.startBg.width > 0) {
    image(window.startBg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    background(50, 50, 100);
  }

  // Top-center game title on the start screen.
  push();
  // Force the title font to always be MojangRegular (independent of current language).
  textFont(FONT_CONFIGS.mojangRegular.family);
  textAlign(CENTER, TOP);
  textSize(48);
  textStyle(BOLD);
  const titleY = 56;
  const titleGap = 14;
  const titleWords = [
    { text: "SUPER", topColor: [253, 184, 0], bottomColor: [234, 124, 0] },
    { text: "CAT", topColor: [253, 184, 0], bottomColor: [234, 124, 0] },
    { text: "&", topColor: [122, 214, 252], bottomColor: [73, 140, 253] },
    { text: "STEVE", topColor: [253, 184, 0], bottomColor: [234, 124, 0] }
  ];
  const totalTitleWidth = titleWords.reduce((sum, word, index) => {
    const gap = index < titleWords.length - 1 ? titleGap : 0;
    return sum + textWidth(word.text) + gap;
  }, 0);

  const drawSplitTitleWord = (wordText, centerX, topY, topColor, bottomColor) => {
    const w = textWidth(wordText);
    const h = textAscent() + textDescent();
    const splitY = topY + h * 0.5;
    const pad = 10;
    const outlineOffsetY = 2;

    // Draw a dark base first, then paint split colors on top.
    stroke(0, 0, 0, 255);
    strokeWeight(10);
    fill(0, 0, 0, 255);
    text(wordText, centerX, topY + outlineOffsetY);

    // Draw top half color.
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(centerX - w / 2 - pad, topY - pad, w + pad * 2, (splitY - topY) + pad);
    drawingContext.clip();
    noStroke();
    fill(topColor[0], topColor[1], topColor[2]);
    text(wordText, centerX, topY);
    drawingContext.restore();

    // Draw bottom half color.
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(centerX - w / 2 - pad, splitY, w + pad * 2, (topY + h - splitY) + pad);
    drawingContext.clip();
    noStroke();
    fill(bottomColor[0], bottomColor[1], bottomColor[2]);
    text(wordText, centerX, topY);
    drawingContext.restore();
  };

  let titleX = width / 2 - totalTitleWidth / 2;
  for (const word of titleWords) {
    const w = textWidth(word.text);
    drawSplitTitleWord(word.text, titleX + w / 2, titleY, word.topColor, word.bottomColor);
    titleX += w + titleGap;
  }
  textStyle(NORMAL);
  noStroke();
  fill(255);
  pop();

  fill(255);
  textAlign(CENTER, CENTER);
  
textSize(16);
fill(255, 230, 180);

const ui = getStartScreenRects();
const startBtnStyle = {
  borderColor: color(0),
  hoverBorderColor: color(255),
  topColor: color(253, 184, 0),
  bottomColor: color(234, 124, 0),
  hoverTopColor: color(255, 234, 0),
  hoverBottomColor: color(254, 174, 0),
  labelColor: color(0),
  hoverLabelColor: color(255),
  labelStrokeColor: color(255, 245, 200),
  hoverLabelStrokeColor: color(234, 124, 0),
  labelStrokeWeight: 4,
  borderWeight: 3,
  borderOffsetY: 0,
  cutCorners: true,
  cornerCutSize: 3
};
const settingsBtnStyle = {
  borderColor: color(0),
  hoverBorderColor: color(255),
  topColor: color(122, 214, 252),
  bottomColor: color(73, 140, 253),
  hoverTopColor: color(195, 245, 255),
  hoverBottomColor: color(122, 214, 252),
  labelColor: color(0),
  hoverLabelColor: color(255),
  labelStrokeColor: color(222, 255, 252),
  hoverLabelStrokeColor: color(73, 140, 253),
  labelStrokeWeight: 4,
  borderWeight: 3,
  borderOffsetY: 0,
  cutCorners: true,
  cornerCutSize: 3
};

drawMenuButton(
  ui.startBtn.x, ui.startBtn.y, ui.startBtn.w, ui.startBtn.h,
  t("Start", "开始"),
  isInside(mouseX, mouseY, ui.startBtn),
  startBtnStyle
);

drawMenuButton(
  ui.settingsBtn.x, ui.settingsBtn.y, ui.settingsBtn.w, ui.settingsBtn.h,
  t("Settings", "设置"),
  isInside(mouseX, mouseY, ui.settingsBtn),
  settingsBtnStyle
);

const startHintText = t("Press  Start  to  begin  your  adventure!", "点击开始进入游戏！");
const startHintX = width / 2;
const startHintY = ui.settingsBtn.y + ui.settingsBtn.h + 60;
const pulseScale = 1 + 0.01 * sin(millis() * 0.006);

textAlign(CENTER, CENTER);
textSize(16);
noStroke();

// Draw shadow to the bottom-right.
push();
translate(startHintX + 1.5, startHintY + 1.5);
scale(pulseScale);
fill(0, 0, 0, 170);
text(startHintText, 0, 0);
pop();

// Draw main hint text.
push();
translate(startHintX, startHintY);
scale(pulseScale);
fill(255, 255, 0);
text(startHintText, 0, 0);
pop();
}

function drawLevelSelectScreen() {
  if (window.startBg && window.startBg.width > 0) {
    image(window.startBg, 0, 0, width, height);
  } else {
    background(50, 50, 100);
  }

  fill(255);
  textAlign(CENTER, CENTER);

  textSize(32);

  textSize(16);
  fill(230);

  const ui = getLevelSelectRects();
  const trophyProgress = game?.settings?.levelTrophies || { forest: 0, water: 0, factory: 0 };
  const slotsForest = TROPHY_SLOTS_BY_LEVEL.forest ?? MAX_TROPHY_SLOTS;
  const slotsWater = TROPHY_SLOTS_BY_LEVEL.water ?? MAX_TROPHY_SLOTS;
  const slotsFactory = TROPHY_SLOTS_BY_LEVEL.factory ?? MAX_TROPHY_SLOTS;
  const level1BtnStyle = {
    borderColor: color(0),
    hoverBorderColor: color(255),
    topColor: color(145, 225, 170),
    bottomColor: color(80, 185, 115),
    hoverTopColor: color(195, 245, 210),
    hoverBottomColor: color(120, 210, 145),
    labelColor: color(0),
    hoverLabelColor: color(255),
    labelStrokeColor: color(210, 255, 220),
    hoverLabelStrokeColor: color(60, 150, 80),
    labelStrokeWeight: 4,
    labelSize: 18,
    labelYFactor: 0.13,
    iconImage: window.uiLevel1,
    iconOutlineWeight: 3,
    iconW: 128,
    iconH: 128,
    iconCenterYOffset: 104,
    trophySlots: slotsForest,
    trophyFilled: trophyProgress.forest ?? 0,
    trophySize: 20,
    trophyGap: 4,
    trophyY: 174,
    borderWeight: 3,
    borderOffsetY: 0,
    cutCorners: true,
    cornerCutSize: 3
  };
  const level2BtnStyle = {
    borderColor: color(0),
    hoverBorderColor: color(255),
    topColor: color(150, 210, 255),
    bottomColor: color(95, 165, 245),
    hoverTopColor: color(195, 245, 255),
    hoverBottomColor: color(122, 214, 252),
    labelColor: color(0),
    hoverLabelColor: color(255),
    labelStrokeColor: color(222, 255, 252),
    hoverLabelStrokeColor: color(73, 140, 253),
    labelStrokeWeight: 4,
    labelSize: 18,
    labelYFactor: 0.13,
    iconImage: window.uiLevel2,
    iconOutlineWeight: 3,
    iconW: 128,
    iconH: 128,
    iconCenterYOffset: 104,
    trophySlots: slotsWater,
    trophyFilled: trophyProgress.water ?? 0,
    trophySize: 20,
    trophyGap: 4,
    trophyY: 174,
    borderWeight: 3,
    borderOffsetY: 0,
    cutCorners: true,
    cornerCutSize: 3
  };
  const level3BtnStyle = {
    borderColor: color(0),
    hoverBorderColor: color(0),
    topColor: color(205, 120, 95),
    bottomColor: color(140, 70, 50),
    hoverTopColor: color(242, 170, 140),
    hoverBottomColor: color(186, 116, 90),
    labelColor: color(0),
    hoverLabelColor: color(255),
    labelStrokeColor: color(235, 205, 196),
    hoverLabelStrokeColor: color(126, 70, 55),
    labelStrokeWeight: 4,
    labelSize: 18,
    labelYFactor: 0.13,
    iconImage: window.uiLevel3,
    iconOutlineWeight: 3,
    iconW: 128,
    iconH: 128,
    iconCenterYOffset: 104,
    trophySlots: slotsFactory,
    trophyFilled: trophyProgress.factory ?? 0,
    trophySize: 20,
    trophyGap: 4,
    trophyY: 174,
    borderWeight: 3,
    borderOffsetY: 0,
    cutCorners: true,
    cornerCutSize: 3
  };
  const backBtnStyle = {
    borderColor: color(0),
    hoverBorderColor: color(255),
    topColor: color(253, 184, 0),
    bottomColor: color(234, 124, 0),
    hoverTopColor: color(255, 234, 0),
    hoverBottomColor: color(254, 174, 0),
    labelColor: color(0),
    hoverLabelColor: color(255),
    labelStrokeColor: color(255, 245, 200),
    hoverLabelStrokeColor: color(234, 124, 0),
    labelStrokeWeight: 4,
    borderWeight: 3,
    borderOffsetY: 0,
    cutCorners: true,
    cornerCutSize: 3
  };

  drawMenuButton(
    ui.level1.x, ui.level1.y, ui.level1.w, ui.level1.h,
    t("Forest", "森林"),
    isInside(mouseX, mouseY, ui.level1),
    level1BtnStyle
  );

  drawMenuButton(
    ui.level2.x, ui.level2.y, ui.level2.w, ui.level2.h,
    t("Ocean", "海洋"),
    isInside(mouseX, mouseY, ui.level2),
    level2BtnStyle
  );

  drawMenuButton(
    ui.level3.x, ui.level3.y, ui.level3.w, ui.level3.h,
    t("Factory", "工厂"),
    isInside(mouseX, mouseY, ui.level3),
    level3BtnStyle
  );

  const levelHintText = t("Choose  your  level!", "请选择关卡！");
  const levelHintX = width / 2;
  const startUi = getStartScreenRects();
  const levelHintY = startUi.settingsBtn.y + startUi.settingsBtn.h + 60;
  const levelHintPulseScale = 1 + 0.01 * sin(millis() * 0.006);

  textAlign(CENTER, CENTER);
  textSize(16);
  noStroke();

  // Draw shadow to the bottom-right.
  push();
  translate(levelHintX + 1.5, levelHintY + 1.5);
  scale(levelHintPulseScale);
  fill(0, 0, 0, 170);
  text(levelHintText, 0, 0);
  pop();

  // Draw main hint text.
  push();
  translate(levelHintX, levelHintY);
  scale(levelHintPulseScale);
  fill(255, 255, 0);
  text(levelHintText, 0, 0);
  pop();

  drawMenuButton(
    ui.backBtn.x, ui.backBtn.y, ui.backBtn.w, ui.backBtn.h,
    t("Back", "返回"),
    isInside(mouseX, mouseY, ui.backBtn),
    backBtnStyle
  );
}

function drawSettingsScreen() {
  if (window.startBg && window.startBg.width > 0) {
    image(window.startBg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    background(28, 35, 60);
  }

  stroke(255);
  strokeWeight(4);
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(32);
  text(t("Settings", "设置"), width / 2, 55);

  const s = game.settings;
  const ui = getSettingsRects();
  const settingsThemeBtnStyle = {
    borderColor: color(0),
    hoverBorderColor: color(255),
    topColor: color(122, 214, 252),
    bottomColor: color(73, 140, 253),
    hoverTopColor: color(195, 245, 255),
    hoverBottomColor: color(122, 214, 252),
    labelColor: color(0),
    hoverLabelColor: color(255),
    labelStrokeColor: color(222, 255, 252),
    hoverLabelStrokeColor: color(73, 140, 253),
    labelStrokeWeight: 4,
    borderWeight: 3,
    borderOffsetY: 0,
    cutCorners: true,
    cornerCutSize: 3
  };

  textAlign(LEFT, CENTER);
  textSize(20);
  stroke(255);
  strokeWeight(4);
  fill(0);

  text(t("Music  Volume", "音乐音量"), 100, 120);
  text(`${s.musicVolume}`, 440, 120);
  drawMenuButton(
    ui.musicMinus.x, ui.musicMinus.y, ui.musicMinus.w, ui.musicMinus.h,
    "-",
    isInside(mouseX, mouseY, ui.musicMinus),
    settingsThemeBtnStyle
  );
  drawMenuButton(
    ui.musicPlus.x, ui.musicPlus.y, ui.musicPlus.w, ui.musicPlus.h,
    "+",
    isInside(mouseX, mouseY, ui.musicPlus),
    settingsThemeBtnStyle
  );

  text(t("SFX Volume", "音效音量"), 100, 175);
  text(`${s.sfxVolume}`, 440, 175);
  drawMenuButton(
    ui.sfxMinus.x, ui.sfxMinus.y, ui.sfxMinus.w, ui.sfxMinus.h,
    "-",
    isInside(mouseX, mouseY, ui.sfxMinus),
    settingsThemeBtnStyle
  );
  drawMenuButton(
    ui.sfxPlus.x, ui.sfxPlus.y, ui.sfxPlus.w, ui.sfxPlus.h,
    "+",
    isInside(mouseX, mouseY, ui.sfxPlus),
    settingsThemeBtnStyle
  );

  text(t("Fullscreen", "全屏开关"), 100, 235);
  drawMenuButton(
    ui.fullscreen.x, ui.fullscreen.y, ui.fullscreen.w, ui.fullscreen.h,
    s.fullscreen ? t("ON", "开启") : t("OFF", "关闭"),
    isInside(mouseX, mouseY, ui.fullscreen),
    settingsThemeBtnStyle
  );

  text(t("Language", "语言切换"), 100, 295);
  drawMenuButton(
    ui.language.x, ui.language.y, ui.language.w, ui.language.h,
    s.language,
    isInside(mouseX, mouseY, ui.language),
    settingsThemeBtnStyle
  );

  drawMenuButton(
    ui.backBtn.x, ui.backBtn.y, ui.backBtn.w, ui.backBtn.h,
    t("Back", "返回"),
    isInside(mouseX, mouseY, ui.backBtn),
    {
      borderColor: color(0),
      hoverBorderColor: color(255),
      topColor: color(253, 184, 0),
      bottomColor: color(234, 124, 0),
      hoverTopColor: color(255, 234, 0),
      hoverBottomColor: color(254, 174, 0),
      labelColor: color(0),
      hoverLabelColor: color(255),
      labelStrokeColor: color(255, 245, 200),
      hoverLabelStrokeColor: color(234, 124, 0),
      labelStrokeWeight: 4,
      borderWeight: 3,
      borderOffsetY: 0,
      cutCorners: true,
      cornerCutSize: 3
    }
  );
}


function drawSplitOverlayTitle(wordText, centerX, centerY, topColor, bottomColor, outlineColor = [0, 0, 0], outlineWeight = 10) {
  const w = textWidth(wordText);
  const h = textAscent() + textDescent();
  const topY = centerY - h / 2;
  const splitY = centerY;
  const pad = 10;

  // Dark outline/base.
  stroke(outlineColor[0], outlineColor[1], outlineColor[2], 255);
  strokeWeight(outlineWeight);
  fill(outlineColor[0], outlineColor[1], outlineColor[2], 255);
  text(wordText, centerX, centerY + 2);

  // Top half color.
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(centerX - w / 2 - pad, topY - pad, w + pad * 2, (splitY - topY) + pad);
  drawingContext.clip();
  noStroke();
  fill(topColor[0], topColor[1], topColor[2]);
  text(wordText, centerX, centerY);
  drawingContext.restore();

  // Bottom half color.
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(centerX - w / 2 - pad, splitY, w + pad * 2, (topY + h - splitY) + pad);
  drawingContext.clip();
  noStroke();
  fill(bottomColor[0], bottomColor[1], bottomColor[2]);
  text(wordText, centerX, centerY);
  drawingContext.restore();
}

//===== gameover screen ======
function drawGameOverScreen() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  // 每行文字独立样式（可分别调文字色/描边色）
  const gameOverTitleStyle = {
    topColor: [253, 184, 0],
    bottomColor: [234, 124, 0],
    outlineColor: [0, 0, 0],
    outlineWeight: 10
  };
  const gameOverHintStyle = { fill: [0, 0, 0], stroke: [0, 0, 0], strokeWeight: 3 };

  textAlign(CENTER, CENTER);
  textSize(48);
  drawSplitOverlayTitle(
    t("YOU  LOSE!", "你失败了！"),
    width / 2,
    height / 2,
    gameOverTitleStyle.topColor,
    gameOverTitleStyle.bottomColor,
    gameOverTitleStyle.outlineColor,
    gameOverTitleStyle.outlineWeight
  );

  textSize(16);
  const gameOverHintText = t("Press  ENTER  to  Restart.", "按 ENTER 重新开始。");
  const gameOverHintX = width / 2;
  const gameOverHintY = height - 32;
  const gameOverHintPulseScale = 1 + 0.01 * sin(millis() * 0.006);
  noStroke();
  push();
  translate(gameOverHintX + 1.5, gameOverHintY + 1.5);
  scale(gameOverHintPulseScale);
  fill(0, 0, 0, 170);
  text(gameOverHintText, 0, 0);
  pop();
  push();
  translate(gameOverHintX, gameOverHintY);
  scale(gameOverHintPulseScale);
  fill(255, 255, 0);
  text(gameOverHintText, 0, 0);
  pop();
}


function drawVictoryScreen() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  // 每行文字独立样式（可分别调文字色/描边色）
  const victoryTitleStyle = {
    topColor: [122, 214, 252],
    bottomColor: [73, 140, 253],
    outlineColor: [0, 0, 0],
    outlineWeight: 10
  };
  const victoryScoreStyle = { fill: [0, 0, 0], stroke: [0, 0, 0], strokeWeight: 3 };
  const victoryHintStyle = { fill: [0, 0, 0], stroke: [0, 0, 0], strokeWeight: 3 };

  textAlign(CENTER, CENTER);
  textSize(48);
  drawSplitOverlayTitle(
    t("YOU  WIN!", "你赢了！"),
    width / 2,
    height / 2,
    victoryTitleStyle.topColor,
    victoryTitleStyle.bottomColor,
    victoryTitleStyle.outlineColor,
    victoryTitleStyle.outlineWeight
  );
  
  textSize(16);
  const victoryHintText = t("Press  ENTER  to  Play  Again.", "按 ENTER 再玩一次。");
  const victoryHintX = width / 2;
  const victoryHintY = height - 32;
  const victoryHintPulseScale = 1 + 0.01 * sin(millis() * 0.006);
  noStroke();
  push();
  translate(victoryHintX + 1.5, victoryHintY + 1.5);
  scale(victoryHintPulseScale);
  fill(0, 0, 0, 170);
  text(victoryHintText, 0, 0);
  pop();
  push();
  translate(victoryHintX, victoryHintY);
  scale(victoryHintPulseScale);
  fill(255, 255, 0);
  text(victoryHintText, 0, 0);
  pop();
}





if (typeof window !== 'undefined') {
  // Minimal white-box test surface for browser-console tests.
  window.__whitebox = {
    constants: {
      TILE_SIZE,
      TERRAIN_COLS,
      CANVAS_W,
      WORLD_WIDTH,
      INVENTORY_SLOTS,
      MINE_PRESS_MS,
      VICTORY_DELAY_MS,
      T
    },
    classes: {
      Game,
      Player,
      Tool,
      Pollutant,
      ForestLevel,
      FactoryLevel,
      Ladder
    },
    helpers: {
      rectCollision,
      normalizeQuarterTurns,
      rotateLocalRect,
      getPipeBaseCollisionRects,
      buildTileCollisionRects
    }
  };
}


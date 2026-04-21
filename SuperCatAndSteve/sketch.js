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
const MUTUAL_ATTACK_RANGE = 24;  // 敌人和玩家相互攻击的距离（碰撞箱最短距离 < 24px）
const ENEMY_CONTACT_DAMAGE_PER_SEC = 1;
const ENEMY_ATTACK_START_DELAY_MS = 1000;  // 敌人进入攻击范围后延迟才开始造成伤害（毫秒）
const PLAYER_ATTACK_RANGE = 2.2 * TILE_SIZE; // 玩家挥剑攻击范围：70.4 px

// 水中物理（统一参数，应用于水关卡中的实体）
const WATER_GRAVITY = 0.1;   // 基础重力
const WATER_BUOYANCY = 0.08; // 浮力（抵消部分重力）
const WATER_DRAG = 0.8;     // 水中阻力系数

// 贴图类型（地面/平台可选 assets/pic/ground 中任意图片）
const T = {
  NONE: 0,
  GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4,
  COPPER: 5, DEEP_COPPER: 6, DEEP_DIAMOND: 7, DEEP_GOLD: 8, DEEP_IRON: 9,
  DIAMOND: 10, GOLD: 11, IRON: 12,  LAVA: 13, ACID: 14, WATER: 15, SAND: 16, GRAVEL: 17,
  // 工厂关（assets/pic/ground：bricks / pipe_narrow / deepslate_bricks）
  BRICKS: 18, PIPE_NARROW: 19, DEEPSLATE_BRICKS: 20
};

// UI 常量
const SLOT_SIZE = 24, SLOT_GAP = 8, INV_PADDING = 8;
const INV_BAR_W = 10 * (SLOT_SIZE + SLOT_GAP) + INV_PADDING * 2 - SLOT_GAP, INV_BAR_H = 40;
const INVENTORY_PROGRESS_CAT_W = 28, INVENTORY_PROGRESS_CAT_H = 14;
const MAX_HEARTS = 5, HEART_SIZE = 20;
/** 相邻心形容器左边缘间距增量（负值表示重叠） */
const HEART_GAP = 0;
/** 生命栏相对画布左上内边距 */
const HEART_UI_INSET = 4;
/** 得分奖杯栏：槽位数（超过则全部显示为已满） */
const MAX_TROPHY_SLOTS = 5;
/** 奖杯图标绘制边长（与心形栏一致便于对齐） */
const TROPHY_SIZE = HEART_SIZE;
/** 奖杯栏相对画布上、右内边距（整条栏的顶边与最右格右缘） */
const TROPHY_UI_INSET = 4;
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
  'Press Start to begin your adventure': { FR: 'Appuyez sur Démarrer pour commencer votre aventure', RU: 'Нажмите Старт, чтобы начать приключение', JA: 'スタートを押して冒険を始めよう', KO: '시작을 눌러 모험을 시작하세요' },
  'Level 1': { FR: 'Niveau 1', RU: 'Уровень 1', JA: 'レベル1', KO: '레벨 1' },
  'Level 2': { FR: 'Niveau 2', RU: 'Уровень 2', JA: 'レベル2', KO: '레벨 2' },
  'Level 3': { FR: 'Niveau 3', RU: 'Уровень 3', JA: 'レベル3', KO: '레벨 3' },
  'Choose your level': { FR: 'Choisissez votre niveau', RU: 'Выберите уровень', JA: 'レベルを選択', KO: '레벨을 선택하세요' },
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
  'Vine seed must be planted on nearby ground': {FR: 'La graine doit être plantée sur un sol proche',RU: 'Семя лозы можно сажать только на ближайшей земле',JA: '近くの地面にしか植えられない',KO: '가까운地面にのみ植えられます'}
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
    language: settings.language
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

const PIPE_WALL_THICKNESS = 5;

function isPipeTileType(tileType) {
  return !!(
    tileType &&
    typeof tileType === 'object' &&
    typeof tileType.textureKey === 'string' &&
    tileType.textureKey.startsWith('tile_pipe_')
  );
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
    [T.COPPER]: window.tile_copper_ore,
    [T.DEEP_COPPER]: window.tile_deepslate_copper_ore,
    [T.DEEP_DIAMOND]: window.tile_deepslate_diamond_ore,
    [T.DEEP_GOLD]: window.tile_deepslate_gold_ore,
    [T.DEEP_IRON]: window.tile_deepslate_iron_ore,
    [T.DIAMOND]: window.tile_diamond_ore,
    [T.GOLD]: window.tile_gold_ore,
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
    this.victoryAt = 0;
    this.showGuideMenu = false;
    this.activeGuideTab = 0;
    // 游戏状态：start playing gameover victory
    this.state = "start";

    this.settings = {
    musicVolume: 80,
    sfxVolume: 80,
    fullscreen: false,
    language: DEFAULT_LANGUAGE
};

    // --- 新增：统一的得分反馈提示（污染物/救援共用） ---
    this.scoreToastMessage = null;   // 当前显示的得分提示文案
    this.scoreToastUntil = 0;        // 提示显示截止时间戳（millis）
    this.maxPlayerProgress = 0;      // 本局已到达的最远进度（用于背包上的进度猫）
    this.displayedCatProgress = 0;   // HUD 中小猫当前显示的进度（带一点缓动）
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
    
    let scanRange = MUTUAL_ATTACK_RANGE;
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

    // 5. 应用伤害
    if (closest) {
      closest.takeDamage(dmg, this.level);
      this.lastAttackTime = now;
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
  }

  resetHintState() {
    this.victoryAt = 0;
    // 重置得分反馈提示状态（避免关卡切换残留文案）
    this.scoreToastMessage = null;
    this.scoreToastUntil = 0;
}

  update() {
    this.player.update(this.level.platforms, this.level);
    this.updateCamera();

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
      } else if (item instanceof Item) {
        item.update(this.level.platforms, this.level);
      }
    }
    this.checkCollisions();
    this.updateMining();

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
      this.state = "gameover";
      this.showGuideMenu = false;
      this.victoryAt = 0;
      return;
    }
    
    // 胜利条件：到达最后一列（TERRAIN_COLS - 1）且生命值 > 0
    const playerCol = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
    if (playerCol >= TERRAIN_COLS - 1 && this.player.health > 0) {
      if (!this.victoryAt) this.victoryAt = millis() + VICTORY_DELAY_MS;
      if (millis() >= this.victoryAt) {
        this.state = "victory";
        this.showGuideMenu = false;
      }
    } else {
      this.victoryAt = 0;
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
      if (pointedTile.kind === 'terrain' && pointedTile.row === pointedTile.bottomRow) {
        this.state = "gameover";
        this.mouseDownTime = 0;
        return;
      }
      if (pointedTile.kind === 'terrain') {
        this.level.removeTerrainBlock(pointedTile.col, pointedTile.row);
        this.tryWeaponUpgrade(pointedTile.tileType);
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
      this.level.platforms.splice(i, 1);
      this.tryWeaponUpgrade(tileType);
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

  getFoodHealAmount(foodType) {
    if (foodType === 'apple') return 1;
    if (foodType === 'enlarged_golden_apple') return 3;
    return 0;
  }

  handleSelectedToolUse(slotIndex, item) {
    switch (item.toolType) {
      case 'scissor':
        this.tryRescueBirdWithScissor(slotIndex);
        break;
      case 'enlarged_water_bucket':
        this.tryUseWaterBucket();
        break;
      case 'limestone':
        this.tryUseLimestone();
        break;
      case 'vine_seed':
        this.tryPlantVineSeed(slotIndex);
        break;
    }
  }

tryRescueBirdWithScissor(slotIndex) {
    const rescueRange = TILE_SIZE * 1.45;
    const trappedBird = this.level.items.find(item =>
      item instanceof TrappedBird && item.isTrapped() && this.distanceToItem(item) <= rescueRange
    );
    if (!trappedBird) return false;
    
    const target = this.getNearestTreeCrownTarget(trappedBird);
    trappedBird.startRescue(target.x, target.y);
    this.player.inventory.splice(slotIndex, 1);
    this.player.selectedSlot = -1;
    this.player.score += 1;
    // 成功解救小动物：弹出统一得分提示
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
      const useZombieStylePush = enemy instanceof Zombie || enemy instanceof Drowned || enemy instanceof Shark;
      if (!useZombieStylePush) continue;
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

      const forceHorizontalSeparation = useZombieStylePush;
      if (forceHorizontalSeparation || excessY <= 0 || (excessX > 0 && excessX <= excessY)) {
        const dirX = enemyCx >= playerCx ? 1 : -1;
        enemy.x += dirX * excessX;
      } else {
        const dirY = enemyCy >= playerCy ? 1 : -1;
        enemy.y += dirY * excessY;
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
      // 计算这一列中“最底下的实心方块行号”（用于最后一层判定）
      // 注意：row=0 是最底部，从下往上找第一个非空格子
      let bottomRow = -1;
      for (let row = 0; row < column.length; row++) {
        const tileType = column[row];
        if (tileType === T.NONE || tileType === undefined) continue;
        bottomRow = row;
        break;
      }
      if (bottomRow === -1) return null;
      return { col, row: targetRow, bottomRow, kind: 'terrain', tileType: column[targetRow] };
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

handleMousePressed(mx, my) {
  const topRight = this.uiManager.getTopRightButtons();
  if (this.uiManager.isInsideRect(mx, my, topRight.exitRect)) {
    this.resetToStartScreen();
    return;
  }
  if (this.uiManager.isInsideRect(mx, my, topRight.menuRect)) {
    this.showGuideMenu = !this.showGuideMenu;
    return;
  }

  if (this.showGuideMenu) {
    const tabs = this.uiManager.getGuideTabRects();
    for (let i = 0; i < tabs.length; i++) {
      if (this.uiManager.isInsideRect(mx, my, tabs[i])) {
        this.activeGuideTab = i;
        return;
      }
    }
  }

  const slotIndex = this.getInventorySlotAt(mx, my);
  if (slotIndex === -1) return;

  // 记录选中的格子
  this.player.selectedSlot = slotIndex;

  const item = this.player.inventory[slotIndex];
  if (!item) return;

  if (item instanceof Tool) {
    this.handleSelectedToolUse(slotIndex, item);
  }
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

  let changed = 0;

  // 从命中的那一格出发，向左右扩展，把同一行连续的一整片岩浆全部变为石头
  const convertLine = (startCol, row, dir) => {
    let col = startCol;
    while (col >= 0 && col < TERRAIN_COLS) {
      const column = this.level.tileMap[col];
      if (!column || column[row] !== T.LAVA) break;
      column[row] = T.STONE;
      changed++;
      col += dir;
    }
  };

  convertLine(targetCol, targetRow, -1); // 向左
  convertLine(targetCol + 1, targetRow, 1); // 向右（从右边一格开始，避免重复）

  if (changed > 0) {
    this.consumeSelectedTool('enlarged_water_bucket');
    return true;
  }

  return false;
}

tryUseLimestone() {
  // 以玩家碰撞箱中心为基准，扫描一个小范围内的 ACID 并全部转化成 WATER
  const box = this.player.getCollisionBox();
  const wx = box.x + box.w / 2;
  const wy = box.y + box.h - 1;

  const baseCol = Math.floor(wx / TILE_SIZE);

  // 左右多扫几列，保证站在池边也能命中（你池子在 21/22/23，玩家常站 20）
  const cols = [baseCol - 1, baseCol, baseCol + 1, baseCol + 2,baseCol + 3];

  let changed = 0;

  for (const col of cols) {
    if (col < 0 || col >= TERRAIN_COLS) continue;

    const surfaceY = this.level.terrainHeights[col];
    if (surfaceY === undefined) continue;

    const row = Math.floor((wy - surfaceY) / TILE_SIZE);

    // 上下多扫几行，避免池子“垫高/加深”后 row 对不上
    const rows = [row - 1, row, row + 1, row + 2];

    for (const r of rows) {
      if (r < 0) continue;

      const t = this.level.tileMap[col]?.[r];
      if (t === T.ACID) {
        this.level.tileMap[col][r] = T.WATER;
        changed++;
      }
    }
  }

  if (changed > 0) {
    this.consumeSelectedTool('limestone');
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

 checkCollisions() {
  const now = millis();
  if (this.enemyContactLastTick === 0) this.enemyContactLastTick = now;
  const deltaSec = max(0, (now - this.enemyContactLastTick) / 1000);
  this.enemyContactLastTick = now;
  let touchingDamagingEnemy = false;
  // 敌人伤害判定：与玩家碰撞箱最短距离 < 24px 时可攻击
  for (const enemy of this.level.enemies) {
    if (enemy.isDead) continue;
    if (typeof enemy.canDamagePlayer === "function" && !enemy.canDamagePlayer()) continue;
    
    const distToEnemy = this.distanceToEnemyBoxGap(enemy);
    const inAttackRange = distToEnemy < MUTUAL_ATTACK_RANGE;
    
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

  for (let i = this.level.items.length - 1; i >= 0; i--) {
    const item = this.level.items[i];

    // TNT 爆炸后延迟移除（不需要玩家碰到）
    if (item instanceof TNT && item.exploded && millis() >= item.removeAfter) {
      this.level.items.splice(i, 1);
      continue;
    }

    // 只有碰撞到才处理拾取/触发
    if (!this.player.collidesWith(item)) continue;

    // 0) TNT：碰到就触发，不进背包、不加分、不移除
    if (item instanceof TNT) {
      item.arm(millis());
      continue;
    }

    if (item instanceof TrappedBird) {
      continue;
    }

    if (item instanceof Ladder) {
      continue;
    }

    if (item instanceof Pollutant) {
      this.player.score += 1;
      // 收集污染物：弹出统一得分提示
      this.scoreToastMessage = t("Pollutant collected! +1", "收集污染物！+1");
      this.scoreToastUntil = millis() + 1400;
    }

    if (item instanceof Food) {
      const heal = this.getFoodHealAmount(item.foodType);
      if (heal > 0) this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
      this.level.items.splice(i, 1);
      continue;
    }

    // 3) 普通收集并移除（Tool/Weapon/Pollutant 都走这里）
    this.player.collect(item);
    this.level.items.splice(i, 1);
  }
}

  draw() {
    background(168, 193, 254);
    push();
    translate(-this.cameraX, 0);
    this.level.draw();
    this.player.draw();

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
    this.items.push(new Food(70 * TILE_SIZE + 4, groundY(70) - 24, 24, 24, 'apple'));
    this.items.push(new Food(107 * TILE_SIZE + 4, groundY(107) - 24, 24, 24, 'enlarged_golden_apple'));

    // 被困小鸟（网 48x36，鸟 24x30）
    const birdOffset = (TILE_SIZE - 48) / 2;
    this.items.push(new TrappedBird(73 * TILE_SIZE + birdOffset, groundY(73) - 36, 48, 36));
    this.items.push(new TrappedBird(92 * TILE_SIZE + birdOffset, groundY(92) - 36, 48, 36));

    // 工具（平台上 + 地面上，居中放置）Tool(x, y, w, h, toolType)
    // toolType 为 pic/tool 下文件名不含 .png，如 'scissor' 'bucket'
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
    this.items.push(new Food(24 * TILE_SIZE + 4, groundY(24) - 24, 24, 24, 'apple'));

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
      [6,12,[Db,Db,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
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
      [42,12,[Db,N,N,N,N,N,N,N,N,N,Bk,Bk]],
      [43,12,[Db,N,N,N,N,N,N,N,N,N,Bk,Bk]],
      [44,12,[Db,Bk,Bk,N,N,N,N,N,N,N,Bk,Bk]],
      [45,12,[Db,Bk,Bk,N,N,N,N,N,N,Bk,Bk,Bk]],
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
      [70,12,[Db,Db,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [71,12,[Db,Bk,Bk,Bk,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [72,12,[Bk,Bk,N,N,N,N,N,N,N,N,N,PIPE_NARROW_LEFT]],
      [73,12,[A,N,N,N,N,N,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [74,12,[A,N,N,N,N,N,Bk,N,N,N,N,PIPE_NARROW_LEFT]],
      [75,12,[A,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [76,12,[A,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [77,12,[A,N,N,N,N,N,Bk,Bk,N,N,N,PIPE_NARROW_LEFT]],
      [78,12,[Db,Bk,N,N,N,N,Bk,Bk,N,N,Bk,Bk]],
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

      if (tile === T.WATER) {
        const row = i;
        this.tileMap[col][row] = tile;
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
      [18,12,[V,V,SA,W,W,W,W,SA,SA,W,W,W]],
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
      [75,11,[V,V,SA,'fire_coral',W,W,W,W,W,W,W]],
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
      [96,11,[V,SA,SA,SA,W,W,W,W,V,SA,W]],
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

    // ===== 敌人和物品生成（基于当前地形）=====
    this.enemies.push(new Drowned(6 * TILE_SIZE, baseGroundY(6) - 64, 64, 64));
    // shark 使用绝对坐标生成，避免贴地对齐后被非水方块“吸附”
    const sharkSpawnX = 33 * TILE_SIZE;
    const sharkSpawnY = 170;
    this.enemies.push(new Shark(15 * TILE_SIZE, 150, 84, 68));
    this.enemies.push(new Shark(33 * TILE_SIZE, 140, 84, 68));
    this.enemies.push(new Shark(60 * TILE_SIZE, 125, 84, 68));
    this.enemies.push(new Shark(91 * TILE_SIZE, 125, 84, 68));
    this.enemies.push(new Shark(115 * TILE_SIZE, 110, 84, 68));

    // 污染物
   this.items.push(new Pollutant(40 * TILE_SIZE + 4, groundY(40) - 18, 24, 18, "plastic_bottle"));
   this.items.push(new Pollutant(46 * TILE_SIZE + 4, groundY(46) - 18, 24, 18, "plastic_bag"));
   this.items.push(new Pollutant(60 * TILE_SIZE + 4, groundY(60) - 18, 24, 18, "plastic_bottle"));

    // TNT（不可收集，触发后爆炸）
    // this.items.push(new TNT(97 * TILE_SIZE, groundY(97) - TILE_SIZE, TILE_SIZE, TILE_SIZE));

    // 食物（地面上，吃了回血，不进背包）
    // this.items.push(new Food(70 * TILE_SIZE + 4, groundY(70) - 24, 24, 24, 'apple'));
    //this.items.push(new Food(107 * TILE_SIZE + 4, groundY(107) - 24, 24, 24, 'enlarged_golden_apple'));

    // 被困小鸟（网 32x24，鸟 16x20）
    // const birdOffset = (TILE_SIZE - 32) / 2;
    // this.items.push(new TrappedBird(73 * TILE_SIZE + birdOffset, groundY(73) - 24, 32, 24));
    // this.items.push(new TrappedBird(92 * TILE_SIZE + birdOffset, groundY(92) - 24, 32, 24));

    // 工具（平台上 + 地面上，居中放置）Tool(x, y, w, h, toolType)
    // toolType 为 pic/tool 下文件名不含 .png，如 'scissor' 'bucket'
    const toolOffset = (TILE_SIZE - 24) / 2;
    // 剪刀
    // this.items.push(new Tool(28 * TILE_SIZE + toolOffset, groundY(28) - 24, 24, 24, 'scissor'));
    // this.items.push(new Tool(92 * TILE_SIZE + toolOffset, baseGroundY(92) - 24, 24, 24, 'scissor'));
    // 水桶
    this.items.push(new Tool(8 * TILE_SIZE + toolOffset, groundY(8) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(23 * TILE_SIZE + toolOffset, groundY(23) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(29 * TILE_SIZE + toolOffset, groundY(29) - 24, 24, 24, 'enlarged_water_bucket'));
    this.items.push(new Tool(103 * TILE_SIZE + toolOffset, groundY(103) - 24, 24, 24, 'enlarged_water_bucket'));
    // 石灰石
    // this.items.push(new Tool(14 * TILE_SIZE + toolOffset, groundY(14) - 24, 24, 24, 'limestone'));

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

// ====== Player 类 ======
class Player {
  constructor(x, y) {
    Object.assign(this, { x, y, w: 32, h: 64, vx: 0, vy: 0, speed: 2, jumpForce: -6.32, gravity: 0.5, onGround: false, maxHealth: 5, health: 5, inventory: [], facingRight: true });
    this.equippedWeaponType = 'wooden_sword';  // 手持武器，通过挖掘对应矿石升级
    
    this.isAttacking = false;
    this.attackAnimStart = 0;
    this.attackAnimDuration = 150; // 挥剑持续时间，毫秒

    // 碰撞箱尺寸（独立于贴图尺寸）
    this.collisionW = 24;
    this.standingCollisionH = 56;
    this.crouchScale = 0.78;
    this.crouchingCollisionH = this.h * this.crouchScale;
    this.collisionH = this.standingCollisionH;
    this.collisionOffsetX = (this.w - this.collisionW) / 2;  // 水平居中：(32-24)/2 = 4
    this.collisionOffsetY = this.h - this.collisionH;  // 底部对齐

    this.score = 0;
    this.selectedSlot = -1;   // 当前鼠标选中的背包格子
    this.maxJumps = 2;
    this.jumpsRemaining = this.maxJumps;
    this.swimUpHeld = false;  // 水中是否按住上浮键（空格）

    this.onLadder = false;      //与梯子交互
    this.activeLadder = null;
    this.climbSpeed = 2.1;

  }
  
  // 获取碰撞箱的实际坐标
  getCollisionBox() {
    return {
      x: this.x + this.collisionOffsetX,
      y: this.y + this.collisionOffsetY,
      w: this.collisionW,
      h: this.collisionH
    };
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

      if (rectCollision(box.x, box.y, box.w, box.h, probeX, item.y, probeW, item.h)) {
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
    // 地面上：每帧重置速度，完全由按键控制
    // 空中：保持惯性，但有空气阻力
    if (this.onGround) {
      this.vx = 0;
    } else {
      // 空中减速：每帧减少 5% 的水平速度（模拟空气阻力）
      this.vx *= 0.85;
      // 速度太小时直接归零，避免永远飘
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }
    
    // 仅 WASD：A/D 水平移动，S 下蹲
    const leftHeld = !!keys['a'];
    const rightHeld = !!keys['d'];
    const crouchHeld = !!keys['s'];
    this.isCrouching = crouchHeld && this.onGround;
    this.collisionH = this.isCrouching ? this.crouchingCollisionH : this.standingCollisionH;
    this.collisionOffsetY = this.h - this.collisionH;
    if (leftHeld && !rightHeld) {
      this.vx = -this.speed;
    } else if (rightHeld && !leftHeld) {
      this.vx = this.speed;
    } else if (this.onGround) {
      // 只有在地面上且没有按键时才停止
      this.vx = 0;
    }
    // 如果在空中且没有按键，保持原有的 vx 但会逐渐减速
    
    // 空中控制加成：在空中时水平移动速度提升 20%（水关禁用）
    if (!(level instanceof WaterLevel) && !this.onGround && this.vx !== 0 && (leftHeld || rightHeld)) {
      this.vx *= 1.2;
    }
    
    if (this.vx !== 0) this.facingRight = this.vx > 0;

    const ladder = this.updateLadderState(level);
    const climbUp = !!(keys['w'] || keys['arrowup']);
    const climbDown = !!(keys['s'] || keys['arrowdown']);

    if (ladder) {
    const ladderCenterX = ladder.x + ladder.w / 2;
    const playerCenterOffset = this.collisionOffsetX + this.collisionW / 2;

    const box = this.getCollisionBox();
    const playerFeetY = box.y + box.h;
    const ladderTopY = ladder.y;
    const ladderBottomY = ladder.y + ladder.h;

    // 人物脚底距离“梯子顶端”的容差
    const topSnapTolerance = 6;
    const nearLadderTop = Math.abs(playerFeetY - ladderTopY) <= topSnapTolerance;

    // 只有角色脚底明显高于梯子底部时，才允许继续往下爬
    const canClimbDown = climbDown && playerFeetY < ladderBottomY - 2;

    // 只要人在梯子上，就把 X 吸附到梯子中线
    this.x = ladderCenterX - playerCenterOffset;

    // 正在爬梯
    if (climbUp || canClimbDown) {
      this.vx = 0;
      this.vy = 0;
      this.onGround = false;

      if (climbUp) this.y -= this.climbSpeed;
      if (canClimbDown) this.y += this.climbSpeed;

      if (keys['a'] || keys['arrowleft']) {
        this.x -= this.speed * 0.45;
        this.facingRight = false;
      }
      if (keys['d'] || keys['arrowright']) {
        this.x += this.speed * 0.45;
        this.facingRight = true;
      }

      if (this.y < 0) this.y = 0;
      const maxY = CANVAS_H - this.h;
      if (this.y > maxY) this.y = maxY;

      return;
    }

    // 没有继续按爬梯，但已经到达梯子顶端附近：
    // 让人物停在梯子顶，不再掉落
    if (nearLadderTop) {
      this.y = ladderTopY - this.collisionH - this.collisionOffsetY;
      this.vx = 0;
      this.vy = 0;
      this.onGround = true;
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
      if (this.swimUpHeld) this.vy -= 0.22;
      if (crouchHeld) this.vy += 0.14;
      this.vy = constrain(this.vy, -1.8, 1.8);
    } else {
      this.vy += this.gravity;
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
    const maxY = CANVAS_H - this.h;
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
      this.onGround = true;
      this.jumpsRemaining = this.maxJumps;
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
          if (this.vy > 0) { this.y = r.y - this.h; this.onGround = true; this.jumpsRemaining = this.maxJumps; }
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

  collidesWith(obj) { 
    const box = this.getCollisionBox();
    return rectCollision(box.x, box.y, box.w, box.h, obj.x, obj.y, obj.w, obj.h); 
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

class Enemy {
  constructor(x, y, w, h, health = ENEMY_DEFAULT_HEALTH) {
    Object.assign(this, { x, y, w, h, health, maxHealth: health });
    this.activated = false; // 是否已被激活（玩家进入检测范围）
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
  
  getCollisionBox() {
    return {
      x: this.x + this.collisionOffsetX,
      y: this.y + this.collisionOffsetY,
      w: this.collisionW,
      h: this.collisionH
    };
  }
  
  takeDamage(amount) {
    this.health = max(0, this.health - amount);
  }

  canDamagePlayer() {
    return !this.isDead;
  }

  isInWater(level) {
    return isEntityInWater(this, level);
  }
  
  get isDead() { return this.health <= 0; }
  
  // 更新敌人状态（追踪玩家）
  update(player, platforms, level = null) {
    if (this.isDead) return;
    
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const distance = Math.hypot(px - ex, py - ey);
    
    // 首次进入4格范围内，激活敌人
    if (!this.activated && distance <= ENEMY_DETECT_RANGE) {
      this.activated = true;
    }
    
    // 激活后持续追踪玩家
    if (this.activated) {
      // 水平移动：朝向玩家
      if (px < ex - 5) {
        this.vx = -ENEMY_SPEED;
        this.facingRight = false; // 向左移动
      } else if (px > ex + 5) {
        this.vx = ENEMY_SPEED;
        this.facingRight = true; // 向右移动
      } else {
        this.vx = 0;
      }
      
      const inWater = this.isInWater(level);
      if (inWater) {
        this.vy += WATER_GRAVITY - WATER_BUOYANCY;
        this.vx *= WATER_DRAG;
        this.vy *= WATER_DRAG;
      } else {
        // 应用重力
        this.vy += this.gravity;
      }
      
      // 水平移动
      this.x += this.vx;
      this.resolveCollision(platforms, true);
      
      // 垂直移动
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
          if (this.vx > 0) this.x = r.x - box.w - this.collisionOffsetX;
          else this.x = r.x + r.w - this.collisionOffsetX;
          this.vx = 0;
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

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const distance = Math.hypot(px - ex, py - ey);

    if (!this.activated && distance <= ENEMY_DETECT_RANGE) {
      this.activated = true;
    }

    if (this.activated) {
      if (px < ex - 5) {
        this.vx = -ENEMY_SPEED;
        this.facingRight = false;
      } else if (px > ex + 5) {
        this.vx = ENEMY_SPEED;
        this.facingRight = true;
      } else {
        this.vx = 0;
      }
    } else {
      this.vx *= 0.92;
    }

    const inWater = this.isInWater(level);
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

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const distance = Math.hypot(px - ex, py - ey);

    if (!this.activated && distance <= ENEMY_DETECT_RANGE) {
      this.activated = true;
    }

    if (this.activated) {
      // 检测到玩家后，行为与 drowned 一致：朝玩家追踪
      if (px < ex - 5) {
        this.vx = -ENEMY_SPEED;
        this.facingRight = false;
      } else if (px > ex + 5) {
        this.vx = ENEMY_SPEED;
        this.facingRight = true;
      } else {
        this.vx = 0;
      }
    } else {
      // 未激活时在固定范围内水平往返巡逻
      const minX = this.patrolOriginX - this.patrolRange / 2;
      const maxX = this.patrolOriginX + this.patrolRange / 2;
      const patrolSpeed = ENEMY_SPEED * 0.85;
      this.vx = patrolSpeed * this.patrolDir;

      if (this.x <= minX) {
        this.x = minX;
        this.patrolDir = 1;
      } else if (this.x >= maxX) {
        this.x = maxX;
        this.patrolDir = -1;
      }
      this.facingRight = this.patrolDir > 0;
    }
    this.refreshCollisionAnchor();

    const inWater = this.isInWater(level);
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

    const now = millis();
    const delayedTarget = this.getDelayedTarget(now, player);
    const ex = this.x + this.w / 2;
    const ey = this.y + this.h / 2;
    const dx = delayedTarget.x - ex;
    const dy = delayedTarget.y - ey;
    const distance = Math.hypot(dx, dy);

    if (!this.activated && distance <= ENEMY_DETECT_RANGE * 1.25) {
      this.activated = true;
    }

    if (this.activated) {
      const dirX = dx >= 0 ? 1 : -1;
      this.facingRight = dirX > 0;

      if (this.onGround && now >= this.jumpCooldownUntil) {
        // 史莱姆通过周期跳跃追踪目标
        this.vx = dirX * this.jumpSpeedX;
        this.vy = -this.jumpSpeedY;
        this.onGround = false;
        this.jumpCooldownUntil = now + this.jumpIntervalMs + random(-140, 160);
      } else if (this.onGround) {
        this.vx *= 0.82;
      }
    } else if (this.onGround) {
      this.vx *= 0.88;
    }

    const inWater = this.isInWater(level);
    if (inWater) {
      this.vy += WATER_GRAVITY - WATER_BUOYANCY;
      this.vx *= WATER_DRAG;
      this.vy *= WATER_DRAG;
    } else {
      this.vy += this.gravity;
    }
    this.x += this.vx;
    this.resolveCollision(platforms, true);
    this.y += this.vy;
    this.onGround = false;
    this.resolveCollision(platforms, false);
  }

  split(level) {
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
      // 四散飞溅：给初速度
      child.vx = s.x * splash * random(0.8, 1.15);
      child.vy = s.y * splash * random(0.95, 1.25);
      child.onGround = false;
      level.enemies.push(child);
    }
  }

  takeDamage(amount, level = null) {
    if (this.isDead) return;
    if (this.w <= 16 || this.h <= 16) {
      this.health = 0;
      return;
    }
    this.split(level);
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


class Item {
  constructor(x, y, w, h, sprite) {
    Object.assign(this, { x, y, w, h, sprite });
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
  }

  // 每帧更新：到点爆炸
  update(now, player, platforms = null, level = null) {
    // TNT 也遵循统一重力/浮力/阻力规则
    if (platforms) super.update(platforms, level);
    if (!this.armed || this.exploded) return;
    if (now - this.armTime >= this.fuseMs) {
      this.explode(now, player);
    }
  }

  explode(now, player) {
    if (this.exploded) return;
    this.exploded = true;
    this.removeAfter = now + this.postExplodeMs;

    // 计算玩家是否在爆炸范围内（中心点距离）
    const tx = this.x + this.w / 2;
    const ty = this.y + this.h / 2;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const d = Math.hypot(px - tx, py - ty);

    if (d <= this.blastRadius) {
      player.takeDamage(this.damage);
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

class TrappedBird extends Item {
  constructor(x, y, w = 48, h = 36) {
    super(x, y, w, h, null);
    this.state = 'trapped';
    this.targetX = x;
    this.targetY = y;
    this.flightSpeed = 1.9;
    this.wingTick = 0;
    this.facingRight = false;
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
  update(platforms, level = null) {
    if (this.state === 'trapped') {
      super.update(platforms, level);
      return;
    }
    if (this.state !== 'flying') return;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.abs(dx) > 0.2) this.facingRight = dx > 0;
    const d = Math.hypot(dx, dy);
    if (d <= this.flightSpeed) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.state = 'landed';
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

class LittleBird extends Item {
  constructor(x, y, w = 24, h = 24) {
    super(x, y, w, h, null);
  }
  draw() {
    const img = window.littlebird;
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(180, 200, 220); rect(this.x, this.y, this.w, this.h); }
  }
}

class Food extends Item {
  // foodType: 'apple' | 'enlarged_golden_apple'
  constructor(x, y, w = 24, h = 24, foodType = 'apple') {
    super(x, y, w, h, null);
    this.foodType = foodType;
  }

  draw() {
    const img = window['food_' + this.foodType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(255, 200, 0); rect(this.x, this.y, this.w, this.h); }
  }
}

class Tool extends Item {
  constructor(x, y, w = 24, h = 24, toolType = 'scissor') {
    super(x, y, w, h, null);
    this.displayName = '工具';
    this.toolType = toolType;  // 对应 pic/tool 下文件名（不含 .png）
  }
  draw() {
    const img = window['tool_' + this.toolType];
    if (img && img.width > 0) image(img, this.x, this.y, this.w, this.h);
    else { fill(100, 150, 255); rect(this.x, this.y, this.w, this.h); }
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
    const drawW = TILE_SIZE * 1.6;   // 梯子显示宽度
    const drawX = this.x - (drawW - this.w) / 2;

    // 贴图下半部分被抠掉了，所以视觉上往上补一点高度
    // 不改 this.y / this.h，只改绘制范围，保证实际可爬高度不变
    const visualExtraTop = 14;  // 可按效果微调：10~18 比较合适

    image(img, drawX, this.y - visualExtraTop, drawW, this.h + visualExtraTop);
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
    const { menuRect, exitRect } = this.getTopRightButtons();
    const margin = 8;
    const gapFromButtons = 8;
    const panelH = 186;
    const buttonColRight = Math.max(menuRect.x + menuRect.w, exitRect.x + exitRect.w);
    const x0 = buttonColRight + gapFromButtons;
    const panelW = Math.min(Math.floor(width * 0.48), 360, Math.max(0, width - x0 - margin));
    const x = Math.round(constrain(x0, margin, Math.max(margin, width - margin - panelW)));
    const y = constrain(menuRect.y + menuRect.h, 0, height - panelH);
    return { x, y, w: panelW, h: panelH };
  }

  getGuideTabRects() {
    const panel = this.getGuideMenuRect();
    const tabW = (panel.w - 20) / 4;
    const tabY = panel.y + 22;
    return [0, 1, 2, 3].map(i => ({ x: panel.x + 10 + i * tabW, y: tabY, w: tabW - 4, h: 18 }));
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
    const filledTrophies = Math.min(Math.max(0, Math.floor(player.score)), MAX_TROPHY_SLOTS);
    for (let i = 0; i < MAX_TROPHY_SLOTS; i++) {
      const x = width - TROPHY_UI_INSET - TROPHY_SIZE - (MAX_TROPHY_SLOTS - 1 - i) * trophyStride;
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

      const topRight = this.getTopRightButtons();
      this.drawTopRightIcon(topRight.menuRect, window.uiMenu, [240, 210, 80]);
      this.drawTopRightIcon(topRight.exitRect, window.uiExit, [240, 120, 90]);

      // 背包 - 使用背包贴图（10格）
      const invX = (width - INV_BAR_W) / 2, invY = height - INV_BAR_H;

      // 进度猫：显示本局到达过的最远进度，并用轻微缓动追上目标位置
      const playerProgress = constrain(game?.displayedCatProgress ?? 0, 0, 1);
      const catTrackWidth = INV_BAR_W - INVENTORY_PROGRESS_CAT_W;
      const catX = invX + playerProgress * catTrackWidth;
      const catY = invY - INVENTORY_PROGRESS_CAT_H;
      const progressCatImg = window.inventoryProgressCat;
      if (progressCatImg && progressCatImg.width > 0) {
        image(progressCatImg, catX, catY, INVENTORY_PROGRESS_CAT_W, INVENTORY_PROGRESS_CAT_H);
      }

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
    textSize(9);
    text(desc, x + 16, y + 8, 126);
  }

  drawGuideRow(x, y, w, icon, name, desc) {
    fill(34, 52, 76, 210);
    rect(x, y, w, 28, 6);

    const iconX = x + 6;
    const iconY = y + 6;
    if (icon && icon.width > 0) image(icon, iconX, iconY, 16, 16);
    else { fill(120, 160, 220); rect(iconX, iconY, 16, 16, 3); }

    fill(255);
    textSize(11);
    text(name, x + 28, y + 12);
    fill(196, 214, 255);
    textSize(10);
    text(desc, x + 28, y + 23);
  }

  drawGuideMenu(activeGuideTab = 0) {
    const panel = this.getGuideMenuRect();
    noStroke();
    fill(20, 32, 50, 230);
    rect(panel.x, panel.y, panel.w, panel.h, 4);

    fill(255);
    textSize(14);
    textAlign(LEFT, BASELINE);
    text(t("Field Guide", "图鉴"), panel.x + 10, panel.y + 16);

    const tabLabels = [
      t("Tools", "工具"),
      t("Pollutants", "污染物"),
      t("Trapped", "待救援"),
      t("Enemy / Danger", "敌人 / 危险")
    ];
    const tabs = this.getGuideTabRects();
    textAlign(CENTER, CENTER);
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      fill(i === activeGuideTab ? color(68, 110, 162, 240) : color(40, 58, 86, 210));
      rect(t.x, t.y, t.w, t.h, 4);
      fill(255);
      textSize(10);
      text(tabLabels[i], t.x + t.w / 2, t.y + t.h / 2);
    }
    textAlign(LEFT, BASELINE);

    const rowsByTab = [
      [
        [window.tool_scissor, t("Scissors", "剪刀"), t("Cut webs to rescue", "剪开蛛网进行救援")],
        [window.tool_enlarged_water_bucket, t("Bucket", "水桶"), t("Use near lava", "在岩浆附近使用")],
        [window.tool_limestone, t("Limestone", "石灰石"), t("Use near acid", "在酸液附近使用")],
        [window.tool_vine_seed, t("Vine Seed", "藤蔓种子"), t("Grow a ladder to climb", "生成藤蔓梯子爬到高处")]
      ],
      [
        [window.cigarette, t("Cigarette", "香烟"), t("Collect", "收集")],
        [window.plastic_bottle, t("Plastic Bottle", "塑料瓶"), t("Collect", "收集")],
        [null, t("Wrapper", "包装纸"), t("Collect", "收集")],
        [null, t("Acid Pool", "酸液池"), t("Treat with limestone", "使用石灰石处理")]
      ],
      [
        [window.bird, t("Bird", "小鸟"), t("Click scissors to rescue", "点击剪刀进行救援")]
      ],
      [
        [window.zombieSpriteRight, t("Zombie", "僵尸"), t("Press F to attack", "按 F 攻击")],
        [window.tnt, "TNT", t("Keep away", "远离")]
      ]
    ];

    const tabIndex = constrain(activeGuideTab, 0, rowsByTab.length - 1);
    const rows = rowsByTab[tabIndex];
    const rowX = panel.x + 12;
    const rowW = panel.w - 24;
    let rowY = panel.y + 48;

    for (const [icon, name, desc] of rows) {
      this.drawGuideRow(rowX, rowY, rowW, icon, name, desc);
      rowY += 34;
    }
  }
}


// ====== p5.js 生命周期 ======
function preload() {
  activeFont = null;
}

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.elt.tabIndex = 0;
  c.elt.focus();
  c.elt.classList.add('game-canvas');
  c.elt.addEventListener('click', () => c.elt.focus());
  c.parent('game-container');

  // 添加原生键盘事件监听器（备用方案，防止 p5.js 事件丢失）
  window.addEventListener('keyup', (e) => {
    let k = (e.key || '').toLowerCase();
    if (e.keyCode === 32) k = ' ';
    if (k === 'a' || k === 'd' || k === 'w' || k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === ' ') {
      if (keys[k]) {
        console.log(`[原生事件] 检测到 ${k} 键松开`);
        keys[k] = false;
        pressedKeys.delete(k);
        if ((k === 'w' || k === 'arrowup' || k === ' ') && game?.player) {
          game.player.swimUpHeld = false;
        }
      }
    }
  });

  game = new Game();
  game.setup();

  // 加载贴图
  const load = (path, key) => loadImage(path, img => window[key] = img, () => console.warn(`${path} 加载失败`));

  // 新增：污染物及被困小动物
  // load('assets/pic/pollutant/cigarette.png', 'cigarette');
  load('assets/pic/pollutant/plastic_bottle.png', 'plastic_bottle');
  load('assets/pic/pollutant/plastic_bag.png', 'plastic_bag');
  load('assets/pic/pollutant/tnt_side.png', 'tnt');
  load('assets/pic/animals/bird.png', 'bird');
  load('assets/pic/animals/bird_flip.png', 'bird_flip');
  load('assets/pic/animals/web_back.png', 'web_back');
  load('assets/pic/animals/web_front.png', 'web_front');
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
  // 史莱姆
  load("assets/pic/enemy/slime.png", "slimeSprite");

  // 工具（assets/pic/tool 中全部，新增图片时在此数组加入文件名不含 .png）
  ['scissor', 'limestone', 'enlarged_water_bucket'].forEach(name =>load(`assets/pic/tool/${name}.png`, `tool_${name}`));
  load('assets/pic/tool/vine_seed.png', 'tool_vine_seed');
  load('assets/pic/tool/vine_ladder.png', 'tool_vine_ladder');
  // 武器（assets/pic/weapon，威力从低到高：wooden / stone / iron / diamond）
  ['wooden_sword', 'stone_sword', 'iron_sword', 'diamond_sword'].forEach(name => load(`assets/pic/weapon/${name}.png`, `weapon_${name}`));

  // 食物（assets/pic/food）
  load('assets/pic/food/apple.png', 'food_apple');
  load('assets/pic/food/enlarged_golden_apple.png', 'food_enlarged_golden_apple');

  // UI 等（心形在 assets 根目录，背包在 assets/pic）
  load('assets/heart_container.png', 'heartContainer');
  load('assets/heart_fill.png', 'heartFill');
  load('assets/pic/ui/trophy_container.png', 'trophyContainer');
  load('assets/pic/ui/trophy_fill.png', 'trophyFill');
  load('assets/pic/ui/inventory_container.png', 'invContainer');
  load('assets/pic/player_cat/cat_right.png', 'inventoryProgressCat');
  load('assets/pic/ui/menu.png', 'uiMenu');
  load('assets/pic/ui/exit.png', 'uiExit');




  // 地面/平台贴图（assets/pic/ground 中全部）
  const groundTiles = [
    'grass_block_side', 'dirt', 'stone', 'deepslate',
    'copper_ore', 'deepslate_copper_ore', 'deepslate_diamond_ore', 'deepslate_gold_ore', 'deepslate_iron_ore',
    'diamond_ore', 'gold_ore', 'iron_ore','lava', 'acid', 'water', 'sand', 'gravel',
    'bricks', 'pipe_narrow', 'deepslate_bricks', 'pipe_wide', 'pipe_wide_inner_corner', 'pipe_wide_outer_corner', 'pipe_narrow_corner', 'pipe_narrow_to_wide', 'pipe_narrow_to_narrow',
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
  // 主动同步按键状态（修复浏览器 keyReleased 事件丢失的问题）
  if (game && game.state === "playing") {
    ['a', 'd', 's', 'w'].forEach(k => {
      if (keys[k] && !pressedKeys.has(k)) {
        keys[k] = false;
        if (k === 'w' && game.player) game.player.swimUpHeld = false;
      }
    });
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
    drawGameOverScreen();
  }
  else if (game.state === "victory") {
    drawVictoryScreen();
  }
}

function keyPressed() {
  let inputKey = null;
  if (key && key.length === 1) inputKey = key.toLowerCase();

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
    if (keyCode === ENTER) {
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
    if (keyCode === ESCAPE) {
      game.state = "start";
      return false;
    }
    return false;
  }

  if (game.state === "settings") {
    if (keyCode === ESCAPE) {
      game.state = "start";
    }
    return false;
  }

  if (game.state === "gameover" || game.state === "victory") {
    if (keyCode === ENTER) {
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
    if (game.level && game.player && typeof game.player.isInWater === "function") {
      if (game.player.isInWater(game.level)) {
        game.player.swimUpHeld = true;
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
  
  // 松开上浮键时，取消水中上浮标志
  if (releasedKey === 'w') {
    if (game?.player) game.player.swimUpHeld = false;
  }
}

// 窗口失焦时清除所有按键状态（防止切换窗口导致按键卡住）
function windowBlurred() {
  console.log("窗口失焦，清除所有按键"); // 调试用
  keys = {};
  pressedKeys.clear(); // 清空 Set
  if (game?.player) {
    game.player.swimUpHeld = false;
  }
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
      game.state = "levelSelect";
      return;
    }

    if (isInside(mouseX, mouseY, ui.settingsBtn)) {
      game.state = "settings";
      return;
    }
  }

  // 选关页面
  if (game.state === "levelSelect") {
    const ui = getLevelSelectRects();

    if (isInside(mouseX, mouseY, ui.level1)) {
      game = createGameWithSameSettings("forest");
      game.setup();
      game.beginPlaying();
      return;
    }

    if (isInside(mouseX, mouseY, ui.level2)) {
      game = createGameWithSameSettings("water");
      game.setup();
      game.beginPlaying();
      return;
    }

    if (isInside(mouseX, mouseY, ui.level3)) {
      game = createGameWithSameSettings("factory");
      game.setup();
      game.beginPlaying();
      return;
    }

    if (isInside(mouseX, mouseY, ui.backBtn)) {
      game.state = "start";
      return;
    }
  }

  // 设置页面
  if (game.state === "settings") {
    const ui = getSettingsRects();
    const s = game.settings;

    if (isInside(mouseX, mouseY, ui.musicMinus)) {
      s.musicVolume = max(0, s.musicVolume - 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.musicPlus)) {
      s.musicVolume = min(100, s.musicVolume + 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.sfxMinus)) {
      s.sfxVolume = max(0, s.sfxVolume - 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.sfxPlus)) {
      s.sfxVolume = min(100, s.sfxVolume + 10);
      return;
    }

    if (isInside(mouseX, mouseY, ui.fullscreen)) {
      s.fullscreen = !s.fullscreen;
      let fs = fullscreen();
      fullscreen(!fs);
      return;
    }

    if (isInside(mouseX, mouseY, ui.language)) {
      const currentIndex = SUPPORTED_LANGUAGES.indexOf(s.language);
      const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
      s.language = SUPPORTED_LANGUAGES[nextIndex];
      return;
    }

    if (isInside(mouseX, mouseY, ui.backBtn)) {
      game.state = "start";
      return;
    }
  }

  // game over / victory 页面，鼠标点击回开始页
  if (game.state === "gameover" || game.state === "victory") {
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

function drawMenuButton(x, y, w, h, label, hovered = false) {
  push();
  stroke(255);
  strokeWeight(2);
  fill(hovered ? color(255, 170, 60) : color(30, 45, 85, 220));
  rect(x, y, w, h, 12);

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text(label, x + w / 2, y + h / 2);
  pop();
}

function getStartScreenRects() {
  return {
    startBtn: { x: width / 2 - 110, y: 150, w: 220, h: 52 },
    settingsBtn: { x: width / 2 - 110, y: 220, w: 220, h: 52 }
  };
}

function getLevelSelectRects() {
  return {
    level1: { x: 70, y: 180, w: 140, h: 70 },
    level2: { x: 250, y: 180, w: 140, h: 70 },
    level3: { x: 430, y: 180, w: 140, h: 70 },
    backBtn: { x: 20, y: 20, w: 100, h: 42 }
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

    backBtn:    { x: 20, y: 20, w: 100, h: 42 }
  };
}

// ====== startscreen ======
function drawStartScreen() {
  if (window.startBg && window.startBg.width > 0) {
    image(window.startBg, 0, 0, width, height);
  } else {
    background(50, 50, 100);
  }
  
  fill(255);
  textAlign(CENTER, CENTER);
  
textSize(16);
fill(255, 230, 180);

const ui = getStartScreenRects();

drawMenuButton(
  ui.startBtn.x, ui.startBtn.y, ui.startBtn.w, ui.startBtn.h,
  t("Start", "开始"),
  isInside(mouseX, mouseY, ui.startBtn)
);

drawMenuButton(
  ui.settingsBtn.x, ui.settingsBtn.y, ui.settingsBtn.w, ui.settingsBtn.h,
  t("Settings", "设置"),
  isInside(mouseX, mouseY, ui.settingsBtn)
);

fill(255, 230, 180);
textAlign(CENTER, CENTER);
textSize(16);
text(
  t("Press Start to begin your adventure", "点击开始进入游戏"),
  width / 2,
  ui.settingsBtn.y + ui.settingsBtn.h + 40);
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

  drawMenuButton(
    ui.level1.x, ui.level1.y, ui.level1.w, ui.level1.h,
    t("Level 1", "第一关"),
    isInside(mouseX, mouseY, ui.level1)
  );

  drawMenuButton(
    ui.level2.x, ui.level2.y, ui.level2.w, ui.level2.h,
    t("Level 2", "第二关"),
    isInside(mouseX, mouseY, ui.level2)
  );

  drawMenuButton(
    ui.level3.x, ui.level3.y, ui.level3.w, ui.level3.h,
    t("Level 3", "第三关"),
    isInside(mouseX, mouseY, ui.level3)
  );

  fill(255, 230, 180);
  textAlign(CENTER, CENTER);
  textSize(16);

  text(
  t("Choose your level", "请选择关卡"),
  width / 2,
  ui.level1.y + ui.level1.h + 60);

  drawMenuButton(
    ui.backBtn.x, ui.backBtn.y, ui.backBtn.w, ui.backBtn.h,
    t("Back", "返回"),
    isInside(mouseX, mouseY, ui.backBtn)
  );
}

function drawSettingsScreen() {
  background(28, 35, 60);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text(t("Settings", "设置"), width / 2, 55);

  const s = game.settings;
  const ui = getSettingsRects();

  textAlign(LEFT, CENTER);
  textSize(20);
  fill(255);

  text(t("Music Volume", "音乐音量"), 100, 120);
  text(`${s.musicVolume}`, 440, 120);
  drawMenuButton(ui.musicMinus.x, ui.musicMinus.y, ui.musicMinus.w, ui.musicMinus.h, "-");
  drawMenuButton(ui.musicPlus.x, ui.musicPlus.y, ui.musicPlus.w, ui.musicPlus.h, "+");

  text(t("SFX Volume", "音效音量"), 100, 175);
  text(`${s.sfxVolume}`, 440, 175);
  drawMenuButton(ui.sfxMinus.x, ui.sfxMinus.y, ui.sfxMinus.w, ui.sfxMinus.h, "-");
  drawMenuButton(ui.sfxPlus.x, ui.sfxPlus.y, ui.sfxPlus.w, ui.sfxPlus.h, "+");

  text(t("Fullscreen", "全屏开关"), 100, 235);
  drawMenuButton(
    ui.fullscreen.x, ui.fullscreen.y, ui.fullscreen.w, ui.fullscreen.h,
    s.fullscreen ? t("ON", "开启") : t("OFF", "关闭"),
    isInside(mouseX, mouseY, ui.fullscreen)
  );

  text(t("Language", "语言切换"), 100, 295);
  drawMenuButton(
    ui.language.x, ui.language.y, ui.language.w, ui.language.h,
    s.language,
    isInside(mouseX, mouseY, ui.language)
  );

  drawMenuButton(
    ui.backBtn.x, ui.backBtn.y, ui.backBtn.w, ui.backBtn.h,
    t("Back", "返回"),
    isInside(mouseX, mouseY, ui.backBtn)
  );
}


//===== gameover screen ======
function drawGameOverScreen() {
  background(0);
  fill(255, 0, 0);
  textAlign(CENTER, CENTER);
  textSize(52);
  text(t("GAME OVER", "游戏结束"), width / 2, height / 2 - 40);
  textSize(24);
  fill(255);
  text(t("Press ENTER to Restart", "按 ENTER 重新开始"), width / 2, height / 2 + 20);
}


function drawVictoryScreen() {
  background(0, 100, 50); // 深绿色背景
  fill(200, 255, 150); // 浅绿色文字
  textAlign(CENTER, CENTER);
  textSize(52);
  text(t("Victory!", "胜利!"), width / 2, height / 2 - 60);
  
  // 显示分数
  textSize(36);
  fill(255, 255, 100); // 金黄色
  text(`${t("Score", "得分")}: ${game.player.score}`, width / 2, height / 2);
  
  textSize(28);
  fill(200, 255, 150);
  text(t("Press ENTER to Play Again", "按 ENTER 再玩一次"), width / 2, height / 2 + 60);
}






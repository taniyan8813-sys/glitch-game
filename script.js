const gameScreen = document.getElementById("gameScreen");
const bulletLayer = document.getElementById("bulletLayer");
const enemyLayer = document.getElementById("enemyLayer");
const attackLayer = document.getElementById("attackLayer");
const expLayer = document.getElementById("expLayer");
const player = document.getElementById("player");
const playerVisual = player.querySelector(".player-visual");
const hitFlash = document.getElementById("hitFlash");
const glitchImage = document.getElementById("glitchImage");
const glitchBugImage = player.querySelector(".glitch-image-bug");
const glitchHitImage = player.querySelector(".glitch-image-hit");
const imageError = document.getElementById("imageError");
const timeValue = document.getElementById("timeValue");
const killsValue = document.getElementById("killsValue");
const levelValue = document.getElementById("levelValue");
const hpFill = document.getElementById("hpFill");
const hpValue = document.getElementById("hpValue");
const expFill = document.getElementById("expFill");
const expValue = document.getElementById("expValue");
const gameOverPanel = document.getElementById("gameOverPanel");
const upgradePanel = document.getElementById("upgradePanel");
const upgradeOptions = document.getElementById("upgradeOptions");
const restartButton = document.getElementById("restartButton");
const muteButton = document.getElementById("muteButton");
const virtualJoystick = document.getElementById("virtualJoystick");
const joystickKnob = document.getElementById("joystickKnob");
const hitboxDebug = document.getElementById("hitboxDebug");

const fallbackPlayerImageSrc = "assets/glitch_pixel.png";
const fallbackGlitchImageSrc = "assets/glitch_pixel_bug.png";
const playerSprites = {
  idle: "assets/player_idle.png",
  run01: "assets/player_run_01.png",
  run02: "assets/player_run_02.png",
  attack: "assets/player_attack.png",
  glitch: "assets/player_glitch.png",
  hit: "assets/player_glitch.png",
  win: "assets/player_win.png",
};
const unavailablePlayerSprites = new Set();

const DEBUG_HITBOX = false;
const DEBUG_ATTACK_HITBOX = false;
const hitboxWidthRatio = 0.4;
const hitboxHeightRatio = 0.55;
const hitboxVerticalOffsetRatio = 0.18;
const enemyHitboxWidthRatio = 0.72;
const enemyHitboxHeightRatio = 0.72;
const enemyHitboxVerticalOffsetRatio = 0.06;

const maxPlayerSpeed = 460;
const playerAcceleration = 2200;
const playerFriction = 1800;
const glitchInterval = 2200;
let glitchDuration = 180;
let maxHp = 3;
const expToNextLevel = 100;
const enemySpawnInterval = 1250;
const baseAttackInterval = 900;
const baseAttackSize = 184;
const enemyContactInvulnerability = 900;
const worldGlitchDuration = 260;
const enemyGlitchFreezeChance = 0.5;
const enemyGlitchWarpChance = 0.32;
const enemyGlitchWarpDistance = 38;
const expMagnetRadius = 132;
const glitchExpMagnetRadius = 198;

const upgradePool = [
  {
    title: "Signal Boost",
    description: "攻撃間隔が短くなる",
    apply() {
      currentAttackInterval = Math.max(260, currentAttackInterval * 0.84);
    },
  },
  {
    title: "Heavy Slash",
    description: "攻撃ダメージ +1",
    apply() {
      attackDamage += 1;
    },
  },
  {
    title: "Wide Glitch",
    description: "攻撃エフェクトが大きくなる",
    apply() {
      attackSize = Math.min(260, attackSize + 18);
    },
  },
  {
    title: "Phase Boots",
    description: "移動速度が少し上がる",
    apply() {
      playerSpeedBonus = Math.min(160, playerSpeedBonus + 40);
    },
  },
  {
    title: "Extra Heart",
    description: "最大HPが増えて少し回復する",
    apply() {
      maxHp = Math.min(8, maxHp + 1);
      hp = Math.min(maxHp, hp + 1);
      updateStatusUi();
    },
  },
  {
    title: "Long Glitch",
    description: "グリッチ状態が少し長く続く",
    apply() {
      glitchDuration = Math.min(520, glitchDuration + 80);
    },
  },
];
const enemyTypes = [
  {
    role: "slow",
    src: "assets/enemy_01.png",
    className: "enemy enemy-blob",
    hp: 3,
    speed: 42,
    weight: 0.56,
  },
  {
    role: "rush",
    src: "assets/enemy_02.png",
    className: "enemy enemy-runner",
    hp: 2,
    speed: 82,
    weight: 0.3,
  },
  {
    role: "glitch",
    src: "assets/enemy_glitch.png",
    className: "enemy enemy-tank enemy-glitch",
    hp: 5,
    speed: 32,
    weight: 0.14,
  },
];

let characterX = 0;
let characterY = 0;
let playerVelocityX = 0;
let playerVelocityY = 0;
let bullets = [];
let enemies = [];
let attacks = [];
let expOrbs = [];
let elapsedSeconds = 0;
let kills = 0;
let hp = maxHp;
let level = 1;
let exp = 0;
let gameStartTime = 0;
let lastFrameTime = 0;
let spawnTimer = 0;
let enemySpawnTimer = 0;
let attackTimer = 0;
let invulnerabilityTimer = 0;
let currentAttackInterval = baseAttackInterval;
let attackDamage = 1;
let attackSize = baseAttackSize;
let playerSpeedBonus = 0;
let glitchTimer = 0;
let glitchElapsed = 0;
let glitchHitboxOffsetX = 0;
let glitchHitboxOffsetY = 0;
let worldGlitchTimer = null;
let audioContext = null;
const bgm = new Audio("assets/bgm_main.mp3.mp3");
const BGM_PLAY_VOLUME = 0.32;
const BGM_GAME_OVER_VOLUME = 0.1;
let isBgmMuted = false;
let isBgmAvailable = true;
let hasBgmUserGesture = false;
let animationId = null;
let gameOverTimer = null;
let damageFeedbackTimer = null;
let isGameOver = false;
let isChoosingUpgrade = false;
let isGlitching = false;
let activePlayerSpriteSrc = playerSprites.idle;
let playerAttackVisualTimer = 0;
let playerWinVisualTimer = 0;

const pressedKeys = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const joystickInput = {
  active: false,
  pointerId: null,
  x: 0,
  y: 0,
};

function getMaxX() {
  return Math.max(0, gameScreen.clientWidth - player.offsetWidth);
}

function getMaxY() {
  return Math.max(0, gameScreen.clientHeight - player.offsetHeight);
}

function setCharacterPosition(nextX, nextY) {
  characterX = Math.min(Math.max(0, nextX), getMaxX());
  characterY = Math.min(Math.max(0, nextY), getMaxY());
  player.style.left = `${characterX}px`;
  player.style.top = `${characterY}px`;
}

function centerCharacter() {
  const portraitOffset = window.matchMedia("(orientation: portrait)").matches ? getMaxY() * 0.08 : 0;
  setCharacterPosition(getMaxX() / 2, getMaxY() / 2 + portraitOffset);
}

function resetJoystick() {
  joystickInput.active = false;
  joystickInput.pointerId = null;
  joystickInput.x = 0;
  joystickInput.y = 0;
  virtualJoystick?.classList.remove("is-active");

  if (joystickKnob) {
    joystickKnob.style.transform = "";
  }
}

function setPlayerSprite(src) {
  const nextSrc = unavailablePlayerSprites.has(src) ? playerSprites.idle : src;

  if (!nextSrc || activePlayerSpriteSrc === nextSrc) {
    return;
  }

  activePlayerSpriteSrc = nextSrc;
  glitchImage.src = nextSrc;
}

function updatePlayerSprite() {
  if (isGameOver || isGlitching || player.classList.contains("is-hit")) {
    return;
  }

  if (playerWinVisualTimer > 0) {
    setPlayerSprite(playerSprites.win);
    return;
  }

  if (playerAttackVisualTimer > 0) {
    setPlayerSprite(playerSprites.attack);
    return;
  }

  const isMoving = Math.hypot(playerVelocityX, playerVelocityY) > 28;

  if (isMoving) {
    const runFrame = Math.floor(performance.now() / 140) % 2 === 0 ? playerSprites.run01 : playerSprites.run02;
    setPlayerSprite(runFrame);
    return;
  }

  setPlayerSprite(playerSprites.idle);
}

function updateJoystickFromPointer(event) {
  if (!virtualJoystick || !joystickKnob) {
    return;
  }

  const rect = virtualJoystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxDistance = rect.width * 0.34;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const distance = Math.hypot(dx, dy);
  const limitedDistance = Math.min(distance, maxDistance);
  const angle = Math.atan2(dy, dx);

  joystickInput.x = distance > 6 ? Math.cos(angle) * (limitedDistance / maxDistance) : 0;
  joystickInput.y = distance > 6 ? Math.sin(angle) * (limitedDistance / maxDistance) : 0;
  joystickKnob.style.transform = `translate(${Math.cos(angle) * limitedDistance}px, ${Math.sin(angle) * limitedDistance}px)`;
}

function clearBullets() {
  bullets.forEach((bullet) => bullet.element.remove());
  bullets = [];
}

function clearEnemies() {
  enemies.forEach((enemy) => enemy.element.remove());
  enemies = [];
}

function clearAttacks() {
  attacks.forEach((attack) => {
    attack.element.remove();
    attack.debugElement?.remove();
  });
  attacks = [];
}

function clearExpOrbs() {
  expOrbs.forEach((orb) => orb.element.remove());
  expOrbs = [];
}

function stopGlitchEffect() {
  isGlitching = false;
  glitchElapsed = 0;
  glitchHitboxOffsetX = 0;
  glitchHitboxOffsetY = 0;
  player.classList.remove("is-glitching");
}

function triggerWorldGlitch() {
  clearTimeout(worldGlitchTimer);
  gameScreen.classList.remove("is-world-glitch");
  void gameScreen.offsetWidth;
  gameScreen.classList.add("is-world-glitch");

  worldGlitchTimer = window.setTimeout(() => {
    gameScreen.classList.remove("is-world-glitch");
  }, worldGlitchDuration);
}

function disturbEnemies() {
  enemies.forEach((enemy) => {
    const shouldFreeze = Math.random() < enemyGlitchFreezeChance;
    const shouldWarp = Math.random() < enemyGlitchWarpChance;

    if (shouldFreeze) {
      enemy.freezeTimer = 150 + Math.random() * 260;
      enemy.element.classList.add("is-anomaly");
    }

    if (shouldWarp) {
      enemy.x += (Math.random() - 0.5) * enemyGlitchWarpDistance;
      enemy.y += (Math.random() - 0.5) * enemyGlitchWarpDistance;
      enemy.freezeTimer = Math.max(enemy.freezeTimer, 70);
      enemy.element.style.transform = `translate(${enemy.x}px, ${enemy.y}px)`;
      enemy.element.classList.add("is-anomaly");
    }
  });
}

function unlockGlitchAudio() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtor) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function playGlitchWhisper() {
  try {
    unlockGlitchAudio();

    if (!audioContext || audioContext.state !== "running") {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(74 + Math.random() * 28, now);
    oscillator.frequency.exponentialRampToValueAtTime(34 + Math.random() * 20, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.24);
  } catch {
    // Audio is optional; blocked autoplay should not affect gameplay.
  }
}


function updateMuteButton() {
  if (!muteButton) {
    return;
  }

  muteButton.textContent = isBgmMuted ? "SOUND OFF" : "MUTE";
  muteButton.setAttribute("aria-pressed", String(isBgmMuted));
  muteButton.classList.toggle("is-muted", isBgmMuted);
}

function prepareBgm() {
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = BGM_PLAY_VOLUME;
  bgm.muted = isBgmMuted;
}

function playBgmAfterGesture() {
  hasBgmUserGesture = true;

  if (!isBgmAvailable || isBgmMuted) {
    return;
  }

  bgm.volume = isGameOver ? BGM_GAME_OVER_VOLUME : BGM_PLAY_VOLUME;
  bgm.play().catch(() => {
    // Some browsers require a direct user gesture; gameplay should continue silently.
  });
}

function restoreBgmForPlay() {
  if (!hasBgmUserGesture || !isBgmAvailable || isBgmMuted) {
    return;
  }

  bgm.volume = BGM_PLAY_VOLUME;
  bgm.play().catch(() => {});
}

function lowerBgmForGameOver() {
  if (!isBgmAvailable || isBgmMuted) {
    return;
  }

  bgm.volume = BGM_GAME_OVER_VOLUME;
}

function toggleMute() {
  isBgmMuted = !isBgmMuted;
  bgm.muted = isBgmMuted;

  if (isBgmMuted) {
    bgm.pause();
  } else {
    playBgmAfterGesture();
  }

  updateMuteButton();
}

function unlockAudioAndStartBgm() {
  unlockGlitchAudio();
  playBgmAfterGesture();
}

function startGlitchEffect() {
  isGlitching = true;
  glitchElapsed = 0;
  glitchHitboxOffsetX = Math.random() < 0.5 ? -10 : 10;
  glitchHitboxOffsetY = Math.random() < 0.5 ? -5 : 5;
  player.classList.add("is-glitching");
  triggerWorldGlitch();
  disturbEnemies();
  playGlitchWhisper();
}

function updateGlitchEffect(deltaTime) {
  if (isGlitching) {
    glitchElapsed += deltaTime * 1000;

    if (glitchElapsed >= glitchDuration) {
      stopGlitchEffect();
    }

    return;
  }

  glitchTimer += deltaTime * 1000;

  if (glitchTimer >= glitchInterval) {
    glitchTimer = 0;
    startGlitchEffect();
  }
}

function updateStatusUi() {
  const hpRatio = Math.max(0, Math.min(hp / maxHp, 1));
  const expRatio = Math.max(0, Math.min(exp / expToNextLevel, 1));

  hpFill.style.width = `${hpRatio * 100}%`;
  hpValue.textContent = `${hp}/${maxHp}`;
  expFill.style.width = `${expRatio * 100}%`;
  expValue.textContent = `${Math.floor(expRatio * 100)}%`;
  levelValue.textContent = level;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateSurvivalUi() {
  timeValue.textContent = formatTime(elapsedSeconds);
  killsValue.textContent = kills;
}

function getDifficulty() {
  return Math.min(elapsedSeconds / 90, 1);
}

function getSpawnInterval() {
  const difficulty = getDifficulty();
  return 950 - difficulty * 560;
}

function getBulletSpeed() {
  const difficulty = getDifficulty();
  return 160 + Math.random() * 90 + difficulty * 280;
}

function getEnemySpawnInterval() {
  const difficulty = getDifficulty();
  return enemySpawnInterval - difficulty * 360;
}

function createExpOrb(x, y, value = 34) {
  const orb = document.createElement("img");

  orb.className = "exp-orb";
  orb.src = "assets/exp_orb.png";
  orb.alt = "";
  orb.setAttribute("aria-hidden", "true");
  orb.style.left = `${x}px`;
  orb.style.top = `${y}px`;
  expLayer.appendChild(orb);

  expOrbs.push({
    element: orb,
    x,
    y,
    value,
  });
}

function createExpOrbFromEnemy(enemy) {
  const enemyRect = enemy.element.getBoundingClientRect();
  const screenRect = gameScreen.getBoundingClientRect();
  const centerX = enemyRect.left - screenRect.left + enemyRect.width / 2 - 12;
  const centerY = enemyRect.top - screenRect.top + enemyRect.height / 2 - 12;
  const totalValue = 28 + enemy.maxHp * 8;
  const orbCount = Math.min(5, Math.max(2, Math.ceil(enemy.maxHp / 2) + 1));

  for (let index = 0; index < orbCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 34;
    createExpOrb(
      centerX + Math.cos(angle) * distance,
      centerY + Math.sin(angle) * distance,
      Math.ceil(totalValue / orbCount)
    );
  }
}

function addExp(amount) {
  exp += amount;

  while (exp >= expToNextLevel) {
    exp -= expToNextLevel;
    level += 1;
    showUpgradeChoices();
    break;
  }

  updateStatusUi();
}

function updateExpOrbs(playerHitbox, deltaTime) {
  const playerCenter = getPlayerCenter();
  const magnetRadius = isGlitching ? glitchExpMagnetRadius : expMagnetRadius;

  expOrbs = expOrbs.filter((orb) => {
    const orbRect = orb.element.getBoundingClientRect();
    const orbCenterX = orb.x + orbRect.width / 2;
    const orbCenterY = orb.y + orbRect.height / 2;
    const dx = playerCenter.x - orbCenterX;
    const dy = playerCenter.y - orbCenterY;
    const distance = Math.hypot(dx, dy) || 1;

    if (distance < magnetRadius) {
      const pull = (isGlitching ? 520 : 360) * (1 - distance / magnetRadius + 0.25);
      orb.x += (dx / distance) * pull * deltaTime;
      orb.y += (dy / distance) * pull * deltaTime;
      orb.element.style.left = `${orb.x}px`;
      orb.element.style.top = `${orb.y}px`;
      orb.element.classList.add("is-magnetized");
    } else {
      orb.element.classList.remove("is-magnetized");
    }

    if (rectanglesOverlap(playerHitbox, orb.element.getBoundingClientRect()) || distance < 18) {
      addExp(orb.value);
      orb.element.remove();
      return false;
    }

    return true;
  });
}

function pickUpgradeOptions() {
  const pool = [...upgradePool];
  const selected = [];

  while (selected.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
}

function showUpgradeChoices() {
  isChoosingUpgrade = true;
  upgradeOptions.innerHTML = "";

  pickUpgradeOptions().forEach((upgrade) => {
    const button = document.createElement("button");
    const title = document.createElement("span");
    const description = document.createElement("span");

    button.className = "upgrade-card";
    button.type = "button";
    title.className = "upgrade-card-title";
    description.className = "upgrade-card-desc";
    title.textContent = upgrade.title;
    description.textContent = upgrade.description;
    button.append(title, description);
    button.addEventListener("click", () => selectUpgrade(upgrade));
    upgradeOptions.appendChild(button);
  });

  upgradePanel.hidden = false;
  upgradeOptions.querySelector("button")?.focus();
}

function selectUpgrade(upgrade) {
  upgrade.apply();
  upgradePanel.hidden = true;
  isChoosingUpgrade = false;
  playerWinVisualTimer = 1100;
  lastFrameTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}
function createBullet() {
  const size = 16 + Math.random() * 18;
  const maxX = Math.max(0, gameScreen.clientWidth - size);
  const bullet = document.createElement("div");
  const bulletData = {
    element: bullet,
    x: Math.random() * maxX,
    y: -size,
    size,
    speed: getBulletSpeed(),
  };

  bullet.className = "bullet";
  bullet.style.width = `${size}px`;
  bullet.style.height = `${size}px`;
  bulletLayer.appendChild(bullet);
  bullets.push(bulletData);
}

function updateBullets(deltaTime) {
  const screenHeight = gameScreen.clientHeight;

  bullets = bullets.filter((bullet) => {
    bullet.y += bullet.speed * deltaTime;
    bullet.element.style.transform = `translate(${bullet.x}px, ${bullet.y}px)`;

    if (bullet.y > screenHeight + bullet.size) {
      bullet.element.remove();
      return false;
    }

    return true;
  });
}

function chooseEnemyType() {
  const roll = Math.random();
  let cursor = 0;

  for (const enemyType of enemyTypes) {
    cursor += enemyType.weight;

    if (roll <= cursor) {
      return enemyType;
    }
  }

  return enemyTypes[0];
}

function createEnemy() {
  const type = chooseEnemyType();
  const side = Math.floor(Math.random() * 4);
  const padding = 72;
  const screenWidth = gameScreen.clientWidth;
  const screenHeight = gameScreen.clientHeight;
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * screenWidth;
    y = -padding;
  } else if (side === 1) {
    x = screenWidth + padding;
    y = Math.random() * screenHeight;
  } else if (side === 2) {
    x = Math.random() * screenWidth;
    y = screenHeight + padding;
  } else {
    x = -padding;
    y = Math.random() * screenHeight;
  }

  const enemy = document.createElement("img");
  enemy.className = type.className;
  enemy.src = type.src;
  enemy.alt = "";
  enemy.setAttribute("aria-hidden", "true");
  enemy.addEventListener("error", () => {
    imageError.hidden = false;
  });
  enemyLayer.appendChild(enemy);

  enemies.push({
    element: enemy,
    x,
    y,
    role: type.role,
    hp: type.hp,
    maxHp: type.hp,
    speed: type.speed,
    freezeTimer: 0,
    warpTimer: type.role === "glitch" ? 900 + Math.random() * 1200 : Infinity,
    surgeTimer: type.role === "rush" ? Math.random() * 700 : 0,
  });
}

function getRectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getEnemyCenter(enemy) {
  const rect = enemy.element.getBoundingClientRect();
  const screenRect = gameScreen.getBoundingClientRect();

  return {
    x: rect.left - screenRect.left + rect.width / 2,
    y: rect.top - screenRect.top + rect.height / 2,
  };
}

function getPlayerCenter() {
  const rect = glitchImage.getBoundingClientRect();
  const screenRect = gameScreen.getBoundingClientRect();

  return {
    x: rect.left - screenRect.left + rect.width / 2,
    y: rect.top - screenRect.top + rect.height / 2,
  };
}

function updateEnemies(deltaTime) {
  const playerCenter = getPlayerCenter();

  enemies.forEach((enemy) => {
    if (enemy.freezeTimer > 0) {
      enemy.freezeTimer = Math.max(0, enemy.freezeTimer - deltaTime * 1000);

      if (enemy.freezeTimer === 0) {
        enemy.element.classList.remove("is-anomaly");
      }

      return;
    }

    const rect = enemy.element.getBoundingClientRect();
    const enemyCenterX = enemy.x + rect.width / 2;
    const enemyCenterY = enemy.y + rect.height / 2;
    const dx = playerCenter.x - enemyCenterX;
    const dy = playerCenter.y - enemyCenterY;
    const distance = Math.hypot(dx, dy) || 1;
    let speed = enemy.speed + getDifficulty() * 34;

    if (enemy.role === "rush") {
      enemy.surgeTimer += deltaTime * 1000;
      const isSurging = enemy.surgeTimer % 1500 > 980;
      speed *= isSurging ? 1.65 : 0.9;
      enemy.element.classList.toggle("is-rushing", isSurging);
    }

    if (enemy.role === "glitch") {
      enemy.warpTimer -= deltaTime * 1000;

      if (enemy.warpTimer <= 0) {
        const sideStep = (Math.random() < 0.5 ? -1 : 1) * (28 + Math.random() * 30);
        enemy.x += (dx / distance) * 34 + (-dy / distance) * sideStep;
        enemy.y += (dy / distance) * 34 + (dx / distance) * sideStep;
        enemy.freezeTimer = 90;
        enemy.warpTimer = 1200 + Math.random() * 1500;
        enemy.element.classList.add("is-anomaly");
      }
    }

    enemy.x += (dx / distance) * speed * deltaTime;
    enemy.y += (dy / distance) * speed * deltaTime;
    enemy.element.style.transform = `translate(${enemy.x}px, ${enemy.y}px)`;
    enemy.element.classList.toggle("is-anomaly", enemy.role === "glitch" && enemy.freezeTimer > 0);
  });
}

function findNearestEnemy() {
  if (enemies.length === 0) {
    return null;
  }

  const playerCenter = getPlayerCenter();
  let nearest = null;
  let nearestDistance = Infinity;

  enemies.forEach((enemy) => {
    const rect = enemy.element.getBoundingClientRect();
    const screenRect = gameScreen.getBoundingClientRect();
    const enemyCenterX = rect.left - screenRect.left + rect.width / 2;
    const enemyCenterY = rect.top - screenRect.top + rect.height / 2;
    const distance = Math.hypot(enemyCenterX - playerCenter.x, enemyCenterY - playerCenter.y);

    if (distance < nearestDistance) {
      nearest = enemy;
      nearestDistance = distance;
    }
  });

  return nearest;
}

function getEnemyHitboxRadius(enemy) {
  const rect = enemy.element.getBoundingClientRect();
  const width = rect.width * enemyHitboxWidthRatio;
  const height = rect.height * enemyHitboxHeightRatio;
  return Math.max(width, height) / 2;
}

function createAttack() {
  const targetEnemy = findNearestEnemy();

  if (!targetEnemy) {
    return;
  }

  const playerCenter = getPlayerCenter();
  const targetCenter = getEnemyCenter(targetEnemy);
  const targetDx = targetCenter.x - playerCenter.x;
  const targetDy = targetCenter.y - playerCenter.y;
  const targetDistance = Math.hypot(targetDx, targetDy) || 1;
  const directionX = targetDx / targetDistance;
  const directionY = targetDy / targetDistance;
  const size = isGlitching ? attackSize * 1.25 : attackSize;
  const radius = size / 2;
  const offsetDistance = Math.min(radius * 0.42, 72);
  const attackCenter = {
    x: playerCenter.x + directionX * offsetDistance,
    y: playerCenter.y + directionY * offsetDistance,
  };
  const damage = isGlitching ? attackDamage + 1 : attackDamage;
  const attack = document.createElement("img");
  let debugElement = null;

  playerAttackVisualTimer = 340;

  attack.className = "attack-effect attack-effect-area";
  attack.src = "assets/attack_slash.png";
  attack.alt = "";
  attack.setAttribute("aria-hidden", "true");
  attack.style.width = `${size}px`;
  attackLayer.appendChild(attack);

  if (DEBUG_ATTACK_HITBOX) {
    debugElement = document.createElement("div");
    debugElement.className = "attack-hitbox-debug";
    debugElement.style.width = `${size}px`;
    debugElement.style.height = `${size}px`;
    attackLayer.appendChild(debugElement);
  }

  attacks.push({
    element: attack,
    debugElement,
    type: "area",
    x: attackCenter.x - radius,
    y: attackCenter.y - radius,
    angle: Math.atan2(directionY, directionX) * (180 / Math.PI),
    damage,
    lifetime: 260,
  });

  enemies.slice().forEach((enemy) => {
    const enemyCenter = getEnemyCenter(enemy);
    const distance = Math.hypot(enemyCenter.x - attackCenter.x, enemyCenter.y - attackCenter.y);
    const enemyRadius = getEnemyHitboxRadius(enemy);

    if (distance <= radius + enemyRadius) {
      damageEnemy(enemy, damage);
    }
  });
}

function updateAttacks(deltaTime) {
  attacks = attacks.filter((attack) => {
    attack.lifetime -= deltaTime * 1000;
    attack.angle += 320 * deltaTime;
    attack.element.style.transform = `translate(${attack.x}px, ${attack.y}px) rotate(${attack.angle}deg)`;
    if (attack.debugElement) {
      attack.debugElement.style.transform = `translate(${attack.x}px, ${attack.y}px)`;
    }

    if (attack.lifetime <= 0) {
      attack.element.remove();
      attack.debugElement?.remove();
      return false;
    }

    return true;
  });
}

function rectanglesOverlap(first, second) {
  return !(
    first.right < second.left ||
    first.left > second.right ||
    first.bottom < second.top ||
    first.top > second.bottom
  );
}

function getInsetRect(rect, widthRatio, heightRatio, verticalOffsetRatio = 0, horizontalOffset = 0, verticalOffset = 0) {
  const width = rect.width * widthRatio;
  const height = rect.height * heightRatio;
  const centerX = rect.left + rect.width / 2 + horizontalOffset;
  const centerY = rect.top + rect.height / 2 + rect.height * verticalOffsetRatio + verticalOffset;

  return {
    left: centerX - width / 2,
    right: centerX + width / 2,
    top: centerY - height / 2,
    bottom: centerY + height / 2,
  };
}

function getPlayerHitbox() {
  const imageRect = glitchImage.getBoundingClientRect();
  const offsetX = isGlitching ? glitchHitboxOffsetX : 0;
  const offsetY = isGlitching ? glitchHitboxOffsetY : 0;
  return getInsetRect(imageRect, hitboxWidthRatio, hitboxHeightRatio, hitboxVerticalOffsetRatio, offsetX, offsetY);
}

function getEnemyHitbox(enemy) {
  return getInsetRect(
    enemy.element.getBoundingClientRect(),
    enemyHitboxWidthRatio,
    enemyHitboxHeightRatio,
    enemyHitboxVerticalOffsetRatio,
  );
}

function updateHitboxDebug(playerHitbox) {
  if (!DEBUG_HITBOX) {
    hitboxDebug.hidden = true;
    return;
  }

  const screenRect = gameScreen.getBoundingClientRect();
  hitboxDebug.hidden = false;
  hitboxDebug.style.left = `${playerHitbox.left - screenRect.left}px`;
  hitboxDebug.style.top = `${playerHitbox.top - screenRect.top}px`;
  hitboxDebug.style.width = `${playerHitbox.right - playerHitbox.left}px`;
  hitboxDebug.style.height = `${playerHitbox.bottom - playerHitbox.top}px`;
}

function hasBulletCollision(playerHitbox) {
  return bullets.some((bullet) => {
    const bulletRect = bullet.element.getBoundingClientRect();
    return rectanglesOverlap(playerHitbox, bulletRect);
  });
}

function damageEnemy(enemy, damage) {
  enemy.hp -= damage;

  if (enemy.hp <= 0) {
    createExpOrbFromEnemy(enemy);
    kills += 1;
    updateSurvivalUi();
    enemy.element.remove();
    enemies = enemies.filter((candidate) => candidate !== enemy);
  }
}

function updateAttackEnemyCollisions() {
  attacks = attacks.filter((attack) => {
    if (attack.type === "area") {
      return true;
    }

    const attackRect = attack.element.getBoundingClientRect();
    const hitEnemy = enemies.find((enemy) => {
      const enemyHitbox = getEnemyHitbox(enemy);
      return rectanglesOverlap(attackRect, enemyHitbox);
    });

    if (hitEnemy) {
      damageEnemy(hitEnemy, attack.damage);
      attack.element.remove();
      return false;
    }

    return true;
  });
}

function showDamageFeedback() {
  clearTimeout(damageFeedbackTimer);
  player.classList.add("is-hit");
  hitFlash.classList.remove("is-active");
  void hitFlash.offsetWidth;
  hitFlash.classList.add("is-active");

  damageFeedbackTimer = window.setTimeout(() => {
    if (!isGameOver) {
      player.classList.remove("is-hit");
      hitFlash.classList.remove("is-active");
    }
  }, 260);
}

function damagePlayer(amount) {
  if (invulnerabilityTimer > 0 || isGameOver || isGlitching) {
    return;
  }

  hp = Math.max(0, hp - amount);
  invulnerabilityTimer = enemyContactInvulnerability;
  updateStatusUi();
  showDamageFeedback();

  if (hp <= 0) {
    finishGame();
  }
}

function updateEnemyPlayerCollisions(playerHitbox) {
  const touchedEnemy = enemies.some((enemy) => {
    const enemyHitbox = getEnemyHitbox(enemy);
    return rectanglesOverlap(playerHitbox, enemyHitbox);
  });

  if (touchedEnemy) {
    damagePlayer(1);
  }
}

function finishGame() {
  if (isGameOver) {
    return;
  }

  isGameOver = true;
  playerVelocityX = 0;
  playerVelocityY = 0;
  pressedKeys.left = false;
  pressedKeys.right = false;
  pressedKeys.up = false;
  pressedKeys.down = false;
  resetJoystick();
  cancelAnimationFrame(animationId);
  stopGlitchEffect();

  gameScreen.classList.add("is-hit");
  player.classList.add("is-hit");
  hitFlash.classList.remove("is-active");
  void hitFlash.offsetWidth;
  hitFlash.classList.add("is-active");

  gameOverTimer = window.setTimeout(() => {
    gameScreen.classList.remove("is-hit");
  gameScreen.classList.remove("is-world-glitch");
    hitFlash.classList.remove("is-active");
    gameOverPanel.hidden = false;
    restartButton.focus();
  }, 500);
}

function moveTowardZero(value, amount) {
  if (value > 0) {
    return Math.max(0, value - amount);
  }

  if (value < 0) {
    return Math.min(0, value + amount);
  }

  return 0;
}

function updatePlayer(deltaTime) {
  let directionX = 0;
  let directionY = 0;

  if (pressedKeys.left) {
    directionX -= 1;
  }

  if (pressedKeys.right) {
    directionX += 1;
  }

  if (pressedKeys.up) {
    directionY -= 1;
  }

  if (pressedKeys.down) {
    directionY += 1;
  }

  if (joystickInput.active) {
    directionX += joystickInput.x;
    directionY += joystickInput.y;
  }

  if (directionX !== 0 || directionY !== 0) {
    const length = Math.hypot(directionX, directionY) || 1;
    directionX /= length;
    directionY /= length;
    playerVelocityX += directionX * playerAcceleration * deltaTime;
    playerVelocityY += directionY * playerAcceleration * deltaTime;
  } else {
    playerVelocityX = moveTowardZero(playerVelocityX, playerFriction * deltaTime);
    playerVelocityY = moveTowardZero(playerVelocityY, playerFriction * deltaTime);
  }

  const currentMaxSpeed = maxPlayerSpeed + playerSpeedBonus;
  const currentSpeed = Math.hypot(playerVelocityX, playerVelocityY);

  if (currentSpeed > currentMaxSpeed) {
    playerVelocityX = (playerVelocityX / currentSpeed) * currentMaxSpeed;
    playerVelocityY = (playerVelocityY / currentSpeed) * currentMaxSpeed;
  }

  const previousX = characterX;
  const previousY = characterY;
  setCharacterPosition(
    characterX + playerVelocityX * deltaTime,
    characterY + playerVelocityY * deltaTime
  );

  if ((characterX === 0 || characterX === getMaxX()) && characterX !== previousX) {
    playerVelocityX = 0;
  }

  if ((characterY === 0 || characterY === getMaxY()) && characterY !== previousY) {
    playerVelocityY = 0;
  }
}

function gameLoop(currentTime) {
  if (isGameOver) {
    return;
  }

  const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.04);
  lastFrameTime = currentTime;

  elapsedSeconds = (currentTime - gameStartTime) / 1000;
  updateSurvivalUi();
  invulnerabilityTimer = Math.max(0, invulnerabilityTimer - deltaTime * 1000);
  playerAttackVisualTimer = Math.max(0, playerAttackVisualTimer - deltaTime * 1000);
  playerWinVisualTimer = Math.max(0, playerWinVisualTimer - deltaTime * 1000);

  updatePlayer(deltaTime);
  updateGlitchEffect(deltaTime);
  updatePlayerSprite();

  enemySpawnTimer += deltaTime * 1000;
  while (enemySpawnTimer >= getEnemySpawnInterval()) {
    createEnemy();
    enemySpawnTimer -= getEnemySpawnInterval();
  }

  attackTimer += deltaTime * 1000;
  while (attackTimer >= currentAttackInterval) {
    createAttack();
    attackTimer -= currentAttackInterval;
  }

  updateEnemies(deltaTime);
  updateAttacks(deltaTime);
  updateAttackEnemyCollisions();

  const playerHitbox = getPlayerHitbox();
  updateExpOrbs(playerHitbox, deltaTime);

  if (isChoosingUpgrade) {
    return;
  }
  updateHitboxDebug(playerHitbox);
  updateEnemyPlayerCollisions(playerHitbox);

  animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  cancelAnimationFrame(animationId);
  clearTimeout(gameOverTimer);
  clearTimeout(damageFeedbackTimer);
  clearTimeout(worldGlitchTimer);
  clearBullets();
  clearEnemies();
  clearAttacks();
  clearExpOrbs();
  resetJoystick();
  stopGlitchEffect();
  gameScreen.classList.remove("is-hit");
  player.classList.remove("is-hit");
  hitFlash.classList.remove("is-active");
  upgradePanel.hidden = true;
  upgradeOptions.innerHTML = "";
  hitboxDebug.hidden = !DEBUG_HITBOX;
  elapsedSeconds = 0;
  kills = 0;
  maxHp = 3;
  glitchDuration = 180;
  hp = maxHp;
  level = 1;
  exp = 0;
  updateStatusUi();
  playerVelocityX = 0;
  playerVelocityY = 0;
  spawnTimer = 0;
  enemySpawnTimer = enemySpawnInterval * 0.72;
  attackTimer = baseAttackInterval * 0.78;
  invulnerabilityTimer = 0;
  currentAttackInterval = baseAttackInterval;
  attackDamage = 1;
  attackSize = baseAttackSize;
  playerSpeedBonus = 0;
  playerAttackVisualTimer = 0;
  playerWinVisualTimer = 0;
  isChoosingUpgrade = false;
  glitchTimer = 0;
  isGameOver = false;
  setPlayerSprite(playerSprites.idle);
  updateSurvivalUi();
  gameOverPanel.hidden = true;
  centerCharacter();
  updateHitboxDebug(getPlayerHitbox());

  gameStartTime = performance.now();
  lastFrameTime = gameStartTime;
  animationId = requestAnimationFrame(gameLoop);
}

glitchImage.addEventListener("load", startGame, { once: true });

glitchImage.addEventListener("error", () => {
  const currentSrc = glitchImage.getAttribute("src");
  unavailablePlayerSprites.add(currentSrc);

  if (currentSrc !== playerSprites.idle) {
    setPlayerSprite(playerSprites.idle);
    return;
  }

  if (currentSrc !== fallbackPlayerImageSrc) {
    activePlayerSpriteSrc = fallbackPlayerImageSrc;
    glitchImage.src = fallbackPlayerImageSrc;
    return;
  }

  cancelAnimationFrame(animationId);
  clearBullets();
  clearEnemies();
  clearAttacks();
  clearExpOrbs();
  player.classList.add("is-hidden");
  hitboxDebug.hidden = true;
  imageError.hidden = false;
});

glitchBugImage.addEventListener("error", () => {
  if (glitchBugImage.getAttribute("src") !== playerSprites.idle) {
    glitchBugImage.src = playerSprites.idle;
    return;
  }

  if (glitchBugImage.getAttribute("src") !== fallbackGlitchImageSrc) {
    glitchBugImage.src = fallbackGlitchImageSrc;
    return;
  }

  glitchBugImage.style.display = "none";
});

glitchHitImage.addEventListener("error", () => {
  glitchHitImage.style.display = "none";
});

window.addEventListener("keydown", (event) => {
  unlockAudioAndStartBgm();

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    pressedKeys.left = true;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    pressedKeys.right = true;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    pressedKeys.up = true;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    pressedKeys.down = true;
  }
});

gameScreen.addEventListener("pointerdown", unlockAudioAndStartBgm, { passive: true });

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") {
    pressedKeys.left = false;
  }

  if (event.key === "ArrowRight") {
    pressedKeys.right = false;
  }

  if (event.key === "ArrowUp") {
    pressedKeys.up = false;
  }

  if (event.key === "ArrowDown") {
    pressedKeys.down = false;
  }
});

window.addEventListener("resize", () => {
  setCharacterPosition(characterX, characterY);
});

restartButton.addEventListener("click", () => {
  unlockGlitchAudio();
  startGame();
  playBgmAfterGesture();
});

if (muteButton) {
  prepareBgm();
  updateMuteButton();
  bgm.addEventListener("error", () => {
    isBgmAvailable = false;
    muteButton.textContent = "NO BGM";
    muteButton.disabled = true;
  });
  muteButton.addEventListener("click", () => {
    unlockGlitchAudio();
    toggleMute();
  });
}

if (glitchImage.complete && glitchImage.naturalWidth > 0) {
  startGame();
}












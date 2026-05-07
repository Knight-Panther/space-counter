import * as Phaser from 'phaser';
import { LETTERS } from '../data/letters';
import { NUMBERS } from '../data/numbers';
import { GameMode, ItemData } from '../data/types';
import { FREE_LETTER_COUNT } from '../data/freeContent';

// ─── Boss type system ─────────────────────────────────────────────────────────

type BossType = 'ship-b' | 'slime' | 'wizard' | 'demon' | 'ship-top';
type DeathStyle = 'ship' | 'goop' | 'magic' | 'demon';

interface BossDef {
  spawnKey:     string;       // initial texture key for add.sprite()
  idleAnim:     string;       // looping anim while hovering; '' = static
  enterAnim?:   string;       // play once on entry then switch to idleAnim
  shootAnim?:   string;       // play once per bullet volley
  retreatAnim?: string;       // play during retreat tween
  deathStyle:   DeathStyle;
  bulletKey:    string;       // base texture key for boss bullet
  bulletAnim?:  string;       // animation key for bullet (if animated)
  bulletTint:   number;       // tint applied to bullet sprite
  bulletScale:  number;       // bullet display scale
  bulletSpeed:  number;       // base px/s bullet speed
}

const BOSS_DEFS: Record<BossType, BossDef> = {
  'ship-b': {
    spawnKey: 'enemy-boss-b-m', idleAnim: '', deathStyle: 'ship',
    bulletKey: 'bullet-plasma', bulletAnim: 'plasma-fly',
    bulletTint: 0xff4400, bulletScale: 0.85, bulletSpeed: 200,
  },
  'slime': {
    spawnKey: 'boss-slime', idleAnim: 'boss-slime-idle', deathStyle: 'goop',
    bulletKey: 'boss-bullet-pulse-1', bulletAnim: 'boss-bullet-pulse',
    bulletTint: 0x44ff44, bulletScale: 1.6, bulletSpeed: 150,
  },
  'wizard': {
    spawnKey: 'boss-wizard', idleAnim: 'boss-wizard-idle', deathStyle: 'magic',
    bulletKey: 'boss-bullet-charged-1', bulletAnim: 'boss-bullet-charged',
    bulletTint: 0xcc44ff, bulletScale: 1.3, bulletSpeed: 220,
  },
  'demon': {
    spawnKey: 'boss-demon-idle-1', idleAnim: 'boss-demon-idle',
    shootAnim: 'boss-demon-attack', deathStyle: 'demon',
    bulletKey: 'boss-bullet-fire-1', bulletAnim: 'boss-bullet-fire',
    bulletTint: 0xff6600, bulletScale: 1.8, bulletSpeed: 240,
  },
  'ship-top': {
    spawnKey: 'boss-ship-top-1', idleAnim: 'boss-ship-top-idle', deathStyle: 'ship',
    bulletKey: 'boss-bullet-bolt-1', bulletAnim: 'boss-bullet-bolt',
    bulletTint: 0x4488ff, bulletScale: 1.0, bulletSpeed: 320,
  },
};

// ─── Wave configuration ───────────────────────────────────────────────────────

interface WaveCfg {
  slots:       number;
  bossReq:     number;
  spawnMs:     number;
  greenPct:    number;
  bluePct:     number;
  enemySpeed:  number;
  bossType:    BossType;
  bossScale:   number;
}

const WAVES: WaveCfg[] = [
  { slots: 3, bossReq: 1, spawnMs: 3800, greenPct: 0.25, bluePct: 0.12, enemySpeed:  75, bossType: 'ship-b',   bossScale: 1.0 },
  { slots: 3, bossReq: 1, spawnMs: 3400, greenPct: 0.28, bluePct: 0.13, enemySpeed:  85, bossType: 'slime',    bossScale: 2.2 },
  { slots: 3, bossReq: 1, spawnMs: 3100, greenPct: 0.30, bluePct: 0.14, enemySpeed:  95, bossType: 'wizard',   bossScale: 1.8 },
  { slots: 4, bossReq: 2, spawnMs: 2800, greenPct: 0.32, bluePct: 0.15, enemySpeed: 105, bossType: 'demon',    bossScale: 0.9 },
  { slots: 4, bossReq: 2, spawnMs: 2600, greenPct: 0.35, bluePct: 0.15, enemySpeed: 115, bossType: 'ship-top', bossScale: 1.4 },
  { slots: 4, bossReq: 2, spawnMs: 2300, greenPct: 0.38, bluePct: 0.16, enemySpeed: 125, bossType: 'slime',    bossScale: 2.6 },
  { slots: 5, bossReq: 3, spawnMs: 2000, greenPct: 0.42, bluePct: 0.17, enemySpeed: 140, bossType: 'wizard',   bossScale: 2.2 },
  { slots: 5, bossReq: 3, spawnMs: 1800, greenPct: 0.46, bluePct: 0.18, enemySpeed: 155, bossType: 'demon',    bossScale: 1.1 },
  { slots: 6, bossReq: 3, spawnMs: 1600, greenPct: 0.50, bluePct: 0.19, enemySpeed: 170, bossType: 'ship-top', bossScale: 1.8 },
  { slots: 6, bossReq: 3, spawnMs: 1400, greenPct: 0.55, bluePct: 0.20, enemySpeed: 185, bossType: 'demon',    bossScale: 1.3 },
];

function waveCfg(wave: number): WaveCfg {
  return WAVES[Math.min(wave - 1, WAVES.length - 1)];
}

// Base rage the boss always starts with, regardless of player performance.
// Increments every 2 waves: wave 1-2=0, 3-4=1, 5-6=2, 7-8=3, 9-10=4, …
function waveRageFloor(wave: number): number {
  return Math.floor((wave - 1) / 2);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIVES_MAX           = 3;
const KILL_PER_WAVE       = 15;
const BOSS_EVERY          = 12;    // enemy kills between boss spawns
const BOSS_TIMEOUT        = 15000; // ms before boss retreats
const ARSENAL_H           = 90;
const VULCAN_SPAWN_MULT   = 0.45;  // spawner interval multiplier while Vulcan is active
const VULCAN_BURST        = 4;     // enemies force-spawned on Vulcan pickup
const TOKEN_FALL_SPEED    = 88;    // px/s — constant fall speed for letter/weapon tokens
const SHIP_LERP      = 0.14;
const FIRE_COOLDOWN  = 200;   // ms between manual plasma shots
const PLASMA_SPEED   = 520;   // px/s upward
const CRASH_DIST     = 38;    // px — ship vs enemy collision radius
const POWERUP_SECS   = 15;    // seconds vulcan spread lasts
const CLAMP_X        = 26;    // min px from screen edge for ship center
const BOSS_KILL_COOLDOWN = 6000;  // ms minimum between killing a boss and triggering the next one

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface EnemyObj {
  sprite:      Phaser.GameObjects.Sprite;
  type:        'red' | 'green' | 'blue' | 'purple' | 'ship';
  velY:        number;
  wobblePhase: number;
  wobbleAmp:   number;
  baseX:       number;
  scale:       number;
  item?:       ItemData;  // green carries letter/number, blue carries weapon powerup
}

interface BulletObj {
  img:        Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  type:       'plasma' | 'proton' | 'boss';
  tweenDriven: boolean;
}

interface TokenObj {
  sprite:   Phaser.GameObjects.Sprite;
  charText: Phaser.GameObjects.Text;
  item:     ItemData;
  isWeapon: boolean;  // true = weapon power-up token, false = letter/number
}

interface SlotUI {
  bg:        Phaser.GameObjects.Graphics;
  glow:      Phaser.GameObjects.Graphics;
  charText:  Phaser.GameObjects.Text;
  latinText: Phaser.GameObjects.Text;
  zone:      Phaser.GameObjects.Zone;
  cx:        number;
  slotY:     number;
  slotW:     number;
  slotH:     number;
  idleTween: Phaser.Tweens.Tween | null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {
  private mode:    GameMode = 'alphabet';
  private dataset: ItemData[] = [];

  // Parallax
  private background!:    Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  private nebulaLayer:    Phaser.GameObjects.TileSprite | null = null;
  private starfieldLayer: Phaser.GameObjects.TileSprite | null = null;
  private flybyPlanets:   { img: Phaser.GameObjects.Image; speed: number }[] = [];

  // Ship
  private ship!:       Phaser.GameObjects.Sprite;
  private exhaust:     Phaser.GameObjects.Sprite | null = null;
  private prevShipX  = 0;
  private shipTargetX = 0;
  private shipTargetY = 0;

  // Weapon state
  private activeWeapon: 'plasma' | 'vulcan' = 'plasma';
  private weaponTimer: Phaser.Time.TimerEvent | null = null;
  private weaponEndTime = 0;

  // Game objects
  private bullets:  BulletObj[] = [];
  private enemies:  EnemyObj[]  = [];
  private tokens:   TokenObj[]  = [];
  private arsenal:  ItemData[]  = [];

  // Boss
  private boss:             EnemyObj | null = null;
  private bossType:         BossType | null = null;
  private bossIsShooting    = false;
  private bossRetreating  = false;
  private bossRequired:   ItemData[] = [];  // items boss demands (multi)
  private bossRemaining:  ItemData[] = [];  // items still needed to kill boss
  private bossHintLabel:  Phaser.GameObjects.Text | null = null;
  private bossRageLabel:  Phaser.GameObjects.Text | null = null;
  private bossRage        = 0;   // increments each time boss retreats unkilled; resets on kill
  private bossBulletTimer:  Phaser.Time.TimerEvent | null = null;
  private bossEngineSound:  Phaser.Sound.BaseSound  | null = null;
  private shipEngineSound:  Phaser.Sound.BaseSound  | null = null;
  private bossThrustSound:  Phaser.Sound.BaseSound  | null = null;

  // Timers
  private lastFireTime      = 0;
  private enemySpawnTimer:  Phaser.Time.TimerEvent | null = null;
  private bossRetreatTimer: Phaser.Time.TimerEvent | null = null;

  // Arsenal UI
  private slotUIs:           SlotUI[] = [];
  private arsenalAccentColor = 0x3355aa;

  // HUD weapon bar refs (sent via events)
  private weaponBarActive = false;

  // State
  private score         = 0;
  private lives         = LIVES_MAX;
  private wave          = 1;
  private killCount     = 0;
  private killsSinceBoss  = 0;
  private greensSinceBoss = 0;  // greens killed by player since last boss trigger
  private bossScheduled   = false; // prevents double-scheduling while greens are being forced
  private mistakeWeights = new Map<string, number>();
  private isDead              = false;
  private lastBossContactTime = 0;  // cooldown to prevent per-frame damage on boss overlap
  private lastBossKillTime    = 0;
  private lastBossWave        = 0;  // wave in which the last boss spawned — ensures one boss per wave
  private lastBossHintTapTime = 0;  // cooldown to prevent hint replay stacking on rapid taps
  private arsenalReadyShown   = false;

  // Floor (wave-based) + accumulated retreats = total rage this boss encounter uses
  private get totalBossRage(): number { return this.bossRage + waveRageFloor(this.wave); }

  constructor() { super({ key: 'GameScene' }); }

  init(data: { mode?: GameMode }): void {
    this.mode    = data.mode ?? 'alphabet';
    this.dataset = this.mode === 'alphabet' ? LETTERS : NUMBERS;
    this.score   = 0;
    this.lives   = LIVES_MAX;
    this.wave    = 1;
    this.killCount       = 0;
    this.killsSinceBoss  = 0;
    this.greensSinceBoss = 0;
    this.bossScheduled   = false;
    this.isDead              = false;
    this.lastBossContactTime = 0;
    this.lastBossKillTime    = 0;
    this.lastBossWave        = 0;
    this.lastBossHintTapTime = 0;
    this.arsenalReadyShown   = false;
    this.activeWeapon   = 'plasma';
    this.weaponEndTime  = 0;
    this.weaponBarActive = false;
    for (const ui of this.slotUIs) { ui.idleTween?.stop(); ui.idleTween = null; }
    this.slotUIs  = [];
    this.bullets  = [];
    this.enemies  = [];
    this.tokens   = [];
    this.arsenal  = [];
    this.boss         = null;
    this.bossType     = null;
    this.bossIsShooting = false;
    this.bossRetreating  = false;
    this.bossRequired    = [];
    this.bossRemaining   = [];
    this.bossHintLabel   = null;
    this.bossRageLabel   = null;
    this.bossRage        = 0;
    this.bossBulletTimer = null;
    this.bossEngineSound = null;
    this.bossThrustSound = null;
    this.shipEngineSound = null;
    this.mistakeWeights.clear();
    this.arsenalAccentColor = this.mode === 'alphabet' ? 0x3355aa : 0x884400;
  }

  create(): void {
    const { width, height } = this.scale;
    this.sound.stopAll();
    this.playMusic('music-game');
    this.drawBackground(width, height);
    this.spawnShip(width, height);
    this.buildArsenalBar(width, height);
    this.scene.launch('HUDScene', { mode: this.mode });
    this.time.delayedCall(120, () => this.syncHUD());
    this.setupInput(width, height);
    this.startEnemySpawner();
    this.playWave1Instruction();
  }

  private playWave1Instruction(): void {
    const key = this.mode === 'alphabet'
      ? 'gameplay-alphabet-instruction'
      : 'gameplay-number-instruction';
    if (!this.cache.audio.has(key)) return;
    this.time.delayedCall(1500, () => {
      if (!this.isDead) this.sound.play(key, { volume: 1.0 });
    });
  }

  shutdown(): void { this.sound.stopAll(); }

  // ─── Ship ─────────────────────────────────────────────────────────────────

  private spawnShip(w: number, h: number): void {
    const sx = w / 2;
    const sy = h - ARSENAL_H - 70;
    const key = this.textures.exists('ship-m') ? 'ship-m' : 'player-ship';
    this.ship = this.add.sprite(sx, sy, key).setDepth(5);
    this.prevShipX   = sx;
    this.shipTargetX = sx;
    this.shipTargetY = sy;
    if (!this.textures.exists('ship-m')) return;
    this.exhaust = this.add.sprite(sx, sy + 30, 'exhaust-1').setDepth(4);
    if (this.anims.exists('exhaust-loop')) this.exhaust.play('exhaust-loop');

    if (this.cache.audio.has('sfx-ship-engine')) {
      this.shipEngineSound = this.sound.add('sfx-ship-engine', { loop: true, volume: 0.30 });
      this.shipEngineSound.play();
    }
  }

  private updateShipBanking(): void {
    if (!this.textures.exists('ship-m')) return;
    const dx = this.ship.x - this.prevShipX;
    this.prevShipX = this.ship.x;
    const prefix = this.activeWeapon === 'vulcan' && this.textures.exists('ship-r-m') ? 'ship-r' : 'ship';
    if      (dx < -8) this.ship.setTexture(`${prefix}-l2`);
    else if (dx < -3) this.ship.setTexture(`${prefix}-l1`);
    else if (dx >  8) this.ship.setTexture(`${prefix}-r2`);
    else if (dx >  3) this.ship.setTexture(`${prefix}-r1`);
    else              this.ship.setTexture(`${prefix}-m`);
    if (this.exhaust) this.exhaust.setPosition(this.ship.x, this.ship.y + 30);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private setupInput(w: number, h: number): void {
    const playH = h - ARSENAL_H;
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.y > playH) return;
      this.shipTargetX = Phaser.Math.Clamp(ptr.x, CLAMP_X, w - CLAMP_X);
      this.shipTargetY = Phaser.Math.Clamp(ptr.y, 60, playH - 40);
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.y > playH) return;
      this.shipTargetX = Phaser.Math.Clamp(ptr.x, CLAMP_X, w - CLAMP_X);
      this.shipTargetY = Phaser.Math.Clamp(ptr.y, 60, playH - 40);
    });
  }

  // ─── Firing ───────────────────────────────────────────────────────────────

  private fireBullet(): void {
    if (this.isDead) return;
    const now = this.time.now;
    if (now - this.lastFireTime < FIRE_COOLDOWN) return;
    this.lastFireTime = now;
    if (this.activeWeapon === 'vulcan') {
      this.fireVulcan();
    } else {
      this.firePlasma(this.ship.x, this.ship.y - 28, 0);
    }
  }

  private firePlasma(x: number, y: number, angleOffset: number): void {
    let img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    if (this.anims.exists('plasma-fly')) {
      const spr = this.add.sprite(x, y, 'bullet-plasma').setDepth(6).setScale(0.7).setRotation(angleOffset);
      spr.play('plasma-fly');
      img = spr;
    } else {
      const key = this.textures.exists('bullet-plasma') ? 'bullet-plasma' : 'bullet';
      img = this.add.image(x, y, key).setDepth(6).setScale(0.7).setRotation(angleOffset);
    }
    this.bullets.push({ img, type: 'plasma', tweenDriven: false });
    this.playSound(this.cache.audio.has('sfx-laser-plasma') ? 'sfx-laser-plasma' : 'sfx-laser', 0.22);
  }

  private fireVulcan(): void {
    const cx = this.ship.x;
    const cy = this.ship.y - 28;
    const angles = [-0.26, 0, 0.26]; // ~15° spread
    for (const a of angles) {
      const key = this.textures.exists('bullet-vulcan-1') ? 'bullet-vulcan-1' : 'bullet';
      const spr = this.add.sprite(cx, cy, key).setDepth(6).setScale(0.9).setRotation(a);
      if (this.anims.exists('vulcan-fly')) spr.play('vulcan-fly');
      this.bullets.push({ img: spr, type: 'plasma', tweenDriven: false });
    }
    this.playSound(this.cache.audio.has('sfx-laser-vulcan') ? 'sfx-laser-vulcan' : 'sfx-laser', 0.22);
  }

  // ─── Arsenal tap → proton shot at boss ────────────────────────────────────

  private onArsenalTap(slotIndex: number): void {
    const item = this.arsenal[slotIndex];
    if (!item) return;
    this.playSound('sfx-arsenal-tap', 0.65);
    this.animateSlotFire(slotIndex);
    this.time.delayedCall(80, () => {
      this.arsenal.splice(slotIndex, 1);
      this.refreshArsenalUI();
    });
    if (this.boss && !this.bossRetreating && this.bossRequired.length > 0) {
      this.fireProton(item);
    } else {
      this.fireProtonAtEnemy(item);
    }
  }

  private fireProton(item: ItemData): void {
    if (!this.boss) return;
    let img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    if (this.anims.exists('proton-spin')) {
      const spr = this.add.sprite(this.ship.x, this.ship.y - 28, 'bullet-proton-1').setDepth(6).setScale(1.2);
      spr.play('proton-spin');
      img = spr;
    } else {
      const key = this.textures.exists('bullet-proton-1') ? 'bullet-proton-1' : 'bullet';
      img = this.add.image(this.ship.x, this.ship.y - 28, key).setDepth(6).setScale(1.2);
    }
    const tx = this.boss.sprite.x;
    const ty = this.boss.sprite.y;
    img.setRotation(Phaser.Math.Angle.Between(img.x, img.y, tx, ty) + Math.PI / 2);
    this.playSound('sfx-arsenal-deploy', 0.7);
    const bObj: BulletObj = { img, type: 'proton', tweenDriven: true };
    this.bullets.push(bObj);
    const dur = Math.max((Phaser.Math.Distance.Between(img.x, img.y, tx, ty) / PLASMA_SPEED) * 1000, 80);
    this.tweens.add({
      targets: img, x: tx, y: ty, duration: dur,
      onComplete: () => {
        const idx = this.bullets.indexOf(bObj);
        if (idx >= 0) this.bullets.splice(idx, 1);
        img.destroy();
        this.resolveProtonHit(item);
      },
    });
  }

  private fireProtonAtEnemy(_item: ItemData): void {
    let img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    if (this.anims.exists('proton-spin')) {
      const spr = this.add.sprite(this.ship.x, this.ship.y - 28, 'bullet-proton-1').setDepth(6).setScale(1.0);
      spr.play('proton-spin');
      img = spr;
    } else {
      const key = this.textures.exists('bullet-proton-1') ? 'bullet-proton-1' : 'bullet';
      img = this.add.image(this.ship.x, this.ship.y - 28, key).setDepth(6).setScale(1.0);
    }

    let nearestIdx  = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < this.enemies.length; i++) {
      const d = Phaser.Math.Distance.Between(img.x, img.y, this.enemies[i].sprite.x, this.enemies[i].sprite.y);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }

    const bObj: BulletObj = { img, type: 'proton', tweenDriven: true };
    this.bullets.push(bObj);

    if (nearestIdx >= 0) {
      const targetEnemy = this.enemies[nearestIdx];
      const tx = targetEnemy.sprite.x, ty = targetEnemy.sprite.y;
      // Lead the target: predict where it will be when the bullet arrives
      const flightSecs = nearestDist / PLASMA_SPEED;
      const aimX = tx;
      const aimY = ty + targetEnemy.velY * flightSecs;
      img.setRotation(Phaser.Math.Angle.Between(img.x, img.y, aimX, aimY) + Math.PI / 2);
      const dur = Math.max(flightSecs * 1000, 60);
      this.tweens.add({
        targets: img, x: aimX, y: aimY, duration: dur,
        onComplete: () => {
          const bi = this.bullets.indexOf(bObj);
          if (bi >= 0) this.bullets.splice(bi, 1);
          img.destroy();
          const ei = this.enemies.indexOf(targetEnemy);
          if (ei >= 0) this.killEnemy(ei);
        },
      });
    } else {
      img.setRotation(0);
      const dur = (this.ship.y / PLASMA_SPEED) * 1000;
      this.tweens.add({
        targets: img, y: -60, duration: dur, ease: 'Linear',
        onComplete: () => {
          const bi = this.bullets.indexOf(bObj);
          if (bi >= 0) this.bullets.splice(bi, 1);
          img.destroy();
        },
      });
    }
    this.playSound('sfx-laser', 0.25);
  }

  private resolveProtonHit(item: ItemData): void {
    if (!this.boss) return;
    const hitIdx = this.bossRemaining.findIndex(r => r.char === item.char);
    if (hitIdx >= 0) {
      // Correct item — cross it off
      this.bossRemaining.splice(hitIdx, 1);
      this.mistakeWeights.set(item.char, Math.max(0, (this.mistakeWeights.get(item.char) ?? 0) - 1));
      this.flashBossCorrect();
      this.updateBossHintLabel();
      if (this.bossRemaining.length === 0) {
        this.killBoss();
      } else {
        // Replay hint for remaining items — no "shoot" voice, player already knows
        this.time.delayedCall(400, () => this.playBossHint(false));
      }
    } else {
      // Wrong item — penalise player
      this.mistakeWeights.set(item.char, (this.mistakeWeights.get(item.char) ?? 0) + 1);
      this.flashBossImmune();
      this.takeDamage();
      this.playSound('sfx-wrong');
    }
  }

  private flashBossCorrect(): void {
    if (!this.boss) return;
    this.boss.sprite.setTint(0x00ff88);
    this.tweens.add({
      targets: this.boss.sprite, alpha: 0.6, duration: 70,
      yoyo: true, repeat: 2,
      onComplete: () => { if (this.boss) { this.applyRageTint(); this.boss.sprite.setAlpha(1); } },
    });
  }

  private flashBossImmune(): void {
    if (!this.boss) return;
    this.boss.sprite.setTint(0xff2222);
    this.tweens.add({
      targets: this.boss.sprite, alpha: 0.15, duration: 55,
      yoyo: true, repeat: 5,
      onComplete: () => { if (this.boss) { this.applyRageTint(); this.boss.sprite.setAlpha(1); } },
    });
  }

  // ─── Enemy spawner ────────────────────────────────────────────────────────

  private startEnemySpawner(): void {
    const cfg   = waveCfg(this.wave);
    const mult  = this.activeWeapon === 'vulcan' ? VULCAN_SPAWN_MULT : 1.0;
    const delay = Math.max(400, cfg.spawnMs * mult);
    this.enemySpawnTimer = this.time.addEvent({
      delay, loop: true, callback: () => this.spawnEnemy(),
    });
  }

  private restartEnemySpawner(): void {
    this.enemySpawnTimer?.remove();
    this.startEnemySpawner();
  }

  private spawnEnemy(forceType?: 'green'): void {
    if (this.isDead) return;
    const { width } = this.scale;
    const cfg = waveCfg(this.wave);
    let type: 'red' | 'green' | 'blue' | 'purple' | 'ship';
    if (forceType) {
      type = forceType;
    } else {
      const emptyRatio = Math.max(0, (cfg.slots - this.arsenal.length) / cfg.slots);
      const effectiveGreenPct = cfg.greenPct * emptyRatio;
      const effectiveBluePct = this.activeWeapon === 'vulcan' ? 0 : cfg.bluePct;
      const purplePct = this.wave >= 3 ? 0.12 : 0;
      const shipPct   = this.wave >= 5 ? 0.10 : 0;
      const roll = Math.random();
      if      (roll < effectiveBluePct)                                        type = 'blue';
      else if (roll < effectiveBluePct + effectiveGreenPct)                    type = 'green';
      else if (roll < effectiveBluePct + effectiveGreenPct + purplePct)        type = 'purple';
      else if (roll < effectiveBluePct + effectiveGreenPct + purplePct + shipPct) type = 'ship';
      else                                                                     type = 'red';
    }

    // Texture + animation key per type
    const animMap: Record<typeof type, { tex: string; anim: string }> = {
      green:  { tex: 'enemy-01',      anim: 'enemy-01-idle'      },
      blue:   { tex: 'enemy-02',      anim: 'enemy-02-idle'      },
      purple: { tex: 'enemy-03',      anim: 'enemy-03-idle'      },
      ship:   (() => {
        const variants = ['enemy-ship-01','enemy-ship-02','enemy-ship-03','enemy-ship-04','enemy-ship-yellow-01','enemy-ship-yellow-02'];
        const tex = variants[Math.floor(Math.random() * variants.length)];
        return { tex, anim: `${tex}-idle` };
      })(),
      red:    { tex: 'enemy-red',     anim: ''                   },
    };
    const { tex, anim } = animMap[type];
    const fallback = this.textures.exists(tex) ? tex : 'particle';
    const x = Phaser.Math.Between(48, width - 48);
    const sprite = this.add.sprite(x, -60, fallback).setDepth(5);
    const scale = 1.0;

    if (anim && this.anims.exists(anim)) {
      sprite.play(anim);
    }
    // Ships face upward (player-ship art) — flip to face downward as enemies
    if (type === 'ship') sprite.setFlipY(true);

    this.playSound('sfx-alien-appear', 0.3);

    const item = (type === 'green' || type === 'blue' || type === 'purple') ? this.pickRandomItem() : undefined;

    // Show carried item label on token-carrying enemies
    if ((type === 'green' || type === 'purple') && item) {
      const lbl = this.add.text(x, -60 + 36, item.display, {
        fontSize: '17px', color: '#ffff00',
        stroke: '#000000', strokeThickness: 3,
        fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
      }).setOrigin(0.5).setDepth(6);
      sprite.setData('label', lbl);
    }

    this.enemies.push({
      sprite, type, item, scale,
      velY: cfg.enemySpeed * (type === 'ship' ? 1.4 : 1.0),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp:   type === 'green' ? 38 : type === 'blue' ? 22 : type === 'purple' ? 28 : 0,
      baseX: x,
    });
  }

  // ─── Guaranteed green pre-boss spawns ────────────────────────────────────

  // Called when boss trigger fires but the player hasn't seen enough green carriers.
  // Spawns `count` forced greens one by one, then waits for the player to kill+collect,
  // then spawns the boss.
  private spawnGuaranteedGreens(count: number): void {
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(800 + i * 1600, () => {
        if (!this.isDead) this.spawnEnemy('green');
      });
    }
    // Give player time to shoot the greens and collect the falling tokens
    const waitMs = 800 + count * 1600 + 6500;
    this.time.delayedCall(waitMs, () => {
      if (!this.isDead && !this.boss) this.spawnBoss();
    });
  }

  // ─── Boss ─────────────────────────────────────────────────────────────────

  private spawnBoss(): void {
    if (this.boss || this.isDead) return;
    const { width } = this.scale;
    const cfg = waveCfg(this.wave);
    const bt  = cfg.bossType;
    const def = BOSS_DEFS[bt];
    this.bossType       = bt;
    this.bossIsShooting = false;
    this.lastBossWave   = this.wave;

    const spawnKey   = this.textures.exists(def.spawnKey) ? def.spawnKey : 'particle';
    const bossSprite = this.add.sprite(width / 2, -90, spawnKey)
      .setDepth(5).setScale(cfg.bossScale);

    this.greensSinceBoss = 0;
    this.bossScheduled   = false;

    const uniqueArsenal = this.arsenal.filter((item, idx, arr) =>
      arr.findIndex(a => a.char === item.char) === idx
    );
    Phaser.Utils.Array.Shuffle(uniqueArsenal);
    this.bossRequired  = uniqueArsenal.slice(0, Math.min(cfg.bossReq, uniqueArsenal.length));
    this.bossRemaining = [...this.bossRequired];
    this.bossRetreating = false;

    this.boss = {
      sprite: bossSprite, type: 'red',
      velY: 0, wobblePhase: 0, wobbleAmp: 0, baseX: width / 2,
    };

    this.playSound('sfx-alien-appear', 0.8);

    // Play enter anim immediately (e.g. ghost appear), then switch to idle
    if (def.enterAnim && this.anims.exists(def.enterAnim)) {
      bossSprite.play(def.enterAnim);
      bossSprite.once('animationcomplete', () => {
        if (this.boss && def.idleAnim && this.anims.exists(def.idleAnim))
          bossSprite.play(def.idleAnim);
      });
    }

    this.tweens.add({
      targets: bossSprite, y: 110, duration: 1200, ease: 'Back.Out',
      onComplete: () => {
        if (!this.boss) return;
        // Start idle anim for bosses that have no enter anim
        if (!def.enterAnim && def.idleAnim && this.anims.exists(def.idleAnim))
          bossSprite.play(def.idleAnim);
        this.applyRageTint();
        this.createBossRageLabel();
        this.playBossHint();
        this.createBossHintLabel();
        bossSprite.setInteractive();
        bossSprite.on('pointerdown', () => {
          if (this.bossRetreating || !this.boss) return;
          const now = this.time.now;
          const hintDuration = this.bossRemaining.length * 900 + 800;
          if (now - this.lastBossHintTapTime < hintDuration) return;
          this.lastBossHintTapTime = now;
          this.playBossHint(false);
        });
        if (this.totalBossRage > 0) this.startBossBulletTimer();
        this.playSound('sfx-boss-alarm', 0.25);
        if (this.cache.audio.has('sfx-boss-engine')) {
          this.bossEngineSound = this.sound.add('sfx-boss-engine', { loop: true, volume: 0.45 });
          this.bossEngineSound.play();
        }
        if (this.cache.audio.has('sfx-boss-thrust')) {
          this.bossThrustSound = this.sound.add('sfx-boss-thrust', { loop: true, volume: 0.68 });
          this.bossThrustSound.play();
        }
        this.tweens.add({ targets: bossSprite, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: bossSprite, x: bossSprite.x + 50, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      },
    });

    this.bossRetreatTimer = this.time.delayedCall(BOSS_TIMEOUT, () => this.retreatBoss());
  }

  private stopBossEngineSound(): void {
    if (this.bossEngineSound) {
      this.bossEngineSound.stop();
      this.bossEngineSound.destroy();
      this.bossEngineSound = null;
    }
    if (this.bossThrustSound) {
      this.bossThrustSound.stop();
      this.bossThrustSound.destroy();
      this.bossThrustSound = null;
    }
  }

  private retreatBoss(): void {
    if (!this.boss || this.bossRetreating) return;
    this.bossRetreating  = true;
    this.bossScheduled   = false;
    this.bossRage++;
    this.bossBulletTimer?.remove(); this.bossBulletTimer = null;
    this.stopBossEngineSound();
    this.destroyBossLabels();
    this.tweens.killTweensOf(this.boss.sprite);

    const def = this.bossType ? BOSS_DEFS[this.bossType] : null;
    const doRetreatTween = () => {
      if (!this.boss) return;
      this.tweens.add({
        targets: this.boss.sprite, y: -150, alpha: 0, duration: 900,
        onComplete: () => { this.boss?.sprite.destroy(); this.boss = null; this.bossRetreating = false; },
      });
    };

    if (def?.retreatAnim && this.anims.exists(def.retreatAnim)) {
      this.boss.sprite.play(def.retreatAnim);
      this.boss.sprite.once('animationcomplete', () => doRetreatTween());
    } else {
      doRetreatTween();
    }
  }

  private killBoss(): void {
    if (!this.boss) return;
    this.bossRetreatTimer?.remove(); this.bossRetreatTimer = null;
    this.bossBulletTimer?.remove();  this.bossBulletTimer = null;
    this.stopBossEngineSound();
    this.bossRage          = 0;
    this.bossScheduled     = false;
    this.lastBossKillTime  = this.time.now;
    this.tweens.killTweensOf(this.boss.sprite);
    this.destroyBossLabels();
    const bx = this.boss.sprite.x;
    const by = this.boss.sprite.y;
    const bt = this.bossType;
    this.boss.sprite.destroy();
    this.boss         = null;
    this.bossType     = null;
    this.bossRetreating  = false;
    this.bossRequired  = [];
    this.bossRemaining = [];

    this.playBossExplosion(bx, by, bt);
    this.playSound('sfx-explosion-boss', 0.9);
    this.time.delayedCall(600, () => this.playSound('voice-boss-kill', 1.3));
    this.score += 50 * this.wave;
    this.scene.get('HUDScene')?.events.emit('score-update', this.score);

    // Brief spawn pause — reward moment
    this.enemySpawnTimer?.paused && (this.enemySpawnTimer.paused = false);
    this.enemySpawnTimer?.remove();
    this.time.delayedCall(2000, () => { if (!this.isDead) this.startEnemySpawner(); });
  }

  private playBossHint(withShoot = true): void {
    const shootDelay = (withShoot && this.cache.audio.has('voice-shoot')) ? 600 : 0;
    if (shootDelay > 0) this.sound.play('voice-shoot', { volume: 1.0 });
    this.bossRemaining.forEach((item, i) => {
      this.time.delayedCall(shootDelay + i * 900, () => {
        if (this.cache.audio.has(item.audioKey)) {
          this.sound.play(item.audioKey, { volume: 1.5 });
        }
      });
    });
  }

  private createBossHintLabel(): void {
    if (!this.boss) return;
    this.bossHintLabel?.destroy();
    this.bossHintLabel = null;

    const unkillable = this.bossRequired.length === 0;
    const chars   = unkillable ? '⚠  collect items!' : this.bossRemaining.map(r => r.char).join('  +  ');
    const latins  = unkillable ? '' : this.bossRemaining.map(r => r.latin).join('       ');
    const text    = unkillable ? chars : `▼  ${chars}\n   ${latins}`;
    const color   = unkillable ? '#ff6644' : '#ffdd00';

    this.bossHintLabel = this.add.text(
      this.boss.sprite.x,
      this.boss.sprite.y + 78,
      text,
      {
        fontSize: '28px',
        color,
        stroke: '#000000',
        strokeThickness: 5,
        fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
        backgroundColor: '#00000099',
        padding: { x: 10, y: 6 },
        align: 'center',
      }
    ).setOrigin(0.5, 0).setDepth(10);

    this.tweens.add({
      targets: this.bossHintLabel,
      alpha: 0.5,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private updateBossHintLabel(): void {
    if (!this.bossHintLabel) return;
    if (this.bossRemaining.length === 0) {
      this.tweens.killTweensOf(this.bossHintLabel);
      this.bossHintLabel.destroy();
      this.bossHintLabel = null;
      return;
    }
    const chars  = this.bossRemaining.map(r => r.char).join('  +  ');
    const latins = this.bossRemaining.map(r => r.latin).join('       ');
    this.bossHintLabel.setText(`▼  ${chars}\n   ${latins}`);
  }

  private playBossExplosion(x: number, y: number, bt: BossType | null): void {
    const cfg       = waveCfg(this.wave);
    const deathStyle = bt ? BOSS_DEFS[bt].deathStyle : 'ship';

    // Always play the large mushroom-cloud explosion centred on the boss
    if (this.anims.exists('expl-d') && this.textures.exists('expl-d')) {
      const exp = this.add.sprite(x, y, 'expl-d').setDepth(9).setScale(cfg.bossScale * 1.6);
      exp.play('expl-d');
      exp.once('animationcomplete', () => exp.destroy());
    }

    const spawnExp = (animKey: string, ex: number, ey: number, scale: number, delay = 0) => {
      if (!this.anims.exists(animKey)) return;
      const fk = `${animKey}-01`;
      if (!this.textures.exists(fk)) return;
      this.time.delayedCall(delay, () => {
        const exp = this.add.sprite(ex, ey, fk).setDepth(8).setScale(scale);
        exp.play(animKey);
        exp.once('animationcomplete', () => exp.destroy());
      });
    };

    switch (deathStyle) {
      case 'goop': {
        const offsets: [number, number][] = [[-40, -20], [30, 30], [0, -50]];
        for (let i = 0; i < offsets.length; i++) {
          const [ox, oy] = offsets[i];
          spawnExp('explosion-2', x + ox, y + oy, cfg.bossScale * 1.1, i * 180);
        }
        break;
      }
      case 'magic': {
        spawnExp('explosion-2', x, y, cfg.bossScale * 1.8);
        this.burstParticles(x, y, 24);
        this.time.delayedCall(200, () => this.burstParticles(x, y, 16));
        break;
      }
      case 'demon': {
        spawnExp('explosion-3', x, y, cfg.bossScale * 1.4);
        this.cameras.main.shake(400, 0.020);
        const aftershocks: [number, number][] = [[-60, 20], [55, -30]];
        for (let i = 0; i < aftershocks.length; i++) {
          const [ox, oy] = aftershocks[i];
          const delay = 350 + i * 220;
          spawnExp('explosion-2', x + ox, y + oy, cfg.bossScale * 0.9, delay);
          this.time.delayedCall(delay + 50, () => this.cameras.main.shake(200, 0.010));
        }
        break;
      }
      case 'ship':
      default: {
        if (this.anims.exists('explosion-3') && this.textures.exists('explosion-3-01')) {
          const exp = this.add.sprite(x, y, 'explosion-3-01').setDepth(8).setScale(cfg.bossScale * 1.4);
          exp.play('explosion-3');
          exp.once('animationcomplete', () => exp.destroy());
        } else {
          this.burstParticles(x, y, 20);
        }
        break;
      }
    }
  }

  // ─── Boss rage helpers ────────────────────────────────────────────────────

  private destroyBossLabels(): void {
    if (this.bossHintLabel) {
      this.tweens.killTweensOf(this.bossHintLabel);
      this.bossHintLabel.destroy();
      this.bossHintLabel = null;
    }
    if (this.bossRageLabel) {
      this.tweens.killTweensOf(this.bossRageLabel);
      this.bossRageLabel.destroy();
      this.bossRageLabel = null;
    }
  }

  private applyRageTint(): void {
    if (!this.boss) return;
    const rage = this.totalBossRage;
    if (rage === 0) { this.boss.sprite.clearTint(); return; }
    const t = Math.min(rage, 5);
    const g = Math.max(0, 255 - t * 45);
    const b = Math.max(0, 255 - t * 50);
    this.boss.sprite.setTint(Phaser.Display.Color.GetColor(255, g, b));
  }

  private createBossRageLabel(): void {
    if (!this.boss || this.totalBossRage === 0) return;
    this.bossRageLabel?.destroy();
    const rage  = this.totalBossRage;
    const stars = '★'.repeat(Math.min(rage, 5));
    this.bossRageLabel = this.add.text(
      this.boss.sprite.x,
      this.boss.sprite.y - 58,
      stars,
      {
        fontSize: '20px',
        color: rage >= 4 ? '#ff2200' : rage >= 2 ? '#ff7700' : '#ffcc00',
        stroke: '#000000', strokeThickness: 4,
        fontFamily: 'Arial',
      }
    ).setOrigin(0.5).setDepth(10);
  }

  private startBossBulletTimer(): void {
    this.bossBulletTimer?.remove();
    const rage  = this.totalBossRage;
    const delay = Math.max(1200, 2500 - (rage - 1) * 300);
    this.bossBulletTimer = this.time.addEvent({
      delay, loop: true, callback: () => this.fireBossBullet(),
    });
  }

  private fireBossBullet(): void {
    if (!this.boss || this.bossRetreating || this.isDead || !this.bossType) return;
    const def   = BOSS_DEFS[this.bossType];
    const bx    = this.boss.sprite.x;
    const by    = this.boss.sprite.y + 20;
    const rage  = this.totalBossRage;
    const speed = def.bulletSpeed + Math.max(0, rage - 1) * 25;
    const count = rage >= 5 ? 3 : rage >= 3 ? 2 : 1;
    const baseAngle = Phaser.Math.Angle.Between(bx, by, this.ship.x, this.ship.y);
    const spread = Math.PI / 10;

    if (!this.bossIsShooting) {
      const shootKey = (this.bossType === 'demon' && rage >= 3 && this.anims.exists('boss-demon-breath'))
        ? 'boss-demon-breath'
        : def.shootAnim;
      if (shootKey && this.anims.exists(shootKey) && this.boss) {
        this.bossIsShooting = true;
        this.boss.sprite.play(shootKey);
        this.boss.sprite.once('animationcomplete', () => {
          this.bossIsShooting = false;
          if (this.boss && def.idleAnim && this.anims.exists(def.idleAnim))
            this.boss.sprite.play(def.idleAnim);
        });
      }
    }

    for (let i = 0; i < count; i++) {
      const angle = count === 1 ? baseAngle : baseAngle + (i - (count - 1) / 2) * spread;
      this.spawnBossBullet(bx, by, angle, speed);
    }
  }

  private spawnBossBullet(x: number, y: number, angle: number, speed: number): void {
    const def = this.bossType ? BOSS_DEFS[this.bossType] : null;
    let img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

    if (def?.bulletAnim && this.anims.exists(def.bulletAnim)) {
      const texKey = this.textures.exists(def.bulletKey) ? def.bulletKey : 'bullet';
      const spr = this.add.sprite(x, y, texKey).setDepth(6)
        .setScale(def.bulletScale).setTint(def.bulletTint);
      spr.play(def.bulletAnim);
      img = spr;
    } else {
      const texKey = def ? (this.textures.exists(def.bulletKey) ? def.bulletKey : 'bullet') : 'bullet';
      img = this.add.image(x, y, texKey).setDepth(6)
        .setScale(def?.bulletScale ?? 0.85).setTint(def?.bulletTint ?? 0xff4400);
    }

    img.setRotation(angle);
    img.setData('vx', Math.cos(angle) * speed);
    img.setData('vy', Math.sin(angle) * speed);
    this.bullets.push({ img, type: 'boss', tweenDriven: false });
  }

  private checkBossBulletCollisions(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.type !== 'boss') continue;
      if (Phaser.Math.Distance.Between(b.img.x, b.img.y, this.ship.x, this.ship.y) < 26) {
        b.img.destroy();
        this.bullets.splice(i, 1);
        this.takeDamage();
        this.playSound('sfx-wrong', 0.6);
      }
    }
  }

  // ─── Token drop ───────────────────────────────────────────────────────────

  private spawnToken(x: number, y: number, item: ItemData, isWeapon: boolean): void {
    const animKey  = isWeapon ? 'mine-11-spin' : 'mine-spin';
    const frameKey = isWeapon ? 'mine-11-1'    : 'mine-1';
    const key = this.textures.exists(frameKey) ? frameKey : 'particle';
    const sprite = this.add.sprite(x, y, key).setDepth(5).setScale(0.9);
    if (this.anims.exists(animKey)) sprite.play(animKey);

    const label = isWeapon ? '⚡' : item.display;
    const charText = this.add.text(x, y + 28, label, {
      fontSize: '17px', color: isWeapon ? '#ffdd00' : '#ffff00',
      stroke: '#000000', strokeThickness: 3,
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
    }).setOrigin(0.5).setDepth(6);

    this.tokens.push({ sprite, charText, item, isWeapon });
  }

  private collectToken(idx: number): void {
    const tok = this.tokens[idx];
    tok.sprite.destroy();
    tok.charText.destroy();
    this.tokens.splice(idx, 1);

    if (tok.isWeapon) {
      this.activateWeaponPowerup();
    } else {
      // Discard if this letter/number is already in the arsenal
      if (this.arsenal.some(a => a.char === tok.item.char)) return;
      const maxSlots = waveCfg(this.wave).slots;
      if (this.arsenal.length >= maxSlots) return;
      this.arsenal.push(tok.item);
      this.playSound(tok.item.audioKey, 1.3);
      this.refreshArsenalUI();
      this.animateSlotCollect(this.arsenal.length - 1);
      this.checkArsenalReady();
    }
  }

  // ─── Weapon power-up ──────────────────────────────────────────────────────

  private activateWeaponPowerup(): void {
    this.activeWeapon  = 'vulcan';
    this.weaponEndTime = this.time.now + POWERUP_SECS * 1000;
    this.weaponTimer?.remove();
    this.weaponTimer = this.time.delayedCall(POWERUP_SECS * 1000, () => {
      this.activeWeapon    = 'plasma';
      this.weaponBarActive = false;
      this.scene.get('HUDScene')?.events.emit('weapon-end');
      this.restartEnemySpawner(); // activeWeapon is now 'plasma' → restores normal rate
    });
    this.weaponBarActive = true;
    this.scene.get('HUDScene')?.events.emit('weapon-start', POWERUP_SECS);
    this.playSound('sfx-wave-up', 0.7);

    // Burst of enemies so the weapon has targets immediately
    this.spawnVulcanBurst();
    // Restart spawner — activeWeapon is 'vulcan' so startEnemySpawner uses fast rate
    this.restartEnemySpawner();

    // Pickup flash
    if (this.anims.exists('explosion-2') && this.textures.exists('explosion-2-01')) {
      const exp = this.add.sprite(this.ship.x, this.ship.y, 'explosion-2-01').setDepth(8);
      exp.play('explosion-2');
      exp.once('animationcomplete', () => exp.destroy());
    }
  }

  private spawnVulcanBurst(): void {
    for (let i = 0; i < VULCAN_BURST; i++) {
      this.time.delayedCall(i * 380, () => {
        // Guard: don't spawn if weapon already expired or game ended
        if (!this.isDead && this.activeWeapon === 'vulcan') this.spawnEnemy();
      });
    }
  }

  // ─── Arsenal UI ───────────────────────────────────────────────────────────

  private buildArsenalBar(w: number, h: number): void {
    const barY   = h - ARSENAL_H;
    const border = this.arsenalAccentColor;
    const panel  = this.mode === 'alphabet' ? 0x0a1a3a : 0x1a0a00;

    const gfx = this.add.graphics().setDepth(99);
    gfx.fillStyle(panel, 0.88);
    gfx.fillRect(0, barY, w, ARSENAL_H);
    gfx.lineStyle(2, border, 0.70);
    gfx.lineBetween(0, barY, w, barY);

    this.add.text(w / 2, barY + 6, 'არსენალი', {
      fontSize: '11px', color: '#557799',
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial', letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(100);

    this.slotUIs = [];
    const MAX = 6;
    const slotW = 52, slotH = 52, gap = 8;
    const totalW = MAX * slotW + (MAX - 1) * gap;
    const startX = (w - totalW) / 2;
    const slotY  = barY + 22;

    for (let i = 0; i < MAX; i++) {
      const cx   = startX + i * (slotW + gap) + slotW / 2;
      const glow = this.add.graphics().setDepth(99.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      const bg   = this.add.graphics().setDepth(100);
      const charText = this.add.text(cx, slotY + slotH / 2 - 8, '', {
        fontSize: '26px', color: '#ffffff',
        fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
      }).setOrigin(0.5).setDepth(101);
      const latinText = this.add.text(cx, slotY + slotH - 9, '', {
        fontSize: '10px', color: '#aabbff', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(101);
      const zone = this.add.zone(cx, slotY + slotH / 2, slotW, slotH)
        .setInteractive().setDepth(102);
      const ci = i;
      zone.on('pointerdown', () => this.onArsenalTap(ci));
      this.slotUIs.push({ bg, glow, charText, latinText, zone, cx, slotY, slotW, slotH, idleTween: null });
    }
    this.refreshArsenalUI();
  }

  private refreshArsenalUI(): void {
    const maxActive  = waveCfg(this.wave).slots;
    const accent     = this.arsenalAccentColor;
    const activeBase = this.mode === 'alphabet' ? 0x1a3a7a : 0x4a2200;
    const glowColor  = this.mode === 'alphabet' ? 0x2266ff : 0xff8800;

    for (let i = 0; i < this.slotUIs.length; i++) {
      const ui   = this.slotUIs[i];
      const item = this.arsenal[i];
      const on   = i < maxActive;
      const { bg, glow, charText, latinText, cx, slotY, slotW, slotH } = ui;

      bg.clear();
      glow.clear();

      if (!on) {
        // ── Locked — clearly unavailable ──────────────────────────────────
        ui.idleTween?.stop(); ui.idleTween = null;
        glow.setAlpha(0);
        bg.fillStyle(0x000000, 0.55);
        bg.fillRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        bg.lineStyle(1, 0x1a1a1a, 0.30);
        bg.strokeRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        charText.setText('·').setAlpha(0.20).setStyle({ fontSize: '20px', color: '#445566' });
        latinText.setText('');

      } else if (item) {
        // ── Active + filled — vivid, glowing ──────────────────────────────
        ui.idleTween?.stop(); ui.idleTween = null;
        glow.lineStyle(6, glowColor, 0.55);
        glow.strokeRoundedRect(cx - slotW / 2 - 3, slotY - 3, slotW + 6, slotH + 6, 10);
        glow.setAlpha(0.35);
        bg.fillStyle(activeBase, 1);
        bg.fillRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        bg.lineStyle(2, accent + 0x222222, 1);
        bg.strokeRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        charText.setText(this.mode === 'numbers' ? item.display : item.char)
          .setAlpha(1).setStyle({ fontSize: '26px', color: '#ffffff' });
        latinText.setText(this.mode === 'numbers' ? item.char : item.latin).setAlpha(0.80);

      } else {
        // ── Active + empty — breathing / waiting ──────────────────────────
        bg.fillStyle(0x061428, 0.80);
        bg.fillRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        bg.lineStyle(1.5, 0x1155aa, 0.50);
        bg.strokeRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        glow.lineStyle(5, 0x00aaff, 1);
        glow.strokeRoundedRect(cx - slotW / 2 - 2, slotY - 2, slotW + 4, slotH + 4, 10);
        charText.setText('').setAlpha(1).setStyle({ fontSize: '26px', color: '#ffffff' });
        latinText.setText('');
        if (!ui.idleTween || !ui.idleTween.isPlaying()) {
          ui.idleTween?.stop();
          ui.idleTween = this.tweens.add({
            targets: glow, alpha: 0.20, duration: 1400,
            yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 120,
          }) as Phaser.Tweens.Tween;
        }
      }
    }
  }

  // ─── Arsenal slot animations ─────────────────────────────────────────────

  private animateSlotCollect(slotIndex: number): void {
    const ui = this.slotUIs[slotIndex];
    if (!ui) return;
    const { charText, bg, glow, cx, slotY, slotH } = ui;
    charText.setScale(0);
    this.tweens.add({
      targets: charText, scaleX: 1.35, scaleY: 1.35, duration: 120, ease: 'Back.Out',
      onComplete: () => this.tweens.add({ targets: charText, scaleX: 1, scaleY: 1, duration: 80 }),
    });
    this.tweens.add({
      targets: bg, alpha: 0.4, duration: 70, yoyo: true, repeat: 1,
      onComplete: () => bg.setAlpha(1),
    });
    this.tweens.add({
      targets: glow, alpha: 0.95, duration: 80,
      onComplete: () => this.tweens.add({ targets: glow, alpha: 0.35, duration: 200 }),
    });
    const cy = slotY + slotH / 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist  = Phaser.Math.Between(14, 32);
      const p = this.add.image(cx, cy, 'particle').setDepth(103).setScale(0.5);
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
        alpha: 0, scale: 0.2, duration: Phaser.Math.Between(220, 380),
        onComplete: () => p.destroy(),
      });
    }
  }

  private animateSlotFire(slotIndex: number): void {
    const ui = this.slotUIs[slotIndex];
    if (!ui) return;
    const { charText, glow } = ui;
    charText.setTint(0xffffff);
    this.tweens.add({
      targets: charText, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 160, ease: 'Cubic.In',
      onComplete: () => { charText.clearTint(); charText.setScale(1).setAlpha(1); },
    });
    this.tweens.add({
      targets: glow, alpha: 0.9, duration: 60,
      onComplete: () => this.tweens.add({ targets: glow, alpha: 0, duration: 150 }),
    });
  }

  private animateArsenalFullCascade(): void {
    const maxSlots = waveCfg(this.wave).slots;
    for (let i = 0; i < maxSlots; i++) {
      const ui = this.slotUIs[i];
      if (!ui) continue;
      const { glow, charText } = ui;
      this.time.delayedCall(i * 70, () => {
        this.tweens.add({
          targets: glow, alpha: 0.9, duration: 130,
          onComplete: () => this.tweens.add({ targets: glow, alpha: 0.35, duration: 220 }),
        });
        this.tweens.add({
          targets: charText, scaleX: 1.25, scaleY: 1.25, duration: 140, ease: 'Back.Out',
          onComplete: () => this.tweens.add({ targets: charText, scaleX: 1, scaleY: 1, duration: 100 }),
        });
      });
    }
    const allBgs = this.slotUIs.slice(0, maxSlots).map(u => u.bg);
    this.time.delayedCall(maxSlots * 70 + 220, () => {
      this.tweens.add({
        targets: allBgs, alpha: 0.45, duration: 120, yoyo: true, repeat: 2,
        onComplete: () => allBgs.forEach(b => b.setAlpha(1)),
      });
    });
  }

  // ─── Dataset helpers ──────────────────────────────────────────────────────

  private availableItems(): ItemData[] {
    const maxTier     = this.wave < 4 ? 1 : this.wave < 7 ? 2 : 3;
    const tierFiltered = this.dataset.filter(l => l.tier <= maxTier);

    if (this.game.registry.get('isPremium')) return tierFiltered;

    // Free tier: letters → first 12 by position; numbers → tier 1 (1-10) only
    if (this.mode === 'alphabet') {
      const freeChars = new Set(LETTERS.slice(0, FREE_LETTER_COUNT).map(l => l.char));
      const result    = tierFiltered.filter(l => freeChars.has(l.char));
      return result.length > 0 ? result : LETTERS.slice(0, FREE_LETTER_COUNT);
    } else {
      const result = tierFiltered.filter(l => l.tier === 1);
      return result.length > 0 ? result : NUMBERS.filter(l => l.tier === 1);
    }
  }

  private pickRandomItem(): ItemData {
    const pool    = this.availableItems();
    const weights = pool.map(l => 1 + (this.mistakeWeights.get(l.char) ?? 0) * 2);
    const total   = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  // ─── Parallax / background ────────────────────────────────────────────────

  private drawBackground(w: number, h: number): void {
    const bgKey = `bg-${this.mode}`;
    if (this.textures.exists(bgKey)) {
      const bgSrc  = this.textures.get(bgKey).getSourceImage() as HTMLImageElement;
      const bgScale = Math.max(w / bgSrc.width, h / bgSrc.height);
      this.background = this.add.image(w / 2, h / 2, bgKey).setScale(bgScale).setDepth(0);
    } else {
      this.background = this.add.tileSprite(0, 0, w, h, 'stars').setOrigin(0, 0).setDepth(0);
    }
    const sfKey = this.mode === 'alphabet' ? 'starfield-01' : 'starfield-02';
    if (this.textures.exists(sfKey)) {
      this.starfieldLayer = this.add.tileSprite(w / 2, h / 2, w, h, sfKey).setAlpha(0.25).setDepth(1);
    }
    const nKey = this.mode === 'alphabet' ? 'nebula-blue-02' : 'nebula-green-03';
    if (this.textures.exists(nKey)) {
      this.nebulaLayer = this.add.tileSprite(w / 2, h / 2, w, h, nKey).setAlpha(0.28).setDepth(1);
    }
    this.flybyPlanets = [];
    // Base scales — each planet gets a sinusoidal offset so they're naturally varied
    const cfg: [string, number, number, number, number, number][] = [
      ['kp-planet-02', 0.10, 0.10, 0.018, 0.35, 0.28],
      ['kp-planet-06', 0.82, 0.40, 0.020, 0.45, 0.26],
      ['kp-planet-04', 0.30, 0.65, 0.030, 0.70, 0.30],
      ['kp-planet-08', 0.68, 0.25, 0.022, 0.90, 0.32],
      ['kp-planet-01', 0.90, 0.60, 0.019, 0.55, 0.26],
      ['kp-planet-07', 0.20, 0.05, 0.034, 1.20, 0.34],
      ['kp-planet-00', 0.50, 0.80, 0.015, 0.30, 0.22],
      ['kp-planet-03', 0.75, 0.70, 0.016, 0.42, 0.24],
      ['kp-planet-05', 0.40, 0.30, 0.017, 0.38, 0.20],
      ['kp-planet-09', 0.15, 0.45, 0.017, 0.50, 0.25],
    ];
    // Spread planets across different phases of a sine wave so sizes vary naturally
    const phaseStep = (Math.PI * 2) / cfg.length;
    cfg.forEach(([key, xp, yp, baseScale, speed, alpha], i) => {
      if (!this.textures.exists(key)) return;
      const sineFactor = (Math.sin(i * phaseStep) + 1) * 0.5;   // 0..1
      const jitter     = (Math.random() - 0.5) * 0.3;
      const scale      = Phaser.Math.Clamp(baseScale * (0.7 + sineFactor * 0.9 + jitter), baseScale * 0.55, baseScale * 1.8);
      this.flybyPlanets.push({ img: this.add.image(w * xp, h * yp, key).setScale(scale).setAlpha(alpha).setDepth(2), speed });
    });
  }

  private swapParallaxLayers(): void {
    const { width: w, height: h } = this.scale;
    const nKey  = this.mode === 'alphabet' ? (this.wave >= 7 ? 'nebula-purple-04' : 'nebula-blue-02')  : (this.wave >= 7 ? 'nebula-green-06' : 'nebula-green-03');
    const sfKey = this.mode === 'alphabet' ? (this.wave >= 7 ? 'starfield-05'     : 'starfield-03')    : (this.wave >= 7 ? 'starfield-06'    : 'starfield-04');
    if (this.starfieldLayer && this.textures.exists(sfKey)) this.starfieldLayer.setTexture(sfKey);
    if (this.nebulaLayer) {
      const l = this.nebulaLayer;
      this.tweens.add({ targets: l, alpha: 0, duration: 300, onComplete: () => {
        if (this.textures.exists(nKey)) l.setTexture(nKey);
        this.tweens.add({ targets: l, alpha: 0.35, duration: 400 });
      }});
    } else if (this.textures.exists(nKey)) {
      this.nebulaLayer = this.add.tileSprite(w / 2, h / 2, w, h, nKey).setAlpha(0).setDepth(1);
      this.tweens.add({ targets: this.nebulaLayer, alpha: 0.35, duration: 400 });
    }
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────

  private syncHUD(): void {
    const hud = this.scene.get('HUDScene');
    if (!hud) return;
    hud.events.emit('score-update', this.score);
    hud.events.emit('lives-update', this.lives);
    hud.events.emit('wave-update',  this.wave);
  }

  // ─── Collision checks ─────────────────────────────────────────────────────

  private checkShipBossCollision(): void {
    if (!this.boss || this.bossRetreating) return;
    // Collision radius scales with boss size so bigger bosses feel bigger
    const radius = (CRASH_DIST + 12) * waveCfg(this.wave).bossScale;
    if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, this.boss.sprite.x, this.boss.sprite.y) > radius) return;
    const now = this.time.now;
    if (now - this.lastBossContactTime < 1200) return; // 1.2s contact cooldown
    this.lastBossContactTime = now;
    this.flashBossImmune();
    this.takeDamage();
    this.playSound('sfx-explosion', 0.55);
  }

  private checkBulletEnemyCollisions(): void {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (b.type !== 'plasma' || b.tweenDriven) continue;
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (Phaser.Math.Distance.Between(b.img.x, b.img.y, e.sprite.x, e.sprite.y) < 32) {
          this.killEnemy(ei);
          b.img.destroy();
          this.bullets.splice(bi, 1);
          break;
        }
      }
    }
  }

  private checkShipEnemyCollisions(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, e.sprite.x, e.sprite.y) < CRASH_DIST) {
        const mx = (this.ship.x + e.sprite.x) / 2;
        const my = (this.ship.y + e.sprite.y) / 2;
        this.burstParticles(mx, my, 12);
        const lbl = e.sprite.getData('label') as Phaser.GameObjects.Text | undefined;
        lbl?.destroy();
        this.playEnemyExplosion(e.type, e.sprite.x, e.sprite.y);
        if (e.type === 'green'  && e.item) this.spawnToken(e.sprite.x, e.sprite.y, e.item, false);
        if (e.type === 'purple' && e.item) this.spawnToken(e.sprite.x, e.sprite.y, e.item, false);
        if (e.type === 'blue'   && e.item) this.spawnToken(e.sprite.x, e.sprite.y, e.item, true);
        e.sprite.destroy();
        this.enemies.splice(i, 1);
        this.playSound('sfx-explosion', 0.65);
        this.takeDamage();
      }
    }
  }

  private checkTokenCollection(): void {
    const { height } = this.scale;
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const tok = this.tokens[i];
      if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, tok.sprite.x, tok.sprite.y) < 44) {
        this.collectToken(i);
      } else if (tok.sprite.y > height + 40) {
        tok.sprite.destroy(); tok.charText.destroy(); this.tokens.splice(i, 1);
      }
    }
  }

  private checkEnemiesReachedBottom(): void {
    const limit = this.scale.height - ARSENAL_H + 20;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].sprite.y > limit) {
        const lbl = this.enemies[i].sprite.getData('label') as Phaser.GameObjects.Text | undefined;
        lbl?.destroy();
        this.enemies[i].sprite.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  // ─── Enemy kill ───────────────────────────────────────────────────────────

  private playEnemyExplosion(type: EnemyObj['type'], x: number, y: number): void {
    const map: Record<EnemyObj['type'], { anim: string; tex: string; scale: number }> = {
      green:  { anim: 'expl-enemy-warped', tex: 'enemy-death-warped', scale: 1.1 },
      blue:   { anim: 'expl-enemy-death',  tex: 'enemy-death-fx',     scale: 1.1 },
      purple: { anim: 'expl-b',            tex: 'expl-b',             scale: 1.2 },
      ship:   { anim: 'expl-g',            tex: 'expl-g',             scale: 1.3 },
      red:    { anim: 'explosion-1',       tex: 'explosion-1-01',     scale: 1.1 },
    };
    const { anim, tex, scale } = map[type];
    if (this.anims.exists(anim) && this.textures.exists(tex)) {
      const exp = this.add.sprite(x, y, tex).setDepth(7).setScale(scale);
      exp.play(anim); exp.once('animationcomplete', () => exp.destroy());
    } else {
      this.burstParticles(x, y);
    }
  }

  private killEnemy(idx: number): void {
    const e = this.enemies[idx];
    const ex = e.sprite.x, ey = e.sprite.y;
    const lbl = e.sprite.getData('label') as Phaser.GameObjects.Text | undefined;
    lbl?.destroy();

    this.playEnemyExplosion(e.type, ex, ey);

    if (e.type === 'green'  && e.item) { this.spawnToken(ex, ey, e.item, false); this.greensSinceBoss++; }
    if (e.type === 'purple' && e.item) { this.spawnToken(ex, ey, e.item, false); this.greensSinceBoss++; }
    if (e.type === 'blue'   && e.item) this.spawnToken(ex, ey, e.item, true);

    e.sprite.destroy();
    this.enemies.splice(idx, 1);

    this.score += 5 * this.wave;
    this.killCount++;
    this.killsSinceBoss++;
    this.scene.get('HUDScene')?.events.emit('score-update', this.score);
    this.playSound('sfx-explosion', 0.5);

    // Wave advance
    if (this.killCount % KILL_PER_WAVE === 0) {
      this.wave++;
      this.scene.get('HUDScene')?.events.emit('wave-update', this.wave);
      this.showWaveBanner();
      if (this.wave === 4 || this.wave === 7) this.swapParallaxLayers();
      if (this.wave === 7) this.crossfadeMusic('music-orbital');
      this.refreshArsenalUI();
      this.restartEnemySpawner(); // apply new spawnMs
    }

    // Boss trigger — one boss per wave; short kill-cooldown prevents instant re-trigger
    const bossReady  = this.killsSinceBoss >= BOSS_EVERY && !this.boss && !this.bossScheduled
                       && this.wave > this.lastBossWave
                       && (this.time.now - this.lastBossKillTime >= BOSS_KILL_COOLDOWN);
    if (bossReady) {
      this.killsSinceBoss = 0;
      this.bossScheduled  = true;
      const needed = Math.max(0, waveCfg(this.wave).bossReq - this.greensSinceBoss);
      if (needed > 0) {
        this.spawnGuaranteedGreens(needed);
      } else {
        this.time.delayedCall(1500, () => { if (!this.isDead) this.spawnBoss(); });
      }
    }
  }

  // ─── Damage ───────────────────────────────────────────────────────────────

  private takeDamage(): void {
    if (this.isDead) return;
    this.lives = Math.max(0, this.lives - 1);
    this.cameras.main.shake(280, 0.013);
    this.playSound('sfx-damage', 0.75);
    this.scene.get('HUDScene')?.events.emit('lives-update', this.lives);
    this.tweens.add({
      targets: this.ship, alpha: 0.15, duration: 80,
      yoyo: true, repeat: 4,
      onComplete: () => this.ship?.setAlpha(1),
    });
    if (this.lives <= 0) { this.isDead = true; this.time.delayedCall(500, () => this.endGame()); }
  }

  // ─── Particles ────────────────────────────────────────────────────────────

  private burstParticles(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist  = Phaser.Math.Between(28, 70);
      const p     = this.add.image(x, y, 'particle').setDepth(8);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
        alpha: 0, scale: 0.3,
        duration: Phaser.Math.Between(280, 550),
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─── Arsenal ready banner ────────────────────────────────────────────────

  private checkArsenalReady(): void {
    if (this.arsenal.length < waveCfg(this.wave).slots) return;
    this.animateArsenalFullCascade();
    this.playSound('sfx-arsenal-full', 0.6);
    this.time.delayedCall(300, () => this.playSound('voice-arsenal-full', 1.3));
    if (!this.arsenalReadyShown) {
      this.arsenalReadyShown = true;
      this.showArsenalReadyBanner();
    }
  }

  private showArsenalReadyBanner(): void {
    const { width, height } = this.scale;
    const line1 = this.add.text(width / 2, height / 2 - 34, 'არსენალი სავსეა!', {
      fontSize: '36px', color: '#00ffcc',
      stroke: '#000000', strokeThickness: 5,
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(90);
    // Auto-scale if wider than 90% of screen
    if (line1.width > width * 0.9) line1.setScale((width * 0.9) / line1.width);

    const boss2txt = this.mode === 'alphabet'
      ? 'მთავარ ბოროტებას მხოლოდ ასო-ბგერები კლავს'
      : 'მთავარ ბოროტებას მხოლოდ ციფრები კლავს';
    const line2 = this.add.text(width / 2, height / 2 + 16, boss2txt, {
      fontSize: '15px', color: '#aaffee',
      stroke: '#000000', strokeThickness: 3,
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
      align: 'center', wordWrap: { width: width * 0.88 },
    }).setOrigin(0.5).setAlpha(0).setDepth(90);
    this.tweens.add({ targets: [line1, line2], alpha: 1, duration: 300, yoyo: true, hold: 1600, onComplete: () => { line1.destroy(); line2.destroy(); } });
  }

  // ─── Wave banner ─────────────────────────────────────────────────────────

  private showWaveBanner(): void {
    const { width, height } = this.scale;
    const txt = this.add.text(width / 2, height / 2 - 60, `ტალღა ${this.wave}!`, {
      fontSize: '58px', color: '#ffdd00',
      stroke: '#000000', strokeThickness: 6,
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
    }).setOrigin(0.5).setAlpha(0).setDepth(90);
    if (txt.width > width * 0.88) txt.setScale((width * 0.88) / txt.width);
    this.tweens.add({ targets: txt, alpha: 1, duration: 250, yoyo: true, hold: 900, onComplete: () => txt.destroy() });
  }

  // ─── Game over ────────────────────────────────────────────────────────────

  private endGame(): void {
    this.enemySpawnTimer?.remove();
    this.bossRetreatTimer?.remove();
    this.bossBulletTimer?.remove();
    this.weaponTimer?.remove();
    this.scene.stop('HUDScene');
    this.scene.start('GameOverScene', { score: this.score, wave: this.wave, mode: this.mode });
  }

  // ─── Audio ────────────────────────────────────────────────────────────────

  private playSound(key: string, volume = 0.75): void {
    if (this.cache.audio.has(key)) this.sound.play(key, { volume });
  }
  private playMusic(key: string): void {
    if (!this.cache.audio.has(key)) return;
    if (this.sound.get(key)) return; // already looping (e.g. returned from menu)
    const muted = !!this.game.registry.get('musicMuted');
    this.sound.play(key, { loop: true, volume: muted ? 0 : 0.25 });
  }

  private crossfadeMusic(toKey: string, durationMs = 2000): void {
    if (!this.cache.audio.has(toKey)) return;
    if (this.sound.get(toKey)) return; // already playing
    const muted = !!this.game.registry.get('musicMuted');
    const targetVol = muted ? 0 : 0.25;

    // Fade out all currently playing music tracks
    const mgr = this.sound as unknown as { sounds: Phaser.Sound.BaseSound[] };
    for (const s of mgr.sounds ?? []) {
      if (s.key === 'music-game' || s.key === 'music-orbital') {
        this.tweens.add({ targets: s, volume: 0, duration: durationMs,
          onComplete: () => s.stop() });
      }
    }

    // Start new track silently then fade in
    this.sound.play(toKey, { loop: true, volume: 0 });
    const incoming = this.sound.get(toKey) as any;
    if (incoming) this.tweens.add({ targets: incoming, volume: targetVol, duration: durationMs });
  }

  // ─── Update loop ──────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.isDead) return;
    const factor = delta / 16.67;

    // Hold to fire
    const ptr = this.input.activePointer;
    if (ptr.isDown && ptr.y < this.scale.height - ARSENAL_H) this.fireBullet();

    // Ship lerp
    this.ship.x += (this.shipTargetX - this.ship.x) * SHIP_LERP;
    this.ship.y += (this.shipTargetY - this.ship.y) * SHIP_LERP;
    this.updateShipBanking();

    // Weapon timer → emit remaining seconds for HUD bar
    if (this.weaponBarActive) {
      const rem = Math.max(0, (this.weaponEndTime - this.time.now) / 1000);
      this.scene.get('HUDScene')?.events.emit('weapon-tick', rem, POWERUP_SECS);
    }

    // Bullet movement
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.type === 'plasma' && !b.tweenDriven) {
        const angle = (b.img as Phaser.GameObjects.Image).rotation;
        b.img.x += Math.sin(angle)  * PLASMA_SPEED * (delta / 1000);
        b.img.y -= Math.cos(angle)  * PLASMA_SPEED * (delta / 1000);
        if (b.img.y < -40 || b.img.x < -40 || b.img.x > this.scale.width + 40) {
          b.img.destroy(); this.bullets.splice(i, 1);
        }
      } else if (b.type === 'boss' && !b.tweenDriven) {
        b.img.x += (b.img.getData('vx') as number) * (delta / 1000);
        b.img.y += (b.img.getData('vy') as number) * (delta / 1000);
        if (b.img.y > this.scale.height + 40 || b.img.x < -40 || b.img.x > this.scale.width + 40) {
          b.img.destroy(); this.bullets.splice(i, 1);
        }
      }
    }

    // Enemies
    for (const e of this.enemies) {
      e.sprite.y += e.velY * (delta / 1000);
      if (e.wobbleAmp > 0) {
        e.wobblePhase += 0.045 * factor;
        e.sprite.x = e.baseX + Math.sin(e.wobblePhase) * e.wobbleAmp;
        if (e.type === 'blue' && this.textures.exists('enemy-blue-l1')) {
          const cosV = Math.cos(e.wobblePhase);
          const bk = cosV < -0.6 ? 'enemy-blue-l2' : cosV < -0.2 ? 'enemy-blue-l1'
                   : cosV >  0.6 ? 'enemy-blue-r2'  : cosV >  0.2 ? 'enemy-blue-r1'
                   :                'enemy-blue-m';
          e.sprite.setTexture(bk);
        }
      }
      const lbl = e.sprite.getData('label') as Phaser.GameObjects.Text | undefined;
      if (lbl) lbl.setPosition(e.sprite.x, e.sprite.y + e.sprite.displayHeight * 0.58);
    }

    // Boss labels track boss horizontal drift
    if (this.boss) {
      if (this.bossRageLabel)  this.bossRageLabel.setPosition(this.boss.sprite.x, this.boss.sprite.y - 58);
      if (this.bossHintLabel)  this.bossHintLabel.setPosition(this.boss.sprite.x, this.boss.sprite.y + 78);
    }

    // Parallax
    if (this.background instanceof Phaser.GameObjects.TileSprite) this.background.tilePositionY -= 1.5;
    if (this.starfieldLayer) this.starfieldLayer.tilePositionY -= 1.2;
    if (this.nebulaLayer)    this.nebulaLayer.tilePositionY    -= 0.4;

    const resetY = this.scale.height - ARSENAL_H - 20;
    for (const p of this.flybyPlanets) {
      p.img.y += p.speed * factor;
      if (p.img.y > resetY) p.img.y = -60;
    }

    // Tokens fall at constant speed
    for (const tok of this.tokens) {
      tok.sprite.y  += TOKEN_FALL_SPEED * (delta / 1000);
      tok.charText.setPosition(tok.sprite.x, tok.sprite.y + 28);
    }

    // Collision passes
    this.checkBulletEnemyCollisions();
    this.checkShipEnemyCollisions();
    this.checkShipBossCollision();
    this.checkBossBulletCollisions();
    this.checkTokenCollection();
    this.checkEnemiesReachedBottom();
  }
}

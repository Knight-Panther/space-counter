import * as Phaser from 'phaser';
import { LETTERS } from '../data/letters';
import { NUMBERS } from '../data/numbers';
import { GameMode, ItemData } from '../data/types';

// ─── Wave configuration ───────────────────────────────────────────────────────

interface WaveCfg {
  slots:       number;   // max arsenal slots
  bossReq:     number;   // items boss demands
  spawnMs:     number;   // ms between enemy spawns
  greenPct:    number;   // 0-1 fraction of enemies that are green carriers
  bluePct:     number;   // 0-1 fraction that are blue (weapon-drop)
  enemySpeed:  number;   // px/s base descent
  bossTier:    'b' | 'g' | 'r';   // blue / green / red boss sprite
  bossScale:   number;
}

const WAVES: WaveCfg[] = [
  { slots: 3, bossReq: 1, spawnMs: 3800, greenPct: 0.25, bluePct: 0.05, enemySpeed:  75, bossTier: 'b', bossScale: 1.0 },
  { slots: 3, bossReq: 1, spawnMs: 3400, greenPct: 0.28, bluePct: 0.07, enemySpeed:  85, bossTier: 'b', bossScale: 1.0 },
  { slots: 3, bossReq: 1, spawnMs: 3100, greenPct: 0.30, bluePct: 0.09, enemySpeed:  95, bossTier: 'b', bossScale: 1.0 },
  { slots: 4, bossReq: 2, spawnMs: 2800, greenPct: 0.32, bluePct: 0.10, enemySpeed: 105, bossTier: 'g', bossScale: 1.3 },
  { slots: 4, bossReq: 2, spawnMs: 2600, greenPct: 0.35, bluePct: 0.11, enemySpeed: 115, bossTier: 'g', bossScale: 1.3 },
  { slots: 4, bossReq: 2, spawnMs: 2300, greenPct: 0.38, bluePct: 0.13, enemySpeed: 125, bossTier: 'g', bossScale: 1.3 },
  { slots: 5, bossReq: 3, spawnMs: 2000, greenPct: 0.42, bluePct: 0.14, enemySpeed: 140, bossTier: 'r', bossScale: 1.6 },
  { slots: 5, bossReq: 3, spawnMs: 1800, greenPct: 0.46, bluePct: 0.16, enemySpeed: 155, bossTier: 'r', bossScale: 1.6 },
  { slots: 6, bossReq: 3, spawnMs: 1600, greenPct: 0.50, bluePct: 0.17, enemySpeed: 170, bossTier: 'r', bossScale: 1.6 },
  { slots: 6, bossReq: 3, spawnMs: 1400, greenPct: 0.55, bluePct: 0.19, enemySpeed: 185, bossTier: 'r', bossScale: 1.8 },
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
const BOSS_MIN_GAP_BASE = 40000; // ms cooldown between boss encounters; shrinks by 3 s per wave, floors at 20 s

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface EnemyObj {
  sprite:      Phaser.GameObjects.Sprite;
  type:        'red' | 'green' | 'blue';
  velY:        number;
  wobblePhase: number;
  wobbleAmp:   number;
  baseX:       number;
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
  charText:  Phaser.GameObjects.Text;
  latinText: Phaser.GameObjects.Text;
  zone:      Phaser.GameObjects.Zone;
  cx:        number;
  slotY:     number;
  slotW:     number;
  slotH:     number;
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
  private bossRetreating  = false;
  private bossRequired:   ItemData[] = [];  // items boss demands (multi)
  private bossRemaining:  ItemData[] = [];  // items still needed to kill boss
  private bossHintLabel:  Phaser.GameObjects.Text | null = null;
  private bossRageLabel:  Phaser.GameObjects.Text | null = null;
  private bossRage        = 0;   // increments each time boss retreats unkilled; resets on kill
  private bossBulletTimer: Phaser.Time.TimerEvent | null = null;

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
    this.arsenalReadyShown   = false;
    this.activeWeapon   = 'plasma';
    this.weaponEndTime  = 0;
    this.weaponBarActive = false;
    this.bullets  = [];
    this.enemies  = [];
    this.tokens   = [];
    this.arsenal  = [];
    this.boss     = null;
    this.bossRetreating  = false;
    this.bossRequired    = [];
    this.bossRemaining   = [];
    this.bossHintLabel   = null;
    this.bossRageLabel   = null;
    this.bossRage        = 0;
    this.bossBulletTimer = null;
    this.mistakeWeights.clear();
    this.arsenalAccentColor = this.mode === 'alphabet' ? 0x3355aa : 0x884400;
  }

  create(): void {
    const { width, height } = this.scale;
    this.sound.stopAll();
    this.playMusic(`music-${this.mode}`);
    this.drawBackground(width, height);
    this.spawnShip(width, height);
    this.buildArsenalBar(width, height);
    this.scene.launch('HUDScene', { mode: this.mode });
    this.time.delayedCall(120, () => this.syncHUD());
    this.setupInput(width, height);
    this.startEnemySpawner();
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
    this.playSound('sfx-laser', 0.18);
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
    this.playSound('sfx-laser', 0.22);
  }

  // ─── Arsenal tap → proton shot at boss ────────────────────────────────────

  private onArsenalTap(slotIndex: number): void {
    if (!this.boss || this.bossRetreating) return;
    if (this.bossRequired.length === 0) return;  // boss unkillable — arsenal was empty at spawn
    const item = this.arsenal[slotIndex];
    if (!item) return;
    this.arsenal.splice(slotIndex, 1);
    this.refreshArsenalUI();
    this.fireProton(item);
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
        // Replay hint for remaining items
        this.time.delayedCall(400, () => this.playBossHint());
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
    let type: 'red' | 'green' | 'blue';
    if (forceType) {
      type = forceType;
    } else {
      const roll = Math.random();
      if (roll < cfg.bluePct)                      type = 'blue';
      else if (roll < cfg.bluePct + cfg.greenPct)  type = 'green';
      else                                          type = 'red';
    }

    // Arsenal full and no boss incoming → carrying more letters is pointless, spawn reds
    if (type === 'green' && !forceType) {
      const full = this.arsenal.length >= waveCfg(this.wave).slots;
      if (full && !this.bossScheduled && !this.boss) type = 'red';
    }

    const texKey = type === 'blue'  ? 'enemy-blue-m'
                 : type === 'green' ? 'enemy-green'
                 :                   'enemy-red';
    const fallback = this.textures.exists(texKey) ? texKey : 'particle';
    const x = Phaser.Math.Between(48, width - 48);
    const sprite = this.add.sprite(x, -60, fallback).setDepth(5);
    this.playSound('sfx-alien-appear', 0.3);

    const item = (type === 'green' || type === 'blue') ? this.pickRandomItem() : undefined;

    // Show carried item label on green enemies
    if (type === 'green' && item) {
      const lbl = this.add.text(x, -60 + 36, item.display, {
        fontSize: '17px', color: '#ffff00',
        stroke: '#000000', strokeThickness: 3,
        fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
      }).setOrigin(0.5).setDepth(6);
      sprite.setData('label', lbl);
    }

    this.enemies.push({
      sprite, type, item,
      velY: cfg.enemySpeed,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp:   type === 'green' ? 38 : type === 'blue' ? 22 : 0,
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
    const tier = cfg.bossTier;
    const key = this.textures.exists(`enemy-boss-${tier}-m`) ? `enemy-boss-${tier}-m` : 'particle';
    const bossSprite = this.add.sprite(width / 2, -90, key)
      .setDepth(5).setScale(cfg.bossScale);

    this.greensSinceBoss = 0;
    this.bossScheduled   = false;

    // Pick required items only from what the player already collected
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

    // Enter animation
    this.tweens.add({
      targets: bossSprite, y: 110, duration: 1200, ease: 'Back.Out',
      onComplete: () => {
        if (!this.boss) return;
        this.applyRageTint();
        this.createBossRageLabel();
        this.playBossHint();
        this.createBossHintLabel();
        if (this.totalBossRage > 0) this.startBossBulletTimer();
        // Pulse glow
        this.tweens.add({
          targets: bossSprite, alpha: 0.6, duration: 700,
          yoyo: true, repeat: -1,
        });
        // Slow horizontal drift
        this.tweens.add({
          targets: bossSprite, x: bossSprite.x + 50, duration: 2400,
          yoyo: true, repeat: -1, ease: 'Sine.InOut',
        });
      },
    });

    this.bossRetreatTimer = this.time.delayedCall(BOSS_TIMEOUT, () => this.retreatBoss());
  }

  private retreatBoss(): void {
    if (!this.boss || this.bossRetreating) return;
    this.bossRetreating  = true;
    this.bossScheduled   = false;
    this.bossRage++;
    this.bossBulletTimer?.remove(); this.bossBulletTimer = null;
    this.destroyBossLabels();
    this.tweens.killTweensOf(this.boss.sprite);
    this.tweens.add({
      targets: this.boss.sprite, y: -150, alpha: 0, duration: 900,
      onComplete: () => { this.boss?.sprite.destroy(); this.boss = null; this.bossRetreating = false; },
    });
  }

  private killBoss(): void {
    if (!this.boss) return;
    this.bossRetreatTimer?.remove(); this.bossRetreatTimer = null;
    this.bossBulletTimer?.remove();  this.bossBulletTimer = null;
    this.bossRage         = 0;
    this.bossScheduled    = false;
    this.lastBossKillTime = this.time.now;
    this.tweens.killTweensOf(this.boss.sprite);
    this.destroyBossLabels();
    const bx = this.boss.sprite.x;
    const by = this.boss.sprite.y;
    this.boss.sprite.destroy();
    this.boss = null;
    this.bossRetreating = false;
    this.bossRequired  = [];
    this.bossRemaining = [];

    this.playBossExplosion(bx, by);
    this.playSound('sfx-explosion', 0.9);
    this.score += 50 * this.wave;
    this.scene.get('HUDScene')?.events.emit('score-update', this.score);

    // Brief spawn pause — reward moment
    this.enemySpawnTimer?.paused && (this.enemySpawnTimer.paused = false);
    this.enemySpawnTimer?.remove();
    this.time.delayedCall(2000, () => { if (!this.isDead) this.startEnemySpawner(); });
  }

  private playBossHint(): void {
    // Play audio for each remaining required item with a short gap
    this.bossRemaining.forEach((item, i) => {
      this.time.delayedCall(i * 900, () => {
        if (this.cache.audio.has(item.audioKey)) {
          this.sound.play(item.audioKey, { volume: 1.0 });
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

  private playBossExplosion(x: number, y: number): void {
    if (this.anims.exists('explosion-3') && this.textures.exists('explosion-3-01')) {
      const cfg = waveCfg(this.wave);
      const exp = this.add.sprite(x, y, 'explosion-3-01').setDepth(8).setScale(cfg.bossScale * 1.4);
      exp.play('explosion-3');
      exp.once('animationcomplete', () => exp.destroy());
    } else {
      this.burstParticles(x, y, 20);
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
    if (!this.boss || this.bossRetreating || this.isDead) return;
    const bx    = this.boss.sprite.x;
    const by    = this.boss.sprite.y + 20;
    const rage  = this.totalBossRage;
    const speed = 200 + (rage - 1) * 25;
    const count = rage >= 5 ? 3 : rage >= 3 ? 2 : 1;
    const baseAngle = Phaser.Math.Angle.Between(bx, by, this.ship.x, this.ship.y);
    const spread = Math.PI / 10;
    for (let i = 0; i < count; i++) {
      const angle = count === 1 ? baseAngle : baseAngle + (i - (count - 1) / 2) * spread;
      this.spawnBossBullet(bx, by, angle, speed);
    }
  }

  private spawnBossBullet(x: number, y: number, angle: number, speed: number): void {
    const key = this.textures.exists('bullet-plasma') ? 'bullet-plasma' : 'bullet';
    const img = this.add.image(x, y, key).setDepth(6).setScale(0.85).setTint(0xff4400);
    img.setRotation(angle + Math.PI);  // flip to point downward
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
      if (this.arsenal.length >= maxSlots) {
        // Never silently evict letters mid-boss — the player's loadout is locked
        if (this.boss) return;
        this.arsenal.shift();
      }
      this.arsenal.push(tok.item);
      this.refreshArsenalUI();
      this.playSound('sfx-wave-up', 0.4);
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

    this.add.text(w / 2, barY + 6, 'ARSENAL', {
      fontSize: '11px', color: '#557799', fontFamily: 'Arial', letterSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(100);

    this.slotUIs = [];
    const MAX = 6;
    const slotW = 52, slotH = 52, gap = 8;
    const totalW = MAX * slotW + (MAX - 1) * gap;
    const startX = (w - totalW) / 2;
    const slotY  = barY + 22;

    for (let i = 0; i < MAX; i++) {
      const cx = startX + i * (slotW + gap) + slotW / 2;
      const bg = this.add.graphics().setDepth(100);
      const charText = this.add.text(cx, slotY + slotH / 2 - 8, '', {
        fontSize: '24px', color: '#ffffff',
        fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
      }).setOrigin(0.5).setDepth(101);
      const latinText = this.add.text(cx, slotY + slotH - 9, '', {
        fontSize: '10px', color: '#aabbff', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(101);
      const zone = this.add.zone(cx, slotY + slotH / 2, slotW, slotH)
        .setInteractive().setDepth(102);
      const ci = i;
      zone.on('pointerdown', () => this.onArsenalTap(ci));
      this.slotUIs.push({ bg, charText, latinText, zone, cx, slotY, slotW, slotH });
    }
    this.refreshArsenalUI();
  }

  private refreshArsenalUI(): void {
    const maxActive = waveCfg(this.wave).slots;
    const accent    = this.arsenalAccentColor;
    const activeBase = this.mode === 'alphabet' ? 0x1a3a7a : 0x4a2200;

    for (let i = 0; i < this.slotUIs.length; i++) {
      const ui   = this.slotUIs[i];
      const item = this.arsenal[i];
      const on   = i < maxActive;
      const { bg, charText, latinText, cx, slotY, slotW, slotH } = ui;

      bg.clear();
      if (on) {
        bg.fillStyle(item ? activeBase : 0x0d1a2a, item ? 1 : 0.55);
        bg.fillRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        bg.lineStyle(1.5, item ? (accent + 0x111111) : 0x223344, item ? 0.9 : 0.4);
        bg.strokeRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
      } else {
        bg.fillStyle(0x000000, 0.15);
        bg.fillRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
        bg.lineStyle(1, 0x112233, 0.22);
        bg.strokeRoundedRect(cx - slotW / 2, slotY, slotW, slotH, 8);
      }

      if (item && on) {
        charText.setText(this.mode === 'numbers' ? item.display : item.char).setAlpha(1);
        latinText.setText(this.mode === 'numbers' ? item.char : item.latin).setAlpha(0.72);
      } else {
        charText.setText(''); latinText.setText('');
      }
    }
  }

  // ─── Dataset helpers ──────────────────────────────────────────────────────

  private availableItems(): ItemData[] {
    const maxTier = this.wave < 4 ? 1 : this.wave < 7 ? 2 : 3;
    return this.dataset.filter(l => l.tier <= maxTier);
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
      this.background = this.add.image(w / 2, h / 2, bgKey).setDisplaySize(w, h).setDepth(0);
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
    const cfg: [string, number, number, number, number, number][] = [
      ['kp-planet-02', 0.10, 0.10, 0.018, 0.35, 0.28],
      ['kp-planet-06', 0.82, 0.40, 0.020, 0.45, 0.26],
      ['kp-planet-04', 0.30, 0.65, 0.025, 0.70, 0.30],
      ['kp-planet-08', 0.68, 0.25, 0.022, 0.90, 0.32],
      ['kp-planet-01', 0.90, 0.60, 0.019, 0.55, 0.26],
      ['kp-planet-07', 0.20, 0.05, 0.028, 1.20, 0.34],
      ['kp-planet-00', 0.50, 0.80, 0.015, 0.30, 0.22],
      ['kp-planet-03', 0.75, 0.70, 0.016, 0.42, 0.24],
      ['kp-planet-05', 0.40, 0.30, 0.014, 0.38, 0.20],
      ['kp-planet-09', 0.15, 0.45, 0.017, 0.50, 0.25],
    ];
    for (const [key, xp, yp, scale, speed, alpha] of cfg) {
      if (!this.textures.exists(key)) continue;
      this.flybyPlanets.push({ img: this.add.image(w * xp, h * yp, key).setScale(scale).setAlpha(alpha).setDepth(2), speed });
    }
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
        if (this.anims.exists('explosion-1') && this.textures.exists('explosion-1-01')) {
          const exp = this.add.sprite(e.sprite.x, e.sprite.y, 'explosion-1-01').setDepth(7);
          exp.play('explosion-1'); exp.once('animationcomplete', () => exp.destroy());
        }
        if (e.type === 'green' && e.item) this.spawnToken(e.sprite.x, e.sprite.y, e.item, false);
        if (e.type === 'blue'  && e.item) this.spawnToken(e.sprite.x, e.sprite.y, e.item, true);
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

  private killEnemy(idx: number): void {
    const e = this.enemies[idx];
    const ex = e.sprite.x, ey = e.sprite.y;
    const lbl = e.sprite.getData('label') as Phaser.GameObjects.Text | undefined;
    lbl?.destroy();

    if (this.anims.exists('explosion-1') && this.textures.exists('explosion-1-01')) {
      const exp = this.add.sprite(ex, ey, 'explosion-1-01').setDepth(7).setScale(1.1);
      exp.play('explosion-1'); exp.once('animationcomplete', () => exp.destroy());
    } else { this.burstParticles(ex, ey); }

    if (e.type === 'green' && e.item) { this.spawnToken(ex, ey, e.item, false); this.greensSinceBoss++; }
    if (e.type === 'blue'  && e.item) this.spawnToken(ex, ey, e.item, true);

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
      this.playSound('sfx-wave-up');
      this.scene.get('HUDScene')?.events.emit('wave-update', this.wave);
      this.showWaveBanner();
      if (this.wave === 4 || this.wave === 7) this.swapParallaxLayers();
      this.refreshArsenalUI();
      this.restartEnemySpawner(); // apply new spawnMs
    }

    // Boss trigger — also enforce a per-wave cooldown after the last kill
    const minBossGap = Math.max(20000, BOSS_MIN_GAP_BASE - (this.wave - 1) * 3000);
    const bossReady  = this.killsSinceBoss >= BOSS_EVERY && !this.boss && !this.bossScheduled
                       && (this.time.now - this.lastBossKillTime >= minBossGap);
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
    if (this.arsenalReadyShown) return;
    if (this.arsenal.length < waveCfg(this.wave).slots) return;
    this.arsenalReadyShown = true;
    this.showArsenalReadyBanner();
  }

  private showArsenalReadyBanner(): void {
    const { width, height } = this.scale;
    const line1 = this.add.text(width / 2, height / 2 - 30, 'ARSENAL FULL!', {
      fontSize: '44px', color: '#00ffcc',
      stroke: '#000000', strokeThickness: 6, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(90);
    const line2 = this.add.text(width / 2, height / 2 + 24, 'Tap letters below to fire at the boss', {
      fontSize: '18px', color: '#aaffee',
      stroke: '#000000', strokeThickness: 4, fontFamily: 'Arial',
    }).setOrigin(0.5).setAlpha(0).setDepth(90);
    this.tweens.add({ targets: [line1, line2], alpha: 1, duration: 300, yoyo: true, hold: 1600, onComplete: () => { line1.destroy(); line2.destroy(); } });
  }

  // ─── Wave banner ─────────────────────────────────────────────────────────

  private showWaveBanner(): void {
    const { width, height } = this.scale;
    const txt = this.add.text(width / 2, height / 2 - 60, `Wave ${this.wave}!`, {
      fontSize: '58px', color: '#ffdd00',
      stroke: '#000000', strokeThickness: 6, fontFamily: 'Arial',
    }).setOrigin(0.5).setAlpha(0).setDepth(90);
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
    if (this.cache.audio.has(key)) this.sound.play(key, { loop: true, volume: 0.35 });
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
      if (lbl) lbl.setPosition(e.sprite.x, e.sprite.y + 34);
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

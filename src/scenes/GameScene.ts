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
  { slots: 3, bossReq: 1, spawnMs: 3500, greenPct: 0.20, bluePct: 0.05, enemySpeed:  80, bossTier: 'b', bossScale: 1.0 },
  { slots: 3, bossReq: 1, spawnMs: 3200, greenPct: 0.25, bluePct: 0.08, enemySpeed:  90, bossTier: 'b', bossScale: 1.0 },
  { slots: 3, bossReq: 1, spawnMs: 2800, greenPct: 0.30, bluePct: 0.10, enemySpeed: 100, bossTier: 'b', bossScale: 1.0 },
  { slots: 4, bossReq: 2, spawnMs: 2500, greenPct: 0.35, bluePct: 0.12, enemySpeed: 115, bossTier: 'g', bossScale: 1.3 },
  { slots: 4, bossReq: 2, spawnMs: 2200, greenPct: 0.40, bluePct: 0.12, enemySpeed: 130, bossTier: 'g', bossScale: 1.3 },
  { slots: 4, bossReq: 2, spawnMs: 2000, greenPct: 0.45, bluePct: 0.15, enemySpeed: 145, bossTier: 'g', bossScale: 1.3 },
  { slots: 5, bossReq: 3, spawnMs: 1800, greenPct: 0.50, bluePct: 0.15, enemySpeed: 160, bossTier: 'r', bossScale: 1.6 },
  { slots: 5, bossReq: 3, spawnMs: 1600, greenPct: 0.55, bluePct: 0.18, enemySpeed: 175, bossTier: 'r', bossScale: 1.6 },
  { slots: 6, bossReq: 3, spawnMs: 1400, greenPct: 0.60, bluePct: 0.18, enemySpeed: 190, bossTier: 'r', bossScale: 1.6 },
  { slots: 6, bossReq: 3, spawnMs: 1200, greenPct: 0.65, bluePct: 0.20, enemySpeed: 200, bossTier: 'r', bossScale: 1.8 },
];

function waveCfg(wave: number): WaveCfg {
  return WAVES[Math.min(wave - 1, WAVES.length - 1)];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIVES_MAX      = 3;
const KILL_PER_WAVE  = 15;
const BOSS_EVERY     = 12;    // enemy kills between boss spawns
const BOSS_TIMEOUT   = 15000; // ms before boss retreats
const ARSENAL_H      = 90;
const SHIP_LERP      = 0.14;
const FIRE_COOLDOWN  = 200;   // ms between manual plasma shots
const PLASMA_SPEED   = 520;   // px/s upward
const CRASH_DIST     = 38;    // px — ship vs enemy collision radius
const POWERUP_SECS   = 15;    // seconds vulcan spread lasts
const CLAMP_X        = 26;    // min px from screen edge for ship center

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
  type:       'plasma' | 'proton';
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
  private killsSinceBoss = 0;
  private mistakeWeights = new Map<string, number>();
  private isDead        = false;

  constructor() { super({ key: 'GameScene' }); }

  init(data: { mode?: GameMode }): void {
    this.mode    = data.mode ?? 'alphabet';
    this.dataset = this.mode === 'alphabet' ? LETTERS : NUMBERS;
    this.score   = 0;
    this.lives   = LIVES_MAX;
    this.wave    = 1;
    this.killCount      = 0;
    this.killsSinceBoss = 0;
    this.isDead         = false;
    this.activeWeapon   = 'plasma';
    this.weaponEndTime  = 0;
    this.weaponBarActive = false;
    this.bullets  = [];
    this.enemies  = [];
    this.tokens   = [];
    this.arsenal  = [];
    this.boss     = null;
    this.bossRetreating = false;
    this.bossRequired  = [];
    this.bossRemaining = [];
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
    const key = this.textures.exists('bullet-plasma') ? 'bullet-plasma' : 'bullet';
    const img = this.add.image(x, y, key).setDepth(6).setScale(0.7)
      .setRotation(angleOffset);
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
    const item = this.arsenal[slotIndex];
    if (!item) return;
    this.arsenal.splice(slotIndex, 1);
    this.refreshArsenalUI();
    this.fireProton(item);
  }

  private fireProton(item: ItemData): void {
    if (!this.boss) return;
    const key = this.textures.exists('bullet-proton-1') ? 'bullet-proton-1' : 'bullet';
    const img = this.add.image(this.ship.x, this.ship.y - 28, key).setDepth(6).setScale(1.2);
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
    this.tweens.add({
      targets: this.boss.sprite, alpha: 1.0, duration: 80,
      yoyo: true, repeat: 2,
    });
  }

  private flashBossImmune(): void {
    if (!this.boss) return;
    this.tweens.add({
      targets: this.boss.sprite, alpha: 0.25, duration: 80,
      yoyo: true, repeat: 3,
      onComplete: () => { if (this.boss) this.boss.sprite.setAlpha(1); },
    });
  }

  // ─── Enemy spawner ────────────────────────────────────────────────────────

  private startEnemySpawner(): void {
    const cfg = waveCfg(this.wave);
    this.enemySpawnTimer = this.time.addEvent({
      delay: cfg.spawnMs,
      loop: true,
      callback: () => this.spawnEnemy(),
    });
  }

  private restartEnemySpawner(): void {
    this.enemySpawnTimer?.remove();
    this.startEnemySpawner();
  }

  private spawnEnemy(): void {
    if (this.isDead) return;
    const { width } = this.scale;
    const cfg = waveCfg(this.wave);
    const roll = Math.random();
    let type: 'red' | 'green' | 'blue';
    if (roll < cfg.bluePct)                      type = 'blue';
    else if (roll < cfg.bluePct + cfg.greenPct)  type = 'green';
    else                                          type = 'red';

    const texKey = type === 'blue'  ? 'enemy-blue-m'
                 : type === 'green' ? 'enemy-green'
                 :                   'enemy-red';
    const fallback = this.textures.exists(texKey) ? texKey : 'alien-alphabet';
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

  // ─── Boss ─────────────────────────────────────────────────────────────────

  private spawnBoss(): void {
    if (this.boss || this.isDead) return;
    const { width } = this.scale;
    const cfg = waveCfg(this.wave);
    const tier = cfg.bossTier;
    const key = this.textures.exists(`enemy-boss-${tier}-m`) ? `enemy-boss-${tier}-m` : 'alien-alphabet';
    const bossSprite = this.add.sprite(width / 2, -90, key)
      .setDepth(5).setScale(cfg.bossScale);

    // Pick required items (bossReq distinct items from available pool)
    const pool = [...this.availableItems()];
    Phaser.Utils.Array.Shuffle(pool);
    this.bossRequired  = pool.slice(0, cfg.bossReq);
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
        this.playBossHint();
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
    this.bossRetreating = true;
    this.tweens.killTweensOf(this.boss.sprite);
    this.tweens.add({
      targets: this.boss.sprite, y: -150, alpha: 0, duration: 900,
      onComplete: () => { this.boss?.sprite.destroy(); this.boss = null; this.bossRetreating = false; },
    });
  }

  private killBoss(): void {
    if (!this.boss) return;
    this.bossRetreatTimer?.remove(); this.bossRetreatTimer = null;
    this.tweens.killTweensOf(this.boss.sprite);
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

    this.tweens.add({
      targets: [sprite, charText], y: `+=${100}`,
      duration: 5000, ease: 'Linear',
    });
  }

  private collectToken(idx: number): void {
    const tok = this.tokens[idx];
    tok.sprite.destroy();
    tok.charText.destroy();
    this.tokens.splice(idx, 1);

    if (tok.isWeapon) {
      this.activateWeaponPowerup();
    } else {
      const maxSlots = waveCfg(this.wave).slots;
      if (this.arsenal.length >= maxSlots) this.arsenal.shift();
      this.arsenal.push(tok.item);
      this.refreshArsenalUI();
      this.playSound('sfx-wave-up', 0.4);
    }
  }

  // ─── Weapon power-up ──────────────────────────────────────────────────────

  private activateWeaponPowerup(): void {
    this.activeWeapon = 'vulcan';
    this.weaponEndTime = this.time.now + POWERUP_SECS * 1000;
    this.weaponTimer?.remove();
    this.weaponTimer = this.time.delayedCall(POWERUP_SECS * 1000, () => {
      this.activeWeapon = 'plasma';
      this.weaponBarActive = false;
      this.scene.get('HUDScene')?.events.emit('weapon-end');
    });
    this.weaponBarActive = true;
    this.scene.get('HUDScene')?.events.emit('weapon-start', POWERUP_SECS);
    this.playSound('sfx-wave-up', 0.7);

    // Pickup flash
    if (this.anims.exists('explosion-2') && this.textures.exists('explosion-2-01')) {
      const exp = this.add.sprite(this.ship.x, this.ship.y, 'explosion-2-01').setDepth(8);
      exp.play('explosion-2');
      exp.once('animationcomplete', () => exp.destroy());
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

    if (e.type === 'green' && e.item) this.spawnToken(ex, ey, e.item, false);
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

    // Boss trigger
    if (this.killsSinceBoss >= BOSS_EVERY && !this.boss) {
      this.killsSinceBoss = 0;
      this.time.delayedCall(1500, () => this.spawnBoss());
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

    // Plasma bullets move up
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.type === 'plasma' && !b.tweenDriven) {
        const angle = (b.img as Phaser.GameObjects.Image).rotation;
        b.img.x += Math.sin(angle)  * PLASMA_SPEED * (delta / 1000);
        b.img.y -= Math.cos(angle)  * PLASMA_SPEED * (delta / 1000);
        if (b.img.y < -40 || b.img.x < -40 || b.img.x > this.scale.width + 40) {
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
      }
      const lbl = e.sprite.getData('label') as Phaser.GameObjects.Text | undefined;
      if (lbl) lbl.setPosition(e.sprite.x, e.sprite.y + 34);
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

    // Collision passes
    this.checkBulletEnemyCollisions();
    this.checkShipEnemyCollisions();
    this.checkTokenCollection();
    this.checkEnemiesReachedBottom();
  }
}

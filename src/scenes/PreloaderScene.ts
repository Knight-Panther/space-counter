import * as Phaser from 'phaser';
import { LETTERS } from '../data/letters';
import { NUMBERS } from '../data/numbers';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  // Load real asset files — Phaser logs a warning on 404 but does NOT crash.
  // Drop files into public/images/ and public/audio/ and they load automatically.
  preload(): void {
    // Background images
    this.load.image('bg-menu', 'images/bg-menu.jpg');

    // Player ship — blue (default) + red (damage flash), 5 banking frames each
    for (const v of ['m', 'l1', 'l2', 'r1', 'r2']) {
      this.load.image(`ship-${v}`,   `images/ship-${v}.png`);
      this.load.image(`ship-r-${v}`, `images/ship-r-${v}.png`);
    }

    // Thrust exhaust — 5 frames
    for (let i = 1; i <= 5; i++) {
      this.load.image(`exhaust-${i}`, `images/exhaust-${i}.png`);
    }

    // Standard enemies — red, green, blue with all 5 banking frames
    this.load.image('enemy-red',   'images/enemy-red.png');
    this.load.image('enemy-green', 'images/enemy-green.png');
    for (const v of ['m', 'l1', 'l2', 'r1', 'r2']) {
      this.load.image(`enemy-blue-${v}`, `images/enemy-blue-${v}.png`);
    }

    // New animated enemies (spritesheets)
    this.load.spritesheet('enemy-01',       'images/enemy-01.png',       { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-02',       'images/enemy-02.png',       { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-03',       'images/enemy-03.png',       { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-ship-01',        'images/enemy-ship-01.png',        { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-ship-02',        'images/enemy-ship-02.png',        { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('enemy-ship-03',        'images/enemy-ship-03.png',        { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-ship-04',        'images/enemy-ship-04.png',        { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-ship-yellow-01', 'images/enemy-ship-yellow-01.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-ship-yellow-02', 'images/enemy-ship-yellow-02.png', { frameWidth: 64, frameHeight: 64 });

    // Per-enemy explosion spritesheets
    this.load.spritesheet('enemy-death-warped', 'images/enemy-death-warped.png', { frameWidth: 80,  frameHeight: 80  });
    this.load.spritesheet('enemy-death-fx',     'images/enemy-death-fx.png',     { frameWidth: 48,  frameHeight: 48  });
    this.load.spritesheet('expl-b',             'images/expl-b.png',             { frameWidth: 64,  frameHeight: 64  });
    this.load.spritesheet('expl-d',             'images/expl-d.png',             { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('expl-g',             'images/expl-g.png',             { frameWidth: 48,  frameHeight: 48  });

    // Boss ships — legacy blue tier kept for wave 1
    for (const v of ['m', 'l1', 'l2', 'r1', 'r2']) {
      this.load.image(`enemy-boss-b-${v}`, `images/enemy-boss-b-${v}.png`);
    }

    // Boss — Slime / Mummy / Wizard (spritesheets, horizontal layout)
    this.load.spritesheet('boss-slime',  'images/boss-slime-sheet.png',  { frameWidth: 118, frameHeight: 79  });
    this.load.spritesheet('boss-mummy',  'images/boss-mummy-sheet.png',  { frameWidth: 69,  frameHeight: 83  });
    this.load.spritesheet('boss-wizard', 'images/boss-wizard-sheet.png', { frameWidth: 95,  frameHeight: 133 });

    // Boss — Ghost (5 state spritesheets, 64×80 per frame)
    this.load.spritesheet('boss-ghost-appear', 'images/boss-ghost-appear.png', { frameWidth: 64, frameHeight: 80 });
    this.load.spritesheet('boss-ghost-idle',   'images/boss-ghost-idle.png',   { frameWidth: 64, frameHeight: 80 });
    this.load.spritesheet('boss-ghost-chase',  'images/boss-ghost-chase.png',  { frameWidth: 64, frameHeight: 80 });
    this.load.spritesheet('boss-ghost-shriek', 'images/boss-ghost-shriek.png', { frameWidth: 64, frameHeight: 80 });
    this.load.spritesheet('boss-ghost-vanish', 'images/boss-ghost-vanish.png', { frameWidth: 64, frameHeight: 80 });

    // Boss — Demon individual frames (idle 6, attack 18, breath-attack 18)
    for (let i = 1; i <= 6;  i++) this.load.image(`boss-demon-idle-${i}`,   `images/boss-demon-idle-${i}.png`);
    for (let i = 1; i <= 18; i++) this.load.image(`boss-demon-attack-${i}`, `images/boss-demon-attack-${i}.png`);
    for (let i = 1; i <= 18; i++) this.load.image(`boss-demon-breath-${i}`, `images/boss-demon-breath-${i}.png`);

    // Boss — Ship-top individual frames (5)
    for (let i = 1; i <= 5; i++) this.load.image(`boss-ship-top-${i}`, `images/boss-ship-top-${i}.png`);

    // Boss bullets — per-boss projectile sprites
    for (let i = 1; i <= 4; i++) this.load.image(`boss-bullet-pulse-${i}`,   `images/boss-bullet-pulse-${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`boss-bullet-bolt-${i}`,    `images/boss-bullet-bolt-${i}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`boss-bullet-charged-${i}`, `images/boss-bullet-charged-${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`boss-bullet-wave-${i}`,    `images/boss-bullet-wave-${i}.png`);
    for (let i = 1; i <= 3; i++) this.load.image(`boss-bullet-fire-${i}`,    `images/boss-bullet-fire-${i}.png`);

    // Letter/number token — mine_1, 9 frames
    for (let i = 1; i <= 9; i++) {
      this.load.image(`mine-${i}`, `images/mine-${i}.png`);
    }

    // Weapon power-up token — mine_11, 9 frames
    for (let i = 1; i <= 9; i++) {
      this.load.image(`mine-11-${i}`, `images/mine-11-${i}.png`);
    }

    // Bullets
    this.load.image('bullet-plasma',   'images/bullet-plasma.png');
    this.load.image('bullet-plasma-2', 'images/bullet-plasma-2.png');
    this.load.image('bullet-proton-1', 'images/bullet-proton-1.png');
    this.load.image('bullet-proton-2', 'images/bullet-proton-2.png');
    this.load.image('bullet-proton-3', 'images/bullet-proton-3.png');
    this.load.image('bullet-vulcan-1', 'images/bullet-vulcan-1.png');
    this.load.image('bullet-vulcan-2', 'images/bullet-vulcan-2.png');
    this.load.image('bullet-vulcan-3', 'images/bullet-vulcan-3.png');

    // Explosions — type 1 (normal), type 2 (powerup/vulcan), type 3 (boss)
    for (let i = 1; i <= 11; i++) {
      this.load.image(`explosion-1-${String(i).padStart(2, '0')}`, `images/explosion-1-${String(i).padStart(2, '0')}.png`);
    }
    for (let i = 1; i <= 9; i++) {
      this.load.image(`explosion-2-${String(i).padStart(2, '0')}`, `images/explosion-2-${String(i).padStart(2, '0')}.png`);
    }
    for (let i = 1; i <= 9; i++) {
      this.load.image(`explosion-3-${String(i).padStart(2, '0')}`, `images/explosion-3-${String(i).padStart(2, '0')}.png`);
    }

    // Planets (transparent PNGs, ~128×128 each)
    for (let i = 0; i <= 9; i++) {
      this.load.image(`planet-${i}`, `images/Planet${i}.png`);
    }

    // Space nebula backgrounds (StoryScene) — WebP 1024², ~98% smaller than the original PNGs
    this.load.image('space-nebula',   'images/Space.webp');
    this.load.image('space-nebula-2', 'images/Space_1.webp');

    // SBS seamless nebula layers — used for parallax scrolling
    this.load.image('nebula-purple-01', 'images/nebula-purple-01.png');
    this.load.image('nebula-purple-03', 'images/nebula-purple-03.png');
    this.load.image('nebula-purple-04', 'images/nebula-purple-04.png');
    this.load.image('nebula-blue-02',   'images/nebula-blue-02.png');
    this.load.image('nebula-green-02',  'images/nebula-green-02.png');
    this.load.image('nebula-green-03',  'images/nebula-green-03.png');
    this.load.image('nebula-green-06',  'images/nebula-green-06.png');

    // SBS starfields — parallax mid-layer
    this.load.image('starfield-01', 'images/starfield-01.png');
    this.load.image('starfield-02', 'images/starfield-02.png');
    this.load.image('starfield-03', 'images/starfield-03.png');
    this.load.image('starfield-04', 'images/starfield-04.png');
    this.load.image('starfield-05', 'images/starfield-05.png');
    this.load.image('starfield-06', 'images/starfield-06.png');

    // Kenney planets — parallax foreground fly-by
    for (let i = 0; i <= 9; i++) {
      this.load.image(`kp-planet-${String(i).padStart(2, '0')}`, `images/kp-planet-${String(i).padStart(2, '0')}.png`);
    }

    // Animated sun — 15 individual frames (white background, use ADD blend mode)
    for (let i = 0; i <= 14; i++) {
      this.load.image(`sun-${i}`, `images/Sun_${String(i).padStart(5, '0')}.png`);
    }

    // Character guide portrait
    this.load.image('tina', 'images/tina.png');

    // Font
    this.load.font('georgian', 'fonts/NotoSansGeorgian-Regular.ttf');

    // Background music
    this.load.audio('music-game',     'audio/music-game.mp3');
    this.load.audio('music-orbital',  'audio/Orbital Colossus.mp3');
    this.load.audio('music-menu',     'audio/MyVeryOwnDeadShip.mp3');

    // Story intro voice-overs
    this.load.audio('intro-alphabet', 'audio/intro-alphabet.mp3');
    this.load.audio('intro-numbers',  'audio/intro-numbers.mp3');

    // Wave 1 gameplay instructions (play once at mission start)
    this.load.audio('gameplay-alphabet-instruction', 'audio/gameplay-alphabet-instruction.mp3');
    this.load.audio('gameplay-number-instruction',   'audio/gameplay-number-instruction.mp3');

    // "Shoot" voice — prepended before every boss hint sequence
    this.load.audio('voice-shoot',     'audio/voice-shoot.mp3');
    this.load.audio('voice-boss-kill',    'audio/voice-boss-kill.mp3');
    this.load.audio('voice-arsenal-full', 'audio/voice-arsenal-full.mp3');

    // Sound effects
    this.load.audio('sfx-laser',        'audio/sfx-laser.mp3');
    this.load.audio('sfx-explosion',      'audio/sfx-explosion.mp3');
    this.load.audio('sfx-explosion-boss', 'audio/sfx-explosion-boss.mp3');
    this.load.audio('sfx-wrong',        'audio/sfx-wrong.mp3');
    this.load.audio('sfx-alien-appear', 'audio/sfx-alien-appear.mp3');
    this.load.audio('sfx-arsenal-deploy', 'audio/sfx-arsenal-deploy.ogg');
    this.load.audio('sfx-arsenal-full',   'audio/sfx-arsenal-full.mp3');
    this.load.audio('sfx-damage',         'audio/sfx-damage.mp3');
    this.load.audio('sfx-arsenal-tap',    'audio/sfx-arsenal-tap.mp3');
    this.load.audio('sfx-boss-alarm',   'audio/sfx-boss-alarm.mp3');
    this.load.audio('sfx-boss-engine',  'audio/sfx-boss-engine.mp3');
    this.load.audio('sfx-boss-thrust',  'audio/sfx-boss-thrust.mp3');
    this.load.audio('sfx-laser-plasma', 'audio/sfx-laser-plasma.mp3');
    this.load.audio('sfx-laser-vulcan', 'audio/sfx-laser-vulcan.mp3');
    this.load.audio('sfx-ship-engine',  'audio/sfx-ship-engine.mp3');
    this.load.audio('sfx-wave-up',      'audio/sfx-wave-up.mp3');
    this.load.audio('sfx-button',       'audio/sfx-button.mp3');

    // Georgian letter pronunciation clips
    for (const letter of LETTERS) {
      this.load.audio(letter.audioKey, `audio/${letter.audioKey}.mp3`);
    }

    // Georgian number pronunciation clips
    for (const num of NUMBERS) {
      this.load.audio(num.audioKey, `audio/${num.audioKey}.mp3`);
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();

    // Player ship — use real art if loaded, else generate placeholder
    if (!this.textures.exists('player-ship')) {
      gfx.fillStyle(0x88ccff);
      gfx.fillTriangle(20, 0, 0, 56, 40, 56);
      gfx.fillStyle(0xffffff);
      gfx.fillTriangle(20, 8, 10, 50, 30, 50);
      gfx.generateTexture('player-ship', 40, 56);
      gfx.clear();
    }

    // Alien for alphabet
    if (!this.textures.exists('alien-alphabet')) {
      gfx.fillStyle(0xff6633);
      gfx.fillCircle(28, 28, 26);
      gfx.fillStyle(0xffcc00);
      gfx.fillCircle(28, 28, 18);
      gfx.fillStyle(0x220000);
      gfx.fillCircle(22, 24, 4);
      gfx.fillCircle(34, 24, 4);
      gfx.generateTexture('alien-alphabet', 56, 56);
      gfx.clear();
    }

    // Alien for numbers (gold robot look)
    if (!this.textures.exists('alien-numbers')) {
      gfx.fillStyle(0xcc8800);
      gfx.fillRect(6, 6, 44, 44);
      gfx.fillStyle(0xffcc33);
      gfx.fillRect(14, 12, 28, 28);
      gfx.fillStyle(0x000000);
      gfx.fillRect(18, 18, 8, 8);
      gfx.fillRect(30, 18, 8, 8);
      gfx.fillRect(20, 30, 16, 4);
      gfx.generateTexture('alien-numbers', 56, 56);
      gfx.clear();
    }

    // Bullet
    gfx.fillStyle(0x00eeff);
    gfx.fillRect(1, 0, 4, 20);
    gfx.fillStyle(0xffffff);
    gfx.fillRect(2, 0, 2, 8);
    gfx.generateTexture('bullet', 6, 20);
    gfx.clear();

    // Stars background (full canvas)
    gfx.fillStyle(0x000011);
    gfx.fillRect(0, 0, width, height);
    for (let i = 0; i < 220; i++) {
      const alpha = 0.3 + Math.random() * 0.7;
      gfx.fillStyle(0xffffff, alpha);
      const sz = Math.random() < 0.08 ? 2 : 1;
      gfx.fillRect(
        Math.floor(Math.random() * width),
        Math.floor(Math.random() * height),
        sz, sz
      );
    }
    gfx.generateTexture('stars', width, height);
    gfx.clear();

    // Heart icon for lives
    gfx.fillStyle(0xff4455);
    gfx.fillCircle(8, 8, 8);
    gfx.fillCircle(16, 8, 8);
    gfx.fillTriangle(0, 11, 12, 22, 24, 11);
    gfx.generateTexture('heart', 24, 22);
    gfx.clear();

    // Explosion particle
    gfx.fillStyle(0xff8800);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle', 8, 8);
    gfx.clear();

    gfx.destroy();

    // Exhaust animation — cycles through 5 loaded image keys
    if (this.textures.exists('exhaust-1')) {
      this.anims.create({
        key: 'exhaust-loop',
        frames: [1, 2, 3, 4, 5].map(i => ({ key: `exhaust-${i}` })),
        frameRate: 12,
        repeat: -1,
      });
    }

    // Plasma bullet flicker — 2 frames
    if (this.textures.exists('bullet-plasma')) {
      this.anims.create({
        key: 'plasma-fly',
        frames: ['bullet-plasma', 'bullet-plasma-2'].map(k => ({ key: k })),
        frameRate: 8, repeat: -1,
      });
    }

    // Proton bullet spin — 3 frames
    if (this.textures.exists('bullet-proton-1')) {
      this.anims.create({
        key: 'proton-spin',
        frames: [1, 2, 3].map(i => ({ key: `bullet-proton-${i}` })),
        frameRate: 10, repeat: -1,
      });
    }

    // Letter/number token spin — 9 frames
    if (this.textures.exists('mine-1')) {
      this.anims.create({
        key: 'mine-spin',
        frames: Array.from({ length: 9 }, (_, i) => ({ key: `mine-${i + 1}` })),
        frameRate: 8, repeat: -1,
      });
    }

    // Weapon power-up token spin — 9 frames
    if (this.textures.exists('mine-11-1')) {
      this.anims.create({
        key: 'mine-11-spin',
        frames: Array.from({ length: 9 }, (_, i) => ({ key: `mine-11-${i + 1}` })),
        frameRate: 10, repeat: -1,
      });
    }

    // Vulcan bullet animation — 3 frames, looping
    if (this.textures.exists('bullet-vulcan-1')) {
      this.anims.create({
        key: 'vulcan-fly',
        frames: [1, 2, 3].map(i => ({ key: `bullet-vulcan-${i}` })),
        frameRate: 12, repeat: -1,
      });
    }

    // Explosion type 1 — normal enemy death, 11 frames
    if (this.textures.exists('explosion-1-01')) {
      this.anims.create({
        key: 'explosion-1',
        frames: Array.from({ length: 11 }, (_, i) => ({ key: `explosion-1-${String(i + 1).padStart(2, '0')}` })),
        frameRate: 15, repeat: 0,
      });
    }

    // Explosion type 2 — power-up pickup / vulcan hit, 9 frames
    if (this.textures.exists('explosion-2-01')) {
      this.anims.create({
        key: 'explosion-2',
        frames: Array.from({ length: 9 }, (_, i) => ({ key: `explosion-2-${String(i + 1).padStart(2, '0')}` })),
        frameRate: 15, repeat: 0,
      });
    }

    // Explosion type 3 — boss death, 9 frames
    if (this.textures.exists('explosion-3-01')) {
      this.anims.create({
        key: 'explosion-3',
        frames: Array.from({ length: 9 }, (_, i) => ({ key: `explosion-3-${String(i + 1).padStart(2, '0')}` })),
        frameRate: 15, repeat: 0,
      });
    }

    // ── New enemy idle animations ─────────────────────────────────────────────
    if (this.textures.exists('enemy-01'))
      this.anims.create({ key: 'enemy-01-idle', frames: this.anims.generateFrameNumbers('enemy-01', { start: 0, end: 4 }), frameRate: 8, repeat: -1 });
    if (this.textures.exists('enemy-02'))
      this.anims.create({ key: 'enemy-02-idle', frames: this.anims.generateFrameNumbers('enemy-02', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    if (this.textures.exists('enemy-03'))
      this.anims.create({ key: 'enemy-03-idle', frames: this.anims.generateFrameNumbers('enemy-03', { start: 0, end: 3 }), frameRate: 9, repeat: -1 });
    for (const [key, end] of [
      ['enemy-ship-01', 4], ['enemy-ship-02', 4], ['enemy-ship-03', 4],
      ['enemy-ship-04', 4], ['enemy-ship-yellow-01', 4], ['enemy-ship-yellow-02', 4],
    ] as [string, number][]) {
      if (this.textures.exists(key))
        this.anims.create({ key: `${key}-idle`, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: 8, repeat: -1 });
    }

    // ── Per-enemy explosion animations ────────────────────────────────────────
    if (this.textures.exists('enemy-death-warped'))
      this.anims.create({ key: 'expl-enemy-warped', frames: this.anims.generateFrameNumbers('enemy-death-warped', { start: 0, end: 6 }), frameRate: 14, repeat: 0 });
    if (this.textures.exists('enemy-death-fx'))
      this.anims.create({ key: 'expl-enemy-death',  frames: this.anims.generateFrameNumbers('enemy-death-fx',     { start: 0, end: 7 }), frameRate: 14, repeat: 0 });
    if (this.textures.exists('expl-b'))
      this.anims.create({ key: 'expl-b', frames: this.anims.generateFrameNumbers('expl-b', { start: 0, end: 7  }), frameRate: 14, repeat: 0 });
    if (this.textures.exists('expl-d'))
      this.anims.create({ key: 'expl-d', frames: this.anims.generateFrameNumbers('expl-d', { start: 0, end: 11 }), frameRate: 12, repeat: 0 });
    if (this.textures.exists('expl-g'))
      this.anims.create({ key: 'expl-g', frames: this.anims.generateFrameNumbers('expl-g', { start: 0, end: 6  }), frameRate: 14, repeat: 0 });

    // ── Boss body animations ───────────────────────────────────────────────────

    if (this.textures.exists('boss-slime'))
      this.anims.create({ key: 'boss-slime-idle', frames: this.anims.generateFrameNumbers('boss-slime', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

    if (this.textures.exists('boss-mummy'))
      this.anims.create({ key: 'boss-mummy-idle', frames: this.anims.generateFrameNumbers('boss-mummy', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });

    if (this.textures.exists('boss-wizard'))
      this.anims.create({ key: 'boss-wizard-idle', frames: this.anims.generateFrameNumbers('boss-wizard', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });

    if (this.textures.exists('boss-ghost-appear'))
      this.anims.create({ key: 'boss-ghost-appear', frames: this.anims.generateFrameNumbers('boss-ghost-appear', { start: 0, end: 5 }), frameRate: 10, repeat: 0 });
    if (this.textures.exists('boss-ghost-idle'))
      this.anims.create({ key: 'boss-ghost-idle',   frames: this.anims.generateFrameNumbers('boss-ghost-idle',   { start: 0, end: 6 }), frameRate: 8,  repeat: -1 });
    if (this.textures.exists('boss-ghost-shriek'))
      this.anims.create({ key: 'boss-ghost-shriek', frames: this.anims.generateFrameNumbers('boss-ghost-shriek', { start: 0, end: 3 }), frameRate: 12, repeat: 0 });
    if (this.textures.exists('boss-ghost-vanish'))
      this.anims.create({ key: 'boss-ghost-vanish', frames: this.anims.generateFrameNumbers('boss-ghost-vanish', { start: 0, end: 6 }), frameRate: 10, repeat: 0 });

    if (this.textures.exists('boss-demon-idle-1')) {
      this.anims.create({ key: 'boss-demon-idle',   frames: Array.from({ length: 6  }, (_, i) => ({ key: `boss-demon-idle-${i + 1}`   })), frameRate: 8,  repeat: -1 });
      this.anims.create({ key: 'boss-demon-attack', frames: Array.from({ length: 18 }, (_, i) => ({ key: `boss-demon-attack-${i + 1}` })), frameRate: 12, repeat: 0 });
      this.anims.create({ key: 'boss-demon-breath', frames: Array.from({ length: 18 }, (_, i) => ({ key: `boss-demon-breath-${i + 1}` })), frameRate: 12, repeat: 0 });
    }

    if (this.textures.exists('boss-ship-top-1'))
      this.anims.create({ key: 'boss-ship-top-idle', frames: Array.from({ length: 5 }, (_, i) => ({ key: `boss-ship-top-${i + 1}` })), frameRate: 8, repeat: -1 });

    // ── Boss bullet animations ─────────────────────────────────────────────────

    if (this.textures.exists('boss-bullet-pulse-1'))
      this.anims.create({ key: 'boss-bullet-pulse',   frames: Array.from({ length: 4 }, (_, i) => ({ key: `boss-bullet-pulse-${i + 1}`   })), frameRate: 10, repeat: -1 });
    if (this.textures.exists('boss-bullet-bolt-1'))
      this.anims.create({ key: 'boss-bullet-bolt',    frames: Array.from({ length: 4 }, (_, i) => ({ key: `boss-bullet-bolt-${i + 1}`    })), frameRate: 14, repeat: -1 });
    if (this.textures.exists('boss-bullet-charged-1'))
      this.anims.create({ key: 'boss-bullet-charged', frames: Array.from({ length: 6 }, (_, i) => ({ key: `boss-bullet-charged-${i + 1}` })), frameRate: 10, repeat: -1 });
    if (this.textures.exists('boss-bullet-wave-1'))
      this.anims.create({ key: 'boss-bullet-wave',    frames: Array.from({ length: 4 }, (_, i) => ({ key: `boss-bullet-wave-${i + 1}`    })), frameRate: 8,  repeat: -1 });
    if (this.textures.exists('boss-bullet-fire-1'))
      this.anims.create({ key: 'boss-bullet-fire',    frames: Array.from({ length: 3 }, (_, i) => ({ key: `boss-bullet-fire-${i + 1}`    })), frameRate: 12, repeat: -1 });

    this.scene.start('MainMenuScene');
  }

}

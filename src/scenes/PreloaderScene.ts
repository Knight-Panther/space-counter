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
    this.load.image('bg-menu',     'images/bg-menu.jpg');
    this.load.image('bg-alphabet', 'images/bg-alphabet.jpg');
    this.load.image('bg-numbers',  'images/bg-numbers.jpg');

    // Sprite sheets / character art
    this.load.image('ship',           'images/ship.png');
    this.load.image('alien-alphabet', 'images/alien-alphabet.png');
    this.load.image('alien-numbers',  'images/alien-numbers.png');
    this.load.image('story-warrior',  'images/story-warrior.png');
    this.load.image('story-wizard',   'images/story-wizard.png');

    // Player ship — blue (default) + red (damage flash), 5 banking frames each
    for (const v of ['m', 'l1', 'l2', 'r1', 'r2']) {
      this.load.image(`ship-${v}`,   `images/ship-${v}.png`);
      this.load.image(`ship-r-${v}`, `images/ship-r-${v}.png`);
    }

    // Thrust exhaust — 5 frames
    for (let i = 1; i <= 5; i++) {
      this.load.image(`exhaust-${i}`, `images/exhaust-${i}.png`);
    }

    // Standard enemies — red, green, blue (weapon-drop carrier)
    this.load.image('enemy-red',   'images/enemy-red.png');
    this.load.image('enemy-green', 'images/enemy-green.png');
    this.load.image('enemy-blue-m', 'images/enemy-blue-m.png');

    // Boss ships — 3 tiers (blue=easy, green=mid, red=hard), straight frame only
    // (bosses hover so banking frames are loaded but used only if boss drifts)
    for (const tier of ['b', 'g', 'r']) {
      for (const v of ['m', 'l1', 'l2', 'r1', 'r2']) {
        this.load.image(`enemy-boss-${tier}-${v}`, `images/enemy-boss-${tier}-${v}.png`);
      }
    }

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

    // Space nebula overlay layers (original)
    this.load.image('space-nebula',   'images/Space.png');
    this.load.image('space-nebula-2', 'images/Space_1.png');

    // Planet shadow/lighting overlay
    this.load.image('planet-shadow', 'images/PLanet_Shadow_1.png');

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

    // Font
    this.load.font('georgian', 'fonts/NotoSansGeorgian-Regular.ttf');

    // Background music
    this.load.audio('music-menu',     'audio/MyVeryOwnDeadShip.ogg');

    // Story intro voice-overs
    this.load.audio('intro-alphabet', 'audio/intro-alphabet.wav');
    this.load.audio('intro-numbers',  'audio/intro-numbers.wav');
    this.load.audio('music-alphabet', 'audio/music-alphabet.mp3');
    this.load.audio('music-numbers',  'audio/music-numbers.mp3');

    // Sound effects
    this.load.audio('sfx-laser',        'audio/sfx-laser.mp3');
    this.load.audio('sfx-explosion',    'audio/sfx-explosion.mp3');
    this.load.audio('sfx-wrong',        'audio/sfx-wrong.mp3');
    this.load.audio('sfx-alien-appear', 'audio/sfx-alien-appear.mp3');
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

    this.scene.start('MainMenuScene');
  }
}

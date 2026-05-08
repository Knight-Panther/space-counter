import * as Phaser from 'phaser';
import { GameMode } from '../data/types';
import { PremiumManager } from '../iap/PremiumManager';

type MenuAction = GameMode;

const MENU_ITEMS: { action: MenuAction; label: string }[] = [
  { action: 'alphabet', label: 'ანბანი' },
  { action: 'numbers',  label: 'რიცხვები' },
];

const C = {
  selected:   '#00ffff',
  unselected: '#557799',
  cursor:     '#ffff00',
  title1:     '#ffffff',
  title2:     '#44ccff',
  header:     '#aaddff',
  dim:        '#223344',
};

export class MainMenuScene extends Phaser.Scene {
  private selectedIdx = 0;
  private cursorText!: Phaser.GameObjects.Text;
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private nebulaLayer: Phaser.GameObjects.TileSprite | null = null;
  private starLayer:   Phaser.GameObjects.TileSprite | null = null;
  private menuLineH    = 0;
  private menuTopY     = 0;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width: w, height: h } = this.scale;
    const cx = w / 2;

    this.selectedIdx = 0;
    this.itemTexts = [];

    // Dismiss the HTML loading screen now that Phaser is ready
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.classList.add('hidden');
      setTimeout(() => ls.remove(), 380);
    }

    this.startMenuMusic();

    this.drawBackground(w, h);
    this.addParallaxLayers(w, h);
    this.createTwinklingStars(w, h);
    this.addAnimatedSun(w, h);
    this.addFloatingPlanets(w, h);

    this.buildTitle(cx, h);
    this.buildMenu(cx, h);
    this.buildFooter(cx, h, w);

    // Rebuild footer (removes unlock button) as soon as premium activates
    this.game.events.once('premium-changed', () => this.scene.restart());

    // Keyboard navigation
    const keys = this.input.keyboard;
    if (keys) {
      keys.on('keydown-UP',    () => this.moveSelector(-1));
      keys.on('keydown-DOWN',  () => this.moveSelector(1));
      keys.on('keydown-ENTER', () => this.confirm());
      keys.on('keydown-SPACE', () => this.confirm());
    }
  }

  update(): void {
    if (this.nebulaLayer) this.nebulaLayer.tilePositionY -= 0.25;
    if (this.starLayer)   this.starLayer.tilePositionY   -= 0.60;
  }

  // ─── Parallax nebula layers ───────────────────────────────────────────────────

  private addParallaxLayers(w: number, h: number): void {
    if (this.textures.exists('bg-menu')) return; // real photo — skip full-screen overlays
    if (this.textures.exists('nebula-purple-03')) {
      this.nebulaLayer = this.add.tileSprite(w / 2, h / 2, w, h, 'nebula-purple-03')
        .setAlpha(0.20).setDepth(1);
    }
    if (this.textures.exists('starfield-02')) {
      this.starLayer = this.add.tileSprite(w / 2, h / 2, w, h, 'starfield-02')
        .setAlpha(0.15).setDepth(1);
    }
  }

  // ─── Space layers ────────────────────────────────────────────────────────────

  private addAnimatedSun(w: number, h: number): void {
    if (!this.textures.exists('sun-0')) return;

    const sx = w * 0.75;
    const sy = h * 0.12;

    // Outer corona — large soft glow
    const corona = this.add.graphics();
    corona.fillStyle(0xff8800, 1);
    corona.fillCircle(0, 0, 52);
    corona.setPosition(sx, sy).setAlpha(0.22).setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: corona, alpha: 0.10, scaleX: 1.35, scaleY: 1.35,
      duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    // Inner glow — tighter, brighter
    const innerGlow = this.add.graphics();
    innerGlow.fillStyle(0xffdd44, 1);
    innerGlow.fillCircle(0, 0, 28);
    innerGlow.setPosition(sx, sy).setAlpha(0.35).setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: innerGlow, alpha: 0.18,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    // Sun sprite
    const sun = this.add.image(sx, sy, 'sun-0')
      .setScale(0.62).setAlpha(0.88).setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Gentle float
    this.tweens.add({
      targets: sun, y: sy + 6,
      duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    // Breathing scale pulse
    this.tweens.add({
      targets: sun, scaleX: 0.68, scaleY: 0.68,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    // Frame cycle — 15 frames at 40ms each
    let frame = 0;
    this.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        frame = (frame + 1) % 15;
        if (this.textures.exists(`sun-${frame}`)) sun.setTexture(`sun-${frame}`);
      },
    });
  }

  private addFloatingPlanets(w: number, h: number): void {
    // All planets clustered near the sun at (w*0.75, h*0.12)
    // [key, x%, y%, scale, floatAmp, floatDur, rotDur, delay, alpha]
    const cfg: [string, number, number, number, number, number, number, number, number][] = [
      ['planet-3', 0.55, 0.04, 0.27,  8, 4000, 24000,    0, 0.85],  // left of sun
      ['planet-7', 0.88, 0.08, 0.22,  6, 3200, 19000,  700, 0.80],  // right of sun
      ['planet-0', 0.70, 0.22, 0.18,  5, 2800, 15000, 1400, 0.72],  // below sun
      ['planet-4', 0.25, 0.44, 0.14,  4, 3500, 28000,  300, 0.65],  // left of "აირჩიე მისია"
      ['planet-1', 0.05, 0.15, 0.11,  3, 4200, 32000,  500, 0.50],
      ['planet-2', 0.90, 0.55, 0.09,  3, 3800, 21000,  900, 0.45],
      ['planet-5', 0.15, 0.72, 0.10,  2, 4800, 18000,  200, 0.40],
      ['planet-6', 0.80, 0.80, 0.08,  2, 3600, 26000,  600, 0.38],
      ['planet-8', 0.42, 0.10, 0.07,  2, 5000, 23000, 1100, 0.35],
      ['planet-9', 0.60, 0.88, 0.06,  2, 4100, 19000,  800, 0.30],
    ];

    cfg.forEach(([key, xp, yp, scale, amp, floatDur, rotDur, delay, alpha]) => {
      if (!this.textures.exists(key)) return;

      const px = w * xp;
      const py = h * yp;

      const planet = this.add.image(px, py, key)
        .setScale(scale).setAlpha(alpha).setDepth(3);

      // Vertical float
      this.tweens.add({
        targets: planet, y: py + amp,
        duration: floatDur, delay,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });

      // Slow rotation
      this.tweens.add({
        targets: planet, angle: 360,
        duration: rotDur, delay,
        repeat: -1, ease: 'Linear',
      });
    });
  }

  // ─── Background ───────────────────────────────────────────────────────────────

  private drawBackground(w: number, h: number): void {
    if (this.textures.exists('bg-menu')) {
      // Cover scaling — maintain aspect ratio, crop edges to fill canvas
      const src   = this.textures.get('bg-menu').getSourceImage() as HTMLImageElement;
      const scale = Math.max(w / src.width, h / src.height);
      this.add.image(w / 2, h / 2, 'bg-menu').setScale(scale);
      const dim = this.add.graphics();
      dim.fillStyle(0x000011, 0.05);
      dim.fillRect(0, h * 0.19, w, h * 0.20); // title
      dim.fillRect(0, h * 0.42, w, h * 0.20); // menu
      dim.fillRect(0, h * 0.87, w, h * 0.11); // footer
      return;
    }

    const base = this.add.graphics();
    base.fillStyle(0x000011);
    base.fillRect(0, 0, w, h);

    const nebula = this.add.graphics();
    const clouds = [
      { x: w * 0.2,  y: h * 0.25, r: 160, color: 0x4400aa, alpha: 0.18 },
      { x: w * 0.75, y: h * 0.18, r: 130, color: 0x0033cc, alpha: 0.15 },
      { x: w * 0.5,  y: h * 0.5,  r: 200, color: 0x006644, alpha: 0.12 },
      { x: w * 0.15, y: h * 0.65, r: 140, color: 0x880044, alpha: 0.14 },
      { x: w * 0.8,  y: h * 0.72, r: 120, color: 0x224400, alpha: 0.13 },
    ];
    clouds.forEach(c => {
      nebula.fillStyle(c.color, c.alpha);
      nebula.fillCircle(c.x, c.y, c.r);
      nebula.fillStyle(c.color, c.alpha * 0.6);
      nebula.fillCircle(c.x + c.r * 0.3, c.y - c.r * 0.2, c.r * 0.65);
    });

    const starGfx = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      const alpha = 0.3 + Math.random() * 0.7;
      starGfx.fillStyle(0xffffff, alpha);
      const sz = Math.random() < 0.06 ? 2 : 1;
      starGfx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), sz, sz);
    }
  }

  private createTwinklingStars(w: number, h: number): void {
    if (this.textures.exists('bg-menu')) return;
    for (let i = 0; i < 25; i++) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), Math.random() < 0.3 ? 2 : 1, 1);
      this.tweens.add({
        targets: gfx,
        alpha: 0.05,
        duration: Phaser.Math.Between(800, 2400),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
        ease: 'Sine.InOut',
      });
    }
  }


  // ─── Title ────────────────────────────────────────────────────────────────────

  private buildTitle(cx: number, h: number): void {
    // Title line 1 — Georgian word
    this.add.text(cx, h * 0.22, 'პლანეტა', {
      fontSize: '48px',
      color: C.title1,
      stroke: '#0055cc',
      strokeThickness: 8,
      fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Title line 2
    this.add.text(cx, h * 0.295, 'Tvale', {
      fontSize: '52px',
      color: '#ffdd00',
      stroke: '#884400',
      strokeThickness: 10,
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
  }

  // ─── Menu list ────────────────────────────────────────────────────────────────

  private buildMenu(cx: number, h: number): void {
    const w       = this.scale.width;
    const menuTop = h * 0.50;
    const lineH   = Math.round(h * 0.067);
    this.menuLineH = lineH;
    this.menuTopY  = menuTop;
    const ITEM_FS = '40px';

    // "აირჩიე მისია" header
    this.add.text(cx, menuTop - h * 0.059, 'აირჩიე მისია', {
      fontSize: '19px',
      color: C.header,
      fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
      letterSpacing: 3,
    }).setOrigin(0.5, 0);

    // Thin rule under header
    const ruleHalf = w * 0.23;
    const rule = this.add.graphics();
    rule.lineStyle(1, 0x224466, 0.6);
    rule.lineBetween(cx - ruleHalf, menuTop - h * 0.019, cx + ruleHalf, menuTop - h * 0.019);

    // Cursor arrow — sits left of centered text block
    this.cursorText = this.add.text(cx - w * 0.31, menuTop, '►', {
      fontSize: '26px',
      color: C.cursor,
      fontFamily: 'Orbitron, Arial',
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: this.cursorText,
      alpha: 0.15,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
    });

    // Menu items — centered, identical font size
    MENU_ITEMS.forEach(({ label }, idx) => {
      const y = menuTop + idx * lineH;

      const txt = this.add.text(cx, y, label, {
        fontSize: ITEM_FS,
        color: idx === this.selectedIdx ? C.selected : C.unselected,
        fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      this.itemTexts.push(txt);

      const zone = this.add.zone(cx, y, cx * 2 * 0.85, lineH).setInteractive();
      zone.on('pointerover', () => {
        if (this.selectedIdx !== idx) {
          this.selectedIdx = idx;
          this.refreshSelector();
        }
      });
      zone.on('pointerdown', () => {
        this.selectedIdx = idx;
        this.refreshSelector();
        this.confirm();
      });
    });

    this.refreshSelector();
  }

  private moveSelector(dir: number): void {
    this.selectedIdx = Phaser.Math.Wrap(this.selectedIdx + dir, 0, MENU_ITEMS.length);
    this.refreshSelector();
  }

  private refreshSelector(): void {
    this.cursorText.setY(this.menuTopY + this.selectedIdx * this.menuLineH);

    this.itemTexts.forEach((t, i) => {
      t.setColor(i === this.selectedIdx ? C.selected : C.unselected);
    });
  }

  private confirm(): void {
    this.playSound('sfx-button');
    const { action } = MENU_ITEMS[this.selectedIdx];
    this.tweens.add({
      targets: this.itemTexts[this.selectedIdx],
      alpha: 0.1,
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.scene.start('StoryScene', { mode: action }),
    });
  }

  // ─── Footer ───────────────────────────────────────────────────────────────────

  private buildFooter(cx: number, h: number, _w?: number): void {
    const w         = this.scale.width;
    const isPremium = !!this.game.registry.get('isPremium');

    if (!isPremium) {
      const btnW = Math.min(w * 0.59, 260), btnH = 44;
      const btnY  = h * 0.83;
      const gfx   = this.add.graphics()
        .fillStyle(0x003388, 0.85)
        .fillRoundedRect(cx - btnW / 2, btnY, btnW, btnH, 10)
        .lineStyle(2, 0x0088ff, 0.90)
        .strokeRoundedRect(cx - btnW / 2, btnY, btnW, btnH, 10);
      this.tweens.add({ targets: gfx, alpha: 0.55, duration: 900, yoyo: true, repeat: -1 });

      this.add.text(cx, btnY + btnH / 2, '★  სრული ანბანი  /  Unlock', {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
        fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
      }).setOrigin(0.5);

      this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setInteractive()
        .on('pointerdown', () => {
          this.playSound('sfx-button');
          this.scene.launch('PaywallScene');
        });
    }

    // Separator
    const margin = w * 0.082;
    this.add.graphics().lineStyle(1, 0x0066ff, 0.4)
      .lineBetween(margin, h * 0.90, w - margin, h * 0.90);

    // Version
    this.add.text(isPremium ? cx : cx - w * 0.092, h * 0.93, 'v1.0', {
      fontSize: '13px', color: C.dim, fontFamily: 'Orbitron, Arial', letterSpacing: 4,
    }).setOrigin(0.5);

    // Restore Purchases (free users only)
    if (!isPremium) {
      const restore = this.add.text(cx + w * 0.144, h * 0.93, 'Restore', {
        fontSize: '13px', color: '#334455', fontFamily: 'Orbitron, Arial',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      restore.on('pointerdown', async () => {
        restore.setText('...').setColor('#ffdd44');
        const mgr    = PremiumManager.get(this.game);
        const result = await mgr.restorePurchases();
        if (result.restored) {
          restore.setText('Restored!').setColor('#00ff88');
          this.time.delayedCall(1200, () => this.scene.restart());
        } else {
          restore.setText('Restore').setColor('#334455');
        }
      });
    }

    // Copyright — two-part so company name stands out
    const copyY = h * 0.965;
    const tYear = this.add.text(0, copyY, '© 2026 ', {
      fontSize: '11px', color: '#8899bb',
      fontFamily: 'Roboto, Arial', letterSpacing: 1,
    }).setOrigin(0, 0.5);
    const tCo = this.add.text(0, copyY, 'XTelo', {
      fontSize: '14px', color: '#55ddff',
      fontFamily: 'Roboto, Orbitron, Arial', fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0, 0.5);
    // Centre the combined block horizontally
    const totalW = tYear.width + tCo.width;
    tYear.setX(cx - totalW / 2);
    tCo.setX(cx - totalW / 2 + tYear.width);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private startMenuMusic(): void {
    if (!this.cache.audio.has('music-menu')) return;
    this.sound.stopAll();

    const play = () => {
      if (!this.sound.get('music-menu')) {
        this.sound.play('music-menu', { loop: true, volume: 1.0 });
      }
    };

    // Try immediately — succeeds if AudioContext already active (e.g. returning from game)
    play();

    // Fallback: browser autoplay policy suspends AudioContext until first gesture.
    // Both paths are registered so whichever fires first wins; the guard in play() prevents double-play.
    const mgr = this.sound as unknown as { locked: boolean };
    if (mgr.locked) {
      this.sound.once('unlocked', play);
    }
    this.input.once('pointerdown', play);
    this.input.keyboard?.once('keydown', play);
  }

  private playSound(key: string): void {
    if (this.cache.audio.has(key)) this.sound.play(key, { volume: 0.6 });
  }
}

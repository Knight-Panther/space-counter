import * as Phaser from 'phaser';
import { GameMode } from '../data/types';

const LIVES_MAX = 3;

export class HUDScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private mode: GameMode = 'alphabet';
  private weaponBarBg!:   Phaser.GameObjects.Graphics;
  private weaponBarFill!: Phaser.GameObjects.Graphics;
  private weaponLabel!:   Phaser.GameObjects.Text;
  private weaponBarVisible = false;
  private muteLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? 'alphabet';
  }

  create(): void {
    const { width } = this.scale;
    const accentColor = this.mode === 'alphabet' ? '#88aaff' : '#ffcc66';

    // Back-to-menu button — top left, before score
    this.buildMenuButton();

    // Score — top left, after the home button
    this.scoreText = this.add.text(Math.round(width * 0.149), 14, 'ქულა: 0', {
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Orbitron, Arial',
    }).setOrigin(0, 0);

    // Wave — starts centered but shifts right if score text grows into it
    this.waveText = this.add.text(width / 2, 14, 'ტალღა 1', {
      fontSize: '20px',
      color: accentColor,
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Orbitron, Arial',
    }).setOrigin(0, 0);
    this.repositionWaveText();

    // Lives — top right (heart icons)
    this.hearts = [];
    const heartSpacing = Math.round(width * 0.072);
    const heartMargin  = Math.round(width * 0.036);
    for (let i = 0; i < LIVES_MAX; i++) {
      const heart = this.add.image(width - heartMargin - i * heartSpacing, 20, 'heart').setOrigin(1, 0);
      this.hearts.push(heart);
    }

    // Mute button — below hearts, top-right
    this.buildMuteButton();

    // Weapon power-up timer bar — centered, above arsenal bar
    const { height } = this.scale;
    const barW = 160, barH = 12;
    const barX = width / 2 - barW / 2;
    const barY = height - 100;

    this.weaponBarBg = this.add.graphics();
    this.weaponBarBg.fillStyle(0x001122, 0.75);
    this.weaponBarBg.fillRoundedRect(barX, barY, barW, barH, 5);
    this.weaponBarBg.lineStyle(1, 0x00aaff, 0.5);
    this.weaponBarBg.strokeRoundedRect(barX, barY, barW, barH, 5);
    this.weaponBarBg.setVisible(false);

    this.weaponBarFill = this.add.graphics();
    this.weaponBarFill.setVisible(false);

    this.weaponLabel = this.add.text(width / 2, barY - 14, '⚡ VULCAN', {
      fontSize: '12px', color: '#ffdd00', fontFamily: 'Orbitron, Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setVisible(false);

    // Events
    this.events.on('score-update', (score: number) => {
      this.scoreText.setText(`ქულა: ${score}`);
      this.repositionWaveText();
    });
    this.events.on('lives-update', (lives: number) => {
      this.updateHearts(lives);
    });
    this.events.on('wave-update', (wave: number) => {
      this.waveText.setText(`ტალღა ${wave}`);
      this.repositionWaveText();
    });
    this.events.on('weapon-start', (label?: string) => {
      if (label) this.weaponLabel.setText(label);
      this.weaponBarVisible = true;
      this.weaponBarBg.setVisible(true);
      this.weaponBarFill.setVisible(true);
      this.weaponLabel.setVisible(true);
    });
    this.events.on('weapon-end', () => {
      this.weaponBarVisible = false;
      this.weaponBarBg.setVisible(false);
      this.weaponBarFill.setVisible(false);
      this.weaponLabel.setVisible(false);
    });
    this.events.on('weapon-tick', (remaining: number, total: number) => {
      if (!this.weaponBarVisible) return;
      const pct = remaining / total;
      const barW2 = 160, barH2 = 12;
      const barX2 = width / 2 - barW2 / 2;
      const barY2 = height - 100;
      this.weaponBarFill.clear();
      const color = pct > 0.5 ? 0x00ccff : pct > 0.25 ? 0xffaa00 : 0xff4400;
      this.weaponBarFill.fillStyle(color, 0.9);
      this.weaponBarFill.fillRoundedRect(barX2, barY2, barW2 * pct, barH2, 5);
    });
  }

  private buildMenuButton(): void {
    const { width } = this.scale;
    const bx = Math.round(width * 0.072);
    const by = 28;
    const r  = 20;

    const bg = this.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(0x000000, hover ? 0.75 : 0.50);
      bg.fillCircle(bx, by, r);
      bg.lineStyle(1.5, 0x4488ff, hover ? 1 : 0.6);
      bg.strokeCircle(bx, by, r);
    };
    draw(false);

    // Home icon — simple house shape in text
    this.add.text(bx, by, '⌂', {
      fontSize: '26px',
      color: '#88aaff',
      fontFamily: 'Orbitron, Arial',
    }).setOrigin(0.5, 0.5);

    const zone = this.add.zone(bx, by, r * 2, r * 2).setInteractive();
    zone.on('pointerover',  () => draw(true));
    zone.on('pointerout',   () => draw(false));
    zone.on('pointerdown',  () => {
      this.scene.stop('GameScene');
      this.scene.start('MainMenuScene');
    });
  }

  private repositionWaveText(): void {
    const { width } = this.scale;
    const naturalX  = width / 2 - this.waveText.width / 2; // centered
    const safeX     = this.scoreText.x + this.scoreText.width + 10; // 10px gap after score
    this.waveText.setX(Math.max(naturalX, safeX));
  }

  private updateHearts(lives: number): void {
    this.hearts.forEach((heart, i) => {
      heart.setAlpha(i < lives ? 1 : 0.18);
    });
  }

  private buildMuteButton(): void {
    const { width } = this.scale;
    const bx = width - Math.round(width * 0.072);
    const by = 62;
    const r  = 16;

    const bg = this.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(0x000000, hover ? 0.75 : 0.50);
      bg.fillCircle(bx, by, r);
      bg.lineStyle(1.5, 0x4488ff, hover ? 1 : 0.6);
      bg.strokeCircle(bx, by, r);
    };
    draw(false);

    const muted = !!this.game.registry.get('musicMuted');
    this.muteLabel = this.add.text(bx, by, muted ? '🔇' : '🔊', {
      fontSize: '16px',
      fontFamily: 'Orbitron, Arial',
    }).setOrigin(0.5, 0.5);

    const zone = this.add.zone(bx, by, r * 2, r * 2).setInteractive();
    zone.on('pointerover',  () => draw(true));
    zone.on('pointerout',   () => draw(false));
    zone.on('pointerdown',  () => {
      const nowMuted = !this.game.registry.get('musicMuted');
      this.game.registry.set('musicMuted', nowMuted);
      this.muteLabel.setText(nowMuted ? '🔇' : '🔊');
      for (const key of ['music-game', 'music-orbital']) {
        const music = this.sound.get(key) as any;
        if (music) music.setVolume(nowMuted ? 0 : 0.25);
      }
      draw(false);
    });
  }
}

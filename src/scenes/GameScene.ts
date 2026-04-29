import * as Phaser from 'phaser';
import { LETTERS, LetterData } from '../data/letters';

const LIVES_MAX = 3;
const BASE_SPEED = 100;
const WAVE_SIZE = 10;
const BTN_ZONE_HEIGHT = 155;

interface LetterButton {
  bg: Phaser.GameObjects.Graphics;
  charText: Phaser.GameObjects.Text;
  latinText: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class GameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private ship!: Phaser.GameObjects.Image;

  private alien: Phaser.GameObjects.Image | null = null;
  private alienVelY = 0;
  private alienWobbleTween: Phaser.Tweens.Tween | null = null;
  private alienLabel: Phaser.GameObjects.Text | null = null;

  private letterButtons: LetterButton[] = [];
  private choiceLetters: LetterData[] = [];
  private correctLetter: LetterData | null = null;

  private score = 0;
  private lives = LIVES_MAX;
  private wave = 1;
  private correctCount = 0;
  private canAnswer = false;
  private mistakeWeights = new Map<string, number>();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(): void {
    this.score = 0;
    this.lives = LIVES_MAX;
    this.wave = 1;
    this.correctCount = 0;
    this.canAnswer = false;
    this.alien = null;
    this.alienLabel = null;
    this.alienWobbleTween = null;
    this.mistakeWeights.clear();
  }

  create(): void {
    const { width, height } = this.scale;

    this.background = this.add.tileSprite(0, 0, width, height, 'stars').setOrigin(0, 0);

    this.ship = this.add.image(width / 2, height - BTN_ZONE_HEIGHT - 70, 'player-ship');

    this.scene.launch('HUDScene');

    this.time.delayedCall(120, () => this.syncHUD());

    this.createLetterButtons();

    this.time.delayedCall(1200, () => this.spawnAlien());
  }

  // ─── HUD sync ────────────────────────────────────────────────────────────────

  private syncHUD(): void {
    const hud = this.scene.get('HUDScene');
    if (!hud) return;
    hud.events.emit('score-update', this.score);
    hud.events.emit('lives-update', this.lives);
    hud.events.emit('wave-update', this.wave);
  }

  // ─── Letter buttons ───────────────────────────────────────────────────────────

  private createLetterButtons(): void {
    const { width, height } = this.scale;
    const btnH = BTN_ZONE_HEIGHT - 14;
    const btnW = Math.floor((width - 20) / 3);
    const cy = height - BTN_ZONE_HEIGHT / 2 - 4;

    this.letterButtons = [];

    for (let i = 0; i < 3; i++) {
      const cx = 8 + btnW * i + btnW / 2;
      const w = btnW - 6;

      const bg = this.add.graphics();
      this.drawBtnBg(bg, cx, cy, w, btnH, false);

      const charText = this.add.text(cx, cy - 18, '', {
        fontSize: '54px',
        color: '#ffffff',
        fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
      }).setOrigin(0.5);

      const latinText = this.add.text(cx, cy + 44, '', {
        fontSize: '17px',
        color: '#aabbff',
        fontFamily: 'Arial',
      }).setOrigin(0.5);

      const zone = this.add.zone(cx, cy, w, btnH).setInteractive();

      const idx = i;
      zone.on('pointerdown', () => {
        if (!this.canAnswer) return;
        this.onButtonTap(idx);
      });
      zone.on('pointerover', () => this.drawBtnBg(bg, cx, cy, w, btnH, true));
      zone.on('pointerout', () => this.drawBtnBg(bg, cx, cy, w, btnH, false));

      this.letterButtons.push({ bg, charText, latinText, zone, cx, cy, w, h: btnH });
    }
  }

  private drawBtnBg(
    bg: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    w: number, h: number,
    hover: boolean
  ): void {
    bg.clear();
    bg.fillStyle(hover ? 0x2255cc : 0x102277, hover ? 0.95 : 0.85);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
    bg.lineStyle(2, hover ? 0x88aaff : 0x3355aa, 1);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
  }

  private resetBtnBg(idx: number): void {
    const btn = this.letterButtons[idx];
    if (btn) this.drawBtnBg(btn.bg, btn.cx, btn.cy, btn.w, btn.h, false);
  }

  private updateButtonLabels(): void {
    for (let i = 0; i < 3; i++) {
      const btn = this.letterButtons[i];
      const letter = this.choiceLetters[i];
      if (!btn || !letter) continue;
      btn.charText.setText(letter.char);
      btn.latinText.setText(letter.latin);
      btn.charText.setAlpha(1);
      btn.latinText.setAlpha(1);
      this.resetBtnBg(i);
    }
  }

  // ─── Letter pool / difficulty ─────────────────────────────────────────────────

  private availableLetters(): LetterData[] {
    const maxTier = this.wave < 4 ? 1 : this.wave < 7 ? 2 : 3;
    return LETTERS.filter(l => l.tier <= maxTier);
  }

  private pickCorrectLetter(): LetterData {
    const pool = this.availableLetters();
    const weights = pool.map(l => 1 + (this.mistakeWeights.get(l.char) ?? 0) * 2);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  private pickWrongLetters(correct: LetterData, count: number): LetterData[] {
    const pool = this.availableLetters().filter(l => l.char !== correct.char);
    return shuffle(pool).slice(0, count);
  }

  // ─── Alien spawning ───────────────────────────────────────────────────────────

  private spawnAlien(): void {
    if (this.alien) return;

    const { width } = this.scale;
    const correct = this.pickCorrectLetter();
    this.correctLetter = correct;

    const wrongs = this.pickWrongLetters(correct, 2);
    this.choiceLetters = shuffle([correct, ...wrongs]);
    this.updateButtonLabels();

    const x = Phaser.Math.Between(56, width - 56);
    this.alien = this.add.image(x, -60, 'alien');
    this.alienVelY = BASE_SPEED + (this.wave - 1) * 18;

    this.alienWobbleTween = this.tweens.add({
      targets: this.alien,
      x: x + Phaser.Math.Between(-35, 35),
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.alienLabel = this.add.text(x, -60 + 40, correct.char, {
      fontSize: '30px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
    }).setOrigin(0.5);

    this.canAnswer = true;
  }

  // ─── Input handling ───────────────────────────────────────────────────────────

  private onButtonTap(index: number): void {
    const chosen = this.choiceLetters[index];
    if (!chosen || !this.correctLetter) return;
    this.canAnswer = false;

    if (chosen.char === this.correctLetter.char) {
      this.handleCorrect(index);
    } else {
      this.handleWrong(index);
    }
  }

  private handleCorrect(btnIndex: number): void {
    this.flashButton(btnIndex, 0x44ff88);
    this.fireBullet();

    this.time.delayedCall(280, () => {
      this.destroyAlien(true);

      this.score += 10 * this.wave;
      this.correctCount++;

      if (this.correctCount % WAVE_SIZE === 0) {
        this.wave++;
        this.scene.get('HUDScene')?.events.emit('wave-update', this.wave);
        this.showWaveBanner();
      }

      this.scene.get('HUDScene')?.events.emit('score-update', this.score);

      this.time.delayedCall(550, () => this.spawnAlien());
    });
  }

  private handleWrong(btnIndex: number): void {
    this.flashButton(btnIndex, 0xff3333);

    const key = this.correctLetter!.char;
    this.mistakeWeights.set(key, (this.mistakeWeights.get(key) ?? 0) + 1);

    this.lives = Math.max(0, this.lives - 1);
    this.cameras.main.shake(280, 0.013);
    this.scene.get('HUDScene')?.events.emit('lives-update', this.lives);

    this.tweens.add({
      targets: this.ship,
      alpha: 0.15,
      duration: 80,
      yoyo: true,
      repeat: 4,
      onComplete: () => this.ship?.setAlpha(1),
    });

    if (this.lives <= 0) {
      this.time.delayedCall(500, () => this.endGame());
      return;
    }

    // Keep same alien — allow retry
    this.time.delayedCall(550, () => {
      this.canAnswer = true;
    });
  }

  private flashButton(index: number, color: number): void {
    const btn = this.letterButtons[index];
    if (!btn) return;
    const { cx, cy, w, h } = btn;
    btn.bg.clear();
    btn.bg.fillStyle(color, 0.9);
    btn.bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);

    this.time.delayedCall(300, () => this.resetBtnBg(index));
  }

  // ─── Bullet ───────────────────────────────────────────────────────────────────

  private fireBullet(): void {
    if (!this.alien) return;
    const sx = this.ship.x;
    const sy = this.ship.y - 28;
    const tx = this.alien.x;
    const ty = this.alien.y;

    const bullet = this.add.image(sx, sy, 'bullet');
    const angle = Phaser.Math.Angle.Between(sx, sy, tx, ty);
    bullet.setRotation(angle + Math.PI / 2);

    const dist = Phaser.Math.Distance.Between(sx, sy, tx, ty);
    const duration = Math.max((dist / 700) * 1000, 100);

    this.tweens.add({
      targets: bullet,
      x: tx,
      y: ty,
      duration,
      onComplete: () => bullet.destroy(),
    });
  }

  // ─── Alien destruction ────────────────────────────────────────────────────────

  private destroyAlien(withExplosion: boolean): void {
    if (this.alienWobbleTween) {
      this.alienWobbleTween.stop();
      this.alienWobbleTween = null;
    }
    if (this.alienLabel) {
      this.alienLabel.destroy();
      this.alienLabel = null;
    }

    if (!this.alien) return;

    if (withExplosion) {
      const x = this.alien.x;
      const y = this.alien.y;
      this.tweens.add({
        targets: this.alien,
        scaleX: 2.5,
        scaleY: 2.5,
        alpha: 0,
        duration: 240,
        onComplete: () => {
          this.alien?.destroy();
          this.alien = null;
        },
      });
      this.burstParticles(x, y);
    } else {
      this.alien.destroy();
      this.alien = null;
    }
    this.correctLetter = null;
  }

  private burstParticles(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = Phaser.Math.Between(28, 70);
      const p = this.add.image(x, y, 'particle');
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(280, 550),
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─── Wave banner ─────────────────────────────────────────────────────────────

  private showWaveBanner(): void {
    const { width, height } = this.scale;
    const txt = this.add.text(width / 2, height / 2 - 60, `Wave ${this.wave}!`, {
      fontSize: '58px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 6,
      fontFamily: 'Arial',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: 1,
      duration: 250,
      yoyo: true,
      hold: 900,
      onComplete: () => txt.destroy(),
    });
  }

  // ─── Game over ────────────────────────────────────────────────────────────────

  private endGame(): void {
    this.destroyAlien(false);
    this.scene.stop('HUDScene');
    this.scene.start('GameOverScene', { score: this.score, wave: this.wave });
  }

  // ─── Update loop ──────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    this.background.tilePositionY -= 1.5;

    if (this.alien) {
      this.alien.y += (this.alienVelY * delta) / 1000;

      if (this.alienLabel) {
        this.alienLabel.setPosition(this.alien.x, this.alien.y + 40);
      }

      const { height } = this.scale;
      if (this.alien.y > height + 60) {
        this.canAnswer = false;
        this.lives = Math.max(0, this.lives - 1);
        this.cameras.main.shake(280, 0.013);
        this.scene.get('HUDScene')?.events.emit('lives-update', this.lives);
        this.destroyAlien(false);

        if (this.lives <= 0) {
          this.endGame();
        } else {
          this.time.delayedCall(500, () => this.spawnAlien());
        }
      }
    }
  }
}

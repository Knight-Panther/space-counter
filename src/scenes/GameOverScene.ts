import * as Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score?: number; wave?: number }): void {
    this._score = data.score ?? 0;
    this._wave = data.wave ?? 1;
  }

  private _score = 0;
  private _wave = 1;

  create(): void {
    const { width, height } = this.scale;

    // Dimmed overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    this.add.text(width / 2, height * 0.28, 'GAME OVER', {
      fontSize: '52px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 6,
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.44, `Score: ${this._score}`, {
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.54, `Wave reached: ${this._wave}`, {
      fontSize: '24px',
      color: '#aaaaff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    const restartText = this.add.text(width / 2, height * 0.70, 'Tap to Play Again', {
      fontSize: '28px',
      color: '#44ff88',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restartText,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(width / 2, height * 0.80, 'Menu', {
      fontSize: '22px',
      color: '#888888',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard?.once('keydown', () => this.scene.start('MenuScene'));
  }
}

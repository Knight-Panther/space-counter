import * as Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.4, 'Game Over', {
      fontSize: '48px',
      color: '#ff4444',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.6, 'Tap to Restart', {
      fontSize: '24px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.stop('HUDScene');
      this.scene.start('GameScene');
    });
  }
}

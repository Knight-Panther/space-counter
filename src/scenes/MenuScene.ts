import * as Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.4, 'Space Counter', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.4 + 70, 'ქართული ანბანი', {
      fontSize: '28px',
      color: '#aaaaff',
    }).setOrigin(0.5);

    const startText = this.add.text(width / 2, height * 0.65, 'Tap to Play', {
      fontSize: '26px',
      color: '#44ff44',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}

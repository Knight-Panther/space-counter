import * as Phaser from 'phaser';

const LIVES_MAX = 3;

export class HUDScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    const { width } = this.scale;

    // Score — top left
    this.scoreText = this.add.text(14, 14, 'Score: 0', {
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial',
    });

    // Wave — top center
    this.waveText = this.add.text(width / 2, 14, 'Wave 1', {
      fontSize: '22px',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Lives — top right (heart icons)
    this.hearts = [];
    for (let i = 0; i < LIVES_MAX; i++) {
      const heart = this.add.image(width - 14 - i * 28, 20, 'heart').setOrigin(1, 0);
      this.hearts.push(heart);
    }

    // GameScene emits directly on this scene's event bus via hud.events.emit(...)
    this.events.on('score-update', (score: number) => {
      this.scoreText.setText(`Score: ${score}`);
    });
    this.events.on('lives-update', (lives: number) => {
      this.updateHearts(lives);
    });
    this.events.on('wave-update', (wave: number) => {
      this.waveText.setText(`Wave ${wave}`);
    });
  }

  private updateHearts(lives: number): void {
    this.hearts.forEach((heart, i) => {
      heart.setAlpha(i < lives ? 1 : 0.18);
    });
  }
}

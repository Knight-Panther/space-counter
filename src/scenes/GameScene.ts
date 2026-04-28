import * as Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.scene.launch('HUDScene');
  }

  update(): void {
    // Game loop — falling objects, input, collision
  }
}

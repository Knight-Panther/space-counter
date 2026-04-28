import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // All game assets are loaded here before gameplay starts
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}

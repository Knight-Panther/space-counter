import * as Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();

    // Player ship: blue-white triangle (40x56)
    gfx.fillStyle(0x88ccff);
    gfx.fillTriangle(20, 0, 0, 56, 40, 56);
    gfx.fillStyle(0xffffff);
    gfx.fillTriangle(20, 8, 10, 50, 30, 50);
    gfx.generateTexture('player-ship', 40, 56);
    gfx.clear();

    // Falling alien: orange blob (56x56)
    gfx.fillStyle(0xff6633);
    gfx.fillCircle(28, 28, 26);
    gfx.fillStyle(0xffcc00);
    gfx.fillCircle(28, 28, 18);
    gfx.fillStyle(0x220000);
    gfx.fillCircle(22, 24, 4);
    gfx.fillCircle(34, 24, 4);
    gfx.generateTexture('alien', 56, 56);
    gfx.clear();

    // Bullet: cyan laser (6x20)
    gfx.fillStyle(0x00eeff);
    gfx.fillRect(1, 0, 4, 20);
    gfx.fillStyle(0xffffff);
    gfx.fillRect(2, 0, 2, 8);
    gfx.generateTexture('bullet', 6, 20);
    gfx.clear();

    // Stars background (full canvas size)
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

    // Heart for lives (24x22)
    gfx.fillStyle(0xff4455);
    gfx.fillCircle(8, 8, 8);
    gfx.fillCircle(16, 8, 8);
    gfx.fillTriangle(0, 11, 12, 22, 24, 11);
    gfx.generateTexture('heart', 24, 22);
    gfx.clear();

    // Explosion particle dot (8x8)
    gfx.fillStyle(0xff8800);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle', 8, 8);
    gfx.clear();

    gfx.destroy();
    this.scene.start('MenuScene');
  }
}

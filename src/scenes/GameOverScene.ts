import * as Phaser from 'phaser';
import { GameMode } from '../data/types';

export class GameOverScene extends Phaser.Scene {
  private _score = 0;
  private _wave = 1;
  private _mode: GameMode = 'alphabet';

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score?: number; wave?: number; mode?: GameMode }): void {
    this._score = data.score ?? 0;
    this._wave  = data.wave  ?? 1;
    this._mode  = data.mode  ?? 'alphabet';
  }

  create(): void {
    const { width, height } = this.scale;
    const accentColor = this._mode === 'alphabet' ? 0x4488ff : 0xff8800;
    const accentHex   = this._mode === 'alphabet' ? '#4488ff' : '#ff8800';

    // Dimmed overlay with subtle nebula tint
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000011, 0.78);
    overlay.fillRect(0, 0, width, height);

    // Glowing panel
    const panelW = width * 0.84;
    const panelH = height * 0.56;
    const panelX = (width - panelW) / 2;
    const panelY = height * 0.18;
    const panel = this.add.graphics();
    panel.fillStyle(0x000033, 0.88);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
    panel.lineStyle(2, accentColor, 0.8);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

    // Game Over header
    this.add.text(width / 2, panelY + 32, 'GAME OVER', {
      fontSize: '44px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Mode badge
    this.add.text(width / 2, panelY + 90, this._mode === 'alphabet' ? '🔤 ALPHABET MODE' : '🔢 NUMBERS MODE', {
      fontSize: '16px',
      color: accentHex,
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Score
    this.add.text(width / 2, panelY + 138, `Score`, {
      fontSize: '18px',
      color: '#888899',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, panelY + 162, `${this._score}`, {
      fontSize: '52px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Wave reached
    this.add.text(width / 2, panelY + 230, `Wave reached: ${this._wave}`, {
      fontSize: '22px',
      color: accentHex,
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, accentColor, 0.35);
    div.lineBetween(panelX + 20, panelY + 272, panelX + panelW - 20, panelY + 272);

    // Tap to continue prompt
    const restartText = this.add.text(width / 2, panelY + 296, 'Tap to return to Main Menu', {
      fontSize: '20px',
      color: '#44ff88',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.tweens.add({
      targets: restartText,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // Short delay before accepting input (prevents accidental skip)
    this.time.delayedCall(800, () => {
      this.input.once('pointerdown', () => this.scene.start('MainMenuScene'));
      this.input.keyboard?.once('keydown', () => this.scene.start('MainMenuScene'));
    });
  }
}

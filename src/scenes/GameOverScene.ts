import * as Phaser from 'phaser';
import { GameMode } from '../data/types';

export class GameOverScene extends Phaser.Scene {
  private _score = 0;
  private _wave  = 1;
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
    const { width: w, height: h } = this.scale;
    const isAlpha   = this._mode === 'alphabet';
    const accent    = isAlpha ? 0x4488ff : 0xff8800;
    const accentHex = isAlpha ? '#4488ff' : '#ff8800';
    const GEO_FONT  = 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial';
    const isPremium = !!this.game.registry.get('isPremium');

    // Dim overlay
    this.add.graphics().fillStyle(0x000011, 0.78).fillRect(0, 0, w, h);

    // Layout — buttons at fixed offsets, panel height grows to include pro strip if needed
    const BTN1_Y = 256, BTN1_H = 52;
    const BTN2_Y = BTN1_Y + BTN1_H + 10, BTN2_H = 46;
    const STRIP_Y = BTN2_Y + BTN2_H + 16, STRIP_H = 60;

    const panelW = Math.min(w * 0.88, 420);
    const contentH = isPremium
      ? BTN2_Y + BTN2_H + 22
      : STRIP_Y + STRIP_H + 14;
    const panelH = Math.max(contentH, h * 0.55);
    const px = (w - panelW) / 2;
    const py = Math.max((h - panelH) / 2 - h * 0.04, h * 0.06);

    this.add.graphics()
      .fillStyle(0x000033, 0.88).fillRoundedRect(px, py, panelW, panelH, 20)
      .lineStyle(2, accent, 0.8).strokeRoundedRect(px, py, panelW, panelH, 20);

    // Title — auto-scales to fit inside panel width
    const title = this.add.text(w / 2, py + 24, 'პლანეტა Tvale დაეცა', {
      fontSize: '32px', color: '#ff4444',
      stroke: '#000000', strokeThickness: 5,
      fontStyle: 'bold', fontFamily: GEO_FONT,
    }).setOrigin(0.5, 0);
    const maxTW = panelW * 0.88;
    if (title.width > maxTW) title.setScale(maxTW / title.width);

    // Mode badge
    this.add.text(w / 2, py + 76, isAlpha ? '🔤 ანბანის მისია' : '🔢 ციფრების მისია', {
      fontSize: '15px', color: accentHex, fontFamily: GEO_FONT,
    }).setOrigin(0.5, 0);

    // Score
    this.add.text(w / 2, py + 112, 'ქულა', {
      fontSize: '15px', color: '#888899', fontFamily: GEO_FONT,
    }).setOrigin(0.5, 0);

    this.add.text(w / 2, py + 132, `${this._score}`, {
      fontSize: '52px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
      fontStyle: 'bold', fontFamily: 'Orbitron, Arial',
    }).setOrigin(0.5, 0);

    // Wave
    this.add.text(w / 2, py + 198, `გავლილი დონე: ${this._wave}`, {
      fontSize: '20px', color: accentHex,
      stroke: '#000000', strokeThickness: 3, fontFamily: GEO_FONT,
    }).setOrigin(0.5, 0);

    // Divider
    this.add.graphics()
      .lineStyle(1, accent, 0.35)
      .lineBetween(px + 20, py + 240, px + panelW - 20, py + 240);

    // Restart button
    this.addButton(w / 2, py + BTN1_Y, panelW * 0.78, BTN1_H,
      'თამაშის თავიდან დაწყება', 0x003311, 0x00aa44, '#aaffcc',
      () => this.scene.start('GameScene', { mode: this._mode }));

    // Main menu button
    this.addButton(w / 2, py + BTN2_Y, panelW * 0.72, BTN2_H,
      'მთავარ მენიუში დაბრუნება', 0x000a22, 0x224466, '#7799cc',
      () => this.scene.start('MainMenuScene'));

    // Pro version strip — inside the panel at the bottom, only for free users
    if (!isPremium) {
      this.add.graphics()
        .lineStyle(1, 0xffaa00, 0.25)
        .lineBetween(px + 20, py + STRIP_Y - 4, px + panelW - 20, py + STRIP_Y - 4);

      this.add.text(w / 2, py + STRIP_Y, '⭐  პრო ვერსია', {
        fontSize: '14px', color: '#ffdd00', fontStyle: 'bold', fontFamily: GEO_FONT,
      }).setOrigin(0.5, 0);

      const proBtn = this.add.text(w / 2, py + STRIP_Y + 28,
        'გახსენით სრული ციფრები და ასო-ბგერები  ›', {
        fontSize: '12px', color: '#aaccff', fontFamily: GEO_FONT,
        wordWrap: { width: panelW * 0.86 }, align: 'center',
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

      this.tweens.add({ targets: proBtn, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
      proBtn.on('pointerdown', () => this.scene.launch('PaywallScene'));
    }
  }

  private addButton(
    cx: number, cy: number, bw: number, bh: number,
    label: string, fill: number, border: number, textColor: string,
    onTap: () => void,
  ): void {
    const gfx = this.add.graphics()
      .fillStyle(fill, 1).fillRoundedRect(cx - bw / 2, cy, bw, bh, 10)
      .lineStyle(1.5, border, 0.9).strokeRoundedRect(cx - bw / 2, cy, bw, bh, 10);

    const lbl = this.add.text(cx, cy + bh / 2, label, {
      fontSize: '15px', color: textColor, fontStyle: 'bold',
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
    }).setOrigin(0.5);
    // Scale button label if it overflows button width
    if (lbl.width > bw * 0.88) lbl.setScale((bw * 0.88) / lbl.width);

    this.add.zone(cx, cy + bh / 2, bw, bh).setInteractive()
      .on('pointerover',  () => gfx.setAlpha(0.7))
      .on('pointerout',   () => gfx.setAlpha(1.0))
      .on('pointerdown',  onTap);
  }
}

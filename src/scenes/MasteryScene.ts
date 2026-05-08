import * as Phaser from 'phaser';
import { GameMode } from '../data/types';
import { LETTERS } from '../data/letters';
import { NUMBERS } from '../data/numbers';
import { FREE_LETTER_COUNT } from '../data/freeContent';

export class MasteryScene extends Phaser.Scene {
  constructor() { super({ key: 'MasteryScene' }); }

  create(data: { mode: GameMode }): void {
    const mode = data?.mode ?? (this.game.registry.get('mode') as GameMode) ?? 'alphabet';
    const { width: w, height: h } = this.scale;

    // Dim underlay
    this.add.graphics().fillStyle(0x000011, 0.88).fillRect(0, 0, w, h);

    const panelW = Math.min(w * 0.92, 420);
    const px = (w - panelW) / 2;
    const py = h * 0.06;
    const panelH = h * 0.86;

    this.add.graphics()
      .fillStyle(0x000833, 0.96)
      .fillRoundedRect(px, py, panelW, panelH, 20)
      .lineStyle(2, 0xffdd00, 0.85)
      .strokeRoundedRect(px, py, panelW, panelH, 20);

    const isAlphabet = mode === 'alphabet';
    const title = isAlphabet ? 'You\'ve mastered the basics!' : 'Number Master!';
    const contentItems = isAlphabet
      ? LETTERS.slice(0, FREE_LETTER_COUNT)
      : NUMBERS.filter(n => n.tier === 1);

    // Title
    this.add.text(w / 2, py + 28, title, {
      fontSize: '22px', color: '#ffdd00', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
      fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
      wordWrap: { width: panelW - 32 }, align: 'center',
    }).setOrigin(0.5, 0);

    // Stars subtitle
    this.add.text(w / 2, py + 72, '★ ★ ★', {
      fontSize: '28px', color: '#ffdd00',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Grid of learned items with star badges
    const gridTop = py + 118;
    const cols    = isAlphabet ? 4 : 5;
    const cellW   = (panelW - 24) / cols;
    const cellH   = isAlphabet ? 56 : 50;

    contentItems.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = px + 12 + col * cellW + cellW / 2;
      const cy  = gridTop + row * cellH + cellH / 2;

      this.add.graphics()
        .fillStyle(0x001144, 0.90)
        .fillRoundedRect(cx - cellW / 2 + 3, cy - cellH / 2 + 3, cellW - 6, cellH - 6, 8)
        .lineStyle(1, 0x2255aa, 0.60)
        .strokeRoundedRect(cx - cellW / 2 + 3, cy - cellH / 2 + 3, cellW - 6, cellH - 6, 8);

      const label = isAlphabet ? item.char : (item.display ?? item.char);
      this.add.text(cx, cy - 6, label, {
        fontSize: isAlphabet ? '22px' : '16px', color: '#ffffff',
        fontFamily: 'Noto Sans Georgian, Arial Unicode MS, Arial',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 0.5);

      this.add.text(cx + cellW / 2 - 10, cy - cellH / 2 + 8, '★', {
        fontSize: '12px', color: '#ffdd00', fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5);
    });

    const gridRows = Math.ceil(contentItems.length / cols);
    const ctaTop   = gridTop + gridRows * cellH + 20;

    // CTA button
    const ctaLabel = isAlphabet ? 'Unlock the Full Georgian Alphabet' : 'Unlock Numbers 11–20';
    const ctaBtn   = this.add.text(w / 2, ctaTop, ctaLabel, {
      fontSize: '16px', color: '#000000', fontStyle: 'bold',
      backgroundColor: '#ffdd00',
      padding: { x: 18, y: 11 },
      fontFamily: 'Orbitron, Arial',
      wordWrap: { width: panelW - 40 }, align: 'center',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    ctaBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.launch('PaywallScene');
    });

    // Keep Playing button
    const keepY = ctaTop + (ctaBtn.height ?? 50) + 18;
    this.add.text(w / 2, keepY, 'Keep Playing', {
      fontSize: '15px', color: '#88aacc',
      fontFamily: 'Orbitron, Arial',
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.dismiss());
  }

  private dismiss(): void {
    this.events.emit('mastery-dismissed');
    this.scene.stop();
  }
}

import * as Phaser from 'phaser';
import { GameMode } from '../data/types';
import { LETTERS } from '../data/letters';
import { NUMBERS } from '../data/numbers';
import { FREE_LETTER_COUNT } from '../data/freeContent';

interface CompletionData {
  mode:            GameMode;
  score:           number;
  wave:            number;
  appearanceCount: Record<string, number>;
}

export class CompletionScene extends Phaser.Scene {
  constructor() { super({ key: 'CompletionScene' }); }

  create(data: CompletionData): void {
    const mode   = data?.mode ?? 'alphabet';
    const score  = data?.score ?? 0;
    const counts = data?.appearanceCount ?? {};
    const isPremium = !!this.game.registry.get('isPremium');
    const { width: w, height: h } = this.scale;

    // Victory particle burst (gold/white)
    this.burstVictoryParticles(w, h);

    // Background dim
    this.add.graphics().fillStyle(0x000011, 0.80).fillRect(0, 0, w, h);

    const isAlphabet = mode === 'alphabet';
    const allItems   = isAlphabet ? LETTERS : NUMBERS;
    const freeItems  = isAlphabet
      ? LETTERS.slice(0, FREE_LETTER_COUNT)
      : NUMBERS.filter(n => n.tier === 1);
    const shownItems = isPremium ? allItems : freeItems;

    // Banner
    const bannerLine1 = isAlphabet
      ? 'Georgian Alphabet Complete!'
      : 'Number Master!';
    const bannerLine2 = isAlphabet
      ? 'ქართული ანბანი — დასრულებულია!'
      : 'რიცხვების ოსტატი!';

    this.add.text(w / 2, h * 0.04, bannerLine1, {
      fontSize: '26px', color: '#ffdd00', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
      fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
      wordWrap: { width: w * 0.92 }, align: 'center',
    }).setOrigin(0.5, 0);

    this.add.text(w / 2, h * 0.04 + 40, bannerLine2, {
      fontSize: '17px', color: '#aaccff',
      stroke: '#000000', strokeThickness: 3,
      fontFamily: 'Noto Sans Georgian, Arial Unicode MS, Arial',
      wordWrap: { width: w * 0.92 }, align: 'center',
    }).setOrigin(0.5, 0);

    this.add.text(w / 2, h * 0.04 + 70, `Score: ${score}`, {
      fontSize: '15px', color: '#88aacc',
      fontFamily: 'Orbitron, Arial',
    }).setOrigin(0.5, 0);

    // Item grid
    const gridTop = h * 0.04 + 104;
    const cols    = isAlphabet ? 5 : 5;
    const panelW  = Math.min(w * 0.96, 440);
    const gx      = (w - panelW) / 2;
    const cellW   = panelW / cols;
    const cellH   = 52;

    shownItems.forEach((item, i) => {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const cx   = gx + col * cellW + cellW / 2;
      const cy   = gridTop + row * cellH + cellH / 2;
      const seen = counts[item.char] ?? 0;

      this.add.graphics()
        .fillStyle(0x001144, 0.88)
        .fillRoundedRect(cx - cellW / 2 + 3, cy - cellH / 2 + 3, cellW - 6, cellH - 6, 7)
        .lineStyle(1, seen > 0 ? 0x4488ff : 0x223355, 0.70)
        .strokeRoundedRect(cx - cellW / 2 + 3, cy - cellH / 2 + 3, cellW - 6, cellH - 6, 7);

      const label = isAlphabet ? item.char : (item.display ?? item.char);
      this.add.text(cx, cy - 6, label, {
        fontSize: isAlphabet ? '20px' : '14px', color: seen > 0 ? '#ffffff' : '#445566',
        fontFamily: 'Noto Sans Georgian, Arial Unicode MS, Arial',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 0.5);

      if (seen > 0) {
        this.add.text(cx + cellW / 2 - 8, cy - cellH / 2 + 7, `×${seen}`, {
          fontSize: '9px', color: '#ffdd44', fontFamily: 'Orbitron, Arial',
        }).setOrigin(0.5, 0.5);
      }
    });

    const gridRows  = Math.ceil(shownItems.length / cols);
    const buttonsY  = gridTop + gridRows * cellH + 18;

    if (!isPremium) {
      // Upsell CTA
      const ctaLabel = isAlphabet
        ? 'Unlock the full Georgian alphabet'
        : 'Unlock Numbers 11–20';
      const cta = this.add.text(w / 2, buttonsY, ctaLabel, {
        fontSize: '15px', color: '#000000', fontStyle: 'bold',
        backgroundColor: '#ffdd00',
        padding: { x: 16, y: 10 },
        fontFamily: 'Orbitron, Arial',
        wordWrap: { width: w * 0.80 }, align: 'center',
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      cta.on('pointerdown', () => {
        this.scene.stop();
        this.scene.launch('PaywallScene');
      });

      this.add.text(w / 2, buttonsY + (cta.height ?? 44) + 14, 'Main Menu', {
        fontSize: '14px', color: '#6688aa',
        fontFamily: 'Orbitron, Arial', padding: { x: 12, y: 8 },
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('MainMenuScene'));
    } else {
      // Play Again + Main Menu
      this.add.text(w / 2 - 70, buttonsY, 'Play Again', {
        fontSize: '15px', color: '#000000', fontStyle: 'bold',
        backgroundColor: '#ffdd00',
        padding: { x: 14, y: 10 },
        fontFamily: 'Orbitron, Arial',
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('GameScene', { mode }));

      this.add.text(w / 2 + 70, buttonsY, 'Main Menu', {
        fontSize: '15px', color: '#aaccff',
        fontFamily: 'Orbitron, Arial', padding: { x: 14, y: 10 },
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('MainMenuScene'));
    }
  }

  private burstVictoryParticles(w: number, h: number): void {
    const colors = [0xffdd00, 0xffffff, 0xffaa00, 0x88ffcc];
    for (let i = 0; i < 40; i++) {
      const x     = Math.random() * w;
      const y     = Math.random() * h * 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p     = this.add.image(x, y, 'particle').setTint(color).setAlpha(0.9).setDepth(1);
      this.tweens.add({
        targets: p,
        x: x + (Math.random() - 0.5) * 160,
        y: y + Math.random() * 200,
        alpha: 0, scale: 0.2,
        duration: Phaser.Math.Between(600, 1400),
        delay: Math.random() * 600,
        onComplete: () => p.destroy(),
      });
    }
  }
}

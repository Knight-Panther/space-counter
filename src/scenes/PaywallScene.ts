import * as Phaser from 'phaser';
import { PremiumManager } from '../iap/PremiumManager';
import { FREE_LETTER_COUNT } from '../data/freeContent';
import { LETTERS } from '../data/letters';

export class PaywallScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private isPurchasing = false;

  constructor() { super({ key: 'PaywallScene' }); }

  create(): void {
    const { width: w, height: h } = this.scale;
    const mgr = PremiumManager.get(this.game);

    // Full-screen dim — scene underneath stays alive
    this.add.graphics().fillStyle(0x000011, 0.88).fillRect(0, 0, w, h);

    const panelW = Math.min(w * 0.90, 400);
    const panelH = h * 0.74;
    const px = (w - panelW) / 2;
    const py = h * 0.10;

    this.add.graphics()
      .fillStyle(0x000833, 0.96)
      .fillRoundedRect(px, py, panelW, panelH, 18)
      .lineStyle(2, 0x4488ff, 0.90)
      .strokeRoundedRect(px, py, panelW, panelH, 18);

    // Close button
    this.add.text(px + panelW - 18, py + 18, '✕', {
      fontSize: '22px', color: '#446688', fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.stop());

    // Title
    this.add.text(w / 2, py + 26, 'სრული თამაში', {
      fontSize: '30px', color: '#ffdd00', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
    }).setOrigin(0.5, 0);

    this.add.text(w / 2, py + 70, 'Full Game Unlock', {
      fontSize: '15px', color: '#6699bb', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Free vs premium comparison
    const freeLetters  = LETTERS.slice(0, FREE_LETTER_COUNT).map(l => l.char).join(' ');
    const lockedCount  = LETTERS.length - FREE_LETTER_COUNT;
    this.add.text(w / 2, py + 108, [
      `✓ Free:  ${freeLetters}`,
      `★ Full:  + ${lockedCount} more letters  +  numbers 11–20`,
    ].join('\n'), {
      fontSize: '14px', color: '#aaccee',
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
      align: 'center', lineSpacing: 10,
    }).setOrigin(0.5, 0);

    // Divider
    this.add.graphics().lineStyle(1, 0x224466, 0.7)
      .lineBetween(px + 24, py + 182, px + panelW - 24, py + 182);

    // Price
    this.add.text(w / 2, py + 200, mgr.getProductPrice(), {
      fontSize: '46px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4, fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.add.text(w / 2, py + 256, 'ერთჯერადი გადახდა  ·  one-time purchase', {
      fontSize: '12px', color: '#556677', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Buy button
    this.buildButton(w / 2, py + 296, panelW * 0.76, 54,
      '★  შეიძინე  /  Buy', 0x0044cc, 0x0088ff,
      () => this.onBuyTap(mgr));

    // Restore button
    this.buildButton(w / 2, py + 368, panelW * 0.56, 38,
      'Restore Purchases', 0x001133, 0x224466,
      () => this.onRestoreTap(mgr));

    // Status / error line
    this.statusText = this.add.text(w / 2, py + 422, '', {
      fontSize: '14px', color: '#ffcc44', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // Auto-close when premium activates (e.g. from this scene or restored elsewhere)
    this.game.events.once('premium-changed', () => {
      this.statusText.setText('გახსნილია!  ✓  Unlocked!').setColor('#00ff88');
      this.time.delayedCall(1200, () => { if (this.scene.isActive()) this.scene.stop(); });
    });
  }

  private buildButton(
    cx: number, cy: number, bw: number, bh: number,
    label: string, fill: number, border: number,
    onTap: () => void,
  ): void {
    const gfx = this.add.graphics()
      .fillStyle(fill, 1).fillRoundedRect(cx - bw / 2, cy, bw, bh, 10)
      .lineStyle(2, border, 1).strokeRoundedRect(cx - bw / 2, cy, bw, bh, 10);

    this.add.text(cx, cy + bh / 2, label, {
      fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
      fontFamily: 'Arial Unicode MS, Noto Sans Georgian, Arial',
    }).setOrigin(0.5);

    this.add.zone(cx, cy + bh / 2, bw, bh).setInteractive()
      .on('pointerover',  () => gfx.setAlpha(0.75))
      .on('pointerout',   () => gfx.setAlpha(1.0))
      .on('pointerdown',  onTap);
  }

  private async onBuyTap(mgr: PremiumManager): Promise<void> {
    if (this.isPurchasing) return;
    this.isPurchasing = true;
    this.statusText.setText('...').setColor('#ffdd44');
    const result = await mgr.purchasePremium();
    this.isPurchasing = false;
    if (!result.success && result.error) {
      this.statusText.setText(result.error).setColor('#ff4444');
    }
    // On success, 'premium-changed' fires above → auto-closes
  }

  private async onRestoreTap(mgr: PremiumManager): Promise<void> {
    this.statusText.setText('Restoring...').setColor('#ffdd44');
    const result = await mgr.restorePurchases();
    if (!result.restored) {
      this.statusText.setText(result.error ?? 'No purchases found').setColor('#ff7777');
    }
  }
}

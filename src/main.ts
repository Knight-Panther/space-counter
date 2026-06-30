import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { StoryScene } from './scenes/StoryScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { GameOverScene } from './scenes/GameOverScene';
import { PaywallScene } from './scenes/PaywallScene';
import { MasteryScene } from './scenes/MasteryScene';
import { CompletionScene } from './scenes/CompletionScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000011',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  scene: [BootScene, PreloaderScene, MainMenuScene, StoryScene, GameScene, HUDScene, GameOverScene, PaywallScene, MasteryScene, CompletionScene],
};

// Ensure bundled fonts are rasterized before Phaser paints any text to the
// canvas — otherwise Georgian glyphs fall back to a system font (or tofu
// boxes on devices without Noto Georgian) on first render. The HTML loading
// screen covers this brief wait.
async function boot(): Promise<void> {
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('700 16px Orbitron'),
        document.fonts.load('400 16px "Noto Sans Georgian"'),
        document.fonts.load('700 16px "Noto Sans Georgian"'),
      ]);
    } catch { /* fall back to system fonts */ }
  }
  new Phaser.Game(config);
}

void boot();

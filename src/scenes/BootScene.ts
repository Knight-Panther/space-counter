import * as Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PremiumManager } from '../iap/PremiumManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {}

  async create(): Promise<void> {
    await PremiumManager.init(this.game);

    // Re-sync premium state whenever the app comes back from background
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) PremiumManager.get(this.game).syncEntitlements();
      });
    }

    this.scene.start('PreloaderScene');
  }
}

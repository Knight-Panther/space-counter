import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import type * as Phaser from 'phaser';

export interface PurchaseResult { success: boolean; error?: string; }
export interface RestoreResult  { restored: boolean; error?: string; }

const REGISTRY_KEY           = '_premiumManager';
const PREF_KEY               = 'premium_unlocked';
const ENTITLEMENT_ID         = 'premium';
const REVENUECAT_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_KEY';

// ─── FREE BUILD ──────────────────────────────────────────────────────────────
// v1 ships 100% free: every letter and number is unlocked, there are no in-app
// purchases, and no paywall/Unlock/Restore UI is ever shown. The entire IAP
// architecture below stays intact but DORMANT — nothing is deleted.
//
// To re-enable the premium/paywall flow in a future version:
//   1. set FREE_BUILD = false
//   2. replace REVENUECAT_KEY_ANDROID with a real RevenueCat key
//      (requires a Google Play merchant account — NOT available from a Georgian
//       payments profile; needs a foreign entity e.g. Estonia OÜ / US LLC).
const FREE_BUILD = true;

export class PremiumManager {
  private game: Phaser.Game;
  private _isPremium   = false;
  private _productPrice = '₾3.00';
  private _initialized = false;

  private constructor(game: Phaser.Game) { this.game = game; }

  // ─── Init (called once in BootScene) ────────────────────────────────────────

  static async init(game: Phaser.Game): Promise<PremiumManager> {
    const existing = game.registry.get(REGISTRY_KEY) as PremiumManager | undefined;
    if (existing?._initialized) return existing;

    const mgr = new PremiumManager(game);
    game.registry.set(REGISTRY_KEY, mgr);

    // Free build: unlock everything, skip RevenueCat/Preferences entirely.
    if (FREE_BUILD) {
      mgr._isPremium = true;
      game.registry.set('isPremium', true);
      mgr._initialized = true;
      return mgr;
    }

    game.registry.set('isPremium', false);

    // 1. Restore persisted state immediately so the UI never flickers
    const { value } = await Preferences.get({ key: PREF_KEY });
    if (value === 'true') {
      mgr._isPremium = true;
      game.registry.set('isPremium', true);
    }

    // 2. Re-validate with RevenueCat on native (async — does not block scene start)
    if (Capacitor.isNativePlatform()) {
      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
        await Purchases.configure({ apiKey: REVENUECAT_KEY_ANDROID });
        await mgr._syncEntitlements();
      } catch (e) {
        // Falls back to cached Preferences state — works offline
        console.warn('[PremiumManager] RevenueCat init failed, using cached state', e);
      }
    }

    mgr._initialized = true;
    return mgr;
  }

  // ─── Sync (called on app resume) ────────────────────────────────────────────

  async syncEntitlements(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try { await this._syncEntitlements(); } catch { /* silent — offline */ }
  }

  // ─── Public accessors ────────────────────────────────────────────────────────

  static get(game: Phaser.Game): PremiumManager {
    return game.registry.get(REGISTRY_KEY) as PremiumManager;
  }

  isPremium(): boolean { return this._isPremium; }

  getProductPrice(): string { return this._productPrice; }

  // ─── Purchase ────────────────────────────────────────────────────────────────

  async purchasePremium(): Promise<PurchaseResult> {
    if (!Capacitor.isNativePlatform()) {
      // Dev/browser mode — simulate purchase
      await this._setPremium(true);
      return { success: true };
    }
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) return { success: false, error: 'No package available' };
      await Purchases.purchasePackage({ aPackage: pkg });
      await this._syncEntitlements();
      return { success: this._isPremium };
    } catch (e: any) {
      if (e?.code === 'PURCHASE_CANCELLED') return { success: false };
      return { success: false, error: String(e?.message ?? e) };
    }
  }

  // ─── Restore ─────────────────────────────────────────────────────────────────

  async restorePurchases(): Promise<RestoreResult> {
    if (!Capacitor.isNativePlatform()) return { restored: false };
    try {
      await Purchases.restorePurchases();
      await this._syncEntitlements();
      return { restored: this._isPremium };
    } catch (e: any) {
      return { restored: false, error: String(e?.message ?? e) };
    }
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private async _syncEntitlements(): Promise<void> {
    const info   = await Purchases.getCustomerInfo();
    const active = info.customerInfo.entitlements.active;
    await this._setPremium(ENTITLEMENT_ID in active);

    // Cache localised price while we have a connection
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (pkg) this._productPrice = pkg.product.priceString;
    } catch { /* keep fallback price */ }
  }

  private async _setPremium(value: boolean): Promise<void> {
    this._isPremium = value;
    this.game.registry.set('isPremium', value);
    await Preferences.set({ key: PREF_KEY, value: String(value) });
    if (value) this.game.events.emit('premium-changed', true);
  }
}

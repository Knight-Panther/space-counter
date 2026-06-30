# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Space-Counter — Georgian Alphabet Learning Game

## Project Overview
A 2D educational mobile game for kids learning the Georgian alphabet (ქართული ანბანი). A spaceship controlled by the player must shoot falling objects by correctly identifying Georgian letters. Three letter options appear at the bottom — tap the correct one to fire and destroy the falling object. Wrong answer = damage/collapse.

## Commands
```bash
npm run dev          # Vite dev server with hot reload — test in Chrome DevTools (Pixel 5 viewport)
npm run build        # Production build to dist/
npm run typecheck    # tsc --noEmit — catches type errors without building
npm run preview      # Serve the dist/ build locally

# Android
npx cap sync android && npx cap open android   # Build + open in Android Studio
```

## CI / CD — GitHub Actions

Live URL: **https://knight-panther.github.io/space-counter/**

Two workflow files in `.github/workflows/`:

### `deploy.yml` — runs on every push to `main`
```
typecheck (tsc --noEmit)
    ↓ passes
build-and-deploy (npm run build → GitHub Pages)
```
- Typecheck gates the deploy — a type error blocks the push from going live
- Build artifact uploaded to GitHub Pages automatically

### `claude-auto-fix.yml` — runs when CI fails on a PR
```
CI fails on a PR branch
    ↓
Claude reads the error logs
    ↓
Claude creates branch  claude-auto-fix-ci-<branch>-<run-id>
    ↓
Claude opens a PR with the fix — you review and merge
```
- Only triggers on PR branches, never on direct pushes to `main`
- Requires `ANTHROPIC_API_KEY` secret set in repo Settings → Secrets → Actions
- Does NOT auto-merge — always produces a PR for human review

**Required GitHub repo settings:**
- Settings → Pages → Source = **GitHub Actions**
- Settings → Secrets → Actions → `ANTHROPIC_API_KEY` (Anthropic console key)

## Tech Stack
- **Engine**: Phaser 4.0.0 (latest stable)
- **Language**: TypeScript ^6.0.0 (strict mode — `noUnusedLocals` and `noUnusedParameters` enforced)
- **Bundler**: Vite ^8.0.0 (Phaser split into its own chunk via `manualChunks`)
- **Mobile**: Capacitor ^8.3.1 (Android target)
- **IAP**: @revenuecat/purchases-capacitor ^13.0.1
- **Storage**: @capacitor/preferences ^8.0.1
- **Ads**: @capacitor-community/admob ^8.0.0 — planned, not yet installed
- **No framework** (no React, no Vue — vanilla Phaser + TS)

## Scene Flow
Scenes start sequentially; `HUDScene` launches in **parallel** (additive) alongside `GameScene`:

```
BootScene → PreloaderScene → MainMenuScene → StoryScene → GameScene
                                                ↕                ↕ (parallel)
                                           PaywallScene      HUDScene
                                                         → GameOverScene
                                                         → MasteryScene
                                                         → CompletionScene
```

- **BootScene** — initializes `PremiumManager`, registers Capacitor `appStateChange` listener, starts `PreloaderScene`
- **PreloaderScene** — loads all assets (images, spritesheets, audio) — the only place assets are loaded
- **MainMenuScene** — mode select (alphabet / numbers); can launch `PaywallScene` as overlay
- **StoryScene** — intro cutscene before gameplay
- **GameScene** — core gameplay loop; starts `HUDScene` as a parallel scene via `this.scene.launch('HUDScene', { mode })`
- **HUDScene** — runs alongside GameScene; communicates via `this.scene.get('GameScene').events`
- **GameOverScene / MasteryScene / CompletionScene** — end-state screens

## Architecture Rules
- One scene per file in `src/scenes/`
- Scene naming: PascalCase ending in "Scene" (e.g., `GameScene.ts`, `MenuScene.ts`)
- All game state lives in the active scene — no shared mutable `GameState` singleton (premium state is the only cross-scene singleton)
- Never use deprecated Phaser 3 APIs — this is Phaser 4
- All assets loaded in `PreloaderScene` — never load mid-gameplay
- All audio files in `public/audio/`, all images in `public/images/`
- Use Phaser's Scene lifecycle: `init()`, `preload()`, `create()`, `update()`

## Game Modes & Data Flow
`GameMode = 'alphabet' | 'numbers'` (defined in `src/data/types.ts`) flows from `MainMenuScene` → `StoryScene` → `GameScene` → `HUDScene` via scene `init(data)`.

- **Alphabet mode**: 33 Georgian letters from `src/data/letters.ts`, introduced per `ALPHABET_CURRICULUM` map (wave → new chars)
- **Numbers mode**: 20 Georgian number words from `src/data/numbers.ts`, introduced per `NUMBERS_CURRICULUM` map

Both curricula live in `src/data/curriculum.ts`. Free/premium content is filtered at runtime in `GameScene` using `FREE_LETTER_COUNT = 12` (from `src/data/freeContent.ts`) and the `tier` field on `ItemData`.

## Wave & Boss System
Waves are configured in `GameScene.ts` via `WAVES: WaveCfg[]` (30 waves defined). Each `WaveCfg` has:
- `bossReq` — correct kills required to trigger the wave boss
- `spawnMs` — milliseconds between enemy spawns
- `greenPct` / `bluePct` — probability of green/blue enemy variants
- `enemySpeed` — falling speed in px/s
- `bossType` — one of `'ship-b' | 'slime' | 'wizard' | 'demon' | 'ship-top'`
- `slots` — derived as `Math.min(6, bossReq + 2)`, ties pool size to boss complexity

Each boss type is defined in `BOSS_DEFS` with spawn texture, idle/enter/shoot/retreat animations, bullet config, and death style.

## Georgian Alphabet Data
33 letters: ა ბ გ დ ე ვ ზ თ ი კ ლ მ ნ ო პ ჟ რ ს ტ უ ფ ქ ღ ყ შ ჩ ც ძ წ ჭ ხ ჯ ჰ

`ItemData` (the shared type used for both letters and numbers, `src/data/types.ts`):
```typescript
export interface ItemData {
  char: string;      // Georgian character or number word (shown on answer buttons)
  latin: string;     // Latin transliteration shown as hint
  audioKey: string;  // Phaser audio key
  display: string;   // Text on the falling alien (char for letters, Arabic numeral for numbers)
  tier: 1 | 2 | 3;  // Difficulty — also used for free/premium gating
}
```

`LetterData` in `src/data/letters.ts` is the letter-specific shape (same fields minus `display`).

## PremiumManager
Singleton stored on `game.registry` under `'_premiumManager'`. Premium boolean is mirrored to `game.registry.get('isPremium')` for quick reads from any scene.

```typescript
// Read premium anywhere
const isPremium = this.game.registry.get('isPremium') as boolean;

// Call purchase/restore from PaywallScene
const mgr = PremiumManager.get(this.game);
await mgr.purchasePremium();
```

`PremiumManager.init()` is called once in `BootScene`. It immediately restores the cached `Preferences` state (no flicker), then re-validates with RevenueCat async (falls back gracefully if offline).

## Imports
Phaser 4 has no default export — always use the namespace import:
```typescript
import * as Phaser from 'phaser';   // correct
import Phaser from 'phaser';        // WRONG — build error
```

## Input
- Touch-first design (target is mobile)
- Three large tap zones at bottom for letter selection
- All touch targets minimum 48x48dp for accessibility

## Audio
- Georgian letter/number pronunciation: pre-recorded MP3 files in `public/audio/`
- Sound effects: synthesized via Phaser's Web Audio
- Respect device mute switch via Capacitor

## Monetization

### v1 ships FREE — IAP dormant
- **`FREE_BUILD = true`** in `src/iap/PremiumManager.ts` forces `isPremium = true` at boot, so ALL
  content unlocks and every Unlock/Restore/Paywall element is hidden (each is gated on the
  `isPremium` registry flag). RevenueCat is skipped entirely. Nothing is deleted.
- Reason: a Georgian payments profile cannot be a Google Play **merchant**, so Play Billing IAP
  can't pay out. Re-enable in v2 (set `FREE_BUILD = false` + a real RevenueCat key) once a foreign
  entity (Estonia OÜ / US LLC) provides a supported merchant payments profile.

### IAP — implemented but dormant (returns in v2)
- Free tier: first 12 letters (ა–მ, `FREE_LETTER_COUNT = 12`) + numbers 1–10 (tier 1)
- Premium: ₾3.00 one-time purchase unlocks all 33 letters + numbers 11–20 + disables ads
- Purchase flow: Google Play Billing via RevenueCat (`PremiumManager` singleton in `src/iap/`)
- Paywall UI: `PaywallScene` launched as overlay from `MainMenuScene`, `GameOverScene`, or any scene

### Ads — not yet implemented
- Gate every ad call: `if (this.game.registry.get('isPremium')) return`

## Performance Guidelines
- Target 60fps on mid-range Android devices
- Compress all PNG assets (max 512x512 per sprite)
- Audio files: MP3, mono, 22050Hz, ~50KB per letter clip
- Object pool falling objects — don't create/destroy every frame
- Maximum 50 simultaneous game objects on screen

## File Naming Conventions
- Scenes: PascalCase (`GameScene.ts`)
- Data files: camelCase (`letters.ts`, `gameConfig.ts`)
- Assets: kebab-case (`alien-creature.png`, `letter-a.mp3`)
- Constants: UPPER_SNAKE_CASE

## Asset Index
- Master inventory lives in `assetIndex.json` at the project root
- **Update rule:** whenever a new asset is dropped into `public/` AND wired up in `src/scenes/PreloaderScene.ts`, update `assetIndex.json`: flip `"status"` to `"present"`, fill in `"size"`, and add the scene name to `"usedIn"`
- `"Legacy Collection"` folder in `public/` is excluded from the index — study separately before promoting any asset

## Pending / Follow-up

### Before shipping to Play Store (v1 — FREE)
- [ ] Release signing: generate upload keystore (Android Studio wizard), enable Play App Signing
- [ ] `npm run build && npx cap sync android` to push web assets into the native project
- [ ] Compress `public/preview.png` (2.8 MB web social card — ships dead-weight in the AAB)
- [x] All 33 letter MP3s present in `public/audio/`
- [x] All 20 number MP3s present in `public/audio/`
- [x] 4 SFX added: `sfx-laser`, `sfx-wrong`, `sfx-alien-appear`, `sfx-button` (synth, 2026-06-30)
- [x] Georgian + Orbitron fonts bundled offline (`public/fonts/`, `@font-face` in index.html)
- [x] Privacy policy page (`public/privacy.html`)
- [ ] Compress `tina.png` (~322 KB) — optional

### Deferred to v2 (monetization — needs foreign merchant entity first)
- [ ] Set `FREE_BUILD = false` and replace `'goog_REPLACE_WITH_YOUR_KEY'` in `PremiumManager.ts` with real RevenueCat key
- [ ] Play Console: create in-app product `com.telo.spacecounter.premium_full`, set Active
- [ ] RevenueCat dashboard: entitlement `premium` linked to product, copy API key
- [ ] `npx cap sync android` after the above
- [ ] Add `NotoSansGeorgian-Regular.ttf` to `public/fonts/` (see todoList.md for subset instructions)
- [ ] Install AdMob (`@capacitor-community/admob`) and gate all ad calls behind `isPremium`
- [ ] Compress large PNGs: `Space.png` (2.4 MB), `Space_1.png` (1.8 MB) — see todoList.md

## Do NOT
- Do not use localStorage — use Phaser's registry or `@capacitor/preferences`
- Do not use Phaser 3 APIs (no Pipeline → use RenderNode, no BitmapMask → use Mask filter, no Geom.Point → use Vector2)
- Do not create separate CSS files — Phaser handles all rendering on canvas
- Do not use DOM elements for game UI — use Phaser's built-in text/button objects
- Do not hardcode screen dimensions — use Phaser's Scale Manager for responsive sizing

# Space-Counter — Georgian Alphabet Learning Game

## Project Overview
A 2D educational mobile game for kids learning the Georgian alphabet (ქართული ანბანი). A spaceship controlled by the player must shoot falling objects by correctly identifying Georgian letters. Three letter options appear at the bottom — tap the correct one to fire and destroy the falling object. Wrong answer = damage/collapse.

## Tech Stack
- **Engine**: Phaser 4.0.0 (latest stable)
- **Language**: TypeScript ^6.0.0 (strict mode)
- **Bundler**: Vite ^8.0.0
- **Mobile**: Capacitor ^8.3.1 (Android target)
- **IAP**: @revenuecat/purchases-capacitor ^13.0.1
- **Storage**: @capacitor/preferences ^8.0.1
- **Ads**: @capacitor-community/admob ^8.0.0 — planned, not yet installed
- **No framework** (no React, no Vue — vanilla Phaser + TS)

## Architecture Rules
- One scene per file in `src/scenes/`
- Scene naming: PascalCase ending in "Scene" (e.g., `GameScene.ts`, `MenuScene.ts`)
- All game state lives in the active scene or a shared singleton `GameState` class
- Never use deprecated Phaser 3 APIs — this is Phaser 4
- Use Phaser's built-in asset loader in BootScene — never load assets mid-gameplay
- All audio files go in `public/audio/`, all images in `public/images/`
- Use Phaser's Scene lifecycle: `init()`, `preload()`, `create()`, `update()`

## Georgian Alphabet Data
33 letters: ა ბ გ დ ე ვ ზ თ ი კ ლ მ ნ ო პ ჟ რ ს ტ უ ფ ქ ღ ყ შ ჩ ც ძ წ ჭ ხ ჯ ჰ
Each letter has:
- Character (Unicode)
- Latin transliteration
- Audio file (pre-recorded MP3 in public/audio/)
- Difficulty tier (1=common, 2=medium, 3=rare/confusing)

Store letter data as a typed array in `src/data/letters.ts`:
```typescript
export interface LetterData {
  char: string;        // Georgian character
  latin: string;       // Transliteration
  audioKey: string;    // Phaser audio key
  tier: 1 | 2 | 3;    // Difficulty
}
```

## Game Mechanics
- Falling objects descend from top of screen at increasing speed
- Each object is tied to a target letter
- Three answer buttons at bottom show Georgian letters (1 correct, 2 wrong)
- Correct tap: spaceship fires laser, object explodes, score increases
- Wrong tap: player takes damage (lives decrease), screen shakes
- Object reaches bottom without answer: automatic life loss
- Adaptive difficulty: letters the player gets wrong appear more frequently
- Wave system: every 10 correct answers = new wave with faster objects

## Input
- Touch-first design (target is mobile)
- Three large tap zones at bottom for letter selection
- Ship position can follow finger or stay centered
- All touch targets minimum 48x48dp for accessibility

## Audio
- Georgian letter pronunciation: pre-generated MP3 files embedded in public/audio/
- Sound effects: synthesized using Phaser's Web Audio (laser, explosion, wrong-answer buzz)
- Background music: optional ambient space theme
- Respect device mute switch via Capacitor

## Visual Style
- Space theme: starfield background, spaceship, alien creatures / Georgian landmarks as falling objects
- Bright, sci-fi-friendly colors
- Georgian letters displayed large and clear (minimum 48px font size)
- Use a Georgian-supporting font (Noto Sans Georgian or BPG fonts)
- Sprite animations: wobble, rotate, pulse on falling objects
- Particle effects on explosions
- Screen shake on damage

## Monetization

### IAP — implemented
- Free tier: first 12 letters (ა–მ) + numbers 1–10
- Premium: ₾3.00 one-time purchase unlocks all 33 letters + numbers 11–20 + disables ads
- Purchase flow: Google Play Billing via RevenueCat (`PremiumManager` singleton in `src/iap/`)
- Premium state: `game.registry.get('isPremium')` — set in BootScene, persisted via Preferences
- Paywall UI: `PaywallScene` launched as overlay from MainMenu, GameOver, or any scene
- Free/premium boundary: `src/data/freeContent.ts` → `FREE_LETTER_COUNT = 12`

### Ads — not yet implemented
- Banner ad at bottom between rounds (not during gameplay)
- Interstitial ad every 5 rounds
- Rewarded video: watch ad for extra life
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

## Testing
- `npm run dev` — Vite dev server with hot reload
- Test in Chrome DevTools mobile emulator (Pixel 5 viewport)
- `npm run build && npx cap sync && npx cap open android` — test on Android

## Imports
Phaser 4 has no default export — always use the namespace import:
```typescript
import * as Phaser from 'phaser';   // correct
import Phaser from 'phaser';        // WRONG — build error
```

## Pending / Follow-up

### Before shipping to Play Store
- [ ] Replace `'goog_REPLACE_WITH_YOUR_KEY'` in `src/iap/PremiumManager.ts:12` with real RevenueCat Android key
- [ ] Play Console: create in-app product `com.telo.spacecounter.premium_full` at ₾3.00, set Active
- [ ] RevenueCat dashboard: entitlement `premium` linked to product, copy API key
- [ ] Run `npx cap sync android` after above steps
- [ ] Add 33 letter audio files to `public/audio/` (`letter-a.mp3` … `letter-h.mp3` exist; need the rest)
- [ ] Add 20 number audio files to `public/audio/` (`number-1.mp3` … `number-20.mp3`)
- [ ] Compress `tina.png` (currently ~8.8 MB → target ~200 KB)
- [ ] Convert instruction WAVs to MP3 (`gameplay-alphabet-instruction`, `gameplay-number-instruction`, `voice-shoot`)
- [ ] Install AdMob (`@capacitor-community/admob`) and gate all ad calls behind `isPremium`

## Asset Index
- Master inventory lives in `assetIndex.json` at the project root
- **Update rule:** whenever a new asset is dropped into `public/` AND wired up in `src/scenes/PreloaderScene.ts`, update `assetIndex.json`: flip `"status"` to `"present"`, fill in `"size"`, and add the scene name to `"usedIn"`
- `"Legacy Collection"` folder in `public/` is excluded from the index — study separately before promoting any asset

## Do NOT
- Do not use localStorage (use Phaser's registry or a state manager)
- Do not use Phaser 3 APIs (no Pipeline → use RenderNode, no BitmapMask → use Mask filter, no Geom.Point → use Vector2)
- Do not create separate CSS files — Phaser handles all rendering on canvas
- Do not use DOM elements for game UI — use Phaser's built-in text/button objects
- Do not hardcode screen dimensions — use Phaser's Scale Manager for responsive sizing

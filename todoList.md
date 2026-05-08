# Space Counter — Optimization & Fix To-Do List

_Generated from full asset, dependency, and code audit — 2026-05-08_

---

## PRIORITY 1 — Critical / Game Quality

### [x] Convert WAV files to MP3
**Why:** WAV is uncompressed. The two intro narrations alone are 10.7 MB combined. MP3 equivalents would be ~500 KB–1 MB total. This is the single biggest load-time reduction available.

Files to convert:
| File | Current Size | Est. MP3 Size |
|---|---|---|
| `public/audio/intro-alphabet.wav` | 5.1 MB | ~200–300 KB |
| `public/audio/intro-numbers.wav` | 5.6 MB | ~200–300 KB |
| `public/audio/sfx-arsenal-full.wav` | 241 KB | ~30 KB |
| `public/audio/sfx-arsenal-tap.wav` | 346 KB | ~40 KB |
| `public/audio/sfx-boss-engine.wav` | 211 KB | ~30 KB |
| `public/audio/sfx-damage.wav` | 242 KB | ~30 KB |
| `public/audio/sfx-wave-up.wav` | 890 KB | ~80 KB |

**Steps:**
1. Use [Audacity](https://www.audacityteam.org/) or `ffmpeg` to batch convert:
   ```
   ffmpeg -i input.wav -codec:a libmp3lame -qscale:a 4 -ar 22050 -ac 1 output.mp3
   ```
2. Replace the WAV files with the new MP3s (same filenames, `.mp3` extension)
3. Update all `this.load.audio(key, 'audio/filename.wav')` calls in `src/scenes/PreloaderScene.ts` to `.mp3`
4. Delete the original WAV files

---

### [x] Delete duplicate audio file
**Why:** 4.5 MB of dead weight, never loaded.

- **Delete:** `public/audio/MyVeryOwnDeadShip_original.ogg`
- `MyVeryOwnDeadShip.ogg` is the version actually used — keep that one.

---

### [ ] Add missing Georgian font
**Why:** `PreloaderScene.ts` attempts to load `NotoSansGeorgian-Regular.ttf` from `public/fonts/` but the directory is empty. Every load results in a 404. The game falls back to system fonts which may look inconsistent across devices, especially Android.

**Steps:**
1. Download **Noto Sans Georgian** from [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Georgian)
2. Place `NotoSansGeorgian-Regular.ttf` in `public/fonts/`
3. Update `assetIndex.json` — flip `"status": "missing"` → `"status": "present"` for the font entry
4. Optionally subset the font (keep only Georgian + Latin glyphs) using [pyftsubset](https://fonttools.readthedocs.io/) to reduce file size:
   ```
   pyftsubset NotoSansGeorgian-Regular.ttf --unicodes="U+0020-007E,U+10D0-10FF"
   ```
   Full font is ~200–400 KB; subsetted version would be ~40–60 KB.

---

## PRIORITY 2 — High Impact / Performance

### [ ] Compress large background images
**Why:** `Space.png` (2.4 MB) and `Space_1.png` (1.8 MB) are the new black-screen culprits after `tina.png` was fixed. `bg-menu.jpg` at 3 MB is the biggest single asset in the game.

| File | Current Size | Target | Method |
|---|---|---|---|
| `public/images/bg-menu.jpg` | 3.0 MB | < 300 KB | Re-export at quality 70–80 |
| `public/images/Space.png` | 2.4 MB | < 300 KB | Convert to WebP or compress PNG |
| `public/images/Space_1.png` | 1.8 MB | < 300 KB | Convert to WebP or compress PNG |
| `public/images/nebula-purple-01.png` | 382 KB | < 200 KB | PNG crush or WebP |
| `public/images/nebula-blue-02.png` | 374 KB | < 200 KB | PNG crush or WebP |
| `public/images/kp-planet-04.png` | 336 KB | < 150 KB | PNG crush |
| `public/images/kp-planet-01.png` | 301 KB | < 150 KB | PNG crush |

**Tools:**
- [Squoosh](https://squoosh.app/) — browser-based, free, supports WebP output
- [pngquant](https://pngquant.org/) — lossless-quality PNG compression: `pngquant --quality=65-85 *.png`
- ffmpeg for JPG: `ffmpeg -i bg-menu.jpg -q:v 5 bg-menu-compressed.jpg`

**Steps:**
1. Compress each file listed above using Squoosh or pngquant
2. For WebP: update `PreloaderScene.ts` load calls to reference `.webp` extension
3. Verify visually — backgrounds can tolerate more compression than sprites
4. Target total images folder under 5 MB (currently 14 MB)

---

### [x] Remove 4 unused Capacitor dependencies
**Why:** These packages are installed, bundled by Vite, but have zero call sites in the codebase. They bloat the JavaScript bundle and Android APK for no benefit.

**Remove from `package.json` dependencies:**
- `@capacitor/haptics` — no haptic calls anywhere in code
- `@capacitor/screen-orientation` — never called
- `@capacitor/splash-screen` — never called
- `@capacitor/status-bar` — never called

**Steps:**
1. Run: `npm uninstall @capacitor/haptics @capacitor/screen-orientation @capacitor/splash-screen @capacitor/status-bar`
2. Run: `npx cap sync android` to update the Android project
3. Verify build still works: `npm run build`

---

### [x] Re-encode large music/audio files at lower bitrate
**Why:** `Orbital Colossus.mp3` (5.9 MB) and both OGG music files (3.2–4.5 MB each) are large for background music. Background music can be encoded at 64–96 kbps (vs the current ~128–192 kbps) with minimal perceptible quality loss on mobile speakers.

| File | Current Size | Target Bitrate | Est. Size |
|---|---|---|---|
| `public/audio/Orbital Colossus.mp3` | 5.9 MB | 96 kbps | ~2.5 MB |
| `public/audio/MyVeryOwnDeadShip.ogg` | 3.2 MB | 96 kbps | ~1.5 MB |
| `public/audio/music-game.ogg` | 4.6 MB | 96 kbps | ~2 MB |

**Steps:**
1. Re-encode using ffmpeg:
   ```
   ffmpeg -i "Orbital Colossus.mp3" -codec:a libmp3lame -b:a 96k output.mp3
   ```
2. Listen test on phone speaker — if acceptable, replace originals

---

## PRIORITY 3 — Medium / Correctness

### [x] Update assetIndex.json to reflect current state
**Why:** The index is significantly out of date and misleading. Letter audio files exist on disk but are all marked "MISSING". The Legacy folder (now deleted) may still have entries. This makes the file unreliable as a reference.

**Steps:**
1. Open `assetIndex.json`
2. For each audio entry, verify file existence in `public/audio/` and flip `"status"` accordingly
3. Remove any entries referencing the deleted Legacy folder
4. Update `"lastUpdated"` timestamp
5. Update summary counts (present/missing totals)

---

### [ ] Add missing SFX files or remove their load calls
**Why:** Four SFX files are referenced in `PreloaderScene.ts` but don't exist on disk. Phaser logs 404 warnings silently but the features relying on them produce no sound.

Missing SFX:
| Key | File | Used in |
|---|---|---|
| `sfx-laser` | `sfx-laser.mp3` | GameScene — laser shots |
| `sfx-wrong` | `sfx-wrong.mp3` | GameScene — wrong answer |
| `sfx-alien-appear` | `sfx-alien-appear.mp3` | GameScene — enemy spawn |
| `sfx-button` | `sfx-button.mp3` | MainMenuScene, PaywallScene |

**Steps (choose one per file):**
- **Option A:** Generate/source the missing MP3 and drop it in `public/audio/`
- **Option B:** If the effect is intentionally silent, remove the `this.load.audio(...)` call from `PreloaderScene.ts` and any `this.playSound(...)` calls in GameScene

---

### [x] Add missing music files or implement fallback
**Why:** `music-alphabet.mp3` and `music-numbers.mp3` are loaded but missing. The game currently falls back to the existing OGG tracks, but the load attempt causes 404 noise in the console.

**Steps:**
1. Either provide the two MP3 files in `public/audio/`
2. Or remove lines 174–175 from `PreloaderScene.ts` if the OGG tracks are the intended music

---

## PRIORITY 4 — Low / Build & Dev Experience

### [x] Tune Vite build config (`vite.config.ts`)

**Current config missing:**
1. `assetsInlineLimit: 0` prevents small assets from being inlined — change to `4096` to inline files under 4 KB automatically (reduces HTTP requests for tiny JSON/SVG files)
2. No code splitting — all scenes ship in one bundle

**Recommended config:**
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
```

Splitting Phaser into its own chunk lets the browser cache it separately — game-code changes won't bust the Phaser cache.

---

### [ ] Consider WebP for all large PNGs
**Why:** WebP consistently delivers 30–40% smaller files than PNG at equivalent quality. Phaser 4 supports WebP natively. Background images and nebulas are the best candidates.

**Steps:**
1. Use Squoosh to convert each large PNG to WebP
2. Update load calls in `PreloaderScene.ts`:
   ```typescript
   this.load.image('space-bg', 'images/Space.webp');
   ```
3. Verify on Android Chrome (WebP supported on all Android 4.0+)

---

## SUMMARY CHECKLIST

### Audio (biggest wins)
- [x] Convert 7 WAV → MP3 (~10 MB saved)
- [x] Delete `MyVeryOwnDeadShip_original.ogg` (4.5 MB free)
- [x] Re-encode 3 large music tracks at 96 kbps (~6 MB saved)
- [ ] Source or remove 4 missing SFX files
- [x] Source or remove 2 missing music files (load calls removed — keys not used in game logic)

### Images
- [x] Compress `bg-menu.jpg` (3 MB → 361 KB)
- [ ] Compress `Space.png` (2.4 MB → < 300 KB)
- [ ] Compress `Space_1.png` (1.8 MB → < 300 KB)
- [ ] Compress 4 nebula/planet PNGs (300–380 KB range)

### Fonts
- [ ] Add `NotoSansGeorgian-Regular.ttf` to `public/fonts/` (subset recommended)

### Dependencies
- [x] Remove 4 unused Capacitor plugins from `package.json`

### Build
- [x] Update `vite.config.ts` — set `assetsInlineLimit: 4096`, add Phaser chunk split
- [x] Update `assetIndex.json` to reflect current disk state

---

_Estimated total asset size savings if all items completed: ~20–25 MB (from ~47 MB → ~22–27 MB)_
_Estimated load time improvement on 4G: from ~30 s → ~8–12 s_

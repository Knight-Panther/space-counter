# Space-Counter: Complete Setup Guide
## Georgian Alphabet Learning Game — Phaser + Capacitor

---

## 1. YOUR STACK (locked in)

| Layer | Choice | Why |
|---|---|---|
| **Game Engine** | Phaser 4.0.0 | Latest stable, new WebGL renderer, built-in AI skills |
| **Language** | TypeScript 6.0 | Type safety, better Claude Code output, Phaser 4 is TS-first |
| **Bundler** | Vite | Fast dev server, hot reload, Phaser's recommended bundler |
| **Mobile Wrapper** | Capacitor 8 (^8.3.1) | Official Phaser integration, native API access |
| **Ads** | @capacitor-community/admob | Community-maintained, actively updated, MIT licensed |
| **Deployment** | Capacitor → Android APK → Play Store | Native wrapper, not PWA |
| **Framework** | None (vanilla Phaser + TS) | No React/Next.js needed — Phaser manages its own canvas |

**Why NOT Next.js/React?** Phaser renders to its own canvas. React/Next.js would be a wrapper around a wrapper — unnecessary complexity. Phaser + Vite is the cleanest path. You write TypeScript scene files, Vite bundles them, Phaser runs them.

---

## 2. PREREQUISITES — Install on your Windows PC

### Node.js (required for everything)
- Download: https://nodejs.org — install **Node 22 LTS** (minimum) or **Node 24 LTS** (recommended)
- Node 20 reaches end-of-life April 30, 2026 — do not use it; Vite 8 requires Node 22+
- Verify: `node --version` and `npm --version`

### Android Studio (required for Capacitor Android builds)
- Download: https://developer.android.com/studio
- During install, check: Android SDK, Android Virtual Device
- After install: open SDK Manager → install Android 16 (API 36) or latest

### Java JDK 21+ (required by Android Studio/Gradle)
- Usually bundled with Android Studio
- Verify: `java --version`

### Claude Code CLI
- Install: `npm install -g @anthropic-ai/claude-code`
- Verify: `claude --version`

### Git
- You likely already have this
- Verify: `git --version`

---

## 3. CLAUDE CODE SETUP — Skills & Plugin

### Install the Phaser 4 Claude Code Plugin
Add to your Claude Code settings file (`~/.claude/settings.json`):

```json
{
  "extraKnownMarketplaces": {
    "phaser4-gamedev": {
      "source": {
        "source": "github",
        "repo": "Yakoub-ai/phaser4-gamedev"
      }
    }
  },
  "enabledPlugins": {
    "phaser4-gamedev@phaser4-gamedev": true
  }
}
```

**What this gives you:**
- 4 specialized agents (architect, coder, debugger, asset-advisor)
- 14 slash-command skills covering full game lifecycle
- `/phaser-new` — scaffold a new game
- `/phaser-run` — start dev server
- `/phaser-validate` — check for errors
- `/phaser-build` — production build
- Pre-built game archetypes including match-3 puzzle
- Auto v3 API guard (catches deprecated APIs before save)

### Phaser's Built-in AI Skills
Phaser 4 ships with 28 AI skill files in its repo's `skills/` folder. When you scaffold the project, these are available automatically. They cover: scenes, physics, input, animations, tilemaps, tweens, particles, cameras, audio, and v3→v4 migration.

### MCP (optional for now)
Phaser Editor v5 has a built-in MCP server, but you don't need it for terminal-only workflow. Skip MCP setup for now — the plugin + skills give you everything needed. Revisit if you later want Phaser Editor's visual scene builder.

---

## 4. PROJECT SCAFFOLDING — Step by Step

Open your terminal in VS Code inside the `Space-Counter` folder:

```bash
# Step 1: Scaffold Phaser 4 project with Vite + TypeScript
npm create @phaserjs/game@latest .
# Select: Vite, TypeScript, no framework (vanilla)

# Step 2: Install dependencies
npm install

# Step 3: Verify it runs
npm run dev
# Opens browser at localhost:5173 with Phaser demo

# Step 4: Add Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "Space Counter" com.telo.spacecounter --web-dir dist

# Step 5: Add Android platform
npx cap add android

# Step 6: Add mobile plugins
npm install @capacitor/status-bar
npm install @capacitor/screen-orientation
npm install @capacitor/haptics
npm install @capacitor/splash-screen
npm install @capacitor/app

# Step 7: Add AdMob (when ready for monetization)
npm install @capacitor-community/admob
npx cap update
```

---

## 5. DEVELOPMENT WORKFLOW

```
You describe what you want
        ↓
Claude Code writes/edits TypeScript files in src/scenes/
        ↓
Vite hot-reloads in browser (npm run dev)
        ↓
You test in browser, describe changes
        ↓
Loop until happy
        ↓
npm run build (creates dist/)
        ↓
npx cap sync (copies dist/ to Android project)
        ↓
npx cap open android (opens Android Studio)
        ↓
Build APK → test on device/emulator
        ↓
Upload to Play Store
```

---

## 6. KEY REFERENCE LINKS

### Official Docs
- Phaser 4: https://phaser.io
- Phaser GitHub: https://github.com/phaserjs/phaser
- Phaser API Docs: https://docs.phaser.io
- Phaser Examples: https://phaser.io/examples
- Capacitor: https://capacitorjs.com/docs
- Capacitor Games Guide: https://capacitorjs.com/docs/guides/games
- Phaser + Capacitor Tutorial: https://phaser.io/tutorials/bring-your-phaser-game-to-ios-and-android-with-capacitor

### Plugins & Libraries
- AdMob Plugin: https://github.com/capacitor-community/admob
- Phaser4 Claude Plugin: https://github.com/Yakoub-ai/phaser4-gamedev
- Phaser Claude Code Tutorial: https://phaser.io/news/2026/02/phaser-claude-code-tutorial

### Assets
- Free Game Assets: https://itch.io/game-assets/free
- Pixel Art Editor: https://www.piskelapp.com
- Background Remover: https://remove.bg
- Sound Effects: https://sfxr.me (synthesized retro sounds)

### Play Store
- Google Play Console: https://play.google.com/console
- Developer Registration: $25 one-time fee
- Families Policy (for kids apps): https://support.google.com/googleplay/android-developer/answer/9893335

---

## 7. PROJECT STRUCTURE (after scaffold)

```
Space-Counter/
├── android/                  # Capacitor Android project (auto-generated)
├── dist/                     # Build output (Vite generates this)
├── public/                   # Static assets
│   ├── audio/               # Georgian letter audio files (MP3)
│   ├── images/              # Sprites, backgrounds, UI elements
│   └── fonts/               # Georgian font files if needed
├── src/
│   ├── main.ts              # Phaser game config & entry point
│   └── scenes/
│       ├── BootScene.ts     # Asset preloading
│       ├── MenuScene.ts     # Title screen
│       ├── GameScene.ts     # Main gameplay
│       ├── HUDScene.ts      # Score, lives overlay
│       └── GameOverScene.ts # Results & restart
├── CLAUDE.md                # Claude Code project instructions
├── capacitor.config.ts      # Capacitor configuration
├── index.html               # Entry HTML
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 8. IMPORTANT DECISIONS

**Why Capacitor native wrapper, NOT PWA?**
PWAs can technically go on the Play Store via TWA (Trusted Web Activity), but they have limitations with ads, in-app purchases, and Play Store kids compliance. Capacitor gives you a real native app that the Play Store treats as a first-class citizen. AdMob works natively through Capacitor's plugin — no WebView ad hacks.

**Why TypeScript over JavaScript?**
Phaser 4 is TypeScript-first. The official templates, examples, and AI skills all use TypeScript. Claude Code generates better TypeScript because type information helps it understand your codebase structure. The overhead of learning TS vs JS is near-zero — it's JavaScript with type annotations.

**Why no React/Vue wrapper?**
Phaser manages its own rendering canvas. Wrapping it in React creates unnecessary complexity — two rendering systems fighting over the DOM. The vanilla Vite + TypeScript template is the cleanest path and what the Phaser team recommends for games.

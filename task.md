# Space-Counter — Learning Path Overhaul

## Goal
Every child who plays 30 waves must have encountered every available letter or number at
least once — **in both alphabet mode and numbers mode**. Difficulty adapts to the
player's skill level (not punishes failure). The learning path and the game difficulty
are fully independent systems.

## Modes at a glance

| Mode | Free content | Premium content |
|------|-------------|-----------------|
| Alphabet | 12 letters (tier 1: ა–მ) | +21 letters (tier 2 & 3) |
| Numbers | 10 numbers (tier 1: 1–10) | +10 numbers (tier 2: 11–20) |

All phases below apply to **both modes** unless noted otherwise. Where behaviour
differs between modes it is called out explicitly.

---

## Phase 1 — Extend Wave Config to 30

**Files:** `src/scenes/GameScene.ts`

### Tasks
- [ ] Extend the `WAVES` array from 10 entries to 30 entries following this curve:
  - Waves 11–15: 6 slots, 3 boss req, spawnMs 1300→1100, speed 195→215
  - Waves 16–20: 6 slots, 4 boss req, spawnMs 1050→900, speed 225→245
  - Waves 21–25: 6 slots, 4 boss req, spawnMs 880→800, speed 255→270
  - Waves 26–30: 6 slots, 5 boss req, spawnMs 780→700, speed 280→300
- [ ] Confirm `waveCfg(n)` clamps correctly: waves 31+ return wave-30 config (no crash)
- [ ] Update `KILL_PER_WAVE` comment to reflect 30-wave arc

**Acceptance:** `waveCfg(31)` returns same result as `waveCfg(30)`. Dev server shows correct
speed/slot values in HUD debug mode at each wave.

---

## Phase 2 — Curriculum Schedule (Decoupled from Difficulty)

**Files:** `src/data/curriculum.ts` (new), `src/scenes/GameScene.ts`

### Context
Currently letter/number tiers unlock based on wave number, coupling content to difficulty.
This phase replaces that with a fixed pedagogical introduction schedule. Content is
introduced easiest-first regardless of how fast or slow the game runs.

### Curriculum schedules

**Alphabet mode — 33 letters total**
- Waves 1–9: introduce all 17 tier-1 letters (~2 per wave)
- Waves 10–15: introduce all 10 tier-2 letters (~2 per wave)
- Waves 16–20: introduce all 6 tier-3 letters (1 per wave)
- Waves 21–30: reinforcement only — no new introductions
- Free users: only tier-1 letters (12 of 17) are ever introduced; remaining 5 tier-1 +
  all tier-2 + tier-3 are gated behind premium

**Numbers mode — 20 numbers total**
- Waves 1–5: introduce all 10 tier-1 numbers (2 per wave) — free content
- Waves 6–10: introduce all 10 tier-2 numbers (2 per wave) — premium only
- Waves 11–30: reinforcement only for all introduced numbers
- Free users stop receiving new numbers after wave 5; premium users continue to wave 10

### Tasks
- [ ] Create `src/data/curriculum.ts` exporting two named schedules:
  `ALPHABET_CURRICULUM` and `NUMBERS_CURRICULUM`, each typed as
  `Map<number, string[]>` (wave number → chars to introduce that wave).
  Both maps list **all** content in full tier order — free/premium filtering happens
  at runtime in `GameScene`, not in the data file.
- [ ] `GameScene` selects the correct schedule based on `this.mode`
  (`'alphabet'` → `ALPHABET_CURRICULUM`, `'numbers'` → `NUMBERS_CURRICULUM`)
- [ ] Add `introducedByWave: Set<string>` tracker to `GameScene` — populated from the
  active schedule as waves advance. When processing a wave's curriculum entries,
  skip any char that is not in the free set when `isPremium === false`
  (use `FREE_LETTER_COUNT` for alphabet, `tier === 1` for numbers).
  Free users simply receive no introduction card for premium-gated chars;
  the wave still advances normally.
- [ ] At wave start (after wave banner), if the active schedule has entries for this wave:
  - Pause spawning for 2 seconds
  - Show a "New letter/number: X" introduction card (large char + transliteration or
    Georgian word for numbers) for each new item, one at a time
  - Add items to `introducedByWave`
- [ ] Replace current `availableItems()` tier-unlock logic with `introducedByWave`
  membership check — an item is spawnable only after it has been formally introduced
- [ ] On new item introduction, add each introduced char to `newItemGracePeriod: Set<string>`
  (a shared set used by both Phase 2 and Phase 4); remove a char from the set once it
  has been presented as a target 3 times in gameplay

**Acceptance:**
- Alphabet: ჭ never appears before wave 16. Free user never sees tier-2 or tier-3 letters.
- Numbers: all 10 free numbers introduced by end of wave 5. Premium numbers (11–20)
  introduced waves 6–10. Free user in numbers mode never sees tier-2 numbers.
- Introduction card appears at the start of the relevant wave before spawning resumes.

---

## Phase 3 — Coverage Tracker + MistakeWeight Cap

**Files:** `src/scenes/GameScene.ts`

### Context
Even with the curriculum schedule, weighted-random selection can still under-serve some
letters during reinforcement waves. This phase adds a coverage counter and caps the
mistake-weight boost so no single letter monopolises spawns.

### Tasks
- [ ] Add `appearanceCount: Map<string, number>` to `GameScene` — increment every time a
  letter is chosen as the target of a spawned enemy (green or purple)
- [ ] In `pickRandomItem()`: letters with `appearanceCount` below a threshold get a
  progressive weight bonus:
  - From wave 15 onward: letters seen fewer than 3 times get +3 weight bonus
  - From wave 22 onward: letters seen fewer than 5 times get +5 weight bonus
  - No force-injection; weight pressure alone ensures coverage by wave 28
- [ ] Cap mistakeWeight influence: change formula from
  `1 + weight * 2` → `1 + Math.min(weight, 3) * 1.5`
  (max 5.5× boost; prevents one struggling letter from monopolising all spawns)
- [ ] Decrease `mistakeWeight` by 1 on correct answer — already exists, verify it still
  applies after formula change

**Acceptance:**
- Alphabet (premium): simulated 30-wave run → all 33 letters have `appearanceCount ≥ 1`
- Alphabet (free): simulated 30-wave run → all 12 free letters have `appearanceCount ≥ 1`;
  no premium letters appear
- Numbers (premium): all 20 numbers have `appearanceCount ≥ 1`
- Numbers (free): all 10 free numbers have `appearanceCount ≥ 1`; tier-2 numbers absent
- No single item exceeds ~25% of total spawns in any 5-wave window in either mode
- Simulated run: temporarily set `KILL_PER_WAVE = 1` for fast testing

---

## Phase 4 — Two-Way Adaptive Difficulty

**Files:** `src/scenes/GameScene.ts`

### Context
Current difficulty only reacts to per-letter mistakes. This phase adds a skill signal
based on overall recent accuracy that adjusts spawn speed and interval on top of the wave
config — faster for skilled players, gentler for struggling ones.

### Tasks
- [ ] Add `recentShots: boolean[]` ring buffer (capacity 20) to `GameScene` — push `true`
  on correct proton shot, `false` on wrong
- [ ] Add `adaptiveSpeedMult: number` (default 1.0) and `currentAccuracy(): number`
  helper (sum of `recentShots` / 20)
- [ ] At each wave boundary, recalculate `adaptiveSpeedMult`:
  - If accuracy > 0.75 for 2 consecutive wave-end checks: multiply by 1.10 (max 1.20)
  - If accuracy < 0.45 for 2 consecutive wave-end checks: multiply by 0.92 (min 0.80)
  - Otherwise: nudge toward 1.0 by factor 0.05
- [ ] Apply `adaptiveSpeedMult` to enemy fall speed and spawn interval when scheduling
  spawns — multiply base wave values by this factor
- [ ] Grace period: while `newItemGracePeriod` set is non-empty (any char still in grace),
  freeze `adaptiveSpeedMult` recalculation (do not adjust difficulty while introducing
  new content). `newItemGracePeriod` is defined in Phase 2 and shared here.
- [ ] Track `prevWaveAccuracy` for the consecutive-wave check logic above
- [ ] Add a small HUD debug label (dev-only, stripped in prod build) showing current
  `adaptiveSpeedMult` and `currentAccuracy()`

**Acceptance:** A player answering correctly 100% of the time reaches 1.20× speed by
wave 4. A player answering 30% correctly slows to 0.80× by wave 4. New letter
introduction card (Phase 2) does not trigger a speed change.

---

## Phase 5 — Boss Eligibility Rule

**Files:** `src/scenes/GameScene.ts`

### Context
The boss demands items from the player's arsenal. If a letter was just introduced this
wave, requiring it in a boss fight is an unfair pop quiz on brand-new material.

### Tasks
- [ ] Add `letterIntroWave: Map<string, number>` — records the wave number in which each
  letter was formally introduced (populated alongside `introducedByWave` in Phase 2)
- [ ] In boss spawn logic where `bossRequired` is assembled from `this.arsenal`:
  filter out any arsenal item whose `letterIntroWave` value is `>= this.wave - 1`
  (i.e., introduced this wave or the previous wave)
- [ ] Fallback: if the filtered list is empty (edge case at very early waves), skip the
  filter entirely for this boss encounter and use the unfiltered arsenal instead
- [ ] After applying the fallback, reduce `bossReq` to however many eligible items remain
  if the count is less than the configured `bossReq` (no crash; boss demands fewer items)

**Acceptance:** A letter introduced on wave 16 and collected into the arsenal does not
appear in `bossRequired` on waves 16 or 17. It is eligible from wave 18 onward.
At wave 1 (where the filtered list would be empty), the fallback fires and boss uses
the unfiltered arsenal without crashing.

---

## Phase 6 — Arsenal-Full Spawn Renormalisation

**Files:** `src/scenes/GameScene.ts`

### Context
When the arsenal is full, `emptyRatio` reaches 0 and `effectiveGreenPct` becomes 0
(current code: `cfg.greenPct * emptyRatio`). This is the correct suppression behaviour —
no letter-carrying enemies when there is nowhere to put the item. However, setting one
probability to 0 changes the total weight budget, so the remaining enemy types (blue,
purple, red, ship) must be confirmed to renormalise correctly and still sum to 1.0.

### Tasks
- [ ] Read the full probability branching in `spawnEnemy()` and trace what happens to
  the remaining type probabilities when `effectiveGreenPct === 0`
- [ ] Confirm blue / purple / red / ship probabilities are renormalised so they consume
  the freed budget — no probability mass is silently lost
- [ ] If any branch assumes greenPct > 0 and breaks at 0, fix that branch
- [ ] No change to the 0% suppression itself — current behaviour is correct

**Acceptance:** With a full arsenal, 20 consecutive spawns produce zero green enemies.
The remaining enemy type distribution across those 20 spawns sums correctly to 100%
with no type being unintentionally suppressed as a side-effect.

---

## Phase 7 — Free-Tier Mastery Gate

**Files:** `src/scenes/GameScene.ts`, `src/scenes/MasteryScene.ts` (new),
`src/data/freeContent.ts`

### Context
Free users have a finite curriculum: 12 letters (alphabet) or 10 numbers (numbers mode).
Once introduced and practised, there is no new learning. Without a deliberate mastery
moment, waves 7–30 become empty repetition that neither teaches nor motivates an upgrade.
Instead the game celebrates curriculum completion and offers the upgrade as graduation.

### Mastery conditions (mode-specific)

| Mode | Trigger condition |
|------|------------------|
| Alphabet (free) | All 12 free letters have `appearanceCount ≥ 5` |
| Numbers (free) | All 10 free numbers have `appearanceCount ≥ 5` |

### Tasks
- [ ] Add `masteryShown: boolean` flag to `GameScene` (stored in game registry — does not
  re-trigger in the same session)
- [ ] After each wave-end, evaluate the mode-specific mastery condition above for free users
- [ ] When condition is met: pause between waves, launch `MasteryScene` as an overlay
- [ ] Create `src/scenes/MasteryScene.ts` with two layout variants:
  **Alphabet variant:**
  - Title: "You've mastered the basics!"
  - Grid showing all 12 free letters with a star badge each
  - CTA button: "Unlock the Full Georgian Alphabet" → `PaywallScene`
  - Secondary: "Keep Playing" (dismisses, sets `masteryShown = true`)

  **Numbers variant:**
  - Title: "Number Master!"
  - Grid showing all 10 free numbers (Georgian word + digit) with star badges
  - CTA button: "Unlock Numbers 11–20" → `PaywallScene`
  - Secondary: "Keep Playing"

  `MasteryScene` reads `this.mode` from registry to choose which variant to render.
- [ ] `MasteryScene` must not appear for premium users in either mode

**Acceptance:**
- Alphabet free: mastery overlay fires exactly once per session after all 12 letters
  reach `appearanceCount ≥ 5`. Premium alphabet users never see it.
- Numbers free: mastery overlay fires exactly once per session after all 10 numbers
  reach `appearanceCount ≥ 5`. Premium numbers users never see it.
- "Keep Playing" lets the player continue the reinforcement loop uninterrupted.

---

## Phase 8 — Wave 30 Completion Celebration

**Files:** `src/scenes/CompletionScene.ts` (new), `src/scenes/GameScene.ts`,
`src/scenes/GameOverScene.ts`

### Context
Completing 30 waves is the full curriculum. It deserves a dedicated celebration — not
the same game-over screen used when dying at wave 2. This is also the strongest
premium upsell moment.

### Tasks
- [ ] In the wave-advance block (where `killCount % KILL_PER_WAVE === 0` increments
  `this.wave`), add a check: `if (this.wave > 30)` → call `this.completeGame()` instead
  of continuing the loop. This is the victory trigger.
- [ ] Add `private completeGame(): void` to `GameScene` — mirrors `endGame()` structure
  but routes to `CompletionScene`. `endGame()` remains the death-only path and is not
  modified. Two separate methods, two separate destinations, no shared conditional.
- [ ] `completeGame()` passes `{ mode: this.mode, score: this.score, wave: this.wave,
  appearanceCount: Object.fromEntries(this.appearanceCount) }` as scene data
- [ ] Create `src/scenes/CompletionScene.ts` with two content variants driven by `mode`:

  **Alphabet completion:**
  - Banner: "Georgian Alphabet Complete!" / "ქართული ანბანი — დასრულებულია!"
  - Grid: all letters the player encountered this run, appearance count badge (×N)
  - Free users: "You've mastered 12 letters! Unlock the full Georgian alphabet" → `PaywallScene`
  - Premium users: full 33-letter grid, "Play Again" + "Main Menu"

  **Numbers completion:**
  - Banner: "Number Master!" / "რიცხვების ოსტატი!"
  - Grid: all numbers encountered, Georgian word + digit, appearance count badge
  - Free users: "You've mastered 1–10! Unlock numbers 11–20" → `PaywallScene`
  - Premium users: full 20-number grid, "Play Again" + "Main Menu"

- [ ] Background: victory particle effect (reuse existing explosion particles in gold/white)
- [ ] `CompletionScene` receives `{ mode, score, wave, appearanceCount }` via scene data
- [ ] `endGame()` (death path) remains unchanged — always routes to `GameOverScene`
- [ ] `completeGame()` (victory path) always routes to `CompletionScene`
- [ ] Register `CompletionScene` in the Phaser game config scene list in `src/main.ts`

**Acceptance:**
- Dying at wave 30 → `GameOverScene`. Completing wave 30 naturally → `CompletionScene`.
- Alphabet mode shows letter grid; numbers mode shows number grid — no cross-contamination.
- Both grids render without layout overflow on Pixel 5 viewport (360×800dp).

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 4 → Phase 6 → Phase 7 → Phase 8
```

Phases 1–3 are pure data/logic changes with no new scenes.
Phase 5 depends on Phase 2 (`letterIntroWave` map).
Phase 4 depends on Phase 2 (grace period flag).
Phases 6–8 are independent of each other and can be done in any order after Phase 3.

---

## Out of Scope (Future Work)
- Visually similar wrong-answer distractors as difficulty increases
- Per-session progress persistence (Capacitor Preferences)
- AdMob integration (banner + interstitial between rounds)
- Real RevenueCat API key + Play Console product activation

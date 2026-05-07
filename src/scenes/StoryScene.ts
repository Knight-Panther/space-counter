import * as Phaser from 'phaser';
import { GameMode } from '../data/types';

interface StoryConfig {
  text: string;
  bgKey: string;
  accentColor: number;
  introAudioKey: string | null;
}

const STORIES: Record<GameMode, StoryConfig> = {
  alphabet: {
    text: 'გალაქტიკის კიდიდან ბნელი ძალები დაიძრნენ. მათი მიზანია დედამიწა გაანადგურონ.\n\nშენ პლანეტა „თვალეს" უკანასკნელი მცველი ხარ! შენი ხომალდის ზარბაზანი მხოლოდ სწორ ასო-ბგერებს ემორჩილება — არ დანებდე ბრძოლის ველზე!',
    bgKey: 'space-nebula',
    accentColor: 0x4488ff,
    introAudioKey: 'intro-alphabet',
  },
  numbers: {
    text: 'გალაქტიკის კიდიდან ბნელი ძალები დაიძრნენ. მათი მიზანია დედამიწა გაანადგურონ.\n\nშენ პლანეტა „თვალეს" უკანასკნელი მცველი ხარ! შენი ხომალდის ზარბაზანი მხოლოდ სწორ რიცხვებს ემორჩილება — არ დანებდე ბრძოლის ველზე!',
    bgKey: 'space-nebula-2',
    accentColor: 0xff8800,
    introAudioKey: 'intro-numbers',
  },
};

const CHAR_DELAY_MS = 30;

export class StoryScene extends Phaser.Scene {
  private mode: GameMode = 'alphabet';
  private storyText!: Phaser.GameObjects.Text;
  private tapPrompt!: Phaser.GameObjects.Text;
  private fullText = '';
  private charIndex = 0;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private introSound: Phaser.Sound.BaseSound | null = null;
  private advanced = false;

  constructor() {
    super({ key: 'StoryScene' });
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? 'alphabet';
    this.charIndex = 0;
    this.typeTimer = null;
    this.introSound = null;
    this.advanced = false;
  }

  create(): void {
    const { width: w, height: h } = this.scale;
    const story = STORIES[this.mode];

    this.drawBackground(w, h, story.bgKey);
    this.addCharacterPortrait(w, h, story.accentColor);
    this.buildTextBox(w, h, story.accentColor);
    this.buildSkipButton(w, story.accentColor);
    this.duckMenuMusic();
    this.playIntroVoice(story);

    this.fullText = story.text;
    this.startTypewriter();

    this.events.once('shutdown', this.cleanup, this);
  }

  // ─── Background ───────────────────────────────────────────────────────────────

  private drawBackground(w: number, h: number, bgKey: string): void {
    if (this.textures.exists(bgKey)) {
      const src = this.textures.get(bgKey).getSourceImage() as HTMLImageElement;
      this.add.image(w / 2, h / 2, bgKey).setScale(Math.max(w / src.width, h / src.height));
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(0x000011);
      bg.fillRect(0, 0, w, h);
    }
    // Dark overlay — ensures text is always readable over any background image
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000011, 0.70);
    overlay.fillRect(0, 0, w, h);

    // Nebula glow — cinematic atmosphere per mode
    const nebulaKey   = bgKey === 'space-nebula' ? 'nebula-purple-01' : 'nebula-green-02';
    const nebulaAlpha = bgKey === 'bg-alphabet' ? 0.30 : 0.25;
    if (this.textures.exists(nebulaKey)) {
      this.add.image(w / 2, h / 2, nebulaKey)
        .setDisplaySize(w, h)  // nebula overlay — stretch-fill is fine for abstract texture
        .setAlpha(nebulaAlpha)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  // ─── Character portrait ───────────────────────────────────────────────────────

  private addCharacterPortrait(w: number, h: number, accent: number): void {
    if (!this.textures.exists('tina')) return;

    const portraitW = w * 0.42;
    const portraitX = w - portraitW * 0.48;
    const portraitY = h * 0.52;

    // Soft glow behind the character
    const glow = this.add.graphics();
    glow.fillStyle(accent, 0.12);
    glow.fillEllipse(portraitX, portraitY + portraitW * 0.15, portraitW * 1.1, portraitW * 1.4);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: glow, alpha: 0.45, scaleX: 1.06, scaleY: 1.06,
      duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    const portrait = this.add.image(portraitX, portraitY, 'tina');
    const scale = (h * 0.72) / portrait.height;
    portrait.setScale(scale).setOrigin(0.5, 0.5);

    // Gentle idle float
    this.tweens.add({
      targets: portrait, y: portraitY - 8,
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    // Slide in from right on scene start
    portrait.setX(w + portrait.displayWidth);
    this.tweens.add({
      targets: portrait, x: portraitX,
      duration: 700, ease: 'Back.Out',
    });
    glow.setAlpha(0);
    this.tweens.add({ targets: glow, alpha: 0.12, duration: 700 });
  }

  // ─── Text box ─────────────────────────────────────────────────────────────────

  private buildTextBox(w: number, h: number, accent: number): void {
    const hPad = 22;
    const boxX = hPad;
    const boxY = h * 0.10;
    const boxW = w * 0.58;
    const boxH = h * 0.80;
    const innerPad = 20;

    // Frosted dark panel
    const box = this.add.graphics();
    box.fillStyle(0x000033, 0.55);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 14);
    box.lineStyle(1.5, accent, 0.45);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 14);

    // Top accent bar
    box.fillStyle(accent, 0.25);
    box.fillRoundedRect(boxX, boxY, boxW, 4, { tl: 14, tr: 14, bl: 0, br: 0 });

    // Georgian story text — left aligned, full-width word wrap
    this.storyText = this.add.text(
      boxX + innerPad,
      boxY + innerPad,
      '',
      {
        fontSize: '18px',
        color: '#e8eeff',
        fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
        wordWrap: { width: boxW - innerPad * 2 },
        lineSpacing: 10,
      }
    );

    // "განაგრძე ▶" at bottom of box — hidden until text completes
    this.tapPrompt = this.add.text(
      w / 2,
      boxY + boxH - innerPad,
      'განაგრძე  ▶',
      {
        fontSize: '17px',
        color: '#' + accent.toString(16).padStart(6, '0'),
        fontFamily: 'Orbitron, Arial Unicode MS, Noto Sans Georgian, Arial',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 1).setAlpha(0);
  }

  // ─── Skip button ──────────────────────────────────────────────────────────────

  private buildSkipButton(w: number, accent: number): void {
    const bx = w - 52;
    const by = 30;
    const bw = 80;
    const bh = 32;

    const bg = this.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(0x000000, hover ? 0.80 : 0.55);
      bg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 8);
      bg.lineStyle(1, accent, 0.55);
      bg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 8);
    };
    draw(false);

    this.add.text(bx, by, 'SKIP ▶', {
      fontSize: '14px',
      color: '#aaaacc',
      fontFamily: 'Orbitron, Arial',
    }).setOrigin(0.5);

    const zone = this.add.zone(bx, by, bw, bh).setInteractive();
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerdown', () => this.advance());
  }

  // ─── Audio ────────────────────────────────────────────────────────────────────

  private duckMenuMusic(): void {
    const mgr = this.sound as unknown as { sounds: Phaser.Sound.BaseSound[] };
    const track = mgr.sounds?.find(s => s.key === 'music-menu');
    if (track) {
      this.tweens.add({ targets: track, volume: 0.30, duration: 700 });
    }
  }

  private playIntroVoice(story: StoryConfig): void {
    if (!story.introAudioKey || !this.cache.audio.has(story.introAudioKey)) {
      // No voice: auto-advance after generous delay
      this.time.delayedCall(14000, () => this.advance());
      return;
    }

    this.introSound = this.sound.add(story.introAudioKey, { volume: 1.0 });
    this.introSound.play();

    // Auto-advance when narration ends naturally
    this.introSound.once('complete', () => this.advance());
  }

  // ─── Typewriter ───────────────────────────────────────────────────────────────

  private startTypewriter(): void {
    // Single tap during typing → skip to full text instantly
    this.input.once('pointerdown', () => {
      if (this.typeTimer) this.skipTyping();
    });

    this.typeTimer = this.time.addEvent({
      delay: CHAR_DELAY_MS,
      repeat: this.fullText.length - 1,
      callback: () => {
        this.charIndex++;
        this.storyText.setText(this.fullText.slice(0, this.charIndex));
        if (this.charIndex >= this.fullText.length) this.onTextComplete();
      },
    });
  }

  private skipTyping(): void {
    if (this.typeTimer) { this.typeTimer.remove(); this.typeTimer = null; }
    this.charIndex = this.fullText.length;
    this.storyText.setText(this.fullText);
    this.onTextComplete();
  }

  private onTextComplete(): void {
    this.typeTimer = null;

    // Fade in blinking "განაგრძე ▶"
    this.tweens.add({
      targets: this.tapPrompt,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: this.tapPrompt,
          alpha: 0.25,
          duration: 650,
          yoyo: true,
          repeat: -1,
        });
      },
    });

    // Next tap after text is shown → advance
    this.input.once('pointerdown', () => this.advance());
  }

  // ─── Advance ─────────────────────────────────────────────────────────────────

  private advance(): void {
    if (this.advanced) return;
    this.advanced = true;
    this.cleanup();
    this.scene.start('GameScene', { mode: this.mode });
  }

  private cleanup(): void {
    if (this.typeTimer) { this.typeTimer.remove(); this.typeTimer = null; }
    if (this.introSound) {
      this.introSound.stop();
      this.introSound.destroy();
      this.introSound = null;
    }
  }
}

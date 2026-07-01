import * as Phaser from 'phaser';

// ─── PULSAR weapon visuals ──────────────────────────────────────────────────
// A "rolling circles" projectile: a white core wrapped in a pulsing cyan halo,
// orbited by three flashing satellite dots (cyan / magenta / gold) that spin as
// it climbs, leaving a short fading trail. On impact it blooms into expanding
// shock rings + a white flash + radial sparks. All procedural (no art assets),
// and animated from updatePulsar() each frame rather than repeat:-1 tweens, so
// it's safe to create/destroy rapidly in GameScene.

const ADD     = Phaser.BlendModes.ADD;
const CYAN    = 0x00eaff;
const MAGENTA = 0xff3df0;
const GOLD    = 0xffe000;

export interface PulsarBullet {
  container: Phaser.GameObjects.Container;
  ring:      Phaser.GameObjects.Container;
  core:      Phaser.GameObjects.Arc;
  halo:      Phaser.GameObjects.Arc;
  glow:      Phaser.GameObjects.Arc;
  age:       number;   // ms since spawn
  lastTrail: number;   // ms timestamp of last trail puff
  scale:     number;
}

export function createPulsarBullet(
  scene: Phaser.Scene, x: number, y: number, scale = 1,
): PulsarBullet {
  // Two stacked additive discs approximate a soft radial glow (Arc can't gradient).
  const glow = scene.add.circle(0, 0, 30 * scale, CYAN, 0.16).setBlendMode(ADD);
  const halo = scene.add.circle(0, 0, 15 * scale, CYAN, 0.60).setBlendMode(ADD);
  const core = scene.add.circle(0, 0, 6  * scale, 0xffffff, 1).setBlendMode(ADD);

  const R = 16 * scale;
  const sats = [CYAN, MAGENTA, GOLD].map((col, i) => {
    const a = (i / 3) * Math.PI * 2;
    return scene.add.circle(Math.cos(a) * R, Math.sin(a) * R, 4.5 * scale, col, 1)
      .setBlendMode(ADD);
  });
  const ring = scene.add.container(0, 0, sats);

  const container = scene.add.container(x, y, [glow, halo, ring, core]).setDepth(6);

  return { container, ring, core, halo, glow, age: 0, lastTrail: 0, scale };
}

// Advance spin + pulse; drop a fading trail puff. Call once per frame.
export function updatePulsar(scene: Phaser.Scene, p: PulsarBullet, dtMs: number): void {
  p.age += dtMs;
  const t = p.age * 0.02;

  p.ring.rotation += dtMs * 0.013;                       // satellites roll around
  p.core.setScale(1 + Math.sin(t) * 0.30);               // core throb
  p.halo.setScale(1 + Math.sin(t + 1) * 0.35);           // halo breathe
  p.halo.setAlpha(0.45 + (Math.sin(t) * 0.5 + 0.5) * 0.35);
  p.glow.setScale(1 + Math.sin(t * 0.7) * 0.18);         // outer aura drift
  p.glow.setAlpha(0.12 + (Math.sin(t + 2) * 0.5 + 0.5) * 0.12);

  if (p.age - p.lastTrail >= 40) {                       // light trail (~25 fps)
    p.lastTrail = p.age;
    const ghost = scene.add.circle(p.container.x, p.container.y, 5 * p.scale, CYAN, 0.5)
      .setBlendMode(ADD).setDepth(5);
    scene.tweens.add({
      targets: ghost, scale: 0.2, alpha: 0, duration: 260,
      onComplete: () => ghost.destroy(),
    });
  }
}

export function destroyPulsar(p: PulsarBullet): void {
  p.container.destroy(true); // true → destroy children (halo, ring+sats, core)
}

// Impact bloom — fire-and-forget, self-disposing.
export function pulsarBlast(scene: Phaser.Scene, x: number, y: number, scale = 1): void {
  const ringOf = (color: number, lw: number, to: number, dur: number, delay: number) => {
    const r = scene.add.circle(x, y, 7 * scale, color, 0)
      .setStrokeStyle(lw, color, 1).setBlendMode(ADD).setDepth(8);
    scene.tweens.add({
      targets: r, scale: to, alpha: 0, duration: dur, delay, ease: 'Cubic.Out',
      onComplete: () => r.destroy(),
    });
  };
  ringOf(CYAN,    4, 6.5, 420, 0);
  ringOf(MAGENTA, 3, 4.5, 340, 70);

  const flash = scene.add.circle(x, y, 22 * scale, 0xffffff, 0.95).setBlendMode(ADD).setDepth(9);
  scene.tweens.add({ targets: flash, scale: 0.1, alpha: 0, duration: 260, onComplete: () => flash.destroy() });

  const cols = [CYAN, MAGENTA, GOLD, 0xffffff];
  for (let i = 0; i < 12; i++) {
    const a    = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
    const dist = (26 + Math.random() * 26) * scale;
    const spark = scene.add.circle(x, y, (2 + Math.random() * 2) * scale,
      cols[i % cols.length], 1).setBlendMode(ADD).setDepth(8);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist,
      scale: 0.1, alpha: 0,
      duration: 300 + Math.random() * 220, ease: 'Cubic.Out',
      onComplete: () => spark.destroy(),
    });
  }
}

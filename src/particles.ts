// ============================================================
// CHAOS OFFICE — Particle System
// ============================================================

import { Particle } from './types.js';
import { MAX_PARTICLES } from './constants.js';

export class ParticleSystem {
  pool: Particle[];
  active: Particle[];

  constructor() {
    this.pool = Array.from({ length: MAX_PARTICLES }, () => ({
      x: 0, y: 0, vx: 0, vy: 0,
      color: 0xFFFFFF, alpha: 1, size: 3,
      lifetime: 0, maxLifetime: 1,
      gravity: 80, active: false,
    }));
    this.active = [];
  }

  spawn(
    x: number, y: number,
    color: number,
    count: number = 6,
    opts: {
      gravity?: number;
      speed?: number;
      size?: number;
      lifetime?: number;
    } = {}
  ): void {
    const { gravity = 80, speed = 60, size = 3, lifetime = 0.7 } = opts;
    for (let i = 0; i < count; i++) {
      const p = this.getFree();
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.5);
      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = Math.cos(angle) * s;
      p.vy = Math.sin(angle) * s;
      p.color = color;
      p.alpha = 1;
      p.size = size * (0.7 + Math.random() * 0.6);
      p.lifetime = lifetime * (0.7 + Math.random() * 0.6);
      p.maxLifetime = p.lifetime;
      p.gravity = gravity;
      p.active = true;
      this.active.push(p);
    }
  }

  spawnGossipWave(x: number, y: number, hue: number): void {
    const color = hslToHex(hue, 0.8, 0.6);
    for (let i = 0; i < 8; i++) {
      const p = this.getFree();
      if (!p) return;
      const angle = (i / 8) * Math.PI * 2;
      const speed = 40 + Math.random() * 30;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = color;
      p.alpha = 0.8;
      p.size = 4;
      p.lifetime = 0.5;
      p.maxLifetime = 0.5;
      p.gravity = 0;
      p.active = true;
      this.active.push(p);
    }
  }

  spawnFireSparks(x: number, y: number): void {
    this.spawn(x, y, 0xEF6361, 12, { speed: 80, size: 2.5, lifetime: 0.4, gravity: 40 });
    this.spawn(x, y, 0xF8A153, 8, { speed: 60, size: 2, lifetime: 0.35, gravity: 30 });
  }

  spawnCoffeeSplash(x: number, y: number): void {
    this.spawn(x, y, 0x5C3D2E, 8, { speed: 50, size: 3, lifetime: 0.5, gravity: 120 });
    this.spawn(x, y, 0x8B5E3C, 4, { speed: 35, size: 2, lifetime: 0.4, gravity: 100 });
  }

  spawnStars(x: number, y: number): void {
    this.spawn(x, y, 0xF6D937, 8, { speed: 70, size: 4, lifetime: 0.5, gravity: 20 });
  }

  spawnPentagramGlow(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const p = this.getFree();
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 100;
      const speed = 20 + Math.random() * 30;
      p.x = x + Math.cos(angle) * radius;
      p.y = y + Math.sin(angle) * radius;
      p.vx = Math.cos(angle + Math.PI / 2) * speed;
      p.vy = Math.sin(angle + Math.PI / 2) * speed;
      p.color = 0x2A2A2A;
      p.alpha = 0.8;
      p.size = 5;
      p.lifetime = 1.5;
      p.maxLifetime = 1.5;
      p.gravity = 0;
      p.active = true;
      this.active.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.lifetime -= dt;
      if (p.lifetime <= 0) {
        p.active = false;
        this.active.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha = p.lifetime / p.maxLifetime;
    }
  }

  private getFree(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null;
  }
}

export function hslToHex(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

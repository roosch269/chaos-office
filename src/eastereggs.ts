// ============================================================
// CHAOS OFFICE — Easter Egg Detection & Effects
// ============================================================
// sha256("**Status:** IMMUTABLE until explicit version bump.") =
// 5b2fb417813b37dc8e36fc635a6dd12978770f4568cb25f95a3d3b3602d917e6

import {
  PENTAGON_CHECK_INTERVAL, PENTAGON_RADIUS_MIN, PENTAGON_RADIUS_MAX, PENTAGON_TOLERANCE,
  CHAOS_ORDER_THRESHOLD,
} from './constants.js';
import { AgentState, EventType } from './types.js';
import type { World } from './world.js';

export interface EasterEggState {
  observerUnlocked: boolean;
  pentagonCheckTimer: number;
  fridayChecked: boolean;
  emergentOrderTriggered: boolean;
  orderTimer: number;
}

// ============================================================
// Main check function (called each frame)
// ============================================================
export function checkEasterEggs(world: World, dt: number, state: EasterEggState): void {
  // 1. Codex Pentagon
  checkCodexPentagon(world, dt, state);

  // 2. Friday 17:01
  checkFriday1701(world, state);

  // 3. Emergent Order
  checkEmergentOrder(world, dt, state);
}

// ============================================================
// Egg 1: Codex Pentagon
// ============================================================
function checkCodexPentagon(world: World, dt: number, state: EasterEggState): void {
  if (state.observerUnlocked) return;

  state.pentagonCheckTimer -= dt;
  if (state.pentagonCheckTimer > 0) return;
  state.pentagonCheckTimer = PENTAGON_CHECK_INTERVAL;

  const agents = world.agents.filter(a =>
    a.state !== AgentState.ESCAPED &&
    a.state !== AgentState.EATING &&
    a.state !== AgentState.PANICKING
  );

  if (agents.length < 5) return;

  // Check all combinations of 5 agents (limit to first 50 for performance)
  const sample = agents.slice(0, 50);

  for (let i = 0; i < sample.length - 4; i++) {
    for (let j = i + 1; j < sample.length - 3; j++) {
      for (let k = j + 1; k < sample.length - 2; k++) {
        for (let l = k + 1; l < sample.length - 1; l++) {
          for (let m = l + 1; m < sample.length; m++) {
            const five = [sample[i], sample[j], sample[k], sample[l], sample[m]];
            if (isPentagonFormation(five)) {
              world.unlockObserver();
              return;
            }
          }
        }
      }
    }
  }
}

function isPentagonFormation(agents: Array<{ x: number; y: number }>): boolean {
  // Compute centroid
  const cx = agents.reduce((s, a) => s + a.x, 0) / 5;
  const cy = agents.reduce((s, a) => s + a.y, 0) / 5;

  // Check radii
  const radii = agents.map(a => Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2));
  const meanR = radii.reduce((s, r) => s + r, 0) / 5;

  if (meanR < PENTAGON_RADIUS_MIN || meanR > PENTAGON_RADIUS_MAX) return false;
  if (Math.max(...radii) - Math.min(...radii) > PENTAGON_TOLERANCE) return false;

  // Sort by angle and check angular gaps ≈ 72° each
  const angles = agents
    .map(a => Math.atan2(a.y - cy, a.x - cx) * (180 / Math.PI))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 0; i < 4; i++) {
    gaps.push(angles[i + 1] - angles[i]);
  }
  gaps.push(360 - angles[4] + angles[0]);

  const tolerance = 20; // degrees
  return gaps.every(g => g >= 72 - tolerance && g <= 72 + tolerance);
}

// ============================================================
// Egg 2: Friday 17:01
// ============================================================
function checkFriday1701(world: World, state: EasterEggState): void {
  const now = new Date();
  const isFriday1701 = now.getDay() === 5 && now.getHours() === 17 && now.getMinutes() >= 1;

  if (isFriday1701 && !state.fridayChecked) {
    state.fridayChecked = true;
    if (!world.fridayMode) {
      world.toggleFridayMode(true);
    }
    world.trigger1701();
    showWeekendCountdown();
  }

  // Reset on Saturday
  if (now.getDay() !== 5) {
    state.fridayChecked = false;
    hideWeekendCountdown();
  }
}

function showWeekendCountdown(): void {
  const el = document.getElementById('weekend-countdown');
  if (el) el.classList.add('visible');
  updateCountdownTimer();
}

function hideWeekendCountdown(): void {
  const el = document.getElementById('weekend-countdown');
  if (el) el.classList.remove('visible');
}

function updateCountdownTimer(): void {
  const el = document.getElementById('countdown-time');
  if (!el) return;

  const update = () => {
    const now = new Date();
    // Next Saturday midnight
    const target = new Date(now);
    target.setDate(target.getDate() + (6 - now.getDay()));
    target.setHours(0, 0, 0, 0);
    const diff = Math.max(0, target.getTime() - now.getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  update();
  setInterval(update, 1000);
}

// ============================================================
// Egg 4: Emergent Order
// ============================================================
function checkEmergentOrder(world: World, dt: number, state: EasterEggState): void {
  if (world.chaosIndex < CHAOS_ORDER_THRESHOLD) {
    state.orderTimer += dt;
    if (state.orderTimer >= 3.0 && !state.emergentOrderTriggered) {
      state.emergentOrderTriggered = true;
      triggerEmergentOrder(world);
    }
  } else {
    state.orderTimer = 0;
    if (state.emergentOrderTriggered) {
      state.emergentOrderTriggered = false; // can trigger again
    }
  }
}

function triggerEmergentOrder(world: World): void {
  world.callbacks.onToast('✨ Emergent Order achieved.');
  world.addLog('✨ Emergent Order: agents spontaneously organise!', EventType.GOOD);

  const activeAgents = world.agents.filter(a =>
    a.state !== AgentState.ESCAPED && a.type !== AgentType_OBSERVER
  );

  // Compute grid layout
  const gridPositions = computeGridLayout(activeAgents.length, {
    x: 100, y: 80,
    width: 1400, height: 740,
  });

  for (let i = 0; i < activeAgents.length; i++) {
    const agent = activeAgents[i];
    const pos = gridPositions[i] ?? { x: agent.x, y: agent.y };
    agent.state = AgentState.GRID_OVERRIDE;
    agent.gridTargetX = pos.x;
    agent.gridTargetY = pos.y;
    agent.gridOverrideDuration = 5;
  }

  // Golden radiance effect
  world.particles.spawnPentagramGlow(800, 450);
  setTimeout(() => {
    world.particles.spawnStars(800, 450);
  }, 500);
}

function computeGridLayout(count: number, bounds: { x: number; y: number; width: number; height: number }): Array<{ x: number; y: number }> {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const spacingX = bounds.width / (cols + 1);
  const spacingY = bounds.height / (rows + 1);
  const positions: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (positions.length >= count) break;
      positions.push({
        x: bounds.x + spacingX * (c + 1),
        y: bounds.y + spacingY * (r + 1),
      });
    }
  }
  return positions;
}

// Need AgentType for Observer filter — import via string to avoid circular dep
const AgentType_OBSERVER = 'OBSERVER';

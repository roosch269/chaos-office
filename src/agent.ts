// ============================================================
// CHAOS OFFICE — Agent Class with State Machines
// ============================================================

import { AgentType, AgentState, ChaosMode, GossipColor, CopyBufferEntry } from './types.js';
import {
  BASE_SPEED, PERSONAL_RADIUS, DESK_CLAIM_RADIUS, TICK_DT_CAP,
  GRINDER_AURA_RADIUS, GRINDER_AURA_BOOST,
  WANDER_ANGLE_JITTER, COFFEE_APPROACH_DIST, COFFEE_DWELL_MIN, COFFEE_DWELL_MAX,
  GOSSIP_SEEK_RADIUS, GOSSIP_HUDDLE_RADIUS, GOSSIP_SPREAD_RATE, GOSSIP_SPREAD_RADIUS,
  GOSSIP_MOVE_SPEED_MULT, GOSSIP_HUDDLE_MIN, GOSSIP_HUDDLE_MAX,
  MANAGER_DISPERSE_RADIUS, MANAGER_DISPERSE_FORCE, MANAGER_CONFUSED_MIN, MANAGER_CONFUSED_MAX,
  MANAGER_SCAN_INTERVAL,
  INTERN_COPY_DELAY, INTERN_FOLLOW_RADIUS, INTERN_COPY_WEIGHT,
  CHAOS_SWITCH_MIN, CHAOS_SWITCH_MAX, CHAOS_BREAK_RADIUS, CHAOS_BREAK_CHANCE,
  OBSERVER_NOTE_INTERVAL_MIN, OBSERVER_NOTE_INTERVAL_MAX,
  PIZZA_EAT_MIN, PIZZA_EAT_MAX,
  ALARM_SPEED_MULT, EXIT_REACH_RADIUS,
  CAT_ATTRACT_RADIUS, CAT_AVOID_RADIUS,
  WORLD_WIDTH, WORLD_HEIGHT, AGENT_RADIUS, COLORS,
  PIZZA_ATTRACT_RADIUS,
} from './constants.js';
import { Desk, CoffeeMachine, Exit, PizzaEntity, CatEntity, MeetingRoom } from './types.js';

let _nextId = 0;

// Maximum copy buffer history (2 seconds at 60fps = 120 entries)
const COPY_BUFFER_SIZE = 128;

export class Agent {
  id: number;
  type: AgentType;
  state: AgentState;

  x: number;
  y: number;
  vx: number;
  vy: number;

  heading: number; // angle in radians
  speed: number;

  // Visual
  tint: number;
  alpha: number;
  bobPhase: number;
  bobSpeed: number;
  glowAlpha: number;
  noteAlpha: number;
  noteTimer: number;
  flashTimer: number;
  animPhase: number;

  // State timers
  stateTimer: number;
  scanTimer: number;

  // Grinder
  targetDeskId: number | null;

  // Wanderer
  coffeeTimer: number;

  // Gossip
  personalHue: number;
  gossipColor: GossipColor | null;
  huddleCentX: number;
  huddleCentY: number;

  // Manager
  targetClusterX: number;
  targetClusterY: number;

  // Intern
  copyBuffer: CopyBufferEntry[];
  copyBufferHead: number;
  followTargetId: number;
  loopDetectTimer: number;

  // Chaos Agent
  chaosMode: ChaosMode;
  chaosGrindDeskId: number | null;

  // Observer
  perimeterT: number;
  watchX: number;
  watchY: number;

  // Disturbances
  catResponse: 'ATTRACTED' | 'AVOIDANT' | 'NONE';
  eatTimer: number;
  panicTargetX: number;
  panicTargetY: number;
  gridTargetX: number;
  gridTargetY: number;
  gridOverrideDuration: number;

  // Speed multiplier (from aura/friday etc)
  speedMult: number;

  constructor(type: AgentType, x: number, y: number) {
    this.id = _nextId++;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.heading = Math.random() * Math.PI * 2;
    this.speed = BASE_SPEED;
    this.state = AgentState.WANDERING;
    this.tint = COLORS[type as keyof typeof COLORS] ?? 0xFFFFFF;
    this.alpha = 1;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.bobSpeed = 2 + Math.random() * 2;
    this.glowAlpha = 0;
    this.noteAlpha = 0;
    this.noteTimer = 0;
    this.flashTimer = 0;
    this.animPhase = Math.random() * Math.PI * 2;
    this.stateTimer = 0;
    this.scanTimer = 0;
    this.targetDeskId = null;
    this.coffeeTimer = 0;
    this.personalHue = Math.random() * 360;
    this.gossipColor = null;
    this.huddleCentX = 0;
    this.huddleCentY = 0;
    this.targetClusterX = 0;
    this.targetClusterY = 0;
    this.copyBuffer = new Array(COPY_BUFFER_SIZE).fill(null).map(() => ({
      vx: 0, vy: 0, state: AgentState.WANDERING, timestamp: 0,
    }));
    this.copyBufferHead = 0;
    this.followTargetId = -1;
    this.loopDetectTimer = 0;
    this.chaosMode = ChaosMode.WANDER;
    this.chaosGrindDeskId = null;
    this.perimeterT = Math.random();
    this.watchX = WORLD_WIDTH / 2;
    this.watchY = WORLD_HEIGHT / 2;
    this.catResponse = 'NONE';
    this.eatTimer = 0;
    this.panicTargetX = 0;
    this.panicTargetY = 0;
    this.gridTargetX = 0;
    this.gridTargetY = 0;
    this.gridOverrideDuration = 0;
    this.speedMult = 1;

    this.initForType();
  }

  private initForType(): void {
    switch (this.type) {
      case AgentType.GRINDER:
        this.state = AgentState.SEEKING_DESK;
        break;
      case AgentType.WANDERER:
        this.state = AgentState.WANDERING;
        this.heading = Math.random() * Math.PI * 2;
        break;
      case AgentType.GOSSIP:
        this.state = AgentState.SEEKING_CLUSTER;
        this.personalHue = Math.random() * 360;
        break;
      case AgentType.MANAGER:
        this.state = AgentState.SCANNING;
        break;
      case AgentType.INTERN:
        this.state = AgentState.IDLE;
        break;
      case AgentType.CHAOS_AGENT:
        this.chaosMode = randomChaosMode(null);
        this.state = chaosModeToState(this.chaosMode);
        this.stateTimer = randRange(CHAOS_SWITCH_MIN, CHAOS_SWITCH_MAX);
        break;
      case AgentType.OBSERVER:
        this.state = AgentState.PERIMETER_PATROL;
        this.alpha = 0;
        break;
    }
  }

  /** Reset color tint based on type (called after observer palette shift reverted) */
  resetTint(): void {
    this.tint = COLORS[this.type as keyof typeof COLORS] ?? 0xFFFFFF;
  }
}

// ============================================================
// Utility functions
// ============================================================

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomChaosMode(exclude: ChaosMode | null): ChaosMode {
  const modes = [ChaosMode.WANDER, ChaosMode.GRIND, ChaosMode.GOSSIP, ChaosMode.SPRINT, ChaosMode.FREEZE];
  const available = exclude ? modes.filter(m => m !== exclude) : modes;
  return available[Math.floor(Math.random() * available.length)];
}

export function chaosModeToState(mode: ChaosMode): AgentState {
  switch (mode) {
    case ChaosMode.WANDER: return AgentState.CHAOS_WANDER;
    case ChaosMode.GRIND:  return AgentState.CHAOS_GRIND;
    case ChaosMode.GOSSIP: return AgentState.CHAOS_GOSSIP;
    case ChaosMode.SPRINT: return AgentState.CHAOS_SPRINT;
    case ChaosMode.FREEZE: return AgentState.CHAOS_FREEZE;
  }
}

/** Steer toward target, returns new vx/vy */
export function steerToward(
  ax: number, ay: number,
  tx: number, ty: number,
  speed: number
): { vx: number; vy: number } {
  const dx = tx - ax;
  const dy = ty - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return { vx: 0, vy: 0 };
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

/** Steer away from target */
export function steerAway(
  ax: number, ay: number,
  tx: number, ty: number,
  speed: number
): { vx: number; vy: number } {
  const v = steerToward(ax, ay, tx, ty, speed);
  return { vx: -v.vx, vy: -v.vy };
}

/** Smooth angular steering using heading */
export function angleToward(fromAngle: number, tx: number, ty: number, px: number, py: number): number {
  const target = Math.atan2(ty - py, tx - px);
  let diff = target - fromAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return fromAngle + diff * 0.1;
}

/** Distance squared between two points */
export function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

/** Distance between two points */
export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

/** Separate from neighbours (boids separation) */
export function computeSeparation(
  agent: Agent,
  neighbours: Agent[],
  radius: number
): { fx: number; fy: number } {
  let fx = 0, fy = 0;
  for (const n of neighbours) {
    if (n.id === agent.id) continue;
    const d = dist(agent.x, agent.y, n.x, n.y);
    if (d < radius && d > 0.01) {
      const strength = (radius - d) / radius;
      fx += ((agent.x - n.x) / d) * strength;
      fy += ((agent.y - n.y) / d) * strength;
    }
  }
  return { fx, fy };
}

// ============================================================
// Update functions per agent type
// ============================================================

export interface WorldContext {
  agents: Agent[];
  desks: Desk[];
  coffeeMachine: CoffeeMachine;
  exits: Exit[];
  pizzas: PizzaEntity[];
  cat: CatEntity | null;
  meetingRoom: MeetingRoom | null;
  fridayMode: boolean;
  alarmActive: boolean;
  globalSpeedMult: number;
  spawnParticle: (x: number, y: number, color: number, count?: number, opts?: ParticleOpts) => void;
  addLogEvent: (text: string, type: import('./types.js').EventType) => void;
  quadtreeQuery: (x: number, y: number, r: number) => import('./quadtree.js').QuadPoint[];
  findClusters: (r: number, minSize: number) => import('./quadtree.js').QuadPoint[][];
  getDeskById: (id: number) => Desk | undefined;
  claimDesk: (agentId: number, deskId: number) => boolean;
  releaseDesk: (agentId: number) => void;
  findNearestFreeDesk: (x: number, y: number, agentId: number) => Desk | null;
  findAgentById: (id: number) => Agent | undefined;
  notifyChaosSwitch: () => void; // for chaos metric tracking
}

export interface ParticleOpts {
  gravity?: number;
  speed?: number;
  size?: number;
  lifetime?: number;
}

/** Main agent update — dispatches to type-specific behavior */
export function updateAgent(agent: Agent, dt: number, world: WorldContext): void {
  const cappedDt = Math.min(dt, TICK_DT_CAP);

  // Animate bob/phase
  agent.bobPhase += agent.bobSpeed * cappedDt;
  agent.animPhase += cappedDt * 3;
  if (agent.flashTimer > 0) agent.flashTimer -= cappedDt;
  if (agent.noteTimer > 0) {
    agent.noteTimer -= cappedDt;
    agent.noteAlpha = Math.max(0, agent.noteTimer / 0.5);
  }

  // Handle grid override (Emergent Order easter egg)
  if (agent.state === AgentState.GRID_OVERRIDE) {
    agent.gridOverrideDuration -= cappedDt;
    if (agent.gridOverrideDuration <= 0) {
      agent.state = defaultStateForType(agent.type);
      return;
    }
    const sv = steerToward(agent.x, agent.y, agent.gridTargetX, agent.gridTargetY, BASE_SPEED * 0.6 * world.globalSpeedMult);
    agent.vx = sv.vx;
    agent.vy = sv.vy;
    return;
  }

  // Panicking overrides everything (except Observer)
  if (agent.state === AgentState.PANICKING && agent.type !== AgentType.OBSERVER) {
    updatePanicking(agent, cappedDt, world);
    return;
  }
  if (agent.state === AgentState.ESCAPED) {
    agent.vx = 0; agent.vy = 0;
    return;
  }
  if (agent.state === AgentState.POST_ALARM) {
    agent.stateTimer -= cappedDt;
    if (agent.stateTimer <= 0) agent.state = defaultStateForType(agent.type);
    // slow confused wander
    agent.heading += (Math.random() - 0.5) * 2 * cappedDt;
    agent.vx = Math.cos(agent.heading) * BASE_SPEED * 0.3;
    agent.vy = Math.sin(agent.heading) * BASE_SPEED * 0.3;
    return;
  }

  // Eating pizza
  if (agent.state === AgentState.EATING) {
    agent.eatTimer -= cappedDt;
    agent.vx = 0; agent.vy = 0;
    if (agent.eatTimer <= 0) {
      agent.state = AgentState.POST_PIZZA;
      agent.stateTimer = 3;
    }
    return;
  }
  if (agent.state === AgentState.POST_PIZZA) {
    agent.stateTimer -= cappedDt;
    agent.heading += (Math.random() - 0.5) * 1.5 * cappedDt;
    agent.vx = Math.cos(agent.heading) * BASE_SPEED * 0.4 * world.globalSpeedMult;
    agent.vy = Math.sin(agent.heading) * BASE_SPEED * 0.4 * world.globalSpeedMult;
    if (agent.stateTimer <= 0) {
      agent.state = defaultStateForType(agent.type);
    }
    return;
  }

  // Meeting room
  if (agent.state === AgentState.IN_MEETING) {
    agent.vx = 0; agent.vy = 0;
    agent.stateTimer -= cappedDt;
    // Gossip bonus handled by world
    return;
  }
  if (agent.state === AgentState.POST_MEETING) {
    agent.stateTimer -= cappedDt;
    if (agent.stateTimer <= 0) {
      agent.state = defaultStateForType(agent.type);
    }
    agent.heading += (Math.random() - 0.5) * 2 * cappedDt;
    agent.vx = Math.cos(agent.heading) * BASE_SPEED * 0.3 * world.globalSpeedMult;
    agent.vy = Math.sin(agent.heading) * BASE_SPEED * 0.3 * world.globalSpeedMult;
    return;
  }

  // Type-specific behavior
  switch (agent.type) {
    case AgentType.GRINDER:    updateGrinder(agent, cappedDt, world); break;
    case AgentType.WANDERER:   updateWanderer(agent, cappedDt, world); break;
    case AgentType.GOSSIP:     updateGossip(agent, cappedDt, world); break;
    case AgentType.MANAGER:    updateManager(agent, cappedDt, world); break;
    case AgentType.INTERN:     updateIntern(agent, cappedDt, world); break;
    case AgentType.CHAOS_AGENT:updateChaosAgent(agent, cappedDt, world); break;
    case AgentType.OBSERVER:   updateObserver(agent, cappedDt, world); break;
  }
}

function defaultStateForType(type: AgentType): AgentState {
  switch (type) {
    case AgentType.GRINDER: return AgentState.SEEKING_DESK;
    case AgentType.WANDERER: return AgentState.WANDERING;
    case AgentType.GOSSIP: return AgentState.SEEKING_CLUSTER;
    case AgentType.MANAGER: return AgentState.SCANNING;
    case AgentType.INTERN: return AgentState.IDLE;
    case AgentType.CHAOS_AGENT: return AgentState.CHAOS_WANDER;
    case AgentType.OBSERVER: return AgentState.PERIMETER_PATROL;
  }
}

// ============================================================
// GRINDER BEHAVIOR
// ============================================================
function updateGrinder(agent: Agent, dt: number, world: WorldContext): void {
  const speed = BASE_SPEED * 1.1 * world.globalSpeedMult * agent.speedMult;

  switch (agent.state) {
    case AgentState.SEEKING_DESK: {
      // Find target desk
      if (agent.targetDeskId === null) {
        const desk = world.findNearestFreeDesk(agent.x, agent.y, agent.id);
        if (desk) {
          world.claimDesk(agent.id, desk.id);
          agent.targetDeskId = desk.id;
        } else {
          // No desk: slow wander
          doWander(agent, dt, BASE_SPEED * 0.3 * world.globalSpeedMult);
          return;
        }
      }
      const desk = world.getDeskById(agent.targetDeskId!);
      if (!desk || desk.broken) {
        agent.targetDeskId = null;
        world.releaseDesk(agent.id);
        return;
      }
      if (desk.claimedBy !== agent.id) {
        // Stolen! Find another
        agent.targetDeskId = null;
        return;
      }
      const deskCX = desk.x + desk.width / 2;
      const deskCY = desk.y + desk.height / 2;
      const d = dist(agent.x, agent.y, deskCX, deskCY);
      if (d < DESK_CLAIM_RADIUS) {
        agent.state = AgentState.SEATED;
        agent.x = deskCX;
        agent.y = deskCY + desk.height * 0.4;
        agent.vx = 0; agent.vy = 0;
        agent.glowAlpha = 0.3;
      } else {
        const sv = steerToward(agent.x, agent.y, deskCX, deskCY, speed);
        agent.vx = sv.vx;
        agent.vy = sv.vy;
      }
      break;
    }
    case AgentState.SEATED: {
      agent.vx = 0; agent.vy = 0;
      agent.glowAlpha = 0.4 + Math.sin(agent.animPhase) * 0.15;
      // Aura handled by world system
      break;
    }
    case AgentState.DISTURBED: {
      agent.stateTimer -= dt;
      doWander(agent, dt, BASE_SPEED * 0.6 * world.globalSpeedMult);
      if (agent.stateTimer <= 0) {
        agent.state = AgentState.SEEKING_DESK;
        agent.targetDeskId = null;
      }
      break;
    }
  }
}

// ============================================================
// WANDERER BEHAVIOR
// ============================================================
function updateWanderer(agent: Agent, dt: number, world: WorldContext): void {
  const speed = BASE_SPEED * 0.8 * world.globalSpeedMult * agent.speedMult;

  switch (agent.state) {
    case AgentState.WANDERING: {
      // Lévy-flight-style random walk
      if (Math.random() < 0.02 * dt) {
        agent.heading += randRange(-WANDER_ANGLE_JITTER, WANDER_ANGLE_JITTER) * (Math.PI / 180);
      }
      if (Math.random() < 0.005 * dt) {
        agent.state = AgentState.HEADING_TO_COFFEE;
      }
      // Migrate toward pizza if active
      if (world.pizzas.length > 0) {
        const pizza = world.pizzas[0];
        const d = dist(agent.x, agent.y, pizza.x, pizza.y);
        if (d < PIZZA_ATTRACT_RADIUS) {
          agent.heading = Math.atan2(pizza.y - agent.y, pizza.x - agent.x);
        }
      }
      // Cat response
      applyCatResponse(agent, dt, world);
      agent.vx = Math.cos(agent.heading) * speed;
      agent.vy = Math.sin(agent.heading) * speed;
      break;
    }
    case AgentState.HEADING_TO_COFFEE: {
      const cm = world.coffeeMachine;
      const cmX = cm.x + cm.width / 2;
      const cmY = cm.y + cm.height / 2;
      const sv = steerToward(agent.x, agent.y, cmX, cmY, speed);
      agent.vx = sv.vx; agent.vy = sv.vy;
      agent.heading = Math.atan2(agent.vy, agent.vx);
      if (dist(agent.x, agent.y, cmX, cmY) < COFFEE_APPROACH_DIST) {
        agent.state = AgentState.AT_COFFEE;
        agent.coffeeTimer = randRange(COFFEE_DWELL_MIN, COFFEE_DWELL_MAX);
        agent.vx = 0; agent.vy = 0;
        agent.flashTimer = 0.5; // brief happy flash
      }
      break;
    }
    case AgentState.AT_COFFEE: {
      agent.vx = 0; agent.vy = 0;
      agent.coffeeTimer -= dt;
      if (agent.coffeeTimer <= 0) {
        agent.heading = Math.random() * Math.PI * 2;
        agent.state = AgentState.WANDERING;
      }
      break;
    }
    case AgentState.BUMP_RECOVERY: {
      agent.stateTimer -= dt;
      agent.vx *= 0.8;
      agent.vy *= 0.8;
      if (agent.stateTimer <= 0) {
        agent.state = AgentState.WANDERING;
      }
      break;
    }
  }
}

// ============================================================
// GOSSIP BEHAVIOR
// ============================================================
function updateGossip(agent: Agent, dt: number, world: WorldContext): void {
  const speed = BASE_SPEED * GOSSIP_MOVE_SPEED_MULT * world.globalSpeedMult * agent.speedMult;
  const seekRadius = world.fridayMode ? GOSSIP_SEEK_RADIUS * 1.5 : GOSSIP_SEEK_RADIUS;

  switch (agent.state) {
    case AgentState.SEEKING_CLUSTER: {
      const clusters = world.findClusters(seekRadius, 3);
      if (clusters.length > 0) {
        // Find largest cluster not containing self
        let bestCluster = clusters[0];
        let bestSize = 0;
        for (const c of clusters) {
          if (c.find(p => p.id === agent.id)) continue;
          if (c.length > bestSize) {
            bestSize = c.length;
            bestCluster = c;
          }
        }
        if (bestSize > 0) {
          const centX = bestCluster.reduce((s, p) => s + p.x, 0) / bestCluster.length;
          const centY = bestCluster.reduce((s, p) => s + p.y, 0) / bestCluster.length;
          const sv = steerToward(agent.x, agent.y, centX, centY, speed);
          agent.vx = sv.vx; agent.vy = sv.vy;
          if (dist(agent.x, agent.y, centX, centY) < GOSSIP_HUDDLE_RADIUS) {
            agent.state = AgentState.IN_HUDDLE;
            agent.stateTimer = randRange(GOSSIP_HUDDLE_MIN, GOSSIP_HUDDLE_MAX);
            agent.huddleCentX = centX;
            agent.huddleCentY = centY;
          }
        } else {
          doWander(agent, dt, BASE_SPEED * 0.5 * world.globalSpeedMult);
        }
      } else {
        doWander(agent, dt, BASE_SPEED * 0.5 * world.globalSpeedMult);
      }
      break;
    }
    case AgentState.IN_HUDDLE: {
      agent.vx = 0; agent.vy = 0;
      agent.stateTimer -= dt;

      // Spread gossip color to neighbours
      const neighbours = world.quadtreeQuery(agent.x, agent.y, GOSSIP_SPREAD_RADIUS);
      for (const n of neighbours) {
        const other = world.findAgentById(n.id);
        if (!other || other.id === agent.id) continue;
        if (other.gossipColor) {
          // Lerp hue toward own
          const diff = agent.personalHue - other.gossipColor.hue;
          other.gossipColor.hue += diff * GOSSIP_SPREAD_RATE * dt;
          other.gossipColor.hue = ((other.gossipColor.hue % 360) + 360) % 360;
        } else {
          // Infect
          if (Math.random() < 0.01 * dt) {
            other.gossipColor = {
              hue: agent.personalHue,
              saturation: 0.5,
              lightness: 0.65,
              decayTimer: randRange(10, 30),
            };
          }
        }
      }

      if (agent.stateTimer <= 0) {
        agent.state = AgentState.MOVING_ON;
        agent.stateTimer = 2;
      }
      break;
    }
    case AgentState.MOVING_ON: {
      // Move away from huddle centroid
      const sv = steerAway(agent.x, agent.y, agent.huddleCentX, agent.huddleCentY, speed);
      agent.vx = sv.vx; agent.vy = sv.vy;
      agent.stateTimer -= dt;
      if (agent.stateTimer <= 0) {
        agent.state = AgentState.SEEKING_CLUSTER;
      }
      break;
    }
  }

  // Decay gossip color
  if (agent.gossipColor) {
    agent.gossipColor.decayTimer -= dt;
    if (agent.gossipColor.decayTimer <= 0) {
      agent.gossipColor = null;
    }
  }
}

// ============================================================
// MANAGER BEHAVIOR
// ============================================================
function updateManager(agent: Agent, dt: number, world: WorldContext): void {
  const speed = BASE_SPEED * 0.9 * world.globalSpeedMult * agent.speedMult;

  // Herding overrides
  if (agent.state === AgentState.HERDING && world.meetingRoom) {
    updateManagerHerding(agent, dt, world, speed);
    return;
  }
  if (!world.meetingRoom && agent.state === AgentState.HERDING) {
    agent.state = AgentState.SCANNING;
  }
  // If meeting room placed and not herding, switch to herding
  if (world.meetingRoom && agent.state !== AgentState.HERDING && agent.state !== AgentState.IN_MEETING) {
    agent.state = AgentState.HERDING;
    return;
  }

  agent.scanTimer -= dt;

  switch (agent.state) {
    case AgentState.SCANNING: {
      const clusters = world.findClusters(80, 3);
      if (clusters.length > 0) {
        let biggest = clusters[0];
        for (const c of clusters) {
          if (c.length > biggest.length) biggest = c;
        }
        agent.targetClusterX = biggest.reduce((s, p) => s + p.x, 0) / biggest.length;
        agent.targetClusterY = biggest.reduce((s, p) => s + p.y, 0) / biggest.length;
        agent.state = AgentState.APPROACHING;
      } else {
        doWander(agent, dt, BASE_SPEED * 0.6 * world.globalSpeedMult);
      }
      break;
    }
    case AgentState.APPROACHING: {
      // Re-evaluate clusters periodically
      if (agent.scanTimer <= 0) {
        agent.scanTimer = MANAGER_SCAN_INTERVAL;
        const clusters = world.findClusters(80, 3);
        if (clusters.length > 0) {
          let biggest = clusters[0];
          for (const c of clusters) { if (c.length > biggest.length) biggest = c; }
          agent.targetClusterX = biggest.reduce((s, p) => s + p.x, 0) / biggest.length;
          agent.targetClusterY = biggest.reduce((s, p) => s + p.y, 0) / biggest.length;
        } else {
          agent.state = AgentState.SCANNING;
          return;
        }
      }
      const sv = steerToward(agent.x, agent.y, agent.targetClusterX, agent.targetClusterY, speed);
      agent.vx = sv.vx; agent.vy = sv.vy;
      if (dist(agent.x, agent.y, agent.targetClusterX, agent.targetClusterY) < MANAGER_DISPERSE_RADIUS) {
        agent.state = AgentState.DISPERSING;
      }
      break;
    }
    case AgentState.DISPERSING: {
      // Apply impulse to nearby agents
      const nearby = world.quadtreeQuery(agent.x, agent.y, MANAGER_DISPERSE_RADIUS);
      for (const n of nearby) {
        const other = world.findAgentById(n.id);
        if (!other || other.id === agent.id || other.type === AgentType.OBSERVER) continue;
        const dx = other.x - agent.x;
        const dy = other.y - agent.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        other.vx += (dx / d) * MANAGER_DISPERSE_FORCE;
        other.vy += (dy / d) * MANAGER_DISPERSE_FORCE;
        // Disrupt gossip huddles
        if (other.state === AgentState.IN_HUDDLE) {
          other.state = AgentState.MOVING_ON;
          other.stateTimer = 1.5;
        }
      }
      world.spawnParticle(agent.x, agent.y, 0x8B4AE2, 8);
      agent.stateTimer = randRange(MANAGER_CONFUSED_MIN, MANAGER_CONFUSED_MAX);
      agent.state = AgentState.CONFUSED;
      break;
    }
    case AgentState.CONFUSED: {
      agent.stateTimer -= dt;
      doWander(agent, dt, BASE_SPEED * 0.4 * world.globalSpeedMult);
      if (agent.stateTimer <= 0) {
        agent.state = AgentState.SCANNING;
      }
      break;
    }
  }
}

function updateManagerHerding(agent: Agent, dt: number, world: WorldContext, speed: number): void {
  if (!world.meetingRoom) return;
  const mr = world.meetingRoom;
  const mrCX = mr.x + mr.width / 2;
  const mrCY = mr.y + mr.height / 2;

  // Move toward meeting room center
  const sv = steerToward(agent.x, agent.y, mrCX, mrCY, speed * 1.1);
  agent.vx = sv.vx; agent.vy = sv.vy;

  if (dist(agent.x, agent.y, mrCX, mrCY) < mr.width / 2) {
    agent.state = AgentState.IN_MEETING;
    agent.vx = 0; agent.vy = 0;
    if (!mr.occupants.has(agent.id)) mr.occupants.add(agent.id);
  }
}

// ============================================================
// INTERN BEHAVIOR
// ============================================================
function updateIntern(agent: Agent, dt: number, world: WorldContext): void {
  const now = performance.now() / 1000;

  // Push current state to copy buffer
  agent.copyBuffer[agent.copyBufferHead] = {
    vx: agent.vx, vy: agent.vy,
    state: agent.state,
    timestamp: now,
  };
  agent.copyBufferHead = (agent.copyBufferHead + 1) % COPY_BUFFER_SIZE;

  switch (agent.state) {
    case AgentState.IDLE: {
      const target = findNearestAgent(agent, world.agents, INTERN_FOLLOW_RADIUS);
      if (target) {
        agent.followTargetId = target.id;
        agent.state = AgentState.FOLLOWING;
        agent.loopDetectTimer = 5;
      } else {
        doWander(agent, dt, BASE_SPEED * 0.3 * world.globalSpeedMult);
      }
      break;
    }
    case AgentState.FOLLOWING: {
      const target = world.findAgentById(agent.followTargetId);
      if (!target || dist(agent.x, agent.y, target.x, target.y) > INTERN_FOLLOW_RADIUS * 1.5) {
        agent.state = AgentState.IDLE;
        agent.followTargetId = -1;
        return;
      }
      // Loop detection: two interns following each other
      agent.loopDetectTimer -= dt;
      if (agent.loopDetectTimer <= 0) {
        agent.loopDetectTimer = 5;
        if (target.type === AgentType.INTERN && target.followTargetId === agent.id) {
          // Break the loop
          agent.heading += Math.PI * 0.7;
          agent.state = AgentState.IDLE;
          return;
        }
      }
      // Get 2-second-old velocity from target
      const delayedEntry = getDelayedBufferEntry(target, now - INTERN_COPY_DELAY);
      if (delayedEntry) {
        const selfSteerX = target.x;
        const selfSteerY = target.y;
        const selfSV = steerToward(agent.x, agent.y, selfSteerX, selfSteerY,
          BASE_SPEED * world.globalSpeedMult * agent.speedMult);
        agent.vx = lerp(delayedEntry.vx, selfSV.vx, 1 - INTERN_COPY_WEIGHT);
        agent.vy = lerp(delayedEntry.vy, selfSV.vy, 1 - INTERN_COPY_WEIGHT);
      } else {
        const sv = steerToward(agent.x, agent.y, target.x, target.y,
          BASE_SPEED * 0.6 * world.globalSpeedMult);
        agent.vx = sv.vx; agent.vy = sv.vy;
      }
      // Copy tint
      agent.tint = lerpColor(agent.tint, target.tint, 0.05 * dt);
      break;
    }
  }
}

function getDelayedBufferEntry(agent: Agent, targetTime: number): CopyBufferEntry | null {
  // Search backwards through buffer
  let best: CopyBufferEntry | null = null;
  let bestDiff = Infinity;
  for (let i = 0; i < COPY_BUFFER_SIZE; i++) {
    const entry = agent.copyBuffer[i];
    if (entry.timestamp === 0) continue;
    const diff = Math.abs(entry.timestamp - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  return bestDiff < 1.0 ? best : null;
}

function findNearestAgent(agent: Agent, agents: Agent[], radius: number): Agent | null {
  let best: Agent | null = null;
  let bestDist = radius;
  for (const other of agents) {
    if (other.id === agent.id || other.type === AgentType.OBSERVER) continue;
    const d = dist(agent.x, agent.y, other.x, other.y);
    if (d < bestDist) {
      bestDist = d;
      best = other;
    }
  }
  return best;
}

// ============================================================
// CHAOS AGENT BEHAVIOR
// ============================================================
function updateChaosAgent(agent: Agent, dt: number, world: WorldContext): void {
  // Switch mode on timer
  agent.stateTimer -= dt;
  if (agent.stateTimer <= 0) {
    const prevMode = agent.chaosMode;
    agent.chaosMode = randomChaosMode(prevMode);
    agent.state = chaosModeToState(agent.chaosMode);
    agent.stateTimer = randRange(CHAOS_SWITCH_MIN, CHAOS_SWITCH_MAX);
    agent.flashTimer = 0.3;
    world.spawnParticle(agent.x, agent.y, COLORS.CHAOS_AGENT, 6);
    world.notifyChaosSwitch();
  }

  // Check if near breakable objects
  if (Math.random() < CHAOS_BREAK_CHANCE * dt) {
    for (const desk of world.desks) {
      if (!desk.broken && dist(agent.x, agent.y, desk.x + desk.width / 2, desk.y + desk.height / 2) < CHAOS_BREAK_RADIUS) {
        desk.broken = true;
        // Evict grinder at this desk
        const grinder = world.agents.find(a => a.targetDeskId === desk.id || (a.state === AgentState.SEATED && a.type === AgentType.GRINDER && dist(a.x, a.y, desk.x + desk.width / 2, desk.y + desk.height / 2) < 20));
        if (grinder) {
          grinder.state = AgentState.DISTURBED;
          grinder.stateTimer = 4;
          grinder.targetDeskId = null;
          world.releaseDesk(grinder.id);
        }
        world.spawnParticle(desk.x + desk.width / 2, desk.y + desk.height / 2, COLORS.PARTICLE_FIRE, 10);
        world.addLogEvent(`💥 Chaos Agent broke a desk!`, 'chaos' as import('./types.js').EventType);
        break;
      }
    }
  }

  // Execute current mode
  const speed = BASE_SPEED * world.globalSpeedMult * agent.speedMult;
  switch (agent.state) {
    case AgentState.CHAOS_WANDER:
      doWander(agent, dt, BASE_SPEED * 0.8 * world.globalSpeedMult);
      break;
    case AgentState.CHAOS_GRIND: {
      if (!agent.chaosGrindDeskId) {
        const desk = world.findNearestFreeDesk(agent.x, agent.y, -1);
        if (desk) agent.chaosGrindDeskId = desk.id;
      }
      if (agent.chaosGrindDeskId) {
        const desk = world.getDeskById(agent.chaosGrindDeskId);
        if (desk && !desk.broken) {
          const sv = steerToward(agent.x, agent.y, desk.x + desk.width / 2, desk.y + desk.height / 2, speed);
          agent.vx = sv.vx; agent.vy = sv.vy;
        } else {
          agent.chaosGrindDeskId = null;
          doWander(agent, dt, speed);
        }
      } else {
        doWander(agent, dt, speed);
      }
      break;
    }
    case AgentState.CHAOS_GOSSIP: {
      const clusters = world.findClusters(GOSSIP_SEEK_RADIUS, 2);
      if (clusters.length > 0) {
        const c = clusters[0];
        const cx = c.reduce((s, p) => s + p.x, 0) / c.length;
        const cy = c.reduce((s, p) => s + p.y, 0) / c.length;
        const sv = steerToward(agent.x, agent.y, cx, cy, speed);
        agent.vx = sv.vx; agent.vy = sv.vy;
      } else {
        doWander(agent, dt, speed);
      }
      break;
    }
    case AgentState.CHAOS_SPRINT: {
      agent.vx = Math.cos(agent.heading) * BASE_SPEED * 2.5 * world.globalSpeedMult;
      agent.vy = Math.sin(agent.heading) * BASE_SPEED * 2.5 * world.globalSpeedMult;
      break;
    }
    case AgentState.CHAOS_FREEZE: {
      agent.vx = 0; agent.vy = 0;
      break;
    }
  }
}

// ============================================================
// OBSERVER BEHAVIOR
// ============================================================
function updateObserver(agent: Agent, dt: number, _world: WorldContext): void {
  // Fade in
  if (agent.alpha < 0.9) {
    agent.alpha = Math.min(0.9, agent.alpha + dt * 0.5);
  }

  // Patrol perimeter
  agent.perimeterT += dt * (BASE_SPEED * 0.3) / (2 * ((WORLD_WIDTH - 120) + (WORLD_HEIGHT - 120)));
  agent.perimeterT %= 1;

  const { x, y } = getPerimeterPos(agent.perimeterT);
  const sv = steerToward(agent.x, agent.y, x, y, BASE_SPEED * 0.35);
  agent.vx = sv.vx; agent.vy = sv.vy;

  // Jot notes animation
  agent.noteTimer -= dt;
  if (agent.noteTimer <= 0) {
    agent.noteAlpha = 1;
    agent.noteTimer = randRange(OBSERVER_NOTE_INTERVAL_MIN, OBSERVER_NOTE_INTERVAL_MAX);
  }
}

function getPerimeterPos(t: number): { x: number; y: number } {
  const margin = 60;
  const W = WORLD_WIDTH - margin * 2;
  const H = WORLD_HEIGHT - margin * 2;
  const perimeter = 2 * (W + H);
  const d = t * perimeter;
  if (d < W) return { x: margin + d, y: margin };
  if (d < W + H) return { x: WORLD_WIDTH - margin, y: margin + (d - W) };
  if (d < 2 * W + H) return { x: WORLD_WIDTH - margin - (d - W - H), y: WORLD_HEIGHT - margin };
  return { x: margin, y: WORLD_HEIGHT - margin - (d - 2 * W - H) };
}

// ============================================================
// PANIC BEHAVIOR (fire alarm)
// ============================================================
function updatePanicking(agent: Agent, dt: number, world: WorldContext): void {
  const speed = BASE_SPEED * ALARM_SPEED_MULT * world.globalSpeedMult;

  // Boids toward exit
  const sv = steerToward(agent.x, agent.y, agent.panicTargetX, agent.panicTargetY, speed);
  // Weak cohesion with nearby panickers
  const nearby = world.quadtreeQuery(agent.x, agent.y, 60);
  let cohX = 0, cohY = 0, count = 0;
  for (const n of nearby) {
    if (n.id === agent.id) continue;
    cohX += n.x; cohY += n.y; count++;
  }
  if (count > 0) {
    cohX /= count; cohY /= count;
    const cohSV = steerToward(agent.x, agent.y, cohX, cohY, speed * 0.4);
    agent.vx = sv.vx * 0.8 + cohSV.vx * 0.2;
    agent.vy = sv.vy * 0.8 + cohSV.vy * 0.2;
  } else {
    agent.vx = sv.vx; agent.vy = sv.vy;
  }

  if (dist(agent.x, agent.y, agent.panicTargetX, agent.panicTargetY) < EXIT_REACH_RADIUS) {
    agent.state = AgentState.ESCAPED;
    agent.alpha = 0;
  }
}

// ============================================================
// SHARED HELPERS
// ============================================================
function doWander(agent: Agent, dt: number, speed: number): void {
  if (Math.random() < 0.03 * dt) {
    agent.heading += randRange(-WANDER_ANGLE_JITTER, WANDER_ANGLE_JITTER) * (Math.PI / 180);
  }
  agent.vx = Math.cos(agent.heading) * speed;
  agent.vy = Math.sin(agent.heading) * speed;
}

function applyCatResponse(agent: Agent, dt: number, world: WorldContext): void {
  if (!world.cat || agent.catResponse === 'NONE') return;
  const cat = world.cat;
  const d = dist(agent.x, agent.y, cat.x, cat.y);
  if (agent.catResponse === 'ATTRACTED') {
    if (d > CAT_ATTRACT_RADIUS) {
      // Gentle pull
      const sv = steerToward(agent.x, agent.y, cat.x, cat.y, BASE_SPEED * 0.4 * world.globalSpeedMult);
      agent.vx = lerp(agent.vx, sv.vx, 0.3 * dt);
      agent.vy = lerp(agent.vy, sv.vy, 0.3 * dt);
    } else {
      agent.vx = 0; agent.vy = 0;
    }
  } else if (agent.catResponse === 'AVOIDANT') {
    if (d < CAT_AVOID_RADIUS) {
      const sv = steerAway(agent.x, agent.y, cat.x, cat.y, BASE_SPEED * 1.2 * world.globalSpeedMult);
      agent.vx += sv.vx * 0.5;
      agent.vy += sv.vy * 0.5;
    }
  }
  void dt; // used via global speed mult
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
  const br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
  const rr = Math.round(lerp(ar, br, t));
  const rg = Math.round(lerp(ag, bg, t));
  const rb = Math.round(lerp(ab, bb, t));
  return (rr << 16) | (rg << 8) | rb;
}

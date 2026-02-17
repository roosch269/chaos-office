# Chaos Office — Technical Architecture

**Version:** 1.0.0  
**Status:** DRAFT  
**Authored by:** Architect Agent  
**Date:** 2026-02-17  

---

## Table of Contents

1. [Directory Structure](#1-directory-structure)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [ECS Design](#3-ecs-design)
4. [Systems](#4-systems)
5. [Render Pipeline](#5-render-pipeline)
6. [State Management](#6-state-management)
7. [Spatial Partitioning](#7-spatial-partitioning)
8. [Pathfinding](#8-pathfinding)
9. [Disturbance & Event Bus](#9-disturbance--event-bus)
10. [Easter Egg Engine](#10-easter-egg-engine)
11. [Build & Deploy Configuration](#11-build--deploy-configuration)
12. [Module Interface Reference](#12-module-interface-reference)

---

## 1. Directory Structure

```
chaos-office/
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   └── assets/
│       └── sprites/
│           ├── atlas.png          # single sprite atlas (all sprites)
│           └── atlas.json         # PixiJS texture atlas descriptor
├── src/
│   ├── main.ts                    # entry point; sha256 breadcrumb comment here
│   ├── app.ts                     # App class: init, game loop, resize handler
│   ├── constants.ts               # all simulation constants (single source of truth)
│   ├── types.ts                   # shared TypeScript interfaces/enums
│   │
│   ├── ecs/
│   │   ├── World.ts               # World class: entity registry, system orchestrator
│   │   ├── Entity.ts              # Entity: numeric ID + component map
│   │   ├── Component.ts           # base Component interface + component type registry
│   │   └── System.ts              # base System interface
│   │
│   ├── components/
│   │   ├── TransformComponent.ts  # pos (Vec2), rotation (radians)
│   │   ├── VelocityComponent.ts   # velocity (Vec2), maxSpeed
│   │   ├── AgentComponent.ts      # agentType, state, stateTimer, personalityFlags
│   │   ├── SpriteComponent.ts     # textureKey, tint, scale, zOrder, animState
│   │   ├── BehaviourComponent.ts  # behaviourTree ref, currentNode, memory {}
│   │   ├── ColliderComponent.ts   # radius, layer (AGENT|FURNITURE|TRIGGER)
│   │   ├── GossipColourComponent.ts # hue, saturation, lightness, decayTimer
│   │   ├── ProductivityAuraComponent.ts # radius, multiplier
│   │   ├── CopyBufferComponent.ts # circular Vec2 buffer, delay, stateHistory
│   │   ├── ChaosComponent.ts      # currentMode, switchTimer, breakChance
│   │   ├── PanicComponent.ts      # panicTarget (Vec2), exitRef
│   │   ├── MigrationComponent.ts  # migrationTarget (Vec2), priority
│   │   └── TagComponent.ts        # Set<string> — lightweight tagging (e.g. "EATING", "ESCAPED")
│   │
│   ├── systems/
│   │   ├── BehaviourSystem.ts     # per-agent state machine ticks
│   │   ├── MovementSystem.ts      # integrate velocity → position; apply friction
│   │   ├── PhysicsSystem.ts       # separation, wall bounds, impulse decay
│   │   ├── RenderSystem.ts        # sync ECS state → PixiJS display objects
│   │   ├── SpeedModifierSystem.ts # apply aura multipliers, global multipliers
│   │   ├── ClusterSystem.ts       # detect clusters; cache results
│   │   ├── GossipSystem.ts        # colour propagation
│   │   ├── ParticleSystem.ts      # manage particle pool; update particles
│   │   ├── PathfindingSystem.ts   # A* path requests; direct steer fallback
│   │   └── EasterEggSystem.ts     # all easter egg checks, on intervals
│   │
│   ├── behaviours/
│   │   ├── GrinderBehaviour.ts
│   │   ├── WandererBehaviour.ts
│   │   ├── GossipBehaviour.ts
│   │   ├── ManagerBehaviour.ts
│   │   ├── InternBehaviour.ts
│   │   ├── ChaosBehaviour.ts
│   │   └── ObserverBehaviour.ts
│   │
│   ├── world/
│   │   ├── OfficeLayout.ts        # desk positions, exits, coffee machine, grid data
│   │   ├── Quadtree.ts            # spatial index implementation
│   │   ├── Pathfinder.ts          # A* on walkability grid
│   │   ├── WalkabilityGrid.ts     # 2D boolean grid; updated on furniture change
│   │   └── EntityFactory.ts       # factory functions: createGrinder(), createWanderer(), …
│   │
│   ├── disturbances/
│   │   ├── DisturbanceManager.ts  # registers, fires, expires disturbances
│   │   ├── PizzaDisturbance.ts
│   │   ├── FireAlarmDisturbance.ts
│   │   ├── CatDisturbance.ts
│   │   ├── MeetingRoomDisturbance.ts
│   │   └── FridayDisturbance.ts
│   │
│   ├── easter-eggs/
│   │   ├── EasterEggRegistry.ts   # registry of all eggs; manages unlock state
│   │   ├── PentagonEgg.ts
│   │   ├── Friday1701Egg.ts
│   │   ├── EmergentOrderEgg.ts
│   │   └── PaletteShift.ts        # palette shift effect (sepia filter)
│   │
│   ├── ui/
│   │   ├── UIManager.ts           # mounts/unmounts HTML UI panels
│   │   ├── ControlPanel.ts        # disturbance buttons, toggles
│   │   ├── AgentInfoPanel.ts      # click-to-inspect agent detail
│   │   ├── HudOverlay.ts          # fps counter, agent count, chaos metric
│   │   ├── ToastManager.ts        # notification toasts for easter eggs
│   │   └── CountdownWidget.ts     # Friday 17:01 countdown
│   │
│   ├── audio/
│   │   └── AudioManager.ts        # optional SFX hooks; no-op if audio policy disabled
│   │
│   ├── utils/
│   │   ├── Vec2.ts                # immutable 2D vector; pool-friendly
│   │   ├── MathUtils.ts           # lerp, clamp, angleDiff, randomRange, etc.
│   │   ├── ObjectPool.ts          # generic typed object pool
│   │   ├── EventBus.ts            # typed publish/subscribe event bus
│   │   ├── ChaosMetric.ts         # rolling chaos metric calculator
│   │   └── PersistenceManager.ts  # localStorage read/write with versioned keys
│   │
│   └── config/
│       ├── SimulationConfig.ts    # default agent counts, layout config
│       └── MobileConfig.ts        # mobile-specific overrides
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── vercel.json
├── .eslintrc.json
├── .prettierrc
├── PRD.md
└── ARCHITECTURE.md
```

---

## 2. Tech Stack & Dependencies

### 2.1 Core

| Package | Version | Purpose |
|---|---|---|
| `pixi.js` | `^8.x` | WebGL renderer, sprite batching, ticker |
| `vite` | `^5.x` | Build tool, HMR, static asset handling |
| `typescript` | `^5.x` | Type safety |

### 2.2 No Runtime Dependencies Beyond PixiJS

Keeping the bundle lean. All utilities (Vec2, ObjectPool, EventBus, Quadtree, A*) are implemented in-repo. No lodash, no state libraries, no UI frameworks.

### 2.3 Dev Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.x",
    "vite": "^5.x",
    "typescript": "^5.x",
    "eslint": "^8.x",
    "@typescript-eslint/parser": "^6.x",
    "@typescript-eslint/eslint-plugin": "^6.x",
    "prettier": "^3.x",
    "vitest": "^1.x"
  }
}
```

### 2.4 Asset Pipeline

- Sprites: 16×16 px pixel art; exported from Aseprite as PNG sprite sheets
- Atlas packing: `vite-plugin-pixi-atlas` (or manual JSON; atlas.json follows PixiJS TexturePacker format)
- Atlas dimensions: 512×512 maximum (fits entirely in a single WebGL texture unit)
- Fonts: zero webfonts — all text rendered with PixiJS BitmapText using a pre-packed bitmap font included in atlas

---

## 3. ECS Design

### 3.1 Architecture Overview

```
World
  ├── EntityRegistry        Map<EntityId, Entity>
  ├── ComponentStore        Map<ComponentType, Map<EntityId, Component>>
  ├── SystemScheduler       ordered list of Systems; batched by update priority
  └── EventBus              typed pub/sub
```

### 3.2 Entity

```typescript
// Entity.ts
type EntityId = number;  // auto-incrementing integer

interface Entity {
  id: EntityId;
  active: boolean;
}
```

Entities are pure IDs. No behaviour on the Entity itself.

### 3.3 Component Store

Components are stored in **columnar arrays** (SoA layout), not per-entity objects. This maximises cache coherence when iterating all agents of the same type.

```typescript
// World.ts (simplified)
class World {
  private nextId = 0;
  private entities: Map<EntityId, Entity> = new Map();

  // SoA-style: one typed array or Map per component type
  private components: Map<symbol, Map<EntityId, Component>> = new Map();

  createEntity(): EntityId { ... }
  addComponent<T extends Component>(id: EntityId, comp: T): void { ... }
  getComponent<T extends Component>(id: EntityId, type: symbol): T | undefined { ... }
  removeComponent(id: EntityId, type: symbol): void { ... }
  destroyEntity(id: EntityId): void { ... }

  // Query: all entities with a given set of component types
  query(...types: symbol[]): EntityId[] { ... }
}
```

### 3.4 Component Definitions

```typescript
// --- TransformComponent ---
interface TransformComponent extends Component {
  pos: Vec2;        // logical units; mutable in-place (pool-friendly)
  rotation: number; // radians
}

// --- VelocityComponent ---
interface VelocityComponent extends Component {
  vel: Vec2;
  maxSpeed: number; // base max speed before multipliers
}

// --- AgentComponent ---
enum AgentType { GRINDER, WANDERER, GOSSIP, MANAGER, INTERN, CHAOS, OBSERVER }
enum AgentState { /* per character — defined in behaviours/ */ }

interface AgentComponent extends Component {
  agentType: AgentType;
  state: AgentState;
  stateTimer: number;       // countdown for timed states
  heading: number;          // radians (used by Wanderer, Chaos in SPRINT)
  targetEntityId?: EntityId; // current target (desk, agent, etc.)
  targetPos?: Vec2;
}

// --- SpriteComponent ---
interface SpriteComponent extends Component {
  textureKey: string;
  animState: string;    // e.g. "work_loop", "coffee_pour"
  tint: number;         // ARGB hex
  scale: number;
  zOrder: number;       // render sort order
  flipX: boolean;       // face direction
}

// --- BehaviourComponent ---
// Thin wrapper; actual logic in behaviours/XxxBehaviour.ts
interface BehaviourComponent extends Component {
  behaviourId: AgentType;
  memory: Record<string, unknown>; // per-agent scratch space; avoid allocation on hot path
}

// --- ColliderComponent ---
enum CollisionLayer { AGENT = 1, FURNITURE = 2, TRIGGER = 4 }

interface ColliderComponent extends Component {
  radius: number;
  layer: CollisionLayer;
  mask: number;  // bitmask of layers this collides with
}

// --- GossipColourComponent ---
interface GossipColourComponent extends Component {
  hue: number;         // 0–360
  saturation: number;  // 0–1
  lightness: number;   // 0–1
  decayTimer: number;  // seconds; -1 = permanent (for actual Gossip agents)
}

// --- ProductivityAuraComponent ---
interface ProductivityAuraComponent extends Component {
  radius: number;
  multiplier: number;
  // Applied by SpeedModifierSystem each tick to qualifying neighbours
}

// --- CopyBufferComponent --- (Intern only)
const COPY_BUFFER_SLOTS = 128; // 2s at 60fps = 120 slots; 128 for headroom
interface CopyBufferComponent extends Component {
  velocities: Float32Array; // length = COPY_BUFFER_SLOTS * 2 (x,y interleaved)
  states: Uint8Array;       // length = COPY_BUFFER_SLOTS (AgentState enum values)
  head: number;             // write pointer
  delayFrames: number;      // = INTERN_COPY_DELAY * 60
}

// --- ChaosComponent ---
enum ChaosMode { WANDER, GRIND, GOSSIP, SPRINT, FREEZE }
interface ChaosComponent extends Component {
  currentMode: ChaosMode;
  switchTimer: number;
}

// --- PanicComponent ---
interface PanicComponent extends Component {
  panicTargetPos: Vec2;
  exitEntityId: EntityId;
}

// --- MigrationComponent ---
interface MigrationComponent extends Component {
  targetPos: Vec2;
  priority: number; // higher = overrides lower-priority behaviours
  expiresAt: number; // timestamp (ms)
}

// --- TagComponent ---
interface TagComponent extends Component {
  tags: Set<string>; // e.g. "EATING", "ESCAPED", "IN_MEETING", "DISTURBED"
}
```

### 3.5 Component Type Keys

Each component type is identified by a unique `Symbol` registered at module load:

```typescript
// Component.ts
export const TRANSFORM    = Symbol('Transform');
export const VELOCITY     = Symbol('Velocity');
export const AGENT        = Symbol('Agent');
export const SPRITE       = Symbol('Sprite');
export const BEHAVIOUR    = Symbol('Behaviour');
export const COLLIDER     = Symbol('Collider');
export const GOSSIP_COLOR = Symbol('GossipColor');
export const PRODUCTIVITY = Symbol('ProductivityAura');
export const COPY_BUFFER  = Symbol('CopyBuffer');
export const CHAOS        = Symbol('Chaos');
export const PANIC        = Symbol('Panic');
export const MIGRATION    = Symbol('Migration');
export const TAG          = Symbol('Tag');
```

---

## 4. Systems

Systems run in a fixed order each frame. All systems implement:

```typescript
interface System {
  readonly priority: number;  // lower = runs first
  update(world: World, dt: number): void;
}
```

### 4.1 System Execution Order

```
Priority  System                  Update freq   Notes
────────  ──────────────────────  ────────────  ──────────────────────────────
 10       SpeedModifierSystem     every frame   Apply auras + global mults first
 20       BehaviourSystem         every frame   State machine decisions
 30       PathfindingSystem       every frame   Resolve path requests (throttled)
 40       MovementSystem          every frame   Integrate vel → pos
 50       PhysicsSystem           every frame   Separation + wall bounce
 60       ClusterSystem           every 2 frames Cache cluster data
 70       GossipSystem            every 3 frames Colour propagation
 80       ParticleSystem          every frame   Particle update + expire
 90       RenderSystem            every frame   Sync to PixiJS (LAST before draw)
100       EasterEggSystem         variable      Intervals per egg
```

### 4.2 BehaviourSystem

```typescript
// BehaviourSystem.ts
class BehaviourSystem implements System {
  readonly priority = 20;
  private behaviours: Map<AgentType, AgentBehaviour>;

  constructor() {
    this.behaviours = new Map([
      [AgentType.GRINDER,  new GrinderBehaviour()],
      [AgentType.WANDERER, new WandererBehaviour()],
      // ... etc
    ]);
  }

  update(world: World, dt: number): void {
    const agents = world.query(AGENT, TRANSFORM, VELOCITY, BEHAVIOUR);
    for (const id of agents) {
      const agent   = world.getComponent<AgentComponent>(id, AGENT)!;
      const beh     = this.behaviours.get(agent.agentType)!;
      beh.tick(id, world, dt);
    }
  }
}
```

Each `AgentBehaviour` class has a single `tick(entityId, world, dt)` method. It reads and mutates components directly via `world.getComponent()`. No inter-system calls during tick.

### 4.3 PhysicsSystem

Handles:
1. **Separation:** For each agent, query quadtree for neighbours within `PERSONAL_RADIUS`. Apply a proportional repulsion force.
2. **Wall bounds:** Clamp position to `[0, CANVAS_W] × [0, CANVAS_H]`; reflect velocity component.
3. **Impulse decay:** Each impulse stored in `VelocityComponent.impulses[]` (max 4 concurrent); decay by friction multiplier `0.3^dt`.

```typescript
// Separation (hot path — no allocations)
for (const id of agents) {
  const tf = getTransform(id);
  const neighbours = quadtree.query(tf.pos, PERSONAL_RADIUS);
  let fx = 0, fy = 0;
  for (const nId of neighbours) {
    if (nId === id) continue;
    const ntf = getTransform(nId);
    const dx = tf.pos.x - ntf.pos.x;
    const dy = tf.pos.y - ntf.pos.y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < PERSONAL_RADIUS * PERSONAL_RADIUS && dist2 > 0) {
      const inv = 1 / Math.sqrt(dist2);
      fx += dx * inv;
      fy += dy * inv;
    }
  }
  // Apply as velocity addition (scaled by dt); no Vec2 allocation
  const vel = getVelocity(id);
  vel.vel.x += fx * SEPARATION_STRENGTH * dt;
  vel.vel.y += fy * SEPARATION_STRENGTH * dt;
}
```

### 4.4 ClusterSystem

Runs every 2 frames. Outputs a `ClusterCache` consumed by behaviours:

```typescript
interface Cluster {
  centroid: Vec2;
  memberIds: EntityId[];
  size: number;
}

// ClusterCache (module-level singleton, updated by ClusterSystem)
interface ClusterCache {
  clusters: Cluster[];         // sorted by size descending
  agentToCluster: Map<EntityId, number>; // index into clusters[]
  lastUpdated: number;         // frame number
}
```

**Algorithm:**
1. Query all agent positions from quadtree
2. DBSCAN with ε = `NEIGHBOUR_RADIUS`, minPts = `CLUSTER_MIN`
3. Single-pass using the quadtree (ε query per agent)
4. Output cluster list

DBSCAN chosen over k-means because cluster count is unknown and agents form/dissolve fluidly.

### 4.5 SpeedModifierSystem

Runs before BehaviourSystem. Computes an effective speed multiplier for each agent:

```typescript
// Result stored in AgentComponent.effectiveSpeedMult (float)
// Sources:
//  1. GlobalSpeedMultiplier (from GameState)
//  2. ProductivityAura from nearby Grinders
//  3. FRIDAY_SPEED_MULT if GlobalFlag(FRIDAY_MODE)
//  4. ALARM_SPEED_MULT if has PanicComponent
//
// Multipliers are multiplicative (not additive).
agent.effectiveSpeedMult =
  globalMult *
  aurasMult *       // max of all overlapping auras (not stacked)
  fridayMult *
  panicMult;
```

---

## 5. Render Pipeline

### 5.1 PixiJS Setup

```typescript
// app.ts
const app = new PIXI.Application({
  width: CANVAS_W,
  height: CANVAS_H,
  backgroundColor: 0x1a1a2e,
  resolution: Math.min(window.devicePixelRatio, 2),
  antialias: false,        // pixel art; no antialiasing
  autoDensity: true,
  powerPreference: 'high-performance',
});

// Canvas scales via CSS to fill viewport
// PixiJS internally renders at logical resolution; CSS scales up/down
app.renderer.resize(CANVAS_W, CANVAS_H);
```

### 5.2 Display Hierarchy

```
app.stage (PIXI.Container)
  ├── officeLayer      (PIXI.Container, cacheAsBitmap=true)
  │     furniture sprites (desks, coffee machine, exits, walls)
  │     Updated only when office layout changes
  │
  ├── agentLayer       (PIXI.ParticleContainer, max=300)
  │     one Sprite per agent
  │     GPU-batched via ParticleContainer
  │
  ├── overlayLayer     (PIXI.Container)
  │     meeting room rectangle (Graphics)
  │     pizza/cat sprites
  │     name labels (BitmapText)
  │
  ├── particleLayer    (PIXI.ParticleContainer, max=500)
  │     gossip colour particles
  │     heart particles (cat attraction)
  │     break particles (Chaos Agent)
  │     dust clouds (Manager disperse)
  │
  └── effectLayer      (PIXI.Container)
        ProductivityAura glow rings (Graphics, alpha-animated)
        Pentagon glow (Graphics)
        Golden radiance (Graphics, Emergent Order)
```

### 5.3 RenderSystem

```typescript
class RenderSystem implements System {
  readonly priority = 90;
  // sprite pool: pre-allocated PIXI.Sprite array (300 entries)
  private sprites: Map<EntityId, PIXI.Sprite> = new Map();

  update(world: World, dt: number): void {
    const renderables = world.query(TRANSFORM, SPRITE);
    for (const id of renderables) {
      const tf = world.getComponent<TransformComponent>(id, TRANSFORM)!;
      const sp = world.getComponent<SpriteComponent>(id, SPRITE)!;
      let sprite = this.sprites.get(id);
      if (!sprite) {
        sprite = spritePool.acquire();
        agentLayer.addChild(sprite);
        this.sprites.set(id, sprite);
      }
      // Write-only to sprite; no reads from display object
      sprite.x = tf.pos.x;
      sprite.y = tf.pos.y;
      sprite.rotation = tf.rotation;
      sprite.tint = sp.tint;
      sprite.scale.x = sp.scale * (sp.flipX ? -1 : 1);
      sprite.scale.y = sp.scale;
      sprite.texture = textureCache.get(sp.textureKey + '_' + sp.animState);
      sprite.zIndex = sp.zOrder;
    }
  }
}
```

### 5.4 Animation System (within Sprite)

Animations are frame sequences defined in `atlas.json`. `SpriteComponent.animState` is a string key. The RenderSystem selects the correct texture atlas frame based on an animation clock:

```typescript
// animation clock stored per-entity in SpriteComponent.animFrame (number)
// Advance animFrame every N ticks (defined per animation in atlas.json metadata)
// textureKey: e.g. "grinder_work_loop_03"
```

No separate AnimationSystem needed — frame advance is O(1) per entity inside RenderSystem.

### 5.5 GossipColour Rendering

When an agent has a `GossipColourComponent`, its sprite tint is computed from the hue/saturation/lightness values via HSL→RGB→ARGB conversion, applied as `sprite.tint`. This overrides the default personality tint. The conversion is done once per changed component, cached until component values change.

---

## 6. State Management

### 6.1 Design Philosophy

No state library. Global simulation state is a single plain object (`GameState`) accessed via module import. No React, no Redux. Simple is fast.

### 6.2 GameState

```typescript
// GameState.ts — singleton, imported by systems that need it
interface GameState {
  // Simulation control
  running: boolean;
  frameNumber: number;
  simulationTime: number;      // seconds since start
  globalSpeedMultiplier: number; // product of all active multipliers

  // Flags
  fridayMode: boolean;
  fireAlarmActive: boolean;
  observerUnlocked: boolean;
  friday1701Active: boolean;
  paletteShifted: boolean;

  // Agent counts (maintained by EntityFactory)
  agentCounts: Record<AgentType, number>;
  totalAgents: number;

  // Layout
  officeLayout: OfficeLayout;
  meetingRoom: MeetingRoomEntity | null;

  // Performance
  fps: number;
  chaosMetric: number;          // rolling value 0..1
  emergentOrderTimer: number;   // seconds chaos has been below threshold
}

export const gameState: GameState = { ...defaults };
```

### 6.3 Disturbance State

Each active disturbance is an object stored in `DisturbanceManager.active: Map<DisturbanceType, Disturbance>`. Disturbances have:

```typescript
interface Disturbance {
  type: DisturbanceType;
  pos?: Vec2;           // placement-based disturbances
  startTime: number;    // simulationTime at activation
  duration: number;     // seconds; Infinity for toggles
  entityId?: EntityId;  // associated entity (pizza, cat)
  onExpire: () => void;
}
```

### 6.4 Persistence (localStorage)

Only easter egg unlock states are persisted:

```typescript
// PersistenceManager.ts
const STORAGE_VERSION = 'v1';
const KEYS = {
  OBSERVER_UNLOCKED: `chaos-office:${STORAGE_VERSION}:observer-unlocked`,
} as const;

function save(key: keyof typeof KEYS, value: boolean): void {
  localStorage.setItem(KEYS[key], JSON.stringify(value));
}
function load(key: keyof typeof KEYS): boolean {
  return JSON.parse(localStorage.getItem(KEYS[key]) ?? 'false');
}
```

No simulation state is persisted. Page reload resets everything.

---

## 7. Spatial Partitioning

### 7.1 Quadtree Implementation

Custom implementation in `Quadtree.ts`. No third-party library (bundle size constraint).

```typescript
interface QuadtreeNode {
  bounds: AABB;          // { x, y, w, h }
  entries: EntityEntry[]; // { id, x, y }
  children: QuadtreeNode[] | null; // null = leaf
}

interface AABB { x: number; y: number; w: number; h: number; }
interface EntityEntry { id: EntityId; x: number; y: number; }

class Quadtree {
  private root: QuadtreeNode;
  private readonly MAX_ENTRIES = 8;  // split threshold
  private readonly MAX_DEPTH   = 6;

  // Pre-allocated result array (no new Array each query)
  private queryResult: EntityId[] = new Array(64);

  insert(id: EntityId, x: number, y: number): void { ... }
  remove(id: EntityId): void { ... }
  update(id: EntityId, x: number, y: number): void { /* remove + insert */ }

  // Returns result array (reused! caller must consume before next query)
  queryRadius(cx: number, cy: number, r: number): EntityId[] { ... }

  clear(): void { /* reset root, preserve allocated nodes in pool */ }
}
```

### 7.2 Update Strategy

Full rebuild every 5 frames. Incremental update on frames 1–4 (only re-insert agents that moved > 4 units).

```typescript
// In MovementSystem, after position update:
if (moved > 4 || frameNumber % 5 === 0) {
  quadtree.update(id, tf.pos.x, tf.pos.y);
}
```

### 7.3 Furniture Entities in Quadtree

Desks, coffee machine, exits, and meeting room are inserted into a separate `furnitureQuadtree` (static; only rebuilt on layout change). Behaviours query both trees as needed.

---

## 8. Pathfinding

### 8.1 Walkability Grid

```typescript
// WalkabilityGrid.ts
// Resolution: 1 cell = 8 logical units
// Canvas 1600×900 → 200×112 cells = 22,400 cells (Uint8Array, 22 KB)

class WalkabilityGrid {
  readonly cellSize = 8;
  readonly cols: number;  // = CANVAS_W / cellSize
  readonly rows: number;  // = CANVAS_H / cellSize
  private grid: Uint8Array; // 0 = walkable, 1 = blocked

  markBlocked(rect: AABB): void { ... }  // furniture placement
  markWalkable(rect: AABB): void { ... } // furniture removal
  isWalkable(x: number, y: number): boolean { ... }
  worldToCell(x: number, y: number): [number, number] { ... }
  cellToWorld(col: number, row: number): [number, number] { ... }
}
```

### 8.2 A* Implementation

Used only for Grinder (desk-seeking), Manager (cluster approach). Not used for Wanderer (pure steering) or panic states (direct target).

```typescript
// Pathfinder.ts
class Pathfinder {
  // Re-uses pre-allocated priority queue and visited set
  private openSet: MinHeap<AStarNode>;
  private closedSet: Uint8Array;  // same size as walkability grid
  private nodePool: ObjectPool<AStarNode>;

  findPath(
    grid: WalkabilityGrid,
    startX: number, startY: number,
    goalX: number, goalY: number
  ): Vec2[] | null { ... }  // returns world-space waypoints; null if no path
}
```

**Heuristic:** Octile distance (allows diagonal movement).

**Request throttling:** At most 4 path requests processed per frame. Remaining requests queued; agents use direct steering while waiting.

```typescript
// PathfindingSystem
class PathfindingSystem implements System {
  readonly priority = 30;
  private queue: PathRequest[] = [];
  private readonly MAX_PER_FRAME = 4;

  requestPath(entityId: EntityId, goal: Vec2, callback: (path: Vec2[]) => void): void {
    this.queue.push({ entityId, goal, callback });
  }

  update(world: World, dt: number): void {
    const toProcess = this.queue.splice(0, this.MAX_PER_FRAME);
    for (const req of toProcess) {
      const tf = world.getComponent<TransformComponent>(req.entityId, TRANSFORM);
      if (!tf) continue;
      const path = pathfinder.findPath(walkabilityGrid, tf.pos.x, tf.pos.y, req.goal.x, req.goal.y);
      req.callback(path ?? []);
    }
  }
}
```

---

## 9. Disturbance & Event Bus

### 9.1 EventBus

Typed publish-subscribe. No dynamic string events.

```typescript
// EventBus.ts
type EventMap = {
  DISTURBANCE_START: { type: DisturbanceType; pos?: Vec2 };
  DISTURBANCE_END:   { type: DisturbanceType };
  AGENT_SPAWNED:     { id: EntityId; agentType: AgentType };
  AGENT_DESPAWNED:   { id: EntityId };
  CLUSTER_UPDATED:   { cache: ClusterCache };
  EASTER_EGG:        { eggId: string };
  LAYOUT_CHANGED:    { layout: OfficeLayout };
};

class EventBus {
  subscribe<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void;
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
}
```

Systems subscribe in their constructors. Returns an unsubscribe function (called on system teardown).

### 9.2 DisturbanceManager

```typescript
class DisturbanceManager {
  private active: Map<DisturbanceType, Disturbance> = new Map();

  activate(disturbance: Disturbance): void {
    // Cancel conflicting disturbances (e.g. can't have 2 pizzas)
    if (this.active.has(disturbance.type)) this.deactivate(disturbance.type);
    this.active.set(disturbance.type, disturbance);
    eventBus.emit('DISTURBANCE_START', { type: disturbance.type, pos: disturbance.pos });
  }

  deactivate(type: DisturbanceType): void {
    const d = this.active.get(type);
    if (d) { d.onExpire(); this.active.delete(type); }
    eventBus.emit('DISTURBANCE_END', { type });
  }

  update(dt: number): void {
    const now = gameState.simulationTime;
    for (const [type, d] of this.active) {
      if (d.duration !== Infinity && now - d.startTime >= d.duration) {
        this.deactivate(type);
      }
    }
  }
}
```

---

## 10. Easter Egg Engine

### 10.1 EasterEggRegistry

```typescript
interface EasterEgg {
  id: string;
  checkInterval: number;   // seconds between checks (0 = every frame)
  check(world: World, gameState: GameState): boolean;
  trigger(world: World, gameState: GameState): void;
  isUnlocked(): boolean;
}

class EasterEggRegistry {
  private eggs: EasterEgg[] = [];
  private timers: Map<string, number> = new Map();

  register(egg: EasterEgg): void { ... }

  // Called by EasterEggSystem each frame
  update(world: World, gameState: GameState, dt: number): void {
    for (const egg of this.eggs) {
      if (egg.isUnlocked() && egg.id !== 'emergent-order') continue; // skip if done
      const timer = (this.timers.get(egg.id) ?? 0) + dt;
      if (timer >= egg.checkInterval) {
        this.timers.set(egg.id, 0);
        if (egg.check(world, gameState)) {
          egg.trigger(world, gameState);
        }
      } else {
        this.timers.set(egg.id, timer);
      }
    }
  }
}
```

### 10.2 Pentagon Check Implementation Detail

```typescript
// PentagonEgg.ts
class PentagonEgg implements EasterEgg {
  readonly id = 'codex-pentagon';
  readonly checkInterval = 0.5;

  check(world: World): boolean {
    if (gameState.observerUnlocked) return false;
    const ids = world.query(TRANSFORM, AGENT);
    if (ids.length < 5) return false;

    // O(n^5) is infeasible for 200 agents.
    // Optimisation: only check agents that are STATIONARY (velocity < 2 units/s)
    // Pentagon requires deliberate placement → agents won't form it accidentally while moving fast
    const stationary = ids.filter(id => {
      const vel = world.getComponent<VelocityComponent>(id, VELOCITY)!;
      return (vel.vel.x * vel.vel.x + vel.vel.y * vel.vel.y) < 4;
    });
    if (stationary.length < 5) return false;

    // Check all C(n,5) combos of stationary agents (n typically small)
    return this.checkCombinations(stationary, world);
  }

  private checkCombinations(ids: EntityId[], world: World): boolean {
    const n = ids.length;
    if (n > 20) return false; // safety cap: C(20,5) = 15504, acceptable
    for (let a=0; a<n; a++)
    for (let b=a+1; b<n; b++)
    for (let c=b+1; c<n; c++)
    for (let d=c+1; d<n; d++)
    for (let e=d+1; e<n; e++) {
      if (this.isPentagon([ids[a],ids[b],ids[c],ids[d],ids[e]], world)) return true;
    }
    return false;
  }

  private isPentagon(group: EntityId[], world: World): boolean {
    const positions = group.map(id => world.getComponent<TransformComponent>(id, TRANSFORM)!.pos);
    const cx = positions.reduce((s,p) => s+p.x, 0) / 5;
    const cy = positions.reduce((s,p) => s+p.y, 0) / 5;
    const radii = positions.map(p => Math.hypot(p.x-cx, p.y-cy));
    const meanR = radii.reduce((s,r)=>s+r,0)/5;
    if (meanR < 60 || meanR > 200) return false;
    if (Math.max(...radii) - Math.min(...radii) > 20) return false;
    const angles = positions
      .map(p => Math.atan2(p.y-cy, p.x-cx) * 180/Math.PI)
      .sort((a,b)=>a-b);
    const gaps = [...angles.map((a,i) => (angles[(i+1)%5]??angles[0]+360)-a)];
    gaps[4] = 360 + angles[0] - angles[4];
    return gaps.every(g => g >= 57 && g <= 87); // 72° ± 15°
  }
}
```

### 10.3 Palette Shift Implementation

```typescript
// PaletteShift.ts
class PaletteShift {
  private filter: PIXI.ColorMatrixFilter;

  apply(): void {
    // Sepia matrix for PixiJS ColorMatrixFilter
    this.filter = new PIXI.ColorMatrixFilter();
    this.filter.sepia(true); // built-in PixiJS sepia
    app.stage.filters = [this.filter];
    // Animate alpha 0→1 over 1.5 seconds
    animateFilterAlpha(this.filter, 0, 1, 1500);
  }

  revert(): void {
    animateFilterAlpha(this.filter, 1, 0, 800, () => {
      app.stage.filters = [];
    });
  }
}
```

---

## 11. Build & Deploy Configuration

### 11.1 `vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Single chunk: avoids waterfall requests; total is <400KB anyway
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 8192,   // inline sprites <8KB (avoids extra requests)
    minify: 'esbuild',
    sourcemap: false,           // prod: no sourcemaps (reduce payload)
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ['pixi.js'],
  },
});
```

### 11.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### 11.3 `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "routes": [
    { "src": "/assets/(.*)", "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### 11.4 `package.json` (key scripts)

```json
{
  "name": "chaos-office",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":     "vite",
    "build":   "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test":    "vitest run",
    "lint":    "eslint src --ext .ts",
    "fmt":     "prettier --write src"
  },
  "dependencies": {
    "pixi.js": "^8.0.0"
  }
}
```

### 11.5 `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#1a1a2e" />
  <title>Chaos Office</title>
  <link rel="icon" href="/favicon.ico" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
    #app { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    canvas { display: block; image-rendering: pixelated; }
    /* UI overlay: HTML positioned over canvas */
    #ui { position: fixed; inset: 0; pointer-events: none; }
    #ui > * { pointer-events: auto; }
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="ui"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 11.6 CI (GitHub Actions, optional)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: du -sh dist/assets/*.js  # fail if bundle unexpectedly large
```

---

## 12. Module Interface Reference

### 12.1 EntityFactory

```typescript
// EntityFactory.ts — all agent/object creation goes through here
function createGrinder(world: World, pos: Vec2): EntityId
function createWanderer(world: World, pos: Vec2): EntityId
function createGossip(world: World, pos: Vec2): EntityId
function createManager(world: World, pos: Vec2): EntityId
function createIntern(world: World, pos: Vec2): EntityId
function createChaosAgent(world: World, pos: Vec2): EntityId
function createObserver(world: World, pos: Vec2): EntityId

function createDesk(world: World, pos: Vec2): EntityId
function createCoffeeMachine(world: World, pos: Vec2): EntityId
function createExit(world: World, pos: Vec2, side: 'left' | 'right'): EntityId
function createPizza(world: World, pos: Vec2): EntityId
function createCat(world: World, pos: Vec2): EntityId
function createMeetingRoom(world: World, rect: AABB): EntityId

function despawnAgent(world: World, id: EntityId): void  // returns to pool
```

### 12.2 App Bootstrap Sequence

```typescript
// main.ts
// CHAOS OFFICE — Source breadcrumb
// sha256 of SOUL.md first content line:
// 5b2fb417813b37dc8e36fc635a6dd12978770f4568cb25f95a3d3b3602d917e6

import { App } from './app';
const app = new App();
app.init().then(() => app.start());

// app.ts — init() sequence:
async init(): Promise<void> {
  // 1. Create PIXI Application, append canvas to #app
  // 2. Load texture atlas (single fetch)
  // 3. Create World, register all component types
  // 4. Instantiate and register all Systems (in priority order)
  // 5. Create OfficeLayout (desks, coffee machine, exits)
  // 6. Populate WalkabilityGrid from layout
  // 7. Build initial Quadtree
  // 8. Spawn initial agents via EntityFactory
  // 9. Mount UIManager (HTML controls overlay)
  // 10. Register easter eggs in EasterEggRegistry
  // 11. Load persisted unlock states (PersistenceManager)
  // 12. If observerUnlocked: spawn Observer, apply palette
  // 13. Wire UIManager events → DisturbanceManager
  // 14. Start PIXI ticker → game loop
}

// Game loop (PIXI ticker):
gameLoop(ticker: PIXI.Ticker): void {
  const dt = Math.min(ticker.deltaMS / 1000, TICK_DT_CAP);
  gameState.frameNumber++;
  gameState.simulationTime += dt;
  disturbanceManager.update(dt);
  world.update(dt);   // runs all systems in priority order
  uiManager.update(dt);  // fps, chaos metric HUD
}
```

### 12.3 UIManager → DisturbanceManager Bridge

```typescript
// UIManager.ts listens for DOM events; calls DisturbanceManager
controlPanel.onPizza((pos: Vec2) => disturbanceManager.activate(new PizzaDisturbance(pos)));
controlPanel.onFireAlarm(() => disturbanceManager.activate(new FireAlarmDisturbance()));
controlPanel.onCat((pos: Vec2) => disturbanceManager.activate(new CatDisturbance(pos)));
controlPanel.onMeetingRoom((rect: AABB) => disturbanceManager.activate(new MeetingRoomDisturbance(rect)));
controlPanel.onFridayToggle((on: boolean) => {
  if (on) disturbanceManager.activate(new FridayDisturbance());
  else    disturbanceManager.deactivate(DisturbanceType.FRIDAY);
});
```

### 12.4 Behaviour Base Class

```typescript
// behaviours/ — each file exports one class extending AgentBehaviour
abstract class AgentBehaviour {
  abstract tick(entityId: EntityId, world: World, dt: number): void;

  // Shared helpers (available to all behaviours):
  protected getNeighbours(entityId: EntityId, world: World, radius: number): EntityId[] {
    const tf = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;
    return quadtree.queryRadius(tf.pos.x, tf.pos.y, radius);
  }
  protected steerToward(vel: VelocityComponent, target: Vec2, tf: TransformComponent, speed: number): void { ... }
  protected steerAway(vel: VelocityComponent, from: Vec2, tf: TransformComponent, weight: number): void { ... }
  protected wander(vel: VelocityComponent, agent: AgentComponent, dt: number, speed: number): void { ... }
  protected applyBoids(entityId: EntityId, world: World, dt: number, weights: BoidsWeights): void { ... }
}
```

---

## Appendix A: Sprite Atlas Specification

```
atlas.png: 512×512 px, RGBA, PNG
Sprites are 16×16 px (each agent frame)
Grid layout (each row = one character, 8 frames per animation strip):

Row  0: grinder_work_loop         (8 frames)
Row  1: grinder_clock_watching    (8 frames)
Row  2: grinder_seek              (4 frames)
Row  3: wanderer_walk             (8 frames)
Row  4: wanderer_bump             (4 frames)
Row  5: wanderer_coffee_pour      (6 frames)
Row  6: gossip_walk               (8 frames)
Row  7: gossip_huddle_talk        (8 frames)
Row  8: gossip_scatter            (4 frames)
Row  9: manager_walk              (8 frames)
Row 10: manager_clap_hands        (6 frames)
Row 11: manager_head_scratch      (8 frames)
Row 12: manager_point_whiteboard  (6 frames)
Row 13: intern_walk               (8 frames)
Row 14: chaos_walk                (8 frames)
Row 15: chaos_mode_switch_flash   (4 frames)
Row 16: chaos_evil_laugh          (6 frames)
Row 17: observer_walk             (8 frames)
Row 18: observer_jot_note         (6 frames)
Row 19: observer_appear_shadow    (8 frames)
Row 20: shared_eating             (6 frames)
Row 21: shared_celebrate          (6 frames)
Row 22: shared_relief             (4 frames)
Row 23: shared_devastated         (6 frames)
Row 24: shared_sneeze             (4 frames)
Row 25: shared_heart_particle     (4 frames, 8×8 px)
Row 26: shared_break_particle     (4 frames, 8×8 px)
Row 27: furniture_desk            (1 frame, 16×16)
Row 28: furniture_desk_broken     (1 frame, 16×16)
Row 29: furniture_coffee_machine  (2 frames, 16×24)
Row 30: furniture_exit            (1 frame, 8×16)
Row 31: item_pizza                (1 frame, 16×16)
Row 32: item_cat                  (4 frames, 16×16)
Row 33: ui_bitmap_font            (ASCII 32–126, 6×8 px glyphs)
```

All tinting applied at runtime via `sprite.tint`; base sprites are white/grayscale.

---

## Appendix B: Constants Reference

All constants live in `src/constants.ts`. Implementations must not hardcode any of these values inline:

```typescript
// src/constants.ts
export const CANVAS_W = 1600;
export const CANVAS_H = 900;

export const BASE_SPEED            = 60;
export const PERSONAL_RADIUS       = 16;
export const NEIGHBOUR_RADIUS      = 80;
export const CLUSTER_MIN           = 3;
export const DESK_CLAIM_RADIUS     = 12;
export const TICK_DT_CAP           = 0.05;
export const SEPARATION_STRENGTH   = 80;

// Grinder
export const GRINDER_AURA_RADIUS   = 120;
export const GRINDER_AURA_BOOST    = 1.3;

// Wanderer
export const WANDER_ANGLE_JITTER   = 45;
export const COFFEE_APPROACH_DIST  = 30;
export const COFFEE_DWELL_MIN      = 3;
export const COFFEE_DWELL_MAX      = 8;
export const BUMP_REBOUND_ANGLE    = 135;

// Gossip
export const GOSSIP_SEEK_RADIUS    = 200;
export const GOSSIP_HUDDLE_RADIUS  = 40;
export const GOSSIP_SPREAD_RATE    = 0.15;
export const GOSSIP_SPREAD_RADIUS  = 60;
export const GOSSIP_MOVE_SPEED_MULT= 1.2;
export const GOSSIP_HUDDLE_MIN     = 8;
export const GOSSIP_HUDDLE_MAX     = 20;

// Manager
export const MANAGER_SCAN_RADIUS   = 300;
export const MANAGER_DISPERSE_RADIUS=60;
export const MANAGER_DISPERSE_FORCE = 150;
export const MANAGER_CONFUSED_MIN  = 5;
export const MANAGER_CONFUSED_MAX  = 12;

// Intern
export const INTERN_COPY_DELAY     = 2.0;
export const INTERN_FOLLOW_RADIUS  = 160;
export const INTERN_COPY_WEIGHT    = 0.7;

// Chaos Agent
export const CHAOS_SWITCH_MIN      = 2;
export const CHAOS_SWITCH_MAX      = 8;
export const CHAOS_BREAK_RADIUS    = 48;
export const CHAOS_BREAK_CHANCE    = 0.003;
export const CHAOS_SPRINT_SPEED_MULT=2.5;

// Observer
export const OBSERVER_NOTE_MIN     = 4;
export const OBSERVER_NOTE_MAX     = 10;
export const OBSERVER_EDGE_MARGIN  = 80;

// Disturbances
export const PIZZA_ATTRACT_RADIUS  = 400;
export const PIZZA_DURATION        = 15;
export const ALARM_DURATION        = 12;
export const ALARM_SPEED_MULT      = 1.8;
export const STAMPEDE_SEPARATION   = 6;
export const CAT_ATTRACT_RADIUS    = 120;
export const CAT_AVOID_RADIUS      = 100;
export const CAT_DURATION          = 20;
export const MEETING_CAPACITY      = 8;
export const FRIDAY_SPEED_MULT     = 0.5;
export const FRIDAY_WANDERER_MULT  = 3;

// Easter eggs
export const PENTAGON_TOLERANCE    = 20;
export const PENTAGON_RADIUS_MIN   = 60;
export const PENTAGON_RADIUS_MAX   = 200;
export const CHAOS_ORDER_THRESHOLD = 0.15;
export const CHAOS_ORDER_HYSTERESIS= 0.05;
export const CHAOS_ORDER_HOLD_TIME = 3.0;

// Performance
export const QUADTREE_CELL_SIZE    = 64;
export const QUADTREE_REBUILD_FRAMES=5;
export const MAX_PATH_REQUESTS_PER_FRAME=4;
export const COPY_BUFFER_SLOTS     = 128;
export const MOBILE_AGENT_CAP      = 80;
export const MOBILE_DPR_CAP        = 2;
export const EMERGENCY_CULL_FPS    = 30;
export const EMERGENCY_CULL_WINDOW = 3;   // seconds
```

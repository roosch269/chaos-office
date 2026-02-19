// ============================================================
// CHAOS OFFICE — World (Simulation Orchestrator)
// ============================================================

import {
  AgentType, AgentState, EventType,
  Desk, CoffeeMachine, Exit, PizzaEntity, CatEntity, MeetingRoom, LogEvent,
  MusicSource, PingPongZone,
} from './types.js';
import {
  WORLD_WIDTH, WORLD_HEIGHT,
  BASE_SPEED, PERSONAL_RADIUS, NEIGHBOUR_RADIUS, TICK_DT_CAP,
  GRINDER_AURA_RADIUS, GRINDER_AURA_BOOST,
  PIZZA_ATTRACT_RADIUS, PIZZA_DURATION, PIZZA_EAT_MIN, PIZZA_EAT_MAX,
  ALARM_DURATION, EXIT_REACH_RADIUS,
  CAT_DURATION,
  MEETING_CAPACITY, MEETING_DURATION_MIN, MEETING_DURATION_MAX, PRODUCTIVITY_PENALTY,
  FRIDAY_SPEED_MULT, FRIDAY_GOSSIP_BOOST,
  CHAOS_ORDER_THRESHOLD, CHAOS_METRIC_WINDOW,
  START_GRINDERS, START_WANDERERS, START_GOSSIPS, START_MANAGERS, START_INTERNS, START_CHAOS,
  MOBILE_AGENT_COUNT, MOBILE_BREAKPOINT,
  COLORS,
  COFFEE_SPILL_DURATION,
  MONDAY_SPEED_MULT,
  REPLY_ALL_FREEZE_MIN, REPLY_ALL_FREEZE_MAX,
  POWER_NAP_DURATION_MIN, POWER_NAP_DURATION_MAX,
  LOUD_MUSIC_DURATION,
  PING_PONG_DURATION,
  AGENT_RADIUS,
} from './constants.js';
import {
  Agent, updateAgent, WorldContext, ParticleOpts, randRange, steerToward, dist,
} from './agent.js';
import { Quadtree, QuadPoint } from './quadtree.js';
import { ParticleSystem } from './particles.js';
import {
  createOfficeLayout, clampToWorld, randomEdgePosition, randomWorldPosition,
  getCollidingDesks,
} from './office.js';
import { checkEasterEggs, EasterEggState } from './eastereggs.js';
import { ChatSystem } from './chat.js';

export interface DisturbanceCallbacks {
  onLog: (text: string, type: EventType) => void;
  onToast: (text: string) => void;
  onChaosChange: (value: number) => void;
  onObserverUnlock: () => void;
  onPaletteShift: (active: boolean) => void;
  onMondayMode?: (active: boolean) => void;
}

export class World {
  agents: Agent[];
  desks: Desk[];
  coffeeMachine: CoffeeMachine;
  exits: Exit[];
  pizzas: PizzaEntity[];
  cat: CatEntity | null;
  meetingRoom: MeetingRoom | null;

  particles: ParticleSystem;
  quadtree: Quadtree;
  quadPoints: QuadPoint[];
  chat: ChatSystem;

  fridayMode: boolean;
  alarmActive: boolean;
  alarmTimer: number;
  globalSpeedMult: number;
  observerUnlocked: boolean;

  // New disturbance states
  coffeeBroken: boolean;
  coffeeRepairTimer: number;
  mondayMode: boolean;
  musicSource: MusicSource | null;
  pingPongZone: PingPongZone | null;
  powerNapZzzTimer: number;

  productivity: number;
  morale: number;
  chaosIndex: number;

  // Chaos metric tracking
  chaosHistory: number[];
  chaosHistoryTimer: number;
  chaosModeSwitches: number;
  orderTimer: number;

  // Event log
  logEvents: LogEvent[];
  logCounter: number;

  // FPS tracking
  fps: number;
  frameCount: number;
  fpsTimer: number;

  // Easter egg state
  eggState: EasterEggState;

  // Callbacks
  callbacks: DisturbanceCallbacks;

  // Mobile
  isMobile: boolean;

  // Extra wanderers spawned by Friday
  fridayExtraWanderers: Set<number>;

  // Respawn queue
  respawnQueue: Array<{ type: AgentType; x: number; y: number; delay: number }>;

  private _nextPizzaId: number;
  private _nextCatId: number;
  private _nextMeetingId: number;

  constructor(callbacks: DisturbanceCallbacks) {
    this.callbacks = callbacks;
    this.isMobile = window.innerWidth <= MOBILE_BREAKPOINT || navigator.maxTouchPoints > 1;

    const layout = createOfficeLayout();
    this.desks = layout.desks;
    this.coffeeMachine = layout.coffeeMachine;
    this.exits = layout.exits;

    this.agents = [];
    this.pizzas = [];
    this.cat = null;
    this.meetingRoom = null;
    this.particles = new ParticleSystem();
    this.quadtree = new Quadtree(WORLD_WIDTH, WORLD_HEIGHT);
    this.quadPoints = [];
    this.chat = new ChatSystem();
    this.fridayMode = false;
    this.alarmActive = false;
    this.alarmTimer = 0;
    this.globalSpeedMult = 1;
    this.observerUnlocked = localStorage.getItem('chaos-office:observer-unlocked') === 'true';
    this.productivity = 0.72;
    this.morale = 0.65;
    this.chaosIndex = 0.24;
    this.chaosHistory = [];
    this.chaosHistoryTimer = 0;
    this.chaosModeSwitches = 0;
    this.orderTimer = 0;
    this.logEvents = [];
    this.logCounter = 0;
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.fridayExtraWanderers = new Set();
    this.respawnQueue = [];
    this._nextPizzaId = 0;
    this._nextCatId = 0;
    this._nextMeetingId = 0;

    // New disturbance state
    this.coffeeBroken = false;
    this.coffeeRepairTimer = 0;
    this.mondayMode = false;
    this.musicSource = null;
    this.pingPongZone = null;
    this.powerNapZzzTimer = 0;

    this.eggState = {
      observerUnlocked: this.observerUnlocked,
      pentagonCheckTimer: 0,
      fridayChecked: false,
      emergentOrderTriggered: false,
      orderTimer: 0,
    };

    this.spawnInitialAgents();

    if (this.observerUnlocked) {
      this.spawnObserver();
    }

    this.addLog('🏢 Chaos Office is open for business!', EventType.GOOD);
    this.addLog('📋 Try the disturbance buttons below.', EventType.INFO);
  }

  private spawnInitialAgents(): void {
    const desktopTotal = START_GRINDERS + START_WANDERERS + START_GOSSIPS + START_MANAGERS + START_INTERNS + START_CHAOS;
    const total = this.isMobile ? MOBILE_AGENT_COUNT : desktopTotal;

    const mobile = this.isMobile;
    const scale = mobile ? MOBILE_AGENT_COUNT / desktopTotal : 1;

    const counts = {
      [AgentType.GRINDER]:     Math.round(START_GRINDERS * scale),
      [AgentType.WANDERER]:    Math.round(START_WANDERERS * scale),
      [AgentType.GOSSIP]:      Math.round(START_GOSSIPS * scale),
      [AgentType.MANAGER]:     Math.round(START_MANAGERS * scale),
      [AgentType.INTERN]:      Math.round(START_INTERNS * scale),
      [AgentType.CHAOS_AGENT]: Math.round(START_CHAOS * scale),
    };

    void total; // actual total from summing counts

    for (const [typeStr, count] of Object.entries(counts)) {
      const type = typeStr as AgentType;
      for (let i = 0; i < count; i++) {
        const pos = randomWorldPosition(80);
        this.spawnAgent(type, pos.x, pos.y);
      }
    }
  }

  spawnAgent(type: AgentType, x: number, y: number): Agent {
    const agent = new Agent(type, x, y);
    this.agents.push(agent);

    // Auto-assign desk for grinders
    if (type === AgentType.GRINDER) {
      const desk = this.findNearestFreeDeskFor(x, y, agent.id);
      if (desk) {
        this.claimDesk(agent.id, desk.id);
        agent.targetDeskId = desk.id;
      }
    }
    return agent;
  }

  spawnObserver(): void {
    const pos = randomEdgePosition();
    const obs = this.spawnAgent(AgentType.OBSERVER, pos.x, pos.y);
    obs.state = AgentState.PERIMETER_PATROL;
    obs.alpha = 0;
  }

  addLog(text: string, type: EventType): void {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const event: LogEvent = { timestamp: ts, text, type, id: this.logCounter++ };
    this.logEvents.unshift(event);
    if (this.logEvents.length > 50) this.logEvents.pop();
    this.callbacks.onLog(text, type);
  }

  // ============================================================
  // Main Update Loop
  // ============================================================
  update(dt: number): void {
    const cappedDt = Math.min(dt, TICK_DT_CAP);

    // FPS tracking
    this.frameCount++;
    this.fpsTimer += cappedDt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1;
    }

    // Rebuild quadtree
    this.rebuildQuadtree();

    // Build world context
    const ctx = this.buildContext();

    // Update agents
    for (const agent of this.agents) {
      if (agent.state === AgentState.ESCAPED) continue;
      updateAgent(agent, cappedDt, ctx);
    }

    // Apply grinder aura speed boost
    this.applyGrinderAuras();

    // Apply separation (boids)
    this.applySeparation(cappedDt);

    // Move agents
    this.moveAgents(cappedDt);

    // Update disturbances
    this.updatePizzas(cappedDt);
    this.updateCat(cappedDt);
    this.updateMeetingRoom(cappedDt);
    this.updateAlarm(cappedDt);
    this.updateCoffeeRepair(cappedDt);
    this.updateMusicSource(cappedDt);
    this.updatePingPong(cappedDt);

    // Power nap Zzz particles
    this.updatePowerNapZzz(cappedDt);

    // Update particles
    this.particles.update(cappedDt);

    // Process respawn queue
    this.processRespawnQueue(cappedDt);

    // Compute chaos metric
    this.chaosHistoryTimer += cappedDt;
    if (this.chaosHistoryTimer >= 1) {
      this.chaosHistoryTimer -= 1;
      this.updateChaosMetric();
    }

    // Easter eggs
    checkEasterEggs(this, cappedDt, this.eggState);

    // Gossip color decay on agents
    for (const agent of this.agents) {
      if (agent.gossipColor) {
        agent.gossipColor.decayTimer -= cappedDt;
        if (agent.gossipColor.decayTimer <= 0) {
          agent.gossipColor = null;
          agent.resetTint();
        }
      }
    }

    // Chat idle messages
    this.chat.updateIdle(cappedDt, this.agents);

    // FPS-based agent cull
    if (this.fps < 30 && this.agents.length > 60) {
      const wanderers = this.agents.filter(a => a.type === AgentType.WANDERER);
      if (wanderers.length > 5) {
        const toCull = wanderers[wanderers.length - 1];
        this.agents.splice(this.agents.indexOf(toCull), 1);
      }
    }
  }

  private rebuildQuadtree(): void {
    this.quadtree.clear();
    this.quadPoints = [];
    for (const agent of this.agents) {
      if (agent.state === AgentState.ESCAPED) continue;
      const p: QuadPoint = { x: agent.x, y: agent.y, id: agent.id };
      this.quadPoints.push(p);
      this.quadtree.insert(p);
    }
  }

  private buildContext(): WorldContext {
    const self = this;
    return {
      agents: this.agents,
      desks: this.desks,
      coffeeMachine: this.coffeeMachine,
      exits: this.exits,
      pizzas: this.pizzas,
      cat: this.cat,
      meetingRoom: this.meetingRoom,
      fridayMode: this.fridayMode,
      alarmActive: this.alarmActive,
      coffeeBroken: this.coffeeBroken,
      globalSpeedMult: this.globalSpeedMult,
      musicSource: this.musicSource ? { x: this.musicSource.x, y: this.musicSource.y } : null,
      pingPongZone: this.pingPongZone ? { x: this.pingPongZone.x, y: this.pingPongZone.y } : null,
      spawnParticle: (x, y, color, count = 6, opts?: ParticleOpts) => {
        self.particles.spawn(x, y, color, count, opts);
      },
      addLogEvent: (text, type) => self.addLog(text, type as EventType),
      quadtreeQuery: (x, y, r) => self.quadtree.query(x, y, r),
      findClusters: (r, minSize) => self.quadtree.findClusters(self.quadPoints, r, minSize),
      getDeskById: (id) => self.desks.find(d => d.id === id),
      claimDesk: (agentId, deskId) => self.claimDesk(agentId, deskId),
      releaseDesk: (agentId) => self.releaseDesk(agentId),
      findNearestFreeDesk: (x, y, agentId) => self.findNearestFreeDeskFor(x, y, agentId),
      findAgentById: (id) => self.agents.find(a => a.id === id),
      notifyChaosSwitch: () => { self.chaosModeSwitches++; },
    };
  }

  private applyGrinderAuras(): void {
    // Reset speed mults
    for (const agent of this.agents) agent.speedMult = 1;

    for (const grinder of this.agents) {
      if (grinder.type !== AgentType.GRINDER || grinder.state !== AgentState.SEATED) continue;
      const nearby = this.quadtree.query(grinder.x, grinder.y, GRINDER_AURA_RADIUS);
      for (const n of nearby) {
        const other = this.agents.find(a => a.id === n.id);
        if (other && other.id !== grinder.id) {
          other.speedMult = Math.max(other.speedMult, GRINDER_AURA_BOOST);
        }
      }
    }
  }

  private applySeparation(dt: number): void {
    for (const agent of this.agents) {
      if (agent.state === AgentState.SEATED || agent.state === AgentState.ESCAPED) continue;
      const nearby = this.quadtree.query(agent.x, agent.y, PERSONAL_RADIUS * 2);
      for (const n of nearby) {
        if (n.id === agent.id) continue;
        const dx = agent.x - n.x;
        const dy = agent.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PERSONAL_RADIUS * PERSONAL_RADIUS && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const force = (PERSONAL_RADIUS - d) / PERSONAL_RADIUS * 80;
          agent.vx += (dx / d) * force * dt;
          agent.vy += (dy / d) * force * dt;
        }
      }
    }
  }

  private moveAgents(dt: number): void {
    for (const agent of this.agents) {
      if (agent.state === AgentState.SEATED ||
          agent.state === AgentState.ESCAPED ||
          agent.state === AgentState.IN_MEETING) {
        continue;
      }

      agent.x += agent.vx * dt;
      agent.y += agent.vy * dt;

      // Wall collision
      const clamped = clampToWorld(agent.x, agent.y, 16);
      if (agent.x !== clamped.x || agent.y !== clamped.y) {
        agent.x = clamped.x;
        agent.y = clamped.y;
        if (agent.x <= 16 || agent.x >= WORLD_WIDTH - 16) agent.vx *= -0.8;
        if (agent.y <= 16 || agent.y >= WORLD_HEIGHT - 16) agent.vy *= -0.8;
        agent.heading = Math.atan2(agent.vy, agent.vx);
        if (agent.type === AgentType.WANDERER && agent.state === AgentState.WANDERING) {
          agent.state = AgentState.BUMP_RECOVERY;
          agent.stateTimer = 0.3;
        }
      }

      // Desk collision — push agents out of desk bounding boxes
      // Exception: skip desks claimed by this agent (grinders heading to their own desk)
      const pushRadius = AGENT_RADIUS + 4;
      const collidingDesks = getCollidingDesks(agent.x, agent.y, pushRadius, this.desks);
      for (const desk of collidingDesks) {
        if (desk.claimedBy === agent.id) continue; // let the owner pass through
        const nearX = Math.max(desk.x, Math.min(agent.x, desk.x + desk.width));
        const nearY = Math.max(desk.y, Math.min(agent.y, desk.y + desk.height));
        const dx = agent.x - nearX;
        const dy = agent.y - nearY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < pushRadius) {
          if (d > 0.001) {
            const push = pushRadius - d;
            agent.x += (dx / d) * push;
            agent.y += (dy / d) * push;
            // Cancel velocity component directed into the desk
            const dot = agent.vx * (dx / d) + agent.vy * (dy / d);
            if (dot < 0) {
              agent.vx -= dot * (dx / d);
              agent.vy -= dot * (dy / d);
            }
          } else {
            // Exactly on nearest point — nudge away horizontally
            agent.x += pushRadius;
          }
        }
      }

      // Friction
      agent.vx *= 0.92;
      agent.vy *= 0.92;
    }
  }

  // ============================================================
  // Disturbances (Original)
  // ============================================================

  dropPizza(worldX: number, worldY: number): void {
    const pizza: PizzaEntity = {
      id: this._nextPizzaId++,
      x: worldX, y: worldY,
      timer: PIZZA_DURATION,
    };
    this.pizzas.push(pizza);
    this.particles.spawn(worldX, worldY, COLORS.PIZZA, 10, { speed: 80, gravity: 30 });
    this.addLog('🍕 Pizza dropped! Agents stampede.', EventType.WARNING);
    this.chat.onPizza();

    for (const agent of this.agents) {
      if (agent.type === AgentType.OBSERVER) continue;
      const d = dist(agent.x, agent.y, worldX, worldY);
      if (d < PIZZA_ATTRACT_RADIUS || Math.random() < 0.5) {
        const prev = agent.state;
        if (prev === AgentState.SEATED) {
          this.releaseDesk(agent.id);
          agent.targetDeskId = null;
        }
        agent.state = AgentState.EATING;
        agent.eatTimer = randRange(PIZZA_EAT_MIN, PIZZA_EAT_MAX);
        agent.vx = ((worldX - agent.x) / (d || 1)) * BASE_SPEED * 1.2;
        agent.vy = ((worldY - agent.y) / (d || 1)) * BASE_SPEED * 1.2;
      }
    }
  }

  fireAlarm(): void {
    if (this.alarmActive) return;
    this.alarmActive = true;
    this.alarmTimer = ALARM_DURATION;
    this.addLog('🔥 FIRE ALARM! Evacuate NOW!', EventType.CHAOS);
    this.chat.onFireAlarm();

    for (const agent of this.agents) {
      if (agent.type === AgentType.OBSERVER) continue;
      const nearestExit = this.exits.reduce((a, b) =>
        dist(agent.x, agent.y, a.x, a.y) < dist(agent.x, agent.y, b.x, b.y) ? a : b
      );
      if (agent.state === AgentState.SEATED) this.releaseDesk(agent.id);
      agent.state = AgentState.PANICKING;
      agent.panicTargetX = nearestExit.x;
      agent.panicTargetY = nearestExit.y;
      agent.mood = Math.max(0, agent.mood - 0.15); // fire alarm = scary
      this.particles.spawnFireSparks(agent.x, agent.y);
    }
  }

  dropCat(worldX: number, worldY: number): void {
    if (this.cat) {
      this.cat = null;
    }
    this.cat = {
      id: this._nextCatId++,
      x: worldX, y: worldY,
      vx: (Math.random() - 0.5) * BASE_SPEED * 0.5,
      vy: (Math.random() - 0.5) * BASE_SPEED * 0.5,
      heading: Math.random() * Math.PI * 2,
      timer: CAT_DURATION,
    };
    this.addLog('🐱 A cat appeared! Office divided.', EventType.WARNING);
    this.chat.onCatAppear();

    for (const agent of this.agents) {
      if (agent.type === AgentType.OBSERVER) continue;
      agent.catResponse = Math.random() < 0.5 ? 'ATTRACTED' : 'AVOIDANT';
    }
  }

  placeMeetingRoom(x: number, y: number, w: number, h: number): void {
    if (this.meetingRoom) {
      this.endMeeting();
    }
    this.meetingRoom = {
      id: this._nextMeetingId++,
      x, y, width: w, height: h,
      timer: randRange(MEETING_DURATION_MIN, MEETING_DURATION_MAX),
      occupants: new Set(),
    };
    this.addLog('📊 Meeting room placed! Manager activates.', EventType.INFO);
    this.chat.onMeeting();

    for (const agent of this.agents) {
      if (agent.type === AgentType.MANAGER) {
        agent.state = AgentState.HERDING;
      }
    }

    let herded = 0;
    for (const agent of this.agents) {
      if (herded >= MEETING_CAPACITY) break;
      if (agent.type === AgentType.MANAGER || agent.type === AgentType.OBSERVER) continue;
      if (agent.state === AgentState.SEATED) this.releaseDesk(agent.id);
      agent.state = AgentState.IN_MEETING;
      agent.x = x + w / 2 + (Math.random() - 0.5) * (w * 0.6);
      agent.y = y + h / 2 + (Math.random() - 0.5) * (h * 0.6);
      agent.vx = 0; agent.vy = 0;
      this.meetingRoom.occupants.add(agent.id);
      herded++;
    }
  }

  toggleFridayMode(enabled: boolean): void {
    this.fridayMode = enabled;
    if (enabled) {
      this.globalSpeedMult *= FRIDAY_SPEED_MULT;
      // Friday = everyone gets a mood boost
      for (const a of this.agents) a.mood = Math.min(1, a.mood + 0.1);
      const currentWanderers = this.agents.filter(a => a.type === AgentType.WANDERER).length;
      const toSpawn = currentWanderers * 2;
      for (let i = 0; i < toSpawn; i++) {
        const pos = randomEdgePosition();
        const agent = this.spawnAgent(AgentType.WANDERER, pos.x, pos.y);
        this.fridayExtraWanderers.add(agent.id);
      }
      this.addLog('🎉 Friday afternoon! Productivity leaves the building.', EventType.WARNING);
      this.chat.onFridayMode(true);
      const now = new Date();
      if (now.getDay() === 5 && now.getHours() === 17 && now.getMinutes() >= 1) {
        this.trigger1701();
      }
    } else {
      this.globalSpeedMult /= FRIDAY_SPEED_MULT;
      this.agents = this.agents.filter(a => {
        if (this.fridayExtraWanderers.has(a.id)) {
          return false;
        }
        return true;
      });
      this.fridayExtraWanderers.clear();
      this.addLog('📅 Back to Monday mindset.', EventType.INFO);
      this.chat.onFridayMode(false);
    }
  }

  trigger1701(): void {
    this.addLog('⏰ It\'s 17:01 on a Friday. Maximum entropy.', EventType.CHAOS);
    this.callbacks.onToast('🎉 17:01 Friday Mode! Freedom imminent...');
    this.chat.on1701();
    this.globalSpeedMult *= 0.7;
    const toSpawn = this.agents.filter(a => a.type === AgentType.WANDERER).length;
    for (let i = 0; i < toSpawn; i++) {
      const pos = randomEdgePosition();
      const agent = this.spawnAgent(AgentType.WANDERER, pos.x, pos.y);
      this.fridayExtraWanderers.add(agent.id);
    }
  }

  // ============================================================
  // NEW DISTURBANCES
  // ============================================================

  coffeeSpill(): void {
    if (this.coffeeBroken) return;
    this.coffeeBroken = true;
    this.coffeeRepairTimer = COFFEE_SPILL_DURATION;
    this.particles.spawnCoffeeSplash(this.coffeeMachine.x + this.coffeeMachine.width / 2,
      this.coffeeMachine.y + this.coffeeMachine.height / 2);

    // Find a nearby chaos agent or wanderer to attribute it to
    const culprit = this.agents.find(a => a.type === AgentType.CHAOS_AGENT) ??
                    this.agents.find(a => a.type === AgentType.WANDERER);

    this.addLog('☕ Coffee machine broken! Agents distraught.', EventType.WARNING);
    this.chat.onCoffeeSpill(culprit?.name ?? 'Someone');
    this.callbacks.onToast('☕ Coffee machine OUT OF ORDER!');

    // Agents heading to coffee must turn around
    for (const agent of this.agents) {
      if (agent.state === AgentState.HEADING_TO_COFFEE || agent.state === AgentState.AT_COFFEE) {
        agent.state = AgentState.WANDERING;
        agent.heading = Math.random() * Math.PI * 2;
      }
    }
  }

  mondayModeToggle(): void {
    this.mondayMode = !this.mondayMode;
    if (this.mondayMode) {
      this.globalSpeedMult *= MONDAY_SPEED_MULT;
      this.addLog('💀 Monday Mode activated. Everything is grey.', EventType.CHAOS);
      this.chat.onMondayMode(true);
      this.callbacks.onToast('💀 Monday Mode: everything is terrible.');
      this.callbacks.onMondayMode?.(true);
    } else {
      this.globalSpeedMult /= MONDAY_SPEED_MULT;
      this.addLog('☀️ Monday Mode deactivated.', EventType.GOOD);
      this.chat.onMondayMode(false);
      this.callbacks.onToast('☀️ Energy slowly returning...');
      this.callbacks.onMondayMode?.(false);
    }
  }

  replyAll(): void {
    // Find a chaos agent or gossip as culprit
    const culprit = this.agents.find(a => a.type === AgentType.CHAOS_AGENT) ??
                    this.agents.find(a => a.type === AgentType.GOSSIP) ??
                    this.agents[0];

    this.addLog('📧 Reply-All email sent! Everyone is distracted.', EventType.WARNING);
    this.chat.onReplyAll(culprit?.name ?? 'Someone');
    this.callbacks.onToast('📧 REPLY-ALL chaos! The damage is done.');

    // Freeze agents briefly to "read their phone"
    for (const agent of this.agents) {
      if (agent.type === AgentType.OBSERVER) continue;
      if (agent.state === AgentState.PANICKING || agent.state === AgentState.ESCAPED) continue;
      const prevState = agent.state;
      if (prevState === AgentState.SEATED) this.releaseDesk(agent.id);
      agent.state = AgentState.READING_PHONE;
      agent.stateTimer = randRange(REPLY_ALL_FREEZE_MIN, REPLY_ALL_FREEZE_MAX);
      agent.vx = 0; agent.vy = 0;
    }

    // Spawn phone-reading particles
    for (const agent of this.agents) {
      if (Math.random() < 0.3) {
        this.particles.spawn(agent.x, agent.y, 0x5AADE8, 3, { speed: 20, gravity: -20, lifetime: 0.8 });
      }
    }
  }

  powerNap(): void {
    // Pick a random grinder or wanderer at desk
    const candidates = this.agents.filter(
      a => (a.type === AgentType.GRINDER && a.state === AgentState.SEATED) ||
           a.type === AgentType.WANDERER
    );
    if (candidates.length === 0) return;

    const agent = candidates[Math.floor(Math.random() * candidates.length)];
    if (agent.state !== AgentState.SEATED) {
      // Move to nearest desk
      const desk = this.findNearestFreeDeskFor(agent.x, agent.y, agent.id);
      if (desk) {
        this.claimDesk(agent.id, desk.id);
        agent.x = desk.x + desk.width / 2;
        agent.y = desk.y + desk.height / 2 + desk.height * 0.4;
      }
    }
    agent.state = AgentState.POWER_NAP;
    agent.stateTimer = randRange(POWER_NAP_DURATION_MIN, POWER_NAP_DURATION_MAX);
    agent.vx = 0; agent.vy = 0;

    this.addLog(`💤 ${agent.name} is power napping at their desk.`, EventType.INFO);
    this.chat.onPowerNap(agent.name);
    this.callbacks.onToast(`💤 ${agent.name} is power napping. Shhh.`);
  }

  loudMusic(): void {
    if (this.musicSource) return; // already playing

    // Pick a random agent to be the music source
    const candidates = this.agents.filter(
      a => a.type !== AgentType.OBSERVER && a.state !== AgentState.ESCAPED
    );
    if (candidates.length === 0) return;

    const agent = candidates[Math.floor(Math.random() * candidates.length)];
    this.musicSource = {
      x: agent.x,
      y: agent.y,
      agentId: agent.id,
      timer: LOUD_MUSIC_DURATION,
    };

    this.addLog(`🎵 ${agent.name} is playing VERY loud music.`, EventType.WARNING);
    this.chat.onLoudMusic(agent.name);
    this.callbacks.onToast(`🎵 ${agent.name} playing full blast! Agents fleeing.`);
  }

  newHire(): void {
    const pos = randomEdgePosition();
    const intern = this.spawnAgent(AgentType.INTERN, pos.x, pos.y);
    intern.state = AgentState.IDLE;

    this.addLog(`📦 New hire ${intern.name} joined the office!`, EventType.GOOD);
    this.chat.onNewHire(intern.name);
    this.callbacks.onToast(`📦 ${intern.name} has joined as intern!`);
  }

  pingPong(): void {
    if (this.pingPongZone) return;

    // Place ping pong zone in a corner away from desks
    const ppX = WORLD_WIDTH - 150;
    const ppY = 100;

    this.pingPongZone = {
      x: ppX,
      y: ppY,
      timer: PING_PONG_DURATION,
    };

    this.addLog('🏓 Ping Pong table deployed! Break room open.', EventType.INFO);
    this.chat.onPingPong();
    this.callbacks.onToast('🏓 Ping Pong! Break room is OPEN!');
  }

  // ============================================================
  // Update sub-systems
  // ============================================================

  private updatePizzas(dt: number): void {
    for (let i = this.pizzas.length - 1; i >= 0; i--) {
      const pizza = this.pizzas[i];
      pizza.timer -= dt;
      if (pizza.timer <= 0) {
        this.pizzas.splice(i, 1);
        this.addLog('🍕 Pizza demolished. Back to work.', EventType.INFO);
        for (const agent of this.agents) {
          if (agent.type === AgentType.GRINDER && agent.state === AgentState.POST_PIZZA) {
            agent.state = AgentState.SEEKING_DESK;
            agent.targetDeskId = null;
          }
        }
      }
    }
  }

  private updateCat(dt: number): void {
    if (!this.cat) return;
    this.cat.timer -= dt;
    if (this.cat.timer <= 0) {
      this.cat = null;
      for (const agent of this.agents) agent.catResponse = 'NONE';
      this.addLog('🐱 Cat wandered off. Office returns to normal.', EventType.INFO);
      return;
    }
    if (Math.random() < 0.02 * dt) {
      this.cat.heading += (Math.random() - 0.5) * Math.PI;
    }
    const speed = BASE_SPEED * 0.5;
    this.cat.vx = Math.cos(this.cat.heading) * speed;
    this.cat.vy = Math.sin(this.cat.heading) * speed;
    this.cat.x += this.cat.vx * dt;
    this.cat.y += this.cat.vy * dt;
    const c = clampToWorld(this.cat.x, this.cat.y, 20);
    if (this.cat.x !== c.x) { this.cat.heading = Math.PI - this.cat.heading; }
    if (this.cat.y !== c.y) { this.cat.heading = -this.cat.heading; }
    this.cat.x = c.x; this.cat.y = c.y;
  }

  private updateMeetingRoom(dt: number): void {
    if (!this.meetingRoom) return;
    this.meetingRoom.timer -= dt;
    if (this.meetingRoom.timer <= 0) {
      this.endMeeting();
    }
  }

  private endMeeting(): void {
    if (!this.meetingRoom) return;
    for (const agentId of this.meetingRoom.occupants) {
      const agent = this.agents.find(a => a.id === agentId);
      if (agent) {
        agent.state = AgentState.POST_MEETING;
        agent.stateTimer = 5;
      }
    }
    for (const agent of this.agents) {
      if (agent.type === AgentType.MANAGER) {
        agent.state = AgentState.SCANNING;
      }
    }
    this.meetingRoom = null;
    this.addLog('📊 Meeting ended. Productivity returns (maybe).', EventType.INFO);
    this.chat.onMeetingEnd();
  }

  private updateAlarm(dt: number): void {
    if (!this.alarmActive) return;
    this.alarmTimer -= dt;
    if (this.alarmTimer <= 0) {
      this.alarmActive = false;
      this.addLog('🔔 All clear! Agents return from evacuation.', EventType.GOOD);
      for (const agent of this.agents) {
        if (agent.state === AgentState.ESCAPED) {
          const pos = randomEdgePosition();
          const delay = randRange(1, 4);
          this.respawnQueue.push({ type: agent.type, x: pos.x, y: pos.y, delay });
        }
      }
      this.agents = this.agents.filter(a => a.state !== AgentState.ESCAPED);
    }
  }

  private updateCoffeeRepair(dt: number): void {
    if (!this.coffeeBroken) return;
    this.coffeeRepairTimer -= dt;
    if (this.coffeeRepairTimer <= 0) {
      this.coffeeBroken = false;
      this.addLog('☕ Coffee machine repaired!', EventType.GOOD);
      this.chat.onCoffeeMachineFixed();
    }
  }

  private updateMusicSource(dt: number): void {
    if (!this.musicSource) return;
    this.musicSource.timer -= dt;

    // Update position to follow agent
    const agent = this.agents.find(a => a.id === this.musicSource?.agentId);
    if (agent) {
      this.musicSource.x = agent.x;
      this.musicSource.y = agent.y;
    }

    // Spawn musical particles
    if (Math.random() < 0.3) {
      this.particles.spawn(this.musicSource.x, this.musicSource.y, 0xF6D937, 2, {
        speed: 50, gravity: -30, lifetime: 0.8, size: 4,
      });
    }

    if (this.musicSource.timer <= 0) {
      this.musicSource = null;
      this.addLog('🎵 Music stopped. Office recovers.', EventType.INFO);
      this.chat.onLoudMusicEnd();
    }
  }

  private updatePingPong(dt: number): void {
    if (!this.pingPongZone) return;
    this.pingPongZone.timer -= dt;
    if (this.pingPongZone.timer <= 0) {
      this.pingPongZone = null;
      this.addLog('🏓 Break time over. Back to work.', EventType.INFO);
      this.chat.onPingPongEnd();
    }
  }

  private updatePowerNapZzz(dt: number): void {
    this.powerNapZzzTimer -= dt;
    if (this.powerNapZzzTimer <= 0) {
      this.powerNapZzzTimer = 1.5;
      for (const agent of this.agents) {
        if (agent.state === AgentState.POWER_NAP) {
          this.particles.spawn(agent.x, agent.y - 10, 0xAAAAFF, 2, {
            speed: 15, gravity: -20, lifetime: 1.2, size: 5,
          });
        }
      }
    }
  }

  private processRespawnQueue(dt: number): void {
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      this.respawnQueue[i].delay -= dt;
      if (this.respawnQueue[i].delay <= 0) {
        const item = this.respawnQueue.splice(i, 1)[0];
        const agent = this.spawnAgent(item.type, item.x, item.y);
        agent.state = AgentState.POST_ALARM;
        agent.stateTimer = 3;
      }
    }
  }

  // ============================================================
  // Chaos Metric
  // ============================================================
  private updateChaosMetric(): void {
    const activeAgents = this.agents.filter(a => a.state !== AgentState.ESCAPED);
    if (activeAgents.length === 0) return;

    let meanVx = 0, meanVy = 0;
    for (const a of activeAgents) { meanVx += a.vx; meanVy += a.vy; }
    meanVx /= activeAgents.length; meanVy /= activeAgents.length;
    let variance = 0;
    for (const a of activeAgents) {
      variance += (a.vx - meanVx) ** 2 + (a.vy - meanVy) ** 2;
    }
    variance /= activeAgents.length;
    const vScore = Math.min(1, variance / (BASE_SPEED * BASE_SPEED));

    const clusters = this.quadtree.findClusters(this.quadPoints, 60, 3);
    const fragScore = clusters.length === 0 ? 1
      : 1 - (Math.max(...clusters.map(c => c.length)) / activeAgents.length);

    const chaosScore = Math.min(1, this.chaosModeSwitches / 20);
    this.chaosModeSwitches = 0;

    const metric = (vScore * 0.4) + (fragScore * 0.4) + (chaosScore * 0.2);
    this.chaosHistory.push(metric);
    if (this.chaosHistory.length > CHAOS_METRIC_WINDOW) {
      this.chaosHistory.shift();
    }

    const avg = this.chaosHistory.reduce((s, v) => s + v, 0) / this.chaosHistory.length;
    this.chaosIndex = avg;
    this.morale = Math.max(0.1, 1 - avg * 0.8);

    const seated = this.agents.filter(a => a.type === AgentType.GRINDER && a.state === AgentState.SEATED).length;
    const inMeeting = this.agents.filter(a => a.state === AgentState.IN_MEETING).length;
    const totalWorkers = this.agents.filter(a => a.type !== AgentType.OBSERVER && a.state !== AgentState.ESCAPED).length;
    const meetingPenalty = totalWorkers > 0 ? (inMeeting / totalWorkers) * PRODUCTIVITY_PENALTY : 0;
    this.productivity = Math.max(0, Math.min(1,
      (seated / Math.max(1, this.desks.length)) * (1 - avg * 0.5) - meetingPenalty
    ));

    this.callbacks.onChaosChange(avg);
  }

  // ============================================================
  // Desk Management
  // ============================================================
  claimDesk(agentId: number, deskId: number): boolean {
    const desk = this.desks.find(d => d.id === deskId);
    if (!desk || desk.claimedBy !== null || desk.broken) return false;
    desk.claimedBy = agentId;
    return true;
  }

  releaseDesk(agentId: number): void {
    for (const desk of this.desks) {
      if (desk.claimedBy === agentId) {
        desk.claimedBy = null;
        break;
      }
    }
  }

  findNearestFreeDeskFor(x: number, y: number, agentId: number): Desk | null {
    let best: Desk | null = null;
    let bestDist = Infinity;
    for (const desk of this.desks) {
      if (desk.broken) continue;
      if (desk.claimedBy !== null && desk.claimedBy !== agentId) continue;
      const cx = desk.x + desk.width / 2;
      const cy = desk.y + desk.height / 2;
      const d = dist(x, y, cx, cy);
      if (d < bestDist) {
        bestDist = d;
        best = desk;
      }
    }
    return best;
  }

  // ============================================================
  // Agent count stats
  // ============================================================
  getStats() {
    const counts: Partial<Record<AgentType, number>> = {};
    for (const type of Object.values(AgentType)) {
      counts[type] = this.agents.filter(a => a.type === type && a.state !== AgentState.ESCAPED).length;
    }
    return {
      total: this.agents.filter(a => a.state !== AgentState.ESCAPED).length,
      counts: counts as Record<AgentType, number>,
      productivity: this.productivity,
      morale: this.morale,
      chaosIndex: this.chaosIndex,
      fps: this.fps,
    };
  }

  // ============================================================
  // Observer unlock
  // ============================================================
  unlockObserver(): void {
    if (this.eggState.observerUnlocked) return;
    this.eggState.observerUnlocked = true;
    this.observerUnlocked = true;
    localStorage.setItem('chaos-office:observer-unlocked', 'true');
    this.spawnObserver();
    this.callbacks.onObserverUnlock();
    this.callbacks.onToast('👁 The Observer joins the office.');
    this.callbacks.onPaletteShift(true);
    this.addLog('👁 Observer unlocked via Codex Pentagon.', EventType.CHAOS);
    this.chat.onObserverUnlocked();
  }

  // Expose neighbour radius for easter egg checks
  readonly _neighbourRadius = NEIGHBOUR_RADIUS;
}

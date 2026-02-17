// ============================================================
// CHAOS OFFICE — Type Definitions
// ============================================================

export enum AgentType {
  GRINDER = 'GRINDER',
  WANDERER = 'WANDERER',
  GOSSIP = 'GOSSIP',
  MANAGER = 'MANAGER',
  INTERN = 'INTERN',
  CHAOS_AGENT = 'CHAOS_AGENT',
  OBSERVER = 'OBSERVER',
}

export enum AgentState {
  // Grinder
  SEEKING_DESK = 'SEEKING_DESK',
  SEATED = 'SEATED',
  DISTURBED = 'DISTURBED',
  // Wanderer
  WANDERING = 'WANDERING',
  AT_COFFEE = 'AT_COFFEE',
  BUMP_RECOVERY = 'BUMP_RECOVERY',
  HEADING_TO_COFFEE = 'HEADING_TO_COFFEE',
  // Gossip
  SEEKING_CLUSTER = 'SEEKING_CLUSTER',
  IN_HUDDLE = 'IN_HUDDLE',
  MOVING_ON = 'MOVING_ON',
  // Manager
  SCANNING = 'SCANNING',
  APPROACHING = 'APPROACHING',
  DISPERSING = 'DISPERSING',
  CONFUSED = 'CONFUSED',
  HERDING = 'HERDING',
  IN_MEETING = 'IN_MEETING',
  // Intern
  IDLE = 'IDLE',
  FOLLOWING = 'FOLLOWING',
  // Chaos Agent modes
  CHAOS_WANDER = 'CHAOS_WANDER',
  CHAOS_GRIND = 'CHAOS_GRIND',
  CHAOS_GOSSIP = 'CHAOS_GOSSIP',
  CHAOS_SPRINT = 'CHAOS_SPRINT',
  CHAOS_FREEZE = 'CHAOS_FREEZE',
  // Observer
  PERIMETER_PATROL = 'PERIMETER_PATROL',
  // Shared
  EATING = 'EATING',
  POST_PIZZA = 'POST_PIZZA',
  PANICKING = 'PANICKING',
  ESCAPED = 'ESCAPED',
  POST_ALARM = 'POST_ALARM',
  POST_MEETING = 'POST_MEETING',
  GRID_OVERRIDE = 'GRID_OVERRIDE',
}

export enum ChaosMode {
  WANDER = 'WANDER',
  GRIND = 'GRIND',
  GOSSIP = 'GOSSIP',
  SPRINT = 'SPRINT',
  FREEZE = 'FREEZE',
}

export enum EventType {
  CHAOS = 'chaos',
  GOOD = 'good',
  INFO = 'info',
  WARNING = 'warning',
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Desk {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  claimedBy: number | null;
  broken: boolean;
}

export interface CoffeeMachine {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Exit {
  x: number;
  y: number;
}

export interface PizzaEntity {
  id: number;
  x: number;
  y: number;
  timer: number;
  sprite?: unknown;
}

export interface CatEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  timer: number;
  sprite?: unknown;
}

export interface MeetingRoom {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  timer: number;
  occupants: Set<number>;
}

export interface GossipColor {
  hue: number;
  saturation: number;
  lightness: number;
  decayTimer: number;
}

export interface CopyBufferEntry {
  vx: number;
  vy: number;
  state: AgentState;
  timestamp: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  alpha: number;
  size: number;
  lifetime: number;
  maxLifetime: number;
  gravity: number;
  active: boolean;
}

export interface LogEvent {
  timestamp: string;
  text: string;
  type: EventType;
  id: number;
}

export interface WorldState {
  agentCount: number;
  counts: Record<AgentType, number>;
  productivity: number;
  morale: number;
  chaosIndex: number;
  fridayMode: boolean;
  alarmActive: boolean;
  observerUnlocked: boolean;
  meetingRoom: MeetingRoom | null;
}

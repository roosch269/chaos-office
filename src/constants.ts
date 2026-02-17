// ============================================================
// CHAOS OFFICE — Game Constants
// ============================================================

// Canvas / World
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 900;

// Agent movement
export const BASE_SPEED = 60; // logical units per second
export const PERSONAL_RADIUS = 16;
export const NEIGHBOUR_RADIUS = 80;
export const CLUSTER_MIN = 3;
export const DESK_CLAIM_RADIUS = 14;
export const TICK_DT_CAP = 0.05;

// Agent sizes
export const AGENT_RADIUS = 12; // visual radius in logical units

// Grinder
export const GRINDER_AURA_RADIUS = 120;
export const GRINDER_AURA_BOOST = 1.3;

// Wanderer
export const WANDER_ANGLE_JITTER = 45;
export const COFFEE_APPROACH_DIST = 30;
export const COFFEE_DWELL_MIN = 3;
export const COFFEE_DWELL_MAX = 8;

// Gossip
export const GOSSIP_SEEK_RADIUS = 200;
export const GOSSIP_HUDDLE_RADIUS = 40;
export const GOSSIP_SPREAD_RATE = 0.15;
export const GOSSIP_SPREAD_RADIUS = 60;
export const GOSSIP_MOVE_SPEED_MULT = 1.2;
export const GOSSIP_HUDDLE_MIN = 8;
export const GOSSIP_HUDDLE_MAX = 20;

// Manager
export const MANAGER_SCAN_RADIUS = 300;
export const MANAGER_DISPERSE_RADIUS = 60;
export const MANAGER_DISPERSE_FORCE = 150;
export const MANAGER_CONFUSED_MIN = 5;
export const MANAGER_CONFUSED_MAX = 12;
export const MANAGER_SCAN_INTERVAL = 2;

// Intern
export const INTERN_COPY_DELAY = 2.0;
export const INTERN_FOLLOW_RADIUS = 160;
export const INTERN_COPY_WEIGHT = 0.7;

// Chaos Agent
export const CHAOS_SWITCH_MIN = 2;
export const CHAOS_SWITCH_MAX = 8;
export const CHAOS_BREAK_RADIUS = 48;
export const CHAOS_BREAK_CHANCE = 0.003;

// Observer
export const OBSERVER_NOTE_INTERVAL_MIN = 4;
export const OBSERVER_NOTE_INTERVAL_MAX = 10;
export const OBSERVER_EDGE_MARGIN = 80;

// Pizza disturbance
export const PIZZA_ATTRACT_RADIUS = 400;
export const PIZZA_DURATION = 15;
export const PIZZA_EAT_MIN = 3;
export const PIZZA_EAT_MAX = 8;

// Fire alarm
export const ALARM_DURATION = 12;
export const EXIT_REACH_RADIUS = 30;
export const STAMPEDE_SEPARATION = 6;
export const ALARM_SPEED_MULT = 1.8;

// Cat
export const CAT_ATTRACT_RADIUS = 120;
export const CAT_AVOID_RADIUS = 100;
export const CAT_DURATION = 20;
export const CAT_MOVE_SPEED_MULT = 0.5;

// Meeting room
export const MEETING_CAPACITY = 8;
export const MEETING_DURATION_MIN = 20;
export const MEETING_DURATION_MAX = 45;
export const PRODUCTIVITY_PENALTY = 0.2;

// Friday mode
export const FRIDAY_SPEED_MULT = 0.5;
export const FRIDAY_GOSSIP_BOOST = 1.5;

// Easter eggs
export const PENTAGON_CHECK_INTERVAL = 0.5;
export const PENTAGON_TOLERANCE = 20;
export const PENTAGON_RADIUS_MIN = 60;
export const PENTAGON_RADIUS_MAX = 200;

export const CHAOS_ORDER_THRESHOLD = 0.15;
export const CHAOS_ORDER_HYSTERESIS = 0.05;
export const CHAOS_METRIC_WINDOW = 10;

// Mobile
export const MOBILE_AGENT_COUNT = 80;
export const MOBILE_BREAKPOINT = 768;

// Particle system
export const MAX_PARTICLES = 500;

// Desktop starting counts
export const START_GRINDERS = 8;
export const START_WANDERERS = 10;
export const START_GOSSIPS = 8;
export const START_MANAGERS = 2;
export const START_INTERNS = 8;
export const START_CHAOS = 4;

// Office layout
export const DESK_COLS = 6;
export const DESK_ROWS = 4;
export const DESK_WIDTH = 50;
export const DESK_HEIGHT = 36;
export const DESK_GAP_X = 90;
export const DESK_GAP_Y = 80;

// Colors (PIXI hex format 0xRRGGBB)
export const COLORS = {
  GRINDER:      0x4A90E2,
  WANDERER:     0xE8A838,
  GOSSIP:       0xE24A6A,
  MANAGER:      0x8B4AE2,
  INTERN:       0x4AE28B,
  CHAOS_AGENT:  0xFF3B3B,
  OBSERVER:     0x2A2A2A,
  FLOOR:        0x88AF92,
  DESK:         0xF8A153,
  DESK_DARK:    0xC47030,
  DESK_TOP:     0xFFBB77,
  COFFEE_MACH:  0x74A8A2,
  EXIT:         0x46A45F,
  PIZZA:        0xF8D040,
  CAT:          0xF8A153,
  MEETING_ROOM: 0x46A45F,
  WALL:         0xC4BBB8,
  CARPET:       0x88AF92,
  PARTICLE_COFFEE: 0x5C3D2E,
  PARTICLE_FIRE: 0xEF6361,
  PARTICLE_GOSSIP: 0xE24A6A,
  PARTICLE_STAR: 0xF6D937,
  BACKGROUND:   0x1A1210,
  PANEL_BG:     0x3D2B22,
  CHALK:        0xC4BBB8,
  DUST_ROSE:    0xC7555E,
  PEACH_ORANGE: 0xF8A153,
} as const;

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
export const AGENT_RADIUS = 12; // collision radius in logical units

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
export const MOBILE_AGENT_COUNT = 20;
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

// New disturbances
export const COFFEE_SPILL_DURATION = 20;
export const MONDAY_SPEED_MULT = 0.3;
export const REPLY_ALL_FREEZE_MIN = 2;
export const REPLY_ALL_FREEZE_MAX = 5;
export const POWER_NAP_DURATION_MIN = 8;
export const POWER_NAP_DURATION_MAX = 15;
export const LOUD_MUSIC_DURATION = 18;
export const LOUD_MUSIC_AVOID_RADIUS = 180;
export const PING_PONG_DURATION = 25;
export const PING_PONG_RADIUS = 160;

// Colors (PIXI hex format 0xRRGGBB)
export const COLORS = {
  GRINDER:      0x4A90E2,
  WANDERER:     0xE8A838,
  GOSSIP:       0xE24A6A,
  MANAGER:      0x8B4AE2,
  INTERN:       0x4AE28B,
  CHAOS_AGENT:  0xFF3B3B,
  OBSERVER:     0x2A2A2A,
  FLOOR:        0xF5ECD7,
  DESK:         0xF8A153,
  DESK_DARK:    0xC47030,
  DESK_TOP:     0xFFBB77,
  COFFEE_MACH:  0x74A8A2,
  EXIT:         0x46A45F,
  PIZZA:        0xF8D040,
  CAT:          0xF8A153,
  MEETING_ROOM: 0x46A45F,
  WALL:         0xC4BBB8,
  CARPET:       0xF5ECD7,
  PARTICLE_COFFEE: 0x5C3D2E,
  PARTICLE_FIRE: 0xEF6361,
  PARTICLE_GOSSIP: 0xE24A6A,
  PARTICLE_STAR: 0xF6D937,
  BACKGROUND:   0x1A1210,
  PANEL_BG:     0x3D2B22,
  CHALK:        0xC4BBB8,
  DUST_ROSE:    0xC7555E,
  PEACH_ORANGE: 0xF8A153,
  SKIN:         0xFFD5A5,
  PLANT_POT:    0xC47030,
  PLANT_LEAF:   0x3AAA5F,
  WATER_COOLER: 0xAAD4F5,
  PRINTER:      0x8899AA,
} as const;

// Agent names pool
export const AGENT_NAMES = [
  'Dave', 'Karen', 'Chad', 'Steve', 'Linda', 'Bob', 'Janet', 'Mike',
  'Susan', 'Greg', 'Debra', 'Kevin', 'Pam', 'Jim', 'Dwight', 'Michael',
  'Angela', 'Oscar', 'Stanley', 'Phyllis', 'Toby', 'Ryan', 'Kelly',
  'Meredith', 'Creed', 'Andy', 'Erin', 'Gabe', 'Holly', 'Jan',
  'Roy', 'Darryl', 'Nellie', 'Pete', 'Clark', 'Val', 'Ellie', 'Jordan',
];

// Random idle chat messages per type
export const IDLE_CHATS: Record<string, string[]> = {
  GRINDER: [
    'Anyone seen the TPS reports?',
    '*types aggressively*',
    'Just one more commit...',
    'The deadline is WHEN?!',
    'Have you tried turning it off and on?',
    'I\'ll sleep when I\'m dead.',
    'Just 47 more emails to go...',
    'Who keeps scheduling meetings during my focus time?',
    'I swear this spreadsheet is haunting me',
    'Coffee count today: 4. Productivity: questionable',
    'If I see one more reply-all I\'m quitting',
    'Almost done... said me 3 hours ago',
    'Why does nobody read the documentation?',
    'My keyboard is louder than my personality',
    'Tab count: 73. Send help.',
    'I\'m in the zone. Please don\'t talk to me.',
    'Debugging this since Tuesday...',
    'Stack Overflow, my beloved',
    'This code worked yesterday, I swear',
    'Meeting could\'ve been an email',
    'Heads down, do not disturb 🎧',
  ],
  WANDERER: [
    'Is there any coffee left?',
    '*wanders aimlessly*',
    'Has anyone seen my mug?',
    'Where even am I right now.',
    'I need caffeine stat.',
    'Just stretching my legs...',
    'Anyone want anything from the kitchen?',
    'I\'ve walked 10,000 steps... all inside this office',
    'Just stretching my legs... for the 12th time',
    'The water cooler gossip today is wild',
    'I forgot why I got up...',
    'Oh look, free snacks in the break room!',
    'Has anyone tried the new coffee blend?',
    'I swear the printer hates me personally',
    'Taking the scenic route to the bathroom',
    'Is it lunch yet? *checks phone* It\'s 10am',
    'My desk misses me. I don\'t miss it.',
    'I think I left my coffee... somewhere',
    'Walking meeting with myself',
    '*whistles casually*',
    'Exploring uncharted territories (floor 2)',
  ],
  GOSSIP: [
    'Did you hear about the new policy?',
    'Between you and me...',
    'I shouldn\'t say this but...',
    'The manager was FURIOUS.',
    'Guess who got a raise?',
    'I heard it from Janet.',
    'Did you hear about Dave and the stapler incident?',
    'Apparently the CEO\'s dog has its own office',
    'Someone\'s getting promoted... I heard things',
    'I\'m not saying it\'s true, but...',
    'Soooo... who\'s going to the party?',
    'The tea today is PIPING hot ☕',
    'I have information that could end careers',
    'No comment. Actually, full comment.',
    'Between us... but tell everyone',
    'Karen from accounting said WHAT?',
    'The drama in this office could be a Netflix show',
    'I\'m not gossiping, I\'m networking',
    'Sources say... and by sources I mean I overheard',
    'Plot twist in the break room just now',
    'This office is better than reality TV',
  ],
  MANAGER: [
    'Back to work, everyone!',
    'We need to synergize.',
    'Let\'s circle back on that.',
    'My door is always open.',
    'Going forward, team...',
    'Let\'s take this offline.',
    'Can we take this offline?',
    'Synergy. That\'s all I\'m going to say.',
    'I need a status update on the status update',
    'Who approved this? ...Oh wait, I did',
    'Let\'s align on our alignment',
    'Moving forward, we need to move forward',
    'Per my last email...',
    'Great, let\'s schedule a meeting about this meeting',
    'Thinking strategically about thinking strategically',
    'We need more bandwidth. Not internet bandwidth.',
    'Let\'s put a pin in it and circle the pin',
    'Action items from today: create more action items',
    'I\'m going to need that report by EOD yesterday',
    'Touching base to touch more bases',
  ],
  INTERN: [
    '*follows nervously*',
    'Should I be doing something?',
    'Is this right?',
    'Nobody tells me anything.',
    'I just started here...',
    'What\'s the WiFi password?',
    'Is... is this normal here?',
    'I\'m just happy to be here!',
    'Everyone seems so... confident',
    'Day 3: they still don\'t know I\'m an intern',
    'I brought homemade cookies! ...Anyone?',
    '*nervously takes notes*',
    'How do I use the printer again?',
    'My mentor said \'figure it out.\' Great advice.',
    'I accidentally replied-all. Help.',
    'Is the coffee free? Is ANYTHING free?',
    'I\'ve been CC\'d on 200 emails I don\'t understand',
    'Everyone\'s in a meeting. What do I do?',
    '*pretends to look busy*',
    'LinkedIn says I should be networking',
  ],
  CHAOS_AGENT: [
    'YOLO!',
    'Oops, my bad.',
    'Who broke the printer AGAIN?',
    'I do what I want.',
    'Embrace the chaos.',
    '*tips over coffee*',
    'Oops.',
    'That wasn\'t supposed to happen',
    'I wonder what this button does...',
    'Rules are more like... guidelines',
    'Accidentally deleted something. Don\'t ask what.',
    'If nobody saw it, did it really happen?',
    '🔥 This is fine 🔥',
    'I\'m not causing chaos, I\'m creating opportunities',
    'Watch this! ...Actually don\'t watch',
    'My bad. Again.',
    'Chaos is a ladder',
    'I may have broken the coffee machine',
    'Whoopsie daisy',
    'Error 404: professionalism not found',
    'Hold my coffee... actually I already spilled it',
  ],
  OBSERVER: [
    '...',
    '*scribbles notes*',
    'Interesting.',
    '*watches quietly*',
    'Fascinating behavior.',
    'Data point acquired.',
    '📝',
    '*observes silently*',
    'Noted.',
    '*adjusts glasses*',
    'The patterns are... revealing',
    'I see everything.',
    'Don\'t mind me.',
    'Collecting data...',
  ],
};

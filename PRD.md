# Chaos Office — Product Requirements Document

**Version:** 1.0.0  
**Status:** DRAFT  
**Authored by:** Architect Agent  
**Date:** 2026-02-17  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Character Behavioural Rules](#2-character-behavioural-rules)
3. [User Interactions](#3-user-interactions)
4. [Easter Eggs](#4-easter-eggs)
5. [Performance Budget](#5-performance-budget)
6. [Mobile UX](#6-mobile-ux)
7. [Acceptance Criteria](#7-acceptance-criteria)

---

## 1. Overview

### 1.1 Product Vision

Chaos Office is a browser-based emergent-behaviour simulation. A grid of pixel-art office workers governed by simple per-agent rules creates complex, comedic group dynamics. No server required — all logic runs in the browser. Zero API costs.

### 1.2 Guiding Principles

- **Emergent over scripted.** Comedy arises from rule collisions, not predetermined animations.
- **Legible at a glance.** A new user must understand every character type within 10 seconds of watching.
- **Zero friction.** Load → play. No sign-up, no tutorial gate, no server latency.
- **60 fps always.** Frame drops break the illusion. Budget ruthlessly.

### 1.3 Scope

| In Scope | Out of Scope |
|---|---|
| 200-agent real-time simulation | Server-side state |
| 7 character types | User accounts / persistence |
| 5 user disturbances | Multiplayer |
| 4 easter eggs | Native mobile app |
| Static Vercel deploy | Monetisation |

### 1.4 Default Simulation State

- **Office grid:** 1 600 × 900 logical units (scales to viewport)
- **Starting agents:** 40 total; default distribution below
- **Desks:** 24 desks, arranged in 4 rows of 6, centred in the canvas
- **Coffee machine:** 1 fixture, top-left quadrant
- **Exits:** 2 fixtures, left and right edges, vertically centred
- **Meeting room:** Initially absent; placed by user interaction

| Character | Starting count | Sprite colour (ARGB tint) |
|---|---|---|
| Grinder | 8 | `0xFF4A90E2` (steel blue) |
| Wanderer | 10 | `0xFFE8A838` (amber) |
| Gossip | 8 | `0xFFE24A6A` (rose) |
| Manager | 2 | `0xFF8B4AE2` (purple) |
| Intern | 8 | `0xFF4AE28B` (mint) |
| Chaos Agent | 4 | `0xFFFF3B3B` (red) |
| Observer | 0 (hidden) | `0xFF2A2A2A` (near-black) |

---

## 2. Character Behavioural Rules

All agents share a base set of components (see ARCHITECTURE.md). Rules below describe each agent's `update(dt)` decision tree executed by the BehaviourSystem every tick.

### 2.1 Shared Agent Constants

```
BASE_SPEED          = 60   // logical units per second
PERSONAL_RADIUS     = 16   // separation distance (logical units)
NEIGHBOUR_RADIUS    = 80   // default perception radius
CLUSTER_MIN         = 3    // min agents to constitute a "cluster"
DESK_CLAIM_RADIUS   = 12   // how close to desk counts as "seated"
TICK_DT_CAP         = 0.05 // max dt fed to systems (seconds); prevents spiral of death
```

### 2.2 The Grinder

**Personality:** Laser-focused. Does not socialise. Productivity aura.

```
GRINDER_AURA_RADIUS = 120   // logical units
GRINDER_AURA_BOOST  = 1.3   // speed multiplier applied to agents in aura

state: SEEKING_DESK | SEATED | DISTURBED

on spawn:
  target_desk = nearest unclaimed desk
  claim(target_desk)
  state = SEEKING_DESK

SEEKING_DESK:
  move_toward(target_desk, speed = BASE_SPEED * 1.1)
  if distance(self, target_desk) < DESK_CLAIM_RADIUS:
    state = SEATED
    play_anim("work_loop")

SEATED:
  velocity = (0, 0)
  emit ProductivityAura(radius=GRINDER_AURA_RADIUS, multiplier=GRINDER_AURA_BOOST)
  // aura is picked up by SpeedModifierSystem for neighbouring agents
  if disturbance(PIZZA | FIRE_ALARM):
    release_claim(target_desk)
    state = DISTURBED
    respond_to_disturbance()

DISTURBED:
  handle disturbance (see §3)
  on disturbance_end:
    target_desk = nearest unclaimed desk
    if target_desk exists:
      claim(target_desk)
      state = SEEKING_DESK
    else:
      wander_slowly()  // desk unavailable; sulk
```

**Emergent interaction notes:**
- Multiple Grinders cluster desks → local productivity zones
- Chaos Agent breaking a desk evicts Grinder → visible distress animation

### 2.3 The Wanderer

**Personality:** Perpetually on a coffee run. Never arrives anywhere useful.

```
WANDER_ANGLE_JITTER = 45      // degrees, random deviation per second
COFFEE_APPROACH_DIST = 30     // "arrives" at coffee machine if within this dist
COFFEE_DWELL_TIME    = [3, 8] // seconds spent at machine (random range)
BUMP_REBOUND_ANGLE   = 135    // rebound direction offset on obstacle collision

state: WANDERING | AT_COFFEE | BUMP_RECOVERY

on spawn:
  state = WANDERING
  heading = random_angle()

WANDERING:
  // Lévy-flight-style random walk
  if random() < 0.02 * dt:          // 2% per second chance
    heading += random(-WANDER_ANGLE_JITTER, WANDER_ANGLE_JITTER)
  if random() < 0.005 * dt:         // 0.5% per second: head for coffee
    target = coffee_machine
    state = heading_to(coffee_machine)
  move_forward(speed = BASE_SPEED * 0.8, heading)
  if wall_collision():
    heading = reflect(heading) + random(-20, 20) degrees
    state = BUMP_RECOVERY
  if desk_collision():
    heading += BUMP_REBOUND_ANGLE + random(-30, 30) degrees
    state = BUMP_RECOVERY
    play_anim("bump")

heading_to(target):
  steer smoothly toward target
  if distance(self, target) < COFFEE_APPROACH_DIST:
    state = AT_COFFEE
    dwell_timer = random(COFFEE_DWELL_TIME)
    play_anim("coffee_pour")
  return // implicit state transition handled above

AT_COFFEE:
  velocity = (0, 0)
  dwell_timer -= dt
  if dwell_timer <= 0:
    heading = random_angle()       // purposeless departure
    state = WANDERING

BUMP_RECOVERY:
  // brief pause + animation
  recovery_timer -= dt
  if recovery_timer <= 0:
    state = WANDERING

on PIZZA disturbance:
  override heading toward pizza location
  state = WANDERING   // resume normal wandering after pizza expires
```

**Emergent interaction notes:**
- Wanderers clog corridors between desks → Grinders blocked momentarily
- Friday toggle multiplies Wanderer count by 3 (spawns duplicates)

### 2.4 The Gossip

**Personality:** Information hub. Seeks groups. Spreads colour-coded "rumours".

```
GOSSIP_SEEK_RADIUS    = 200   // how far Gossip scans for clusters
GOSSIP_HUDDLE_RADIUS  = 40    // radius of a formed huddle
GOSSIP_SPREAD_RATE    = 0.15  // colour lerp rate per second (GossipColour component)
GOSSIP_SPREAD_RADIUS  = 60    // rumour propagation reach
GOSSIP_MOVE_SPEED     = BASE_SPEED * 1.2   // eager

GossipColour: { hue: float [0..360], saturation: 0.8, lightness: 0.65 }
// Each Gossip starts with a unique hue; propagation blends hues

state: SEEKING_CLUSTER | IN_HUDDLE | MOVING_ON

on spawn:
  personal_hue = random(0, 360)
  state = SEEKING_CLUSTER

SEEKING_CLUSTER:
  clusters = quadtree.query_clusters(self.pos, GOSSIP_SEEK_RADIUS, min_size=CLUSTER_MIN)
  if clusters not empty:
    best = largest cluster not including self
    steer_toward(best.centroid, speed=GOSSIP_MOVE_SPEED)
    if distance(self, best.centroid) < GOSSIP_HUDDLE_RADIUS:
      state = IN_HUDDLE
      huddle_timer = random(8, 20)  // seconds
      play_anim("huddle_talk")
  else:
    // no cluster: wander slowly looking
    wander(speed = BASE_SPEED * 0.5)

IN_HUDDLE:
  velocity = (0, 0)
  // Colour propagation: lerp neighbour hues toward own hue
  neighbours = quadtree.query(self.pos, GOSSIP_SPREAD_RADIUS)
  for each neighbour in neighbours:
    if neighbour has GossipColour component:
      neighbour.GossipColour.hue = lerp(
        neighbour.GossipColour.hue,
        self.personal_hue,
        GOSSIP_SPREAD_RATE * dt
      )
    else:
      // infect non-Gossip agents: add temporary GossipColour
      if random() < 0.01 * dt:   // 1% per second chance
        neighbour.add(GossipColour{ hue: self.personal_hue, saturation: 0.5 })
        neighbour.GossipColour.decay_timer = random(10, 30)
  huddle_timer -= dt
  if huddle_timer <= 0:
    state = MOVING_ON

MOVING_ON:
  // leave huddle, seek next cluster
  steer_away(current_huddle_centroid, distance=80)
  after_clear_distance():
    state = SEEKING_CLUSTER

on MANAGER arrives at huddle:
  state = MOVING_ON   // dispersed by Manager
  play_anim("scatter")
```

**Emergent interaction notes:**
- Competing Gossips with different hues → colour gradient battles across office
- Intern copying Gossip propagates rumours further

### 2.5 The Manager

**Personality:** Seeks crowds, breaks them up, then wanders confused.

```
MANAGER_SCAN_RADIUS    = 300  // large perception range
MANAGER_DISPERSE_RADIUS = 60  // triggers dispersal when Manager enters this zone
MANAGER_DISPERSE_FORCE  = 150 // impulse applied to clustered agents (logical units/s)
MANAGER_CONFUSED_TIME   = [5, 12] // seconds of confused wander after dispersal

state: SCANNING | APPROACHING | DISPERSING | CONFUSED

on spawn:
  state = SCANNING

SCANNING:
  all_clusters = quadtree.query_all_clusters(min_size = CLUSTER_MIN)
  if all_clusters not empty:
    target_cluster = largest(all_clusters)
    state = APPROACHING
  else:
    // no clusters: wander with confused expression
    wander(speed = BASE_SPEED * 0.6)
    play_anim("look_around")

APPROACHING:
  // Re-evaluate every 2 seconds: redirect to currently largest cluster
  steer_toward(target_cluster.centroid, speed = BASE_SPEED * 0.9)
  if distance(self, target_cluster.centroid) < MANAGER_DISPERSE_RADIUS:
    state = DISPERSING
    play_anim("clap_hands")
  if target_cluster dissolved before arrival:
    state = SCANNING

DISPERSING:
  // Apply radial impulse to all agents in MANAGER_DISPERSE_RADIUS
  nearby = quadtree.query(self.pos, MANAGER_DISPERSE_RADIUS)
  for each agent in nearby:
    direction = normalise(agent.pos - self.pos)
    agent.velocity += direction * MANAGER_DISPERSE_FORCE
    // agents retain this impulse; friction decays it over 1.5 seconds
  confused_timer = random(MANAGER_CONFUSED_TIME)
  state = CONFUSED
  play_anim("dust_cloud")

CONFUSED:
  wander(speed = BASE_SPEED * 0.4)
  play_anim("head_scratch")
  confused_timer -= dt
  if confused_timer <= 0:
    state = SCANNING

on MEETING_ROOM placed:
  // Manager overrides all behaviour to herd agents into meeting room
  state = HERDING  (see §3.4)
```

### 2.6 The Intern

**Personality:** Mimics the nearest agent with a 2-second delay. A behavioural echo.

```
INTERN_COPY_DELAY    = 2.0   // seconds before behaviour takes effect
INTERN_FOLLOW_RADIUS = 160   // scan radius for "nearest worker"
INTERN_COPY_WEIGHT   = 0.7   // blend factor: 70% copied, 30% self

state: IDLE | FOLLOWING | COPYING

CopyBuffer: circular buffer, 2-second history of target's velocity vectors

on spawn:
  state = IDLE
  copy_buffer = CopyBuffer(duration=INTERN_COPY_DELAY)

IDLE:
  target = nearest_agent(INTERN_FOLLOW_RADIUS)
  if target found:
    state = FOLLOWING

FOLLOWING:
  target = nearest_agent(INTERN_FOLLOW_RADIUS)   // re-evaluate every frame
  if target not found:
    state = IDLE
    return
  // Record target's current velocity into buffer
  copy_buffer.push(target.velocity, timestamp=now)

  // Apply 2-second-old velocity, blended with mild self-steering
  delayed_velocity = copy_buffer.get(now - INTERN_COPY_DELAY)
  self.velocity = lerp(delayed_velocity, steer_toward(target.pos), INTERN_COPY_WEIGHT)

  // Copy target's colour tint (behavioural state)
  self.tint = lerp(self.tint, target.tint, 0.05 * dt)

  // Copy target's state label after delay
  delayed_state = state_buffer.get(now - INTERN_COPY_DELAY)
  render_state_badge(delayed_state)
```

**Emergent interaction notes:**
- Intern following Chaos Agent → jittery, confused path
- Two Interns following each other → perpetual loop (detect and break with random jitter after 5s)
- Intern following Grinder → sits next to a desk without claiming it (hovering behaviour)

### 2.7 The Chaos Agent

**Personality:** Random behaviour switches. "Breaks" objects.

```
CHAOS_SWITCH_INTERVAL = [2, 8]    // seconds between behaviour swaps
CHAOS_BREAK_RADIUS    = 48        // proximity needed to break an object
CHAOS_BREAK_CHANCE    = 0.003     // per second, when near breakable object
CHAOS_MODES           = [WANDER, GRIND, GOSSIP, SPRINT, FREEZE]

state: any of CHAOS_MODES

WANDER mode:   behave exactly as Wanderer (§2.3)
GRIND  mode:   head to nearest desk, sit for up to switch_interval seconds
GOSSIP mode:   join nearest cluster; propagate Chaos Agent hue (garish red-orange)
SPRINT mode:   move at BASE_SPEED * 2.5 in random direction; bounce off walls
FREEZE mode:   velocity = (0, 0), play_anim("statue"); duration up to 3 seconds

on spawn:
  mode = random(CHAOS_MODES)
  switch_timer = random(CHAOS_SWITCH_INTERVAL)

every tick:
  switch_timer -= dt
  if switch_timer <= 0:
    prev_mode = mode
    mode = random(CHAOS_MODES excluding prev_mode)  // never same mode twice
    switch_timer = random(CHAOS_SWITCH_INTERVAL)
    play_anim("mode_switch_flash")

  // Object breaking
  breakables = quadtree.query_breakable_objects(self.pos, CHAOS_BREAK_RADIUS)
  for obj in breakables:
    if random() < CHAOS_BREAK_CHANCE * dt:
      obj.state = BROKEN
      obj.emit BreakParticles()
      // Broken desks: Grinder using that desk gets DISTURBED
      // Broken coffee machine: Wanderers play_anim("devastated") for 5s
      play_anim("evil_laugh")
```

### 2.8 The Observer *(Hidden)*

**Personality:** Watches. Records. Never interacts.

```
// EASTER EGG — unlocked only via Codex Pentagon (§4.1)
// sha256("**Status:** IMMUTABLE until explicit version bump.") =
// 5b2fb417813b37dc8e36fc635a6dd12978770f4568cb25f95a3d3b3602d917e6

OBSERVER_NOTE_INTERVAL = [4, 10]  // seconds between notebook animations
OBSERVER_EDGE_MARGIN   = 80       // stays within this band from office perimeter

state: PERIMETER_PATROL

on unlock:
  spawn at random perimeter position
  tint = 0xFF2A2A2A
  scale = 0.9   // slightly smaller; unobtrusive
  z_order = TOP // renders above others
  play_anim("appear_from_shadow")
  trigger_palette_shift()  // global colour palette shifts to muted sepia tones

PERIMETER_PATROL:
  // Slow patrol along office perimeter; never enters central area
  move_along_perimeter(speed = BASE_SPEED * 0.3)
  // Faces whichever cluster is currently largest
  face_toward(largest_cluster().centroid)
  // Periodic notebook animation
  note_timer -= dt
  if note_timer <= 0:
    play_anim("jot_note")
    note_timer = random(OBSERVER_NOTE_INTERVAL)

  // NEVER responds to any disturbance
  // NEVER modifies other agents
  // NEVER joins a cluster
  // Collisions: other agents pass through Observer (ghost collision layer)
```

---

## 3. User Interactions

### 3.1 Drop Pizza

**Trigger:** User taps/clicks the Pizza button, then taps/clicks a location on the canvas.

**Mechanic:**

```
PIZZA_ATTRACT_RADIUS  = 400   // all agents within this range affected
PIZZA_DURATION        = 15    // seconds pizza remains
PIZZA_SATISFACTION_TIME = [3, 8]  // seconds an agent "eats"

on pizza_placed(pos):
  create PizzaEntity at pos
  emit disturbance(PIZZA, pos)
  // All agents (except Observer) respond:
  for each agent:
    if distance(agent.pos, pos) < PIZZA_ATTRACT_RADIUS:
      agent.interrupt_current_state()
      agent.set_migration_target(pos)
    else:
      agent.feel_fomo()  // play "sniff" anim, then migrate anyway (50% chance)

  // Agent arrival at pizza:
  on agent_arrives_at_pizza:
    agent.state = EATING
    agent.velocity = (0, 0)
    play_anim("eating")
    eat_timer = random(PIZZA_SATISFACTION_TIME)

  // Eating complete:
  on eat_timer_expired:
    agent.state = POST_PIZZA_WANDER  // 3 second daze, then resume prior state

  // Pizza expiry:
  on pizza_duration_expired:
    destroy PizzaEntity
    all EATING agents → POST_PIZZA_WANDER
    Grinders: re-seek desks (productivity guilt)
    Managers: re-scan for clusters
```

**Visual:** Pizza sprite drops with a bounce. Eating agents form a loose ring around it. Productivity auras temporarily suspended.

### 3.2 Fire Alarm

**Trigger:** User clicks the Fire Alarm button (no placement needed).

```
ALARM_DURATION        = 12    // seconds before "all clear"
EXIT_REACH_RADIUS     = 30    // agent "escapes" when within this dist of exit
STAMPEDE_SEPARATION   = 6     // reduced personal radius during panic
ALARM_SPEED_MULT      = 1.8   // panic speed multiplier

on fire_alarm():
  play_sfx("alarm")           // optional: audio hook; silent if no audio policy
  flash_screen_red(duration=0.3)
  set GlobalFlag(FIRE_ALARM, true)
  exits = [left_exit, right_exit]

  for each agent:
    nearest_exit = min_by_distance(exits, agent.pos)
    agent.interrupt_current_state()
    agent.panic_target = nearest_exit
    agent.state = PANICKING

  PANICKING:
    // Boids flocking toward exit with reduced separation
    separation_radius = STAMPEDE_SEPARATION
    speed = BASE_SPEED * ALARM_SPEED_MULT
    apply_boids(
      alignment_weight  = 0.6,
      cohesion_weight   = 0.8,   // strong cohesion → stampede bunching
      separation_weight = 0.3,   // weak separation → crowd crush comedy
      target_weight     = 1.5    // exits pull hard
    )
    if distance(self.pos, panic_target) < EXIT_REACH_RADIUS:
      state = ESCAPED
      play_anim("relief")
      fade_out_agent(duration=0.5)   // agent exits off-screen

  on ALARM_DURATION expired:
    set GlobalFlag(FIRE_ALARM, false)
    // Respawn all escaped agents at random positions 2 seconds after all-clear
    for each escaped_agent:
      respawn at random edge position after delay=random(1, 4)
      state = POST_ALARM_DAZE  // 3s of confusion, then normal
```

### 3.3 Drop a Cat

**Trigger:** User taps/clicks the Cat button, then taps/clicks a location.

```
CAT_ATTRACT_RADIUS = 120
CAT_AVOID_RADIUS   = 100
CAT_DURATION       = 20     // seconds before cat wanders off-screen
CAT_MOVE_SPEED     = BASE_SPEED * 0.5  // slow, lazy cat

on cat_placed(pos):
  create CatEntity at pos
  CatEntity moves slowly on random walk (Lévy flight, same as Wanderer)

  // Each agent independently decides: cluster or avoid (50/50 at spawn, fixed per agent)
  for each agent:
    roll = random(0, 1)
    if roll < 0.5:
      agent.cat_response = ATTRACTED
    else:
      agent.cat_response = AVOIDANT

  // Attraction (the cat-lovers):
  ATTRACTED agents:
    if distance(self.pos, cat.pos) > CAT_ATTRACT_RADIUS:
      steer gently toward cat (weak weight 0.4, still do normal behaviour)
    else:
      velocity = (0, 0)
      play_anim("pet_cat")
      emit heart_particle()

  // Avoidance (the allergic/scared):
  AVOIDANT agents:
    if distance(self.pos, cat.pos) < CAT_AVOID_RADIUS:
      steer away(cat.pos, weight=1.2)  // strong avoidance
      play_anim("sneeze") occasionally

  // Cat wanders, so the attracted/avoidant regions move → dynamic comedy
  on CAT_DURATION expired:
    CatEntity play_anim("walk_offscreen")
    agents gradually resume normal behaviour
```

### 3.4 Place Meeting Room

**Trigger:** User taps/clicks the Meeting Room button, then drags to size/place.

```
MEETING_ROOM_CAPACITY = 8     // max agents herded in
MEETING_DURATION      = [20, 45]  // seconds before meeting ends
PRODUCTIVITY_PENALTY  = 0.2   // all agents in meeting room: productivity = 20% of normal

on meeting_room_placed(rect):
  create MeetingRoomEntity(rect)
  // Manager immediately activates HERDING state
  manager.state = HERDING
  manager.herd_target = meeting_room

  // HERDING behaviour (Manager only):
  HERDING:
    // Scan for agents not in meeting room
    stragglers = all_agents.filter(not in meeting_room)
    for each straggler in stragglers[:MEETING_ROOM_CAPACITY]:
      // Emit "persuasion aura" — nearby agents drift toward meeting room
      emit PersuasionAura(center=straggler.pos, radius=60, target=meeting_room.centroid)
    // Manager enters meeting room last
    if all_herded or count(in_meeting_room) >= MEETING_ROOM_CAPACITY:
      manager.enter(meeting_room)
      manager.state = IN_MEETING
      play_anim("point_at_whiteboard")

  // Agents in meeting room:
  IN_MEETING state:
    velocity = (0, 0)
    productivity = PRODUCTIVITY_PENALTY
    play_anim("meeting_slump") every random(5, 15) seconds
    // Gossip in meeting room: propagates rumours to all attendees rapidly
    if Gossip in meeting_room:
      spread_rate *= 3

  on MEETING_DURATION expired:
    destroy MeetingRoomEntity
    all IN_MEETING agents → POST_MEETING_DAZE (5s)
    Manager.state = SCANNING
    Grinders re-seek desks
```

### 3.5 Toggle Friday Afternoon

**Trigger:** User clicks the "Friday Afternoon" toggle button.

```
FRIDAY_SPEED_MULT      = 0.5      // all agents move at half speed
FRIDAY_WANDERER_MULT   = 3        // Wanderer count tripled (spawn extras at edges)
FRIDAY_GOSSIP_BOOST    = 1.5      // Gossip seek radius × 1.5
FRIDAY_GRINDER_ANIM    = "clock_watching"   // replaces work_loop

on friday_toggle(enabled):
  if enabled:
    GlobalFlag(FRIDAY_MODE) = true
    GlobalSpeedMultiplier *= FRIDAY_SPEED_MULT

    // Spawn 2× current Wanderer count as new Wanderers at random edge positions
    current_wanderers = count(Wanderer agents)
    spawn(Wanderer, count = current_wanderers * 2, positions = random_edge_positions())

    // Grinders: don't leave desk but show clock-watching animation
    for grinder in Grinders:
      grinder.play_anim("clock_watching")

    // Gossips: more energetic
    for gossip in Gossips:
      gossip.seek_radius = GOSSIP_SEEK_RADIUS * FRIDAY_GOSSIP_BOOST

    // Check for 17:01 easter egg (§4.2)
    check_friday_time_egg()

  else:
    GlobalFlag(FRIDAY_MODE) = false
    GlobalSpeedMultiplier /= FRIDAY_SPEED_MULT
    // Despawn extra Wanderers smoothly (walk off screen)
    despawn_extras()
    // Restore Grinder animations
    for grinder in Grinders:
      if grinder.state == SEATED:
        grinder.play_anim("work_loop")
```

---

## 4. Easter Eggs

### 4.1 Codex Pentagon

**Trigger:** Exactly 5 agents arranged in a regular pentagon formation.

**Detection algorithm:**

```
PENTAGON_CHECK_INTERVAL = 0.5    // check every 500ms (not every frame)
PENTAGON_TOLERANCE      = 20     // position tolerance in logical units
PENTAGON_RADIUS_MIN     = 60     // minimum inscribed circle radius
PENTAGON_RADIUS_MAX     = 200    // maximum inscribed circle radius

function check_codex_pentagon():
  // Only runs every PENTAGON_CHECK_INTERVAL seconds
  agents_list = all_agents  // exclude Observer

  // 1. Find all groups of exactly 5 agents within 250-unit radius of each other
  for each combination_of_5 in agents_list:
    centroid = mean(positions of 5 agents)
    radii = [distance(a.pos, centroid) for a in combination_of_5]

    // All 5 must be roughly equidistant from centroid
    mean_r = mean(radii)
    if mean_r < PENTAGON_RADIUS_MIN or mean_r > PENTAGON_RADIUS_MAX:
      continue
    if max(radii) - min(radii) > PENTAGON_TOLERANCE:
      continue  // not on same circle

    // 2. Sort agents by angle from centroid; check angular gaps ≈ 72° each
    angles = sorted([atan2(a.pos - centroid) for a in combination_of_5])
    gaps = [angles[i+1] - angles[i] for i] + [360 - angles[4] + angles[0]]
    if all gaps within [72 - 15, 72 + 15] degrees:
      trigger_codex_pentagon()
      break

function trigger_codex_pentagon():
  if Observer already unlocked: return  // idempotent

  // Dramatic pause
  set GlobalSpeedMultiplier = 0.1  // brief slowdown
  play_anim("pentagram_glow") at centroid
  after_delay(1.5s):
    spawn Observer at perimeter
    trigger_palette_shift()
    set GlobalSpeedMultiplier = 1.0
    show_toast("👁 The Observer joins the office.")
    set Flag(OBSERVER_UNLOCKED) = true
    persist to localStorage("chaos-office:observer-unlocked", true)
```

**Palette shift:**
- Office background: `#1a1a2e` → `#2c2a26` (sepia dark)
- Desk sprites: desaturate 40%
- All agent tints: multiply by `0xFFD4C9A8` (warm sepia filter)
- Reversible on page reload; Observer persists via localStorage

### 4.2 Friday 17:01

**Trigger:** Local time is Friday, hour=17, minute≥1.

```
function check_friday_time_egg():
  now = new Date()
  if now.getDay() == 5 and now.getHours() == 17 and now.getMinutes() >= 1:
    if not Flag(FRIDAY_1701_ACTIVE):
      trigger_friday_1701()

function trigger_friday_1701():
  Flag(FRIDAY_1701_ACTIVE) = true
  // Apply Friday Mode if not already
  if not GlobalFlag(FRIDAY_MODE):
    activate_friday_mode()

  // Additional effects:
  GlobalSpeedMultiplier *= 0.7   // extra slow on top of Friday halving = 0.35× normal

  // Wanderers triple (spawn even more on top of Friday toggle extra)
  spawn(Wanderer, count = current_wanderers * 2, positions = random_edge_positions())

  // Countdown overlay
  show_overlay_countdown(text="Weekend in...", target_time=next_saturday_00:00())

  // Random agent cheering
  every 3 seconds:
    random_agent.play_anim("celebrate")

  // Resets at midnight Saturday (or page reload)
  schedule_reset(next_saturday_00:00())
```

**Countdown widget:** Fixed bottom-right corner, monospace font, `HH:MM:SS` format.

### 4.3 SHA-256 Breadcrumb

**Implementation note for developers:**

```typescript
// CHAOS OFFICE — Source breadcrumb
// sha256 of SOUL.md first content line:
// 5b2fb417813b37dc8e36fc635a6dd12978770f4568cb25f95a3d3b3602d917e6
```

This comment must appear verbatim in `/src/main.ts`. The easter egg is purely discoverable by reading source — no runtime trigger. Satisfies the "hidden signal" spirit without gameplay impact.

### 4.4 Emergent Order

**Trigger:** Chaos metric crosses threshold in the downward direction.

```
CHAOS_METRIC_WINDOW    = 10     // rolling 10-second average
CHAOS_ORDER_THRESHOLD  = 0.15   // below this → "order" emerges
CHAOS_ORDER_HYSTERESIS = 0.05   // must stay below 0.15 for 3 continuous seconds

// Chaos metric calculation (runs every second):
function compute_chaos_metric():
  // Component 1: mean velocity variance (normalised 0..1)
  velocities = [agent.velocity for all agents]
  mean_v = mean(velocities)
  variance = mean([(v - mean_v)^2 for v in velocities])
  v_score = clamp(variance / (BASE_SPEED^2), 0, 1)

  // Component 2: cluster fragmentation (normalised 0..1)
  clusters = find_all_clusters()
  if clusters empty: frag_score = 1.0
  else:
    largest = max(cluster.size for cluster in clusters)
    frag_score = 1.0 - (largest / total_agents)

  // Component 3: Chaos Agent mode switch rate (normalised 0..1)
  recent_switches = count(mode_switches in last 10 seconds)
  chaos_score = clamp(recent_switches / 20, 0, 1)

  return (v_score * 0.4) + (frag_score * 0.4) + (chaos_score * 0.2)

function check_emergent_order(metric):
  if metric < CHAOS_ORDER_THRESHOLD:
    order_timer += dt
    if order_timer >= 3.0:
      if not Flag(EMERGENT_ORDER_TRIGGERED):
        trigger_emergent_order()
  else:
    order_timer = 0

function trigger_emergent_order():
  Flag(EMERGENT_ORDER_TRIGGERED) = true
  // All agents spontaneously steer to form a grid pattern
  grid_positions = compute_grid_layout(total_agents, canvas_bounds)
  for (agent, target_pos) in zip(all_agents, grid_positions):
    agent.override_target = target_pos
    agent.override_duration = 5.0  // seconds

  // Visual: soft golden glow radiates from centre
  play_effect("golden_radiance", duration=5)
  show_toast("✨ Emergent Order achieved.")

  // After 5 seconds: agents drift back to normal behaviour
  after_delay(5.0):
    for agent in all_agents:
      agent.override_target = null
    Flag(EMERGENT_ORDER_TRIGGERED) = false  // can trigger again
```

---

## 5. Performance Budget

### 5.1 Targets

| Metric | Target | Hard Cap |
|---|---|---|
| Agents | 200 | 300 |
| Frame rate | 60 fps | 30 fps minimum |
| JS frame budget | 16.67 ms | 33 ms |
| Simulation update | ≤ 4 ms | 8 ms |
| Render | ≤ 8 ms | 14 ms |
| GC pressure | < 1 allocation/frame per agent | — |
| Memory (JS heap) | < 80 MB | 150 MB |
| Initial load (cold) | < 2 s on 4G | 5 s |
| Bundle size (gzip) | < 400 KB | 600 KB |

### 5.2 Simulation Budget Breakdown (per frame @ 200 agents, 60 fps)

```
Total frame budget: 16.67 ms
  Quadtree rebuild:      0.5 ms   (incremental; full rebuild every 5 frames)
  BehaviourSystem:       2.5 ms   (~12.5 µs per agent × 200)
  MovementSystem:        0.5 ms
  PhysicsSystem:         0.8 ms   (separation, impulse decay)
  ParticleSystem:        0.4 ms
  SpeedModifierSystem:   0.2 ms
  GossipSystem:          0.5 ms
  ClusterDetection:      0.8 ms   (quadtree-accelerated)
  EasterEggChecks:       0.1 ms   (most run on intervals, not every frame)
  PixiJS render:         6.0 ms   (WebGL, batched sprites)
  PixiJS ticker overhead:1.0 ms
  Margin:                3.4 ms
```

### 5.3 Spatial Partitioning

- **Quadtree implementation:** `quadtree-js` or custom; cell size = 64 logical units
- **Rebuild strategy:** Incremental — only re-insert agents that moved > 4 units since last insert
- **Query radius → cell cost:** Radius 80 = ~4–9 cells queried; radius 300 (Manager) = ~25 cells
- **Never query quadtree inside inner loops.** Cache results per agent per tick.

### 5.4 Object Pooling Requirements

```
Pool: AgentPool         — pre-allocate 300 agent objects at init
Pool: ParticlePool      — pre-allocate 500 particle objects
Pool: VelocityBuffer    — Float32Array, 300 × 2 (pre-allocated)
Pool: CopyBuffer        — circular buffer per Intern (pre-allocated at spawn)
```

No object is ever `new`-allocated on the hot path after init.

### 5.5 Sprite Batching

- All agent sprites: single PixiJS `ParticleContainer` (enables GPU batching)
- Particles: separate `ParticleContainer`
- Static office furniture: single `Container` with `cacheAsBitmap = true`
- UI overlay: HTML/CSS layer over canvas (not in WebGL)

### 5.6 Scalability Strategy

```
if (agent_count > 150):
  // Reduce update frequency for off-screen agents
  offscreen_agents.update_every_n_frames = 3

if (agent_count > 200):
  // Disable GossipColour propagation for non-Gossip agents
  disable GossipColour infection on non-Gossip agents
  // Simplify pathfinding: direct steering only (no A*)
  pathfinding_mode = DIRECT_STEER

if (fps < 30 for 3 consecutive seconds):
  // Emergency cull: remove Wanderers until fps recovers
  despawn(Wanderer, count=5)
  show_toast("💻 Optimising simulation...")
```

### 5.7 Mobile Performance Notes

- Target: iPhone 12 / Samsung S21 or newer
- On mobile (detected via `navigator.maxTouchPoints > 1`):
  - Default agent count reduced to 80
  - Particle effects halved
  - Quadtree rebuild: every 8 frames
  - `devicePixelRatio` capped at 2 (no 3× rendering)

---

## 6. Mobile UX

### 6.1 Viewport & Scaling

```
Canvas logical size: 1600 × 900 (16:9)
Rendering:
  - On desktop: fill viewport, letterbox with CSS if needed
  - On mobile portrait: rotate hint shown ("Rotate for best experience")
    but simulation still playable; canvas letterboxed at 360 × 640 logical units
    (office shrinks; agent count auto-adjusted)
  - On mobile landscape: full canvas, scaled to fit width
  - devicePixelRatio: min(window.devicePixelRatio, 2)
```

### 6.2 Touch Interactions

All user interactions support both mouse and touch:

| Interaction | Desktop | Mobile |
|---|---|---|
| Drop pizza | Click button → click canvas | Tap button → tap canvas |
| Fire alarm | Click button | Tap button |
| Drop cat | Click button → click canvas | Tap button → tap canvas |
| Place meeting room | Click button → drag on canvas | Tap button → drag on canvas |
| Friday toggle | Click toggle | Tap toggle |
| Pentagon egg | Drag 5 agents to positions | Touch-drag 5 agents |

**Touch drag for placement:** First tap selects the item; second tap places it. No hold-to-drag required on mobile (reduces missed interactions).

### 6.3 UI Layout

```
Mobile layout (portrait/landscape):
  - Controls: horizontal scrolling strip at bottom of screen
  - Icons only (no text labels) on <480px viewport width
  - Tooltips: long-press to show label on mobile
  - Agent info panel: bottom sheet on mobile (swipe up from bottom), popover on desktop

Desktop layout:
  - Controls: left sidebar (200px fixed width)
  - Agent count / fps counter: top-right corner
  - Easter egg toast notifications: bottom-centre
```

### 6.4 Touch Targets

- Minimum touch target size: 44 × 44 CSS pixels (Apple HIG standard)
- Agent sprites (16 × 16 logical units) → hit area expanded to 44 × 44 on touch devices

### 6.5 Accessibility Considerations

- All interactive buttons: ARIA labels
- `prefers-reduced-motion`: disable particle effects, reduce animation speed to 30% of normal; agents still move but no flashing
- `prefers-color-scheme: dark`: dark office already; no separate mode needed
- Screen reader: simulation described as "animated office simulation — not screen-reader accessible in detail; see [About] for description"

---

## 7. Acceptance Criteria

### 7.1 Core Simulation

- [ ] 200 agents run at ≥ 60 fps on Chrome/Firefox desktop (2022+ hardware)
- [ ] Each character type exhibits its described behaviour within 30 seconds of observation
- [ ] Emergent interactions (§2 notes) are observable without user intervention
- [ ] No agent permanently escapes the canvas bounds

### 7.2 User Interactions

- [ ] Pizza: ≥ 80% of agents migrate within 5 seconds
- [ ] Fire alarm: all agents reach exits or are en route within 8 seconds
- [ ] Cat: visible split between attracted and avoidant groups within 3 seconds
- [ ] Meeting room: Manager enters herding mode within 2 seconds of placement
- [ ] Friday toggle: speed change is visually obvious within 1 second; new Wanderers spawn within 2 seconds

### 7.3 Easter Eggs

- [ ] Pentagon: detection fires within 1 second of formation being held for ≥ 0.5 seconds
- [ ] Friday 17:01: activates at 17:01:00 local time on Friday; countdown is accurate to the second
- [ ] SHA-256 comment: present verbatim in `/src/main.ts`
- [ ] Emergent Order: triggers within 3 seconds of chaos metric dropping below threshold

### 7.4 Performance

- [ ] Lighthouse performance score ≥ 90
- [ ] Bundle ≤ 400 KB gzipped
- [ ] No frame drops below 30 fps during fire alarm stampede (worst-case scenario)
- [ ] Memory stable after 10 minutes (no leak > 1 MB/min)

### 7.5 Mobile

- [ ] All 5 interactions work via touch on iOS Safari 16+ and Android Chrome 110+
- [ ] No horizontal scrolling on mobile portrait
- [ ] Touch targets ≥ 44 × 44 CSS px

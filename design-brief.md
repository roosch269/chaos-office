# Chaos Office — Design Brief
> *An emergent behaviour web simulation set in a comedy open-plan office.*
> Research-driven design document. Feeds directly into implementation.

---

## Research Sources

| Game | Key Lesson |
|------|-----------|
| Townscaper | Warm pastel palette, zero-clutter UI, joyful placement feedback |
| Universal Paperclips | Stats-first layout, progressive disclosure, text-as-UI |
| RimWorld / Dwarf Fortress | Modular sprites, intensity hierarchy, imagination-driven abstraction |
| Noita | Every pixel meaningful, high-contrast particles, small = exciting |
| Cookie Clicker | Three-panel layout, constant feedback, "number going up" dopamine |
| Game Dev Tycoon / Papers Please | Office visual vocabulary; Papers Please = inverted reference (cold grey = don't do this) |

---

## 1. Visual Identity

### Art Style
**Top-down flat pixel art** — like RimWorld but warmer. Think 30° overhead view, no isometric tilt. Characters are recognisable silhouettes at 16×24px. Desks, carpet, plants, printers are flat icons. The whole scene should read like a lovely dollhouse you want to poke at.

Key design philosophy (borrowed from RimWorld's GDC talk):
> "Graphics like a novel has a typeface." Abstracted icons that force players to tell the story in their mind. Minimal noise, maximum narrative.

Three rules:
1. **Not ugly.** Reach a threshold of warmth you can look at without psychic suffering.
2. **Easily identifiable.** A coffee mug, a stressed employee, a ringing phone — silhouette-readable at 16px.
3. **Intensity hierarchy.** Chaos events glow/pulse. Background carpet does not.

### Pixel Density
| Asset | Canvas size | Render scale | Effective screen size |
|-------|------------|--------------|----------------------|
| Floor tile | 16×16px | 3× | 48×48px on screen |
| Character sprite | 16×24px | 3× | 48×72px |
| Desk/furniture | 24×16px | 3× | 72×48px |
| UI icon | 12×12px | 2× | 24×24px |
| Event popup | 64×32px | 2× | 128×64px |

Render at exactly integer multiples — never sub-pixel scale. CSS: `image-rendering: pixelated`.

---

### Colour Palette

Built from **NOSTALGIA15** (by Arisuki on Lospec — Ghibli-inspired earthy palette) plus office-specific chaos accents.

#### Base Palette — Environment & Characters

| Swatch | Hex | Name | Use |
|--------|-----|------|-----|
| 🟫 | `#EFD0AE` | Warm Sand | Skin tone, paper, aged walls |
| 🟨 | `#F6D937` | Sunflower | Post-it notes, highlight, award star |
| 🟧 | `#F8A153` | Peach Orange | Wood desks, warm lighting |
| 🟥 | `#EF6361` | Coral Red | Chaos events, alert, fire (literal or metaphorical) |
| 🔴 | `#C7555E` | Dusty Rose | Stressed employee, urgent indicator |
| 🟤 | `#71323C` | Dark Wine | Chair legs, shadow, trim |
| 🩶 | `#975E5E` | Mauve | Character clothing variant, muted décor |
| 🔵 | `#808FAA` | Slate Blue | Computer screens, sky through window, calm UI |
| ⬜ | `#C4BBB8` | Chalk | Wall plaster, whiteboard, paper stack |
| 🩵 | `#74A8A2` | Seafoam | Plant pots, calm indicator, water cooler |
| 🟢 | `#46A45F` | Forest Green | Office plants, success, meeting-room carpet |
| 🫶 | `#88AF92` | Sage | Carpet base colour, secondary floor, low-stress |

#### UI Chrome Palette — Interface Only

| Swatch | Hex | Name | Use |
|--------|-----|------|-----|
| ⬛ | `#2C1F1A` | Espresso | Deepest UI background, top bar |
| 🟫 | `#3D2B22` | Dark Roast | Side panel backgrounds |
| 🟤 | `#5C3D2E` | Walnut | Card/panel borders |
| 🟡 | `#E8A44A` | Amber | Primary CTA buttons, key stat highlight |
| 🔶 | `#E87050` | Terracotta | Secondary buttons, hover states |
| 🟩 | `#5EC47A` | Mint Green | Success toast, positive event |
| 🔷 | `#5AADE8` | Clear Blue | Info/tooltip, neutral event |
| 🔴 | `#FF6B6B` | Punch | Crisis alert, red bar, gossip bomb |
| 🪨 | `#F0E8D0` | Cream | Primary text on dark, light panel text |
| 🩶 | `#BEB0A0` | Warm Grey | Secondary text, timestamps |

#### Carpet Options (pick one per level/theme)

| Carpet | Hex | Vibe |
|--------|-----|------|
| Sage | `#88AF92` | Calm startup |
| Dusty teal | `#74A8A2` | Corporate-ish |
| Muted mauve | `#975E5E` | Chaos is peaking |
| Warm tan | `#D4C5A0` | Old-school office |

---

## 2. UI Layout

### Desktop (≥1024px wide)

```
┌──────────────────────────────────────────────────────────────────┐
│  🏢 CHAOS OFFICE          Tue 14:32        Chaos ●●●○○   [?]    │  ← 48px top bar
├──────────────┬────────────────────────────┬──────────────────────┤
│              │                            │                      │
│  STATS       │                            │  EVENT LOG           │
│  PANEL       │      OFFICE CANVAS         │                      │
│  200px fixed │      (fluid fill)          │  250px fixed         │
│              │                            │                      │
│  Staff: 8    │   [desks, people, plants]  │  ► Karen microwaved  │
│  Morale: 72% │                            │    fish again 🐟     │
│  Coffee: 🔥  │                            │  ► Dave is "WFH"     │
│  Meetings: 3 │                            │  ► Printer on fire   │
│  Chaos: LOW  │                            │  ► New hire arrives  │
│              │                            │                      │
│  [UPGRADES]  │                            │  [FILTER EVENTS]     │
│              │                            │                      │
├──────────────┴────────────────────────────┴──────────────────────┤
│  [Add Desk]  [Call Meeting]  [Buy Coffee Machine]  [CHAOS!]      │  ← 56px action bar
└──────────────────────────────────────────────────────────────────┘
```

**Stats Panel (left, 200px):**
- Fixed width, scrollable
- Stats listed as labelled bars (Cookie Clicker style)
- Morale bar: fills left-to-right, colour shifts warm→red as chaos rises
- Coffee level: icon with fill indicator
- Sub-panels collapse (staff list, active events, upgrades tree)

**Office Canvas (centre):**
- Fluid — fills all remaining horizontal space
- Minimum 480px wide, scales up gracefully
- Background: office floor tile + carpet at `#88AF92`
- Canvas is the star. UI chrome gets out of its way.
- Subtle vignette around edges to frame the scene
- Day/night cycle shifts colour temperature slowly (warm afternoon ≈ golden hour tint `#FFF4E0` overlay at 15% opacity)

**Event Log (right, 250px):**
- Fixed width, scrollable feed
- Each event: timestamp + icon + one-liner in italic
- Colour-coded by type (red = chaos, green = good, yellow = opportunity)
- New events slide in from top with a 200ms ease-out
- Oldest events fade opacity to `40%` before eviction
- Click event → highlights relevant desk/person on canvas

**Top Bar (48px):**
- Game title (left), current time/day (centre), chaos meter + help (right)
- Chaos meter: 5 filled circles `●●●○○`, colour shifts coral→red
- Sticky, never scrolls

**Action Bar (bottom, 56px):**
- Primary actions, always visible
- Buttons pill-shaped (8px border-radius on pixel-scaled size)
- Primary CTA: `#E8A44A` (amber), hover: `#E87050` (terracotta)
- Locked actions: greyed at 40% opacity, tooltip on hover

### Mobile Layout (≤768px)

```
┌─────────────────────┐
│  🏢  Chaos  ●●●○○   │  ← 40px compact top bar
├─────────────────────┤
│                     │
│    OFFICE CANVAS    │  ← Square-ish, fills screen width
│    (full width,     │
│     ~60vw tall)     │
│                     │
├─────────────────────┤
│ Staff│Morale│Coffee │  ← 48px stat strip (horizontal scroll)
├─────────────────────┤
│  EVENT LOG (3 rows) │  ← Fixed 3-line log, tap to expand
├─────────────────────┤
│ [Desk][Meet][☕][💥] │  ← 64px action row, icon buttons
└─────────────────────┘
```

- Stats panel collapses to a horizontal strip
- Event log shows 3 lines max, tap-to-expand as modal
- Action bar uses icon-only buttons (56×56px tap targets)
- No side panels — everything stacks vertically

---

## 3. Animation Reference

### Core Principle
> **Squash, stretch, and anticipation** — even 2-frame animations feel alive with a single frame of anticipation. RimWorld pawns feel alive because they walk purposefully toward tasks. Townscaper feels alive because every block placement triggers a cascade of tiny architecture changes. Steal both.

### Animation Spec Table

| Animation | Frames | FPS | Duration | Notes |
|-----------|--------|-----|----------|-------|
| Character walk cycle | 8 | 12 | 667ms loop | 4 frames = acceptable minimum, 8 = smooth and fluid. Side-on walk for corridors, top-down shuffle for desk movement. |
| Character idle | 4 | 4 | 1000ms loop | Subtle bob (±1px), occasional scratch-head (2-frame insert) |
| Typing at desk | 4 | 8 | 500ms loop | Arms move, no head movement |
| Coffee pour / drink | 6 | 8 | 750ms, then pause | Arm lifts, mug tilts, lower. After: happy colour flash on character |
| Stressed walk | 8 | 16 | 500ms loop | Same frames as walk but faster + arms slightly raised |
| Meeting sit-down | 4 | 8 | 500ms, one-shot | Character slides into chair position |
| Event notification pop | 6 | 24 | 250ms, one-shot | Scale 0 → 1.1 → 1.0 with elastic overshoot |
| Chaos particle burst | 12 | 24 | 500ms, one-shot | Particles scatter from event origin, fade out |
| Button press | 3 | 24 | 125ms | Scale 1.0 → 0.92 → 1.04 → 1.0 (feels tactile) |
| Morale bar fill | — | — | 400ms ease-out | CSS transition, smooth not instant |
| Office fire 🔥 | 8 | 16 | 500ms loop | Flickering pixel flame, 3-4 orange+yellow shades |
| Plant sway | 4 | 4 | 1000ms loop | Leaves tilt ±1px left/right, calming |

### What Makes Pixel Art Feel Alive
1. **Anticipation frames** — 1 frame of windup before an action. Karen doesn't just open the microwave; her arm extends first.
2. **Secondary motion** — Hair, clothing accessories move slightly after the body stops.
3. **Offset timing** — If 3 people are walking, their cycles start 2-3 frames apart. Synchronised animation = uncanny valley.
4. **Reaction to events** — Characters near a chaos event should briefly pause/look toward it (2 frame insert: turn head, hold 12 frames, resume).
5. **Particle debris** — Coffee spill: 6 brown pixels scatter radius 16px, gravity-fall animation, 500ms. Email send: envelope sprite flies from character to off-screen right, arc path.
6. **UI micro-feedback** — Every stat change animates (even by 1). Number ticks up/down with a brief scale pulse. Satisfying.

### Particle System Palette (Noita-inspired)
Small, high-contrast particles against the warm carpet:

| Particle | Hex | Behaviour |
|----------|-----|-----------|
| Coffee spill | `#5C3D2E` + `#8B5E3C` | Gravity, spreads 12–20px radius |
| Email send | `#F0E8D0` envelope | Arc trajectory, 300ms, shrinks to 0 |
| Stress steam | `#C4BBB8` | Rises 8px, fades opacity, 3 particles |
| Achievement star | `#F6D937` | Spiral outward, 8 particles, 400ms |
| Fire spark | `#EF6361` + `#F8A153` | Random scatter, 200ms lifetime |
| Success confetti | Mix of palette | Gravity fall, rotate, 600ms |

---

## 4. Mood

### The Feeling
**Cozy chaos.** The office is slightly on fire — but in a fun way. The plants are suspiciously healthy. The carpet is warm. Someone has definitely microwaved fish. There's a growing pile of post-it notes. The printer has opinions. Dave hasn't been seen in three days but he's marked as "In a meeting."

### Reference Films / Media
- **The Secret World of Arrietty** (Ghibli) — warm domestic spaces seen from unusual angle. Tiny characters, huge implications.
- **My Neighbour Totoro** — dappled sunlight, earthy greens, everything slightly magical.
- **Office Space (1999)** — suburban office comedy. The TPS reports. The flair. The printer.
- **Severance (TV)** — open-plan mysteries, identical desks, the weird beauty of a mundane workspace.

### Colour Temperature
- Morning: slightly cool, desaturated — `#E8F0F8` tint at 8% overlay
- Afternoon: golden, warm — no overlay, natural palette
- End-of-day chaos peak: amber/orange tint — `#FFE4A0` at 12% overlay
- Panic mode: red tint — `#FF000010` pulsing overlay at 0%→8%→0%, 2s cycle

### Lighting Model (CSS only, no WebGL)
- **Floor**: Base carpet colour, flat
- **Characters**: Slightly brighter sprite on lit side (pre-baked into sprite, 1 shade lighter)
- **Desks**: Top surface: base wood + 20% brighter. Front face: base wood. Side: base wood – 15% darker.
- **Window light**: Off-screen window light source implied by a soft `#FFF8E0` glow strip on one wall, 40px wide, 30% opacity, `filter: blur(8px)` on a div behind the canvas

### Chaos Escalation Colour Shift
As chaos meter rises:
- Level 1–2: Normal warm palette, calm background music (implied)
- Level 3: Carpet subtly shifts hue toward mauve `#9B8F9A`
- Level 4: Desk lamps flicker (CSS keyframe blink on light sprites)
- Level 5 (MAX CHAOS): Brief red overlay pulse, all particle effects double rate

---

## 5. Typography

### Font Stack

| Role | Font | Source | Size | Weight | Notes |
|------|------|--------|------|--------|-------|
| **Game title / H1** | Press Start 2P | Google Fonts | 20px | Regular | Classic pixel font. Use sparingly — only title and major headings. |
| **Stats & numbers** | IBM Plex Mono | Google Fonts | 13px | Regular/Medium | Monospaced for number alignment. Numbers stay same width as they tick up. |
| **UI labels** | Nunito | Google Fonts | 12–14px | SemiBold | Rounded, friendly, legible at small sizes. Good for button labels, tooltips. |
| **Event log feed** | VT323 | Google Fonts | 16px | Regular | Old-school terminal feel. "Office memo" aesthetic. 16px renders crisply. |
| **Body / notifications** | Nunito | Google Fonts | 13px | Regular | Warm, readable for multi-line text. |
| **Monospace debug / logs** | IBM Plex Mono | Google Fonts | 11px | Light | If debug mode is shown, use this. |

### Google Fonts Import
```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=IBM+Plex+Mono:wght@300;400;500&family=Nunito:wght@400;600;700&family=VT323&display=swap');
```

### Typography Rules
- **Never render pixel fonts sub-pixel.** Press Start 2P and VT323 must be at multiples of their native size or they smear.
- **Line height for event log:** `1.4em` — gives breathing room without wasting space.
- **Number animations:** Numbers that increment should use IBM Plex Mono so the column doesn't jump. Wrap in `min-width: 4ch`.
- **All-caps sparingly.** Use for section headers only (`MORALE`, `COFFEE LVL`). Not for event log entries.
- **Colour contrast:** All text on dark panels must pass WCAG AA. `#F0E8D0` on `#2C1F1A` = contrast ratio ~12:1. ✅

---

## 6. Visual Reference URLs

Five links that capture the exact vibe we're building toward:

### 1. Townscaper — Minimal UI, Warm Palette
**https://store.steampowered.com/app/1291340/Townscaper/**
The Steam page screenshots show the exact warm pastel palette we want — terracottas, seafoams, creamy whites. Notice how the UI is invisible; just a thin colour bar. The game is 90% canvas. This is our canvas-first aspiration.

### 2. RimWorld — Character-Driven Emergent Stories, Sprite Style
**https://store.steampowered.com/app/294100/RimWorld/**
Study the screenshots for how readable top-down 2D sprites can be at tiny sizes. Each colonist is a tiny silhouette but you immediately understand "person at desk" / "person stressed" / "person on fire." The UI chrome is warm brown — note how it doesn't fight the grass/earth below.

### 3. Cookie Clicker — Three-Panel Idle Layout, Feedback Loops
**https://orteil.dashnet.org/cookieclicker/**
The canonical idle game layout. Left = big central action. Centre = animated scene that evolves as you progress. Right = purchase/upgrade column. Every click produces visual feedback. Numbers update in real-time. This is the UI skeleton we're borrowing (but making it warm and pixellated).

### 4. Lospec NOSTALGIA15 — Our Base Colour Palette
**https://lospec.com/palette-list/nostalgia15**
The Ghibli-inspired 15-colour earthy palette underpinning our visual identity. Every environment and character colour should be drawn from or closely derived from this. Download the palette PNG and load into your pixel editor as the locked palette.

### 5. Slynyrd Pixelblog — Walk Cycle Animation Reference
**https://www.slynyrd.com/blog/2024/5/24/pixelblog-50-human-walk-cycle**
The definitive free reference for pixel art walk cycles. Shows exactly why 8 frames is the sweet spot. The side-by-side of 4-frame vs 8-frame makes the case clearly. Our office workers should use the 8-frame walk with mild squash on contact frames.

---

## Implementation Checklist

Quick reference for devs starting from this brief:

- [ ] Import Google Fonts stack (4 fonts above)
- [ ] Define CSS custom properties for all 22 colours in the palette
- [ ] Set `image-rendering: pixelated` on all sprite elements
- [ ] Canvas: fluid width, minimum 480px, integer scale factor only
- [ ] Floor tiles: 16×16px source, rendered at 3× (48×48px)
- [ ] Character sprites: 16×24px source, rendered at 3×
- [ ] Stats panel: 200px fixed, left side
- [ ] Event log: 250px fixed, right side, scrollable, entries slide in from top
- [ ] Action bar: 56px, sticky bottom
- [ ] Top bar: 48px, sticky, chaos meter (5 circles)
- [ ] Day/night colour temperature: CSS overlay div, `mix-blend-mode: multiply`
- [ ] All number displays: IBM Plex Mono, `min-width: 4ch`
- [ ] Chaos escalation: 5 visual states tied to chaos meter value
- [ ] Mobile breakpoint: ≤768px, stacked layout
- [ ] Particle system: DOM-based or Canvas 2D, max 50 particles at once

---

*Brief compiled: February 2026*
*Feeds into: chaos-office implementation sprint*

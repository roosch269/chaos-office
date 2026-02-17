// ============================================================
// CHAOS OFFICE — Main Entry Point
// ============================================================
// CHAOS OFFICE — Source breadcrumb
// sha256 of "**Status:** IMMUTABLE until explicit version bump.":
// 5b2fb417813b37dc8e36fc635a6dd12978770f4568cb25f95a3d3b3602d917e6

import { Application } from 'pixi.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { UI, setupActionBar } from './ui.js';
import { AgentType, EventType } from './types.js';
import { randomWorldPosition } from './office.js';
import { WORLD_WIDTH, WORLD_HEIGHT, MOBILE_BREAKPOINT } from './constants.js';

async function main(): Promise<void> {
  // ─── Init PixiJS Application ───────────────────────────────
  const app = new Application();

  const canvasContainer = document.getElementById('canvas-container')!;

  await app.init({
    resizeTo: canvasContainer,
    backgroundColor: 0x88AF92,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    antialias: false,
    preference: 'webgl',
  });

  // Append PixiJS canvas
  canvasContainer.appendChild(app.canvas);

  // ─── Create UI references ──────────────────────────────────
  let uiInstance: UI | null = null;

  // ─── Create World ──────────────────────────────────────────
  const world = new World({
    onLog: (text, type) => {
      uiInstance?.addLogEntry(text, type);
    },
    onToast: (text) => {
      uiInstance?.showToast(text);
    },
    onChaosChange: (_value) => {
      // handled in UI.update
    },
    onObserverUnlock: () => {
      uiInstance?.showToast('👁 The Observer has been watching all along...');
    },
    onPaletteShift: (active) => {
      uiInstance?.setPaletteShift(active);
    },
  });

  // ─── Create Renderer ──────────────────────────────────────
  const renderer = new Renderer(app);

  // ─── Create UI ─────────────────────────────────────────────
  uiInstance = new UI(world);

  // Replay buffered log events from World constructor
  for (let i = world.logEvents.length - 1; i >= 0; i--) {
    const evt = world.logEvents[i];
    uiInstance.addLogEntry(evt.text, evt.type);
  }

  // ─── Resize handling ──────────────────────────────────────
  function handleResize(): void {
    // PixiJS handles its own resize via resizeTo
    // We just need to update the world container scale
    const w = app.renderer.width;
    const h = app.renderer.height;
    renderer.resize(w, h);
  }

  // Initial resize after PixiJS has setup
  handleResize();
  
  // Listen to PixiJS resize events
  app.renderer.on('resize', handleResize);

  // ─── Placement state ──────────────────────────────────────
  let pendingDisturbance: 'PIZZA' | 'CAT' | 'MEETING' | null = null;

  // ─── Action Bar ───────────────────────────────────────────
  setupActionBar(
    {
      onSpawn: (type: AgentType) => {
        const pos = randomWorldPosition(100);
        world.spawnAgent(type, pos.x, pos.y);
        uiInstance?.showToast(`✅ Spawned a ${type.toLowerCase().replace('_', ' ')}`);
        world.addLog(`+ New ${type.toLowerCase().replace('_', ' ')} joined the office.`, EventType.INFO);
      },
      onPizza: () => {
        pendingDisturbance = 'PIZZA';
      },
      onAlarm: () => {
        world.fireAlarm();
        uiInstance?.showToast('🔥 FIRE ALARM!');
      },
      onCat: () => {
        pendingDisturbance = 'CAT';
      },
      onMeeting: () => {
        pendingDisturbance = 'MEETING';
      },
      onFridayToggle: (enabled: boolean) => {
        world.toggleFridayMode(enabled);
      },
      onCanvasClick: (worldX: number, worldY: number) => {
        if (pendingDisturbance === 'PIZZA') {
          world.dropPizza(worldX, worldY);
        } else if (pendingDisturbance === 'CAT') {
          world.dropCat(worldX, worldY);
        } else if (pendingDisturbance === 'MEETING') {
          // Place meeting room centered at click
          const w = 200, h = 160;
          world.placeMeetingRoom(
            Math.max(20, Math.min(WORLD_WIDTH - w - 20, worldX - w / 2)),
            Math.max(20, Math.min(WORLD_HEIGHT - h - 20, worldY - h / 2)),
            w, h
          );
        }
        pendingDisturbance = null;
      },
    },
    (sx, sy) => renderer.screenToWorld(sx, sy)
  );

  // ─── Canvas click for direct interaction ─────────────────
  app.canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
    const worldPos = renderer.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    // If in placement mode via canvas (fallback)
    if (pendingDisturbance) {
      if (pendingDisturbance === 'PIZZA') world.dropPizza(worldPos.x, worldPos.y);
      else if (pendingDisturbance === 'CAT') world.dropCat(worldPos.x, worldPos.y);
      else if (pendingDisturbance === 'MEETING') {
        const w = 200, h = 160;
        world.placeMeetingRoom(
          Math.max(20, Math.min(WORLD_WIDTH - w - 20, worldPos.x - w / 2)),
          Math.max(20, Math.min(WORLD_HEIGHT - h - 20, worldPos.y - h / 2)),
          w, h
        );
      }
      pendingDisturbance = null;
    }
  });

  // Touch support for canvas
  app.canvas.addEventListener('touchend', (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
    const worldPos = renderer.screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);

    if (pendingDisturbance) {
      if (pendingDisturbance === 'PIZZA') world.dropPizza(worldPos.x, worldPos.y);
      else if (pendingDisturbance === 'CAT') world.dropCat(worldPos.x, worldPos.y);
      else if (pendingDisturbance === 'MEETING') {
        const w = 200, h = 160;
        world.placeMeetingRoom(
          Math.max(20, Math.min(WORLD_WIDTH - w - 20, worldPos.x - w / 2)),
          Math.max(20, Math.min(WORLD_HEIGHT - h - 20, worldPos.y - h / 2)),
          w, h
        );
      }
      pendingDisturbance = null;
    }
  });

  // ─── Friday 17:01 auto-check ──────────────────────────────
  function checkAutoFriday(): void {
    const now = new Date();
    if (now.getDay() === 5 && now.getHours() === 17 && now.getMinutes() >= 1) {
      if (!world.fridayMode && !world.eggState.fridayChecked) {
        world.toggleFridayMode(true);
        uiInstance?.showToast('⏰ It\'s 17:01 on a Friday!');
      }
    }
  }
  setInterval(checkAutoFriday, 30000);
  checkAutoFriday();

  // ─── Stat update throttle ─────────────────────────────────
  let uiTimer = 0;

  // ─── Main game loop ───────────────────────────────────────
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);

    // Update simulation
    world.update(dt);

    // Render
    renderer.render(world);

    // Update UI at reduced rate (every 200ms)
    uiTimer += dt;
    if (uiTimer >= 0.2) {
      uiTimer = 0;
      uiInstance?.update(world);
    }
  });

  // ─── Mobile orientation hint ──────────────────────────────
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    uiInstance.showToast('📱 Tip: landscape mode for best experience!', 4000);
  }

  console.log('🏢 Chaos Office initialized.');
  console.log('👁 Easter eggs: 4 hidden. Good luck finding them all.');
}

main().catch(console.error);

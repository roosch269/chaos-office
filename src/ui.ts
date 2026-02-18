// ============================================================
// CHAOS OFFICE — UI Controller
// ============================================================

import { AgentType, EventType } from './types.js';
import { World } from './world.js';

// Color map for chat feed agent name labels
const AGENT_CHAT_COLORS: Record<string, string> = {
  GRINDER:     '#4A90E2',
  WANDERER:    '#E8A838',
  GOSSIP:      '#E24A6A',
  MANAGER:     '#8B4AE2',
  INTERN:      '#4AE28B',
  CHAOS_AGENT: '#FF3B3B',
  OBSERVER:    '#888888',
  SYSTEM:      '#AAAAAA',
};

// Agent type emoji helpers (exported for use in main.ts agent popup)
export const AGENT_TYPE_EMOJI: Record<string, string> = {
  GRINDER:     '💻',
  WANDERER:    '🚶',
  GOSSIP:      '💬',
  MANAGER:     '👔',
  INTERN:      '🟢',
  CHAOS_AGENT: '💥',
  OBSERVER:    '👁',
};

export class UI {
  private world: World;

  // Stat elements
  private statAgents: HTMLElement;
  private statProductivity: HTMLElement;
  private statMorale: HTMLElement;
  private statChaos: HTMLElement;
  private barProductivity: HTMLElement;
  private barMorale: HTMLElement;
  private barChaos: HTMLElement;
  private countElements: Partial<Record<AgentType, HTMLElement>>;
  private chaosDots: HTMLElement[];

  // Mobile stats
  private mStatAgents: HTMLElement | null;
  private mStatProductivity: HTMLElement | null;
  private mStatChaos: HTMLElement | null;

  // Chat feed
  private chatFeedEl: HTMLElement | null;
  private mobileChatFeedEl: HTMLElement | null;
  private lastRenderedChatId: number;
  private eventIdCounter: number;

  // Clock
  private clockEl: HTMLElement;

  // FPS
  private fpsEl: HTMLElement | null;

  // Toasts
  private toastContainer: HTMLElement;

  // Observer row
  private observerRow: HTMLElement | null;

  constructor(world: World) {
    this.world = world;
    this.eventIdCounter = 0;

    this.statAgents = document.getElementById('stat-agents')!;
    this.statProductivity = document.getElementById('stat-productivity')!;
    this.statMorale = document.getElementById('stat-morale')!;
    this.statChaos = document.getElementById('stat-chaos')!;
    this.barProductivity = document.getElementById('bar-productivity')!;
    this.barMorale = document.getElementById('bar-morale')!;
    this.barChaos = document.getElementById('bar-chaos')!;
    this.chatFeedEl = document.getElementById('chat-feed');
    this.mobileChatFeedEl = document.getElementById('mobile-chat-feed');
    this.lastRenderedChatId = -1;
    this.clockEl = document.getElementById('clock')!;
    this.fpsEl = document.getElementById('perf-display');
    this.toastContainer = document.getElementById('toast-container')!;
    this.observerRow = document.getElementById('observer-row');

    this.chaosDots = Array.from({ length: 5 }, (_, i) =>
      document.getElementById(`chaos-dot-${i + 1}`)!
    );

    this.countElements = {};
    for (const type of Object.values(AgentType)) {
      const key = type.toLowerCase().replace('_', '-');
      const el = document.getElementById(`count-${key}`);
      if (el) this.countElements[type] = el;
    }
    // Fix chaos_agent ID
    const chaosEl = document.getElementById('count-chaos');
    if (chaosEl) this.countElements[AgentType.CHAOS_AGENT] = chaosEl;

    this.mStatAgents = document.getElementById('m-stat-agents');
    this.mStatProductivity = document.getElementById('m-stat-productivity');
    this.mStatChaos = document.getElementById('m-stat-chaos');

    this.setupClock();
    this.setupHelpModal();
  }

  private setupClock(): void {
    const update = () => {
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const day = days[now.getDay()];
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      this.clockEl.textContent = `${day} ${h}:${m}`;
    };
    update();
    setInterval(update, 30000);
  }

  private setupHelpModal(): void {
    const helpBtn = document.getElementById('help-btn');
    const modal = document.getElementById('help-modal');
    const closeBtn = document.getElementById('close-help');

    helpBtn?.addEventListener('click', () => modal?.classList.add('open'));
    closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  // ============================================================
  // Update stats
  // ============================================================
  update(world: World): void {
    const stats = world.getStats();

    this.statAgents.textContent = String(stats.total);
    this.statProductivity.textContent = `${Math.round(stats.productivity * 100)}%`;
    this.statMorale.textContent = `${Math.round(stats.morale * 100)}%`;
    this.statChaos.textContent = stats.chaosIndex.toFixed(2);

    this.barProductivity.style.width = `${stats.productivity * 100}%`;
    this.barMorale.style.width = `${stats.morale * 100}%`;
    this.barChaos.style.width = `${stats.chaosIndex * 100}%`;

    // Morale bar color shift
    const moraleHue = Math.round(stats.morale * 60); // 0=red, 60=yellow-green
    this.barMorale.style.background = `hsl(${moraleHue}, 80%, 55%)`;

    // Agent counts
    for (const [type, el] of Object.entries(this.countElements)) {
      if (el) el.textContent = String(stats.counts[type as AgentType] ?? 0);
    }

    // Chaos dots
    const chaosLevel = Math.ceil(stats.chaosIndex * 5);
    for (let i = 0; i < 5; i++) {
      const dot = this.chaosDots[i];
      if (!dot) continue;
      if (i < chaosLevel) {
        dot.classList.add('active');
        if (chaosLevel >= 4) dot.classList.add('high');
        else dot.classList.remove('high');
      } else {
        dot.classList.remove('active', 'high');
      }
    }

    // Mobile stats
    if (this.mStatAgents) this.mStatAgents.textContent = String(stats.total);
    if (this.mStatProductivity) this.mStatProductivity.textContent = `${Math.round(stats.productivity * 100)}%`;
    if (this.mStatChaos) this.mStatChaos.textContent = `${Math.round(stats.chaosIndex * 100)}%`;

    // FPS display
    if (this.fpsEl) {
      this.fpsEl.textContent = `${stats.fps} FPS | ${stats.total} agents`;
    }

    // Observer row visibility
    if (this.observerRow) {
      this.observerRow.style.display = world.observerUnlocked ? 'flex' : 'none';
    }

    // Chaos overlay
    this.updateChaosOverlay(stats.chaosIndex, world.alarmActive);
  }

  private updateChaosOverlay(chaosIndex: number, alarmActive: boolean): void {
    const overlay = document.getElementById('chaos-overlay');
    if (!overlay) return;
    if (alarmActive) {
      const pulse = Math.abs(Math.sin(Date.now() / 200));
      overlay.style.background = `rgba(255, 0, 0, ${pulse * 0.08})`;
    } else if (chaosIndex > 0.7) {
      const pulse = Math.abs(Math.sin(Date.now() / 500));
      overlay.style.background = `rgba(255, 0, 0, ${pulse * 0.05})`;
    } else {
      overlay.style.background = 'rgba(255,0,0,0)';
    }
  }

  // ============================================================
  // Event Log (kept for callback compatibility; display is now
  // handled by updateChatFeed via world.chat.messages)
  // ============================================================
  addLogEntry(_text: string, _type: EventType): void {
    // The chat feed is populated by updateChatFeed() which reads
    // directly from world.chat.messages. No separate DOM writes needed.
    this.eventIdCounter++;
  }

  // ============================================================
  // Chat Feed
  // ============================================================
  updateChatFeed(world: World): void {
    const messages = world.chat.messages;
    if (messages.length === 0) return;

    // Messages are stored newest-first (unshift). Find new ones.
    const newMessages = messages.filter(m => m.id > this.lastRenderedChatId);
    if (newMessages.length === 0) return;

    // Advance the watermark
    this.lastRenderedChatId = messages[0].id;

    // newMessages are newest-first; reverse so oldest-of-new appends first
    const ordered = [...newMessages].reverse();

    const renderInto = (container: HTMLElement, capCount: number) => {
      const frag = document.createDocumentFragment();
      for (const msg of ordered) {
        const entry = document.createElement('div');
        entry.className = 'chat-entry';
        const color = AGENT_CHAT_COLORS[msg.agentType] ?? '#AAAAAA';
        const nameSpan = `<span class="chat-name" style="color:${color}">${msg.agentName}:</span>`;
        entry.innerHTML = `${nameSpan} ${msg.text}`;
        frag.appendChild(entry);
      }
      container.appendChild(frag);

      // Cap total entries
      const all = container.querySelectorAll('.chat-entry');
      if (all.length > capCount) {
        for (let i = 0; i < all.length - capCount; i++) {
          all[i].remove();
        }
      }

      // Auto-scroll to bottom
      container.scrollTop = container.scrollHeight;
    };

    if (this.chatFeedEl) renderInto(this.chatFeedEl, 50);
    if (this.mobileChatFeedEl) renderInto(this.mobileChatFeedEl, 20);
  }

  // ============================================================
  // Toast notifications
  // ============================================================
  showToast(text: string, duration = 3000): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fadeOut');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ============================================================
  // Palette shift (Observer)
  // ============================================================
  setPaletteShift(active: boolean): void {
    const el = document.getElementById('sepia-overlay');
    if (!el) return;
    if (active) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
}

// ============================================================
// Action Bar Setup
// ============================================================
export type PlacementMode = 'PIZZA' | 'CAT' | 'MEETING' | null;

export interface ActionBarCallbacks {
  onSpawn: (type: AgentType) => void;
  onPizza: () => void;
  onAlarm: () => void;
  onCat: () => void;
  onMeeting: () => void;
  onFridayToggle: (enabled: boolean) => void;
  onCanvasClick: (worldX: number, worldY: number) => void;
  // New v2 disturbances
  onCoffeeSpill?: () => void;
  onMondayToggle?: () => void;
  onReplyAll?: () => void;
  onPowerNap?: () => void;
  onLoudMusic?: () => void;
  onNewHire?: () => void;
  onPingPong?: () => void;
}

export function setupActionBar(
  callbacks: ActionBarCallbacks,
  screenToWorld: (sx: number, sy: number) => { x: number; y: number }
): void {
  // Spawn buttons
  document.querySelectorAll('[data-spawn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = (btn as HTMLElement).dataset.spawn as AgentType;
      callbacks.onSpawn(type);
    });
  });

  // Pizza
  let placementMode: PlacementMode = null;
  const placementOverlay = document.getElementById('placement-overlay')!;
  const placementHint = document.getElementById('placement-hint')!;

  function enterPlacementMode(mode: PlacementMode, hint: string) {
    placementMode = mode;
    placementOverlay.classList.add('active');
    placementHint.textContent = hint;
  }

  function exitPlacementMode() {
    placementMode = null;
    placementOverlay.classList.remove('active');
  }

  // Handle placement clicks on overlay
  placementOverlay.addEventListener('click', (e) => {
    const rect = placementOverlay.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (placementMode === 'PIZZA') {
      callbacks.onPizza();
      callbacks.onCanvasClick(world.x, world.y);
    } else if (placementMode === 'CAT') {
      callbacks.onCat();
      callbacks.onCanvasClick(world.x, world.y);
    } else if (placementMode === 'MEETING') {
      callbacks.onMeeting();
      callbacks.onCanvasClick(world.x, world.y);
    }
    exitPlacementMode();
  });

  // Touch support
  placementOverlay.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = placementOverlay.getBoundingClientRect();
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (placementMode === 'PIZZA') {
      callbacks.onPizza();
      callbacks.onCanvasClick(world.x, world.y);
    } else if (placementMode === 'CAT') {
      callbacks.onCat();
      callbacks.onCanvasClick(world.x, world.y);
    } else if (placementMode === 'MEETING') {
      callbacks.onMeeting();
      callbacks.onCanvasClick(world.x, world.y);
    }
    exitPlacementMode();
  });

  document.getElementById('btn-pizza')?.addEventListener('click', () => {
    enterPlacementMode('PIZZA', '🍕 Click to drop pizza!');
  });

  document.getElementById('btn-alarm')?.addEventListener('click', () => {
    callbacks.onAlarm();
  });

  document.getElementById('btn-cat')?.addEventListener('click', () => {
    enterPlacementMode('CAT', '🐱 Click to drop cat!');
  });

  document.getElementById('btn-meeting')?.addEventListener('click', () => {
    enterPlacementMode('MEETING', '📊 Click to place meeting room!');
  });

  // Friday toggle
  const fridayBtn = document.getElementById('btn-friday');
  let fridayActive = false;
  fridayBtn?.addEventListener('click', () => {
    fridayActive = !fridayActive;
    fridayBtn.classList.toggle('active', fridayActive);
    callbacks.onFridayToggle(fridayActive);
  });

  // Canvas right-click cancels placement
  placementOverlay.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    exitPlacementMode();
  });

  // ── New v2 disturbance buttons ────────────────────────────
  document.getElementById('btn-coffee-spill')?.addEventListener('click', () => {
    callbacks.onCoffeeSpill?.();
  });

  // Monday mode — stateful toggle
  const mondayBtn = document.getElementById('btn-monday-mode');
  let mondayActive = false;
  mondayBtn?.addEventListener('click', () => {
    mondayActive = !mondayActive;
    mondayBtn.classList.toggle('active', mondayActive);
    callbacks.onMondayToggle?.();
  });

  document.getElementById('btn-reply-all')?.addEventListener('click', () => {
    callbacks.onReplyAll?.();
  });

  document.getElementById('btn-power-nap')?.addEventListener('click', () => {
    callbacks.onPowerNap?.();
  });

  document.getElementById('btn-loud-music')?.addEventListener('click', () => {
    callbacks.onLoudMusic?.();
  });

  document.getElementById('btn-new-hire')?.addEventListener('click', () => {
    callbacks.onNewHire?.();
  });

  document.getElementById('btn-ping-pong')?.addEventListener('click', () => {
    callbacks.onPingPong?.();
  });
}

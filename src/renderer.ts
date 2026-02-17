// ============================================================
// CHAOS OFFICE — PixiJS v8 Renderer
// ============================================================

import {
  Application, Container, Graphics, Text, TextStyle,
} from 'pixi.js';
import { Agent } from './agent.js';
import { AgentType, AgentState } from './types.js';
import { World } from './world.js';
import {
  WORLD_WIDTH, WORLD_HEIGHT, COLORS, AGENT_RADIUS,
} from './constants.js';
import { hslToHex } from './particles.js';

export class Renderer {
  app: Application;
  private worldContainer: Container;
  private floorLayer: Container;
  private officeLayer: Container;
  private agentLayer: Container;
  private particleLayer: Graphics;

  // Agent display objects  
  private agentContainers: Map<number, Container>;
  private agentBodies: Map<number, Graphics>;
  private agentDecos: Map<number, Graphics>;

  // Desk rendering (persistent graphics per desk)
  private deskStateCache: Map<number, string>;
  private deskGraphicMap: Map<number, Graphics>;

  // Office elements
  private deskLayer: Container;
  private coffeeContainer: Container;
  private exitLayer: Container;
  private pizzaLayer: Container;
  private catContainer: Container | null;
  private meetingContainer: Container | null;

  // Separate pizza graphics
  private pizzaContainers: Map<number, Container>;
  private pizzaGraphics: Map<number, Graphics>;

  // Cat graphics
  private catGraphics: Graphics | null;

  // Meeting room
  private meetingGraphics: Graphics | null;

  // Scale / fit
  private scaleVal: number;
  private offsetX: number;
  private offsetY: number;

  // Time overlay
  private timeOverlay: Graphics;

  // Stable desk label style
  private labelStyle: TextStyle;

  constructor(app: Application) {
    this.app = app;
    this.agentContainers = new Map();
    this.agentBodies = new Map();
    this.agentDecos = new Map();
    this.pizzaContainers = new Map();
    this.pizzaGraphics = new Map();
    this.catContainer = null;
    this.catGraphics = null;
    this.meetingContainer = null;
    this.meetingGraphics = null;
    this.deskStateCache = new Map();
    this.deskGraphicMap = new Map();
    this.scaleVal = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.labelStyle = new TextStyle({
      fontFamily: 'Nunito, sans-serif',
      fontSize: 9,
      fill: 0xF0E8D0,
      fontWeight: '700',
    });

    // Build layer hierarchy
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    this.floorLayer = new Container();
    this.officeLayer = new Container();
    this.deskLayer = new Container();
    this.agentLayer = new Container();
    this.particleLayer = new Graphics();
    this.exitLayer = new Container();
    this.pizzaLayer = new Container();
    this.coffeeContainer = new Container();

    this.worldContainer.addChild(this.floorLayer);
    this.worldContainer.addChild(this.officeLayer);
    this.worldContainer.addChild(this.deskLayer);
    this.worldContainer.addChild(this.coffeeContainer);
    this.worldContainer.addChild(this.exitLayer);
    this.worldContainer.addChild(this.pizzaLayer);
    this.worldContainer.addChild(this.agentLayer);
    this.worldContainer.addChild(this.particleLayer);

    this.timeOverlay = new Graphics();
    this.app.stage.addChild(this.timeOverlay);

    this.drawStaticFloor();
  }

  // ============================================================
  // Static floor (drawn once)
  // ============================================================
  private drawStaticFloor(): void {
    const floor = new Graphics();

    // Carpet background
    floor.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    floor.fill({ color: COLORS.CARPET });

    // Tile grid (subtle lines)
    const tileSize = 48;
    for (let x = 0; x <= WORLD_WIDTH; x += tileSize) {
      floor.moveTo(x, 0).lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += tileSize) {
      floor.moveTo(0, y).lineTo(WORLD_WIDTH, y);
    }
    floor.stroke({ width: 0.5, color: 0x7A9E84, alpha: 0.3 });

    // Walls
    floor.rect(0, 0, WORLD_WIDTH, 8).fill({ color: COLORS.WALL });
    floor.rect(0, WORLD_HEIGHT - 8, WORLD_WIDTH, 8).fill({ color: COLORS.WALL });
    floor.rect(0, 8, 8, WORLD_HEIGHT - 16).fill({ color: COLORS.WALL });
    floor.rect(WORLD_WIDTH - 8, 8, 8, WORLD_HEIGHT - 16).fill({ color: COLORS.WALL });

    // Window light glow strip (right wall)
    floor.rect(WORLD_WIDTH - 48, 8, 48, WORLD_HEIGHT - 16);
    floor.fill({ color: 0xFFF8E0, alpha: 0.1 });

    this.floorLayer.addChild(floor);
  }

  // ============================================================
  // Office furniture (desks, coffee, exits)
  // ============================================================
  drawOffice(world: World): void {
    // Only redraw desks when state changes (dirty checking)
    for (const desk of world.desks) {
      const stateKey = `${desk.broken ? 'B' : 'O'}_${desk.claimedBy ?? 'N'}`;
      const cached = this.deskStateCache.get(desk.id);
      if (cached === stateKey) continue; // No change
      this.deskStateCache.set(desk.id, stateKey);

      // Remove old graphic for this desk
      const oldG = this.deskGraphicMap.get(desk.id);
      if (oldG) { this.deskLayer.removeChild(oldG); oldG.destroy(); }

      const g = new Graphics();

      if (desk.broken) {
        g.rect(desk.x, desk.y, desk.width, desk.height).fill({ color: 0x442211 });
        g.rect(desk.x + 2, desk.y + 2, desk.width - 4, desk.height - 4).fill({ color: 0x331100 });
        // X mark
        g.moveTo(desk.x + 6, desk.y + 6).lineTo(desk.x + desk.width - 6, desk.y + desk.height - 6);
        g.moveTo(desk.x + desk.width - 6, desk.y + 6).lineTo(desk.x + 6, desk.y + desk.height - 6);
        g.stroke({ width: 2, color: 0xFF3B3B, alpha: 0.8 });
      } else {
        const topColor = desk.claimedBy !== null ? COLORS.DESK_TOP : COLORS.DESK;
        g.rect(desk.x, desk.y, desk.width, desk.height).fill({ color: topColor });
        g.rect(desk.x, desk.y + desk.height - 6, desk.width, 6).fill({ color: COLORS.DESK_DARK });
        // Monitor if claimed
        if (desk.claimedBy !== null) {
          g.rect(desk.x + 6, desk.y + 4, 20, 14).fill({ color: 0x808FAA });
          g.rect(desk.x + 8, desk.y + 6, 16, 10).fill({ color: 0xAAC8E0 });
        }
        // Paper
        g.rect(desk.x + desk.width - 16, desk.y + 4, 10, 12).fill({ color: COLORS.CHALK });
      }
      this.deskLayer.addChild(g);
      this.deskGraphicMap.set(desk.id, g);
    } // end desk loop
  

    // Coffee machine (static — only redrawn if needed)
    if (this.coffeeContainer.children.length === 0) {
      const cm = world.coffeeMachine;
      const g = new Graphics();
      g.rect(cm.x, cm.y, cm.width, cm.height).fill({ color: COLORS.COFFEE_MACH });
      g.rect(cm.x + 4, cm.y + 4, cm.width - 8, cm.height - 28).fill({ color: 0x5A8882 });
      g.circle(cm.x + cm.width / 2, cm.y + cm.height - 14, 9).fill({ color: 0x3A6866 });
      g.circle(cm.x + cm.width / 2, cm.y + cm.height - 14, 5).fill({ color: 0xC47030, alpha: 0.6 });
      this.coffeeContainer.addChild(g);

      const label = new Text({ text: 'COFFEE', style: this.labelStyle });
      label.x = cm.x + 2;
      label.y = cm.y + cm.height - 26;
      label.scale.set(0.8);
      this.coffeeContainer.addChild(label);
    }

    // Exits
    if (this.exitLayer.children.length === 0) {
      for (const exit of world.exits) {
        const exitContainer = new Container();
        const g = new Graphics();
        g.rect(exit.x - 22, exit.y - 32, 44, 64).fill({ color: COLORS.EXIT, alpha: 0.5 });
        g.rect(exit.x - 22, exit.y - 32, 44, 64).stroke({ width: 2, color: COLORS.EXIT });
        exitContainer.addChild(g);

        const label = new Text({
          text: 'EXIT',
          style: new TextStyle({ fontFamily: 'Nunito', fontSize: 10, fill: 0xFFFFFF, fontWeight: '700' }),
        });
        label.x = exit.x - 14;
        label.y = exit.y - 6;
        exitContainer.addChild(label);
        this.exitLayer.addChild(exitContainer);
      }
    }
  }

  // ============================================================
  // Dynamic elements
  // ============================================================
  updatePizzas(world: World): void {
    const activeIds = new Set(world.pizzas.map(p => p.id));

    // Remove stale
    for (const [id, c] of this.pizzaContainers) {
      if (!activeIds.has(id)) {
        c.destroy({ children: true });
        this.pizzaContainers.delete(id);
        this.pizzaGraphics.delete(id);
      }
    }

    // Update/create
    for (const pizza of world.pizzas) {
      let container = this.pizzaContainers.get(pizza.id);
      let g: Graphics;
      if (!container) {
        container = new Container();
        g = new Graphics();
        container.addChild(g);
        this.pizzaLayer.addChild(container);
        this.pizzaContainers.set(pizza.id, container);
        this.pizzaGraphics.set(pizza.id, g);
      } else {
        g = this.pizzaGraphics.get(pizza.id)!;
      }

      g.clear();
      const pulse = 1 + Math.sin(Date.now() / 300) * 0.08;
      const r = 18 * pulse;
      g.circle(pizza.x, pizza.y, r).fill({ color: 0xF8D040 });
      g.circle(pizza.x, pizza.y, r * 0.7).fill({ color: 0xE87050 });
      // Slices
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        g.moveTo(pizza.x, pizza.y);
        g.lineTo(pizza.x + Math.cos(angle) * r, pizza.y + Math.sin(angle) * r);
        g.stroke({ width: 1, color: 0xC47030 });
      }
    }
  }

  updateCat(world: World): void {
    if (!world.cat) {
      if (this.catContainer) {
        this.catContainer.destroy({ children: true });
        this.catContainer = null;
        this.catGraphics = null;
      }
      return;
    }

    if (!this.catContainer) {
      this.catContainer = new Container();
      this.catGraphics = new Graphics();
      this.catContainer.addChild(this.catGraphics);
      this.officeLayer.addChild(this.catContainer);
    }

    const cat = world.cat;
    const g = this.catGraphics!;
    g.clear();
    const tailSwing = Math.sin(Date.now() / 250) * 10;

    // Body
    g.ellipse(cat.x, cat.y, 14, 10).fill({ color: COLORS.PEACH_ORANGE });
    // Head
    g.circle(cat.x + 11, cat.y - 4, 8).fill({ color: COLORS.PEACH_ORANGE });
    // Ears
    g.poly([
      { x: cat.x + 7, y: cat.y - 10 },
      { x: cat.x + 11, y: cat.y - 18 },
      { x: cat.x + 16, y: cat.y - 10 },
    ]).fill({ color: COLORS.DUST_ROSE });
    // Eyes
    g.circle(cat.x + 8, cat.y - 5, 2).fill({ color: 0x2C1F1A });
    g.circle(cat.x + 14, cat.y - 5, 2).fill({ color: 0x2C1F1A });
    // Tail
    g.moveTo(cat.x - 14, cat.y);
    g.quadraticCurveTo(cat.x - 24, cat.y - 10 + tailSwing, cat.x - 20, cat.y + 12);
    g.stroke({ width: 3, color: COLORS.PEACH_ORANGE });
  }

  updateMeetingRoom(world: World): void {
    if (!world.meetingRoom) {
      if (this.meetingContainer) {
        this.meetingContainer.destroy({ children: true });
        this.meetingContainer = null;
        this.meetingGraphics = null;
      }
      return;
    }

    if (!this.meetingContainer) {
      this.meetingContainer = new Container();
      this.meetingGraphics = new Graphics();
      this.meetingContainer.addChild(this.meetingGraphics);

      const label = new Text({
        text: '📊 MEETING',
        style: new TextStyle({ fontFamily: 'Nunito', fontSize: 11, fill: 0xFFFFFF, fontWeight: '700' }),
      });
      label.x = world.meetingRoom.x + 6;
      label.y = world.meetingRoom.y + 6;
      this.meetingContainer.addChild(label);

      this.officeLayer.addChild(this.meetingContainer);
    }

    const mr = world.meetingRoom;
    const g = this.meetingGraphics!;
    g.clear();
    g.rect(mr.x, mr.y, mr.width, mr.height).fill({ color: COLORS.MEETING_ROOM, alpha: 0.25 });
    g.rect(mr.x, mr.y, mr.width, mr.height).stroke({ width: 2, color: COLORS.MEETING_ROOM });
    g.ellipse(mr.x + mr.width / 2, mr.y + mr.height / 2, mr.width * 0.35, mr.height * 0.3)
      .fill({ color: COLORS.DESK });
  }

  // ============================================================
  // Agent rendering
  // ============================================================
  syncAgents(agents: Agent[]): void {
    const activeIds = new Set(agents.map(a => a.id));

    // Remove stale
    for (const [id, c] of this.agentContainers) {
      if (!activeIds.has(id)) {
        c.destroy({ children: true });
        this.agentContainers.delete(id);
        this.agentBodies.delete(id);
        this.agentDecos.delete(id);
      }
    }

    // Create or update each agent
    for (const agent of agents) {
      if (agent.state === AgentState.ESCAPED) {
        // Keep container but invisible
        const c = this.agentContainers.get(agent.id);
        if (c) c.alpha = 0;
        continue;
      }

      if (!this.agentContainers.has(agent.id)) {
        const container = new Container();
        const body = new Graphics();
        const deco = new Graphics();
        container.addChild(body);
        container.addChild(deco);
        this.agentLayer.addChild(container);
        this.agentContainers.set(agent.id, container);
        this.agentBodies.set(agent.id, body);
        this.agentDecos.set(agent.id, deco);
      }

      this.updateAgentVisual(agent);
    }
  }

  private updateAgentVisual(agent: Agent): void {
    const container = this.agentContainers.get(agent.id)!;
    const body = this.agentBodies.get(agent.id)!;
    const deco = this.agentDecos.get(agent.id)!;

    container.x = agent.x;
    container.y = agent.y;
    container.alpha = agent.alpha;

    // Bob
    const bobY = Math.sin(agent.bobPhase) * 2;
    body.y = bobY;
    deco.y = bobY;

    // Color (gossip infection override)
    let color = agent.tint;
    if (agent.gossipColor && agent.type !== AgentType.GOSSIP) {
      color = hslToHex(
        agent.gossipColor.hue,
        agent.gossipColor.saturation,
        agent.gossipColor.lightness
      );
    }
    if (agent.flashTimer > 0) color = 0xFFFFFF;

    body.clear();
    deco.clear();

    // Glow ring (Grinder productivity aura)
    if (agent.glowAlpha > 0 && agent.type === AgentType.GRINDER) {
      body.circle(0, 0, AGENT_RADIUS + 10).fill({ color: COLORS.GRINDER, alpha: agent.glowAlpha * 0.4 });
    }

    // Body circle
    body.circle(0, 0, AGENT_RADIUS).fill({ color });
    body.circle(0, 0, AGENT_RADIUS).stroke({ width: 1.5, color: 0x2C1F1A, alpha: 0.5 });

    // Type decoration
    this.drawTypeDecoration(agent, deco);

    // State indicator dot
    this.drawStateDot(agent, deco);
  }

  private drawTypeDecoration(agent: Agent, deco: Graphics): void {
    switch (agent.type) {
      case AgentType.GRINDER: {
        // Paper (when seated)
        if (agent.state === AgentState.SEATED) {
          deco.rect(-5, -4, 10, 9).fill({ color: 0xF0E8D0 });
          deco.moveTo(-3, -2).lineTo(3, -2);
          deco.moveTo(-3, 0).lineTo(3, 0);
          deco.moveTo(-3, 2).lineTo(3, 2);
          deco.stroke({ width: 0.5, color: 0x808080 });
        }
        break;
      }
      case AgentType.WANDERER: {
        // Coffee cup wobble
        const coffeeBob = agent.state === AgentState.AT_COFFEE
          ? Math.sin(agent.animPhase * 3) * 2
          : 0;
        deco.rect(AGENT_RADIUS - 3, -7 + coffeeBob, 7, 6).fill({ color: 0x5C3D2E });
        deco.rect(AGENT_RADIUS - 2, -7 + coffeeBob, 5, 2).fill({ color: 0xE8C060 });
        break;
      }
      case AgentType.GOSSIP: {
        // Animated talk bubble
        const talking = Math.sin(agent.animPhase * 4) > 0;
        deco.ellipse(AGENT_RADIUS * 0.7, -AGENT_RADIUS * 0.9, 7, 5).fill({ color: 0xFFFFFF, alpha: 0.8 });
        if (talking) {
          deco.poly([
            { x: AGENT_RADIUS * 0.3, y: -AGENT_RADIUS * 0.5 },
            { x: AGENT_RADIUS * 0.5, y: -AGENT_RADIUS * 0.6 },
            { x: AGENT_RADIUS * 0.4, y: -AGENT_RADIUS * 0.4 },
          ]).fill({ color: 0xFFFFFF, alpha: 0.6 });
        }
        break;
      }
      case AgentType.MANAGER: {
        // Tie
        deco.poly([
          { x: -2, y: -AGENT_RADIUS + 5 },
          { x: 2, y: -AGENT_RADIUS + 5 },
          { x: 3, y: 1 },
          { x: 0, y: 5 },
          { x: -3, y: 1 },
        ]).fill({ color: 0x6030A0 });
        deco.rect(-3, -AGENT_RADIUS + 3, 6, 3).fill({ color: 0x8050C0 });
        break;
      }
      case AgentType.INTERN: {
        // Small inner circle (lost/following)
        deco.circle(0, 0, AGENT_RADIUS * 0.35).fill({ color: 0xFFFFFF, alpha: 0.35 });
        break;
      }
      case AgentType.CHAOS_AGENT: {
        // Energy lightning bolts
        const jit = agent.state === AgentState.CHAOS_SPRINT ? Math.random() * 4 - 2 : 0;
        deco.moveTo(-7 + jit, -3).lineTo(-2, 1).lineTo(-5, 1 + jit).lineTo(0, 5);
        deco.moveTo(3, -3 + jit).lineTo(7, 0).lineTo(4, 0).lineTo(8, 4 + jit);
        deco.stroke({ width: 1.5, color: 0xFFFF00, alpha: 0.9 });
        break;
      }
      case AgentType.OBSERVER: {
        // Eye
        deco.ellipse(0, 0, AGENT_RADIUS * 0.7, AGENT_RADIUS * 0.35).fill({ color: 0xE0E0E0, alpha: 0.5 });
        deco.circle(0, 0, AGENT_RADIUS * 0.2).fill({ color: 0x666666 });
        // Notebook notes
        if (agent.noteAlpha > 0) {
          deco.rect(AGENT_RADIUS + 2, -8, 10, 12).fill({ color: 0xF0E8D0, alpha: agent.noteAlpha });
          deco.moveTo(AGENT_RADIUS + 4, -5).lineTo(AGENT_RADIUS + 10, -5);
          deco.moveTo(AGENT_RADIUS + 4, -2).lineTo(AGENT_RADIUS + 10, -2);
          deco.moveTo(AGENT_RADIUS + 4, 1).lineTo(AGENT_RADIUS + 10, 1);
          deco.stroke({ width: 0.5, color: 0x888888, alpha: agent.noteAlpha });
        }
        break;
      }
    }
  }

  private drawStateDot(agent: Agent, deco: Graphics): void {
    let color = -1;
    switch (agent.state) {
      case AgentState.EATING:          color = 0xF8D040; break;
      case AgentState.AT_COFFEE:       color = 0x5C3D2E; break;
      case AgentState.IN_HUDDLE:       color = 0xE24A6A; break;
      case AgentState.PANICKING:       color = 0xFF3B3B; break;
      case AgentState.IN_MEETING:      color = 0x46A45F; break;
      case AgentState.CHAOS_FREEZE:    color = 0xAAAAFF; break;
      case AgentState.CHAOS_SPRINT:    color = 0xFF8800; break;
    }
    if (color >= 0) {
      deco.circle(AGENT_RADIUS * 0.7, -AGENT_RADIUS * 0.7, 3).fill({ color });
    }
  }

  // ============================================================
  // Particles
  // ============================================================
  drawParticles(world: World): void {
    this.particleLayer.clear();
    for (const p of world.particles.active) {
      this.particleLayer.circle(p.x, p.y, p.size).fill({ color: p.color, alpha: p.alpha });
    }
  }

  // ============================================================
  // Time of day overlay
  // ============================================================
  updateTimeOverlay(): void {
    const h = new Date().getHours();
    let oc = 0, oa = 0;
    if (h < 8 || h >= 22)       { oc = 0x1A1A2E; oa = 0.18; }
    else if (h < 12)             { oc = 0xE8F0F8; oa = 0.05; }
    else if (h >= 17 && h < 20)  { oc = 0xFFE4A0; oa = 0.10; }

    this.timeOverlay.clear();
    if (oa > 0) {
      this.timeOverlay.rect(0, 0, this.app.renderer.width, this.app.renderer.height)
        .fill({ color: oc, alpha: oa });
    }
  }

  // ============================================================
  // Layout
  // ============================================================
  resize(containerWidth: number, containerHeight: number): void {
    const scaleX = containerWidth / WORLD_WIDTH;
    const scaleY = containerHeight / WORLD_HEIGHT;
    this.scaleVal = Math.min(scaleX, scaleY);
    this.offsetX = (containerWidth - WORLD_WIDTH * this.scaleVal) / 2;
    this.offsetY = (containerHeight - WORLD_HEIGHT * this.scaleVal) / 2;
    this.worldContainer.scale.set(this.scaleVal);
    this.worldContainer.x = this.offsetX;
    this.worldContainer.y = this.offsetY;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.scaleVal,
      y: (screenY - this.offsetY) / this.scaleVal,
    };
  }

  // ============================================================
  // Full render frame
  // ============================================================
  render(world: World): void {
    this.drawOffice(world);
    this.updatePizzas(world);
    this.updateCat(world);
    this.updateMeetingRoom(world);
    this.syncAgents(world.agents);
    this.drawParticles(world);
    this.updateTimeOverlay();
  }
}

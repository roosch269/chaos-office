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
  private propsLayer: Container;
  private officeLayer: Container;
  private agentLayer: Container;
  private particleLayer: Graphics;

  // Agent display objects
  private agentContainers: Map<number, Container>;
  private agentBodies: Map<number, Graphics>;
  private agentDecos: Map<number, Graphics>;
  private agentLabels: Map<number, Text>;

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

  // Pizza graphics
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

  // Label style (shared)
  private labelStyle: TextStyle;
  private agentNameStyle: TextStyle;

  // Coffee machine broken state tracking
  private coffeeBrokenCache: boolean | null = null;

  // Props drawn flag
  private propsDrawn = false;

  constructor(app: Application) {
    this.app = app;
    this.agentContainers = new Map();
    this.agentBodies = new Map();
    this.agentDecos = new Map();
    this.agentLabels = new Map();
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

    this.agentNameStyle = new TextStyle({
      fontFamily: 'VT323, monospace',
      fontSize: 11,
      fill: 0xF0E8D0,
      fontWeight: '400',
    });

    // Build layer hierarchy
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    this.floorLayer = new Container();
    this.propsLayer = new Container();
    this.officeLayer = new Container();
    this.deskLayer = new Container();
    this.agentLayer = new Container();
    this.particleLayer = new Graphics();
    this.exitLayer = new Container();
    this.pizzaLayer = new Container();
    this.coffeeContainer = new Container();

    this.worldContainer.addChild(this.floorLayer);
    this.worldContainer.addChild(this.propsLayer);
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
  // Static floor (drawn once, warm cream style)
  // ============================================================
  private drawStaticFloor(): void {
    const floor = new Graphics();

    // Warm cream carpet
    floor.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    floor.fill({ color: 0xF5ECD7 });

    // Very subtle tile grid lines
    const tileSize = 48;
    for (let x = 0; x <= WORLD_WIDTH; x += tileSize) {
      floor.moveTo(x, 0).lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += tileSize) {
      floor.moveTo(0, y).lineTo(WORLD_WIDTH, y);
    }
    floor.stroke({ width: 0.5, color: 0xE8DCC6, alpha: 0.2 });

    // Walls
    floor.rect(0, 0, WORLD_WIDTH, 8).fill({ color: COLORS.WALL });
    floor.rect(0, WORLD_HEIGHT - 8, WORLD_WIDTH, 8).fill({ color: COLORS.WALL });
    floor.rect(0, 8, 8, WORLD_HEIGHT - 16).fill({ color: COLORS.WALL });
    floor.rect(WORLD_WIDTH - 8, 8, 8, WORLD_HEIGHT - 16).fill({ color: COLORS.WALL });

    // Window light glow strip (right wall)
    floor.rect(WORLD_WIDTH - 60, 8, 60, WORLD_HEIGHT - 16);
    floor.fill({ color: 0xFFF8E0, alpha: 0.08 });

    this.floorLayer.addChild(floor);
  }

  // ============================================================
  // Props: plants, water cooler, printer (drawn once)
  // ============================================================
  private drawProps(world: World): void {
    const g = new Graphics();
    const cm = world.coffeeMachine;

    // ── Potted plants ─────────────────────────────────────
    const plants = [
      { x: 40, y: 200 },
      { x: 40, y: 650 },
      { x: WORLD_WIDTH - 55, y: 220 },
    ];

    for (const { x, y } of plants) {
      // Pot (trapezoid approximation with rect)
      g.rect(x - 8, y - 4, 16, 14).fill({ color: COLORS.PLANT_POT });
      g.rect(x - 10, y + 8, 20, 5).fill({ color: COLORS.PLANT_POT });
      // Leaves
      g.circle(x, y - 14, 11).fill({ color: COLORS.PLANT_LEAF });
      g.circle(x - 8, y - 10, 8).fill({ color: 0x2A9A4F });
      g.circle(x + 8, y - 10, 8).fill({ color: 0x2A9A4F });
      g.circle(x, y - 22, 7).fill({ color: 0x46C464 });
      // Pot rim highlight
      g.rect(x - 8, y - 4, 16, 2).fill({ color: 0xE8A060, alpha: 0.5 });
    }

    // ── Water Cooler (near coffee machine) ─────────────────
    const wcX = cm.x + cm.width + 30;
    const wcY = cm.y + 5;

    // Stand/base
    g.rect(wcX - 10, wcY + 40, 20, 8).fill({ color: 0x7888AA });
    // Body
    g.rect(wcX - 13, wcY + 10, 26, 32).fill({ color: COLORS.WATER_COOLER });
    // Water bottle (top)
    g.rect(wcX - 9, wcY - 14, 18, 26).fill({ color: 0xCCEEFF, alpha: 0.85 });
    g.rect(wcX - 6, wcY - 20, 12, 8).fill({ color: 0xAADDFF, alpha: 0.9 });
    // Water level (inside bottle)
    g.rect(wcX - 7, wcY - 8, 14, 12).fill({ color: 0x80CCEE, alpha: 0.6 });
    // Tap/spigot
    g.circle(wcX - 8, wcY + 32, 4).fill({ color: 0x336699 });
    g.circle(wcX + 8, wcY + 32, 4).fill({ color: 0x993333 });
    // Label
    g.rect(wcX - 10, wcY + 15, 20, 10).fill({ color: 0xFFFFFF, alpha: 0.2 });

    const wcLabel = new Text({ text: 'H₂O', style: this.labelStyle });
    wcLabel.x = wcX - 10;
    wcLabel.y = wcY + 48;
    wcLabel.scale.set(0.7);
    this.propsLayer.addChild(wcLabel);

    // ── Printer (top-right corner) ─────────────────────────
    const prX = WORLD_WIDTH - 100;
    const prY = 30;

    // Main body
    g.rect(prX - 28, prY, 56, 28).fill({ color: COLORS.PRINTER });
    // Top paper feeder
    g.rect(prX - 22, prY - 10, 44, 12).fill({ color: 0x99AABB });
    // Output tray
    g.rect(prX - 24, prY + 26, 48, 6).fill({ color: 0xBBCCDD });
    // Control panel
    g.rect(prX + 10, prY + 5, 14, 14).fill({ color: 0x667788 });
    g.circle(prX + 15, prY + 10, 3).fill({ color: 0x44BB44 });
    g.circle(prX + 22, prY + 10, 3).fill({ color: 0xBB4444 });
    // Paper in feeder
    g.rect(prX - 16, prY - 8, 30, 4).fill({ color: 0xF0EDE0 });
    // Ventilation slots
    g.rect(prX - 24, prY + 18, 6, 2).fill({ color: 0x667788 });
    g.rect(prX - 24, prY + 22, 6, 2).fill({ color: 0x667788 });

    const prLabel = new Text({ text: 'PRINTER', style: this.labelStyle });
    prLabel.x = prX - 24;
    prLabel.y = prY + 34;
    prLabel.scale.set(0.7);
    this.propsLayer.addChild(prLabel);

    this.propsLayer.addChild(g);
  }

  // ============================================================
  // Office furniture (desks, coffee, exits)
  // ============================================================
  drawOffice(world: World): void {
    // Draw props once
    if (!this.propsDrawn) {
      this.propsDrawn = true;
      this.drawProps(world);
    }

    // Desks (dirty-checking per desk)
    for (const desk of world.desks) {
      const stateKey = `${desk.broken ? 'B' : 'O'}_${desk.claimedBy ?? 'N'}`;
      if (this.deskStateCache.get(desk.id) === stateKey) continue;
      this.deskStateCache.set(desk.id, stateKey);

      const oldG = this.deskGraphicMap.get(desk.id);
      if (oldG) { this.deskLayer.removeChild(oldG); oldG.destroy(); }

      const g = new Graphics();

      if (desk.broken) {
        g.rect(desk.x, desk.y, desk.width, desk.height).fill({ color: 0x442211 });
        g.rect(desk.x + 2, desk.y + 2, desk.width - 4, desk.height - 4).fill({ color: 0x331100 });
        g.moveTo(desk.x + 6, desk.y + 6).lineTo(desk.x + desk.width - 6, desk.y + desk.height - 6);
        g.moveTo(desk.x + desk.width - 6, desk.y + 6).lineTo(desk.x + 6, desk.y + desk.height - 6);
        g.stroke({ width: 2, color: 0xFF3B3B, alpha: 0.8 });
      } else {
        const topColor = desk.claimedBy !== null ? COLORS.DESK_TOP : COLORS.DESK;
        g.rect(desk.x, desk.y, desk.width, desk.height).fill({ color: topColor });
        g.rect(desk.x, desk.y + desk.height - 6, desk.width, 6).fill({ color: COLORS.DESK_DARK });
        if (desk.claimedBy !== null) {
          // Laptop/monitor
          g.rect(desk.x + 5, desk.y + 4, 22, 15).fill({ color: 0x808FAA });
          g.rect(desk.x + 7, desk.y + 6, 18, 11).fill({ color: 0xAAC8E0 });
          // Screen glow lines
          g.moveTo(desk.x + 8, desk.y + 9).lineTo(desk.x + 24, desk.y + 9);
          g.moveTo(desk.x + 8, desk.y + 11).lineTo(desk.x + 20, desk.y + 11);
          g.moveTo(desk.x + 8, desk.y + 13).lineTo(desk.x + 22, desk.y + 13);
          g.stroke({ width: 0.5, color: 0x66AACC, alpha: 0.7 });
        }
        // Paper
        g.rect(desk.x + desk.width - 14, desk.y + 4, 9, 11).fill({ color: COLORS.CHALK });
      }
      this.deskLayer.addChild(g);
      this.deskGraphicMap.set(desk.id, g);
    }

    // Coffee machine (redrawn if broken state changes)
    if (this.coffeeBrokenCache !== world.coffeeBroken) {
      this.coffeeBrokenCache = world.coffeeBroken;
      const oldChildren = [...this.coffeeContainer.children];
      oldChildren.forEach(c => { this.coffeeContainer.removeChild(c); c.destroy(); });

      const cm = world.coffeeMachine;
      const g = new Graphics();

      if (world.coffeeBroken) {
        // Broken coffee machine
        g.rect(cm.x, cm.y, cm.width, cm.height).fill({ color: COLORS.COFFEE_MACH });
        g.rect(cm.x + 4, cm.y + 4, cm.width - 8, cm.height - 28).fill({ color: 0x446664 });
        // X on screen
        g.moveTo(cm.x + 8, cm.y + 8).lineTo(cm.x + cm.width - 8, cm.y + 28);
        g.moveTo(cm.x + cm.width - 8, cm.y + 8).lineTo(cm.x + 8, cm.y + 28);
        g.stroke({ width: 2, color: 0xFF4444 });
        // Steam/spill drops
        g.circle(cm.x + 10, cm.y + cm.height - 5, 5).fill({ color: 0x5C3D2E, alpha: 0.7 });
        g.circle(cm.x + cm.width - 10, cm.y + cm.height - 8, 4).fill({ color: 0x5C3D2E, alpha: 0.6 });
      } else {
        // Normal coffee machine
        g.rect(cm.x, cm.y, cm.width, cm.height).fill({ color: COLORS.COFFEE_MACH });
        g.rect(cm.x + 4, cm.y + 4, cm.width - 8, cm.height - 28).fill({ color: 0x5A8882 });
        // Screen
        g.rect(cm.x + 6, cm.y + 6, cm.width - 12, 16).fill({ color: 0x3A6866 });
        // Buttons
        g.circle(cm.x + 10, cm.y + cm.height - 22, 4).fill({ color: 0x46C464 });
        g.circle(cm.x + cm.width / 2, cm.y + cm.height - 22, 4).fill({ color: 0xF6D937 });
        g.circle(cm.x + cm.width - 10, cm.y + cm.height - 22, 4).fill({ color: 0xEF6361 });
        // Cup area
        g.circle(cm.x + cm.width / 2, cm.y + cm.height - 10, 7).fill({ color: 0x3A6866 });
        g.circle(cm.x + cm.width / 2, cm.y + cm.height - 10, 4).fill({ color: 0xC47030, alpha: 0.6 });
        // Steam lines
        g.moveTo(cm.x + cm.width / 2 - 4, cm.y + cm.height - 18)
          .lineTo(cm.x + cm.width / 2 - 6, cm.y + cm.height - 26);
        g.moveTo(cm.x + cm.width / 2 + 4, cm.y + cm.height - 18)
          .lineTo(cm.x + cm.width / 2 + 6, cm.y + cm.height - 26);
        g.stroke({ width: 1, color: 0xCCEEEE, alpha: 0.5 });
      }
      this.coffeeContainer.addChild(g);

      const label = new Text({
        text: world.coffeeBroken ? '☕ OUT' : '☕ COFFEE',
        style: this.labelStyle,
      });
      label.x = cm.x + 1;
      label.y = cm.y + cm.height - 28;
      label.scale.set(0.8);
      this.coffeeContainer.addChild(label);
    }

    // Exits (drawn once)
    if (this.exitLayer.children.length === 0) {
      for (const exit of world.exits) {
        const exitContainer = new Container();
        const g = new Graphics();
        g.rect(exit.x - 22, exit.y - 32, 44, 64).fill({ color: COLORS.EXIT, alpha: 0.4 });
        g.rect(exit.x - 22, exit.y - 32, 44, 64).stroke({ width: 2, color: COLORS.EXIT });
        // Door shape inside
        g.rect(exit.x - 12, exit.y - 22, 24, 48).fill({ color: 0x2A6040, alpha: 0.3 });
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

    for (const [id, c] of this.pizzaContainers) {
      if (!activeIds.has(id)) {
        c.destroy({ children: true });
        this.pizzaContainers.delete(id);
        this.pizzaGraphics.delete(id);
      }
    }

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
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        g.moveTo(pizza.x, pizza.y);
        g.lineTo(pizza.x + Math.cos(angle) * r, pizza.y + Math.sin(angle) * r);
        g.stroke({ width: 1, color: 0xC47030 });
      }
      // Toppings
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const tr = r * 0.5;
        g.circle(pizza.x + Math.cos(a) * tr, pizza.y + Math.sin(a) * tr, 2.5).fill({ color: 0xCC2222 });
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

    g.ellipse(cat.x, cat.y, 14, 10).fill({ color: COLORS.PEACH_ORANGE });
    g.circle(cat.x + 11, cat.y - 4, 8).fill({ color: COLORS.PEACH_ORANGE });
    g.poly([
      { x: cat.x + 7, y: cat.y - 10 },
      { x: cat.x + 11, y: cat.y - 18 },
      { x: cat.x + 16, y: cat.y - 10 },
    ]).fill({ color: COLORS.DUST_ROSE });
    g.circle(cat.x + 8, cat.y - 5, 2).fill({ color: 0x2C1F1A });
    g.circle(cat.x + 14, cat.y - 5, 2).fill({ color: 0x2C1F1A });
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
    g.rect(mr.x, mr.y, mr.width, mr.height).fill({ color: COLORS.MEETING_ROOM, alpha: 0.2 });
    g.rect(mr.x, mr.y, mr.width, mr.height).stroke({ width: 2, color: COLORS.MEETING_ROOM });
    g.ellipse(mr.x + mr.width / 2, mr.y + mr.height / 2, mr.width * 0.35, mr.height * 0.3)
      .fill({ color: COLORS.DESK });
  }

  // ============================================================
  // Agent rendering — pixel art characters
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
        this.agentLabels.delete(id);
      }
    }

    // Create or update each agent
    for (const agent of agents) {
      if (agent.state === AgentState.ESCAPED) {
        const c = this.agentContainers.get(agent.id);
        if (c) c.alpha = 0;
        continue;
      }

      if (!this.agentContainers.has(agent.id)) {
        const container = new Container();
        const body = new Graphics();
        const deco = new Graphics();

        // Name label (created once, text is static)
        const nameLabel = new Text({
          text: agent.name,
          style: this.agentNameStyle,
        });
        nameLabel.anchor.set(0.5, 0);
        nameLabel.x = 0;
        nameLabel.y = 12;
        nameLabel.alpha = 0.85;

        container.addChild(body);
        container.addChild(deco);
        container.addChild(nameLabel);
        this.agentLayer.addChild(container);
        this.agentContainers.set(agent.id, container);
        this.agentBodies.set(agent.id, body);
        this.agentDecos.set(agent.id, deco);
        this.agentLabels.set(agent.id, nameLabel);
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

    // Observer: semi-transparent
    const baseAlpha = agent.type === AgentType.OBSERVER ? agent.alpha * 0.75 : agent.alpha;
    container.alpha = baseAlpha;

    // Bob animation
    const bobY = Math.sin(agent.bobPhase) * 2;
    body.y = bobY;
    deco.y = bobY;

    // Body color (gossip infection override)
    let bodyColor = agent.tint;
    if (agent.gossipColor && agent.type !== AgentType.GOSSIP) {
      bodyColor = hslToHex(agent.gossipColor.hue, agent.gossipColor.saturation, agent.gossipColor.lightness);
    }
    if (agent.flashTimer > 0) bodyColor = 0xFFFFFF;

    body.clear();
    deco.clear();

    // Per-type sizing
    const isManager = agent.type === AgentType.MANAGER;
    const isIntern = agent.type === AgentType.INTERN;
    const isObserver = agent.type === AgentType.OBSERVER;

    const headR = isIntern ? 6 : isManager ? 8 : 7;
    const bodyW = isIntern ? 12 : isManager ? 15 : 14;
    const bodyH = isManager ? 14 : isIntern ? 9 : 11;
    const headY = isManager ? -10 : -9;

    // Glow aura (Grinder when seated)
    if (agent.glowAlpha > 0 && agent.type === AgentType.GRINDER) {
      body.circle(0, headY + headR * 0.5, AGENT_RADIUS + 14).fill({
        color: COLORS.GRINDER,
        alpha: agent.glowAlpha * 0.3,
      });
    }

    // Power nap dimming
    if (agent.state === AgentState.POWER_NAP) {
      body.circle(0, 0, AGENT_RADIUS + 4).fill({ color: 0x8888BB, alpha: 0.15 });
    }

    // Body rectangle (torso)
    const finalBodyColor = agent.flashTimer > 0 ? 0xFFFFFF : bodyColor;
    body.rect(-bodyW / 2, -3, bodyW, bodyH).fill({ color: finalBodyColor });

    // Body outline
    body.rect(-bodyW / 2, -3, bodyW, bodyH).stroke({
      width: 1,
      color: 0x2C1F1A,
      alpha: 0.4,
    });

    // Head
    const skinColor = agent.flashTimer > 0 ? 0xFFFFFF : 0xFFDDB5;
    body.circle(0, headY, headR).fill({ color: skinColor });
    body.circle(0, headY, headR).stroke({ width: 1, color: 0x2C1F1A, alpha: 0.3 });

    // Eyes
    const eyeR = isIntern ? 2.2 : 1.6;
    const eyeOffX = isIntern ? 2.5 : 2;
    const eyeOffY = headY - 1.5;
    body.circle(-eyeOffX, eyeOffY, eyeR).fill({ color: 0x2C1F1A });
    body.circle(eyeOffX, eyeOffY, eyeR).fill({ color: 0x2C1F1A });

    // Eye shine
    body.circle(-eyeOffX + 0.8, eyeOffY - 0.8, 0.7).fill({ color: 0xFFFFFF, alpha: 0.7 });
    body.circle(eyeOffX + 0.8, eyeOffY - 0.8, 0.7).fill({ color: 0xFFFFFF, alpha: 0.7 });

    // Type-specific body details
    this.drawTypeDecoration(agent, deco, bodyW, bodyH, headR, headY);

    // State indicator dot (top-right)
    this.drawStateDot(agent, deco, headR);
  }

  private drawTypeDecoration(
    agent: Agent,
    deco: Graphics,
    bodyW: number,
    bodyH: number,
    headR: number,
    headY: number
  ): void {
    switch (agent.type) {
      case AgentType.GRINDER: {
        if (agent.state === AgentState.SEATED) {
          // Tiny laptop on the desk below
          deco.rect(-6, bodyH - 3, 12, 7).fill({ color: 0x808FAA });
          deco.rect(-5, bodyH - 2, 10, 5).fill({ color: 0xAAC8E0 });
          // Screen glow lines
          deco.moveTo(-4, bodyH).lineTo(4, bodyH);
          deco.moveTo(-4, bodyH + 2).lineTo(3, bodyH + 2);
          deco.stroke({ width: 0.5, color: 0x66AACC, alpha: 0.8 });
        }
        break;
      }
      case AgentType.WANDERER: {
        // Coffee cup
        const coffeeBob = agent.state === AgentState.AT_COFFEE
          ? Math.sin(agent.animPhase * 3) * 1.5
          : 0;
        const cx = bodyW / 2 + 1;
        deco.rect(cx, -6 + coffeeBob, 6, 7).fill({ color: 0x5C3D2E });
        deco.rect(cx, -6 + coffeeBob, 6, 2).fill({ color: 0xE8C060 }); // coffee top
        // Handle
        deco.moveTo(cx + 6, -5 + coffeeBob).lineTo(cx + 9, -4 + coffeeBob);
        deco.moveTo(cx + 9, -4 + coffeeBob).lineTo(cx + 6, -2 + coffeeBob);
        deco.stroke({ width: 1, color: 0x5C3D2E });
        break;
      }
      case AgentType.GOSSIP: {
        // Permanent speech bubble (top right of head)
        const bx = headR * 0.6;
        const by = headY - headR * 0.7;
        deco.ellipse(bx + 6, by, 8, 6).fill({ color: 0xFFFFFF, alpha: 0.8 });
        // Talking dots
        const talking = Math.sin(agent.animPhase * 4) > 0;
        deco.circle(bx + 3, by, 1.2).fill({ color: 0x888888 });
        deco.circle(bx + 6, by, 1.2).fill({ color: 0x888888 });
        deco.circle(bx + 9, by, 1.2).fill({ color: 0x888888 });
        if (talking) {
          deco.poly([
            { x: bx + 2, y: by + 4 },
            { x: bx + 5, y: by + 8 },
            { x: bx + 8, y: by + 4 },
          ]).fill({ color: 0xFFFFFF, alpha: 0.7 });
        }
        break;
      }
      case AgentType.MANAGER: {
        // Tie
        deco.poly([
          { x: -2, y: -2 },
          { x: 2, y: -2 },
          { x: 3, y: 4 },
          { x: 0, y: 8 },
          { x: -3, y: 4 },
        ]).fill({ color: 0x6030A0 });
        // Tie knot
        deco.rect(-3, -4, 6, 4).fill({ color: 0x8050C0 });
        // Collar
        deco.poly([
          { x: -bodyW / 2 + 2, y: -3 },
          { x: 0, y: 0 },
          { x: -bodyW / 2 + 2, y: 2 },
        ]).fill({ color: 0xFFFFFF, alpha: 0.3 });
        deco.poly([
          { x: bodyW / 2 - 2, y: -3 },
          { x: 0, y: 0 },
          { x: bodyW / 2 - 2, y: 2 },
        ]).fill({ color: 0xFFFFFF, alpha: 0.3 });
        break;
      }
      case AgentType.INTERN: {
        // Nervous sweat drop
        const sweat = Math.sin(agent.animPhase * 2) > 0.5;
        if (sweat) {
          deco.circle(headR - 1, headY - headR + 2, 2).fill({ color: 0x88CCEE, alpha: 0.7 });
        }
        // Small inner body icon
        deco.circle(0, bodyH / 2 - 2, bodyW * 0.2).fill({ color: 0xFFFFFF, alpha: 0.2 });
        break;
      }
      case AgentType.CHAOS_AGENT: {
        // Energy lightning bolts
        const jit = agent.state === AgentState.CHAOS_SPRINT ? Math.random() * 4 - 2 : 0;
        deco.moveTo(-8 + jit, -4).lineTo(-3, 0).lineTo(-6, 0 + jit).lineTo(-1, 6);
        deco.moveTo(4, -4 + jit).lineTo(8, 0).lineTo(5, 0).lineTo(9, 5 + jit);
        deco.stroke({ width: 1.5, color: 0xFFFF00, alpha: 0.95 });
        break;
      }
      case AgentType.OBSERVER: {
        // Eye symbol on body
        deco.ellipse(0, bodyH * 0.3, bodyW * 0.4, bodyH * 0.2).fill({ color: 0xE0E0E0, alpha: 0.4 });
        deco.circle(0, bodyH * 0.3, bodyW * 0.12).fill({ color: 0x888888, alpha: 0.7 });
        // Notepad (when active)
        if (agent.noteAlpha > 0) {
          const nx = bodyW / 2 + 3;
          deco.rect(nx, -8, 10, 13).fill({ color: 0xF0E8D0, alpha: agent.noteAlpha });
          deco.moveTo(nx + 2, -5).lineTo(nx + 8, -5);
          deco.moveTo(nx + 2, -2).lineTo(nx + 8, -2);
          deco.moveTo(nx + 2, 1).lineTo(nx + 7, 1);
          deco.moveTo(nx + 2, 4).lineTo(nx + 8, 4);
          deco.stroke({ width: 0.5, color: 0x888888, alpha: agent.noteAlpha });
        }
        break;
      }
    }
  }

  private drawStateDot(agent: Agent, deco: Graphics, headR: number): void {
    let color = -1;
    switch (agent.state) {
      case AgentState.EATING:        color = 0xF8D040; break;
      case AgentState.AT_COFFEE:     color = 0x5C3D2E; break;
      case AgentState.IN_HUDDLE:     color = 0xE24A6A; break;
      case AgentState.PANICKING:     color = 0xFF3B3B; break;
      case AgentState.IN_MEETING:    color = 0x46A45F; break;
      case AgentState.CHAOS_FREEZE:  color = 0xAAAAFF; break;
      case AgentState.CHAOS_SPRINT:  color = 0xFF8800; break;
      case AgentState.POWER_NAP:     color = 0x8888FF; break;
      case AgentState.READING_PHONE: color = 0x5AADE8; break;
    }
    if (color >= 0) {
      deco.circle(headR * 0.7, -headR * 1.1, 3).fill({ color });
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

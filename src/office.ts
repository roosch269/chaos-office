// ============================================================
// CHAOS OFFICE — Office Layout
// ============================================================

import { Desk, CoffeeMachine, Exit } from './types.js';
import {
  WORLD_WIDTH, WORLD_HEIGHT,
  DESK_COLS, DESK_ROWS, DESK_WIDTH, DESK_HEIGHT, DESK_GAP_X, DESK_GAP_Y,
} from './constants.js';

let _nextDeskId = 0;

export function createOfficeLayout(): {
  desks: Desk[];
  coffeeMachine: CoffeeMachine;
  exits: Exit[];
} {
  const desks = createDesks();
  const coffeeMachine = createCoffeeMachine();
  const exits = createExits();
  return { desks, coffeeMachine, exits };
}

function createDesks(): Desk[] {
  const desks: Desk[] = [];
  const totalW = DESK_COLS * DESK_WIDTH + (DESK_COLS - 1) * (DESK_GAP_X - DESK_WIDTH);
  const totalH = DESK_ROWS * DESK_HEIGHT + (DESK_ROWS - 1) * (DESK_GAP_Y - DESK_HEIGHT);
  // Center the desk grid in the canvas
  const startX = (WORLD_WIDTH - totalW) / 2 + 40;
  const startY = (WORLD_HEIGHT - totalH) / 2 + 20;

  for (let row = 0; row < DESK_ROWS; row++) {
    for (let col = 0; col < DESK_COLS; col++) {
      desks.push({
        id: _nextDeskId++,
        x: startX + col * DESK_GAP_X,
        y: startY + row * DESK_GAP_Y,
        width: DESK_WIDTH,
        height: DESK_HEIGHT,
        claimedBy: null,
        broken: false,
      });
    }
  }
  return desks;
}

function createCoffeeMachine(): CoffeeMachine {
  return {
    x: 60,
    y: 60,
    width: 50,
    height: 60,
  };
}

function createExits(): Exit[] {
  return [
    { x: 20, y: WORLD_HEIGHT / 2 },           // left exit
    { x: WORLD_WIDTH - 20, y: WORLD_HEIGHT / 2 }, // right exit
  ];
}

/** Check if a point is inside a desk's expanded bounding box */
export function isInsideDesk(x: number, y: number, desk: Desk, margin = 4): boolean {
  return (
    x >= desk.x - margin &&
    x <= desk.x + desk.width + margin &&
    y >= desk.y - margin &&
    y <= desk.y + desk.height + margin
  );
}

/** Find all desks that a circle (agent) overlaps */
export function getCollidingDesks(x: number, y: number, radius: number, desks: Desk[]): Desk[] {
  const result: Desk[] = [];
  for (const desk of desks) {
    if (desk.broken) continue;
    const nearX = Math.max(desk.x, Math.min(x, desk.x + desk.width));
    const nearY = Math.max(desk.y, Math.min(y, desk.y + desk.height));
    const dx = x - nearX;
    const dy = y - nearY;
    if (dx * dx + dy * dy < radius * radius) {
      result.push(desk);
    }
  }
  return result;
}

/** Clamp position inside world bounds */
export function clampToWorld(x: number, y: number, margin = 16): { x: number; y: number } {
  return {
    x: Math.max(margin, Math.min(WORLD_WIDTH - margin, x)),
    y: Math.max(margin, Math.min(WORLD_HEIGHT - margin, y)),
  };
}

/** Random position on the world edge */
export function randomEdgePosition(): { x: number; y: number } {
  const side = Math.floor(Math.random() * 4);
  switch (side) {
    case 0: return { x: Math.random() * WORLD_WIDTH, y: 20 };
    case 1: return { x: Math.random() * WORLD_WIDTH, y: WORLD_HEIGHT - 20 };
    case 2: return { x: 20, y: Math.random() * WORLD_HEIGHT };
    default: return { x: WORLD_WIDTH - 20, y: Math.random() * WORLD_HEIGHT };
  }
}

/** Random position anywhere in world (avoiding edges) */
export function randomWorldPosition(margin = 80): { x: number; y: number } {
  return {
    x: margin + Math.random() * (WORLD_WIDTH - margin * 2),
    y: margin + Math.random() * (WORLD_HEIGHT - margin * 2),
  };
}

/** Compute perimeter positions for Observer patrol */
export function getPerimeterPosition(t: number, margin = 60): { x: number; y: number } {
  // t goes 0..1 around the perimeter
  const perimeter = 2 * ((WORLD_WIDTH - margin * 2) + (WORLD_HEIGHT - margin * 2));
  const dist = t * perimeter;
  const topEdge = WORLD_WIDTH - margin * 2;
  const rightEdge = WORLD_HEIGHT - margin * 2;
  const bottomEdge = WORLD_WIDTH - margin * 2;

  if (dist < topEdge) {
    return { x: margin + dist, y: margin };
  } else if (dist < topEdge + rightEdge) {
    return { x: WORLD_WIDTH - margin, y: margin + (dist - topEdge) };
  } else if (dist < topEdge + rightEdge + bottomEdge) {
    return { x: WORLD_WIDTH - margin - (dist - topEdge - rightEdge), y: WORLD_HEIGHT - margin };
  } else {
    return { x: margin, y: WORLD_HEIGHT - margin - (dist - topEdge - rightEdge - bottomEdge) };
  }
}

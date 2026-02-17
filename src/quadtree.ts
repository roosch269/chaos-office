// ============================================================
// CHAOS OFFICE — Quadtree Spatial Partitioning
// ============================================================

export interface QuadPoint {
  x: number;
  y: number;
  id: number;
}

interface QRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_POINTS = 8;
const MAX_DEPTH = 6;

class QuadNode {
  bounds: QRect;
  points: QuadPoint[];
  children: QuadNode[] | null;
  depth: number;

  constructor(bounds: QRect, depth: number) {
    this.bounds = bounds;
    this.points = [];
    this.children = null;
    this.depth = depth;
  }

  contains(p: QuadPoint): boolean {
    const b = this.bounds;
    return p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
  }

  intersectsCircle(cx: number, cy: number, r: number): boolean {
    const b = this.bounds;
    const nearX = Math.max(b.x, Math.min(cx, b.x + b.w));
    const nearY = Math.max(b.y, Math.min(cy, b.y + b.h));
    const dx = cx - nearX;
    const dy = cy - nearY;
    return dx * dx + dy * dy <= r * r;
  }

  subdivide(): void {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2;
    const hh = h / 2;
    const d = this.depth + 1;
    this.children = [
      new QuadNode({ x, y, w: hw, h: hh }, d),
      new QuadNode({ x: x + hw, y, w: hw, h: hh }, d),
      new QuadNode({ x, y: y + hh, w: hw, h: hh }, d),
      new QuadNode({ x: x + hw, y: y + hh, w: hw, h: hh }, d),
    ];
  }

  insert(p: QuadPoint): boolean {
    if (!this.contains(p)) return false;
    if (this.children === null) {
      this.points.push(p);
      if (this.points.length > MAX_POINTS && this.depth < MAX_DEPTH) {
        this.subdivide();
        for (const pt of this.points) {
          for (const child of this.children!) {
            if (child.insert(pt)) break;
          }
        }
        this.points = [];
      }
      return true;
    }
    for (const child of this.children) {
      if (child.insert(p)) return true;
    }
    return false;
  }

  query(cx: number, cy: number, r: number, result: QuadPoint[]): void {
    if (!this.intersectsCircle(cx, cy, r)) return;
    const r2 = r * r;
    if (this.children === null) {
      for (const p of this.points) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        if (dx * dx + dy * dy <= r2) result.push(p);
      }
    } else {
      for (const child of this.children) {
        child.query(cx, cy, r, result);
      }
    }
  }
}

export class Quadtree {
  private root: QuadNode;
  private w: number;
  private h: number;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.root = new QuadNode({ x: 0, y: 0, w, h }, 0);
  }

  clear(): void {
    this.root = new QuadNode({ x: 0, y: 0, w: this.w, h: this.h }, 0);
  }

  insert(p: QuadPoint): void {
    this.root.insert(p);
  }

  query(cx: number, cy: number, radius: number): QuadPoint[] {
    const result: QuadPoint[] = [];
    this.root.query(cx, cy, radius, result);
    return result;
  }

  /** Returns clusters: groups of >= minSize agents within groupRadius of each other */
  findClusters(allPoints: QuadPoint[], groupRadius: number, minSize: number): QuadPoint[][] {
    const visited = new Set<number>();
    const clusters: QuadPoint[][] = [];

    for (const p of allPoints) {
      if (visited.has(p.id)) continue;
      const neighbours = this.query(p.x, p.y, groupRadius);
      if (neighbours.length >= minSize) {
        const cluster: QuadPoint[] = [];
        for (const n of neighbours) {
          if (!visited.has(n.id)) {
            visited.add(n.id);
            cluster.push(n);
          }
        }
        if (cluster.length >= minSize) {
          clusters.push(cluster);
        }
      } else {
        visited.add(p.id);
      }
    }
    return clusters;
  }
}

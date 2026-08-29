export interface Pt { x: number; y: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function signedArea(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export function polygonArea(pts: Pt[]): number {
  return Math.abs(signedArea(pts))
}

export function polygonPerimeter(pts: Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    s += Math.hypot(q.x - p.x, q.y - p.y)
  }
  return s
}

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

function onSegment(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  const cross = (cx - ax) * (by - ay) - (cy - ay) * (bx - ax)
  if (Math.abs(cross) > 1e-12) return false
  return cx >= Math.min(ax, bx) - 1e-12 && cx <= Math.max(ax, bx) + 1e-12 &&
    cy >= Math.min(ay, by) - 1e-12 && cy <= Math.max(ay, by) + 1e-12
}

function properIntersects(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o1 = orient(a.x, a.y, b.x, b.y, c.x, c.y)
  const o2 = orient(a.x, a.y, b.x, b.y, d.x, d.y)
  const o3 = orient(c.x, c.y, d.x, d.y, a.x, a.y)
  const o4 = orient(c.x, c.y, d.x, d.y, b.x, b.y)
  return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
}

export function isSelfIntersecting(pts: Pt[]): boolean {
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      const c = pts[j]
      const d = pts[(j + 1) % n]
      const adjacent = j === i + 1 || (i === 0 && j === n - 1)
      if (properIntersects(a, b, c, d)) return true
      if (!adjacent) {
        const collinear = Math.abs(orient(a.x, a.y, b.x, b.y, c.x, c.y)) <= 1e-12 &&
          Math.abs(orient(a.x, a.y, b.x, b.y, d.x, d.y)) <= 1e-12
        if (collinear && (onSegment(a.x, a.y, b.x, b.y, c.x, c.y) || onSegment(a.x, a.y, b.x, b.y, d.x, d.y))) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Interior angles (degrees) of a simple polygon. The polygon is re-read in
 * counter-clockwise order; at each vertex the turning angle t gives the
 * interior angle as 180 - t (covers both convex and reflex vertices).
 * Angles for self-intersecting polygons are still reported but may be
 * geometrically ambiguous.
 */
export function interiorAngles(pts: Pt[]): number[] {
  const n = pts.length
  if (n < 3) return []
  const ccw = signedArea(pts) >= 0
  const idx: number[] = []
  for (let k = 0; k < n; k++) idx.push(ccw ? k : n - 1 - k)
  const deg = (r: number) => (r * 180) / Math.PI
  const out: number[] = []
  for (let k = 0; k < n; k++) {
    const cur = pts[idx[k]]
    const prev = pts[idx[(k - 1 + n) % n]]
    const next = pts[idx[(k + 1) % n]]
    const ux = cur.x - prev.x, uy = cur.y - prev.y
    const vx = next.x - cur.x, vy = next.y - cur.y
    const cross = ux * vy - uy * vx
    const dot = ux * vx + uy * vy
    const turn = Math.atan2(cross, dot)
    out.push(deg(Math.PI - turn))
  }
  return out
}

export function isConvex(pts: Pt[]): boolean {
  if (pts.length < 3) return false
  return interiorAngles(pts).every(a => a < 180)
}

export function round2(v: number): number {
  if (!isFinite(v)) return v
  return Math.round((v + Number.EPSILON) * 100) / 100
}

export function fmt(v: number): string {
  const r = round2(v)
  return String(r)
}
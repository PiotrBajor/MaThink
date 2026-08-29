import { describe, it, expect } from 'vitest'
import { polygonArea, polygonPerimeter, interiorAngles, isSelfIntersecting, isConvex } from './geom2d'
import { convexHull3D, buildSolid, solidMetrics, type P3 } from './geom3d'

describe('2D polygons', () => {
  it('computes the area of a rectangle', () => {
    const r = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]
    expect(polygonArea(r)).toBeCloseTo(12, 6)
    expect(polygonPerimeter(r)).toBeCloseTo(14, 6)
  })

  it('computes area regardless of winding order', () => {
    const cw = [{ x: 0, y: 0 }, { x: 0, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 0 }]
    expect(polygonArea(cw)).toBeCloseTo(12, 6)
  })

  it('interior angles of a square are 90°', () => {
    const sq = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]
    for (const a of interiorAngles(sq)) expect(a).toBeCloseTo(90, 5)
  })

  it('detects the reflex 270° vertex of an L-shape', () => {
    const L = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }]
    const angles = interiorAngles(L)
    expect(angles).toHaveLength(6)
    expect(angles.reduce((s, a) => s + a, 0)).toBeCloseTo(720, 5)
    expect(Math.max(...angles)).toBeCloseTo(270, 5)
    expect(Math.min(...angles)).toBeCloseTo(90, 5)
    const flipped = [...L].reverse().map(p => ({ x: p.x, y: p.y }))
    const fAngles = interiorAngles(flipped)
    expect(Math.max(...fAngles)).toBeCloseTo(270, 5)
  })

  it('reports self-intersection for a bowtie', () => {
    const bowtie = [{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 }]
    expect(isSelfIntersecting(bowtie)).toBe(true)
    const square = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]
    expect(isSelfIntersecting(square)).toBe(false)
  })

  it('classifies convexity', () => {
    const square = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]
    const L = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }]
    expect(isConvex(square)).toBe(true)
    expect(isConvex(L)).toBe(false)
  })

  it('handles a generic triangle', () => {
    const t = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }]
    const a = interiorAngles(t)
    expect(a).toHaveLength(3)
    expect(a[0]).toBeCloseTo(90, 5)
    expect(a[1]).toBeCloseTo(53.1301, 3)
    expect(a[2]).toBeCloseTo(36.8699, 3)
    expect(a[0] + a[1] + a[2]).toBeCloseTo(180, 5)
  })
})

const pt = (x: number, y: number, z: number): P3 => [x, y, z]

describe('3D convex hull', () => {
  it('computes unit cube volume and surface', () => {
    const cube: P3[] = []
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) cube.push([x, y, z])
    const h = convexHull3D(cube)!
    expect(h).toBeTruthy()
    expect(h.volume).toBeCloseTo(1, 5)
    expect(h.surface).toBeCloseTo(6, 5)
    expect(h.faces.length).toBeGreaterThanOrEqual(12)
  })

  it('ignores interior points', () => {
    const pts = [pt(0, 0, 0), pt(1, 0, 0), pt(0, 1, 0), pt(0, 0, 1), pt(-1, 0, 0), pt(0, -1, 0), pt(0, 0, -1), pt(0.1, 0.1, 0.1)]
    const h = convexHull3D(pts)!
    expect(h.volume).toBeCloseTo(4 / 3, 5)
  })

  it('computes a tetrahedron', () => {
    const t = [pt(0, 0, 0), pt(1, 0, 0), pt(0, 1, 0), pt(0, 0, 1)]
    const h = convexHull3D(t)!
    expect(h.volume).toBeCloseTo(1 / 6, 5)
    // 3 right faces of area 0.5 + slanted face sqrt(3)/2
    expect(h.surface).toBeCloseTo(1.5 + Math.sqrt(3) / 2, 5)
    expect(h.faces.length).toBe(4)
  })

  it('computes an octahedron', () => {
    const o = [pt(1, 0, 0), pt(-1, 0, 0), pt(0, 1, 0), pt(0, -1, 0), pt(0, 0, 1), pt(0, 0, -1)]
    const h = convexHull3D(o)!
    expect(h.volume).toBeCloseTo(4 / 3, 5)
    expect(h.surface).toBeCloseTo(4 * Math.sqrt(3), 5)
  })

  it('handles an asymmetric simple hull (pyramid)', () => {
    const pyr = [pt(0, 0, 0), pt(2, 0, 0), pt(0, 0, 2), pt(0, 0, 0), pt(0, 1, 0)]
    const h = convexHull3D(pyr)!
    expect(h).toBeTruthy()
    expect(h.volume).toBeCloseTo((1 / 3) * (0.5 * 2 * 1) * 2, 5)
  })

  it('returns null for coplanar or sparse clouds', () => {
    expect(convexHull3D([pt(0, 0, 0), pt(1, 0, 0), pt(0, 1, 0), pt(1, 1, 0)])).toBeNull()
    expect(convexHull3D([pt(0, 0, 0), pt(1, 0, 0), pt(0, 1, 0)])).toBeNull()
  })
})

describe('solid builders & metrics', () => {
  it('builds non-degenerate meshes for every solid', () => {
    const cases: [Parameters<typeof buildSolid>[0], Parameters<typeof buildSolid>[1]][] = [
      ['cube', { a: 2 }],
      ['cuboid', { a: 2, b: 3, c: 4 }],
      ['cylinder', { r: 1, h: 2 }],
      ['cone', { r: 1, h: 2 }],
      ['sphere', { r: 1 }],
      ['pyramid', { a: 2, h: 3 }],
      ['triPrism', { x: 3, y: 4, h: 2 }],
    ]
    for (const [kind, p] of cases) {
      const s = buildSolid(kind, p)
      expect(s.mesh.x.length).toBeGreaterThan(4)
      expect(s.edges.length).toBeGreaterThan(3)
    }
  })

  it('cube metrics', () => {
    const m = solidMetrics('cube', { a: 3 })
    expect(m.volume).toBeCloseTo(27, 5)
    expect(m.surface).toBeCloseTo(54, 5)
    expect(m.angles.length).toBeGreaterThan(0)
  })

  it('cuboid metrics', () => {
    const m = solidMetrics('cuboid', { a: 2, b: 3, c: 4 })
    expect(m.volume).toBeCloseTo(24, 5)
    expect(m.surface).toBeCloseTo(52, 5)
  })

  it('cylinder metrics', () => {
    const m = solidMetrics('cylinder', { r: 1, h: 2 })
    expect(m.volume).toBeCloseTo(2 * Math.PI, 5)
    expect(m.surface).toBeCloseTo(2 * Math.PI * 3, 5)
  })

  it('cone metrics', () => {
    const m = solidMetrics('cone', { r: 3, h: 4 })
    expect(m.volume).toBeCloseTo(12 * Math.PI, 5)
    expect(m.surface).toBeCloseTo(Math.PI * 3 * (3 + 5), 5)
  })

  it('sphere metrics', () => {
    const m = solidMetrics('sphere', { r: 2 })
    expect(m.volume).toBeCloseTo((4 * Math.PI * 8) / 3, 5)
    expect(m.surface).toBeCloseTo(16 * Math.PI, 5)
  })

  it('pyramid metrics', () => {
    const m = solidMetrics('pyramid', { a: 4, h: 3 })
    expect(m.volume).toBeCloseTo(16, 5)
    // slant l = sqrt(3^2 + 2^2) = sqrt(13)
    expect(m.surface).toBeCloseTo(16 + 2 * 4 * Math.sqrt(13), 5)
  })
})
export type P3 = [number, number, number]

export interface Mesh3D {
  x: number[],
  y: number[],
  z: number[],
  i: number[],
  j: number[],
  k: number[],
}

export type Segment = [P3, P3]

export interface SolidBuild { mesh: Mesh3D; edges: Segment[] }

export interface InfoItem { name: string; value: string }

export interface SolidMetrics {
  volume: number
  surface: number
  extra: InfoItem[]
  angles: InfoItem[]
}

export type SolidKind = 'cube' | 'cuboid' | 'cylinder' | 'cone' | 'sphere' | 'pyramid' | 'triPrism'

export interface SolidParams { [key: string]: number }

const deg = (r: number) => (r * 180) / Math.PI

function newMesh(): Mesh3D { return { x: [], y: [], z: [], i: [], j: [], k: [] } }

function addVertex(m: Mesh3D, p: P3) {
  m.x.push(p[0])
  m.y.push(p[1])
  m.z.push(p[2])
}

function tri(m: Mesh3D, a: P3, b: P3, c: P3) {
  const base = m.x.length
  addVertex(m, a)
  addVertex(m, b)
  addVertex(m, c)
  m.i.push(base)
  m.j.push(base + 1)
  m.k.push(base + 2)
}

function quad(m: Mesh3D, a: P3, b: P3, c: P3, d: P3) {
  const base = m.x.length
  addVertex(m, a)
  addVertex(m, b)
  addVertex(m, c)
  addVertex(m, d)
  m.i.push(base)
  m.j.push(base + 1)
  m.k.push(base + 2)
  m.i.push(base)
  m.j.push(base + 2)
  m.k.push(base + 3)
}

function segKey(a: P3, b: P3): string {
  const lo = a[0] < b[0] ? a : b
  const hi = a[0] < b[0] ? b : a
  return lo.join(',') + '|' + hi.join(',')
}

function addEdge(map: Map<string, Segment>, a: P3, b: P3) {
  const k = segKey(a, b)
  if (!map.has(k)) map.set(k, [a, b])
}

function polylineEdges(pts: P3[], map: Map<string, Segment>) {
  for (let i = 0; i < pts.length - 1; i++) addEdge(map, pts[i], pts[i + 1])
}

/* ---------------------------- solid builders ---------------------------- */

const ringPts = (r: number, z: number, n: number): P3[] => {
  const out: P3[] = []
  for (let i = 0; i < n; i++) {
    const th = (2 * Math.PI * i) / n
    out.push([r * Math.cos(th), r * Math.sin(th), z])
  }
  return out
}

function cuboidMesh(a: number, b: number, c: number): SolidBuild {
  const m = newMesh()
  const ox = a / 2, oy = b / 2, oz = c / 2
  const V = (x: number, y: number, z: number): P3 => [x ? ox : -ox, y ? oy : -oy, z ? oz : -oz]
  quad(m, V(1, 1, 1), V(0, 1, 1), V(0, 0, 1), V(1, 0, 1))
  quad(m, V(1, 0, 0), V(0, 0, 0), V(0, 1, 0), V(1, 1, 0))
  quad(m, V(1, 1, 0), V(0, 1, 0), V(0, 1, 1), V(1, 1, 1))
  quad(m, V(1, 0, 1), V(0, 0, 1), V(0, 0, 0), V(1, 0, 0))
  quad(m, V(1, 0, 0), V(1, 1, 0), V(1, 1, 1), V(1, 0, 1))
  quad(m, V(0, 0, 1), V(0, 1, 1), V(0, 1, 0), V(0, 0, 0))
  const corners: P3[] = []
  for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++) for (let z = 0; z <= 1; z++) corners.push(V(x, y, z))
  const map = new Map<string, Segment>()
  const dirs: [number, number, number][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  corners.forEach((p, i) => {
    dirs.forEach((d) => {
      const xn = (i >> 2) % 2, yn = (i >> 1) % 2, zn = i % 2
      const nx = xn + d[0], ny = yn + d[1], nz = zn + d[2]
      if (nx <= 1 && ny <= 1 && nz <= 1) {
        const j = nx * 4 + ny * 2 + nz
        addEdge(map, p, corners[j])
      }
    })
  })
  return { mesh: m, edges: [...map.values()] }
}

function cylinderMesh(r: number, h: number, n = 48): SolidBuild {
  const m = newMesh()
  const z0 = -h / 2, z1 = h / 2
  const B = ringPts(r, z0, n)
  const T = ringPts(r, z1, n)
  const c0: P3 = [0, 0, z0]
  const c1: P3 = [0, 0, z1]
  for (let i = 0; i < n; i++) {
    tri(m, c0, B[i], B[(i + 1) % n])
    tri(m, c1, T[(i + 1) % n], T[i])
    quad(m, B[i], T[i], T[(i + 1) % n], B[(i + 1) % n])
  }
  const map = new Map<string, Segment>()
  for (let i = 0; i < n; i++) {
    addEdge(map, B[i], B[(i + 1) % n])
    addEdge(map, T[i], T[(i + 1) % n])
    addEdge(map, B[i], T[i])
  }
  return { mesh: m, edges: [...map.values()] }
}

function coneMesh(r: number, h: number, n = 48): SolidBuild {
  const m = newMesh()
  const z0 = -h / 2
  const apex: P3 = [0, 0, h / 2]
  const B = ringPts(r, z0, n)
  for (let i = 0; i < n; i++) {
    tri(m, [0, 0, z0], B[(i + 1) % n], B[i])
    tri(m, B[i], apex, B[(i + 1) % n])
  }
  const map = new Map<string, Segment>()
  for (let i = 0; i < n; i++) {
    addEdge(map, B[i], B[(i + 1) % n])
    addEdge(map, B[i], apex)
  }
  return { mesh: m, edges: [...map.values()] }
}

function sphereMesh(r: number, rings = 20, segs = 32): SolidBuild {
  const m = newMesh()
  const at = (t: number, l: number): P3 => [r * Math.sin(t) * Math.cos(l), r * Math.sin(t) * Math.sin(l), r * Math.cos(t)]
  for (let ri = 0; ri < rings; ri++) {
    const t0 = (Math.PI * ri) / rings
    const t1 = (Math.PI * (ri + 1)) / rings
    for (let si = 0; si < segs; si++) {
      const l0 = (2 * Math.PI * si) / segs
      const l1 = (2 * Math.PI * (si + 1)) / segs
      tri(m, at(t0, l0), at(t1, l0), at(t0, l1))
      tri(m, at(t0, l1), at(t1, l0), at(t1, l1))
    }
  }
  const map = new Map<string, Segment>()
  const eq: P3[] = []
  for (let s = 0; s <= segs; s++) eq.push([r * Math.cos((2 * Math.PI * s) / segs), r * Math.sin((2 * Math.PI * s) / segs), 0])
  polylineEdges(eq, map)
  for (let rI = 0; rI <= rings; rI++) {
    const t = (Math.PI * rI) / rings
    const xs: P3[] = [], ys: P3[] = []
    for (let s = 0; s <= segs; s++) {
      const l = (2 * Math.PI * s) / segs
      xs.push([r * Math.sin(t) * Math.cos(l), r * Math.sin(t) * Math.sin(l), r * Math.cos(t)])
      ys.push([r * Math.sin(t) * Math.cos(l), 0, r * Math.cos(t)])
    }
    if (rI === 0 || rI === rings) { polylineEdges(xs, map); continue }
    polylineEdges(ys, map)
  }
  return { mesh: m, edges: [...map.values()] }
}

function pyramidMesh(a: number, h: number): SolidBuild {
  const m = newMesh()
  const z0 = -h / 2
  const half = a / 2
  const B: P3[] = [[half, half, z0], [-half, half, z0], [-half, -half, z0], [half, -half, z0]]
  const apex: P3 = [0, 0, h / 2]
  tri(m, B[0], B[1], B[3])
  tri(m, B[1], B[2], B[3])
  for (let i = 0; i < 4; i++) tri(m, B[i], apex, B[(i + 1) % 4])
  const map = new Map<string, Segment>()
  for (let i = 0; i < 4; i++) {
    addEdge(map, B[i], B[(i + 1) % 4])
    addEdge(map, B[i], apex)
  }
  return { mesh: m, edges: [...map.values()] }
}

function triPrismMesh(x: number, y: number, h: number): SolidBuild {
  const m = newMesh()
  const A: P3 = [0, 0, 0], B: P3 = [x, 0, 0], C: P3 = [0, y, 0]
  const At: P3 = [0, 0, h], Bt: P3 = [x, 0, h], Ct: P3 = [0, y, h]
  tri(m, A, B, C)
  tri(m, At, Ct, Bt)
  quad(m, A, B, Bt, At)
  quad(m, B, C, Ct, Bt)
  quad(m, C, A, At, Ct)
  const map = new Map<string, Segment>()
  polylineEdges([A, B, C, A], map)
  polylineEdges([At, Bt, Ct, At], map)
  for (const p of [A, B, C]) addEdge(map, p, [p[0], p[1], h])
  return { mesh: m, edges: [...map.values()] }
}

export function buildSolid(kind: SolidKind, p: SolidParams): SolidBuild {
  switch (kind) {
    case 'cube': return cuboidMesh(p.a, p.a, p.a)
    case 'cuboid': return cuboidMesh(p.a, p.b, p.c)
    case 'cylinder': return cylinderMesh(p.r, p.h)
    case 'cone': return coneMesh(p.r, p.h)
    case 'sphere': return sphereMesh(p.r)
    case 'pyramid': return pyramidMesh(p.a, p.h)
    case 'triPrism': return triPrismMesh(p.x, p.y, p.h)
    default: return cuboidMesh(1, 1, 1)
  }
}

/* ------------------------------ metrics ------------------------------ */

const fmtA = (v: number) => deg(v).toFixed(1) + '°'

export function solidMetrics(kind: SolidKind, p: SolidParams, unit = 'm'): SolidMetrics {
  switch (kind) {
    case 'cube': {
      const a = p.a
      const V = a * a * a
      const S = 6 * a * a
      const d = Math.sqrt(3) * a
      return {
        volume: V, surface: S,
        extra: [{ name: 'Space diagonal', value: d.toFixed(2) + ' ' + unit }],
        angles: [
          { name: 'Diagonal vs. edge', value: fmtA(Math.acos(a / (Math.sqrt(3) * a))) },
        ],
      }
    }
    case 'cuboid': {
      const { a, b, c } = p
      const V = a * b * c
      const S = 2 * (a * b + b * c + c * a)
      const d = Math.sqrt(a * a + b * b + c * c)
      return {
        volume: V, surface: S,
        extra: [{ name: 'Space diagonal', value: d.toFixed(2) + ' ' + unit }],
        angles: [
          { name: 'Diagonal vs. edge a', value: fmtA(Math.acos(a / d)) },
          { name: 'Diagonal vs. edge b', value: fmtA(Math.acos(b / d)) },
          { name: 'Diagonal vs. edge c', value: fmtA(Math.acos(c / d)) },
        ],
      }
    }
    case 'cylinder': {
      const { r, h } = p
      const V = Math.PI * r * r * h
      const S = 2 * Math.PI * r * (r + h)
      return {
        volume: V, surface: S,
        extra: [
          { name: 'Formula (V)', value: 'π·r²·h' },
          { name: 'Formula (S)', value: '2π·r·(r + h)' },
        ],
        angles: [{ name: 'Base ↔ side', value: '90°' }],
      }
    }
    case 'cone': {
      const { r, h } = p
      const l = Math.sqrt(r * r + h * h)
      const V = (Math.PI * r * r * h) / 3
      const S = Math.PI * r * (r + l)
      return {
        volume: V, surface: S,
        extra: [
          { name: 'Slant height', value: l.toFixed(2) + ' ' + unit },
          { name: 'Formula (V)', value: '⅓·π·r²·h' },
          { name: 'Formula (S)', value: 'π·r·(r + l)' },
        ],
        angles: [
          { name: 'Apex angle', value: fmtA(2 * Math.atan(r / h)) },
          { name: 'Slant vs. base', value: fmtA(Math.atan(h / r)) },
        ],
      }
    }
    case 'sphere': {
      const r = p.r
      const V = (4 * Math.PI * r * r * r) / 3
      const S = 4 * Math.PI * r * r
      return {
        volume: V, surface: S,
        extra: [
          { name: 'Formula (V)', value: '4⁄3·π·r³' },
          { name: 'Formula (S)', value: '4π·r²' },
        ],
        angles: [{ name: 'Smooth surface', value: 'no faces/corners' }],
      }
    }
    case 'pyramid': {
      const { a, h } = p
      const l = Math.sqrt(h * h + (a * a) / 4)
      const V = (a * a * h) / 3
      const S = a * a + 2 * a * l
      return {
        volume: V, surface: S,
        extra: [
          { name: 'Slant height', value: l.toFixed(2) + ' ' + unit },
          { name: 'Formula (V)', value: '⅓·a²·h' },
        ],
        angles: [
          { name: 'Apex angle', value: fmtA(2 * Math.atan(a / 2 / h)) },
          { name: 'Face slope', value: fmtA(Math.atan(h / (a / 2))) },
        ],
      }
    }
    case 'triPrism': {
      const { x, y, h } = p
      const hyp = Math.sqrt(x * x + y * y)
      const baseArea = (x * y) / 2
      const V = baseArea * h
      const S = 2 * baseArea + (x + y + hyp) * h
      return {
        volume: V, surface: S,
        extra: [
          { name: 'Base hypotenuse', value: hyp.toFixed(2) + ' ' + unit },
          { name: 'Formula (V)', value: '½·x·y·h' },
        ],
        angles: [
          { name: 'Base — right angle', value: '90°' },
          { name: 'Base — at leg x', value: fmtA(Math.atan(y / x)) },
          { name: 'Base — at leg y', value: fmtA(Math.atan(x / y)) },
          { name: 'Lateral faces', value: '90°' },
        ],
      }
    }
  }
}

/* ------------------------------ convex hull ------------------------------ */

export interface Hull {
  vertices: P3[]
  faces: [number, number, number][]
  volume: number
  surface: number
}

interface Plane { a: number; b: number; c: number; n: P3; d: number }

const ZERO: P3 = [0, 0, 0]

function sub(a: P3, b: P3): P3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function cross(a: P3, b: P3): P3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
function dot(a: P3, b: P3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function norm(a: P3): number { return Math.sqrt(dot(a, a)) }
function distTo(a: P3, b: P3): number { const d = sub(a, b); return Math.sqrt(dot(d, d)) }

function makePlane(pts: P3[], a: number, b: number, c: number): Plane {
  const n0 = cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]))
  const len = norm(n0) || 1
  const n: P3 = [n0[0] / len, n0[1] / len, n0[2] / len]
  return { a, b, c, n, d: -dot(n, pts[a]) }
}

function signedDist(pts: P3[], f: Plane, i: number): number {
  return dot(f.n, pts[i]) + f.d
}

/**
 * Convex hull of a point cloud in 3D (QuickHull). Returns null when the cloud
 * is degenerate (fewer than 4 points, collinear or coplanar). Interior points
 * are ignored; faces are triangles with outward-facing normals.
 */
export function convexHull3D(raw: P3[]): Hull | null {
  const seen = new Set<string>()
  const pts: P3[] = []
  for (const p of raw) {
    const k = p.join(',')
    if (!seen.has(k)) { seen.add(k); pts.push(p) }
  }
  const n = pts.length
  if (n < 4) return null

  // initial extreme points
  let i0 = 0
  for (let i = 1; i < n; i++) if (pts[i][0] < pts[i0][0]) i0 = i
  let i1 = -1, best = -1
  for (let i = 0; i < n; i++) {
    if (i === i0) continue
    const d = distTo(pts[i], pts[i0])
    if (d > best) { best = d; i1 = i }
  }
  if (i1 < 0 || best <= 1e-15) return null
  const dir = sub(pts[i1], pts[i0])
  best = -1
  let i2 = -1
  for (let i = 0; i < n; i++) {
    if (i === i0 || i === i1) continue
    const c = cross(sub(pts[i], pts[i0]), dir)
    const d = dot(c, c) / Math.max(1e-30, dot(dir, dir))
    if (d > best) { best = d; i2 = i }
  }
  if (i2 < 0 || best <= 1e-15) return null
  const n0 = cross(sub(pts[i1], pts[i0]), sub(pts[i2], pts[i0]))
  const area2 = dot(n0, n0)
  if (area2 <= 1e-30) return null
  const un: P3 = [n0[0] / Math.sqrt(area2), n0[1] / Math.sqrt(area2), n0[2] / Math.sqrt(area2)]
  const dPlane = -dot(un, pts[i0])
  best = 0
  let i3 = -1
  for (let i = 0; i < n; i++) {
    const s = Math.abs(dot(un, pts[i]) + dPlane)
    if (s > best) { best = s; i3 = i }
  }
  if (i3 < 0 || best <= 1e-13) return null

  const tet = [i0, i1, i2, i3]
  let faces: Plane[] = []
  const triples: [number, number, number][] = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]
  for (const [x, y, z] of triples) {
    let f = makePlane(pts, tet[x], tet[y], tet[z])
    const other = [0, 1, 2, 3].find(idx => idx !== x && idx !== y && idx !== z)!
    if (signedDist(pts, f, tet[other]) > 0) f = makePlane(pts, tet[y], tet[x], tet[z])
    faces.push(f)
  }

  // interior reference point: centroid of the hull's current vertices
  const refPoint = () => {
    const set = new Set<number>()
    for (const f of faces) { set.add(f.a); set.add(f.b); set.add(f.c) }
    let sx = 0, sy = 0, sz = 0
    for (const i of set) { sx += pts[i][0]; sy += pts[i][1]; sz += pts[i][2] }
    const c = set.size || 1
    return [sx / c, sy / c, sz / c] as P3
  }

  let conflicts: number[][] = faces.map(() => [])
  const scale = Math.max(1, distTo(pts[i1], pts[i0]))
  const tol = 1e-9 * scale
  // A point counts as "outside" a face when it lies strictly above its plane,
  // or is coplanar with it but outside the facet triangle (rho -tol guard).
  const outside = (fi: number, pi: number) => signedDist(pts, faces[fi], pi) + tol > 0
  for (let i = 0; i < n; i++) {
    if (tet.includes(i)) continue
    for (let fi = 0; fi < faces.length; fi++) {
      if (outside(fi, i)) conflicts[fi].push(i)
    }
  }

  const faceEdgeKeys = (f: Plane): string[] => [
    Math.min(f.a, f.b) + ',' + Math.max(f.a, f.b),
    Math.min(f.b, f.c) + ',' + Math.max(f.b, f.c),
    Math.min(f.c, f.a) + ',' + Math.max(f.c, f.a),
  ]

  const sharedEdge = (x: Plane, y: Plane): boolean => {
    const ks = new Set(faceEdgeKeys(x))
    return faceEdgeKeys(y).some(k => ks.has(k))
  }

  while (true) {
    let bestFi = -1, bestP = -1, bestD = -Infinity
    for (let fi = 0; fi < faces.length; fi++) {
      for (const p of conflicts[fi]) {
        const d = signedDist(pts, faces[fi], p)
        if (d > bestD) { bestD = d; bestP = p; bestFi = fi }
      }
    }
    if (bestFi < 0 || bestD <= -tol) break

    // visible faces via BFS
    const visIdx = new Set<number>()
    const stack = [bestFi]
    while (stack.length) {
      const fi = stack.pop()!
      if (visIdx.has(fi)) continue
      if (signedDist(pts, faces[fi], bestP) + tol <= 0) continue
      visIdx.add(fi)
      for (let oi = 0; oi < faces.length; oi++) {
        if (!visIdx.has(oi) && sharedEdge(faces[fi], faces[oi])) stack.push(oi)
      }
    }

    // horizon edges (shared by exactly one visible face)
    const count = new Map<string, number>()
    for (const fi of visIdx) {
      for (const k of faceEdgeKeys(faces[fi])) count.set(k, (count.get(k) ?? 0) + 1)
    }
    const horizonEdges: [number, number][] = []
    for (const [k, c] of count) if (c === 1) {
      const [a, b] = k.split(',').map(Number)
      horizonEdges.push([a, b])
    }

    const reassign: number[] = []
    for (const fi of visIdx) {
      for (const p of conflicts[fi]) if (p !== bestP) reassign.push(p)
    }
    faces = faces.filter((_, i) => !visIdx.has(i))
    conflicts = conflicts.filter((_, i) => !visIdx.has(i))

    for (const [a, b] of horizonEdges) {
      let f = makePlane(pts, a, b, bestP)
      const ref = refPoint()
      if (dot(f.n, ref) + f.d > 0) f = makePlane(pts, b, a, bestP)
      faces.push(f)
      conflicts.push([])
    }

    // reassign displaced points
    for (const p of reassign) {
      for (let fi = 0; fi < faces.length; fi++) {
        if (signedDist(pts, faces[fi], p) + tol > 0) conflicts[fi].push(p)
      }
    }
  }

  const kept: Plane[] = faces.filter(f => {
    const area2 = dot(cross(sub(pts[f.b], pts[f.a]), sub(pts[f.c], pts[f.a])), cross(sub(pts[f.b], pts[f.a]), sub(pts[f.c], pts[f.a])))
    return area2 > 1e-24
  })

  const used = new Map<number, number>()
  const vertices: P3[] = []
  const outFaces: [number, number, number][] = []
  for (const f of kept) {
    const idxs: number[] = []
    for (const v of [f.a, f.b, f.c]) {
      let ni = used.get(v)
      if (ni === undefined) {
        ni = vertices.length
        used.set(v, ni)
        vertices.push(pts[v])
      }
      idxs.push(ni)
    }
    outFaces.push([idxs[0], idxs[1], idxs[2]])
  }

  let vol = 0
  for (const f of kept) vol += dot(pts[f.a], cross(pts[f.b], pts[f.c])) / 6
  let surface = 0
  for (const f of kept) surface += norm(cross(sub(pts[f.b], pts[f.a]), sub(pts[f.c], pts[f.a]))) / 2

  return {
    vertices, faces: outFaces,
    volume: Math.abs(vol),
    surface,
  }
}
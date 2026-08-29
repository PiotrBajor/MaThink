import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import { buildSolid, solidMetrics, convexHull3D, type SolidKind, type Segment } from '../lib/geom3d'
import './Solids.css'

type Mode = 'builder' | 'points'
type Unit = 'm' | 'cm'

const DEFAULTS: Record<SolidKind, Record<string, number>> = {
  cube: { a: 2 },
  cuboid: { a: 2, b: 3, c: 4 },
  cylinder: { r: 1, h: 2 },
  cone: { r: 1, h: 3 },
  sphere: { r: 1 },
  pyramid: { a: 2, h: 3 },
  triPrism: { x: 3, y: 4, h: 2 },
}

const PARAM_DEFS: Record<SolidKind, { key: string; label: string }[]> = {
  cube: [{ key: 'a', label: 'Edge a' }],
  cuboid: [{ key: 'a', label: 'Length a' }, { key: 'b', label: 'Width b' }, { key: 'c', label: 'Height c' }],
  cylinder: [{ key: 'r', label: 'Radius r' }, { key: 'h', label: 'Height h' }],
  cone: [{ key: 'r', label: 'Radius r' }, { key: 'h', label: 'Height h' }],
  sphere: [{ key: 'r', label: 'Radius r' }],
  pyramid: [{ key: 'a', label: 'Base a' }, { key: 'h', label: 'Height h' }],
  triPrism: [{ key: 'x', label: 'Leg x' }, { key: 'y', label: 'Leg y' }, { key: 'h', label: 'Height h' }],
}

const KINDS: SolidKind[] = ['cube', 'cuboid', 'cylinder', 'cone', 'sphere', 'pyramid', 'triPrism']
const KIND_LABELS: Record<SolidKind, string> = {
  cube: 'Cube', cuboid: 'Cuboid', cylinder: 'Cylinder', cone: 'Cone',
  sphere: 'Sphere', pyramid: 'Square pyramid', triPrism: 'Right triangular prism',
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.round(((n >> 16) & 255) * f)
  const g = Math.round(((n >> 8) & 255) * f)
  const b = Math.round((n & 255) * f)
  return `rgb(${r},${g},${b})`
}

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const clampNum = (v: string, lo: number, hi: number, fallback: number) => {
  const n = parseFloat(v)
  if (isNaN(n)) return fallback
  return Math.min(hi, Math.max(lo, n))
}

const fmt = (v: number) => {
  const r = Math.round(v * 100) / 100
  return Number.isInteger(r) ? String(r) : String(r)
}

const sceneLayout = {
  bgcolor: 'rgba(0,0,0,0)',
  xaxis: { title: 'x', gridcolor: 'rgba(150,150,165,0.12)', color: '#a0a6b8', zerolinecolor: 'rgba(150,150,165,0.28)' },
  yaxis: { title: 'y', gridcolor: 'rgba(150,150,165,0.12)', color: '#a0a6b8', zerolinecolor: 'rgba(150,150,165,0.28)' },
  zaxis: { title: 'z', gridcolor: 'rgba(150,150,165,0.12)', color: '#a0a6b8', zerolinecolor: 'rgba(150,150,165,0.28)' },
}

interface Lattice3D { pts: [number, number, number][]; keyOf: (p: [number, number, number]) => string }

function makeLattice(range: number, step: number): Lattice3D {
  const pts: [number, number, number][] = []
  const vals: number[] = []
  for (let v = -range; v <= range + 1e-9; v += step) vals.push(Math.round((v / step) * 1e9) / 1e9 * step)
  for (const x of vals) for (const y of vals) for (const z of vals) pts.push([x, y, z])
  const keyOf = (p: [number, number, number]) => p.map(v => Math.round(v * 1000) / 1000).join(',')
  return { pts, keyOf }
}

function chainSegments(segs: Segment[]): [number, number, number][][] {
  const used = new Set<number>()
  const chains: [number, number, number][][] = []
  for (let start = 0; start < segs.length; start++) {
    if (used.has(start)) continue
    const chain: [number, number, number][] = [segs[start][0], segs[start][1]]
    used.add(start)
    let grew = true
    while (grew) {
      grew = false
      for (let j = 0; j < segs.length; j++) {
        if (used.has(j)) continue
        const head = chain[0], tail = chain[chain.length - 1]
        const [a, b] = segs[j]
        const distA = Math.hypot(head[0] - a[0], head[1] - a[1], head[2] - a[2])
        const distB = Math.hypot(head[0] - b[0], head[1] - b[1], head[2] - b[2])
        const distC = Math.hypot(tail[0] - a[0], tail[1] - a[1], tail[2] - a[2])
        const distD = Math.hypot(tail[0] - b[0], tail[1] - b[1], tail[2] - b[2])
        const collinear = (p1: [number, number, number], p2: [number, number, number], p3: [number, number, number]) => {
          const v: [number, number, number] = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]]
          const w: [number, number, number] = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]]
          const dv = Math.hypot(v[0], v[1], v[2]), dw = Math.hypot(w[0], w[1], w[2])
          if (dv < 1e-9 || dw < 1e-9) return false
          const dot = (v[0] * w[0] + v[1] * w[1] + v[2] * w[2]) / (dv * dw)
          return dot < -0.999
        }
        if (distA < 1e-6 && collinear(a, head, chain[1])) {
          chain.unshift(b); used.add(j); grew = true
        } else if (distB < 1e-6 && collinear(b, head, chain[1])) {
          chain.unshift(a); used.add(j); grew = true
        } else if (distC < 1e-6 && collinear(tail, a, chain[chain.length - 2])) {
          chain.push(b); used.add(j); grew = true
        } else if (distD < 1e-6 && collinear(tail, b, chain[chain.length - 2])) {
          chain.push(a); used.add(j); grew = true
        }
        if (grew) break
      }
    }
    if (chain.length > 1 && Math.hypot(chain[0][0] - chain[chain.length - 1][0], chain[0][1] - chain[chain.length - 1][1], chain[0][2] - chain[chain.length - 1][2]) < 1e-6) {
      chain.pop()
    }
    if (chain.length >= 2) chains.push(chain)
  }
  return chains
}

export default function Solids() {
  const [mode, setMode] = useState<Mode>('builder')
  const [unit, setUnit] = useState<Unit>('m')
  const [kind, setKind] = useState<SolidKind>('cuboid')
  const [params, setParams] = useState<Record<string, string>>({ a: '2', b: '3', c: '4' })
  const [color, setColor] = useState('#6c5ce7')
  const [rangeS, setRangeS] = useState('1')
  const [stepS, setStepS] = useState('1')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const divRef = useRef<HTMLDivElement>(null)
  const idRef = useRef('sl-' + Math.random().toString(36).slice(2, 9))
  const gdRef = useRef<{ on: Function; removeListener: Function } | null>(null)
  const handlerRef = useRef<((data: { points?: Array<{ x?: number; y?: number; z?: number }> }) => void) | null>(null)
  const genRef = useRef(0)

  const pickKind = (k: SolidKind) => {
    setKind(k)
    setParams(prev => {
      const next: Record<string, string> = {}
      for (const pd of PARAM_DEFS[k]) next[pd.key] = prev[pd.key] ?? String(DEFAULTS[k][pd.key])
      return next
    })
  }

  const numericParams = useMemo(() => {
    const out: Record<string, number> = {}
    for (const pd of PARAM_DEFS[kind]) out[pd.key] = clampNum(params[pd.key] ?? '', 0.05, 100, DEFAULTS[kind][pd.key] ?? 1)
    return out
  }, [kind, params])

  const lattice = useMemo(
    () => makeLattice(clampNum(rangeS, 1, 10, 1), Math.max(0.25, clampNum(stepS, 0.25, 5, 1))),
    [rangeS, stepS],
  )

  const hull = useMemo(() => {
    const pts = [...selected].map(k => k.split(',').map(Number) as [number, number, number])
    return pts.length >= 4 ? convexHull3D(pts) : null
  }, [selected])

  const togglePoint = useCallback((x: number, y: number, z: number) => {
    let candidate: [number, number, number] | null = null
    let best = Infinity
    for (const p of lattice.pts) {
      const d = Math.hypot(p[0] - x, p[1] - y, p[2] - z)
      if (d < best && d < 0.15) { best = d; candidate = p }
    }
    if (!candidate) return
    const k = lattice.keyOf(candidate)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }, [lattice])

  useEffect(() => {
    if (!divRef.current) return

    const traces: Record<string, unknown>[] = []

    if (mode === 'builder') {
      const build = buildSolid(kind, numericParams)
      const m = build.mesh
      traces.push({
        type: 'mesh3d', x: m.x, y: m.y, z: m.z, i: m.i, j: m.j, k: m.k,
        color, opacity: 0.92, showscale: false,
        lighting: { ambient: 0.55, diffuse: 0.7, specular: 0.3 },
      })
      for (const chain of chainSegments(build.edges)) {
        traces.push({
          type: 'scatter3d', mode: 'lines',
          x: chain.map(p => p[0]), y: chain.map(p => p[1]), z: chain.map(p => p[2]),
          line: { color: shade(color, 0.45), width: 3 },
          hoverinfo: 'skip', showlegend: false,
        })
      }
    } else {
      const candidates = lattice.pts
      traces.push({
        type: 'scatter3d', mode: 'markers',
        x: candidates.map(p => p[0]), y: candidates.map(p => p[1]), z: candidates.map(p => p[2]),
        marker: { size: 4.5, color: 'rgba(160,160,175,0.4)' },
        hoverinfo: 'none', showlegend: false,
      })
      if (hull) {
        const hh = hull
        traces.push({
          type: 'mesh3d', x: hh.vertices.map(v => v[0]), y: hh.vertices.map(v => v[1]), z: hh.vertices.map(v => v[2]),
          i: hh.faces.map(f => f[0]), j: hh.faces.map(f => f[1]), k: hh.faces.map(f => f[2]),
          color, opacity: 0.75, showscale: false,
          lighting: { ambient: 0.6, diffuse: 0.7, specular: 0.3 },
        })
        const edgeSet = new Set<string>()
        const segs: Segment[] = []
        for (const f of hh.faces) {
          const pairs: [[number, number], [number, number], [number, number]] = [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]]
          for (const [a, b] of pairs) {
            const k = Math.min(a, b) + '-' + Math.max(a, b)
            if (!edgeSet.has(k)) {
              edgeSet.add(k)
              segs.push([hh.vertices[a], hh.vertices[b]])
            }
          }
        }
        for (const chain of chainSegments(segs)) {
          traces.push({
            type: 'scatter3d', mode: 'lines',
            x: chain.map(p => p[0]), y: chain.map(p => p[1]), z: chain.map(p => p[2]),
            line: { color: shade(color, 0.45), width: 4 },
            hoverinfo: 'skip', showlegend: false,
          })
        }
      }
      const sel = [...selected].map(k => k.split(',').map(Number) as [number, number, number])
      traces.push({
        type: 'scatter3d', mode: 'markers',
        x: sel.map(p => p[0]), y: sel.map(p => p[1]), z: sel.map(p => p[2]),
        marker: { size: 9, color: hexToRgba(color, 1), line: { color: '#fff', width: 1 } },
        hoverinfo: 'none', showlegend: false,
      })
    }

    const handleClick = (data: { points?: Array<{ x?: number; y?: number; z?: number }> }) => {
      if (mode !== 'points') return
      const pt = data.points?.[0]
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
        togglePoint(pt.x, pt.y, typeof pt.z === 'number' ? pt.z : 0)
      }
    }

    const gen = ++genRef.current
    Plotly.react(idRef.current, traces, {
      height: 470,
      margin: { l: 10, r: 10, t: 10, b: 10 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#a0a6b8', size: 11 },
      scene: sceneLayout,
      colorway: [color],
    }, { responsive: true, displayModeBar: false, displaylogo: false }).then((gd: any) => {
      const g = gd as unknown as { on: Function; removeListener: Function }
      if (gen !== genRef.current) return
      if (gdRef.current && handlerRef.current) gdRef.current.removeListener('plotly_click', handlerRef.current)
      handlerRef.current = handleClick
      gdRef.current = g
      g.on('plotly_click', handleClick)
    })

    return () => {
      genRef.current += 1
      if (gdRef.current && handlerRef.current) gdRef.current.removeListener('plotly_click', handlerRef.current)
      handlerRef.current = null
      gdRef.current = null
    }
  }, [mode, kind, numericParams, color, lattice, hull, selected, togglePoint])

  const metrics = mode === 'builder' ? solidMetrics(kind, numericParams, unit) : null

  return (
    <div className="page solids-page">
      <header className="solids-header">
        <h2>3D Solids</h2>
        <p className="solids-desc">
          Build solids from dimensions or sketch them from points on a 3D grid. Drag to rotate, scroll to zoom.
        </p>
      </header>

      <div className="solids-toolbar">
        <div className="seg">
          <button className={`seg-btn ${mode === 'builder' ? 'active' : ''}`} onClick={() => setMode('builder')}>From dimensions</button>
          <button className={`seg-btn ${mode === 'points' ? 'active' : ''}`} onClick={() => setMode('points')}>From points</button>
        </div>
        <div className="seg">
          <button className={`seg-btn ${unit === 'm' ? 'active' : ''}`} onClick={() => setUnit('m')}>m</button>
          <button className={`seg-btn ${unit === 'cm' ? 'active' : ''}`} onClick={() => setUnit('cm')}>cm</button>
        </div>
        <label className="color-label">
          Color
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        </label>
      </div>

      {mode === 'builder' && (
        <div className="solids-controls">
          <div className="shape-grid">
            {KINDS.map(k => (
              <button key={k} className={`shape-btn ${kind === k ? 'active' : ''}`} onClick={() => pickKind(k)}>
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <div className="param-row">
            {PARAM_DEFS[kind].map(pd => (
              <label key={pd.key} className="param-group">
                {pd.label} ({unit})
                <input
                  className="param-input" type="number" min="0.05" step="any"
                  value={params[pd.key] ?? ''}
                  onChange={e => setParams(prev => ({ ...prev, [pd.key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === 'points' && (
        <div className="solids-controls points-controls">
          <label className="param-group">
            Grid range
            <input className="param-input" type="number" min="1" max="10" value={rangeS} onChange={e => setRangeS(e.target.value)} />
          </label>
          <label className="param-group">
            Grid step
            <input className="param-input" type="number" min="0.25" max="5" step="0.25" value={stepS} onChange={e => setStepS(e.target.value)} />
          </label>
          <button className="btn-reset" onClick={() => setSelected(new Set())}>Clear points</button>
          <span className="hint">Click points to add / remove vertices — the app builds the convex hull.</span>
        </div>
      )}

      <div className="solids-cols">
        <div className="card-plot">
          <div id={idRef.current} ref={divRef} className="solids-plot" />
        </div>

        <div className="card-metrics">
          {mode === 'builder' && metrics ? (
            <>
              <h3 className="metrics-title">{KIND_LABELS[kind]}</h3>
              <div className="metric-row">
                <span className="metric-label">Volume</span>
                <span className="metric-value">{fmt(metrics.volume)} {unit}{'³'}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Surface area</span>
                <span className="metric-value">{fmt(metrics.surface)} {unit}{'²'}</span>
              </div>
              {metrics.extra.map(x => (
                <div key={x.name} className="metric-row">
                  <span className="metric-label">{x.name}</span>
                  <span className="metric-value">{x.value}</span>
                </div>
              ))}
              <h4 className="metrics-sub">Angles</h4>
              <table className="angle-table">
                <tbody>
                  {metrics.angles.map(a => (
                    <tr key={a.name}>
                      <td className="angle-name">{a.name}</td>
                      <td className="angle-value">{a.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <h3 className="metrics-title">Points to solid</h3>
              {hull ? (
                <>
                  <div className="metric-row">
                    <span className="metric-label">Volume</span>
                    <span className="metric-value">{fmt(hull.volume)} {unit}{'³'}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Surface area</span>
                    <span className="metric-value">{fmt(hull.surface)} {unit}{'²'}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Hull vertices</span>
                    <span className="metric-value">{hull.vertices.length} / {selected.size} selected</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Faces (triangles)</span>
                    <span className="metric-value">{hull.faces.length}</span>
                  </div>
                </>
              ) : (
                <p className="hint-no-hull">Select at least 4 non-coplanar points to see the convex hull, volume and surface area.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
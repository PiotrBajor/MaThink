import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import { polygonArea, polygonPerimeter, interiorAngles, isSelfIntersecting, isConvex, type Pt } from '../lib/geom2d'
import './Shapes.css'

const clampNum = (v: string, lo: number, hi: number, fallback: number) => {
  const n = parseFloat(v)
  if (isNaN(n)) return fallback
  return Math.min(hi, Math.max(lo, n))
}

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

interface Lattice2D { pts: Pt[]; keyOf: (p: Pt) => string }

function makeLattice(range: number, step: number): Lattice2D {
  const pts: Pt[] = []
  const vals: number[] = []
  for (let v = -range; v <= range + 1e-9; v += step) vals.push(Math.round((v / step) * 1e9) / 1e9 * step)
  for (const y of vals) for (const x of vals) pts.push({ x, y })
  const keyOf = (p: Pt) => `${Math.round(p.x * 1000) / 1000},${Math.round(p.y * 1000) / 1000}`
  return { pts, keyOf }
}

export default function Shapes() {
  const [rangeS, setRangeS] = useState('5')
  const [stepS, setStepS] = useState('1')
  const [unit, setUnit] = useState<'m' | 'cm'>('m')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [color, setColor] = useState('#27ae60')
  const divRef = useRef<HTMLDivElement>(null)
  const idRef = useRef('sh-' + Math.random().toString(36).slice(2, 9))
  const gdRef = useRef<{ on: Function; removeListener: Function } | null>(null)
  const handlerRef = useRef<((data: { points?: Array<{ x?: number; y?: number }> }) => void) | null>(null)
  const genRef = useRef(0)

  const lattice = useMemo(
    () => makeLattice(clampNum(rangeS, 2, 12, 5), Math.max(0.25, clampNum(stepS, 0.25, 4, 1))),
    [rangeS, stepS],
  )

  const selPts = useMemo<Pt[]>(() => [...selected].map(k => {
    const [x, y] = k.split(',').map(Number)
    return { x, y }
  }), [selected])

  const metrics = useMemo(() => {
    if (selPts.length < 3) return null
    return {
      area: polygonArea(selPts),
      perimeter: polygonPerimeter(selPts),
      angles: interiorAngles(selPts),
      selfIntersect: isSelfIntersecting(selPts),
      convex: isConvex(selPts),
    }
  }, [selPts])

  const togglePoint = useCallback((x: number, y: number) => {
    let candidate: Pt | null = null
    let best = Infinity
    for (const p of lattice.pts) {
      const d = Math.hypot(p.x - x, p.y - y)
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
    const annotations: Record<string, unknown>[] = []

    if (metrics && selPts.length > 0) {
      const xs = selPts.map(p => p.x)
      const ys = selPts.map(p => p.y)
      xs.push(selPts[0].x)
      ys.push(selPts[0].y)
      traces.push({
        type: 'scatter', mode: 'lines+markers',
        x: xs, y: ys,
        line: { color, width: 2.5 },
        marker: { size: 9, color, line: { color: '#fff', width: 1 } },
        fill: 'toself',
        fillcolor: hexToRgba(color, 0.16),
        hoverinfo: 'skip', showlegend: false,
      })
      metrics.angles.forEach((a, i) => {
        annotations.push({
          x: selPts[i].x + 0.28,
          y: selPts[i].y + 0.28,
          text: Math.round(a) + '°',
          showarrow: false,
          font: { size: 11, color },
        })
      })
      selPts.forEach((p, i) => {
        annotations.push({
          x: p.x, y: p.y,
          text: String(i + 1),
          showarrow: false,
          yshift: 12,
          font: { size: 10, color: '#a0a6b8' },
        })
      })
    }

    traces.push({
      type: 'scatter', mode: 'markers',
      x: lattice.pts.map(p => p.x), y: lattice.pts.map(p => p.y),
      marker: { size: 4, color: 'rgba(160,160,175,0.35)' },
      hoverinfo: 'none', showlegend: false,
    })

    const handleClick = (data: { points?: Array<{ x?: number; y?: number }> }) => {
      const pt = data.points?.[0]
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') togglePoint(pt.x, pt.y)
    }

    const gen = ++genRef.current
    Plotly.react(idRef.current, traces, {
      height: 470,
      margin: { l: 46, r: 16, t: 12, b: 40 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#a0a6b8', size: 11 },
      annotations,
      xaxis: {
        title: 'x',
        gridcolor: 'rgba(150,150,165,0.12)',
        zeroline: true,
        zerolinecolor: 'rgba(150,150,165,0.28)',
      },
      yaxis: {
        title: 'y',
        gridcolor: 'rgba(150,150,165,0.12)',
        zeroline: true,
        zerolinecolor: 'rgba(150,150,165,0.28)',
        scaleanchor: 'x',
        scaleratio: 1,
      },
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
  }, [lattice, selected, color, metrics, selPts, togglePoint])

  return (
    <div className="page shapes-page">
      <header className="shapes-header">
        <h2>2D Shapes</h2>
        <p className="shapes-desc">
          Draw a polygon by clicking points on the grid — the app computes its area, perimeter and interior angles.
        </p>
      </header>

      <div className="shapes-toolbar">
        <label className="param-group">
          Grid range
          <input className="param-input" type="number" min="2" max="12" value={rangeS} onChange={e => setRangeS(e.target.value)} />
        </label>
        <label className="param-group">
          Grid step
          <input className="param-input" type="number" min="0.25" max="4" step="0.25" value={stepS} onChange={e => setStepS(e.target.value)} />
        </label>
        <div className="seg">
          <button className={`seg-btn ${unit === 'm' ? 'active' : ''}`} onClick={() => setUnit('m')}>m</button>
          <button className={`seg-btn ${unit === 'cm' ? 'active' : ''}`} onClick={() => setUnit('cm')}>cm</button>
        </div>
        <label className="color-label">
          Color
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        </label>
        <button className="btn-reset" onClick={() => setSelected(new Set())}>Clear</button>
        <span className="hint">Click points to set vertices (first point closes the polygon).</span>
      </div>

      <div className="shapes-cols">
        <div className="card-plot">
          <div id={idRef.current} ref={divRef} className="shapes-plot" />
        </div>

        <div className="card-metrics">
          <h3 className="metrics-title">Polygon info</h3>
          {metrics ? (
            <>
              <div className="metric-row">
                <span className="metric-label">Area</span>
                <span className="metric-value">{metrics.area.toFixed(2)} {unit}{'²'}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Perimeter</span>
                <span className="metric-value">{metrics.perimeter.toFixed(2)} {unit}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Vertices</span>
                <span className="metric-value">{selPts.length}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Type</span>
                <span className="metric-value">
                  {metrics.selfIntersect ? 'Self-intersecting' : metrics.convex ? 'Convex' : 'Concave'}
                </span>
              </div>
              {metrics.selfIntersect && (
                <p className="warn-note">This shape crosses itself, so angles may be ambiguous.</p>
              )}
              <h4 className="metrics-sub">Interior angles</h4>
              <table className="angle-table">
                <thead>
                  <tr>
                    <th>Vertex</th>
                    <th>Coordinates</th>
                    <th>Angle</th>
                  </tr>
                </thead>
                <tbody>
                  {selPts.map((p, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="coord-cell">({fmt2(p.x)}, {fmt2(p.y)})</td>
                      <td className="angle-value">{metrics.angles[i].toFixed(1)}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="hint-no-hull">Add at least 3 points to start computing the shape.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const fmt2 = (v: number) => {
  const r = Math.round(v * 100) / 100
  return Number.isInteger(r) ? String(r) : String(r)
}
import { useRef, useEffect } from 'react'
import * as math from 'mathjs'
import Plotly from 'plotly.js-dist-min'

interface Props {
  expr: string
  color: string
}

export default function MathGraph({ expr, color }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const idRef = useRef('mg-' + Math.random().toString(36).slice(2, 9))

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const xVals: number[] = []
    const yVals: number[] = []
    let compiled: math.EvalFunction
    try { compiled = math.compile(expr) } catch { return }
    for (let x = -10; x <= 10; x += 0.15) {
      try {
        const y = compiled.evaluate({ x })
        if (typeof y === 'number' && isFinite(y) && Math.abs(y) < 1e5) {
          xVals.push(x)
          yVals.push(Math.round(y * 1000) / 1000)
        }
      } catch { /* skip */ }
    }
    Plotly.newPlot(idRef.current, [{
      x: xVals, y: yVals, mode: 'lines', line: { color, width: 2.5, shape: 'spline' },
    }], {
      height: 270,
      margin: { l: 46, r: 12, t: 12, b: 38 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#a0a6b8', size: 11 },
      xaxis: { showgrid: true, gridcolor: 'rgba(255,255,255,0.06)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.25)', fixedrange: true },
      yaxis: { showgrid: true, gridcolor: 'rgba(255,255,255,0.06)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.25)', fixedrange: true },
      displayModeBar: false,
    }, { responsive: true, displaylogo: false })
    return () => { if (divRef.current) divRef.current.innerHTML = '' }
  }, [expr, color])

  return <div id={idRef.current} ref={divRef} className="math-graph" />
}
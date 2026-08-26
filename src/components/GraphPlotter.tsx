import { useState, useRef, useEffect } from 'react'
import * as math from 'mathjs'
import Plotly from 'plotly.js-dist-min'
import './GraphPlotter.css'

export default function GraphPlotter() {
  const [funcInput, setFuncInput] = useState('sin(x)')
  const [xMin, setXMin] = useState('-20')
  const [xMax, setXMax] = useState('20')
  const [yMin, setYMin] = useState('-10')
  const [yMax, setYMax] = useState('10')
  const [step, setStep] = useState('0.01')
  const [error, setError] = useState('')
  const [plots, setPlots] = useState<{ expr: string; color: string }[]>([
    { expr: 'sin(x)', color: '#6c5ce7' },
  ])
  const plotRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef({ xMin: -20, xMax: 20, yMin: -10, yMax: 10 })

  const colors = ['#6c5ce7', '#e74c3c', '#2ecc71', '#f39c12', '#3498db', '#e91e63', '#00bcd4', '#ff9800']

  const generatePlot = (rXMin?: number, rXMax?: number, rYMin?: number, rYMax?: number) => {
    if (!plotRef.current) return

    const xMinVal = rXMin ?? parseFloat(xMin)
    const xMaxVal = rXMax ?? parseFloat(xMax)
    const stepVal = parseFloat(step)

    if (isNaN(xMinVal) || isNaN(xMaxVal) || isNaN(stepVal) || stepVal <= 0 || xMinVal >= xMaxVal) {
      setError('Invalid X range or step')
      return
    }

    const traces: any[] = []

    for (const p of plots) {
      try {
        const xVals: number[] = []
        const yVals: number[] = []
        const compiled = math.compile(p.expr)

        for (let x = xMinVal; x <= xMaxVal; x += stepVal) {
          try {
            const y = compiled.evaluate({ x, e: Math.E, pi: Math.PI })
            if (typeof y === 'number' && isFinite(y) && Math.abs(y) < 1e6) {
              xVals.push(x)
              yVals.push(y)
            }
          } catch { /* skip */ }
        }

        traces.push({
          x: xVals,
          y: yVals,
          type: 'scatter',
          mode: 'lines',
          name: p.expr,
          line: { color: p.color, width: 2 },
        })
      } catch {
        setError(`Error in expression: ${p.expr}`)
        return
      }
    }

    if (traces.length === 0) {
      setError('No data to display')
      return
    }

    const yMinVal = rYMin ?? parseFloat(yMin)
    const yMaxVal = rYMax ?? parseFloat(yMax)

    const layout: any = {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#141414',
      font: { color: '#a0a0a0', family: 'Segoe UI, sans-serif' },
      xaxis: {
        gridcolor: '#2a2a2a',
        zerolinecolor: '#444',
        range: [xMinVal, xMaxVal],
        title: 'x',
      },
      yaxis: {
        gridcolor: '#2a2a2a',
        zerolinecolor: '#444',
        range: [yMinVal, yMaxVal],
        title: 'y',
      },
      dragmode: 'pan',
      margin: { l: 50, r: 30, t: 30, b: 50 },
      legend: {
        bgcolor: 'rgba(20,20,20,0.8)',
        bordercolor: '#2a2a2a',
        borderwidth: 1,
        font: { color: '#e0e0e0' },
      },
    }

    const config: any = {
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      displaylogo: false,
      responsive: true,
      scrollZoom: true,
    }

    Plotly.newPlot(plotRef.current, traces, layout, config).then(() => {
      (plotRef.current as any).on('plotly_relayout', (eventData: any) => {
        if (eventData['xaxis.range[0]'] !== undefined) {
          const newXMin = eventData['xaxis.range[0]']
          const newXMax = eventData['xaxis.range[1]']
          const newYMin = eventData['yaxis.range[0]']
          const newYMax = eventData['yaxis.range[1]']
          rangeRef.current = { xMin: newXMin, xMax: newXMax, yMin: newYMin, yMax: newYMax }
          setXMin(String(parseFloat(newXMin.toFixed(2))))
          setXMax(String(parseFloat(newXMax.toFixed(2))))
          setYMin(String(parseFloat(newYMin.toFixed(2))))
          setYMax(String(parseFloat(newYMax.toFixed(2))))
          generatePlot(newXMin, newXMax, newYMin, newYMax)
        }
      })
    })

    setError('')
  }

  useEffect(() => {
    generatePlot()
  }, [plots])

  const addPlot = () => {
    if (!funcInput.trim()) return
    const existing = plots.find(p => p.expr === funcInput)
    if (existing) {
      setError('This expression is already added')
      return
    }
    const color = colors[plots.length % colors.length]
    setPlots(prev => [...prev, { expr: funcInput, color }])
    setError('')
  }

  const removePlot = (index: number) => {
    setPlots(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="graph-plotter">
      <div className="graph-header">
        <h2>Function Graphs</h2>
        <p className="graph-desc">Enter a function and see its graph in the coordinate system</p>
      </div>

      <div className="graph-controls">
        <div className="func-input-row">
          <div className="func-input-group">
            <label>f(x) =</label>
            <input
              type="text"
              value={funcInput}
              onChange={e => setFuncInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlot()}
              placeholder="e.g. sin(x), x^2, log(x)"
              className="func-input"
            />
          </div>
          <button className="btn-add-func" onClick={addPlot}>Add</button>
          <button className="btn-redraw" onClick={() => generatePlot()}>Draw</button>
        </div>

        <div className="range-controls">
          <div className="range-group">
            <label>X min</label>
            <input type="number" value={xMin} onChange={e => setXMin(e.target.value)} step="any" />
          </div>
          <div className="range-group">
            <label>X max</label>
            <input type="number" value={xMax} onChange={e => setXMax(e.target.value)} step="any" />
          </div>
          <div className="range-group">
            <label>Y min</label>
            <input type="number" value={yMin} onChange={e => setYMin(e.target.value)} step="any" />
          </div>
          <div className="range-group">
            <label>Y max</label>
            <input type="number" value={yMax} onChange={e => setYMax(e.target.value)} step="any" />
          </div>
          <div className="range-group">
            <label>Step</label>
            <input type="number" value={step} onChange={e => setStep(e.target.value)} step="any" min="0.001" />
          </div>
        </div>
      </div>

      {error && <div className="graph-error">{error}</div>}

      <div className="active-plots">
        {plots.map((p, i) => (
          <div key={i} className="plot-tag" style={{ borderColor: p.color }}>
            <span className="plot-color" style={{ background: p.color }} />
            <span className="plot-expr">{p.expr}</span>
            <button className="plot-remove" onClick={() => removePlot(i)}>x</button>
          </div>
        ))}
      </div>

      <div className="plot-container" ref={plotRef} />
    </div>
  )
}

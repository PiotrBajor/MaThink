import { useState, useRef, useEffect, type ReactNode } from 'react'
import Plotly from 'plotly.js-dist-min'
import './Delta.css'

function DeltaGraph({ a, b, c, roots }: { a: number; b: number; c: number; roots: number[] }) {
  const divRef = useRef<HTMLDivElement>(null)
  const idRef = useRef('dg-' + Math.random().toString(36).slice(2, 9))

  useEffect(() => {
    if (!divRef.current) return
    const vx = -b / (2 * a)
    const span = Math.max(1.5, Math.sqrt(Math.max(1, Math.abs(b * b - 4 * a * c))) * 1.4, Math.abs(vx) * 0.6 + 1)
    const xMin = vx - span, xMax = vx + span
    const xs: number[] = [], ys: number[] = []
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 120) { xs.push(x); ys.push(a * x * x + b * x + c) }
    const traces: Record<string, unknown>[] = [
      { x: xs, y: ys, mode: 'lines', line: { color: '#6c5ce7', width: 2.5 }, name: '' },
    ]
    if (roots.length > 0) {
      traces.push({ x: roots, y: roots.map(r => a * r * r + b * r + c), mode: 'markers', marker: { color: '#2ecc71', size: 9 }, name: '' })
      traces.push({ x: [vx], y: [a * vx * vx + b * vx + c], mode: 'markers', marker: { color: '#fdcb6e', size: 7, symbol: 'x' }, name: '' })
    }
    Plotly.newPlot(idRef.current, traces, {
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
  }, [a, b, c, roots])

  return <div id={idRef.current} ref={divRef} className="delta-graph" />
}

function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="frac">
      <span className="frac-num">{num}</span>
      <span className="frac-den">{den}</span>
    </span>
  )
}

function negB(b: number): ReactNode {
  if (b === 0) return null
  return b < 0 ? String(-b) : '\u2212' + String(b)
}

interface Props {
  onResult: (input: string, result: string) => void
}

const SUPERSCRIPTS: Record<string, string> = {
  '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
  '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
  '8': '\u2078', '9': '\u2079',
}

function toSuperscript(n: string): string {
  return n.split('').map(c => SUPERSCRIPTS[c] || c).join('')
}

interface DeltaResult {
  a: number
  b: number
  c: number
  delta: number
  discriminant: string
  x1?: number
  x2?: number
  roots: number[]
  steps: JSX.Element[]
}

export default function Delta({ onResult }: Props) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [c, setC] = useState('')
  const [result, setResult] = useState<DeltaResult | null>(null)
  const [error, setError] = useState('')

  const calculate = () => {
    const aVal = parseFloat(a)
    const bVal = parseFloat(b)
    const cVal = parseFloat(c)

    if (isNaN(aVal) || isNaN(bVal) || isNaN(cVal)) {
      setError('Enter all coefficients')
      setResult(null)
      return
    }

    if (aVal === 0) {
      setError('Coefficient a cannot be zero')
      setResult(null)
      return
    }

    const delta = bVal * bVal - 4 * aVal * cVal
    const bStr = String(bVal)
    const aStr = String(aVal)
    const cStr = String(cVal)
    const twoA = 2 * aVal

    const res: DeltaResult = {
      a: aVal,
      b: bVal,
      c: cVal,
      delta,
      discriminant: '',
      roots: [],
      steps: [],
    }

    const inputStr = `a=${aVal}, b=${bVal}, c=${cVal}`
    const bSup = toSuperscript('2')

    if (delta > 0) {
      const x1 = (-bVal - Math.sqrt(delta)) / twoA
      const x2 = (-bVal + Math.sqrt(delta)) / twoA
      res.x1 = x1
      res.x2 = x2
      res.roots = [x1, x2]
      res.discriminant = 'Delta > 0 \u2014 two distinct real roots'
      res.steps = [
        <>Delta = {bStr}{bSup} {'\u2212'} 4 {'\u00B7'} {aStr} {'\u00B7'} {cStr} = {delta}</>,
        <>x{'\u2081'} = <Frac num={<>{negB(bVal)} {'\u2212'} {'\u221A'}{delta}</>} den={twoA} /> = <strong>{parseFloat(x1.toFixed(6))}</strong></>,
        <>x{'\u2082'} = <Frac num={<>{negB(bVal)} {'+'}{'\u00A0'}{'\u221A'}{delta}</>} den={twoA} /> = <strong>{parseFloat(x2.toFixed(6))}</strong></>,
      ]
    } else if (delta === 0) {
      const x0 = -bVal / twoA
      res.x1 = x0
      res.roots = [x0]
      res.discriminant = 'Delta = 0 \u2014 one repeated root'
      res.steps = [
        <>Delta = {bStr}{bSup} {'\u2212'} 4 {'\u00B7'} {aStr} {'\u00B7'} {cStr} = 0</>,
        <>x{'\u2080'} = <Frac num={negB(bVal) ?? '0'} den={twoA} /> = <strong>{parseFloat(x0.toFixed(6))}</strong></>,
      ]
    } else {
      res.discriminant = 'Delta < 0 \u2014 no real roots'
      const absDelta = -delta
      res.steps = [
        <>Delta = {bStr}{bSup} {'\u2212'} 4 {'\u00B7'} {aStr} {'\u00B7'} {cStr} = {delta}</>,
        <>x{'\u2081'} = <Frac num={<>{negB(bVal)} {'\u2212'} i{'\u00B7'}{'\u221A'}{absDelta}</>} den={twoA} /> </>,
        <>x{'\u2082'} = <Frac num={<>{negB(bVal)} {'+'} i{'\u00B7'}{'\u221A'}{absDelta}</>} den={twoA} /> </>,
      ]
    }

    setResult(res)
    setError('')
    onResult(inputStr, res.discriminant)
  }

  const clear = () => {
    setA('')
    setB('')
    setC('')
    setResult(null)
    setError('')
  }

  return (
    <div className="delta">
      <div className="delta-header">
        <h2>Delta Calculator</h2>
        <p className="delta-desc">Quadratic equation: ax{'\u00B2'} + bx + c = 0</p>
      </div>

      <div className="delta-form">
        <div className="equation-display">
          <span className="eq-a">{a || 'a'}</span>x{'\u00B2'} +
          <span className="eq-b"> {b || 'b'}</span>x +
          <span className="eq-c"> {c || 'c'}</span> = 0
        </div>

        <div className="coeff-inputs">
          <div className="coeff-group">
            <label>a</label>
            <input type="number" value={a} onChange={e => setA(e.target.value)} onKeyDown={e => e.key === 'Enter' && calculate()} placeholder="0" step="any" />
          </div>
          <div className="coeff-group">
            <label>b</label>
            <input type="number" value={b} onChange={e => setB(e.target.value)} onKeyDown={e => e.key === 'Enter' && calculate()} placeholder="0" step="any" />
          </div>
          <div className="coeff-group">
            <label>c</label>
            <input type="number" value={c} onChange={e => setC(e.target.value)} onKeyDown={e => e.key === 'Enter' && calculate()} placeholder="0" step="any" />
          </div>
        </div>

        <div className="delta-buttons">
          <button className="btn-calc" onClick={calculate}>Calculate</button>
          <button className="btn-reset" onClick={clear}>Clear</button>
        </div>
      </div>

      {error && <div className="delta-error">{error}</div>}

      {result && (
        <div className="delta-result">
          <div className={`delta-type ${result.delta > 0 ? 'positive' : result.delta === 0 ? 'zero' : 'negative'}`}>
            {result.discriminant}
          </div>

          <div className="delta-value">
            <span className="delta-symbol">{'\u0394'}</span> = <strong>{result.delta}</strong>
          </div>

          <div className="delta-steps">
            {result.steps.map((step, i) => (
              <div key={i} className="step">{step}</div>
            ))}
          </div>

          <DeltaGraph a={result.a} b={result.b} c={result.c} roots={result.roots} />

          {(result.x1 !== undefined || result.x2 !== undefined) && (
            <div className="delta-roots">
              {result.x1 !== undefined && (
                <div className="root-value">x{'\u2081'} = {parseFloat(result.x1.toFixed(6))}</div>
              )}
              {result.x2 !== undefined && (
                <div className="root-value">x{'\u2082'} = {parseFloat(result.x2.toFixed(6))}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

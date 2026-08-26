import { useState } from 'react'
import './Delta.css'

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
      steps: [],
    }

    const inputStr = `a=${aVal}, b=${bVal}, c=${cVal}`
    const bSup = toSuperscript('2')

    if (delta > 0) {
      const x1 = (-bVal - Math.sqrt(delta)) / twoA
      const x2 = (-bVal + Math.sqrt(delta)) / twoA
      res.x1 = x1
      res.x2 = x2
      res.discriminant = 'Delta > 0 \u2014 two distinct real roots'
      res.steps = [
        <>Delta = {bStr}{bSup} - 4 \u00B7 {aStr} \u00B7 {cStr} = {delta}</>,
        <>x{'\u2081'} = ({-bVal} - \u221A{delta}) / {twoA} = <strong>{parseFloat(x1.toFixed(6))}</strong></>,
        <>x{'\u2082'} = ({-bVal} + \u221A{delta}) / {twoA} = <strong>{parseFloat(x2.toFixed(6))}</strong></>,
      ]
    } else if (delta === 0) {
      const x0 = -bVal / twoA
      res.x1 = x0
      res.discriminant = 'Delta = 0 \u2014 one repeated root'
      res.steps = [
        <>Delta = {bStr}{bSup} - 4 \u00B7 {aStr} \u00B7 {cStr} = 0</>,
        <>x{'\u2080'} = {-bVal} / {twoA} = <strong>{parseFloat(x0.toFixed(6))}</strong></>,
      ]
    } else {
      res.discriminant = 'Delta < 0 \u2014 no real roots'
      const re = -bVal / twoA
      const im = Math.sqrt(-delta) / twoA
      res.steps = [
        <>Delta = {bStr}{bSup} - 4 \u00B7 {aStr} \u00B7 {cStr} = {delta}</>,
        <>x{'\u2081'} = {parseFloat(re.toFixed(6))} - {parseFloat(im.toFixed(6))}i</>,
        <>x{'\u2082'} = {parseFloat(re.toFixed(6))} + {parseFloat(im.toFixed(6))}i</>,
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

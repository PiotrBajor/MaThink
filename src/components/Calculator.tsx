import { useState, useEffect, useCallback, useRef } from 'react'
import * as math from 'mathjs'
import './Calculator.css'

interface Props {
  onResult: (input: string, result: string) => void
}

type CalcMode = 'standard' | 'scientific'

export default function Calculator({ onResult }: Props) {
  const [mode, setMode] = useState<CalcMode>('standard')
  const [expression, setExpression] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [showFraction, setShowFraction] = useState(false)
  const [fracWhole, setFracWhole] = useState('')
  const [fracNum, setFracNum] = useState('')
  const [fracDen, setFracDen] = useState('')
  const [mixedFrac, setMixedFrac] = useState(false)
  const displayRef = useRef<HTMLDivElement>(null)

  const insertAtCursor = useCallback((text: string) => {
    setExpression(prev => {
      const before = prev.slice(0, cursorPos)
      const after = prev.slice(cursorPos)
      return before + text + after
    })
    setCursorPos(prev => prev + text.length)
  }, [cursorPos])

  const evaluate = useCallback((expr: string) => {
    try {
      const val = math.evaluate(expr)
      const formatted = typeof val === 'number'
        ? (Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(10)).toString())
        : val.toString()
      setResult(formatted)
      setError('')
      onResult(expr, formatted)
    } catch {
      setError('Expression error')
      setResult('')
    }
  }, [onResult])

  const handleEqual = () => {
    if (expression.trim()) evaluate(expression)
  }

  const clearAll = () => { setExpression(''); setCursorPos(0); setResult(''); setError('') }
  const backspace = () => {
    if (cursorPos === 0) return
    setExpression(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos))
    setCursorPos(prev => prev - 1)
  }
  const deleteForward = () => {
    if (cursorPos >= expression.length) return
    setExpression(prev => prev.slice(0, cursorPos) + prev.slice(cursorPos + 1))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return

      if (e.key >= '0' && e.key <= '9') { insertAtCursor(e.key); e.preventDefault() }
      else if (e.key === '+') { insertAtCursor('+'); e.preventDefault() }
      else if (e.key === '-') { insertAtCursor('-'); e.preventDefault() }
      else if (e.key === '*') { insertAtCursor('*'); e.preventDefault() }
      else if (e.key === '/') { insertAtCursor('/'); e.preventDefault() }
      else if (e.key === '.') { insertAtCursor('.'); e.preventDefault() }
      else if (e.key === '(' || e.key === ')') { insertAtCursor(e.key); e.preventDefault() }
      else if (e.key === '^') { insertAtCursor('^'); e.preventDefault() }
      else if (e.key === 'Enter' || e.key === '=') { handleEqual(); e.preventDefault() }
      else if (e.key === 'Backspace') { backspace(); e.preventDefault() }
      else if (e.key === 'Delete') { deleteForward(); e.preventDefault() }
      else if (e.key === 'Escape') { clearAll(); e.preventDefault() }
      else if (e.key === '%') { insertAtCursor('/100'); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { setCursorPos(p => Math.max(0, p - 1)); e.preventDefault() }
      else if (e.key === 'ArrowRight') { setCursorPos(p => Math.min(expression.length, p + 1)); e.preventDefault() }
      else if (e.key === 'Home') { setCursorPos(0); e.preventDefault() }
      else if (e.key === 'End') { setCursorPos(expression.length); e.preventDefault() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expression, cursorPos])

  const handleDisplayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const clickX = e.clientX - rect.left + el.scrollLeft
    const charWidth = 9.6
    const pos = Math.round(clickX / charWidth)
    setCursorPos(Math.max(0, Math.min(expression.length, pos)))
  }

  const handleButton = (btn: string) => {
    if (btn === 'C') return clearAll()
    if (btn === 'BS') return backspace()
    if (btn === '=') return handleEqual()
    insertAtCursor(btn)
  }

  const insertFraction = () => {
    const n = fracNum.trim()
    const d = fracDen.trim()
    if (!n || !d) return

    if (mixedFrac) {
      const w = fracWhole.trim()
      if (w) {
        insertAtCursor(`(${w}+${n}/${d})`)
      } else {
        insertAtCursor(`(${n}/${d})`)
      }
    } else {
      insertAtCursor(`(${n}/${d})`)
    }
    setFracWhole('')
    setFracNum('')
    setFracDen('')
    setShowFraction(false)
  }

  const renderDisplay = () => {
    if (!expression) return <span className="cursor-holder">|</span>
    const before = expression.slice(0, cursorPos)
    const at = expression[cursorPos] || ''
    const after = expression.slice(cursorPos + 1)
    return (
      <>
        <span>{before}</span>
        <span className="cursor-char">{at || ' '}</span>
        <span>{after}</span>
      </>
    )
  }

  const standardButtons: string[][] = [
    ['C', '(', ')', 'BS'],
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '%', '+'],
  ]

  const scientificButtons: string[][] = [
    ['sin(', 'cos(', 'tan(', 'log(', 'ln('],
    ['asin(', 'acos(', 'atan(', 'log2(', 'log10('],
    ['sqrt(', 'cbrt(', 'abs(', 'pi', 'e'],
    ['C', '(', ')', '^', 'BS'],
    ['7', '8', '9', '/', '!'],
    ['4', '5', '6', '*', '%'],
    ['1', '2', '3', '-', '1/('],
    ['0', '.', 'sqrt(', '(', '+'],
  ]

  const getButtons = () => mode === 'standard' ? standardButtons : scientificButtons

  const formatLabel = (btn: string): string => {
    if (btn === 'BS') return '\u232B'
    if (btn === 'sqrt(') return '\u221A('
    if (btn === 'cbrt(') return '\u221B('
    if (btn === 'pi') return '\u03C0'
    if (btn === '1/(') return '1/('
    if (btn === '!') return '!'
    return btn
  }

  const isOp = (btn: string) => ['+', '-', '*', '/', '^'].includes(btn)

  return (
    <div className="calculator">
      <div className="calc-header">
        <h2>Calculator</h2>
        <div className="mode-tabs">
          <button className={`mode-tab ${mode === 'standard' ? 'active' : ''}`} onClick={() => setMode('standard')}>Standard</button>
          <button className={`mode-tab ${mode === 'scientific' ? 'active' : ''}`} onClick={() => setMode('scientific')}>Scientific</button>
        </div>
      </div>

      <div className="calc-display" ref={displayRef} onClick={handleDisplayClick}>
        <div className="display-expression">{renderDisplay()}</div>
        <div className={`display-result ${error ? 'error' : ''}`}>{error || result || ''}</div>
      </div>

      <div className="fraction-toggle-row">
        <button className="btn-fraction-toggle" onClick={() => setShowFraction(!showFraction)}>
          {showFraction ? 'Hide' : 'Fraction'} <span className="frac-icon">&#x2154;</span>
        </button>
      </div>

      {showFraction && (
        <div className="fraction-builder">
          <div className="fraction-visual">
            <div className="mixed-toggle">
              <label className="checkbox-label">
                <input type="checkbox" checked={mixedFrac} onChange={e => setMixedFrac(e.target.checked)} />
                Mixed number
              </label>
            </div>
            <div className="fraction-stack">
              {mixedFrac && (
                <div className="frac-part frac-whole">
                  <input
                    type="text"
                    value={fracWhole}
                    onChange={e => setFracWhole(e.target.value.replace(/[^0-9.\-]/g, ''))}
                    placeholder="0"
                    className="frac-input frac-whole-input"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="fraction-column">
                <div className="frac-part">
                  <input
                    type="text"
                    value={fracNum}
                    onChange={e => setFracNum(e.target.value.replace(/[^0-9.\-]/g, ''))}
                    placeholder="0"
                    className="frac-input"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="frac-line" />
                <div className="frac-part">
                  <input
                    type="text"
                    value={fracDen}
                    onChange={e => setFracDen(e.target.value.replace(/[^0-9.\-]/g, ''))}
                    placeholder="1"
                    className="frac-input"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
            <button className="btn-insert-frac" onClick={insertFraction}>Insert</button>
          </div>
        </div>
      )}

      <div className="calc-buttons">
        {getButtons().map((row, ri) => (
          <div key={ri} className="button-row">
            {row.map((btn, bi) => (
              <button
                key={bi}
                className={`calc-btn ${
                  btn === 'C' ? 'btn-danger' :
                  btn === '=' ? 'btn-equals' :
                  btn === 'BS' ? 'btn-action' :
                  isOp(btn) ? 'btn-op' :
                  mode === 'scientific' && ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'log(', 'ln(', 'log2(', 'log10('].includes(btn) ? 'btn-func' :
                  mode === 'scientific' && ['sqrt(', 'cbrt(', 'abs(', 'pi', 'e', '!', '1/('].includes(btn) ? 'btn-const' :
                  ''
                }`}
                onClick={() => handleButton(btn)}
              >
                {formatLabel(btn)}
              </button>
            ))}
          </div>
        ))}
        <div className="button-row">
          <button className="calc-btn btn-equals full-width" onClick={handleEqual}>=</button>
        </div>
      </div>
    </div>
  )
}

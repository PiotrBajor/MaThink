import { useState, lazy, Suspense } from 'react'
import './CalcPopover.css'

const Calculator = lazy(() => import('./Calculator'))

interface Props {
  onOpenChange?: (open: boolean) => void
}

export default function CalcPopover({ onOpenChange }: Props) {
  const [open, setOpen] = useState(false)

  const setOpenSafe = (v: boolean) => {
    setOpen(v)
    onOpenChange?.(v)
  }

  return (
    <>
      <button type="button" className="calc-popover-toggle" onClick={e => { e.stopPropagation(); setOpenSafe(!open) }}>
        <span className="calc-popover-glyph">&#x25A4;</span> Calc
      </button>
      {open && (
        <div className="calc-popover-backdrop" onClick={() => setOpenSafe(false)}>
          <div className="calc-popover-panel" onClick={e => e.stopPropagation()}>
            <div className="calc-popover-head">
              <span className="calc-popover-title">Calculator</span>
              <button type="button" className="calc-popover-close" onClick={() => setOpenSafe(false)} aria-label="Close calculator">
                &#x00D7;
              </button>
            </div>
            <div className="calc-popover-body">
              <Suspense fallback={<div className="calc-popover-loading">Loading calculator...</div>}>
                <Calculator onResult={() => {}} />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
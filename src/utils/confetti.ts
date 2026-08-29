const COLORS = ['#2ecc71', '#f39c12', '#6c5ce7', '#e74c3c', '#3498db', '#e67e22', '#ecf0f1']
let active = false

export function confetti(count = 60) {
  if (active) return
  const root = document.createElement('div')
  root.className = 'confetti-overlay'
  root.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 2000; overflow: hidden;'
  const w = window.innerWidth
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    const size = 6 + Math.random() * 8
    p.style.cssText = 'position:absolute; top:-20px; left:' + (Math.random() * 100) + '%; width:' + size + 'px; height:' + (size * 0.45) + 'px; background:' + COLORS[i % COLORS.length] + '; border-radius:2px;'
    p.style.animation = 'confetti-fall ' + (1.2 + Math.random() * 0.9) + 's linear ' + (Math.random() * 0.4) + 's forwards'
    p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)'
    p.style.left = (10 + Math.random() * (w - 20)) + 'px'
    root.appendChild(p)
  }
  document.body.appendChild(root)
  active = true
  window.setTimeout(() => { root.remove(); active = false }, 2800)
}
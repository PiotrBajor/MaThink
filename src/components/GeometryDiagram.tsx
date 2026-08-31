import './GeometryDiagram.css'

// --- Helpers ---
const C = {
  stroke: '#6c5ce7',
  strokeLight: '#a29bfe',
  fill: 'rgba(108,92,231,0.08)',
  accent: '#e67e22',
  accentFill: 'rgba(230,126,34,0.10)',
  green: '#2ecc71',
  greenFill: 'rgba(46,204,113,0.10)',
  red: '#e74c3c',
  text: '#e0e0e0',
  textDim: '#a0a0a0',
  grid: '#1e1e1e',
}

function P({ x, y, label, labelPos = 'top', color = C.text }: { x: number; y: number; label: string; labelPos?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'; color?: string }) {
  const dx = labelPos.includes('left') ? -8 : labelPos.includes('right') ? 8 : 0
  const dy = labelPos.includes('top') ? -10 : labelPos.includes('bottom') ? 16 : 0
  const anchor = labelPos.includes('left') ? 'end' : labelPos.includes('right') ? 'start' : 'middle'
  return (
    <>
      <circle cx={x} cy={y} r={3.5} fill={C.stroke} />
      <text x={x + dx} y={y + dy} textAnchor={anchor} fill={color} fontSize={13} fontFamily="'Cascadia Code','Fira Code',monospace" fontWeight={600}>{label}</text>
    </>
  )
}

function AngleArc({ cx, cy, r, startDeg, endDeg, color = C.accent }: { cx: number; cy: number; r: number; startDeg: number; endDeg: number; color?: string }) {
  const s = (startDeg * Math.PI) / 180
  const e = (endDeg * Math.PI) / 180
  const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
  const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={1.5} />
}

function RightAngleMark({ cx, cy, dx, dy, size = 12, color = C.accent }: { cx: number; cy: number; dx: number; dy: number; size?: number; color?: string }) {
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len, uy = dy / len
  const px = -uy, py = ux
  const x1 = cx + ux * size, y1 = cy + uy * size
  const x2 = cx + ux * size + px * size, y2 = cy + uy * size + py * size
  const x3 = cx + px * size, y3 = cy + py * size
  return <path d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`} fill="none" stroke={color} strokeWidth={1.5} />
}

// ============================================================
// FIGURES DIAGRAMS
// ============================================================

function DiagramAnglesBasic() {
  return (
    <svg viewBox="0 0 460 180" className="geom-diagram">
      {/* Acute */}
      <g transform="translate(50,140)">
        <line x1={0} y1={0} x2={80} y2={0} stroke={C.stroke} strokeWidth={2} />
        <line x1={0} y1={0} x2={65} y2={-55} stroke={C.stroke} strokeWidth={2} />
        <AngleArc cx={0} cy={0} r={28} startDeg={-40} endDeg={0} />
        <text x={32} y={-12} fill={C.accent} fontSize={12} fontWeight={600}>50&#176;</text>
        <text x={40} y={22} fill={C.textDim} fontSize={12}>acute</text>
      </g>
      {/* Right */}
      <g transform="translate(160,140)">
        <line x1={0} y1={0} x2={80} y2={0} stroke={C.stroke} strokeWidth={2} />
        <line x1={0} y1={0} x2={0} y2={-70} stroke={C.stroke} strokeWidth={2} />
        <RightAngleMark cx={0} cy={0} dx={80} dy={0} />
        <text x={12} y={22} fill={C.textDim} fontSize={12}>right</text>
      </g>
      {/* Obtuse */}
      <g transform="translate(290,140)">
        <line x1={0} y1={0} x2={80} y2={0} stroke={C.stroke} strokeWidth={2} />
        <line x1={0} y1={0} x2={-55} y2={-50} stroke={C.stroke} strokeWidth={2} />
        <AngleArc cx={0} cy={0} r={28} startDeg={-137} endDeg={0} />
        <text x={-10} y={-18} fill={C.accent} fontSize={12} fontWeight={600}>137&#176;</text>
        <text x={40} y={22} fill={C.textDim} fontSize={12}>obtuse</text>
      </g>
      {/* Straight */}
      <g transform="translate(400,140)">
        <line x1={-50} y1={0} x2={50} y2={0} stroke={C.stroke} strokeWidth={2} />
        <circle cx={0} cy={0} r={3.5} fill={C.stroke} />
        <AngleArc cx={0} cy={0} r={18} startDeg={180} endDeg={360} color={C.green} />
        <text x={0} y={-10} fill={C.green} fontSize={12} fontWeight={600}>180&#176;</text>
        <text x={0} y={22} fill={C.textDim} fontSize={12}>straight</text>
      </g>
    </svg>
  )
}

function DiagramParallelTransversal() {
  return (
    <svg viewBox="0 0 300 200" className="geom-diagram">
      {/* Parallel lines */}
      <line x1={20} y1={60} x2={280} y2={60} stroke={C.stroke} strokeWidth={2} />
      <line x1={20} y1={140} x2={280} y2={140} stroke={C.stroke} strokeWidth={2} />
      {/* Arrow marks on parallels */}
      <polygon points="148,56 156,60 148,64" fill={C.stroke} />
      <polygon points="148,136 156,140 148,144" fill={C.stroke} />
      {/* Transversal */}
      <line x1={90} y1={20} x2={190} y2={180} stroke={C.accent} strokeWidth={2} />
      {/* Angles */}
      <AngleArc cx={140} cy={60} r={20} startDeg={78} endDeg={180} />
      <text x={118} y={50} fill={C.accent} fontSize={11} fontWeight={600}>&#945;</text>
      <AngleArc cx={140} cy={60} r={20} startDeg={-102} endDeg={0} color={C.green} />
      <text x={155} y={50} fill={C.green} fontSize={11} fontWeight={600}>&#946;</text>
      <AngleArc cx={160} cy={140} r={20} startDeg={78} endDeg={180} color={C.green} />
      <text x={138} y={130} fill={C.green} fontSize={11} fontWeight={600}>&#946;</text>
      <AngleArc cx={160} cy={140} r={20} startDeg={-102} endDeg={0} />
      <text x={175} y={130} fill={C.accent} fontSize={11} fontWeight={600}>&#945;</text>
      {/* Labels */}
      <text x={275} y={55} fill={C.stroke} fontSize={12} fontWeight={600}>a</text>
      <text x={275} y={135} fill={C.stroke} fontSize={12} fontWeight={600}>b</text>
      <text x={195} y={25} fill={C.accent} fontSize={12} fontWeight={600}>t</text>
      <text x={30} y={190} fill={C.textDim} fontSize={11}>a &#8877; b, transversal t</text>
    </svg>
  )
}

function DiagramTriangleTypes() {
  return (
    <svg viewBox="0 0 460 140" className="geom-diagram">
      {/* Scalene */}
      <g transform="translate(20,10)">
        <polygon points="10,110 70,10 130,110" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <text x={60} y={130} textAnchor="middle" fill={C.textDim} fontSize={11}>scalene</text>
        <text x={25} y={68} fill={C.textDim} fontSize={10}>a</text>
        <text x={88} y={50} fill={C.textDim} fontSize={10}>b</text>
        <text x={55} y={115} fill={C.textDim} fontSize={10}>c</text>
      </g>
      {/* Isosceles */}
      <g transform="translate(170,10)">
        <polygon points="60,0 0,110 120,110" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <text x={60} y={130} textAnchor="middle" fill={C.textDim} fontSize={11}>isosceles</text>
        {/* Tick marks */}
        <line x1={22} y1={52} x2={28} y2={58} stroke={C.stroke} strokeWidth={1.5} />
        <line x1={92} y1={52} x2={98} y2={58} stroke={C.stroke} strokeWidth={1.5} />
      </g>
      {/* Equilateral */}
      <g transform="translate(320,10)">
        <polygon points="60,0 0,104 120,104" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <text x={60} y={124} textAnchor="middle" fill={C.textDim} fontSize={11}>equilateral</text>
        <line x1={22} y1={50} x2={28} y2={56} stroke={C.stroke} strokeWidth={1.5} />
        <line x1={92} y1={50} x2={98} y2={56} stroke={C.stroke} strokeWidth={1.5} />
        <line x1={56} y1={108} x2={64} y2={108} stroke={C.stroke} strokeWidth={1.5} />
        <text x={60} y={-4} textAnchor="middle" fill={C.accent} fontSize={11} fontWeight={600}>60&#176;</text>
      </g>
    </svg>
  )
}

function DiagramTriangleHeight() {
  return (
    <svg viewBox="0 0 280 200" className="geom-diagram">
      <polygon points="40,160 140,20 240,160" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Height line (dashed) */}
      <line x1={140} y1={20} x2={140} y2={160} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <RightAngleMark cx={140} cy={160} dx={0} dy={-10} size={10} />
      <text x={148} y={95} fill={C.accent} fontSize={13} fontWeight={600}>h</text>
      <text x={135} y={175} textAnchor="end" fill={C.stroke} fontSize={13} fontWeight={600}>b</text>
      <P x={140} y={20} label="A" labelPos="top" />
      <P x={40} y={160} label="B" labelPos="bottomLeft" />
      <P x={240} y={160} label="C" labelPos="bottomRight" />
      <text x={140} y={195} textAnchor="middle" fill={C.textDim} fontSize={11}>base b, height h</text>
    </svg>
  )
}

function DiagramPythagorean() {
  const a = 60, b = 80, ox = 60, oy = 140
  return (
    <svg viewBox="0 0 320 240" className="geom-diagram">
      {/* Right triangle */}
      <polygon points={`${ox},${oy} ${ox + a},${oy} ${ox},${oy - b}`} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <RightAngleMark cx={ox} cy={oy} dx={a} dy={0} size={12} />
      <P x={ox} y={oy} label="a" labelPos="bottomLeft" />
      <P x={ox + a} y={oy} label="B" labelPos="bottomRight" />
      <P x={ox} y={oy - b} label="A" labelPos="topLeft" />
      <text x={ox + a / 2} y={oy + 18} textAnchor="middle" fill={C.stroke} fontSize={13} fontWeight={600}>{`a = ${(a / 10).toFixed(0)}`}</text>
      <text x={ox - 12} y={oy - b / 2} textAnchor="end" fill={C.stroke} fontSize={13} fontWeight={600}>{`b = ${(b / 10).toFixed(0)}`}</text>
      <text x={ox + a / 2 + 14} y={oy - b / 2 - 4} fill={C.green} fontSize={13} fontWeight={600}>{`c = ${(Math.sqrt(a * a + b * b) / 10).toFixed(0)}`}</text>
      {/* Squares on sides */}
      <rect x={ox} y={oy} width={a} height={a} fill="rgba(108,92,231,0.05)" stroke={C.strokeLight} strokeWidth={1} strokeDasharray="4,3" />
      <rect x={ox - b} y={oy - b} width={b} height={b} fill="rgba(46,204,113,0.05)" stroke={C.green} strokeWidth={1} strokeDasharray="4,3" />
      <text x={ox + a / 2} y={oy + a / 2 + 4} textAnchor="middle" fill={C.strokeLight} fontSize={11}>a&#178;</text>
      <text x={ox - b / 2} y={oy - b / 2 + 4} textAnchor="middle" fill={C.green} fontSize={11}>b&#178;</text>
      <text x={160} y={230} textAnchor="middle" fill={C.textDim} fontSize={12}>c&#178; = a&#178; + b&#178;</text>
    </svg>
  )
}

function DiagramRectangleSquare() {
  return (
    <svg viewBox="0 0 380 160" className="geom-diagram">
      {/* Square */}
      <g transform="translate(20,10)">
        <rect x={0} y={0} width={100} height={100} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <line x1={0} y1={0} x2={100} y2={100} stroke={C.accent} strokeWidth={1.5} strokeDasharray="4,3" />
        <text x={50} y={118} textAnchor="middle" fill={C.stroke} fontSize={12} fontWeight={600}>a = 5</text>
        <text x={50} y={55} textAnchor="middle" fill={C.accent} fontSize={11}>d = 5&#8730;2</text>
        <text x={50} y={-4} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Square</text>
      </g>
      {/* Rectangle */}
      <g transform="translate(180,20)">
        <rect x={0} y={0} width={160} height={80} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <line x1={0} y1={0} x2={160} y2={80} stroke={C.accent} strokeWidth={1.5} strokeDasharray="4,3" />
        <text x={80} y={-4} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Rectangle</text>
        <text x={80} y={98} textAnchor="middle" fill={C.stroke} fontSize={12}>a</text>
        <text x={170} y={45} fill={C.stroke} fontSize={12}>b</text>
        <text x={75} y={45} fill={C.accent} fontSize={11}>d = &#8730;(a&#178;+b&#178;)</text>
      </g>
    </svg>
  )
}

function DiagramParallelogram() {
  return (
    <svg viewBox="0 0 280 180" className="geom-diagram">
      <polygon points="60,20 240,20 210,150 30,150" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Height */}
      <line x1={60} y1={20} x2={60} y2={150} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <RightAngleMark cx={60} cy={150} dx={0} dy={-10} size={10} />
      <text x={45} y={90} fill={C.accent} fontSize={13} fontWeight={600}>h</text>
      <text x={135} y={165} textAnchor="middle" fill={C.stroke} fontSize={13} fontWeight={600}>base b</text>
      <text x={135} y={15} textAnchor="middle" fill={C.textDim} fontSize={11}>A = b &#215; h</text>
    </svg>
  )
}

function DiagramTrapezoid() {
  return (
    <svg viewBox="0 0 280 180" className="geom-diagram">
      <polygon points="80,30 200,30 240,140 40,140" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <text x={140} y={25} textAnchor="middle" fill={C.stroke} fontSize={12} fontWeight={600}>a</text>
      <text x={140} y={155} textAnchor="middle" fill={C.stroke} fontSize={12} fontWeight={600}>b</text>
      {/* Height */}
      <line x1={200} y1={30} x2={200} y2={140} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <RightAngleMark cx={200} cy={140} dx={0} dy={-10} size={10} />
      <text x={210} y={90} fill={C.accent} fontSize={13} fontWeight={600}>h</text>
      <text x={140} y={175} textAnchor="middle" fill={C.textDim} fontSize={11}>A = &#189; &#215; (a + b) &#215; h</text>
    </svg>
  )
}

function DiagramCircleParts() {
  const cx = 150, cy = 110, r = 80
  return (
    <svg viewBox="0 0 340 240" className="geom-diagram">
      <circle cx={cx} cy={cy} r={r} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3.5} fill={C.stroke} />
      <text x={cx + 4} y={cy - 6} fill={C.stroke} fontSize={11}>O</text>
      {/* Radius */}
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={C.green} strokeWidth={2} />
      <text x={cx + r / 2} y={cy - 8} textAnchor="middle" fill={C.green} fontSize={12} fontWeight={600}>r</text>
      {/* Diameter */}
      <line x1={cx - r} y1={cy + 10} x2={cx + r} y2={cy + 10} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <text x={cx} y={cy + 26} textAnchor="middle" fill={C.accent} fontSize={12}>d = 2r</text>
      {/* Chord */}
      <line x1={cx - 50} y1={cy - 65} x2={cx + 55} y2={cy - 45} stroke={C.strokeLight} strokeWidth={1.5} />
      <text x={cx + 5} y={cy - 62} fill={C.strokeLight} fontSize={11}>chord</text>
      {/* Tangent */}
      <line x1={cx + r} y1={cy - 50} x2={cx + r} y2={cy + 50} stroke={C.red} strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={cx + r + 8} y={cy - 38} fill={C.red} fontSize={11}>tangent</text>
      {/* Labels */}
      <text x={cx} y={220} textAnchor="middle" fill={C.textDim} fontSize={11}>C = 2&#960;r, A = &#960;r&#178;</text>
    </svg>
  )
}

function DiagramCircleSector() {
  const cx = 150, cy = 120, r = 80
  const a1 = (-90 * Math.PI) / 180, a2 = (0 * Math.PI) / 180
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
  const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
  const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`
  return (
    <svg viewBox="0 0 300 220" className="geom-diagram">
      <circle cx={cx} cy={cy} r={r} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <path d={path} fill={C.accentFill} stroke={C.accent} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3.5} fill={C.stroke} />
      <line x1={cx} y1={cy} x2={x1} y2={y1} stroke={C.stroke} strokeWidth={2} />
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={C.stroke} strokeWidth={2} />
      <text x={cx + r / 2 - 4} y={cy - 6} fill={C.stroke} fontSize={12} fontWeight={600}>r</text>
      <AngleArc cx={cx} cy={cy} r={25} startDeg={-90} endDeg={0} />
      <text x={cx + 14} y={cy - 14} fill={C.accent} fontSize={12} fontWeight={600}>&#945;</text>
      <text x={cx - r + 5} y={cy + 10} fill={C.strokeLight} fontSize={11}>arc l</text>
      <text x={cx} y={205} textAnchor="middle" fill={C.textDim} fontSize={11}>l = (&#945;/360) &#215; 2&#960;r</text>
    </svg>
  )
}

function DiagramPolygonInterior() {
  // Regular pentagon
  const cx = 140, cy = 110, r = 70
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = ((i * 72 - 90) * Math.PI) / 180
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
  // Center
  const angles = Array.from({ length: 5 }, (_, i) => {
    const a = ((i * 72 - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  return (
    <svg viewBox="0 0 300 220" className="geom-diagram">
      <polygon points={pts} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3.5} fill={C.accent} />
      {angles.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={C.accent} strokeWidth={1} strokeDasharray="4,3" />
      ))}
      <AngleArc cx={cx} cy={cy} r={18} startDeg={-90 - 36} endDeg={-90 + 36} />
      <text x={cx} y={cy - 25} textAnchor="middle" fill={C.accent} fontSize={11} fontWeight={600}>&#946; = 360/n</text>
      <text x={cx} y={200} textAnchor="middle" fill={C.textDim} fontSize={11}>Interior = (n-2)&#215;180/n, Central &#946; = 360/n</text>
    </svg>
  )
}

function DiagramSimilarity() {
  return (
    <svg viewBox="0 0 340 180" className="geom-diagram">
      {/* Small triangle */}
      <g transform="translate(30,20)">
        <polygon points="0,120 40,0 80,120" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <text x={40} y={140} textAnchor="middle" fill={C.stroke} fontSize={11}>3</text>
        <text x={-5} y={65} fill={C.stroke} fontSize={11}>4</text>
        <text x={75} y={65} fill={C.stroke} fontSize={11}>5</text>
      </g>
      {/* Arrow */}
      <text x={145} y={85} fill={C.textDim} fontSize={20}>&#8594;</text>
      <text x={145} y={105} textAnchor="middle" fill={C.textDim} fontSize={11}>k = 2</text>
      {/* Large triangle */}
      <g transform="translate(190,10)">
        <polygon points="0,140 80,0 160,140" fill={C.accentFill} stroke={C.accent} strokeWidth={2} />
        <text x={80} y={158} textAnchor="middle" fill={C.accent} fontSize={11}>6</text>
        <text x={-8} y={75} fill={C.accent} fontSize={11}>8</text>
        <text x={150} y={75} fill={C.accent} fontSize={11}>10</text>
      </g>
    </svg>
  )
}

// ============================================================
// SOLIDS DIAGRAMS
// ============================================================

function DiagramCubeCuboid() {
  // Isometric cube
  const iso = (x: number, y: number) => ({ x: 70 + x * 0.87 - y * 0.87, y: 80 + x * 0.5 + y * 0.5 })
  const s = 60
  const A = iso(0, 0), B = iso(s, 0), F = iso(s, s), D = iso(0, s)
  const A2 = iso(0, 0 - s * 0.5), B2 = iso(s, 0 - s * 0.5)
  const F2 = iso(s, s - s * 0.5), D2 = iso(0, s - s * 0.5)
  const front = `${A.x},${A.y} ${B.x},${B.y} ${F.x},${F.y} ${D.x},${D.y}`
  return (
    <svg viewBox="0 0 460 180" className="geom-diagram">
      {/* Cube */}
      <g>
        <text x={90} y={12} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Cube</text>
        {/* Back edges (dashed) */}
        <line x1={A2.x} y1={A2.y} x2={B2.x} y2={B2.y} stroke={C.strokeLight} strokeWidth={1} strokeDasharray="4,3" />
        <line x1={A2.x} y1={A2.y} x2={D2.x} y2={D2.y} stroke={C.strokeLight} strokeWidth={1} strokeDasharray="4,3" />
        <line x1={D2.x} y1={D2.y} x2={D.x} y2={D.y} stroke={C.strokeLight} strokeWidth={1} strokeDasharray="4,3" />
        <polygon points={front} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <line x1={A2.x} y1={A2.y} x2={B2.x} y2={B2.y} stroke={C.stroke} strokeWidth={2} />
        <line x1={A2.x} y1={A2.y} x2={D2.x} y2={D2.y} stroke={C.stroke} strokeWidth={2} />
        <line x1={B2.x} y1={B2.y} x2={B.x} y2={B.y} stroke={C.stroke} strokeWidth={2} />
        <line x1={D2.x} y1={D2.y} x2={D.x} y2={D.y} stroke={C.stroke} strokeWidth={2} />
        <text x={B.x + 4} y={B.y + 4} fill={C.stroke} fontSize={12} fontWeight={600}>a</text>
        <text x={D.x - 16} y={(D.y + D2.y) / 2 + 4} fill={C.stroke} fontSize={12} fontWeight={600}>a</text>
      </g>
      {/* Cuboid */}
      <g transform="translate(200,0)">
        <text x={100} y={12} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Cuboid</text>
        {(() => {
          const o = iso(0, 0), p = iso(120, 0), q = iso(120, 55), r = iso(0, 55)
          const o2 = iso(0, 0 - 40), p2 = iso(120, 0 - 40), r2 = iso(0, 55 - 40)
          return (
            <>
              <line x1={o2.x} y1={o2.y} x2={p2.x} y2={p2.y} stroke={C.stroke} strokeWidth={2} />
              <line x1={o2.x} y1={o2.y} x2={r2.x} y2={r2.y} stroke={C.stroke} strokeWidth={2} />
              <line x1={p2.x} y1={p2.y} x2={p.x} y2={p.y} stroke={C.stroke} strokeWidth={2} />
              <line x1={r2.x} y1={r2.y} x2={r.x} y2={r.y} stroke={C.stroke} strokeWidth={2} />
              <polygon points={`${o.x},${o.y} ${p.x},${p.y} ${q.x},${q.y} ${r.x},${r.y}`} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
              <text x={(o.x + p.x) / 2} y={p.y + 16} textAnchor="middle" fill={C.stroke} fontSize={11}>a</text>
              <text x={r.x - 14} y={(r.y + r2.y) / 2 + 4} fill={C.stroke} fontSize={11}>b</text>
              <text x={p2.x + 4} y={(p2.y + p.y) / 2 + 4} fill={C.stroke} fontSize={11}>c</text>
            </>
          )
        })()}
      </g>
    </svg>
  )
}

function DiagramPrism() {
  // Triangular prism - front view
  return (
    <svg viewBox="0 0 280 180" className="geom-diagram">
      <text x={140} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Triangular prism</text>
      {/* Front face */}
      <polygon points="40,150 90,50 140,150" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Back face */}
      <polygon points="100,130 150,30 200,130" fill="rgba(108,92,231,0.03)" stroke={C.strokeLight} strokeWidth={1.5} />
      {/* Connecting edges */}
      <line x1={40} y1={150} x2={100} y2={130} stroke={C.stroke} strokeWidth={1.5} />
      <line x1={90} y1={50} x2={150} y2={30} stroke={C.stroke} strokeWidth={1.5} />
      <line x1={140} y1={150} x2={200} y2={130} stroke={C.stroke} strokeWidth={1.5} />
      <text x={70} y={165} fill={C.stroke} fontSize={11}>base</text>
      <text x={65} y={105} fill={C.accent} fontSize={11}>h</text>
    </svg>
  )
}

function DiagramPyramid() {
  return (
    <svg viewBox="0 0 260 180" className="geom-diagram">
      <text x={130} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Pyramid</text>
      {/* Base */}
      <polygon points="40,140 220,140 200,160 20,160" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Edges to apex */}
      <line x1={40} y1={140} x2={130} y2={30} stroke={C.stroke} strokeWidth={2} />
      <line x1={220} y1={140} x2={130} y2={30} stroke={C.stroke} strokeWidth={2} />
      <line x1={200} y1={160} x2={130} y2={30} stroke={C.strokeLight} strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={20} y1={160} x2={130} y2={30} stroke={C.stroke} strokeWidth={2} />
      {/* Height */}
      <line x1={130} y1={30} x2={130} y2={150} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <RightAngleMark cx={130} cy={150} dx={0} dy={-10} size={10} />
      <text x={138} y={95} fill={C.accent} fontSize={12} fontWeight={600}>H</text>
      <P x={130} y={30} label="apex" labelPos="top" color={C.accent} />
      <text x={130} y={175} textAnchor="middle" fill={C.textDim} fontSize={11}>V = &#189;B &#215; H</text>
    </svg>
  )
}

function DiagramCylinder() {
  return (
    <svg viewBox="0 0 260 200" className="geom-diagram">
      <text x={130} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Cylinder</text>
      {/* Top ellipse */}
      <ellipse cx={130} cy={45} rx={70} ry={20} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Bottom ellipse (half) */}
      <path d="M 60 155 A 70 20 0 0 0 200 155" fill="none" stroke={C.stroke} strokeWidth={2} />
      {/* Sides */}
      <line x1={60} y1={45} x2={60} y2={155} stroke={C.stroke} strokeWidth={2} />
      <line x1={200} y1={45} x2={200} y2={155} stroke={C.stroke} strokeWidth={2} />
      {/* Radius */}
      <line x1={130} y1={45} x2={200} y2={45} stroke={C.green} strokeWidth={1.5} />
      <text x={165} y={40} fill={C.green} fontSize={12} fontWeight={600}>r</text>
      {/* Height */}
      <line x1={210} y1={45} x2={210} y2={155} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <text x={218} y={105} fill={C.accent} fontSize={12} fontWeight={600}>h</text>
      <text x={130} y={185} textAnchor="middle" fill={C.textDim} fontSize={11}>V = &#960;r&#178;h, S&#8321; = 2&#960;rh</text>
    </svg>
  )
}

function DiagramCone() {
  return (
    <svg viewBox="0 0 260 200" className="geom-diagram">
      <text x={130} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Cone</text>
      {/* Base ellipse */}
      <ellipse cx={130} cy={160} rx={70} ry={20} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Slant edges */}
      <line x1={60} y1={160} x2={130} y2={40} stroke={C.stroke} strokeWidth={2} />
      <line x1={200} y1={160} x2={130} y2={40} stroke={C.stroke} strokeWidth={2} />
      {/* Height (dashed) */}
      <line x1={130} y1={40} x2={130} y2={160} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <text x={138} y={105} fill={C.accent} fontSize={12} fontWeight={600}>h</text>
      {/* Radius */}
      <line x1={130} y1={160} x2={200} y2={160} stroke={C.green} strokeWidth={1.5} />
      <text x={165} y={155} fill={C.green} fontSize={12} fontWeight={600}>r</text>
      {/* Slant height */}
      <text x={80} y={95} fill={C.strokeLight} fontSize={12} fontWeight={600}>l</text>
      <P x={130} y={40} label="apex" labelPos="top" color={C.accent} />
      <text x={130} y={190} textAnchor="middle" fill={C.textDim} fontSize={11}>V = &#189;&#960;r&#178;h, l = &#8730;(r&#178;+h&#178;)</text>
    </svg>
  )
}

function DiagramSphere() {
  const cx = 130, cy = 100, r = 70
  return (
    <svg viewBox="0 0 280 200" className="geom-diagram">
      <text x={cx} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Sphere</text>
      {/* Great circle */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Equator */}
      <ellipse cx={cx} cy={cy} rx={r} ry={18} fill="none" stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      {/* Meridian */}
      <ellipse cx={cx} cy={cy} rx={22} ry={r} fill="none" stroke={C.strokeLight} strokeWidth={1} strokeDasharray="4,3" />
      {/* Radius */}
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={C.green} strokeWidth={2} />
      <text x={cx + r / 2} y={cy - 8} textAnchor="middle" fill={C.green} fontSize={12} fontWeight={600}>r</text>
      <text x={cx} y={cy + r + 25} textAnchor="middle" fill={C.textDim} fontSize={11}>V = &#189;&#960;r&#179;, S = 4&#960;r&#178;</text>
    </svg>
  )
}

function DiagramFrustum() {
  return (
    <svg viewBox="0 0 260 200" className="geom-diagram">
      <text x={130} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Frustum of a cone</text>
      {/* Top ellipse */}
      <ellipse cx={130} cy={45} rx={35} ry={12} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Bottom ellipse */}
      <ellipse cx={130} cy={155} rx={70} ry={20} fill="rgba(108,92,231,0.03)" stroke={C.stroke} strokeWidth={2} />
      {/* Sides */}
      <line x1={95} y1={45} x2={60} y2={155} stroke={C.stroke} strokeWidth={2} />
      <line x1={165} y1={45} x2={200} y2={155} stroke={C.stroke} strokeWidth={2} />
      {/* Labels */}
      <text x={130} y={40} textAnchor="middle" fill={C.stroke} fontSize={11}>r&#8321;</text>
      <text x={130} y={175} textAnchor="middle" fill={C.stroke} fontSize={11}>r&#8322;</text>
      {/* Height */}
      <line x1={210} y1={45} x2={210} y2={155} stroke={C.accent} strokeWidth={1.5} strokeDasharray="5,4" />
      <text x={218} y={105} fill={C.accent} fontSize={12} fontWeight={600}>h</text>
      <text x={130} y={195} textAnchor="middle" fill={C.textDim} fontSize={10}>V = &#960;(h/3)(r&#8321;&#178;+r&#8321;r&#8322;+r&#8322;&#178;)</text>
    </svg>
  )
}

function DiagramInscribedSolids() {
  return (
    <svg viewBox="0 0 340 180" className="geom-diagram">
      <text x={170} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Sphere in a cube</text>
      {/* Cube wireframe */}
      <rect x={50} y={40} width={100} height={100} fill="none" stroke={C.stroke} strokeWidth={1.5} />
      <rect x={70} y={25} width={100} height={100} fill="rgba(108,92,231,0.03)" stroke={C.strokeLight} strokeWidth={1} strokeDasharray="4,3" />
      {/* Connecting edges */}
      <line x1={50} y1={40} x2={70} y2={25} stroke={C.strokeLight} strokeWidth={1} />
      <line x1={150} y1={40} x2={170} y2={25} stroke={C.stroke} strokeWidth={1.5} />
      <line x1={150} y1={140} x2={170} y2={125} stroke={C.strokeLight} strokeWidth={1} />
      {/* Sphere inside */}
      <circle cx={120} cy={90} r={50} fill={C.accentFill} stroke={C.accent} strokeWidth={2} />
      <text x={120} y={94} textAnchor="middle" fill={C.accent} fontSize={11} fontWeight={600}>2r = a</text>
      {/* Cube label */}
      <text x={100} y={155} textAnchor="middle" fill={C.stroke} fontSize={11}>edge a</text>
      {/* Second diagram: cube in sphere */}
      <text x={265} y={14} textAnchor="middle" fill={C.textDim} fontSize={12} fontWeight={600}>Cube in sphere</text>
      <circle cx={265} cy={95} r={65} fill="rgba(46,204,113,0.05)" stroke={C.green} strokeWidth={1.5} />
      <rect x={225} y={55} width={80} height={80} fill="none" stroke={C.stroke} strokeWidth={2} />
      {/* Diagonal */}
      <line x1={225} y1={135} x2={305} y2={55} stroke={C.accent} strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={275} y={85} fill={C.accent} fontSize={11}>2r = a&#8730;3</text>
    </svg>
  )
}

// ============================================================
// TRIG DIAGRAMS
// ============================================================

function DiagramRightTriangleParts() {
  // 3-4-5 triangle
  return (
    <svg viewBox="0 0 300 220" className="geom-diagram">
      <polygon points="30,180 230,180 30,30" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <RightAngleMark cx={30} cy={180} dx={200} dy={0} size={14} />
      {/* Angle alpha */}
      <AngleArc cx={230} cy={180} r={25} startDeg={-180} endDeg={-143} />
      <text x={200} y={165} fill={C.accent} fontSize={14} fontWeight={600}>&#945;</text>
      {/* Side labels */}
      <text x={130} y={195} textAnchor="middle" fill={C.stroke} fontSize={14} fontWeight={600}>adjacent</text>
      <text x={18} y={110} textAnchor="middle" fill={C.green} fontSize={14} fontWeight={600} transform="rotate(-90,18,110)">opposite</text>
      <text x={145} y={95} fill={C.red} fontSize={14} fontWeight={600}>hypotenuse</text>
      <text x={150} y={210} textAnchor="middle" fill={C.textDim} fontSize={12}>sin&#945; = opp/hyp, cos&#945; = adj/hyp, tan&#945; = opp/adj</text>
    </svg>
  )
}

function DiagramSpecialAngles() {
  // 30-60-90 and 45-45-90
  return (
    <svg viewBox="0 0 400 180" className="geom-diagram">
      {/* 30-60-90 */}
      <g transform="translate(20,10)">
        <text x={70} y={10} textAnchor="middle" fill={C.textDim} fontSize={11} fontWeight={600}>30-60-90</text>
        <polygon points="0,140 140,140 0,50" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
        <RightAngleMark cx={0} cy={140} dx={140} dy={0} size={10} />
        <AngleArc cx={140} cy={140} r={18} startDeg={-180} endDeg={-150} />
        <text x={115} y={132} fill={C.accent} fontSize={10}>30&#176;</text>
        <AngleArc cx={0} cy={50} r={18} startDeg={0} endDeg={60} />
        <text x={12} y={72} fill={C.accent} fontSize={10}>60&#176;</text>
        <text x={70} y={155} textAnchor="middle" fill={C.stroke} fontSize={11}>1</text>
        <text x={-10} y={100} fill={C.stroke} fontSize={11} textAnchor="end">&#8730;3</text>
        <text x={80} y={88} fill={C.green} fontSize={11}>2</text>
      </g>
      {/* 45-45-90 */}
      <g transform="translate(210,10)">
        <text x={70} y={10} textAnchor="middle" fill={C.textDim} fontSize={11} fontWeight={600}>45-45-90</text>
        <polygon points="0,140 140,140 0,0" fill={C.accentFill} stroke={C.accent} strokeWidth={2} />
        <RightAngleMark cx={0} cy={140} dx={140} dy={0} size={10} />
        <AngleArc cx={140} cy={140} r={18} startDeg={-180} endDeg={-135} />
        <text x={112} y={130} fill={C.accent} fontSize={10}>45&#176;</text>
        <AngleArc cx={0} cy={0} r={18} startDeg={0} endDeg={45} />
        <text x={16} y={20} fill={C.accent} fontSize={10}>45&#176;</text>
        <text x={70} y={155} textAnchor="middle" fill={C.accent} fontSize={11}>1</text>
        <text x={-10} y={75} fill={C.accent} fontSize={11} textAnchor="end">1</text>
        <text x={85} y={68} fill={C.green} fontSize={11}>&#8730;2</text>
      </g>
    </svg>
  )
}

function DiagramSohCahToa() {
  return (
    <svg viewBox="0 0 300 220" className="geom-diagram">
      <polygon points="30,180 230,180 30,30" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <RightAngleMark cx={30} cy={180} dx={200} dy={0} size={14} />
      <AngleArc cx={230} cy={180} r={25} startDeg={-180} endDeg={-143} />
      <text x={198} y={162} fill={C.accent} fontSize={16} fontWeight={700}>&#945;</text>
      <text x={130} y={196} textAnchor="middle" fill={C.stroke} fontSize={15} fontWeight={700}>A</text>
      <text x={14} y={110} textAnchor="middle" fill={C.green} fontSize={15} fontWeight={700} transform="rotate(-90,14,110)">O</text>
      <text x={148} y={92} fill={C.red} fontSize={15} fontWeight={700}>H</text>
      {/* SOH CAH TOA */}
      <g transform="translate(60,210)">
        <text x={0} y={0} fill={C.green} fontSize={13} fontWeight={700}>S</text>
        <text x={10} y={0} fill={C.textDim} fontSize={13}>in = O/H</text>
        <text x={100} y={0} fill={C.stroke} fontSize={13} fontWeight={700}>C</text>
        <text x={110} y={0} fill={C.textDim} fontSize={13}>os = A/H</text>
        <text x={200} y={0} fill={C.accent} fontSize={13} fontWeight={700}>T</text>
        <text x={210} y={0} fill={C.textDim} fontSize={13}>an = O/A</text>
      </g>
    </svg>
  )
}

function DiagramLawSines() {
  // Non-right triangle with angles and opposite sides
  return (
    <svg viewBox="0 0 300 200" className="geom-diagram">
      <polygon points="40,160 180,30 270,160" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <P x={40} y={160} label="A" labelPos="bottomLeft" />
      <P x={180} y={30} label="B" labelPos="top" />
      <P x={270} y={160} label="C" labelPos="bottomRight" />
      <AngleArc cx={40} cy={160} r={20} startDeg={-50} endDeg={0} />
      <text x={55} y={150} fill={C.accent} fontSize={12} fontWeight={600}>&#945;</text>
      <AngleArc cx={180} cy={30} r={20} startDeg={130} endDeg={180} />
      <text x={168} y={48} fill={C.accent} fontSize={12} fontWeight={600}>&#946;</text>
      <text x={110} y={100} fill={C.stroke} fontSize={13} fontWeight={600}>a</text>
      <text x={230} y={100} fill={C.stroke} fontSize={13} fontWeight={600}>b</text>
      <text x={155} y={172} fill={C.stroke} fontSize={13} fontWeight={600}>c</text>
      <text x={150} y={195} textAnchor="middle" fill={C.textDim} fontSize={12}>a/sin&#945; = b/sin&#946; = c/sin&#947; = 2R</text>
    </svg>
  )
}

function DiagramLawCosines() {
  return (
    <svg viewBox="0 0 300 200" className="geom-diagram">
      <polygon points="30,170 120,30 260,170" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <AngleArc cx={120} cy={30} r={25} startDeg={100} endDeg={150} color={C.red} />
      <text x={105} y={56} fill={C.red} fontSize={14} fontWeight={700}>&#947;</text>
      <text x={70} y={105} fill={C.stroke} fontSize={14} fontWeight={600}>a</text>
      <text x={195} y={105} fill={C.stroke} fontSize={14} fontWeight={600}>b</text>
      <text x={145} y={185} textAnchor="middle" fill={C.green} fontSize={14} fontWeight={600}>c</text>
      <P x={120} y={30} label="" labelPos="top" />
      <text x={150} y={22} textAnchor="middle" fill={C.textDim} fontSize={12}>c&#178; = a&#178; + b&#178; - 2ab&#183;cos&#947;</text>
    </svg>
  )
}

function DiagramTriangleAreaSine() {
  return (
    <svg viewBox="0 0 280 180" className="geom-diagram">
      <polygon points="30,150 130,20 250,150" fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <AngleArc cx={130} cy={20} r={22} startDeg={100} endDeg={155} color={C.red} />
      <text x={112} y={42} fill={C.red} fontSize={13} fontWeight={700}>&#947;</text>
      <text x={70} y={90} fill={C.stroke} fontSize={14} fontWeight={600}>a</text>
      <text x={190} y={90} fill={C.stroke} fontSize={14} fontWeight={600}>b</text>
      <text x={140} y={170} textAnchor="middle" fill={C.textDim} fontSize={13}>A = &#189;ab&#183;sin&#947;</text>
    </svg>
  )
}

function DiagramElevationDepression() {
  return (
    <svg viewBox="0 0 360 200" className="geom-diagram">
      {/* Ground */}
      <line x1={20} y1={160} x2={340} y2={160} stroke={C.stroke} strokeWidth={2} />
      {/* Tower */}
      <rect x={60} y={50} width={20} height={110} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      <text x={70} y={45} textAnchor="middle" fill={C.stroke} fontSize={12} fontWeight={600}>tower</text>
      {/* Eye/Observer */}
      <circle cx={250} cy={80} r={5} fill={C.accent} />
      <text x={250} y={70} textAnchor="middle" fill={C.accent} fontSize={11}>you</text>
      {/* Horizontal line from eye */}
      <line x1={220} y1={80} x2={300} y2={80} stroke={C.textDim} strokeWidth={1} strokeDasharray="4,3" />
      {/* Elevation angle */}
      <line x1={250} y1={80} x2={70} y2={50} stroke={C.green} strokeWidth={1.5} />
      <AngleArc cx={250} cy={80} r={30} startDeg={180} endDeg={197} color={C.green} />
      <text x={212} y={75} fill={C.green} fontSize={11} fontWeight={600}>elevation</text>
      {/* Depression angle to ground */}
      <line x1={250} y1={80} x2={70} y2={160} stroke={C.red} strokeWidth={1.5} strokeDasharray="5,4" />
      <AngleArc cx={250} cy={80} r={30} startDeg={163} endDeg={180} color={C.red} />
      <text x={215} y={95} fill={C.red} fontSize={11}>depression</text>
      {/* Shadow */}
      <line x1={80} y1={160} x2={200} y2={160} stroke={C.accent} strokeWidth={2} />
      <text x={140} y={175} textAnchor="middle" fill={C.accent} fontSize={11}>shadow = h / tan&#945;</text>
    </svg>
  )
}

function DiagramUnitCircle() {
  const cx = 140, cy = 120, r = 90
  const points = [
    { angle: 0, label: '0\u00B0', cos: '1', sin: '0' },
    { angle: 30, label: '30\u00B0', cos: '\u221A3/2', sin: '1/2' },
    { angle: 45, label: '45\u00B0', cos: '\u221A2/2', sin: '\u221A2/2' },
    { angle: 60, label: '60\u00B0', cos: '1/2', sin: '\u221A3/2' },
    { angle: 90, label: '90\u00B0', cos: '0', sin: '1' },
    { angle: 180, label: '180\u00B0', cos: '-1', sin: '0' },
    { angle: 270, label: '270\u00B0', cos: '0', sin: '-1' },
  ]
  return (
    <svg viewBox="0 0 300 270" className="geom-diagram">
      {/* Axes */}
      <line x1={cx - r - 20} y1={cy} x2={cx + r + 20} y2={cy} stroke={C.textDim} strokeWidth={1} />
      <line x1={cx} y1={cy + r + 20} x2={cx} y2={cy - r - 20} stroke={C.textDim} strokeWidth={1} />
      {/* Circle */}
      <circle cx={cx} cy={cy} r={r} fill={C.fill} stroke={C.stroke} strokeWidth={2} />
      {/* Key points */}
      {points.map((p) => {
        const rad = (p.angle * Math.PI) / 180
        const x = cx + r * Math.cos(rad)
        const y = cy - r * Math.sin(rad)
        return (
          <g key={p.angle}>
            <circle cx={x} cy={y} r={3} fill={C.accent} />
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={C.strokeLight} strokeWidth={1} />
          </g>
        )
      })}
      {/* Labels for key angles */}
      <text x={cx + r + 8} y={cy + 4} fill={C.accent} fontSize={10} textAnchor="start">(1, 0)</text>
      <text x={cx + 4} y={cy - r - 6} fill={C.accent} fontSize={10} textAnchor="start">(0, 1)</text>
      <text x={cx - r - 8} y={cy + 4} fill={C.accent} fontSize={10} textAnchor="end">(-1, 0)</text>
      <text x={cx + 4} y={cy + r + 14} fill={C.accent} fontSize={10} textAnchor="start">(0, -1)</text>
      {/* Show 30/45/60 in QI */}
      {[30, 45, 60].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x = cx + r * Math.cos(rad)
        const y = cy - r * Math.sin(rad)
        return (
          <g key={deg}>
            <circle cx={x} cy={y} r={3.5} fill={C.green} />
            <text x={x + 6} y={y - 6} fill={C.green} fontSize={9} fontWeight={600}>{deg}&#176;</text>
          </g>
        )
      })}
      <text x={cx} y={cy + r + 35} textAnchor="middle" fill={C.textDim} fontSize={11}>Point = (cos&#945;, sin&#945;)</text>
    </svg>
  )
}

// ============================================================
// DIAGRAM REGISTRY
// ============================================================

type DiagramId =
  | 'angles-basic' | 'parallel-transversal' | 'triangle-types' | 'triangle-height'
  | 'pythagorean' | 'rectangle-square' | 'parallelogram' | 'trapezoid'
  | 'circle-parts' | 'circle-sector' | 'polygon-interior' | 'similarity'
  | 'cube-cuboid' | 'prism' | 'pyramid' | 'cylinder' | 'cone' | 'sphere'
  | 'frustum' | 'inscribed-solids'
  | 'right-triangle-parts' | 'special-angles' | 'soh-cah-toa'
  | 'law-sines' | 'law-cosines' | 'triangle-area-sine'
  | 'elevation-depression' | 'unit-circle'

const DIAGRAMS: Record<DiagramId, () => JSX.Element> = {
  'angles-basic': DiagramAnglesBasic,
  'parallel-transversal': DiagramParallelTransversal,
  'triangle-types': DiagramTriangleTypes,
  'triangle-height': DiagramTriangleHeight,
  'pythagorean': DiagramPythagorean,
  'rectangle-square': DiagramRectangleSquare,
  'parallelogram': DiagramParallelogram,
  'trapezoid': DiagramTrapezoid,
  'circle-parts': DiagramCircleParts,
  'circle-sector': DiagramCircleSector,
  'polygon-interior': DiagramPolygonInterior,
  'similarity': DiagramSimilarity,
  'cube-cuboid': DiagramCubeCuboid,
  'prism': DiagramPrism,
  'pyramid': DiagramPyramid,
  'cylinder': DiagramCylinder,
  'cone': DiagramCone,
  'sphere': DiagramSphere,
  'frustum': DiagramFrustum,
  'inscribed-solids': DiagramInscribedSolids,
  'right-triangle-parts': DiagramRightTriangleParts,
  'special-angles': DiagramSpecialAngles,
  'soh-cah-toa': DiagramSohCahToa,
  'law-sines': DiagramLawSines,
  'law-cosines': DiagramLawCosines,
  'triangle-area-sine': DiagramTriangleAreaSine,
  'elevation-depression': DiagramElevationDepression,
  'unit-circle': DiagramUnitCircle,
}

interface Props {
  id: string
}

export default function GeometryDiagram({ id }: Props) {
  const Diagram = DIAGRAMS[id as DiagramId]
  if (!Diagram) return <div className="geom-diagram-missing">Diagram '{id}' not found</div>
  return <div className="geom-diagram-wrap"><Diagram /></div>
}

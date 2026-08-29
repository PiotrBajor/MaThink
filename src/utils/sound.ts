let enabled = true
let ctx: AudioContext | null = null

export function setSoundEnabled(v: boolean) { enabled = v }

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.2) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

export function playCorrect() {
  if (!enabled) return
  tone(523.25, 0, 0.12, 'sine', 0.18)
  tone(659.25, 0.09, 0.14, 'sine', 0.18)
  tone(783.99, 0.18, 0.2, 'sine', 0.2)
}

export function playWrong() {
  if (!enabled) return
  tone(220, 0, 0.16, 'triangle', 0.18)
  tone(165, 0.12, 0.22, 'triangle', 0.16)
}

export function playLevelUp() {
  if (!enabled) return
  const seq = [523.25, 659.25, 783.99, 1046.5]
  seq.forEach((f, i) => tone(f, i * 0.11, 0.18, 'sine', 0.2))
}

export function playStart() {
  if (!enabled) return
  tone(392, 0, 0.1, 'sine', 0.12)
  tone(523.25, 0.08, 0.14, 'sine', 0.14)
}
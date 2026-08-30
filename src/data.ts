import React from 'react'
import { renderMath } from './utils/mathfmt'

export interface UserProfile { nickname: string; level: number; xp: number; createdAt: string }
export interface TaskResult { id: number; chapterId: string; difficulty: number; correct: boolean; xpEarned: number; timestamp: string; lessonIndex?: number }
export interface SettingsPrefs { sound: boolean; theme: 'dark' | 'light' }
export interface AppData { version: number; profile: UserProfile | null; taskResults: TaskResult[]; history: HistoryEntry[]; settings: SettingsPrefs }
export interface HistoryEntry { id: number; timestamp: string; tab: string; input: string; result: string }

export const DATA_VERSION = 2
export const DEFAULT_SETTINGS: SettingsPrefs = { sound: true, theme: 'dark' }

export const DEFAULT_DATA: AppData = {
  version: DATA_VERSION,
  profile: null,
  taskResults: [],
  history: [],
  settings: { ...DEFAULT_SETTINGS },
}

export function normalizeData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DATA }
  const r = raw as Record<string, unknown>
  const profile = r.profile && typeof r.profile === 'object'
    ? r.profile as UserProfile
    : null
  return {
    version: DATA_VERSION,
    profile,
    taskResults: Array.isArray(r.taskResults) ? r.taskResults as TaskResult[] : [],
    history: Array.isArray(r.history) ? (r.history as HistoryEntry[]).slice(0, 200) : [],
    settings: { ...DEFAULT_SETTINGS, ...(r.settings && typeof r.settings === 'object' ? r.settings as Partial<SettingsPrefs> : {}) },
  }
}

export const XP_PER_LEVEL = [0,100,250,500,850,1300,1900,2600,3500,4600,6000,7800,10000,12500,15500,19000,23000,27500,32500,38000]
export function getLevelForXp(xp: number) {
  let level = 1
  for (let i = 1; i < XP_PER_LEVEL.length; i++) { if (xp >= XP_PER_LEVEL[i]) level = i + 1; else break }
  const cur = XP_PER_LEVEL[level - 1] || 0
  const nxt = XP_PER_LEVEL[level] || XP_PER_LEVEL[XP_PER_LEVEL.length - 1] + 5000
  const curXp = xp - cur; const need = nxt - cur
  return { level, currentXp: curXp, nextLevelXp: need, progress: Math.min(1, curXp / need) }
}
export const XP_REWARDS = [10, 20, 35, 55, 80]

export interface StreakDay { key: string; date: Date; active: boolean; isToday: boolean }
export interface StreakInfo { current: number; best: number; last7: StreakDay[]; studiedToday: boolean }
export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function getStreak(taskResults: TaskResult[]): StreakInfo {
  const studied = new Set<string>()
  taskResults.forEach(t => {
    const d = new Date(t.timestamp)
    if (!isNaN(d.getTime())) studied.add(dayKey(d))
  })

  const now = new Date()
  const studiedToday = studied.has(dayKey(now))
  const last7: StreakDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    last7.push({ key: dayKey(d), date: d, active: studied.has(dayKey(d)), isToday: i === 0 })
  }

  // current streak: consecutive days ending today (or yesterday if today not studied yet)
  let current = 0
  const last = studied.has(dayKey(now)) ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  let cursor = new Date(last.getFullYear(), last.getMonth(), last.getDate())
  if (studied.has(dayKey(cursor))) {
    while (studied.has(dayKey(cursor))) { current++; cursor.setDate(cursor.getDate() - 1) }
  }

  // best streak: longest consecutive run anywhere in history
  const sorted = [...studied].sort()
  const MS_DAY = 86400000
  let best = 0, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const cur = new Date(sorted[i])
    const diff = Math.round((cur.getTime() - prev.getTime()) / MS_DAY)
    if (diff === 1) run++
    else { if (run > best) best = run; run = 1 }
  }
  if (sorted.length > 0 && run > best) best = run

  return { current, best, last7, studiedToday }
}

export interface Chapter { id: string; title: string; icon: string; color: string; lessons: Lesson[] }
export interface Lesson { title: string; content: LessonBlock[]; examples: string[] }
export interface LessonBlock { type: 'text' | 'heading' | 'example' | 'rule' | 'code' | 'graph'; content: string }
export interface Task { display: React.ReactNode; answer: number | string; options?: (string | number)[]; lessonIndex: number; difficulty?: number }

function rand(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a }
function round2(n: number) { return Math.round(n * 100) / 100 }
function pick<T>(arr: T[], n: number) { return [...arr].sort(() => Math.random() - 0.5).slice(0, n) }

// Progressive difficulty ramp: easy questions first, harder later.
// base = the centre level (3 for a full easy→hard lesson test, or a chosen chapter-test level)
export function ramp(count: number, base: number): number[] {
  const lo = Math.max(1, base - 2)
  const hi = Math.min(5, base + 2)
  return Array.from({ length: count }, (_, i) => Math.round(lo + (hi - lo) * (i / Math.max(1, count - 1))))
}

// Build shuffled multiple-choice options with one correct answer
function mc(correct: string | number, distractors: (string | number)[]): { options: (string | number)[]; answer: string | number } {
  let opts = [...new Set([correct, ...distractors])]
  for (let i = opts.length - 1; i > 0; i--) { const j = rand(0, i); [opts[i], opts[j]] = [opts[j], opts[i]] }
  return { options: opts, answer: correct }
}
function near(v: number, spread = 3): number[] {
  const opts = [] as number[]
  let guard = 0
  while (opts.length < 3 && guard++ < 50) {
    const d = v + rand(-spread, spread)
    if (d >= 1 && d !== v && !opts.includes(d)) opts.push(d)
  }
  return opts.length < 3 ? [v + 1, v + 2].filter((x) => x !== v) : opts
}

// Exact pi multiples: 1π is written just 'π'
const piExp = (k: number) => (k === 1 ? '\u03C0' : `${k}\u03C0`)

export const CHAPTERS: Chapter[] = [
  { id: 'addition', title: 'Addition', icon: '+', color: '#2ecc71', lessons: [
    { title: 'Adding Whole Numbers', content: [
      { type: 'text', content: 'Addition means combining two or more numbers to find their total. The symbol for addition is +.' },
      { type: 'example', content: '5 + 3 = 8 — We start with 5 and add 3 more. The result is 8.' },
      { type: 'text', content: 'When adding larger numbers, line up the numbers by place value and add each column from right to left. If a column adds up to 10 or more, carry the extra to the next column.' },
      { type: 'code', content: '   247\n+  135\n------\n   382' },
      { type: 'rule', content: 'Adding zero does not change a number: 7 + 0 = 7' },
      { type: 'rule', content: 'The order does not matter: 4 + 6 = 6 + 4' },
    ], examples: ['3 + 5 = 8', '12 + 7 = 19', '247 + 135 = 382'] },
    { title: 'Adding Decimals', content: [
      { type: 'text', content: 'When adding decimals, the most important rule is to align the decimal points. You can add trailing zeros to make decimal places equal.' },
      { type: 'example', content: '4.25 + 1.70 = 5.95 — Line up the decimal points and add normally.' },
      { type: 'code', content: '   4.25\n+  1.70\n-------\n   5.95' },
      { type: 'example', content: '12.08 + 3.6 = 12.08 + 3.60 = 15.68' },
      { type: 'rule', content: 'Always line up the decimal points.' },
      { type: 'rule', content: 'You can add zeros after a decimal without changing the number.' },
      { type: 'rule', content: 'Keep the decimal point in the correct position.' },
    ], examples: ['3.5 + 2.7 = 6.2', '0.15 + 0.85 = 1.00'] },
    { title: 'Adding Negative Numbers', content: [
      { type: 'text', content: 'Negative numbers are numbers smaller than zero. When you add a positive number, move right on the number line. When you add a negative number, move left.' },
      { type: 'example', content: '5 + 3 = 8 — Both positive, simply add them.' },
      { type: 'example', content: '-5 + (-3) = -8 — Both negative, add values and keep the negative sign.' },
      { type: 'example', content: '5 + (-3) = 2 — Different signs: subtract smaller absolute value from larger. 5 - 3 = 2, and 5 is positive, so result is +2.' },
      { type: 'example', content: '-8 + 3 = -5 — 8 is larger than 3, and 8 is negative, so result is -5.' },
      { type: 'rule', content: 'Positive + positive → add normally.' },
      { type: 'rule', content: 'Negative + negative → add values, keep negative sign.' },
      { type: 'rule', content: 'Positive + negative → subtract smaller from larger, keep sign of larger.' },
    ], examples: ['5 + (-3) = 2', '(-4) + (-6) = -10'] },
  ]},
  { id: 'subtraction', title: 'Subtraction', icon: '\u2212', color: '#e74c3c', lessons: [
    { title: 'Basic Subtraction', content: [
      { type: 'text', content: 'Subtraction means taking one number away from another to find the difference. The symbol is \u2212.' },
      { type: 'example', content: '8 \u2212 3 = 5 — We start with 8 and take away 3. The result is 5.' },
      { type: 'text', content: 'The numbers have specific names: Minuend (start), Subtrahend (take away), Difference (result).' },
      { type: 'example', content: '10 \u2212 4 = 6 — 10 is the minuend, 4 is the subtrahend, 6 is the difference.' },
      { type: 'rule', content: 'Subtracting zero does not change a number: 7 \u2212 0 = 7' },
      { type: 'rule', content: 'Order matters: 8 \u2212 3 \u2260 3 \u2212 8' },
    ], examples: ['10 \u2212 4 = 6', '25 \u2212 13 = 12'] },
    { title: 'Subtraction With Borrowing', content: [
      { type: 'text', content: 'When the top digit is smaller than the bottom digit, borrow from the next column. Borrowing means taking 1 from the next place value and adding 10 to the current column.' },
      { type: 'code', content: '   52\n\u2212  27\n-----\n   25' },
      { type: 'example', content: '52 \u2212 27: We cannot subtract 7 from 2, so borrow 1 ten from the 5. The 5 becomes 4, the 2 becomes 12. Then 12 \u2212 7 = 5, and 4 \u2212 2 = 2. Result: 25.' },
      { type: 'text', content: 'Sometimes you need to borrow through a zero. The borrowing continues from the next column.' },
      { type: 'rule', content: 'Always align numbers by place value.' },
      { type: 'rule', content: 'Start subtracting from the right.' },
      { type: 'rule', content: 'Decrease the digit you borrowed from by 1.' },
      { type: 'rule', content: 'Check by adding the difference to the subtrahend.' },
    ], examples: ['52 \u2212 27 = 25', '100 \u2212 37 = 63'] },
    { title: 'Subtracting Decimals', content: [
      { type: 'text', content: 'When subtracting decimals, align the decimal points. Add trailing zeros to make decimal places equal.' },
      { type: 'code', content: '   8.50\n\u2212  3.25\n-------\n   5.25' },
      { type: 'example', content: '6.7 \u2212 2.45 = 6.70 \u2212 2.45 = 4.25' },
      { type: 'text', content: 'You can check subtraction using addition. If 15.08 \u2212 7.63 = 7.45, then 7.45 + 7.63 = 15.08.' },
      { type: 'rule', content: 'Line up the decimal points.' },
      { type: 'rule', content: 'Add zeros when necessary.' },
      { type: 'rule', content: 'Borrow when the top digit is smaller.' },
    ], examples: ['8.4 \u2212 3.7 = 4.7', '10.0 \u2212 4.55 = 5.45'] },
  ]},
  { id: 'multiplication', title: 'Multiplication', icon: '\u00D7', color: '#f39c12', lessons: [
    { title: 'Times Tables', content: [
      { type: 'text', content: 'Multiplication is a faster way of adding the same number multiple times. The symbol is \u00D7.' },
      { type: 'example', content: '4 \u00D7 3 = 12 means 4 + 4 + 4 = 12.' },
      { type: 'text', content: 'Learn the multiplication tables from 1 to 12. Some important ones:' },
      { type: 'code', content: '2 \u00D7 6 = 12    3 \u00D7 7 = 21    4 \u00D7 8 = 32\n5 \u00D7 9 = 45    6 \u00D7 7 = 42    8 \u00D7 8 = 64\n9 \u00D7 9 = 81    12 \u00D7 12 = 144' },
      { type: 'rule', content: 'Multiplying by 0 gives 0: 8 \u00D7 0 = 0' },
      { type: 'rule', content: 'Multiplying by 1 keeps the number: 8 \u00D7 1 = 8' },
      { type: 'rule', content: 'Order does not matter: 3 \u00D7 7 = 7 \u00D7 3' },
      { type: 'rule', content: 'Multiplying by 10 shifts digits left: 6 \u00D7 10 = 60' },
    ], examples: ['4 \u00D7 3 = 12', '7 \u00D7 8 = 56'] },
    { title: 'Multiplying Decimals', content: [
      { type: 'text', content: 'First multiply as whole numbers, then count total decimal places in both factors and place the decimal point.' },
      { type: 'example', content: '2.5 \u00D7 3.2: First 25 \u00D7 32 = 800. There are 2 decimal places total, so 2.5 \u00D7 3.2 = 8.00 = 8.' },
      { type: 'example', content: '1.25 \u00D7 4.2: 125 \u00D7 42 = 5250. 3 decimal places total, so 1.25 \u00D7 4.2 = 5.250 = 5.25.' },
      { type: 'rule', content: 'Multiply without worrying about the decimal first.' },
      { type: 'rule', content: 'Count all decimal places in the original numbers.' },
      { type: 'rule', content: 'Zeros at the end can be removed: 5.250 = 5.25.' },
    ], examples: ['3.5 \u00D7 2 = 7.0', '1.5 \u00D7 0.4 = 0.6'] },
    { title: 'Powers', content: [
      { type: 'text', content: 'A power is repeated multiplication of the same number. It has a base and an exponent.' },
      { type: 'example', content: '2\u00B3 = 2 \u00D7 2 \u00D7 2 = 8. Here 2 is the base, 3 is the exponent.' },
      { type: 'code', content: '3\u00B2 = 3 \u00D7 3 = 9\n4\u00B2 = 4 \u00D7 4 = 16\n5\u00B3 = 5 \u00D7 5 \u00D7 5 = 125\n10\u00B2 = 10 \u00D7 10 = 100' },
      { type: 'text', content: 'Squared means power of 2: 7\u00B2 = 49. Cubed means power of 3: 4\u00B3 = 64.' },
      { type: 'rule', content: 'Any number to the power of 1 stays the same: 8\u00B9 = 8' },
      { type: 'rule', content: 'Any non-zero number to the power of 0 equals 1: 8\u2070 = 1' },
      { type: 'rule', content: 'Powers are repeated multiplication, not repeated addition.' },
    ], examples: ['2\u00B3 = 8', '3\u2074 = 81', '10\u00B3 = 1000'] },
  ]},
  { id: 'division', title: 'Division', icon: '\u00F7', color: '#3498db', lessons: [
    { title: 'Basic Division', content: [
      { type: 'text', content: 'Division means splitting a number into equal groups or finding how many times one number fits into another. The symbol is \u00F7.' },
      { type: 'example', content: '12 \u00F7 3 = 4 means 12 is split into 3 equal groups, with 4 in each.' },
      { type: 'text', content: 'Division is the inverse of multiplication: 3 \u00D7 4 = 12, so 12 \u00F7 3 = 4.' },
      { type: 'text', content: 'Terms: Dividend (number divided), Divisor (divide by), Quotient (answer), Remainder (leftover).' },
      { type: 'example', content: '14 \u00F7 4 = 3 remainder 2, because 4 \u00D7 3 = 12 and 14 \u2212 12 = 2.' },
      { type: 'rule', content: 'Any number divided by 1 stays the same: 8 \u00F7 1 = 8' },
      { type: 'rule', content: 'Zero divided by any non-zero number is 0: 0 \u00F7 5 = 0' },
      { type: 'rule', content: 'You cannot divide by zero.' },
    ], examples: ['20 \u00F7 4 = 5', '63 \u00F7 7 = 9'] },
    { title: 'Dividing Decimals', content: [
      { type: 'text', content: 'When dividing decimals, move the decimal point so the divisor becomes a whole number. Move it in both numbers by the same amount.' },
      { type: 'example', content: '6.4 \u00F7 2 = 3.2, because 2 \u00D7 3.2 = 6.4.' },
      { type: 'example', content: '7.5 \u00F7 0.5: Move decimal one place right in both → 75 \u00F7 5 = 15.' },
      { type: 'example', content: '12.6 \u00F7 0.3: Move decimal one place → 126 \u00F7 3 = 42.' },
      { type: 'rule', content: 'Make the divisor a whole number first.' },
      { type: 'rule', content: 'Move the decimal in both numbers by the same amount.' },
      { type: 'rule', content: 'Check by multiplying quotient \u00D7 divisor.' },
    ], examples: ['6.4 \u00F7 0.8 = 8', '15 \u00F7 0.5 = 30'] },
    { title: 'Long Division', content: [
      { type: 'text', content: 'Long division is a step-by-step method for dividing large numbers. Remember: Divide, Multiply, Subtract, Bring Down.' },
      { type: 'example', content: '156 \u00F7 12: 12 fits into 15 once (12\u00D71=12). Subtract: 15\u221212=3. Bring down 6 → 36. 12 fits into 36 three times (12\u00D73=36). Subtract: 36\u221236=0. Result: 13.' },
      { type: 'code', content: '       13\n     ----\n12 ) 156\n     12\n     --\n      36\n      36\n      --\n       0' },
      { type: 'example', content: '17 \u00F7 5 = 3 remainder 2, because 5 \u00D7 3 = 15 and 17 \u2212 15 = 2.' },
      { type: 'rule', content: 'Start from the left side of the dividend.' },
      { type: 'rule', content: 'Repeat: Divide, Multiply, Subtract, Bring Down.' },
      { type: 'rule', content: 'Check: Divisor \u00D7 Quotient + Remainder = Dividend.' },
    ], examples: ['247 \u00F7 13 = 19', '1000 \u00F7 8 = 125'] },
  ]},
  { id: 'roots', title: 'Square Roots', icon: '\u221A', color: '#9b59b6', lessons: [
    { title: 'What is a Square Root?', content: [
      { type: 'text', content: 'A square root reverses squaring. The square root of x is the number that, when multiplied by itself, gives x.' },
      { type: 'example', content: '\u221A9 = 3 because 3 \u00D7 3 = 9.' },
      { type: 'example', content: '\u221A16 = 4 because 4 \u00D7 4 = 16.' },
      { type: 'example', content: '\u221A100 = 10 because 10 \u00D7 10 = 100.' },
      { type: 'text', content: 'The symbol \u221A is called the radical sign. The number inside is the radicand.' },
      { type: 'rule', content: '\u221A1 = 1' },
      { type: 'rule', content: '\u221A0 = 0' },
      { type: 'rule', content: 'The square root of a positive number is always positive.' },
    ], examples: ['\u221A9 = 3', '\u221A16 = 4', '\u221A100 = 10'] },
    { title: 'Perfect Squares', content: [
      { type: 'text', content: 'A perfect square is a number that is the square of a whole number. Knowing them helps you compute square roots quickly.' },
      { type: 'code', content: '1\u00B2 = 1     6\u00B2 = 36    11\u00B2 = 121   16\u00B2 = 256\n2\u00B2 = 4     7\u00B2 = 49    12\u00B2 = 144   17\u00B2 = 289\n3\u00B2 = 9     8\u00B2 = 64    13\u00B2 = 169   18\u00B2 = 324\n4\u00B2 = 16    9\u00B2 = 81    14\u00B2 = 196   19\u00B2 = 361\n5\u00B2 = 25    10\u00B2 = 100  15\u00B2 = 225   20\u00B2 = 400' },
      { type: 'example', content: '\u221A144 = 12 because 12\u00B2 = 144.' },
      { type: 'example', content: '\u221A225 = 15 because 15\u00B2 = 225.' },
      { type: 'rule', content: 'Memorize perfect squares from 1 to 20.' },
      { type: 'rule', content: 'The square root of a perfect square is always a whole number.' },
    ], examples: ['\u221A144 = 12', '\u221A225 = 15', '\u221A400 = 20'] },
    { title: 'Estimating Square Roots', content: [
      { type: 'text', content: 'When a number is not a perfect square, find two perfect squares it falls between, then estimate.' },
      { type: 'example', content: '\u221A50: We know \u221A49 = 7 and \u221A64 = 8. So \u221A50 is between 7 and 8, closer to 7. Estimate: \u221A50 \u2248 7.07.' },
      { type: 'example', content: '\u221A200: \u221A196 = 14 and \u221A225 = 15. So \u221A200 \u2248 14.14.' },
      { type: 'text', content: 'For a closer estimate, use the formula: \u221An \u2248 a + (n \u2212 a\u00B2) / (2a), where a\u00B2 is the closest perfect square below n.' },
      { type: 'rule', content: 'Find the two perfect squares the number falls between.' },
      { type: 'rule', content: 'The answer is between their square roots.' },
      { type: 'rule', content: 'Round to the nearest tenth or hundredth.' },
    ], examples: ['\u221A50 \u2248 7.07', '\u221A200 \u2248 14.14', '\u221A12 \u2248 3.46'] },
  ]},
  { id: 'logarithms', title: 'Logarithms', icon: 'log', color: '#e91e63', lessons: [
    { title: 'What is a Logarithm?', content: [
      { type: 'text', content: 'A logarithm tells us what exponent is needed to get a certain number. It is the inverse of exponentiation.' },
      { type: 'example', content: '2\u00B3 = 8, therefore log\u2082(8) = 3. This means: "2 to what power gives 8?"' },
      { type: 'text', content: 'Parts of a logarithm: log\u2082(8) = 3 — the base is 2, the argument is 8, the logarithm (exponent) is 3.' },
      { type: 'example', content: 'log\u2082(16) = 4 because 2\u2074 = 16.' },
      { type: 'example', content: 'log\u2083(27) = 3 because 3\u00B3 = 27.' },
      { type: 'example', content: 'log\u2081\u2080(100) = 2 because 10\u00B2 = 100.' },
      { type: 'rule', content: 'The base must be positive and not equal to 1.' },
      { type: 'rule', content: 'The argument must be positive.' },
    ], examples: ['log\u2082(8) = 3', 'log\u2083(27) = 3', 'log\u2081\u2080(100) = 2'] },
    { title: 'Logarithm Rules', content: [
      { type: 'text', content: 'Logarithm rules allow you to simplify complicated expressions.' },
      { type: 'heading', content: 'Product Rule' },
      { type: 'text', content: 'log_b(x \u00D7 y) = log_b(x) + log_b(y)' },
      { type: 'example', content: 'log\u2082(8 \u00D7 4) = log\u2082(8) + log\u2082(4) = 3 + 2 = 5. So log\u2082(32) = 5.' },
      { type: 'heading', content: 'Quotient Rule' },
      { type: 'text', content: 'log_b(x / y) = log_b(x) \u2212 log_b(y)' },
      { type: 'example', content: 'log\u2082(16/4) = log\u2082(16) \u2212 log\u2082(4) = 4 \u2212 2 = 2. So log\u2082(4) = 2.' },
      { type: 'heading', content: 'Power Rule' },
      { type: 'text', content: 'log_b(x\u207F) = n \u00D7 log_b(x)' },
      { type: 'example', content: 'log\u2082(8\u00B2) = 2 \u00D7 log\u2082(8) = 2 \u00D7 3 = 6.' },
      { type: 'heading', content: 'Change of Base' },
      { type: 'text', content: 'log_b(x) = log(x) / log(b). For example: log\u2082(8) = log(8) / log(2) = 3.' },
    ], examples: ['log(1000) = 3', 'log\u2082(32) = 5', 'log\u2083(27) = 3'] },
    { title: 'Natural Logarithm', content: [
      { type: 'text', content: 'The natural logarithm uses the special base e \u2248 2.71828. It is written as ln(x).' },
      { type: 'example', content: 'ln(e) = 1 because e\u00B9 = e.' },
      { type: 'example', content: 'ln(e\u00B3) = 3 because e\u00B3 = e\u00B3.' },
      { type: 'text', content: 'The natural logarithm follows the same rules as regular logarithms:' },
      { type: 'code', content: 'ln(x \u00D7 y) = ln(x) + ln(y)\nln(x / y) = ln(x) \u2212 ln(y)\nln(x\u207F) = n \u00D7 ln(x)' },
      { type: 'text', content: 'The natural logarithm and the exponential function are inverse operations:' },
      { type: 'code', content: 'ln(e\u1D39) = x\n\u1D9E^(ln(x)) = x' },
      { type: 'rule', content: 'ln(1) = 0' },
      { type: 'rule', content: 'ln(e) = 1' },
      { type: 'rule', content: 'ln(e\u00B2) = 2, ln(e\u00B3) = 3, etc.' },
    ], examples: ['ln(e) = 1', 'ln(e\u00B3) = 3', 'ln(1) = 0'] },
    { title: 'Logarithmic Operations & Change of Base', content: [
      { type: 'text', content: 'Logs of the same base can be combined: adding them multiplies arguments, subtracting them divides arguments.' },
      { type: 'heading', content: 'Adding Logarithms' },
      { type: 'text', content: 'log~b~(x) + log~b~(y) = log~b~(x \u00D7 y) — the product rule.' },
      { type: 'example', content: 'log\u2082(4) + log\u2082(8) = log\u2082(4 \u00D7 8) = log\u2082(32) = 5, because 2\u2075 = 32. As numbers: 2 + 3 = 5.' },
      { type: 'example', content: 'log(100) + log(1000) = log(100 \u00D7 1000) = log(100000) = 5, because 10\u2075 = 100000. As numbers: 2 + 3 = 5.' },
      { type: 'heading', content: 'Subtracting Logarithms' },
      { type: 'text', content: 'log~b~(x) \u2212 log~b~(y) = log~b~(x \u00F7 y) — the quotient rule.' },
      { type: 'example', content: 'log\u2082(32) \u2212 log\u2082(4) = log\u2082(32 \u00F7 4) = log\u2082(8) = 3, because 2\u00B3 = 8. As numbers: 5 \u2212 2 = 3.' },
      { type: 'heading', content: 'Change of Base' },
      { type: 'text', content: 'Many calculators only have log (base 10) and ln (base e). To evaluate a log in another base, use the change of base formula:' },
      { type: 'rule', content: 'log~b~(x) = log~c~(x) \u00F7 log~c~(b)   (c can be any positive base, usually 10)' },
      { type: 'example', content: 'log\u2082(8) = log(8) \u00F7 log(2) = 0.903 \u00F7 0.301 = 3. Check: 2\u00B3 = 8 \u2713' },
      { type: 'example', content: 'log\u2084(16) = log(16) \u00F7 log(4) = 1.204 \u00F7 0.602 = 2. Check: 4\u00B2 = 16 \u2713' },
      { type: 'example', content: 'log\u2085(125) = log(125) \u00F7 log(5) = 2.097 \u00F7 0.699 = 3. Check: 5\u00B3 = 125 \u2713' },
      { type: 'rule', content: 'log~b~(x) + log~b~(y) = log~b~(x \u00D7 y)' },
      { type: 'rule', content: 'log~b~(x) \u2212 log~b~(y) = log~b~(x \u00F7 y)' },
      { type: 'rule', content: 'Change of base: log~b~(x) = log~c~(x) \u00F7 log~c~(b)' },
    ], examples: ['log\u2082(4) + log\u2082(8) = 5', 'log\u2082(8) = log(8)/log(2) = 3'] },
  ]},
  { id: 'equations', title: 'Equations', icon: '=', color: '#1abc9c', lessons: [
    { title: 'Solving One-Step Equations', content: [
      { type: 'text', content: 'An equation says that two expressions are equal, like x + 5 = 12. Solving an equation means finding the value of x that makes it true.' },
      { type: 'text', content: 'The golden rule: whatever you do to one side, do to the other. To isolate x, use the inverse (opposite) operation.' },
      { type: 'heading', content: 'Addition and Subtraction' },
      { type: 'example', content: 'x + 5 = 12 → subtract 5 from both sides → x = 12 \u2212 5 = 7. Check: 7 + 5 = 12 \u2713' },
      { type: 'example', content: 'x \u2212 4 = 9 → add 4 to both sides → x = 9 + 4 = 13.' },
      { type: 'heading', content: 'Multiplication and Division' },
      { type: 'example', content: '3x = 18 → divide both sides by 3 → x = 6.' },
      { type: 'example', content: 'x/5 = 4 → multiply both sides by 5 → x = 20.' },
      { type: 'rule', content: 'Whatever you do to one side, do to the other.' },
      { type: 'rule', content: 'Add or subtract to undo + or \u2212.' },
      { type: 'rule', content: 'Multiply or divide to undo \u00D7 or \u00F7.' },
      { type: 'rule', content: 'Always check your answer by plugging it back in.' },
    ], examples: ['x + 5 = 12 → x = 7', '3x = 18 → x = 6'] },
    { title: 'Solving Two-Step Equations', content: [
      { type: 'text', content: 'Two-step equations need two operations to solve. First deal with addition or subtraction, then multiplication or division.' },
      { type: 'example', content: '2x + 3 = 11 → subtract 3 first → 2x = 8 → divide by 2 → x = 4. Check: 2(4) + 3 = 11 \u2713' },
      { type: 'text', content: 'Remember the order: undo +/\u2212 first, then undo \u00D7/\u00F7. Think of it as unwrapping a present from the outside in.' },
      { type: 'example', content: '3x \u2212 5 = 16 → add 5 → 3x = 21 → divide by 3 → x = 7.' },
      { type: 'example', content: '(x + 2) \u00D7 4 = 24 → divide by 4 first → x + 2 = 6 → subtract 2 → x = 4.' },
      { type: 'rule', content: 'Undo addition/subtraction before multiplication/division.' },
      { type: 'rule', content: 'Keep the equation balanced by doing the same to both sides.' },
      { type: 'rule', content: 'Check your answer in the original equation.' },
    ], examples: ['2x + 3 = 11 → x = 4', '3x \u2212 5 = 16 → x = 7'] },
    { title: 'Variables on Both Sides', content: [
      { type: 'text', content: 'When x appears on both sides, first move all x terms to one side and all numbers to the other.' },
      { type: 'example', content: '3x \u2212 4 = 2x + 6 → subtract 2x → x \u2212 4 = 6 → add 4 → x = 10.' },
      { type: 'text', content: 'Choose which side keeps x — usually the side with the larger x coefficient so x stays positive.' },
      { type: 'example', content: '5x + 2 = 3x + 14 → subtract 3x → 2x + 2 = 14 → subtract 2 → 2x = 12 → x = 6.' },
      { type: 'example', content: '4x \u2212 7 = x + 8 → subtract x → 3x \u2212 7 = 8 → add 7 → 3x = 15 → x = 5.' },
      { type: 'rule', content: 'Combine like terms first.' },
      { type: 'rule', content: 'Move all x terms to one side.' },
      { type: 'rule', content: 'Move all numbers to the other side.' },
      { type: 'rule', content: 'Check by substituting back into the original equation.' },
    ], examples: ['3x \u2212 4 = 2x + 6 → x = 10', '5x + 2 = 3x + 14 → x = 6'] },
  ]},
  { id: 'functions', title: 'Functions', icon: 'f(x)', color: '#fdcb6e', lessons: [
    { title: 'What is a Function?', content: [
      { type: 'text', content: 'A function is a rule that takes an input and gives exactly one output. It is often written as f(x), read as "f of x".' },
      { type: 'example', content: 'f(x) = 2x + 1 means: take x, multiply by 2, add 1. So f(3) = 2(3) + 1 = 7.' },
      { type: 'text', content: 'The x is called the input or independent variable. The result f(x) is the output or dependent variable.' },
      { type: 'example', content: 'f(x) = x \u2212 4 → f(10) = 10 \u2212 4 = 6. f(0) = 0 \u2212 4 = \u22124.' },
      { type: 'text', content: 'You can evaluate a function for any input by simply plugging the number in and simplifying.' },
      { type: 'graph', content: '0.5*x+1' },
      { type: 'rule', content: 'A function gives exactly one output for every input.' },
      { type: 'rule', content: 'Evaluate by substituting the input value for x.' },
      { type: 'rule', content: 'f(x) and y are often used to mean the same output.' },
    ], examples: ['f(x) = 2x + 1, f(3) = 7', 'f(x) = x \u2212 4, f(10) = 6'] },
    { title: 'Linear Functions', content: [
      { type: 'text', content: 'A linear function has the form f(x) = mx + b. Its graph is a straight line. m is the slope, b is the y-intercept.' },
      { type: 'text', content: 'The slope m tells you how fast the output grows. The y-intercept b is the output when x = 0.' },
      { type: 'example', content: 'f(x) = 3x \u2212 2: slope is 3, y-intercept is \u22122. f(4) = 3(4) \u2212 2 = 10.' },
      { type: 'graph', content: '2*x+1' },
      { type: 'text', content: 'A bigger positive slope makes the line steeper going up. A negative slope makes it go down from left to right.' },
      { type: 'text', content: 'You can work backwards too: if f(x) = 3x \u2212 2 = 10, then 3x = 12, so x = 4.' },
      { type: 'rule', content: 'Linear functions form straight lines.' },
      { type: 'rule', content: 'm is the slope (how much y changes per 1 unit of x).' },
      { type: 'rule', content: 'b is the y-intercept (value at x = 0).' },
    ], examples: ['f(x) = 3x \u2212 2, f(4) = 10', 'f(x) = 2x + 5, f(0) = 5'] },
    { title: 'Quadratic Functions', content: [
      { type: 'text', content: 'A quadratic function contains x\u00B2 and its graph is a U-shaped curve called a parabola. Its general form (posta\u0107 og\u00F3lna) is f(x) = ax\u00B2 + bx + c.' },
      { type: 'example', content: 'The sign of a decides the direction of the parabola: a > 0 opens upward (\u2229 shape) — here the vertex is the lowest point.' },
      { type: 'example', content: 'If a < 0, the parabola opens downward (\u2228 shape) — the vertex is the highest point. Example: f(x) = \u2212x\u00B2 + 3.' },
      { type: 'graph', content: 'x^2-4' },
      { type: 'text', content: 'The vertex form (posta\u0107 kanoniczna) is f(x) = a(x \u2212 p)\u00B2 + q, where (p, q) is the vertex — the turning point of the parabola.' },
      { type: 'example', content: 'f(x) = (x \u2212 3)\u00B2 + 2 → vertex at (3, 2). Since a = 1 > 0, it opens upward.' },
      { type: 'text', content: 'The factored form (posta\u0107 iloczynowa) is f(x) = a(x \u2212 x\u2081)(x \u2212 x\u2082), where x\u2081 and x\u2082 are the roots (places the graph crosses the x-axis).' },
      { type: 'example', content: 'f(x) = 2(x \u2212 1)(x \u2212 4) → roots at x = 1 and x = 4.' },
      { type: 'graph', content: '-(x+1)*(x-3)' },
      { type: 'rule', content: 'a > 0 → parabola opens up. a < 0 → parabola opens down.' },
      { type: 'rule', content: 'Vertex form f(x) = a(x \u2212 p)\u00B2 + q reveals the vertex (p, q).' },
      { type: 'rule', content: 'Factored form f(x) = a(x \u2212 x\u2081)(x \u2212 x\u2082) reveals the roots.' },
      { type: 'rule', content: 'Evaluate powers before adding or subtracting.' },
    ], examples: ['f(x) = x\u00B2, f(5) = 25', 'f(x) = (x \u2212 3)\u00B2 + 2, vertex (3, 2)'] },
    { title: 'Logarithmic Functions', content: [
      { type: 'text', content: 'The logarithmic function is f(x) = log~b~(x), where b > 0 and b \u2260 1. It answers: "b to what power gives x?"' },
      { type: 'example', content: 'f(x) = log\u2082(x): f(8) = 3 because 2\u00B3 = 8. f(2) = 1, f(1) = 0.' },
      { type: 'text', content: 'It is the inverse of the exponential function g(x) = b\u1D38. Where g turns powers into numbers, f turns numbers back into powers.' },
      { type: 'graph', content: 'log(x, 2)' },
      { type: 'text', content: 'A logarithm is only defined for positive inputs, so the domain of f is x > 0. Its graph always passes through (1, 0), because b\u2070 = 1.' },
      { type: 'example', content: 'f(x) = log\u2081\u2080(x): f(1000) = 3 because 10\u00B3 = 1000. f(10) = 1, f(1) = 0, f(0.1) = \u22121.' },
      { type: 'text', content: 'For b > 1 the function grows, but slower and slower. It never touches the y-axis (x = 0 is not allowed).' },
      { type: 'rule', content: 'log~b~(x) is only defined for x > 0.' },
      { type: 'rule', content: 'f(1) = 0 and f(b) = 1 for any valid base b.' },
      { type: 'rule', content: 'The graph passes through (1, 0) and rises slowly for b > 1.' },
    ], examples: ['f(x) = log\u2082(x), f(8) = 3', 'f(x) = log\u2081\u2080(x), f(1000) = 3'] },
  ]},
  { id: 'figures', title: 'Plane Figures', icon: '\u25B3', color: '#16a085', lessons: [
    { title: 'Lines and Angles', content: [
      { type: 'text', content: 'An angle is formed by two rays that share an endpoint (its vertex). We measure angles in degrees: a full turn is 360\u00B0.' },
      { type: 'heading', content: 'Types of angles' },
      { type: 'text', content: 'Acute (< 90\u00B0), right (= 90\u00B0), obtuse (> 90\u00B0 and < 180\u00B0), straight (= 180\u00B0), reflex (> 180\u00B0).' },
      { type: 'example', content: '35\u00B0 is acute, 90\u00B0 is right, 130\u00B0 is obtuse, 180\u00B0 is straight, 200\u00B0 is reflex.' },
      { type: 'heading', content: 'Complementary and supplementary' },
      { type: 'text', content: 'Two angles that add up to 90\u00B0 are complementary; two that add up to 180\u00B0 are supplementary.' },
      { type: 'example', content: '35\u00B0 + 55\u00B0 = 90\u00B0 \u2192 complementary. 130\u00B0 + 50\u00B0 = 180\u00B0 \u2192 supplementary.' },
      { type: 'heading', content: 'Angles at a point and on a line' },
      { type: 'text', content: 'Angles around a point always sum to 360\u00B0. Angles on a straight line sum to 180\u00B0. Vertically opposite angles (formed by two crossing lines) are equal.' },
      { type: 'example', content: 'If three angles round a point are 100\u00B0, 120\u00B0 and 80\u00B0, the fourth one is 360\u00B0 \u2212 (100\u00B0 + 120\u00B0 + 80\u00B0) = 60\u00B0.' },
      { type: 'heading', content: 'Parallel lines and a transversal' },
      { type: 'text', content: 'A line crossing two parallel lines creates: equal corresponding angles, equal alternate interior/exterior angles, and supplementary consecutive interior angles.' },
      { type: 'example', content: 'If one angle between parallel lines is 70\u00B0, the alternate interior angle is also 70\u00B0 and the consecutive interior angle is 180\u00B0 \u2212 70\u00B0 = 110\u00B0.' },
      { type: 'rule', content: 'Vertically opposite angles are equal.' },
      { type: 'rule', content: 'Angles on a straight line sum to 180\u00B0.' },
      { type: 'rule', content: 'Angles at a point sum to 360\u00B0.' },
      { type: 'rule', content: 'Parallel lines: corresponding and alternate angles are equal; consecutive interior angles are supplementary.' },
    ], examples: ['35\u00B0 + 55\u00B0 = 90\u00B0', '130\u00B0 + 50\u00B0 = 180\u00B0', '360\u00B0 \u2212 (100\u00B0 + 120\u00B0 + 80\u00B0) = 60\u00B0'] },
    { title: 'Triangles \u2014 Basics', content: [
      { type: 'text', content: 'A triangle has three sides, three vertices and three interior angles. The sum of its interior angles is always 180\u00B0.' },
      { type: 'example', content: 'A triangle with angles 60\u00B0, 70\u00B0 and 50\u00B0: 60\u00B0 + 70\u00B0 + 50\u00B0 = 180\u00B0 \u2713' },
      { type: 'heading', content: 'Types by sides' },
      { type: 'text', content: 'Scalene \u2014 all sides different. Isosceles \u2014 two equal sides; the base angles (opposite the equal sides) are equal. Equilateral \u2014 all three sides (and angles) equal; each angle is 60\u00B0.' },
      { type: 'example', content: 'In an isosceles triangle with vertex angle 40\u00B0, each base angle is [180\u221240]/2 = 70\u00B0.' },
      { type: 'heading', content: 'Types by angles' },
      { type: 'text', content: 'Acute \u2014 all angles < 90\u00B0. Right \u2014 exactly one 90\u00B0 angle; the side opposite it is the longest and is called the hypotenuse. Obtuse \u2014 one angle > 90\u00B0.' },
      { type: 'heading', content: 'Exterior angles' },
      { type: 'text', content: 'An exterior angle (formed by one side and the extension of the next) equals the sum of the two remote interior angles.' },
      { type: 'example', content: 'In a triangle with angles 40\u00B0 and 60\u00B0, the exterior angle at the third vertex is 40\u00B0 + 60\u00B0 = 100\u00B0.' },
      { type: 'rule', content: 'Interior angles sum to 180\u00B0.' },
      { type: 'rule', content: 'Isosceles: equal sides are opposite equal angles.' },
      { type: 'rule', content: 'Equilateral triangles have all angles 60\u00B0.' },
      { type: 'rule', content: 'Exterior angle = sum of the two remote interior angles.' },
      { type: 'rule', content: 'The hypotenuse is the longest side of a right triangle.' },
    ], examples: ['60\u00B0 + 70\u00B0 + 50\u00B0 = 180\u00B0', 'isosceles vertex 40\u00B0 \u2192 base angles 70\u00B0'] },
    { title: 'Area of a Triangle', content: [
      { type: 'text', content: 'The area of a triangle is [1/2] \u00D7 base \u00D7 height:  A = [a\u00B7h]/2 . Any side can be the base; the height is the perpendicular distance to the opposite vertex.' },
      { type: 'example', content: 'Base a = 8, height h = 5:  A = [8\u00B75]/2 = 20. (Answer in square units.)' },
      { type: 'text', content: 'In a right triangle the two legs are perpendicular, so A = [1/2] \u00D7 leg\u2081 \u00D7 leg\u2082.' },
      { type: 'example', content: 'Right triangle with legs 3 and 4: A = [1/2] \u00D7 3 \u00D7 4 = 6.' },
      { type: 'heading', content: 'Heron\u2019s formula' },
      { type: 'text', content: 'When all three sides a, b, c are known, first compute the semiperimeter s = [a+b+c]/2, then  A = \u221A(s(s\u2212a)(s\u2212b)(s\u2212c)) .' },
      { type: 'example', content: 'Triangle 3-4-5:  s = [3+4+5]/2 = 6,  A = \u221A(6\u00B73\u00B72\u00B71) = \u221A36 = 6.' },
      { type: 'heading', content: 'Equal areas' },
      { type: 'text', content: 'Triangles with the same base and the same height have equal area (their vertices can move along a line parallel to the base).' },
      { type: 'rule', content: 'A = [a\u00B7h]/2' },
      { type: 'rule', content: 'Right triangle: A = [1/2] \u00D7 leg\u2081 \u00D7 leg\u2082.' },
      { type: 'rule', content: 'Heron: s = [a+b+c]/2, A = \u221A(s(s\u2212a)(s\u2212b)(s\u2212c)).' },
      { type: 'rule', content: 'Same base and height \u2192 same area.' },
    ], examples: ['base 8, height 5 \u2192 20', '3-4-5 triangle \u2192 6'] },
    { title: 'Pythagorean Theorem', content: [
      { type: 'text', content: 'In a right triangle with legs a, b and hypotenuse c:  a^2^ + b^2^ = c^2^ .' },
      { type: 'example', content: 'Legs 3 and 4:  c^2^ = 3^2^ + 4^2^ = 9 + 16 = 25, so c = 5.' },
      { type: 'text', content: 'To find a leg:  a = \u221A(c^2^ \u2212 b^2^) .' },
      { type: 'example', content: 'Hypotenuse 13, leg 5:  a = \u221A(13^2^ \u2212 5^2^) = \u221A(169 \u2212 25) = \u221A144 = 12.' },
      { type: 'heading', content: 'Pythagorean triples' },
      { type: 'text', content: 'Whole-number sides that satisfy the theorem, e.g. 3-4-5, 5-12-13, 8-15-17, 7-24-25, and their multiples (6-8-10, 9-12-15\u2026).' },
      { type: 'heading', content: 'Converse' },
      { type: 'text', content: 'If a^2^ + b^2^ = c^2^ for the three sides of a triangle, then the triangle is right-angled (with hypotenuse c).' },
      { type: 'example', content: 'Sides 5, 12, 13:  5^2^ + 12^2^ = 25 + 144 = 169 = 13^2^  \u2192 it is a right triangle.' },
      { type: 'text', content: 'Applications: the diagonal of a rectangle or cuboid face, the diagonal of a square d = a\u221A2, and checking whether a corner is a right angle.' },
      { type: 'rule', content: 'a^2^ + b^2^ = c^2^ (c = hypotenuse).' },
      { type: 'rule', content: 'Leg: a = \u221A(c^2^ \u2212 b^2^).' },
      { type: 'rule', content: 'Square diagonal: d = a\u221A2.' },
      { type: 'rule', content: 'Converse: a^2^ + b^2^ = c^2^ \u2192 right angle between a and b.' },
    ], examples: ['3^2^ + 4^2^ = 25 \u2192 c = 5', '13^2^ \u2212 5^2^ = 144 \u2192 leg 12'] },
    { title: 'Squares and Rectangles', content: [
      { type: 'text', content: 'A square has all four sides equal and all angles 90\u00B0. A rectangle has opposite sides equal and all angles 90\u00B0.' },
      { type: 'heading', content: 'Square (side a)' },
      { type: 'text', content: 'Perimeter P = 4a,  area A = a^2^,  diagonal d = a\u221A2.' },
      { type: 'example', content: 'Side 5:  P = 20,  A = 25,  d = 5\u221A2.' },
      { type: 'heading', content: 'Rectangle (sides a, b)' },
      { type: 'text', content: 'Perimeter P = 2(a + b),  area A = a\u00B7b,  diagonal d = \u221A(a^2^ + b^2^) (Pythagorean theorem).' },
      { type: 'example', content: 'Rectangle 6 \u00D7 8:  P = 2(6 + 8) = 28,  A = 48,  d = \u221A(36 + 64) = 10.' },
      { type: 'heading', content: 'Useful facts' },
      { type: 'text', content: 'The diagonals of a square are equal, perpendicular and bisect each other. In a rectangle the diagonals are equal and bisect each other (they are NOT perpendicular in general).' },
      { type: 'rule', content: 'Square: P = 4a, A = a^2^, d = a\u221A2.' },
      { type: 'rule', content: 'Rectangle: P = 2(a + b), A = a\u00B7b, d = \u221A(a^2^ + b^2^).' },
      { type: 'rule', content: 'Diagonals of a rectangle are equal and bisect each other.' },
    ], examples: ['square side 5 \u2192 P = 20, A = 25', 'rectangle 6 \u00D7 8 \u2192 d = 10'] },
    { title: 'Parallelograms, Rhombuses, Kites', content: [
      { type: 'text', content: 'A parallelogram has two pairs of parallel sides. Opposite sides and opposite angles are equal; the diagonals bisect each other.' },
      { type: 'heading', content: 'Parallelogram (base a, height h)' },
      { type: 'text', content: 'Area  A = a\u00B7h  (base \u00D7 height, NOT side\u00D7side). Any side can be the base.' },
      { type: 'example', content: 'Base 7, height 4:  A = 7 \u00D7 4 = 28.' },
      { type: 'heading', content: 'Rhombus' },
      { type: 'text', content: 'A parallelogram with all four sides equal. Its diagonals are perpendicular and bisect each other (and the angles).' },
      { type: 'text', content: 'Area may be computed as A = a\u00B7h (base \u00D7 height) or  A = [d\u2081\u00B7d\u2082]/2  (half the product of the diagonals).' },
      { type: 'example', content: 'Rhombus with diagonals 6 and 8:  A = [6\u00D78]/2 = 24.' },
      { type: 'heading', content: 'Kite (deltoid)' },
      { type: 'text', content: 'Two pairs of ADJACENT equal sides. One diagonal bisects the other at a right angle. Area  A = [d\u2081\u00B7d\u2082]/2.' },
      { type: 'rule', content: 'Parallelogram: A = a\u00B7h; opposite sides/angles equal; diagonals bisect each other.' },
      { type: 'rule', content: 'Rhombus: A = [d\u2081\u00B7d\u2082]/2; diagonals perpendicular.' },
      { type: 'rule', content: 'Kite: A = [d\u2081\u00B7d\u2082]/2; one diagonal bisects the other at 90\u00B0.' },
      { type: 'rule', content: 'A rhombus with side a has perimeter P = 4a.' },
    ], examples: ['parallelogram base 7, h 4 \u2192 28', 'rhombus diagonals 6, 8 \u2192 24'] },
    { title: 'Trapezoids', content: [
      { type: 'text', content: 'A trapezoid (trapezium) is a quadrilateral with exactly one pair of parallel sides \u2014 the bases a and b. The other two sides are the legs.' },
      { type: 'heading', content: 'Area' },
      { type: 'text', content: 'A = [1/2] \u00D7 (a + b) \u00D7 h  \u2014 half the sum of the bases times the height.' },
      { type: 'example', content: 'Bases 10 and 6, height 4:  A = [1/2] \u00D7 (10 + 6) \u00D7 4 = 32.' },
      { type: 'heading', content: 'Mid-segment (midline)' },
      { type: 'text', content: 'The segment joining the midpoints of the legs is parallel to the bases and equals their average:  m = [a+b]/2 . The area is also A = m\u00B7h.' },
      { type: 'example', content: 'Bases 10 and 6:  m = [10+6]/2 = 8.' },
      { type: 'heading', content: 'Isosceles trapezoid' },
      { type: 'text', content: 'The legs are equal, the base angles are equal, and the diagonals are equal. If needed, the height can be found with the Pythagorean theorem.' },
      { type: 'example', content: 'An isosceles trapezoid with bases 10 and 4 and leg 5: drop two heights; each overhang is [10\u22124]/2 = 3, so h = \u221A(5^2^ \u2212 3^2^) = \u221A16 = 4.' },
      { type: 'rule', content: 'A = [1/2] \u00D7 (a + b) \u00D7 h.' },
      { type: 'rule', content: 'Mid-segment m = [a+b]/2; A = m\u00B7h.' },
      { type: 'rule', content: 'Isosceles trapezoid: equal legs, equal base angles, equal diagonals.' },
    ], examples: ['A = \u00BD \u00D7 (10 + 6) \u00D7 4 = 32', 'm = (10 + 6)/2 = 8'] },
    { title: 'Circles and Sectors', content: [
      { type: 'text', content: 'A circle with centre O and radius r:  diameter d = 2r,  circumference  C = 2\u03C0r,  area  A = \u03C0r^2^ . Answers stay in exact form, e.g.  C = 10\u03C0.' },
      { type: 'example', content: 'Radius 5:  C = 2\u03C0\u00B75 = 10\u03C0 \u2248 31.4,  A = \u03C0\u00B75^2^ = 25\u03C0 \u2248 78.5.' },
      { type: 'heading', content: 'Key elements' },
      { type: 'text', content: 'A chord is a segment joining two points on the circle. An arc is a part of the circumference. A tangent touches the circle in exactly one point and is perpendicular to the radius at that point.' },
      { type: 'heading', content: 'Sectors (angle \u03B1\u00B0)' },
      { type: 'text', content: 'Arc length:  l = [\u03B1]/360 \u00D7 2\u03C0r .  Sector area:  P = [\u03B1]/360 \u00D7 \u03C0r^2^ .' },
      { type: 'example', content: 'Sector of radius 6, angle 60\u00B0:  l = [60]/360 \u00D7 2\u03C0\u00D76 = [1/6] \u00D7 12\u03C0 = 2\u03C0 \u2248 6.28;  P = [60]/360 \u00D7 \u03C0\u00D736 = 6\u03C0 \u2248 18.85.' },
      { type: 'heading', content: 'Inscribed angle' },
      { type: 'text', content: 'An inscribed angle is half of the central angle subtending the same arc. In a semicircle the inscribed angle is always 90\u00B0 (Thales\u2019 theorem).' },
      { type: 'rule', content: 'd = 2r, C = 2\u03C0r, A = \u03C0r^2^.' },
      { type: 'rule', content: 'Arc: l = [\u03B1]/360 \u00D7 2\u03C0r.' },
      { type: 'rule', content: 'Sector area: P = [\u03B1]/360 \u00D7 \u03C0r^2^.' },
      { type: 'rule', content: 'Tangent \u22A5 radius; inscribed angle = half the central angle.' },
    ], examples: ['r = 5 \u2192 C = 10\u03C0, A = 25\u03C0', 'sector r = 6, 60\u00B0 \u2192 l = 2\u03C0'] },
    { title: 'Regular Polygons', content: [
      { type: 'text', content: 'A regular n-gon has n equal sides and n equal angles. For a regular n-gon:' },
      { type: 'text', content: 'Sum of interior angles:  S = (n \u2212 2) \u00D7 180\u00B0.' },
      { type: 'text', content: 'One interior angle:  [ (n\u22122)\u00D7180\u00B0 ]/n .' },
      { type: 'text', content: 'Central angle (between two adjacent radii):  360\u00B0/n .' },
      { type: 'example', content: 'Hexagon (n = 6):  S = 4 \u00D7 180\u00B0 = 720\u00B0, one angle = [720]/6 = 120\u00B0, central angle = 60\u00B0.' },
      { type: 'example', content: 'Pentagon (n = 5): one interior angle = [3 \u00D7 180\u00B0]/5 = 108\u00B0.' },
      { type: 'heading', content: 'Area' },
      { type: 'text', content: 'A regular n-gon with side s and apothem a (the radius of the inscribed circle, from centre to the middle of a side):  A = [n \u00D7 s \u00D7 a]/2  (it equals the perimeter \u00D7 apothem / 2).' },
      { type: 'text', content: 'Circumradius R is the radius of the circle through all vertices. In a regular hexagon R = s; the shallowest memory: split the hexagon into 6 equilateral triangles.' },
      { type: 'example', content: 'Regular hexagon side 2, apothem \u221A3:  A = [6 \u00D7 2 \u00D7 \u221A3]/2 = 6\u221A3.' },
      { type: 'rule', content: 'Sum of angles: (n \u2212 2) \u00D7 180\u00B0.' },
      { type: 'rule', content: 'One angle: [(n\u22122)\u00D7180\u00B0]/n;  central angle 360\u00B0/n.' },
      { type: 'rule', content: 'Area with apothem: A = [n s a]/2.' },
    ], examples: ['hexagon: angle 120\u00B0', 'pentagon: angle 108\u00B0', 'square: angle 90\u00B0'] },
    { title: 'Similarity and Scale', content: [
      { type: 'text', content: 'Two figures are similar when they have the same shape: corresponding angles are equal and corresponding sides are in a constant ratio k (the scale factor).' },
      { type: 'example', content: 'Triangles 3-4-5 and 6-8-10 are similar with scale factor k = 2.' },
      { type: 'heading', content: 'Properties' },
      { type: 'text', content: 'If the scale factor is k, then every length is multiplied by k, every area by k^2^, and every volume by k^3^.' },
      { type: 'example', content: 'Doubling every side of a figure multiplies its area by 2^2^ = 4.' },
      { type: 'heading', content: 'Similar triangles' },
      { type: 'text', content: 'Triangles are similar if: (AA) two angles are equal, (SAS) two pairs of sides are proportional with equal included angle, or (SSS) all three pairs of sides are proportional.' },
      { type: 'example', content: 'x/3 = 10/5 \u2192 x = 6. Set up a proportion and solve.' },
      { type: 'heading', content: 'Real-world uses' },
      { type: 'text', content: 'Map scales, model cars, shadow problems: the height of a tree can be found from the shadow of a stick at the same moment.' },
      { type: 'rule', content: 'Length ratio k \u2192 area ratio k^2^, volume ratio k^3^.' },
      { type: 'rule', content: 'AA, SAS or SSS from corresponding parts \u2192 triangles are similar.' },
      { type: 'rule', content: 'When writing proportions keep the same orientation on both sides.' },
    ], examples: ['3-4-5 ~ 6-8-10, k = 2', 'doubling sides \u2192 \u00D74 area'] },
  ]},
  { id: 'solids', title: '3D Figures', icon: '\u25A3', color: '#8e44ad', lessons: [
    { title: 'Cubes and Cuboids', content: [
      { type: 'text', content: 'A cube is a box where all edges are equal (edge a). A cuboid (rectangular prism) has three dimensions: length a, width b, height c.' },
      { type: 'heading', content: 'Cube (edge a)' },
      { type: 'text', content: 'Volume  V = a^3^,  surface area  S = 6a^2^  (six equal square faces).' },
      { type: 'text', content: 'Face diagonal  d\u2081 = a\u221A2,  space diagonal (through the whole cube)  d = a\u221A3.' },
      { type: 'example', content: 'Cube edge 3:  V = 27,  S = 6 \u00D7 9 = 54,  space diagonal = 3\u221A3.' },
      { type: 'heading', content: 'Cuboid (a \u00D7 b \u00D7 c)' },
      { type: 'text', content: 'Volume  V = a\u00B7b\u00B7c,  surface area  S = 2(ab + bc + ac).' },
      { type: 'text', content: 'Face diagonal on the a\u00D7b face:  d\u2081 = \u221A(a^2^ + b^2^).  Space diagonal:  d = \u221A(a^2^ + b^2^ + c^2^).' },
      { type: 'example', content: 'Cuboid 3 \u00D7 4 \u00D7 12:  V = 144,  S = 2(12 + 48 + 36) = 192,  d = \u221A(9 + 16 + 144) = \u221A169 = 13.' },
      { type: 'rule', content: 'Cube: V = a^3^, S = 6a^2^, d = a\u221A3.' },
      { type: 'rule', content: 'Cuboid: V = abc, S = 2(ab + bc + ac).' },
      { type: 'rule', content: 'Space diagonal: d = \u221A(a^2^ + b^2^ + c^2^).' },
      { type: 'rule', content: 'Units: volume in cubic units, area in square units.' },
    ], examples: ['cube edge 3 \u2192 V = 27, S = 54', 'cuboid 3\u00D74\u00D712 \u2192 d = 13'] },
    { title: 'Prisms', content: [
      { type: 'text', content: 'A prism has two congruent parallel base polygons, connected by lateral faces. In a RIGHT prism every lateral face is a rectangle and the height H is perpendicular to the bases.' },
      { type: 'heading', content: 'Formulas' },
      { type: 'text', content: 'Lateral surface area:  S\u2081 = (perimeter of base) \u00D7 H.' },
      { type: 'text', content: 'Total surface area:  S = S\u2081 + 2 \u00D7 A\u208b (two bases + lateral area).' },
      { type: 'text', content: 'Volume:  V = A\u208b \u00D7 H  (base area \u00D7 height).' },
      { type: 'example', content: 'Triangular prism whose base is a 3-4-5 right triangle (area 6), H = 10:  V = 6 \u00D7 10 = 60.' },
      { type: 'example', content: 'Same prism: base perimeter 12, so S\u2081 = 12 \u00D7 10 = 120;  total S = 120 + 12 = 132.' },
      { type: 'heading', content: 'Euler\u2019s formula' },
      { type: 'text', content: 'For any convex polyhedron:  vertices \u2212 edges + faces = 2.\nA triangular prism has 6 vertices (2\u00D73), 9 edges (3\u00D72 + 3) and 5 faces.' },
      { type: 'rule', content: 'V = A\u208b \u00D7 H.' },
      { type: 'rule', content: 'S\u2081 = perimeter \u00D7 H (right prism).' },
      { type: 'rule', content: 'Euler: V \u2212 E + F = 2.' },
      { type: 'rule', content: 'Shape of a lateral face in a right prism: rectangle.' },
    ], examples: ['V = A\u208b \u00D7 H', '3-4-5 base, H = 10 \u2192 V = 60'] },
    { title: 'Pyramids', content: [
      { type: 'text', content: 'A pyramid has one polygon base and a single apex; every lateral face is a triangle. A REGULAR pyramid has a regular base and an apex directly above its centre \u2014 all lateral faces are congruent isosceles triangles.' },
      { type: 'heading', content: 'Key measurements' },
      { type: 'text', content: 'H \u2014 the height (apex to the plane of the base, perpendicular).  h\u1D62 (slant height) \u2014 the height of a lateral face.  For a regular pyramid:  h\u1D62^2^ = H^2^ + r\u1D62^2^, where r\u1D62 is the apothem (inradius) of the base.' },
      { type: 'heading', content: 'Formulas' },
      { type: 'text', content: 'Lateral area:  S\u2081 = [1/2] \u00D7 (perimeter of base) \u00D7 h\u1D62.' },
      { type: 'text', content: 'Total surface area:  S = S\u2081 + A\u208b.' },
      { type: 'text', content: 'Volume:  V = [1/3] \u00D7 A\u208b \u00D7 H.' },
      { type: 'example', content: 'Square-based pyramid, base side 4, H = 6:  A\u208b = 16, so V = [1/3] \u00D7 16 \u00D7 6 = 32.' },
      { type: 'text', content: 'For a square pyramid the base apothem is half the side:  r\u1D62 = s/2, so  h\u1D62 = \u221A(H^2^ + (s/2)^2^).' },
      { type: 'example', content: 'Square pyramid s = 6, H = 4:  h\u1D62 = \u221A(16 + 9) = 5,  S\u2081 = [1/2] \u00D7 24 \u00D7 5 = 60.' },
      { type: 'heading', content: 'Tetrahedron' },
      { type: 'text', content: 'A triangular pyramid with a triangle base (4 faces, 4 vertices, 6 edges). A regular tetrahedron has 4 equilateral triangle faces.' },
      { type: 'rule', content: 'V = [1/3] A\u208b H.' },
      { type: 'rule', content: 'S\u2081 = [1/2] \u00D7 perimeter \u00D7 h\u1D62.' },
      { type: 'rule', content: 'Regular pyramid: h\u1D62^2^ = H^2^ + r\u1D62^2^.' },
      { type: 'rule', content: 'Lateral faces of a pyramid are triangles.' },
    ], examples: ['V = ⅓ A\u208b H', 'square pyramid s = 6, H = 4 \u2192 h\u1D62 = 5'] },
    { title: 'Cylinders', content: [
      { type: 'text', content: 'A right circular cylinder of radius r and height h resembles a tin can: two circular bases and a curved lateral surface.' },
      { type: 'heading', content: 'Formulas' },
      { type: 'text', content: 'Volume:  V = \u03C0r^2^h.  Base area: \u03C0r^2^.' },
      { type: 'text', content: 'Lateral surface area:  S\u2081 = 2\u03C0rh  (the rectangle you get by unrolling the side: width 2\u03C0r, height h).' },
      { type: 'text', content: 'Total surface area:  S = 2\u03C0r^2^ + 2\u03C0rh = 2\u03C0r(r + h).' },
      { type: 'example', content: 'r = 3, h = 5:  V = \u03C0r^2^h = 45\u03C0;  S\u2081 = 2\u03C0rh = 30\u03C0.' },
      { type: 'heading', content: 'Axial cross-section' },
      { type: 'text', content: 'Cutting the cylinder by a plane through the axis gives a rectangle of width 2r and height h; its diagonal is \u221A((2r)^2^ + h^2^).' },
      { type: 'rule', content: 'V = \u03C0r^2^h.' },
      { type: 'rule', content: 'S\u2081 = 2\u03C0rh;  S = 2\u03C0r(r + h).' },
      { type: 'rule', content: 'Axial cross-section: rectangle 2r \u00D7 h.' },
    ], examples: ['V = \u03C0r²h', 'r = 3, h = 5 \u2192 V \u2248 141.3'] },
    { title: 'Cones', content: [
      { type: 'text', content: 'A right circular cone has a circular base and an apex directly above its centre. Radius r, height h, and slant height l \u2014 the length of a generator from the apex to the rim of the base.' },
      { type: 'heading', content: 'Formulas' },
      { type: 'text', content: 'Pythagorean relation:  l^2^ = r^2^ + h^2^.' },
      { type: 'text', content: 'Volume:  V = [1/3] \u03C0r^2^h.' },
      { type: 'text', content: 'Lateral surface area:  S\u2081 = \u03C0rl.' },
      { type: 'text', content: 'Total surface area:  S = \u03C0r^2^ + \u03C0rl = \u03C0r(r + l).' },
      { type: 'example', content: 'r = 3, h = 4 \u2192 l = 5.  V = [1/3] \u03C0 \u00D7 9 \u00D7 4 = 12\u03C0 \u2248 37.7;  S\u2081 = \u03C0 \u00D7 3 \u00D7 5 = 15\u03C0 \u2248 47.1.' },
      { type: 'heading', content: 'Axial cross-section' },
      { type: 'text', content: 'Cutting a right cone through the axis gives an isosceles triangle with base 2r, height h and equal sides l. Its angle (in any axial section) plays a role in many matura problems.' },
      { type: 'heading', content: 'Development (net)' },
      { type: 'text', content: 'The lateral surface develops into a sector of a circle: radius l, arc length 2\u03C0r. The sector angle is 360\u00B0 \u00D7 r/l.' },
      { type: 'rule', content: 'l^2^ = r^2^ + h^2^.' },
      { type: 'rule', content: 'V = [1/3] \u03C0r^2^h;  S\u2081 = \u03C0rl;  S = \u03C0r(r + l).' },
      { type: 'rule', content: 'Axial section of a right cone: isosceles triangle (2r, h, l, l).' },
    ], examples: ['3-4-5 cone \u2192 V = 12\u03C0', 'S\u2081 = \u03C0rl'] },
    { title: 'Spheres', content: [
      { type: 'text', content: 'A sphere of radius r is the set of points at distance r from its centre. Diameter d = 2r.' },
      { type: 'heading', content: 'Formulas' },
      { type: 'text', content: 'Volume:  V = [4/3] \u03C0r^3^.' },
      { type: 'text', content: 'Surface area:  S = 4\u03C0r^2^.' },
      { type: 'example', content: 'r = 3:  V = [4/3] \u03C0 \u00D7 27 = 36\u03C0 \u2248 113.1;  S = 4\u03C0 \u00D7 9 = 36\u03C0 \u2248 113.1. (Nice coincidence for this radius.)' },
      { type: 'heading', content: 'Cross-sections' },
      { type: 'text', content: 'Any plane cutting a sphere produces a circle. If the plane passes through the centre you get a great circle of radius r; otherwise a smaller circle whose radius obeys the Pythagorean relation with the distance from the centre.' },
      { type: 'example', content: 'Plane at distance 3 from the centre of a sphere r = 5 \u2192 the cut circle has radius \u221A(25 \u2212 9) = 4.' },
      { type: 'heading', content: 'Inscribed and circumscribed' },
      { type: 'text', content: 'A sphere inscribed in a cube has diameter equal to the cube\u2019s edge. A sphere circumscribed about a cube has diameter equal to the cube\u2019s space diagonal a\u221A3.' },
      { type: 'rule', content: 'V = [4/3] \u03C0r^3^;  S = 4\u03C0r^2^.' },
      { type: 'rule', content: 'Cross-section radius: \u03C1 = \u221A(r^2^ \u2212 d^2^) (d = distance from centre).' },
      { type: 'rule', content: 'Sphere in cube: 2r = a;  cube in sphere: 2r = a\u221A3.' },
    ], examples: ['V = 4/3 \u03C0r³', 'r = 3 \u2192 V = 36\u03C0'] },
    { title: 'Frustums and Composite Solids', content: [
      { type: 'text', content: 'Slicing a cone (or pyramid) by a plane parallel to its base and removing the top gives a FRUSTUM. For a cone frustum with radii r\u2081, r\u2082 and height h:' },
      { type: 'text', content: 'V = [\u03C0h]/3 \u00D7 (r\u2081^2^ + r\u2081r\u2082 + r\u2082^2^).' },
      { type: 'example', content: 'r\u2081 = 2, r\u2082 = 4, h = 3:  V = [\u03C0 \u00D7 3]/3 \u00D7 (4 + 8 + 16) = 1 \u03C0 \u00D7 28 = 28\u03C0 \u2248 87.96.' },
      { type: 'text', content: 'A frustum of a pyramid (bases B\u2081, B\u2082, height H):  V = [H]/3 \u00D7 (B\u2081 + \u221A(B\u2081B\u2082) + B\u2082).' },
      { type: 'heading', content: 'Composite solids' },
      { type: 'text', content: 'Volumes of combined bodies are added; volumes of removed bodies are subtracted. Always identify which simple solids join the shape.' },
      { type: 'example', content: 'A cuboid 10 \u00D7 10 \u00D7 10 with a cylinder r = 3, h = 10 removed:  V = 1000 \u2212 \u03C0 \u00D7 9 \u00D7 10 = 1000 \u2212 90\u03C0 \u2248 717.4.' },
      { type: 'text', content: 'Similarly a truncated pyramid or objects like a "cube with a hollowed-out hemisphere" are handled by adding or subtracting known volumes.' },
      { type: 'rule', content: 'Cone frustum: V = [\u03C0h]/3 (r\u2081^2^ + r\u2081r\u2082 + r\u2082^2^).' },
      { type: 'rule', content: 'Pyramid frustum: V = [H]/3 (B\u2081 + \u221A(B\u2081B\u2082) + B\u2082).' },
      { type: 'rule', content: 'Composite: add the pieces, subtract any holes.' },
    ], examples: ['frustum r 2\u21924, h 3 \u2192 28\u03C0', 'box minus cylinder \u2248 717.4'] },
    { title: 'Angles and Solids in Solids', content: [
      { type: 'text', content: 'Beyond volume, matura problems often ask about ANGLES in space: the angle between an edge and a face, between a diagonal and an edge, or between two faces.' },
      { type: 'heading', content: 'Angle between a line and a plane' },
      { type: 'text', content: 'It is the angle between the line and its orthogonal projection onto the plane. If the line and a ray form a right triangle with the foot, use trigonometry.' },
      { type: 'example', content: 'The space diagonal of a cube forms with an edge the angle \u03B1 where cos \u03B1 = [1]/[\u221A3] \u2192 \u03B1 \u2248 54.7\u00B0.' },
      { type: 'heading', content: 'Sphere ↔ cube ↔ cylinder' },
      { type: 'text', content: 'Sphere inscribed in a cube: 2r = a. Cube inscribed in a sphere: 2r = a\u221A3. Cylinder inscribed in a cube: cube edge = diameter = height. Cylinder circumscribed about a sphere: r\u1D9C\u1D62\u2113 = r\u1D60\u1D56\u1D60, h = 2r.' },
      { type: 'example', content: 'Sphere of r = 3 inside a cube: cube edge 6, cube volume 216.' },
      { type: 'heading', content: 'Cuboid diagonals as practice' },
      { type: 'text', content: 'Two-step technique: find a face diagonal with Pythagoras, then use it as the leg for the space diagonal.' },
      { type: 'example', content: 'Cuboid 1\u00D72\u00D72: face diagonal \u221A(1+4) = \u221A5, space diagonal \u221A(5+4) = 3.' },
      { type: 'rule', content: 'Angle line–plane = angle with the orthogonal projection.' },
      { type: 'rule', content: 'cos \u03B1 = [edge]/[space diagonal] = 1/\u221A3 for a cube.' },
      { type: 'rule', content: 'Inscribed/circumscribed spheres: 2r = a (in cube), 2r = a\u221A3 (around cube).' },
    ], examples: ['cube cos \u03B1 = 1/\u221A3', 'cuboid 1\u00D72\u00D72 \u2192 d = 3'] },
  ]},
  { id: 'trig', title: 'Trigonometry', icon: '\u03B8', color: '#e67e22', lessons: [
    { title: 'Right-Triangle Ratios', content: [
      { type: 'text', content: 'In a right triangle we compare sides with the angle \u03B1 (< 90\u00B0). The sides are named relative to \u03B1: opposite, adjacent and hypotenuse (the longest side).' },
      { type: 'heading', content: 'Definitions' },
      { type: 'text', content: 'sin \u03B1 = [opposite]/[hypotenuse]    cos \u03B1 = [adjacent]/[hypotenuse]    tan \u03B1 = [opposite]/[adjacent].' },
      { type: 'text', content: 'Shortcut: SOH-CAH-TOA (Sine = Opposite/Hypotenuse, Cosine = Adjacent/Hypotenuse, Tangent = Opposite/Adjacent).' },
      { type: 'example', content: '3-4-5 triangle, angle \u03B1 opposite the side 3:  sin \u03B1 = [3]/[5] = 0.6,  cos \u03B1 = [4]/[5] = 0.8,  tan \u03B1 = [3]/[4] = 0.75.' },
      { type: 'text', content: 'Useful relations:  tan \u03B1 = [sin \u03B1]/[cos \u03B1]  and  sin^2^\u03B1 + cos^2^\u03B1 = 1.' },
      { type: 'example', content: 'tan 30\u00B0 = [sin 30\u00B0]/[cos 30\u00B0] = [1/2]/[\u221A3/2] = [1]/[\u221A3] = [\u221A3]/3.' },
      { type: 'rule', content: 'sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.' },
      { type: 'rule', content: 'tan \u03B1 = sin \u03B1 / cos \u03B1;  sin^2^\u03B1 + cos^2^\u03B1 = 1.' },
      { type: 'rule', content: 'The hypotenuse is always opposite the right angle.' },
    ], examples: ['3-4-5: sin = 0.6, cos = 0.8, tan = 0.75'] },
    { title: 'Special Angles 30\u00B0, 45\u00B0, 60\u00B0', content: [
      { type: 'text', content: 'A few angles give exact values you must memorise (they appear constantly on the matura):' },
      { type: 'code', content: '        30\u00B0        45\u00B0        60\u00B0\nsin     1/2         \u221A2/2        \u221A3/2\ncos     \u221A3/2       \u221A2/2        1/2\ntan     \u221A3/3       1           \u221A3' },
      { type: 'heading', content: 'Special triangles' },
      { type: 'text', content: '30\u00B0-60\u00B0-90\u00B0 triangle: sides in the ratio 1 : \u221A3 : 2 (short leg, long leg, hypotenuse). 45\u00B0-45\u00B0-90\u00B0: legs equal, hypotenuse = leg \u00D7 \u221A2.' },
      { type: 'example', content: '30\u00B0-60\u00B0-90\u00B0 with short leg 5: long leg 5\u221A3, hypotenuse 10.' },
      { type: 'example', content: '45\u00B0-45\u00B0-90\u00B0 with leg 6: hypotenuse 6\u221A2.' },
      { type: 'text', content: 'Also remember the boundary values: sin 0\u00B0 = 0, cos 0\u00B0 = 1, sin 90\u00B0 = 1, cos 90\u00B0 = 0.' },
      { type: 'rule', content: 'sin 30\u00B0 = 1/2, cos 30\u00B0 = \u221A3/2, tan 30\u00B0 = \u221A3/3.' },
      { type: 'rule', content: 'sin 45\u00B0 = cos 45\u00B0 = \u221A2/2, tan 45\u00B0 = 1.' },
      { type: 'rule', content: 'sin 60\u00B0 = \u221A3/2, cos 60\u00B0 = 1/2, tan 60\u00B0 = \u221A3.' },
      { type: 'rule', content: '30-60-90 sides: 1 : \u221A3 : 2;  45-45-90: 1 : 1 : \u221A2.' },
    ], examples: ['sin 30\u00B0 = 1/2', '45\u00B0 triangle hyp = 6\u221A2'] },
    { title: 'Solving Right Triangles', content: [
      { type: 'text', content: 'Solving a right triangle means finding every missing side and angle from the given data. The tools: Pythagorean theorem, the sum of angles (= 180\u00B0), and the three ratios.' },
      { type: 'example', content: 'Hypotenuse 10, angle 30\u00B0: side opposite = 10 \u00D7 sin 30\u00B0 = 10 \u00D7 0.5 = 5; side adjacent = 10 \u00D7 cos 30\u00B0 = 10 \u00D7 [\u221A3]/2 = 5\u221A3.' },
      { type: 'text', content: 'Workflow: (1) place the given side and the wanted side into the correct ratio, (2) solve the equation, (3) if the exact value comes from the special table use it.' },
      { type: 'example', content: 'Opposite = 5, angle 30\u00B0 \u2192 hyp = 5 / sin 30\u00B0 = 5 / 0.5 = 10.' },
      { type: 'text', content: 'When two sides are known, find the angle by inverse ratios: e.g. tan \u03B1 = [3]/[4] = 0.75 \u2192 \u03B1 = arctan(0.75) \u2248 36.9\u00B0 (use the tan table / calculator).' },
      { type: 'example', content: 'In a 30-60-90 triangle with short leg 7, the missing side opposite 60\u00B0 is 7\u221A3.' },
      { type: 'rule', content: 'Side = hyp \u00D7 sin/cos of the angle;  hyp = side \u00F7 sin/cos.' },
      { type: 'rule', content: 'Angle from two sides: use the inverse of the matching ratio.' },
      { type: 'rule', content: 'Third angle = 180\u00B0 \u2212 90\u00B0 \u2212 given acute angle.' },
    ], examples: ['hyp 10, 30\u00B0 \u2192 opposite 5', 'tan \u03B1 = 0.75 \u2192 \u03B1 \u2248 36.9\u00B0'] },
    { title: 'Law of Sines', content: [
      { type: 'text', content: 'For any triangle with angles \u03B1, \u03B2, \u03B3 and opposite sides a, b, c:' },
      { type: 'text', content: 'a/sin \u03B1 = b/sin \u03B2 = c/sin \u03B3  (= 2R, where R is the circumradius).' },
      { type: 'example', content: 'If \u03B1 = 30\u00B0, \u03B2 = 45\u00B0, a = 4:  b = a \u00D7 [sin \u03B2]/[sin \u03B1] = 4 \u00D7 [\u221A2/2]/[1/2] = 4\u221A2.' },
      { type: 'text', content: 'Use the law of sines when you know: two angles and a side (AAS or ASA), or two sides and a non-included angle.' },
      { type: 'text', content: 'From a/sin \u03B1 = 2R the circumradius is R = a/(2\u00B7sin \u03B1).' },
      { type: 'example', content: 'Side a = 6 opposite \u03B1 = 30\u00B0:  R = 6/(2 \u00D7 0.5) = 6.' },
      { type: 'text', content: 'Exact values like sin 30\u00B0 = 1/2 make many problems clean.' },
      { type: 'rule', content: 'a/sin \u03B1 = b/sin \u03B2 = c/sin \u03B3 = 2R.' },
      { type: 'rule', content: 'Missing angle first: \u03B3 = 180\u00B0 \u2212 \u03B1 \u2212 \u03B2.' },
      { type: 'rule', content: 'Find a side: multiply the known side by the ratio of the sines.' },
    ], examples: ['a/sin \u03B1 = b/sin \u03B2', 'a = 6, 30\u00B0 \u2192 R = 6'] },
    { title: 'Law of Cosines', content: [
      { type: 'text', content: 'For any triangle with sides a, b, c and the included angle \u03B3 between a and b:' },
      { type: 'text', content: 'c^2^ = a^2^ + b^2^ \u2212 2ab\u00B7cos \u03B3.' },
      { type: 'example', content: 'a = 3, b = 8, \u03B3 = 60\u00B0:  c^2^ = 9 + 64 \u2212 2\u00B73\u00B78\u00B7[1/2] = 73 \u2212 24 = 49 \u2192 c = 7.' },
      { type: 'text', content: 'For \u03B3 = 90\u00B0 it reduces to the Pythagorean theorem (cos 90\u00B0 = 0):  c^2^ = a^2^ + b^2^.' },
      { type: 'heading', content: 'Finding an angle' },
      { type: 'text', content: 'Rearrange:  cos \u03B3 = [a^2^ + b^2^ \u2212 c^2^]/[2ab].' },
      { type: 'example', content: 'Sides 5, 7, \u221A? — given a = 5, b = 7, c = 8:  cos \u03B3 = [25 + 49 \u2212 64]/[2\u00B75\u00B77] = [10]/[70] = [1/7].' },
      { type: 'text', content: 'Use the law of cosines when you know two sides and the included angle, or all three sides (SSS).' },
      { type: 'rule', content: 'c^2^ = a^2^ + b^2^ \u2212 2ab\u00B7cos \u03B3.' },
      { type: 'rule', content: 'cos \u03B3 = [a^2^ + b^2^ \u2212 c^2^]/[2ab].' },
      { type: 'rule', content: '\u03B3 = 90\u00B0 \u2192 c^2^ = a^2^ + b^2^ (Pythagoras).' },
    ], examples: ['a 3, b 8, 60\u00B0 \u2192 c = 7', 'cos \u03B3 = (a²+b²\u2212c²)/(2ab)'] },
    { title: 'Area of a Triangle with Sine', content: [
      { type: 'text', content: 'The area of a triangle with two sides a, b and the included angle \u03B3 is:' },
      { type: 'text', content: 'A = [1/2] \u00D7 a \u00D7 b \u00D7 sin \u03B3.' },
      { type: 'example', content: 'a = 6, b = 8, \u03B3 = 90\u00B0:  A = [1/2] \u00D7 6 \u00D7 8 \u00D7 1 = 24 (the right-triangle formula).' },
      { type: 'example', content: 'a = 6, b = 8, \u03B3 = 30\u00B0:  A = [1/2] \u00D7 6 \u00D7 8 \u00D7 [1/2] = 12.' },
      { type: 'text', content: 'Why the height: h = b\u00B7sin \u03B3, so the classic A = [1/2]ah turns into this formula.' },
      { type: 'text', content: 'For \u03B3 = 60\u00B0:  A = [1/2]ab\u00B7[\u221A3]/2 = [ab\u221A3]/4.  For \u03B3 = 45\u00B0:  A = [1/2]ab\u00B7[\u221A2]/2 = [ab\u221A2]/4.' },
      { type: 'text', content: 'There is also a link to the circumradius:  A = [abc]/[4R].' },
      { type: 'rule', content: 'A = [1/2]ab\u00B7sin \u03B3.' },
      { type: 'rule', content: '\u03B3 = 90\u00B0 \u2192 A = [1/2]ab.' },
      { type: 'rule', content: 'A = [abc]/[4R].' },
      { type: 'rule', content: 'Choose the two sides that straddle the known angle.' },
    ], examples: ['A = \u00BD ab sin \u03B3', '6, 8, 30\u00B0 \u2192 12'] },
    { title: 'Applications: Angles of Elevation and Depression', content: [
      { type: 'text', content: 'Real problems are modelled with a right triangle. The angle of elevation is measured UP from the horizontal; the angle of depression DOWN from the horizontal.' },
      { type: 'example', content: 'The shadow of a tower is 10 m and the sun is at 30\u00B0:  height = 10 \u00D7 tan 30\u00B0 = 10 \u00D7 [\u221A3]/3 = [10\u221A3]/3 m.' },
      { type: 'text', content: 'A ladder against a wall forms a right triangle with the ground and the wall.' },
      { type: 'example', content: 'A 10 m ladder makes 60\u00B0 with the ground: the top reaches 10 \u00D7 sin 60\u00B0 = 10 \u00D7 [\u221A3]/2 = 5\u221A3 m; the foot is 10 \u00D7 cos 60\u00B0 = 5 m from the wall.' },
      { type: 'text', content: 'Distances across lakes or rivers use the law of sines/cosines when the triangle is not right-angled.' },
      { type: 'example', content: 'Two observation points 100 m apart on a river bank see a boat under 45\u00B0 and 30\u00B0: build triangle, find the missing angle = 105\u00B0, then use the law of sines.' },
      { type: 'rule', content: 'Elevation/depression angle \u03B1: tan \u03B1 = [vertical]/[horizontal].' },
      { type: 'rule', content: 'Ladder: height = L\u00B7sin \u03B1, reach = L\u00B7cos \u03B1.' },
      { type: 'rule', content: 'Draw the triangle first \u2014 labelling helps you pick the right formula.' },
    ], examples: ['shadow 10 m, 30\u00B0 \u2192 [10\u221A3]/3 m', 'ladder 10 m, 60\u00B0 \u2192 5\u221A3 m'] },
    { title: 'Unit Circle, Signs and Identities', content: [
      { type: 'text', content: 'The unit circle has radius 1 centred at the origin. The point where the angle \u03B1 meets the circle has coordinates (cos \u03B1, sin \u03B1).' },
      { type: 'code', content: '0\u00B0:      (1, 0)\n90\u00B0:     (0, 1)\n180\u00B0:    (\u22121, 0)\n270\u00B0:    (0, \u22121)' },
      { type: 'heading', content: 'Signs in quadrants (ASTC)' },
      { type: 'text', content: 'All positive in QI, Sine positive in QII, Tangent positive in QIII, Cosine positive in QIV. (Memory aid: All–Sin–Tan–Cos.)' },
      { type: 'example', content: 'sin 150\u00B0 > 0 (QII), cos 150\u00B0 < 0, tan 210\u00B0 > 0 (QIII).' },
      { type: 'heading', content: 'The fundamental identity' },
      { type: 'text', content: 'sin^2^\u03B1 + cos^2^\u03B1 = 1  for every angle. It lets you find one ratio from the other.' },
      { type: 'example', content: 'sin \u03B1 = 0.6 \u2192 cos^2^\u03B1 = 1 \u2212 0.36 = 0.64 \u2192 cos \u03B1 = 0.8 (acute angle).' },
      { type: 'heading', content: 'Complementary angles' },
      { type: 'text', content: 'sin(90\u00B0 \u2212 \u03B1) = cos \u03B1 and cos(90\u00B0 \u2212 \u03B1) = sin \u03B1. Example: sin 60\u00B0 = cos 30\u00B0.' },
      { type: 'rule', content: '(cos \u03B1, sin \u03B1) is the point on the unit circle.' },
      { type: 'rule', content: 'sin^2^\u03B1 + cos^2^\u03B1 = 1.' },
      { type: 'rule', content: 'signs: QI +++, QII sin+, QIII tan+, QIV cos+.' },
      { type: 'rule', content: 'sin(90\u00B0 \u2212 \u03B1) = cos \u03B1.' },
    ], examples: ['(cos, sin) on unit circle', 'sin 60\u00B0 = cos 30\u00B0'] },
  ]},
]

// ============ PER-LESSON TASK GENERATORS ============

// --- ADDITION ---
function genAdd_L0(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { // compute
    const r = d<=1?50 : d===2?200 : d===3?999 : d===4?9999 : 99999
    const a=rand(1,r),b=rand(1,r),s=a+b
    return {display:`${a} + ${b} = ?`,answer:s,lessonIndex:0}
  }
  if (t === 1) { // fill the gap
    const r = d<=2?100 : d<=4?1000 : 100000
    const a=rand(1,r),b=rand(1,r)
    return {display:`${a} + ? = ${a+b}`,answer:b,lessonIndex:0}
  }
  if (t === 2) { // estimate MC
    const s = d<=1 ? 10 : d<=3 ? 100 : 1000
    const a = rand(2,50)*s, b = rand(2,50)*s
    const m = mc(a+b, [(a+b)-s, (a+b)+s, (a+b)+2*s])
    return { display: `About how much is ${a} + ${b}? (estimate)`, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  if (t === 3) { // series combo (chain)
    const scale = d<=2 ? 1 : d<=4 ? 10 : 100
    const adds = [rand(10,50)*scale, rand(10,50)*scale]
    if (d >= 3) adds.push(rand(10,50)*scale)
    if (d >= 5) adds.push(rand(100,500)*scale)
    const start = rand(10,50)*scale
    const total = start + adds.reduce((x,y)=>x+y,0)
    let disp = `${start} + ${adds[0]}`
    for (let i=1;i<adds.length;i++) disp += ` \u2192 + ${adds[i]}`
    disp += ' \u2192 ?'
    return { display: disp, answer: total, lessonIndex: 0 }
  }
  if (t === 4) { // word problem
    const a = rand(10,500)*(d===5?10:1), b = rand(10,500)*(d===5?10:1)
    const cases = [
      `Kuba has ${a} zł. His grandmother gives him ${b} zł. How much does Kuba have now?`,
      `A basket has ${a} apples and another basket has ${b}. How many apples are there altogether?`,
      `Sara solved ${a} tasks on Monday and ${b} on Tuesday. How many in total?`,
    ]
    return { display: cases[rand(0, cases.length-1)], answer: a+b, lessonIndex: 0 }
  }
  // find the error: check a claimed result, or correct a wrong one
  const r = d<=2 ? 50 : d<=4 ? 999 : 99999
  const a = rand(1,r), b = rand(1,r), correct = a+b
  if (rand(0,1) === 0) {
    const claim = correct + Math.max(1, Math.round(correct*0.1))
    return { display: `A student wrote ${a} + ${b} = ${claim}, but it is wrong. Give the correct result?`, answer: correct, lessonIndex: 0 }
  }
  const claim2 = rand(0,1) === 0 ? correct : correct + Math.max(1, Math.round(correct*0.1))
  return { display: `Check: ${a} + ${b} = ${claim2} — is this correct?`, options: ['True','False'], answer: claim2 === correct ? 'True' : 'False', lessonIndex: 0 }
}
function genAdd_L1(d: number): Task {
  const t = rand(0, 3)
  const mk = () => d<=1 ? round2(rand(1,50)+rand(1,9)/10) : d<=3 ? round2(rand(1,200)+rand(10,99)/100) : round2(rand(10,999)+rand(1,99)/100)
  if (t === 0) { const a=mk(),b=mk(); return {display:`${a} + ${b} = ?`,answer:round2(a+b),lessonIndex:1} }
  if (t === 1) { // money word
    const p = mk(), q = mk()
    const cases = [
      `You buy bread for ${p} zł and milk for ${q} zł. What is the total cost?`,
      `A notebook costs ${p} zł and a pen costs ${q} zł. How much together?`,
    ]
    return { display: cases[rand(0,1)], answer: round2(p+q), lessonIndex: 1 }
  }
  if (t === 2) { const a=mk(),b=mk(); return {display:`${a} + ? = ${round2(a+b)}`,answer:round2(b),lessonIndex:1} }
  // chain of decimals
  const start = round2(rand(1,20)+rand(1,9)/10)
  const adds = [round2(rand(1,10)+rand(1,9)/10), round2(rand(1,10)+rand(1,9)/10)]
  if (d >= 3) adds.push(round2(rand(1,50)+rand(1,9)/10))
  const total = round2(start + adds.reduce((x,y)=>x+y,0))
  let disp = `${start} + ${adds[0]}`
  for (let i=1;i<adds.length;i++) disp += ` \u2192 + ${adds[i]}`
  disp += ' \u2192 ?'
  return { display: disp, answer: total, lessonIndex: 1 }
}
function genAdd_L2(d: number): Task {
  const t = rand(0, 4)
  if (t === 0) {
    if (d<=1) { const b=rand(1,30),a=b+rand(1,30); return {display:`${a} + (-${b}) = ?`,answer:a-b,lessonIndex:2} }
    if (d===2) { const a=rand(-30,-1),b=rand(-30,-1); return {display:`(${a}) + (${b}) = ?`,answer:a+b,lessonIndex:2} }
    if (d===3) { const a=rand(-100,-1),b=rand(1,100); return {display:`(${a}) + ${b} = ?`,answer:a+b,lessonIndex:2} }
    const a=rand(-500,-1),b=rand(-500,-1); return {display:`(${a}) + (${b}) = ?`,answer:a+b,lessonIndex:2}
  }
  if (t === 1) { // temperature word problem
    const t1 = -rand(1,20), t2 = rand(1,30)
    return { display: `Morning: ${t1}\u00B0C, afternoon: ${t2}\u00B0C. By how many degrees did it warm up?`, answer: t2 - t1, lessonIndex: 2 }
  }
  if (t === 2) { // fill the gap with negatives
    const a = -rand(1,50), s = rand(-100,100)
    return { display: `(${a}) + ? = ${s}`, answer: s - a, lessonIndex: 2 }
  }
  if (t === 3) { // debt word problem
    const owes = rand(1,50)*(d>=4?10:1), more = rand(1,50)*(d>=4?10:1)
    return { display: `You owe ${owes} zł and borrow ${more} zł more. What is your balance (negative = in debt)?`, answer: -(owes+more), lessonIndex: 2 }
  }
  const a2 = -rand(10,40), b2 = rand(-40,40), correct = a2+b2
  const shown = correct + (rand(0,1)===0 ? rand(2,10) : -rand(2,10))
  return { display: `Check: (${a2}) + (${b2}) = ${shown} — is this correct?`, options: ['True','False'], answer: shown === correct ? 'True' : 'False', lessonIndex: 2 }
}

// --- SUBTRACTION ---
const TOP: number[] = [30, 100, 500, 5000, 50000]
function subWord(a: number, b: number): string {
  const cases = [
    `You have ${a} zł and spend ${b} zł. How much is left?`,
    `A bus carries ${a} passengers and ${b} get off. How many remain?`,
    `Team A scored ${a} points, team B scored ${b}. What is the difference?`,
  ]
  return cases[rand(0, cases.length - 1)]
}
function genSub_L0(d: number): Task {
  const t = rand(0, 4)
  if (t === 0) {
    const b=rand(1,TOP[Math.min(d-1,4)]), a=b+rand(1,TOP[Math.min(d-1,4)])
    return { display: `${a} - ${b} = ?`, answer: a-b, lessonIndex: 0 }
  }
  if (t === 1) { // fill the gap
    const b=rand(1,TOP[Math.min(d-1,4)]), a=b+rand(1,TOP[Math.min(d-1,4)])
    return { display: `${a} - ? = ${a-b}`, answer: b, lessonIndex: 0 }
  }
  if (t === 2) { // how many more to a target
    const target = [100, 200, 500, 1000, 5000][Math.min(d-1,4)]
    const have = rand(1, target - 1)
    return { display: `You have ${have} points. How many more do you need to reach ${target}?`, answer: target - have, lessonIndex: 0 }
  }
  if (t === 3) { // word problem
    const b=rand(10,500), a=b+rand(1,300)
    return { display: subWord(a, b), answer: a-b, lessonIndex: 0 }
  }
  // estimate MC
  const s = d<=1 ? 10 : d<=3 ? 100 : 1000
  const a = rand(2,50)*s, b = rand(1,49)*s, diff = a-b
  const m = mc(diff, [diff-s, diff+s, diff+2*s])
  return { display: `About how much is ${a} - ${b}? (estimate)`, options: m.options, answer: m.answer, lessonIndex: 0 }
}
function genSub_L1(d: number): Task {
  const t = rand(0, 3)
  if (t === 0) {
    const b=rand(11,99), a=b+rand(12,151); return { display: `${a} - ${b} = ?`, answer: a-b, lessonIndex: 1 }
  }
  if (t === 1) { // correct a wrong result
    const b=rand(10,4999), a=b+rand(10,4999), correct=a-b
    const off = Math.max(1, Math.round(correct*0.1))
    const shown = correct + (rand(0,1)===0 ? off : -off)
    return { display: `A student wrote ${a} - ${b} = ${shown}, which is WRONG. Give the correct result?`, answer: correct, lessonIndex: 1 }
  }
  if (t === 2) { // recover the hidden digit
    const o = rand(1,8), u = rand(1,9), t2 = rand(0,9)
    const b = o*100 + t2*10 + u
    const a = b + rand(100, 500)
    const res = a - b
    return { display: `Recover the hidden digit: ${a} - ${o}?${u} = ${res}. Which digit is hidden in \u201C${o}?${u}\u201D?`, answer: t2, lessonIndex: 1 }
  }
  // chain of subtractions
  const scale = d<=2 ? 1 : d<=4 ? 10 : 100
  const subs = [rand(10,40)*scale, rand(10,40)*scale]
  const total = subs.reduce((x,y)=>x+y,0)
  const start = rand(50,250)*scale + total
  let disp = `Start at ${start}. Subtract ${subs[0]}`
  for (let i=1;i<subs.length;i++) disp += `, then ${subs[i]}`
  disp += ' \u2192 ?'
  return { display: disp, answer: start - total, lessonIndex: 1 }
}
function genSub_L2(d: number): Task {
  const t = rand(0, 3)
  const mkB = () => round2(rand(1,200)+rand(1,99)/100)
  const mkA = () => round2(rand(3,500)+rand(1,99)/100)
  if (t === 0) { const b=mkB(), a=round2(b+mkA()); return {display:`${a} - ${b} = ?`,answer:round2(a-b),lessonIndex:2} }
  if (t === 1) { // money change
    const b=mkB(), a=round2(b+rand(1,100)+rand(1,9)/10)
    return { display: `You have ${a} zł and buy a book for ${b} zł. How much change do you get?`, answer: round2(a-b), lessonIndex: 2 }
  }
  if (t === 2) { const b=mkB(), a=round2(b+mkA()); return {display:`${a} - ? = ${round2(a-b)}`,answer:round2(b),lessonIndex:2} }
  // compare the results of two differences
  const big = round2(rand(5,30)+rand(1,9)/10)
  const small = round2(big - rand(1,9) - rand(1,9)/10)
  const d1 = round2(big + rand(2,12)+rand(1,9)/10), r1 = round2(d1 - big)
  const d2 = round2(small + rand(2,12)+rand(1,9)/10), r2 = round2(d2 - small)
  return { display: `How much bigger is the result of ${d1} - ${r1} than the result of ${d2} - ${r2}?`, answer: round2(big - small), lessonIndex: 2 }
}

// --- MULTIPLICATION ---
function genMul_L0(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) {
    let a: number, b: number
    if (d<=1) { a=rand(2,10); b=rand(2,10) } else if (d===2) { a=rand(2,12); b=rand(2,12) } else if (d===3) { a=rand(5,20); b=rand(5,20) } else if (d===4) { a=rand(10,50); b=rand(2,15) } else { a=rand(20,100); b=rand(2,20) }
    return { display: `${a} \u00D7 ${b} = ?`, answer: a*b, lessonIndex: 0 }
  }
  if (t === 1) { // missing factor
    const b=rand(2,12), a=rand(2,12)
    return { display: `? \u00D7 ${b} = ${a*b}`, answer: a, lessonIndex: 0 }
  }
  if (t === 2) { // grouping word problem
    const rows = rand(2,9), cols = rand(2,9)
    return { display: `You arrange ${rows} rows with ${cols} objects in each row. How many objects are there altogether?`, answer: rows*cols, lessonIndex: 0 }
  }
  if (t === 3) { // which expression gives the product
    const a=rand(2,12), b=rand(2,12), prod=a*b
    const m = mc(`${a} \u00D7 ${b}`, [`${a+1} \u00D7 ${b}`, `${a} \u00D7 ${b+1}`, `${a+1} \u00D7 ${b-1>=2 ? b-1 : b+2}`])
    return { display: `Which multiplication gives ${prod}?`, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  if (t === 4) { // estimate MC
    const a = rand(2,9)*10, b = rand(2,9), correct = a*b
    const m = mc(correct, [Math.round(correct*1.2), Math.round(correct*0.8), Math.round(correct*2)])
    return { display: `About how much is ${a} \u00D7 ${b}? (estimate)`, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  // tickets word problem
  const n = rand(2,9), p = rand(5,30)
  return { display: `${n} tickets cost ${p} zł each. What is the total cost?`, answer: n*p, lessonIndex: 0 }
}
function genMul_L1(d: number): Task {
  const t = rand(0, 3)
  const mk = () => d<=1 ? round2(rand(1,20)+rand(1,9)/10) : d<=3 ? round2(rand(1,50)+rand(1,9)/10) : round2(rand(10,100)+rand(1,99)/100)
  if (t === 0) { const a=mk(), b=rand(2,9); return {display:`${a} \u00D7 ${b} = ?`,answer:round2(a*b),lessonIndex:1} }
  if (t === 1) { // money word
    const p=mk(), kg=rand(1,9)
    return { display: `${kg} kg of apples cost ${p} zł per kg. What do you pay in total?`, answer: round2(p*kg), lessonIndex: 1 }
  }
  if (t === 2) { const a=mk(), b=rand(2,9); return {display:`${a} \u00D7 ? = ${round2(a*b)}`,answer:round2(b),lessonIndex:1} }
  const a=mk(), b=rand(2,9), prod=round2(a*b)
  const m = mc(`${a} \u00D7 ${b}`, [`${round2(a*1.1).toFixed(1)} \u00D7 ${b}`, `${a} \u00D7 ${b+1}`, `${round2(a*0.9).toFixed(1)} \u00D7 ${b}`])
  return { display: `Which multiplication gives ${prod}?`, options: m.options, answer: m.answer, lessonIndex: 1 }
}
function genMul_L2(d: number): Task {
  const sup2 = (n: number) => React.createElement('sup', null, String(n))
  const t = rand(0, 4)
  if (t === 0) {
    let base: number, exp: number
    if (d<=1) { base=rand(2,5); exp=rand(2,3) } else if (d===2) { base=rand(2,8); exp=rand(2,4) } else if (d===3) { base=rand(2,10); exp=rand(2,5) } else if (d===4) { base=rand(2,12); exp=rand(2,6) } else { base=rand(2,15); exp=rand(2,7) }
    return { display: React.createElement(React.Fragment, null, base, sup2(exp), ' = ?'), answer: Math.pow(base,exp), lessonIndex: 2 }
  }
  if (t === 1) { // missing exponent MC
    const base = rand(2,10), exp = rand(2,8)
    const m = mc(exp, near(exp, 2))
    const disp = React.createElement(React.Fragment, null, base, '\u1D4F = ', Math.pow(base, exp), ' \u2192 exponent ?')
    return { display: disp, options: m.options, answer: m.answer, lessonIndex: 2 }
  }
  if (t === 2) { // square area word (bridges to roots)
    const n = rand(2,20)
    return { display: `A square has area ${n*n} cm\u00B2. How long is its side?`, answer: n, lessonIndex: 2 }
  }
  if (t === 3) { // power properties MC
    const prop = rand(0,2)
    if (prop === 0) { const m = mc(1, [0, 2, 10]); return { display: React.createElement(React.Fragment, null, 'What is 7', sup2(0), '?'), options: m.options, answer: m.answer, lessonIndex: 2 } }
    if (prop === 1) { const m = mc(7, [1, 0, 49]); return { display: React.createElement(React.Fragment, null, 'What is 7', sup2(1), '?'), options: m.options, answer: m.answer, lessonIndex: 2 } }
    const base = rand(2,9), m = mc(Math.pow(base,3), near(Math.pow(base,3), 20))
    return { display: React.createElement(React.Fragment, null, 'What is ', base, sup2(3), '?'), options: m.options, answer: m.answer, lessonIndex: 2 }
  }
  // find the error
  const base = rand(2,10), exp = rand(2,5), correct = Math.pow(base,exp)
  const off = Math.max(2, Math.round(correct*0.2))
  const shown = correct + (rand(0,1)===0 ? off : -off)
  return { display: React.createElement(React.Fragment, null, 'Check: ', base, sup2(exp), ' = ', Math.max(1, shown), '. Correct?'), options: ['True','False'], answer: shown === correct ? 'True' : 'False', lessonIndex: 2 }
}

// --- DIVISION ---
function genDiv_L0(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) {
    let b: number, ans: number, a: number
    if (d<=1) { b=rand(2,10); ans=rand(2,10); a=b*ans } else if (d===2) { b=rand(2,12); ans=rand(2,20); a=b*ans } else if (d===3) { b=rand(2,20); ans=rand(5,50); a=b*ans } else if (d===4) { b=rand(5,50); ans=rand(10,100); a=b*ans } else { b=rand(5,100); ans=rand(10,200); a=b*ans }
    return { display: `${a} \u00F7 ${b} = ?`, answer: ans, lessonIndex: 0 }
  }
  if (t === 1) { // missing dividend
    const b=rand(2,12), ans=rand(2,20), a=b*ans
    return { display: `? \u00F7 ${b} = ${ans}`, answer: a, lessonIndex: 0 }
  }
  if (t === 2) { // grouping word problem
    const k = rand(2,9), q = rand(2,12)
    return { display: `${k*q} candies are packed into bags of ${k}. How many bags do you get?`, answer: q, lessonIndex: 0 }
  }
  if (t === 3) { // can you share equally?
    const k = rand(2,9), q = rand(3,12)
    const even = rand(0,1) === 0
    const n = even ? k*q : k*q + 1
    return { display: `Can ${n} items be split into ${k} equal whole-number groups?`, options: ['Yes','No'], answer: even ? 'Yes' : 'No', lessonIndex: 0 }
  }
  if (t === 4) { // part of quotient & remainder
    const k = rand(3,9), q = rand(3,12), r = rand(1,k-1), n = k*q + r
    return { display: `${n} \u00F7 ${k} leaves a remainder of ?`, answer: r, lessonIndex: 0 }
  }
  // money split
  const p = rand(2,10), total = p*rand(10,50)
  return { display: `${total} zł is split equally among ${p} people. How much does each person get?`, answer: total/p, lessonIndex: 0 }
}
function genDiv_L1(d: number): Task {
  const t = rand(0, 4)
  const mk = () => round2(rand(2,15)+rand(1,9)/10)
  if (t === 0) { const b=rand(2,9), ans=mk(), a=round2(b*ans); return {display:`${a} \u00F7 ${b} = ?`,answer:ans,lessonIndex:1} }
  if (t === 1) { // money split decimal
    const p = rand(2,8), each = round2(rand(5,40)+rand(1,9)/10), total = round2(p*each)
    return { display: `${total} zł is split equally among ${p} people. How much does each get?`, answer: each, lessonIndex: 1 }
  }
  if (t === 2) { const b=rand(2,9), ans=mk(), a=round2(b*ans); return {display:`${a} \u00F7 ? = ${ans}`,answer:round2(b),lessonIndex:1} }
  if (t === 3) { // price per item
    const n = rand(2,10), each = round2(rand(5,50)+rand(1,9)/10), total = round2(each*n)
    return { display: `${total} zł for ${n} identical items. What is the price of one item?`, answer: each, lessonIndex: 1 }
  }
  // verify a claimed result
  const b=rand(2,9), ans=mk(), a=round2(b*ans)
  const shown = round2(ans * (rand(0,1)===0 ? 1 : (rand(0,1)===0 ? 1.1 : 0.9)))
  return { display: `Check: ${a} \u00F7 ${b} = ${shown}. Is this correct?`, options: ['True','False'], answer: shown === ans ? 'True' : 'False', lessonIndex: 1 }
}
function genDiv_L2(d: number): Task {
  const t = rand(0, 3)
  if (t === 0) {
    let b: number, ans: number, a: number
    if (d<=1) { b=rand(10,20); ans=rand(10,30); a=b*ans } else if (d===2) { b=rand(10,50); ans=rand(10,100); a=b*ans } else if (d===3) { b=rand(20,100); ans=rand(10,200); a=b*ans } else if (d===4) { b=rand(50,200); ans=rand(20,500); a=b*ans } else { b=rand(100,500); ans=rand(10,1000); a=b*ans }
    return { display: `${a} \u00F7 ${b} = ?`, answer: ans, lessonIndex: 2 }
  }
  if (t === 1) { // distribute word problem
    const b = rand(12,50), ans = rand(4,30)
    return { display: `${b*ans} books are put equally onto ${b} shelves. How many books per shelf?`, answer: ans, lessonIndex: 2 }
  }
  if (t === 2) { // check with multiplication (inverse)
    const b = rand(10,100), ans = rand(10,100)
    return { display: `${b*ans} \u00F7 ${b} = ${ans}, so ${ans} \u00D7 ${b} = ?`, answer: b*ans, lessonIndex: 2 }
  }
  // missing divisor
  const b = rand(10,100), ans = rand(10,200), a = b*ans
  return { display: `${a} \u00F7 ? = ${ans}`, answer: b, lessonIndex: 2 }
}

// --- SQUARE ROOTS ---
const SUB: Record<string,string> = {'0':'\u2080','1':'\u2081','2':'\u2082','3':'\u2083','4':'\u2084','5':'\u2085','6':'\u2086','7':'\u2087','8':'\u2088','9':'\u2089'}

interface BankEntry { display: React.ReactNode; answer: number }

function makeLogDisp(base: number, val: number): React.ReactNode {
  return React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', val, ') = ?')
}
function makeRootDisp(val: number): React.ReactNode {
  return React.createElement(React.Fragment, null, '\u221A', val, ' = ?')
}

// ROOT BANK: 50 values per difficulty level
const ROOT_BANKS: BankEntry[][] = [
  Array.from({length:50}, (_,i) => { const n=i+1; return {display:makeRootDisp(n*n), answer:n} }),       // Easy: 1-50
  Array.from({length:50}, (_,i) => { const n=i+51; return {display:makeRootDisp(n*n), answer:n} }),      // Medium: 51-100
  Array.from({length:50}, (_,i) => { const n=i+101; return {display:makeRootDisp(n*n), answer:n} }),     // Hard: 101-150
  Array.from({length:50}, (_,i) => { const n=i+151; return {display:makeRootDisp(n*n), answer:n} }),     // Expert: 151-200
  Array.from({length:50}, (_,i) => { const n=i+201; return {display:makeRootDisp(n*n), answer:n} }),     // Master: 201-250
]

// LOG BANK: 40+ problems per difficulty level
const LOG_PROBLEMS: {base:number;exp:number;diff:number}[] = [
  // Diff 1 (Easy): basic small powers
  {base:2,exp:1,diff:1},{base:2,exp:2,diff:1},{base:2,exp:3,diff:1},{base:2,exp:4,diff:1},
  {base:3,exp:1,diff:1},{base:3,exp:2,diff:1},{base:3,exp:3,diff:1},
  {base:4,exp:1,diff:1},{base:4,exp:2,diff:1},{base:4,exp:3,diff:1},
  {base:5,exp:1,diff:1},{base:5,exp:2,diff:1},{base:5,exp:3,diff:1},
  {base:7,exp:1,diff:1},{base:7,exp:2,diff:1},
  {base:8,exp:1,diff:1},{base:8,exp:2,diff:1},{base:8,exp:3,diff:1},
  {base:10,exp:1,diff:1},{base:10,exp:2,diff:1},{base:10,exp:3,diff:1},
  // Diff 2 (Medium): medium powers
  {base:2,exp:5,diff:2},{base:2,exp:6,diff:2},{base:2,exp:7,diff:2},{base:2,exp:8,diff:2},
  {base:3,exp:4,diff:2},{base:3,exp:5,diff:2},{base:3,exp:6,diff:2},
  {base:4,exp:4,diff:2},{base:4,exp:5,diff:2},
  {base:5,exp:3,diff:2},{base:5,exp:4,diff:2},{base:5,exp:5,diff:2},
  {base:6,exp:2,diff:2},{base:6,exp:3,diff:2},{base:6,exp:4,diff:2},
  {base:7,exp:3,diff:2},{base:7,exp:4,diff:2},
  {base:8,exp:4,diff:2},{base:8,exp:5,diff:2},
  {base:9,exp:2,diff:2},{base:9,exp:3,diff:2},{base:9,exp:4,diff:2},
  {base:10,exp:4,diff:2},{base:10,exp:5,diff:2},
  {base:11,exp:2,diff:2},{base:11,exp:3,diff:2},
  {base:12,exp:2,diff:2},{base:12,exp:3,diff:2},
  // Diff 3 (Hard): larger bases and exponents
  {base:2,exp:9,diff:3},{base:2,exp:10,diff:3},{base:2,exp:11,diff:3},
  {base:3,exp:7,diff:3},{base:3,exp:8,diff:3},{base:3,exp:9,diff:3},
  {base:4,exp:5,diff:3},{base:4,exp:6,diff:3},
  {base:5,exp:5,diff:3},{base:5,exp:6,diff:3},{base:5,exp:7,diff:3},
  {base:6,exp:4,diff:3},{base:6,exp:5,diff:3},
  {base:7,exp:4,diff:3},{base:7,exp:5,diff:3},
  {base:8,exp:4,diff:3},{base:8,exp:5,diff:3},{base:8,exp:6,diff:3},
  {base:9,exp:4,diff:3},{base:9,exp:5,diff:3},
  {base:10,exp:5,diff:3},{base:10,exp:6,diff:3},{base:10,exp:7,diff:3},
  {base:11,exp:3,diff:3},{base:11,exp:4,diff:3},{base:11,exp:5,diff:3},
  {base:13,exp:2,diff:3},{base:13,exp:3,diff:3},{base:13,exp:4,diff:3},
  {base:14,exp:2,diff:3},{base:14,exp:3,diff:3},
  {base:15,exp:2,diff:3},{base:15,exp:3,diff:3},
  {base:16,exp:2,diff:3},{base:16,exp:3,diff:3},
  {base:17,exp:2,diff:3},{base:18,exp:2,diff:3},{base:19,exp:2,diff:3},{base:20,exp:2,diff:3},
  // Diff 4 (Expert): big numbers
  {base:2,exp:12,diff:4},{base:2,exp:13,diff:4},{base:2,exp:14,diff:4},{base:2,exp:15,diff:4},
  {base:3,exp:10,diff:4},{base:3,exp:11,diff:4},{base:3,exp:12,diff:4},
  {base:4,exp:7,diff:4},{base:4,exp:8,diff:4},
  {base:5,exp:7,diff:4},{base:5,exp:8,diff:4},
  {base:6,exp:5,diff:4},{base:6,exp:6,diff:4},{base:6,exp:7,diff:4},
  {base:7,exp:5,diff:4},{base:7,exp:6,diff:4},{base:7,exp:7,diff:4},
  {base:8,exp:6,diff:4},{base:8,exp:7,diff:4},
  {base:9,exp:5,diff:4},{base:9,exp:6,diff:4},{base:9,exp:7,diff:4},
  {base:10,exp:7,diff:4},{base:10,exp:8,diff:4},
  {base:11,exp:5,diff:4},{base:11,exp:6,diff:4},
  {base:12,exp:4,diff:4},{base:12,exp:5,diff:4},{base:12,exp:6,diff:4},
  {base:13,exp:4,diff:4},{base:13,exp:5,diff:4},
  {base:14,exp:4,diff:4},{base:14,exp:5,diff:4},
  {base:15,exp:3,diff:4},{base:15,exp:4,diff:4},
  {base:16,exp:3,diff:4},{base:16,exp:4,diff:4},
  {base:20,exp:3,diff:4},{base:20,exp:4,diff:4},
  {base:25,exp:2,diff:4},{base:25,exp:3,diff:4},
  {base:30,exp:2,diff:4},{base:30,exp:3,diff:4},
  // Diff 5 (Master): huge numbers
  {base:2,exp:16,diff:5},{base:2,exp:17,diff:5},{base:2,exp:18,diff:5},{base:2,exp:19,diff:5},{base:2,exp:20,diff:5},
  {base:3,exp:13,diff:5},{base:3,exp:14,diff:5},{base:3,exp:15,diff:5},
  {base:4,exp:9,diff:5},{base:4,exp:10,diff:5},
  {base:5,exp:9,diff:5},{base:5,exp:10,diff:5},
  {base:6,exp:7,diff:5},{base:6,exp:8,diff:5},
  {base:7,exp:7,diff:5},{base:7,exp:8,diff:5},{base:7,exp:9,diff:5},
  {base:8,exp:7,diff:5},{base:8,exp:8,diff:5},{base:8,exp:9,diff:5},
  {base:9,exp:7,diff:5},{base:9,exp:8,diff:5},
  {base:10,exp:9,diff:5},{base:10,exp:10,diff:5},
  {base:11,exp:6,diff:5},{base:11,exp:7,diff:5},{base:11,exp:8,diff:5},
  {base:12,exp:6,diff:5},{base:12,exp:7,diff:5},
  {base:13,exp:5,diff:5},{base:13,exp:6,diff:5},{base:13,exp:7,diff:5},
  {base:14,exp:5,diff:5},{base:14,exp:6,diff:5},
  {base:15,exp:5,diff:5},{base:15,exp:6,diff:5},
  {base:16,exp:4,diff:5},{base:16,exp:5,diff:5},{base:16,exp:6,diff:5},
  {base:20,exp:4,diff:5},{base:20,exp:5,diff:5},
  {base:25,exp:4,diff:5},{base:25,exp:5,diff:5},
  {base:30,exp:3,diff:5},{base:30,exp:4,diff:5},{base:30,exp:5,diff:5},
  {base:50,exp:2,diff:5},{base:50,exp:3,diff:5},
  {base:100,exp:2,diff:5},{base:100,exp:3,diff:5},
]

// LN BANK: 30+ problems per difficulty level
const LN_PROBLEMS: {exp:number;diff:number}[] = [
  // Diff 1
  {exp:1,diff:1},{exp:2,diff:1},{exp:3,diff:1},{exp:4,diff:1},{exp:5,diff:1},
  {exp:6,diff:1},{exp:7,diff:1},{exp:8,diff:1},{exp:9,diff:1},{exp:10,diff:1},
  // Diff 2
  {exp:11,diff:2},{exp:12,diff:2},{exp:13,diff:2},{exp:14,diff:2},{exp:15,diff:2},
  {exp:16,diff:2},{exp:17,diff:2},{exp:18,diff:2},{exp:19,diff:2},{exp:20,diff:2},
  {exp:21,diff:2},{exp:22,diff:2},{exp:23,diff:2},{exp:24,diff:2},{exp:25,diff:2},
  // Diff 3
  {exp:26,diff:3},{exp:28,diff:3},{exp:30,diff:3},{exp:32,diff:3},{exp:35,diff:3},
  {exp:36,diff:3},{exp:40,diff:3},{exp:42,diff:3},{exp:45,diff:3},{exp:48,diff:3},
  {exp:50,diff:3},{exp:55,diff:3},{exp:60,diff:3},{exp:64,diff:3},{exp:70,diff:3},
  // Diff 4
  {exp:72,diff:4},{exp:75,diff:4},{exp:80,diff:4},{exp:85,diff:4},{exp:90,diff:4},
  {exp:96,diff:4},{exp:100,diff:4},{exp:105,diff:4},{exp:110,diff:4},{exp:120,diff:4},
  {exp:125,diff:4},{exp:128,diff:4},{exp:130,diff:4},{exp:140,diff:4},{exp:150,diff:4},
  // Diff 5
  {exp:160,diff:5},{exp:170,diff:5},{exp:180,diff:5},{exp:192,diff:5},{exp:200,diff:5},
  {exp:210,diff:5},{exp:225,diff:5},{exp:240,diff:5},{exp:250,diff:5},{exp:256,diff:5},
  {exp:270,diff:5},{exp:300,diff:5},{exp:320,diff:5},{exp:350,diff:5},{exp:360,diff:5},
  {exp:400,diff:5},{exp:450,diff:5},{exp:500,diff:5},{exp:512,diff:5},{exp:600,diff:5},
  {exp:700,diff:5},{exp:720,diff:5},{exp:750,diff:5},{exp:800,diff:5},{exp:900,diff:5},
  {exp:1000,diff:5},
]

function genRoot_L0(d: number): Task {
  const bank = ROOT_BANKS[Math.min(d-1,4)]
  const e = bank[rand(0, bank.length-1)]
  const t = rand(0, 2)
  if (t === 0) return { display: e.display, answer: e.answer, lessonIndex: 0 }
  if (t === 1) { // MC: which value
    const m = mc(e.answer, near(e.answer, Math.max(1, Math.round(e.answer/10))))
    return { display: e.display, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  // matching pair: which statement is correct?
  const m = mc(`\u221A${e.answer*e.answer} = ${e.answer}`, near(e.answer, Math.max(1, Math.round(e.answer/10))).map(w => `\u221A${e.answer*e.answer} = ${w}`))
  return { display: 'Which pair is correct?', options: m.options, answer: m.answer, lessonIndex: 0 }
}

function genRoot_L1(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) {
    const ranges = [[4,225],[256,625],[676,1225],[1296,2025],[2116,3025]]
    const [lo,hi] = ranges[Math.min(d-1,4)]
    const n = rand(lo,hi)
    const sqrt = Math.round(Math.sqrt(n))
    if (sqrt*sqrt !== n) { const s=sqrt; return { display: `What is \u221A${s*s}?`, answer: s, lessonIndex: 1 } }
    return { display: `What is \u221A${n}?`, answer: sqrt, lessonIndex: 1 }
  }
  if (t === 1) { // inverse: if √x = n, what is x?
    const n = rand(2, Math.min(60, 5 + d * 11))
    return { display: `If \u221Ax = ${n}, what is x?`, answer: n * n, lessonIndex: 1 }
  }
  if (t === 2) { // is it a perfect square?
    const n = rand(4, 3500)
    const isPerfect = Math.sqrt(n) === Math.round(Math.sqrt(n))
    return { display: `Is ${n} a perfect square?`, options: ['Yes', 'No'], answer: isPerfect ? 'Yes' : 'No', lessonIndex: 1 }
  }
  if (t === 3) { // geometry: square area
    const n = rand(2, 30)
    return { display: `A square has area ${n*n} cm\u00B2. How long is its side?`, answer: n, lessonIndex: 1 }
  }
  if (t === 4) { // find the error
    const p = [16,25,36,49,64,81,100,121,144,169,196,225][rand(0,11)]
    const sq = Math.round(Math.sqrt(p))
    const shown = rand(0,1) === 0 ? sq : Math.max(0, sq + (rand(0,1) === 0 ? rand(1,2) : -rand(1,2)))
    return { display: `Check: \u221A${p} = ${shown}. Is this correct?`, options: ['True','False'], answer: shown === sq ? 'True' : 'False', lessonIndex: 1 }
  }
  // MC match
  const p = [25,64,121,169,225,361][rand(0,5)]
  const sq = Math.round(Math.sqrt(p))
  const m = mc(sq, near(sq, Math.max(1, Math.round(sq/5))))
  return { display: `\u221A${p} \u2192 ?`, options: m.options, answer: m.answer, lessonIndex: 1 }
}

function genRoot_L2(d: number): Task {
  const ranges = [[2,250],[251,600],[601,1200],[1201,2500],[2501,5000]]
  const [lo,hi] = ranges[Math.min(d-1,4)]
  const t = rand(0, 3)
  let n = rand(lo,hi)
  while (Math.round(Math.sqrt(n))**2 === n) n = rand(lo,hi)
  if (t === 0) {
    return { display: `Estimate \u221A${n} (nearest tenth) = ?`, answer: round2(Math.sqrt(n)), lessonIndex: 2 }
  }
  if (t === 1) { // between which two numbers
    const fl = Math.floor(Math.sqrt(n))
    const correct = `${fl} and ${fl + 1}`
    const opts = mc(correct, [`${fl - 1} and ${fl}`, `${fl - 2} and ${fl - 1}`, `${fl + 1} and ${fl + 2}`])
    return { display: `\u221A${n} lies between which two whole numbers?`, options: opts.options, answer: opts.answer, lessonIndex: 2 }
  }
  if (t === 2) { // estimate MC
    const est = Math.round(Math.sqrt(n))
    const m = mc(est, near(est, 3))
    return { display: `Which whole number is the best estimate of \u221A${n}?`, options: m.options, answer: m.answer, lessonIndex: 2 }
  }
  // ordering MC: which is the smallest
  const vals = [n]
  while (vals.length < 3) {
    let v = rand(lo,hi)
    while (Math.round(Math.sqrt(v))**2 === v || vals.includes(v)) v = rand(lo,hi)
    vals.push(v)
  }
  const minV = [...vals].sort((x,y) => x - y)[0]
  const m = mc(`\u221A${minV}`, vals.filter(v => v !== minV).map(v => `\u221A${v}`))
  return { display: `Which is the smallest: \u221A${vals[0]}, \u221A${vals[1]}, \u221A${vals[2]}?`, options: m.options, answer: m.answer, lessonIndex: 2 }
}

function genLog_L0(d: number): Task {
  const t = rand(0, 3)
  const filtered = LOG_PROBLEMS.filter(p => p.diff === Math.min(d, 5))
  const p = filtered[rand(0, filtered.length-1)]
  if (t === 0) return { display: makeLogDisp(p.base, Math.pow(p.base, p.exp)), answer: p.exp, lessonIndex: 0 }
  if (t === 1) { // MC
    const m = mc(p.exp, near(p.exp, 2))
    return { display: makeLogDisp(p.base, Math.pow(p.base, p.exp)), options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  if (t === 2) { // inverse: log_b(x) = e → x = ?
    const disp = React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(p.base)), '(x) = ', p.exp, ' \u2192 x = ?')
    return { display: disp, answer: Math.pow(p.base, p.exp), lessonIndex: 0 }
  }
  // missing exponent: base^x = value → exponent ?
  const m = mc(p.exp, near(p.exp, 2))
  const disp = React.createElement(React.Fragment, null, p.base, '\u1D4F = ', Math.pow(p.base, p.exp), ' \u2192 exponent ?')
  return { display: disp, options: m.options, answer: m.answer, lessonIndex: 0 }
}

function genLog_L1(d: number): Task {
  const t = rand(0, 4)
  if (t === 0) {
    if (d <= 1) {
      const base = rand(2,10), exp = rand(1,3)
      return { display: `log(${Math.pow(base,exp)}) = ?`, answer: round2(Math.log10(Math.pow(base,exp))), lessonIndex: 1 }
    }
    if (d === 2) {
      const base = rand(2,5), exp = rand(3,6)
      return { display: React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', Math.pow(base,exp), ') = ?'), answer: exp, lessonIndex: 1 }
    }
    if (d === 3) { const base = rand(2,8), exp = rand(3,8); return { display: React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', Math.pow(base,exp), ') = ?'), answer: exp, lessonIndex: 1 } }
    if (d === 4) { const base = rand(3,12), exp = rand(3,6); return { display: React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', Math.pow(base,exp), ') = ?'), answer: exp, lessonIndex: 1 } }
    const base = rand(2,20), exp = rand(2,5)
    return { display: React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', Math.pow(base,exp), ') = ?'), answer: exp, lessonIndex: 1 }
  }
  if (t === 1) { // product rule
    const m = mc('log(a \u00D7 b)', ['log(a) \u00D7 log(b)', 'log(a \u00F7 b)', 'log(a) \u2212 log(b)'])
    return { display: 'log(a) + log(b) = ?', options: m.options, answer: m.answer, lessonIndex: 1 }
  }
  if (t === 2) { // quotient rule
    const m = mc('log(a \u00F7 b)', ['log(a) + log(b)', 'log(a) \u00D7 log(b)', 'log(a + b)'])
    return { display: 'log(a) \u2212 log(b) = ?', options: m.options, answer: m.answer, lessonIndex: 1 }
  }
  if (t === 3) { // power rule
    const m = mc('n \u00D7 log(x)', ['log(x) + n', 'n + log(x)', 'log(x \u00F7 n)'])
    return { display: 'log(x\u207F) = ?', options: m.options, answer: m.answer, lessonIndex: 1 }
  }
  // numeric: product rule log_b(A × B)
  const base = rand(2,8), ea = rand(1,5), eb = rand(1,5)
  return { display: React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', Math.pow(base, ea), ' \u00D7 ', Math.pow(base, eb), ') = ?'), answer: ea + eb, lessonIndex: 1 }
}

function genLog_L2(d: number): Task { // Natural log
  const filtered = LN_PROBLEMS.filter(p => p.diff === Math.min(d, 5))
  const p = filtered[rand(0, filtered.length-1)]
  const lnDisp = (n: number, suffix: string) => React.createElement(React.Fragment, null, 'ln(e', React.createElement('sup', null, String(n)), ')', suffix)
  const t = rand(0, 2)
  if (t === 0) return { display: lnDisp(p.exp, ' = ?'), answer: p.exp, lessonIndex: 2 }
  if (t === 1) { const m = mc(p.exp, near(p.exp, 2)); return { display: lnDisp(p.exp, ' = ?'), options: m.options, answer: m.answer, lessonIndex: 2 } }
  const off = rand(1,2)
  const shown = rand(0,1) === 0 ? p.exp : p.exp - off
  return { display: lnDisp(p.exp, ' = ' + shown + ' \u2014 is this correct?'), options: ['True','False'], answer: shown === p.exp ? 'True' : 'False', lessonIndex: 2 }
}

function genLog_L3(d: number): Task { // Log operations: add/sub, change of base, true/false, solve
  const t = rand(0, 4)
  const p2 = (e: number) => Math.pow(2, e)
  const p10 = (e: number) => Math.pow(10, e)
  if (t === 0) { // add: log2(2^a) + log2(2^b)
    const a = rand(1, 8), b = rand(1, 8)
    const base = rand(0, 1)
    if (base === 0) return { display: `log\u2082(${p2(a)}) + log\u2082(${p2(b)}) = ?`, answer: a + b, lessonIndex: 3 }
    return { display: `log(${p10(a)}) + log(${p10(b)}) = ?`, answer: a + b, lessonIndex: 3 }
  }
  if (t === 1) { // subtract: log2(2^a) - log2(2^b)
    const a = rand(2, 9), b = rand(1, a - 1)
    const base = rand(0, 1)
    if (base === 0) return { display: `log\u2082(${p2(a)}) \u2212 log\u2082(${p2(b)}) = ?`, answer: a - b, lessonIndex: 3 }
    return { display: `log(${p10(a)}) \u2212 log(${p10(b)}) = ?`, answer: a - b, lessonIndex: 3 }
  }
  if (t === 2) { // MC: change of base
    const exp = rand(1, 6), base = rand(2, 8)
    const value = exp
    const wrong = [value - 2, value + 1, value + 2].map(v => Math.max(1, v))
    const options = [...new Set([value, ...wrong])].sort((a, b) => a - b)
    const disp = React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', Math.pow(base, exp), ') = log(', Math.pow(base, exp), ') / log(', base, ') = ?')
    return { display: disp, options, answer: value, lessonIndex: 3 }
  }
  if (t === 3) { // true/false
    const base = rand(2, 8), exp = rand(1, 6)
    const shown = rand(0, 1) === 0 ? exp : Math.max(1, exp + (rand(0, 1) === 0 ? 1 : -1))
    const isTrue = shown === exp
    const disp = React.createElement(React.Fragment, null, 'log', React.createElement('sub', null, String(base)), '(', Math.pow(base, exp), ') = ', shown, ' \u2014 is this correct?')
    return { display: disp, options: ['True', 'False'], answer: isTrue ? 'True' : 'False', lessonIndex: 3 }
  }
  // solve: log_b(x) = e → x = ?
  const base = rand(2, 8), e = rand(1, 8)
  return { display: React.createElement(React.Fragment, null, 'Solve: log', React.createElement('sub', null, String(base)), '(x) = ', e, ' \u2192 x = ?'), answer: Math.pow(base, e), lessonIndex: 3 }
}

// --- EQUATIONS ---
function genEquation_L0(d: number): Task {
  const t = rand(0, 8)
  const a=rand(1,30), x=rand(1,30)
  if (t === 0) { return {display:`x + ${a} = ${x+a} \u2192 x = ?`,answer:x,lessonIndex:0} }
  if (t === 1) { const y=rand(1,60); return {display:`x \u2212 ${a} = ${y-a} \u2192 x = ?`,answer:y,lessonIndex:0} }
  if (t === 2) { const d2=rand(2,15), y=rand(2,50); return {display:`${d2}x = ${d2*y} \u2192 x = ?`,answer:y,lessonIndex:0} }
  if (t === 3) { const d2=rand(2,12), y=rand(2,50); return {display:`x \u00F7 ${d2} = ${round2(y/d2)} \u2192 x = ?`,answer:y,lessonIndex:0} }
  if (t === 4) { // MC
    const m = mc(x, near(x, a))
    return { display: `x + ${a} = ${x+a} \u2192 x = ?`, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  if (t === 5) { // true/false: is x the solution?
    const some = rand(0,1) === 0 ? x : x + (rand(0,1) === 0 ? rand(1,a) : -rand(1,a))
    const isTrue = some === x
    return { display: `x + ${a} = ${x+a}, and x = ${Math.max(1, some)}. Correct?`, options: ['True', 'False'], answer: isTrue ? 'True' : 'False', lessonIndex: 0 }
  }
  if (t === 6) { // choose the next step
    const m = mc(`Subtract ${a} from both sides`, [`Add ${a} to both sides`, `Multiply both sides by ${a}`, `Divide both sides by ${a}`])
    return { display: `x + ${a} = ${x+a} \u2014 what is the first step?`, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  if (t === 7) { // build the equation MC
    const m = mc(`x + ${a} = ${x+a}`, [`x \u2212 ${a} = ${x+a}`, `x = ${a} + ${x+a}`, `${a}x = ${x+a}`])
    return { display: `${x} plus ${a} equals ${x+a} \u2014 which equation matches?`, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  // word problem
  const m0 = rand(0,1) === 0 ? a : a + rand(5,30)
  return { display: `Tomek has some money. After receiving ${m0} zł he has ${x + m0} zł. How much did he have at the start?`, answer: x, lessonIndex: 0 }
}

function genEquation_L1(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const a=rand(2,12), x=rand(2,50), b=rand(1,40); return {display:`${a}x + ${b} = ${a*x+b} \u2192 x = ?`,answer:x,lessonIndex:1} }
  if (t === 1) { const a=rand(2,12), x=rand(2,50), b=rand(1,30); return {display:`${a}x \u2212 ${b} = ${a*x-b} \u2192 x = ?`,answer:x,lessonIndex:1} }
  if (t === 2) { const b=rand(2,10), a=rand(2,15), x=rand(2,30); return {display:`(x + ${a}) \u00D7 ${b} = ${b*(x+a)} \u2192 x = ?`,answer:x,lessonIndex:1} }
  if (t === 3) { // choose the next step
    const sel = rand(0,2)
    if (sel === 0) { const a=rand(2,12), b=rand(1,40), x=rand(2,50); const m = mc(`Subtract ${b} from both sides`, [`Add ${b} to both sides`, `Divide both sides by ${a}`, `Multiply both sides by ${b}`]); return { display: `${a}x + ${b} = ${a*x+b} \u2014 what is the first step?`, options: m.options, answer: m.answer, lessonIndex: 1 } }
    if (sel === 1) { const a=rand(2,12), b=rand(1,30), x=rand(2,50); const m = mc(`Add ${b} to both sides`, [`Subtract ${b} from both sides`, `Divide both sides by ${a}`, `Add ${a} to both sides`]); return { display: `${a}x \u2212 ${b} = ${a*x-b} \u2014 what is the first step?`, options: m.options, answer: m.answer, lessonIndex: 1 } }
    const a=rand(2,15), x=rand(2,30), b=rand(2,10); const m = mc(`Divide both sides by ${b}`, [`Subtract ${a} from both sides`, `Add ${b} to both sides`, `Add ${a} to both sides`]); return { display: `(x + ${a}) \u00D7 ${b} = ${b*(x+a)} \u2014 what is the first step?`, options: m.options, answer: m.answer, lessonIndex: 1 }
  }
  if (t === 4) { // complete the missing step
    const a=rand(2,12), b=rand(1,40), x=rand(2,50)
    return { display: `${a}x + ${b} = ${a*x+b} \u2192 ${a}x = ?`, answer: a*x, lessonIndex: 1 }
  }
  // find the wrong step
  const a=rand(2,12), b=rand(1,30), x=rand(2,50)
  const y = a*x-b, sum = a*x
  const bad = sum + (rand(0,1) === 0 ? rand(2,8) : -rand(2,8))
  const correct = `${a}x = ${sum}`, wrong = `${a}x = ${bad}`
  const pool = [correct, wrong, `x = ${Math.round(sum/a) + 1}`, `x = ${Math.max(0, sum - a)}`]
  const opts = pool.filter((s, i) => pool.indexOf(s) === i)
  const m = mc(wrong, opts.filter(s => s !== wrong))
  return { display: `Some steps for ${a}x \u2212 ${b} = ${y} are listed. Which step is WRONG?`, options: m.options, answer: m.answer, lessonIndex: 1 }
}

function genEquation_L2(d: number): Task {
  const t = rand(0, 4)
  const a=rand(3,15), c=rand(1,a-1), b=rand(1,40), x=rand(2,50)
  const rhs = (a-c)*x + b
  if (t === 0) return { display: `${a}x + ${b} = ${c}x + ${rhs} \u2192 x = ?`, answer: x, lessonIndex: 2 }
  if (t === 1) { const m = mc(x, near(x, 3)); return { display: `${a}x + ${b} = ${c}x + ${rhs} \u2192 x = ?`, options: m.options, answer: m.answer, lessonIndex: 2 } }
  if (t === 2 && d >= 3) { // solution types
    if (rand(0,1) === 0) return { display: `${a}x + ${b} = ${a}x + ${b} \u2014 how many solutions?`, options: ['Infinite', 'Exactly one', 'None'], answer: 'Infinite', lessonIndex: 2 }
    return { display: `${a}x + ${b} = ${a}x + ${b + rand(1,9)} \u2014 how many solutions?`, options: ['None', 'Infinite', 'Exactly one'], answer: 'None', lessonIndex: 2 }
  }
  if (t === 3) { // find the wrong step
    const sum2 = rhs - b
    const correct2 = `${a - c}x = ${sum2}`
    const bad2 = `${a - c}x = ${sum2 + rand(3, 9)}`
    const m = mc(bad2, [correct2, `x = ${x + 1}`, `x = ${Math.max(1, x - 1)}`])
    return { display: `${a}x + ${b} = ${c}x + ${rhs} \u2014 a student's next step is one of these. Which one is WRONG?`, options: m.options, answer: m.answer, lessonIndex: 2 }
  }
  // build the equation from words MC
  const xx = rand(2,50), rhs2 = a*xx + b
  const m = mc(`${a}x + ${b} = ${rhs2}`, [`${a}x \u2212 ${b} = ${rhs2}`, `${c}x + ${b} = ${rhs2}`, `${a}x = ${rhs2}`])
  return { display: `${a} times a number, plus ${b}, equals ${rhs2}. Which equation matches?`, options: m.options, answer: m.answer, lessonIndex: 2 }
}

// --- FUNCTIONS ---
function genFunction_L0(d: number): Task {
  const a=rand(2,12), b=rand(1,20), c=rand(1,12)
  const y = a*c+b
  const t = rand(0, 3)
  if (t === 0) return { display: `f(x) = ${a}x ${b>=0?'+':'\u2212'} ${Math.abs(b)} \u2192 f(${c}) = ?`, answer: y, lessonIndex: 0 }
  if (t === 1) { // point on graph
    const correct = `(${c}, ${y})`
    const m = mc(correct, [`(${c+1}, ${y})`, `(${c}, ${y+1})`, `(${c-1}, ${y})`, `(${c}, ${y-1})`, `(${c+1}, ${y-1})`])
    return { display: `f(x) = ${a}x ${b>=0?'+':'\u2212'} ${Math.abs(b)} \u2014 which point lies on the graph?`, options: m.options, answer: m.answer, lessonIndex: 0 }
  }
  if (t === 2) { // true/false
    const shown = rand(0,1) === 0 ? y : y + (rand(0,1) === 0 ? rand(1,5) : -rand(1,5))
    return { display: `f(x) = ${a}x ${b>=0?'+':'\u2212'} ${Math.abs(b)} \u2192 f(${c}) = ${shown}. Correct?`, options: ['True', 'False'], answer: shown === y ? 'True' : 'False', lessonIndex: 0 }
  }
  // value MC
  const m = mc(y, near(y, 4))
  return { display: `f(x) = ${a}x ${b>=0?'+':'\u2212'} ${Math.abs(b)} \u2192 f(${c}) = ?`, options: m.options, answer: m.answer, lessonIndex: 0 }
}

function genFunction_L1(d: number): Task {
  const m=rand(2,15), b2=rand(-30,30), x=rand(1,15)
  const y = m*x+b2
  const fs = (b: number) => `f(x) = ${m}x ${b>=0?'+':'\u2212'} ${Math.abs(b)}`
  const t = rand(0, 6)
  if (t === 0) return { display: `${fs(b2)} \u2192 f(${x}) = ?`, answer: y, lessonIndex: 1 }
  if (t === 1) return { display: `${fs(b2)} \u2192 f(x) = ${y} \u2192 x = ?`, answer: x, lessonIndex: 1 }
  if (t === 2) { const m2 = mc(x, near(x)); return { display: `${fs(b2)} \u2192 f(x) = ${y} \u2192 x = ?`, options: m2.options, answer: m2.answer, lessonIndex: 1 } }
  if (t === 3) {
    const correct = `(${x}, ${y})`
    const m3 = mc(correct, [`(${x+1}, ${y})`, `(${x}, ${y+1})`, `(${x-1}, ${y})`, `(${x+1}, ${y-1})`, `(${x}, ${y-1})`])
    return { display: `${fs(b2)} \u2014 which point lies on the graph?`, options: m3.options, answer: m3.answer, lessonIndex: 1 }
  }
  if (t === 4) { // y-intercept
    const m4 = rand(2,12), b4 = rand(0,30)
    return { display: `f(x) = ${m4}x ${b4>=0?'+':'\u2212'} ${Math.abs(b4)} \u2192 y-intercept = ?`, answer: b4, lessonIndex: 1 }
  }
  if (t === 5) { // which formula has slope k?
    const k = rand(2,9)
    const f0 = `f(x) = ${k}x + ${rand(0,5)}`
    const arr = [
      f0,
      `f(x) = ${rand(1,12)}x + ${rand(0,5)}`,
      `f(x) = ${rand(1,12)}x \u2212 ${rand(0,5)}`,
      `f(x) = ${rand(1,12)}x + ${rand(0,5)}`,
    ]
    const m = mc(f0, arr.filter(s => s !== f0))
    return { display: `Which formula has slope ${k}?`, options: m.options, answer: m.answer, lessonIndex: 1 }
  }
  // taxi word problem
  const base = rand(5,12), per = rand(2,6), km = rand(2,12)
  return { display: `A taxi charges ${base} zł plus ${per} zł per kilometre. How much for ${km} km?`, answer: base + per*km, lessonIndex: 1 }
}

function genFunction_L2(d: number): Task {
  const t = rand(0, 6)
  if (t === 0) { const b=rand(0,50), x=rand(1,12); return { display: `f(x) = x\u00B2 ${b>=0?'+':'\u2212'} ${Math.abs(b)} \u2192 f(${x}) = ?`, answer: x*x+b, lessonIndex: 2 } }
  if (t === 1) { const a=rand(2,8), c2=rand(0,30), x=rand(1,10); return { display: `f(x) = ${a}x\u00B2 ${c2>=0?'+':'\u2212'} ${Math.abs(c2)} \u2192 f(${x}) = ?`, answer: a*x*x+c2, lessonIndex: 2 } }
  if (t === 2) { const x=rand(1,15); return { display: `f(x) = x\u00B2 \u2192 f(${x}) = ?`, answer: x*x, lessonIndex: 2 } }
  if (t === 3) { // direction of parabola
    let a = 0; while (a === 0) a = rand(-8, 8)
    const up = a > 0
    const c2 = rand(0, 20)
    const sign = a > 0 ? '' : '\u2212'
    const disp = React.createElement(React.Fragment, null, `f(x) = ${sign}${Math.abs(a)===1?'':Math.abs(a)}x\u00B2`, c2>0 ? ` + ${c2}` : '', ' \u2192 parabola opens...')
    return { display: disp, options: ['Up', 'Down'], answer: up ? 'Up' : 'Down', lessonIndex: 2 }
  }
  if (t === 4) { // vertex, second coordinate
    const p = rand(1, 12), q = rand(1, 60)
    const disp = React.createElement(React.Fragment, null, 'f(x) = (x \u2212 ', p, ')\u00B2 + ', q, ' \u2192 vertex (', p, ', ?)')
    return { display: disp, answer: q, lessonIndex: 2 }
  }
  if (t === 5) { // vertex as MC
    const p = rand(1, 12), q = rand(1, 60)
    const m = mc(`(${p}, ${q})`, [`(${q}, ${p})`, `(${-p}, ${q})`, `(${p}, ${-q})`])
    return { display: React.createElement(React.Fragment, null, 'f(x) = (x \u2212 ', p, ')\u00B2 + ', q, ' \u2192 vertex = ?'), options: m.options, answer: m.answer, lessonIndex: 2 }
  }
  // roots from factored form
  const r1 = rand(1, 10), r2 = rand(2, 12)
  const a = rand(1, 3)
  const correct = `${r1} and ${r2}`
  const m = mc(correct, [`${r2} and ${r1}`, `${r1 + 1} and ${r2}`, `${r1} and ${-r2}`])
  return { display: `f(x) = ${a}(x \u2212 ${r1})(x \u2212 ${r2}) \u2192 the roots are?`, options: m.options, answer: m.answer, lessonIndex: 2 }
}

function genFunction_L3(d: number): Task {
  const b = rand(2, 6), e = rand(1, 6)
  const subd = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089'
  const t = rand(0, 4)
  if (t === 0) {
    const disp = React.createElement(React.Fragment, null, 'f(x) = log', subd[b], '(x) \u2192 f(', Math.pow(b, e), ') = ?')
    return { display: disp, answer: e, lessonIndex: 3 }
  }
  if (t === 1) { // f(1) = ?
    const m = mc(0, [1, b, 2])
    const disp = React.createElement(React.Fragment, null, 'f(x) = log', subd[b], '(x) \u2192 f(1) = ?')
    return { display: disp, options: m.options, answer: m.answer, lessonIndex: 3 }
  }
  if (t === 2) { // true/false
    const shown = rand(0,1) === 0 ? e : e + (rand(0,1) === 0 ? 1 : -1)
    const isTrue = Math.max(1, shown) === e
    const disp = React.createElement(React.Fragment, null, 'f(x) = log', subd[b], '(x): f(', Math.pow(b, e), ') = ', Math.max(1, shown), '. Correct?')
    return { display: disp, options: ['True', 'False'], answer: isTrue ? 'True' : 'False', lessonIndex: 3 }
  }
  if (t === 3) { // domain
    const m = mc('x > 0', ['x \u2265 0', 'x \u2260 0', 'all real x'])
    return { display: React.createElement(React.Fragment, null, 'f(x) = log', subd[b], '(x) \u2014 what is the domain?'), options: m.options, answer: m.answer, lessonIndex: 3 }
  }
  // f(b) = ?
  const m = mc(1, [b, 0, 2])
  const disp = React.createElement(React.Fragment, null, 'f(x) = log', subd[b], '(x) \u2192 f(', b, ') = ?')
  return { display: disp, options: m.options, answer: m.answer, lessonIndex: 3 }
}

// ============ PLANE FIGURES (figures) ============
const TRIPLES: [number, number, number][] = [[3,4,5],[5,12,13],[8,15,17],[7,24,25],[6,8,10],[9,12,15],[12,16,20],[15,20,25]]
const RTRIPLES: [number, number, number][] = [[3,4,5],[6,8,10],[9,12,15],[12,16,20],[15,20,25]]

function pyTri(h: boolean): [number, number, number] { return TRIPLES[rand(0, TRIPLES.length - 1)] }

function genFigAngles_L0(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { // angle at a point (sum 360)
    const a = rand(30, 120), b = rand(30, 120), c = rand(30, 120)
    return { display: renderMath(`Three angles round a point are ${a}\u00B0, ${b}\u00B0 and ${c}\u00B0. Find the fourth angle.`), answer: 360 - a - b - c, lessonIndex: 0 }
  }
  if (t === 1) { // angles on a line
    const a = rand(20, 160)
    return { display: renderMath(`Two angles lie on a straight line. One is ${a}\u00B0. Find the other.`), answer: 180 - a, lessonIndex: 0 }
  }
  if (t === 2) { // complementary
    const a = rand(10, 80)
    return { display: renderMath(`${a}\u00B0 and another angle are complementary. Find the missing angle (complement).`), answer: 90 - a, lessonIndex: 0 }
  }
  if (t === 3) { // supplementary
    const a = rand(10, 170)
    return { display: renderMath(`${a}\u00B0 and another angle are supplementary. Find the missing angle.`), answer: 180 - a, lessonIndex: 0 }
  }
  if (t === 4) { // vertically opposite
    const a = rand(20, 160)
    return { display: renderMath(`Two lines cross. One of the vertically opposite angles is ${a}\u00B0. Find the other one.`), answer: a, lessonIndex: 0 }
  }
  // parallel lines with transversal
  const main = rand(20, 160)
  const kind = rand(0, 2)
  return { display: renderMath(`Parallel lines are cut by a transversal; one angle is ${main}\u00B0. ` + (kind === 0 ? 'Find the corresponding angle.' : kind === 1 ? 'Find the alternate interior angle.' : 'Find the consecutive interior angle.')), answer: kind === 2 ? 180 - main : main, lessonIndex: 0 }
}
function genFigTriangles_L1(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { // third angle
    const a = rand(20, 60), b = rand(20, 120 - a)
    return { display: renderMath(`A triangle has angles ${a}\u00B0 and ${b}\u00B0. Find the third angle.`), answer: 180 - a - b, lessonIndex: 1 }
  }
  if (t === 1) { // isosceles: base from vertex
    const v = rand(20, 140)
    return { display: renderMath(`An isosceles triangle has vertex angle ${v}\u00B0. Find each base angle.`), answer: (180 - v) / 2, lessonIndex: 1 }
  }
  if (t === 2) { // isosceles: vertex from base
    const b = rand(20, 80)
    return { display: renderMath(`An isosceles triangle has base angles of ${b}\u00B0. Find the vertex angle.`), answer: 180 - 2 * b, lessonIndex: 1 }
  }
  if (t === 3) { // right triangle acute
    const a = rand(10, 80)
    return { display: renderMath(`A right triangle has one acute angle of ${a}\u00B0. Find the other acute angle.`), answer: 90 - a, lessonIndex: 1 }
  }
  if (t === 4) { // exterior angle
    const a = rand(20, 70), b = rand(20, 60)
    return { display: renderMath(`A triangle has angles ${a}\u00B0 and ${b}\u00B0 at two vertices. Find the exterior angle at the third vertex.`), answer: a + b, lessonIndex: 1 }
  }
  // MC: true/false about triangle facts
  const facts = [
    ['An equilateral triangle has each angle 60\u00B0', 'True'],
    ['The exterior angle equals the sum of the two remote interior angles', 'True'],
    ['A right triangle can be obtuse', 'False'],
    ['In an isosceles triangle all three angles are always equal', 'False'],
    ['A triangle can have two right angles', 'False'],
    ['The hypotenuse is the longest side of a right triangle', 'True'],
  ] as const
  const f = facts[rand(0, facts.length - 1)]
  return { display: renderMath(`True or false? ` + f[0] + '.'), options: ['True', 'False'], answer: f[1], lessonIndex: 1 }
}
function genFigTriArea_L2(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { // base and height
    const b = rand(3, 20), h = rand(3, 20)
    return { display: renderMath(`Triangle with base ${b} and height ${h}. Area?`), answer: round2(b * h / 2), lessonIndex: 2 }
  }
  if (t === 1) { // find base from area and height
    const h = rand(3, 12), k = rand(1, 8)
    const b = 2 * k
    return { display: renderMath(`Triangle of area [${h * k}] square units and height ${h}. Find the base.`), answer: b, lessonIndex: 2 }
  }
  if (t === 2) { // right triangle legs
    const a = rand(3, 20), b = rand(3, 20)
    return { display: renderMath(`Right triangle with legs ${a} and ${b}. Area?`), answer: round2(a * b / 2), lessonIndex: 2 }
  }
  if (t === 3) { // semiperimeter
    const a = rand(4, 20), b = rand(4, 20), c = rand(4, 20)
    return { display: renderMath(`Triangle sides: ${a}, ${b}, ${c}. Find the semiperimeter s = [a+b+c]/2.`), answer: round2((a + b + c) / 2), lessonIndex: 2 }
  }
  if (t === 4) { // Heron, curated
    const tgs: [number, number, number][] = [[3,4,5],[5,5,6],[5,12,13],[6,8,10],[13,14,15],[8,15,17]]
    const [a, b, c] = tgs[rand(0, tgs.length - 1)]
    return { display: renderMath(`Use Heron\u2019s formula for sides ${a}, ${b}, ${c}: s = [${a + b + c}]/2, A = \u221A(s(s\u2212${a})(s\u2212${b})(s\u2212${c})). Area?`), answer: heronArea(a, b, c), lessonIndex: 2 }
  }
  // MC compute
  const b = rand(3, 12), h = rand(3, 12)
  const ans = b * h / 2
  const m = mc(ans, [ans + 1, ans * 2, b * h])
  return { display: renderMath(`Base ${b}, height ${h}. Which is the correct area?`), options: m.options, answer: m.answer, lessonIndex: 2 }
}
function heronArea(a: number, b: number, c: number): number {
  const s = (a + b + c) / 2
  return Math.round(Math.sqrt(s * (s - a) * (s - b) * (s - c)) * 100) / 100
}
function genFigPythag_L3(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { // hypotenuse from legs (triples)
    const [a, b, c] = pyTri(true)
    return { display: renderMath(`Right triangle legs ${a} and ${b}. Find the hypotenuse.`), answer: c, lessonIndex: 3 }
  }
  if (t === 1) { // leg from hyp and leg
    const [a, b, c] = pyTri(true)
    const keep = rand(0, 1) === 0 ? a : b
    const missing = keep === a ? b : a
    return { display: renderMath(`Right triangle hypotenuse ${c} and one leg ${keep}. Find the other leg.`), answer: missing, lessonIndex: 3 }
  }
  if (t === 2) { // rectangle diagonal in exact radical form
    const a = rand(2, 10), b = rand(2, 10)
    return { display: renderMath(`A rectangle has sides ${a} and ${b}. Its diagonal is \u221An in exact form (d^2^ = a^2^ + b^2^). Find n.`), answer: a * a + b * b, lessonIndex: 3 }
  }
  if (t === 3) { // general hypotenuse in exact radical form
    const a = rand(3, 20), b = rand(3, 20)
    return { display: renderMath(`Right triangle legs ${a} and ${b}. The hypotenuse is \u221An in exact form. Find n.`), answer: a * a + b * b, lessonIndex: 3 }
  }
  if (t === 4) { // converse MC
    const [a, b, c] = pyTri(true)
    const right = rand(0, 1) === 0
    const q = right ? c : c + 1
    return { display: renderMath(`Sides ${a}, ${b}, ${q}. Is this a right triangle (Pythagorean converse)?`), options: ['Yes', 'No'], answer: (a * a + b * b === q * q) ? 'Yes' : 'No', lessonIndex: 3 }
  }
  // MC: pick the Pythagorean triple set
  const [a, b, c] = pyTri(true)
  const wrongs = [[a + 1, b, c + 1], [a, b + 2, c], [a + 3, b, c]].filter(s => s[0] !== a || s[1] !== b || s[2] !== c)
  const m = mc(`${a}, ${b}, ${c}`, wrongs.map(w => `${w[0]}, ${w[1]}, ${w[2]}`))
  return { display: renderMath(`Which set of side lengths is a Pythagorean triple?`), options: m.options, answer: m.answer, lessonIndex: 3 }
}
function genFigQuad_L4(d: number): Task {
  const t = rand(0, 7)
  if (t === 0) { const a = rand(2, 15); return { display: renderMath(`Square of side ${a}. Area?`), answer: a * a, lessonIndex: 4 } }
  if (t === 1) { const a = rand(2, 15); return { display: renderMath(`Square of side ${a}. Perimeter?`), answer: 4 * a, lessonIndex: 4 } }
  if (t === 2) { const a = rand(2, 12); return { display: renderMath(`A square has area ${a * a}. Find its side.`), answer: a, lessonIndex: 4 } }
  if (t === 3) { const a = rand(3, 20), b = rand(3, 20); return { display: renderMath(`Rectangle ${a} \u00D7 ${b}. Area?`), answer: a * b, lessonIndex: 4 } }
  if (t === 4) { const a = rand(3, 20), b = rand(3, 20); return { display: renderMath(`Rectangle ${a} \u00D7 ${b}. Perimeter?`), answer: 2 * (a + b), lessonIndex: 4 } }
  if (t === 5) { const [a, b, c] = pyTri(true); return { display: renderMath(`Rectangle ${a} \u00D7 ${b}. Find its diagonal.`), answer: c, lessonIndex: 4 } }
  if (t === 6) { const a = rand(2, 12); return { display: renderMath(`A square has side ${a}. Its diagonal is \u221An in exact form (d = a\u221A2 \u2192 d^2^ = 2a^2^). Find n.`), answer: 2 * a * a, lessonIndex: 4 } }
  const a = rand(3, 12), k = rand(2, 8); const b = a * k
  return { display: renderMath(`A rectangle has area ${b} and one side ${a}. Find the other side.`), answer: k, lessonIndex: 4 }
}
function genFigParall_L5(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const b = rand(3, 20), h = rand(3, 20); return { display: renderMath(`Parallelogram base ${b} and height ${h}. Area?`), answer: b * h, lessonIndex: 5 } }
  if (t === 1) { const h = rand(3, 12), k = rand(2, 10); return { display: renderMath(`A parallelogram has area ${h * k} and height ${h}. Find the base.`), answer: k, lessonIndex: 5 } }
  if (t === 2) { const d1 = rand(2, 12) * 2, d2 = rand(2, 12) * 2; return { display: renderMath(`Rhombus with diagonals ${d1} and ${d2}. Area A = [d\u2081\u00B7d\u2082]/2?`), answer: d1 * d2 / 2, lessonIndex: 5 } }
  if (t === 3) { const k = rand(3, 12), d2 = rand(2, 8) * 2; return { display: renderMath(`A rhombus has area ${k * d2} and one diagonal ${d2}. Find the other diagonal.`), answer: k, lessonIndex: 5 } }
  if (t === 4) { const a = rand(3, 15); return { display: renderMath(`A rhombus has side ${a}. Perimeter?`), answer: 4 * a, lessonIndex: 5 } }
  const facts = [
    ['The diagonals of a rhombus are perpendicular', 'True'],
    ['A rhombus has all four sides equal', 'True'],
    ['The diagonals of a parallelogram are always perpendicular', 'False'],
    ['The diagonals of a parallelogram bisect each other', 'True'],
    ['Opposite angles of a parallelogram are always equal', 'True'],
    ['A rectangle\u2019s diagonals are perpendicular', 'False'],
  ] as const
  const f = facts[rand(0, facts.length - 1)]
  return { display: renderMath(`True or false? ` + f[0] + '.'), options: ['True', 'False'], answer: f[1], lessonIndex: 5 }
}
function genFigTrap_L6(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const a = rand(5, 20), b = rand(3, 15), h = rand(3, 10); return { display: renderMath(`Trapezoid bases ${a} and ${b}, height ${h}. Area A = [1/2](a + b)h?`), answer: (a + b) * h / 2, lessonIndex: 6 } }
  if (t === 1) { const a = rand(5, 20), b = rand(3, 15), h = rand(2, 8); return { display: renderMath(`A trapezoid has bases ${a} and ${b} and area [${(a + b) * h}/2]. Find the height h = [2A]/[a + b].`), answer: h, lessonIndex: 6 } }
  if (t === 2) { const a = rand(6, 24), b = rand(2, 10); return { display: renderMath(`Trapezoid bases ${a} and ${b}. Find the mid-segment m = [a+b]/2.`), answer: (a + b) / 2, lessonIndex: 6 } }
  if (t === 3) { const m = rand(4, 15), h = rand(3, 10); return { display: renderMath(`A trapezoid has mid-segment ${m} and height ${h}. Area A = m\u00B7h?`), answer: m * h, lessonIndex: 6 } }
  if (t === 4) { // isosceles trapezoid with Pythagorean height
    const leg = pick([[5, 4], [10, 6], [26, 10], [25, 7]], 1)[0] as [number, number]
    const [hv, overhang] = leg
    const mid = rand(overhang + 1, 12)
    const a = mid + overhang, b = mid - overhang
    return { display: renderMath(`An isosceles trapezoid has bases ${a} and ${b} and legs of ${hv}. Find the height (drop two altitudes).`), answer: Math.sqrt(hv * hv - overhang * overhang), lessonIndex: 6 }
  }
  const a = rand(5, 15), b = rand(3, 10), h = rand(3, 8)
  const m = mc(`(${a} + ${b}) \u00D7 ${h} / 2`, [`${a} \u00D7 ${b} \u00D7 ${h}`, `(${a} + ${b}) \u00D7 ${h}`, `${a} \u00D7 ${h} / 2`])
  return { display: renderMath(`Bases ${a}, ${b}, height ${h}. Which expression gives the trapezoid\u2019s area?`), options: m.options, answer: m.answer, lessonIndex: 6 }
}
function genFigCircle_L7(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const r = rand(2, 15), n = 2 * r; const m = mc(piExp(n), [piExp(r), piExp(2 * n), piExp(r * r)]); return { display: renderMath(`Radius ${r}. Circumference C = 2\u03C0r = ?`), options: m.options, answer: m.answer, lessonIndex: 7 } }
  if (t === 1) { const r = rand(2, 12), n = r * r; const m = mc(piExp(n), [piExp(2 * r), piExp(2 * n), piExp(r)]); return { display: renderMath(`Radius ${r}. Area A = \u03C0r^2^ = ?`), options: m.options, answer: m.answer, lessonIndex: 7 } }
  if (t === 2) { const r = rand(2, 20); return { display: renderMath(`A circle has diameter ${2 * r}. Find its radius.`), answer: r, lessonIndex: 7 } }
  if (t === 3) { const arcs: [number, number, number][] = [[90,2,1],[90,4,2],[30,6,1],[45,4,1],[60,3,1],[120,3,2],[180,3,3],[270,2,3],[60,9,3],[120,6,4]]; const [a, r, n] = arcs[rand(0, arcs.length - 1)]; const m = mc(piExp(n), [piExp(2 * n), piExp(n / 2), String(n)]); return { display: renderMath(`Sector of radius ${r} and angle ${a}\u00B0: arc length l = [${a}]/360 \u00D7 2\u03C0r = ?`), options: m.options, answer: m.answer, lessonIndex: 7 } }
  if (t === 4) { const secs: [number, number, number][] = [[90,2,1],[30,6,3],[45,4,2],[60,6,6],[120,3,3],[270,2,3],[180,2,2],[135,4,6]]; const [a, r, k] = secs[rand(0, secs.length - 1)]; const m = mc(piExp(k), [piExp(2 * k), piExp(k / 2), String(k)]); return { display: renderMath(`Sector of radius ${r} and angle ${a}\u00B0: area = [${a}]/360 \u00D7 \u03C0r^2^ = ?`), options: m.options, answer: m.answer, lessonIndex: 7 } }
  const r = rand(2, 12)
  const m = mc(String(2 * r), [String(r), String(r * 3), String(r / 2)])
  return { display: renderMath(`A circle has radius ${r}. What is its diameter?`), options: m.options, answer: m.answer, lessonIndex: 7 }
}
function genFigPoly_L8(d: number): Task {
  const t = rand(0, 5)
  const n = rand(5, 12)
  if (t === 0) { return { display: renderMath(`Regular ${n}-gon. Sum of interior angles?`), answer: (n - 2) * 180, lessonIndex: 8 } }
  if (t === 1) { const m = mc(`(${n} \u2212 2) \u00D7 180 / ${n}`, [`360 / ${n}`, `180 / ${n}`, `${n} \u00D7 180`]); return { display: renderMath(`Regular ${n}-gon. One interior angle = [(${n} \u2212 2) \u00D7 180]/[${n}] = ?`), options: m.options, answer: m.answer, lessonIndex: 8 } }
  if (t === 2) { const m = mc(`360 / ${n}`, [`180 / ${n}`, `720 / ${n}`, `(${n} \u2212 2) \u00D7 180 / ${n}`]); return { display: renderMath(`Regular ${n}-gon. The central angle between adjacent radii = ?`), options: m.options, answer: m.answer, lessonIndex: 8 } }
  if (t === 3) { // area with apothem (integer apothem)
    const ns = [5, 6, 8]
    const nn = ns[rand(0, ns.length - 1)]
    const s = rand(2, 10), ap = rand(2, 10)
    return { display: renderMath(`Regular ${nn}-gon, side ${s}, apothem ${ap}. Area A = [n\u00B7s\u00B7a]/2?`), answer: (nn * s * ap) / 2, lessonIndex: 8 } 
  }
  if (t === 4) { // MC: name of polygon
    const names: Record<number, string> = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' }
    const nn = rand(3, 10)
    const right = names[nn]
    const wrong = pick(['triangle', 'pentagon', 'hexagon', 'octagon', 'decagon', 'heptagon'].filter(x => x !== right), 3)
    const m = mc(right, wrong)
    return { display: renderMath(`A regular polygon with ${nn} sides is called a...`), options: m.options, answer: m.answer, lessonIndex: 8 }
  }
  const m = mc('360\u00B0', [`180\u00B0 \u00D7 (${n} \u2212 2)`, `${n} \u00D7 180\u00B0`, '180\u00B0'])
  return { display: renderMath(`The sum of the exterior angles of a regular ${n}-gon is always...`), options: m.options, answer: m.answer, lessonIndex: 8 }
}
function genFigSim_L9(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const a = rand(2, 8), k = rand(2, 6); return { display: renderMath(`In similar triangles a side of length ${a} corresponds to ${a * k}. Scale factor k?`), answer: k, lessonIndex: 9 } }
  if (t === 1) { const a = rand(2, 8), b = rand(2, 8), k = rand(2, 6); return { display: renderMath(`Similar triangles: sides ${a} and ${b} correspond. The larger triangle\u2019s side (corresponding to ${a}) is ${a * k}. Find the side corresponding to ${b} (proportion).`), answer: round2(b * k), lessonIndex: 9 } }
  if (t === 2) { const k = rand(2, 5); return { display: renderMath(`A figure is enlarged with scale factor ${k}. Its area is multiplied by...`), answer: k * k, lessonIndex: 9 } }
  if (t === 3) { const S = pick([1000, 10000, 100000], 1)[0], cm = rand(2, 12); const mDist = cm * S / 100; return { display: renderMath(`Map scale 1 : ${S}. A drawn segment is ${cm} cm. Real distance in metres?`), answer: mDist, lessonIndex: 9 } }
  if (t === 4) { const a = rand(1, 2); const stick = 100 * a, ss = rand(2, 5), m = rand(2, Math.min(5, Math.floor(30 / ss))); const ts = ss * m; return { display: renderMath(`A ${stick} cm stick casts a ${ss * 100} cm shadow. At the same moment a tree casts a ${ts} m shadow. Find the tree height in metres.`), answer: a * m, lessonIndex: 9 } }
  const s = rand(2, 5)
  const m = mc(s, [s * s, s + 1, s / 2])
  return { display: renderMath(`A triangle of side ${3} has an enlarged copy with side ${3 * s}. Which is the scale factor?`), options: m.options, answer: m.answer, lessonIndex: 9 }
}

// ============ 3D FIGURES (solids) ============
function genSolid_L0(d: number): Task {
  const t = rand(0, 6)
  if (t === 0) { const a = rand(2, 10); return { display: renderMath(`Cube of edge ${a}. Volume V = a^3^?`), answer: a * a * a, lessonIndex: 0 } }
  if (t === 1) { const a = rand(2, 10); return { display: renderMath(`Cube of edge ${a}. Surface area S = 6a^2^?`), answer: 6 * a * a, lessonIndex: 0 } }
  if (t === 2) { const a = rand(2, 10); return { display: renderMath(`A cube has volume ${a * a * a}. Find its edge.`), answer: a, lessonIndex: 0 } }
  if (t === 3) { const a = rand(3, 25), b = rand(3, 25), c = rand(3, 25); return { display: renderMath(`Cuboid ${a} \u00D7 ${b} \u00D7 ${c}. Volume?`), answer: a * b * c, lessonIndex: 0 } }
  if (t === 4) { const a = rand(2, 12), b = rand(2, 12), c = rand(2, 12); return { display: renderMath(`Cuboid ${a} \u00D7 ${b} \u00D7 ${c}. Surface S = 2(ab + bc + ac)?`), answer: 2 * (a * b + b * c + a * c), lessonIndex: 0 } }
  if (t === 5) { const space = [[1,2,2,3],[2,3,6,7],[3,4,12,13],[2,6,9,11],[4,4,7,9],[5,6,30,31]].map(x => x as number[]); const s = space[rand(0, space.length - 1)]; return { display: renderMath(`Cuboid ${s[0]} \u00D7 ${s[1]} \u00D7 ${s[2]}. Space diagonal?`), answer: s[3], lessonIndex: 0 } }
  const [a, b, c] = pyTri(true)
  return { display: renderMath(`Face diagonal of a cuboid face ${a} \u00D7 ${b}. Find it.`), answer: c, lessonIndex: 0 }
}
function genSolid_L1(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const B = rand(3, 20), H = rand(3, 12); return { display: renderMath(`A prism has base area ${B} and height ${H}. Volume?`), answer: B * H, lessonIndex: 1 } }
  if (t === 1) { const B = rand(3, 20), H = rand(3, 12); return { display: renderMath(`A prism has volume ${B * H} and height ${H}. Find the base area.`), answer: B, lessonIndex: 1 } }
  if (t === 2) { const B = rand(3, 20), H = rand(3, 12); return { display: renderMath(`A prism has base area ${B} and volume ${B * H}. Find the height.`), answer: H, lessonIndex: 1 } }
  if (t === 3) { const p = rand(8, 40), H = rand(3, 12); return { display: renderMath(`A right prism has base perimeter ${p} and height ${H}. Lateral surface S\u2081 = perimeter \u00D7 H?`), answer: p * H, lessonIndex: 1 } }
  if (t === 4) { const p = rand(8, 40), H = rand(3, 12), B = rand(4, 30); return { display: renderMath(`A prism: base perimeter ${p}, base area ${B}, height ${H}. Total surface S = S\u2081 + 2A\u208b?`), answer: p * H + 2 * B, lessonIndex: 1 } }
  const forms = [
    ['triangular prism', 5, 9, 6],
    ['quadrilateral prism', 6, 12, 8],
    ['pentagonal prism', 7, 15, 10],
    ['hexagonal prism', 8, 18, 12],
  ] as [string, number, number, number][]
  const [name, F, E, Vv] = forms[rand(0, forms.length - 1)]
  const what = rand(0, 2)
  const m = mc(what === 0 ? Vv : what === 1 ? E : F, what === 0 ? [Vv + 1, Vv - 1, Vv + 2] : what === 1 ? [E + 1, E - 1, E + 3] : [F + 1, F - 2, F + 2])
  return { display: renderMath(`A ${name} has how many ` + (what === 0 ? 'vertices' : what === 1 ? 'edges' : 'faces') + '?'), options: m.options, answer: m.answer, lessonIndex: 1 }
}
function genSolid_L2(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const A = rand(4, 24), k = rand(2, 8); const H = 3 * k; return { display: renderMath(`A pyramid has base area ${A} and height ${H}. Volume V = [1/3]A\u208bH?`), answer: A * k, lessonIndex: 2 } }
  if (t === 1) { const k = rand(2, 8), A = rand(4, 24); const H = 3 * k; return { display: renderMath(`A pyramid has volume ${A * k} and height ${H}. Find the base area.`), answer: A, lessonIndex: 2 } }
  if (t === 2) { const tr = pyTri(true); const [lg, ht, slant] = tr; const s = 2 * lg; return { display: renderMath(`Square pyramid base ${s} \u00D7 ${s}, height ${ht}. Find the slant height h\u1D62 = \u221A(H^2^ + (s/2)^2^).`), answer: slant, lessonIndex: 2 } }
  if (t === 3) { const tr = pyTri(true); const [lg, ht, slant] = tr; const s = 2 * lg; return { display: renderMath(`Square pyramid base ${s}, slant height ${slant}. Lateral area S\u2081 = [1/2] \u00D7 perimeter \u00D7 h\u1D62?`), answer: 2 * s * slant, lessonIndex: 2 } }
  if (t === 4) { const n = rand(3, 8); return { display: renderMath(`A pyramid whose base is a ${n}-gon. How many faces does it have?`), answer: n + 1, lessonIndex: 2 } }
  const n = rand(3, 8)
  const m = mc(2 * n, [3 * n, n, n + 2])
  return { display: renderMath(`A pyramid with an ${n}-gonal base. How many edges?`), options: m.options, answer: m.answer, lessonIndex: 2 }
}
function genSolid_L3(d: number): Task {
  const t = rand(0, 5)
  const r = rand(2, 10), h = rand(3, 15)
  if (t === 0) { const k = r * r * h; const m = mc(piExp(k), [piExp(k / 2), piExp(2 * k), String(k)]); return { display: renderMath(`Cylinder radius ${r}, height ${h}. Volume V = \u03C0r^2^h = ?`), options: m.options, answer: m.answer, lessonIndex: 3 } }
  if (t === 1) { const k = 2 * r * h; const m = mc(piExp(k), [piExp(k / 2), piExp(2 * k), piExp(r * h)]); return { display: renderMath(`Cylinder radius ${r}, height ${h}. Lateral surface S\u2081 = 2\u03C0rh = ?`), options: m.options, answer: m.answer, lessonIndex: 3 } }
  if (t === 2) { const k = 2 * r * (r + h); const m = mc(piExp(k), [piExp(k / 2), piExp(2 * k), piExp(r * h)]); return { display: renderMath(`Cylinder radius ${r}, height ${h}. Total surface S = 2\u03C0r^2^ + 2\u03C0rh = ?`), options: m.options, answer: m.answer, lessonIndex: 3 } }
  if (t === 3) { const k = r * r * h; return { display: renderMath(`A cylinder has radius ${r} and volume ${piExp(k)}. Find the height.`), answer: h, lessonIndex: 3 } }
  if (t === 4) { const tr = pyTri(true); const [w, hh, diag] = tr; return { display: renderMath(`The axial section of a cylinder is a ${w} \u00D7 ${hh} rectangle. Find its diagonal.`), answer: diag, lessonIndex: 3 } }
  const m = mc('rectangle', ['circle', 'triangle', 'trapezoid'])
  return { display: renderMath(`The axial cross-section of a right cylinder is a...`), options: m.options, answer: m.answer, lessonIndex: 3 }
}
function genSolid_L4(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const r = rand(2, 8), k = rand(1, 6); const h = 3 * k; const m = mc(piExp(r * r * k), [piExp(r * r * k * 2), piExp(r * r * k / 2), piExp(r * r)]); return { display: renderMath(`Cone radius ${r}, height ${h}. Volume V = [1/3]\u03C0r^2^h = ?`), options: m.options, answer: m.answer, lessonIndex: 4 } }
  if (t === 1) { const [lg, ht, l] = pyTri(true); return { display: renderMath(`Cone radius ${lg}, height ${ht}. Find the slant height l = \u221A(r^2^ + h^2^).`), answer: l, lessonIndex: 4 } }
  if (t === 2) { const [lg, , l] = pyTri(true); const m = mc(piExp(lg * l), [piExp(2 * lg * l), piExp(lg * l / 2), String(lg * l)]); return { display: renderMath(`Cone radius ${lg}, slant height ${l}. Lateral surface S\u2081 = \u03C0rl = ?`), options: m.options, answer: m.answer, lessonIndex: 4 } }
  if (t === 3) { const [lg, , l] = pyTri(true); const k = lg * (lg + l); const m = mc(piExp(k), [piExp(k * 2), piExp(k / 2), piExp(lg * l)]); return { display: renderMath(`Cone radius ${lg}, slant height ${l}. Total S = \u03C0r(r + l) = ?`), options: m.options, answer: m.answer, lessonIndex: 4 } }
  if (t === 4) { const [lg, ht, l] = pyTri(true); return { display: renderMath(`Cone slant height ${l}, height ${ht}. Find the radius.`), answer: lg, lessonIndex: 4 } }
  const m = mc('isosceles triangle', ['rectangle', 'circle', 'equilateral triangle'])
  return { display: renderMath(`The axial cross-section of a right cone is an...`), options: m.options, answer: m.answer, lessonIndex: 4 }
}
function genSolid_L5(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const r = 3 * rand(1, 4); const m2 = (4 * r * r * r) / 3; const m = mc(piExp(m2), [piExp(m2 * 2), piExp(m2 / 2), String(m2)]); return { display: renderMath(`Sphere radius ${r}. Volume V = [4/3]\u03C0r^3^ = ?`), options: m.options, answer: m.answer, lessonIndex: 5 } }
  if (t === 1) { const r = rand(2, 10); const m2 = 4 * r * r; const m = mc(piExp(m2), [piExp(m2 * 2), piExp(r * r), String(m2)]); return { display: renderMath(`Sphere radius ${r}. Surface S = 4\u03C0r^2^ = ?`), options: m.options, answer: m.answer, lessonIndex: 5 } }
  if (t === 2) { const k = rand(2, 8); return { display: renderMath(`A sphere has surface area ${piExp(4 * k * k)}. Find the radius.`), answer: k, lessonIndex: 5 } }
  if (t === 3) { const r = 3 * rand(1, 4); const m2 = (4 * r * r * r) / 3; return { display: renderMath(`A sphere has volume ${piExp(m2)}. Find the radius.`), answer: r, lessonIndex: 5 } }
  if (t === 4) { const [r, dist, cut] = pyTri(true); return { display: renderMath(`A plane cuts a sphere of radius ${r} at distance ${dist} from its centre. Radius of the cut circle?`), answer: cut, lessonIndex: 5 } }
  const r = rand(2, 10)
  const m = mc(String(r), [String(2 * r), String(r / 2), String(r * 3)])
  return { display: renderMath(`A sphere has radius ${r}. What is the radius of its great circle?`), options: m.options, answer: m.answer, lessonIndex: 5 }
}
function genSolid_L6(d: number): Task {
  const t = rand(0, 4)
  if (t === 0) { const r1 = rand(1, 5), r2 = rand(2, 7), k = rand(1, 5); const h = 3 * k; const sum = r1 * r1 + r1 * r2 + r2 * r2; const m = mc(piExp(sum * k), [piExp(sum * k * 2), piExp(sum * k / 2), piExp(sum)]); return { display: renderMath(`Cone frustum radii ${r1} and ${r2}, height ${h}. V = [\u03C0h]/3 \u00D7 (r\u2081^2^ + r\u2081r\u2082 + r\u2082^2^) = ?`), options: m.options, answer: m.answer, lessonIndex: 6 } }
  if (t === 1) { const b1s = [1, 4, 9, 16, 25, 36], b2s = [1, 4, 9, 16]; const B1 = b1s[rand(0, b1s.length - 1)], B2 = b2s[rand(0, b2s.length - 1)], k = rand(1, 5); const H = 3 * k; return { display: renderMath(`Pyramid frustum bases ${B1} and ${B2}, height ${H}. V = [H]/3 \u00D7 (B\u2081 + \u221A(B\u2081B\u2082) + B\u2082)?`), answer: round2((H / 3) * (B1 + Math.sqrt(B1 * B2) + B2)), lessonIndex: 6 } }
  if (t === 2) { const a = rand(6, 15), r = rand(2, 5), h = rand(3, 10); const box = a * a * h, cyl = r * r * h; const m = mc(`${box} \u2212 ${cyl}\u03C0`, [`${box} + ${cyl}\u03C0`, `${box} \u2212 ${cyl / 2}\u03C0`, String(box)]); return { display: renderMath(`A ${a} \u00D7 ${a} \u00D7 ${h} box has a cylinder of radius ${r} and height ${h} removed. Volume left = ?`), options: m.options, answer: m.answer, lessonIndex: 6 } }
  if (t === 3) { const kc = rand(1, 2); const r = 3 * kc, a = 6 * kc; const cub = a * a * a, hm = 18 * kc * kc * kc; const m = mc(`${cub} + ${hm}\u03C0`, [`${cub} + ${hm / 2}\u03C0`, `${cub} + ${hm * 2}\u03C0`, String(cub)]); return { display: renderMath(`A cube of edge ${a} has a hemisphere of radius ${r} added on top. Total volume = ?`), options: m.options, answer: m.answer, lessonIndex: 6 } }
  const m = mc('cut parallel to the base', ['cut along the axis', 'cut through the apex', 'cut diagonally'])
  return { display: renderMath(`A frustum of a cone is formed by...`), options: m.options, answer: m.answer, lessonIndex: 6 }
}
function genSolid_L7(d: number): Task {
  const t = rand(0, 6)
  if (t === 0) { const r = rand(2, 10); return { display: renderMath(`A sphere of radius ${r} is inscribed in a cube (touching all faces). Cube edge?`), answer: 2 * r, lessonIndex: 7 } }
  if (t === 1) { const a = rand(2, 8); const m = mc(`${a}\u221A3`, [`${a}\u221A2`, `${2 * a}`, `${a}`]); return { display: renderMath(`A cube of edge ${a} is inscribed in a sphere. Sphere diameter = a\u221A3 = ?`), options: m.options, answer: m.answer, lessonIndex: 7 } }
  if (t === 2) { const r = rand(2, 8); return { display: renderMath(`A cylinder of radius ${r} is inscribed in a cube (fits exactly). Cube edge?`), answer: 2 * r, lessonIndex: 7 } }
  if (t === 3) { const space = [[1,2,2,3],[2,3,6,7],[3,4,12,13],[2,6,9,11],[4,4,7,9]].map(x => x as number[]); const s = space[rand(0, space.length - 1)]; return { display: renderMath(`Cuboid ${s[0]} \u00D7 ${s[1]} \u00D7 ${s[2]}. Space diagonal?`), answer: s[3], lessonIndex: 7 } }
  if (t === 4) { const a = rand(2, 10); return { display: renderMath(`A cube is cut by a plane parallel to a face through the middle. Area of each cut square (edge ${a})?`), answer: a * a, lessonIndex: 7 } }
  if (t === 5) { const a = rand(2, 8); const m = mc(`${a}\u221A3/2`, [`${a}\u221A2/2`, `${a}`, `${a}\u221A3`]); return { display: renderMath(`A cube of edge ${a} is inscribed in a sphere. Sphere radius = a\u221A3/2 = ?`), options: m.options, answer: m.answer, lessonIndex: 7 } }
  const facts = [
    ['A sphere inscribed in a cube has diameter equal to the cube edge', 'True'],
    ['A sphere around a cube has diameter a\u221A3', 'True'],
    ['The cylinder inscribed in a cube has height equal to the cube edge', 'True'],
    ['The angle between a space diagonal and an edge of a cube is 60\u00B0', 'False'],
    ['In a cuboid 1\u00D72\u00D72 the space diagonal is 3', 'True'],
    ['A sphere inscribed in a cube has diameter a\u221A3', 'False'],
  ] as const
  const f = facts[rand(0, facts.length - 1)]
  return { display: renderMath(`True or false? ` + f[0] + '.'), options: ['True', 'False'], answer: f[1], lessonIndex: 7 }
}

// ============ TRIGONOMETRY (trig) ============
function genTrig_L0(d: number): Task {
  const t = rand(0, 5)
  const pluck = () => pyTri(false)
  if (t === 0) {
    const [p, q, h] = RTRIPLES[rand(0, RTRIPLES.length - 1)]
    const orient = rand(0, 1) === 0
    const op = orient ? p : q
    const adj = orient ? q : p
    const pr = rand(0, 2)
    if (pr === 2) {
      const m = mc(`${op}/${adj}`, [`${adj}/${op}`, `${op}/${h}`, `${adj}/${h}`])
      return { display: renderMath(`In a ${h}-${p}-${q} triangle, angle \u03B1 sits opposite side ${op}. tan \u03B1 = [opposite]/[adjacent] = ?`), options: m.options, answer: m.answer, lessonIndex: 0 }
    }
    return { display: renderMath(pr === 0 ? `In a ${h}-${p}-${q} triangle, angle \u03B1 sits opposite side ${op}. sin \u03B1 = [opposite]/[hypotenuse] = ?` : `In a ${h}-${p}-${q} triangle, angle \u03B1 sits opposite side ${op}. cos \u03B1 = [adjacent]/[hypotenuse] = ?`), answer: round2(pr === 0 ? op / h : adj / h), lessonIndex: 0 }
  }
  if (t === 1) { const [p, q, h] = pluck(); return { display: renderMath(`sin \u03B1 = [${p}]/[${h}], the side opposite \u03B1 is ${p}. Find the hypotenuse.`), answer: h, lessonIndex: 0 } }
  if (t === 2) { const [p, q, h] = pluck(); return { display: renderMath(`cos \u03B1 = [${q}]/[${h}], the side adjacent to \u03B1 is ${q}. Find the hypotenuse.`), answer: h, lessonIndex: 0 } }
  if (t === 3) { const k = rand(2, 6); const hyp = 5 * k, opp = 3 * k; return { display: renderMath(`sin \u03B1 = 0.6 and the hypotenuse is ${hyp}. Find the side opposite \u03B1.`), answer: opp, lessonIndex: 0 } }
  if (t === 4) { const [p, q, h] = RTRIPLES[rand(0, RTRIPLES.length - 1)]; const orient = rand(0, 1) === 0; const op = orient ? p : q; const adj = orient ? q : p; const m = mc(String(round2(op / h)), [String(round2(adj / h)), String(round2(op / adj)), String(round2((op + adj) / h))]); return { display: renderMath(`In the ${h}-${p}-${q} triangle, which value is sin \u03B1 (opposite ${op})?`), options: m.options, answer: m.answer, lessonIndex: 0 } }
  const m = mc('Opposite / Hypotenuse', ['Opposite / Adjacent', 'Adjacent / Hypotenuse', 'Hypotenuse / Adjacent'])
  return { display: renderMath(`sin \u03B1 equals...`), options: m.options, answer: m.answer, lessonIndex: 0 }
}
function genTrig_L1(d: number): Task {
  const t = rand(0, 4)
  if (t === 0) {
    const tbl: [string, string, string[]][] = [
      ['sin 30\u00B0', '1/2', ['\u221A3/2', '\u221A2/2', '1']],
      ['cos 30\u00B0', '\u221A3/2', ['1/2', '\u221A2/2', '1']],
      ['tan 30\u00B0', '\u221A3/3', ['1', '\u221A3', '1/2']],
      ['sin 45\u00B0', '\u221A2/2', ['1/2', '\u221A3/2', '1']],
      ['cos 45\u00B0', '\u221A2/2', ['1', '1/2', '\u221A3/2']],
      ['tan 45\u00B0', '1', ['0', '\u221A3', '1/2']],
      ['sin 60\u00B0', '\u221A3/2', ['1/2', '\u221A2/2', '1']],
      ['cos 60\u00B0', '1/2', ['\u221A3/2', '1', '\u221A2/2']],
      ['tan 60\u00B0', '\u221A3', ['1', '\u221A3/3', '2']],
    ]
    const [q, ans, wrongs] = tbl[rand(0, tbl.length - 1)]
    const m = mc(ans, wrongs)
    return { display: renderMath(`${q} = ?`), options: m.options, answer: m.answer, lessonIndex: 1 }
  }
  if (t === 1) { const n = rand(2, 12); const m = mc(`${n}\u221A3`, [`${2 * n}`, `${n}`, `${n}\u221A3/3`]); return { display: renderMath(`In a 30\u00B0-60\u00B0-90\u00B0 triangle the short leg is ${n}. Long leg = short \u00D7 \u221A3 = ?`), options: m.options, answer: m.answer, lessonIndex: 1 } }
  if (t === 2) { const n = rand(2, 12); return { display: renderMath(`In a 30\u00B0-60\u00B0-90\u00B0 triangle the short leg is ${n}. Hypotenuse?`), answer: 2 * n, lessonIndex: 1 } }
  if (t === 3) { const n = rand(2, 12); const m = mc(`${n}\u221A2`, [`${2 * n}`, `${n}`, `${n}\u221A2/2`]); return { display: renderMath(`In a 45\u00B0-45\u00B0-90\u00B0 triangle each leg is ${n}. Hypotenuse = leg \u00D7 \u221A2 = ?`), options: m.options, answer: m.answer, lessonIndex: 1 } }
  const m = mc('1', ['0', '1/2', '\u221A3'])
  return { display: renderMath(`tan 45\u00B0 = ?`), options: m.options, answer: m.answer, lessonIndex: 1 }
}
function genTrig_L2(d: number): Task {
  const t = rand(0, 4)
  if (t === 0) { const h = 2 * rand(3, 15); return { display: renderMath(`Hypotenuse ${h}, angle 30\u00B0. Side opposite = h \u00D7 sin 30\u00B0?`), answer: h / 2, lessonIndex: 2 } }
  if (t === 1) { const h = 2 * rand(3, 15); return { display: renderMath(`Hypotenuse ${h}, angle 60\u00B0. Side adjacent = h \u00D7 cos 60\u00B0?`), answer: h / 2, lessonIndex: 2 } }
  if (t === 2) { const n = rand(3, 15), h = 2 * n; return { display: renderMath(`Opposite = ${n}, angle 30\u00B0. Find the hypotenuse (n / sin 30\u00B0).`), answer: h, lessonIndex: 2 } }
  if (t === 3) { const n = rand(3, 15); return { display: renderMath(`Adjacent = ${n}, angle 45\u00B0. Find the opposite side (opp = adj \u00D7 tan 45\u00B0).`), answer: n, lessonIndex: 2 } }
  const a = rand(3, 10)
  return { display: renderMath(`A right triangle has legs ${a} and ${a}. Give the angle between a leg and the hypotenuse.`), options: ['30\u00B0', '45\u00B0', '60\u00B0', '15\u00B0'], answer: '45\u00B0', lessonIndex: 2 }
}
function genTrig_L3(d: number): Task {
  const t = rand(0, 3)
  if (t === 0) {
    const n = rand(4, 14)
    const rows: [number, number, string, string[]][] = [
      [30, 45, `${n}\u221A2`, [`${n}\u221A3`, `${n}\u221A2/2`, `${n}`]],
      [45, 30, `${n}\u221A2/2`, [`${n}\u221A3/2`, `${n}\u221A2`, `${n}`]],
      [60, 30, `${n}\u221A3/3`, [`${n}\u221A3/2`, `${n}\u221A3`, `${n}`]],
      [30, 60, `${n}\u221A3`, [`${n}\u221A3/3`, `${n}\u221A2`, `${n}`]],
      [45, 60, `${n}\u221A6/2`, [`${n}\u221A6/3`, `${n}\u221A2`, `${n}`]],
      [60, 45, `${n}\u221A6/3`, [`${n}\u221A6/2`, `${n}\u221A3`, `${n}`]],
    ]
    const [alpha, beta, ans, wrongs] = rows[rand(0, rows.length - 1)]
    const m = mc(ans, wrongs)
    return { display: renderMath(`In a triangle \u03B1 = ${alpha}\u00B0, \u03B2 = ${beta}\u00B0 and the side a opposite \u03B1 is ${n}. Law of sines: a/sin \u03B1 = b/sin \u03B2 \u2192 b = ?`), options: m.options, answer: m.answer, lessonIndex: 3 }
  }
  if (t === 1) {
    const n = rand(3, 12)
    const rows: [number, string, string[]][] = [
      [30, `${n}`, [`${n}/2`, `${2 * n}`, `${n}\u221A2/2`]],
      [45, `${n}\u221A2/2`, [`${n}\u221A2`, `${n}/2`, `${n}\u221A3/3`]],
      [60, `${n}\u221A3/3`, [`${n}\u221A3`, `${n}/3`, `${n}\u221A2/2`]],
    ]
    const [alpha, ans, wrongs] = rows[rand(0, rows.length - 1)]
    const m = mc(ans, wrongs)
    return { display: renderMath(`Side a = ${n} lies opposite \u03B1 = ${alpha}\u00B0. Circumradius R = a/(2\u00B7sin \u03B1) = ?`), options: m.options, answer: m.answer, lessonIndex: 3 }
  }
  if (t === 2) { const a = rand(20, 80), b = rand(20, 100 - a); return { display: renderMath(`In a triangle \u03B1 = ${a}\u00B0 and \u03B2 = ${b}\u00B0. Find the third angle \u03B3.`), answer: 180 - a - b, lessonIndex: 3 } }
  const m = mc('a/sin \u03B1', ['a\u00B7sin \u03B1', 'a\u00B7cos \u03B1', 'sin \u03B1/a'])
  return { display: renderMath(`The law of sines states that a/sin \u03B1 equals...`), options: m.options, answer: m.answer, lessonIndex: 3 }
}
function genTrig_L4(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const a = rand(3, 15), b = rand(3, 15); return { display: renderMath(`a = ${a}, b = ${b}, included angle \u03B3 = 60\u00B0. Law of cosines: c^2^ = a^2^ + b^2^ \u2212 ab. Find c^2^.`), answer: a * a + b * b - a * b, lessonIndex: 4 } }
  if (t === 1) { const a = rand(3, 20), b = rand(3, 20); return { display: renderMath(`a = ${a}, b = ${b}, \u03B3 = 90\u00B0. Find c^2^ (Pythagoras).`), answer: a * a + b * b, lessonIndex: 4 } }
  if (t === 2) { const [a, b, m2, c2] = [[3, 8, 60, 49],[5, 8, 60, 49],[3, 5, 60, 19],[6, 10, 90, 136],[5, 13, 90, 194]][rand(0, 4)]; return { display: renderMath(`a = ${a}, b = ${b}, included angle ${m2}\u00B0. Find c^2^.`), answer: c2, lessonIndex: 4 } }
  if (t === 3) { const tri = pick([[3, 8, 49, 60],[6, 10, 136, 90],[3, 5, 19, 60],[5, 5, 50, 45]], 1)[0]; const root = Math.sqrt(tri[2]); const cDisp = Number.isInteger(root) ? String(root) : `\u221A${tri[2]}`; return { display: renderMath(`a = ${tri[0]}, b = ${tri[1]}, c = ${cDisp}. Which is the included angle \u03B3?`), options: ['30\u00B0', '45\u00B0', '60\u00B0', '90\u00B0'], answer: String(tri[3]) + '\u00B0', lessonIndex: 4 } }
  if (t === 4) { const tr = pick([[3, 8, 49, 0.5],[5, 8, 49, 0.5],[6, 10, 136, 0],[3, 3, 18, 0]], 1)[0]; const root = Math.sqrt(tr[2]); const cDisp = Number.isInteger(root) ? String(root) : `\u221A${tr[2]}`; return { display: renderMath(`a = ${tr[0]}, b = ${tr[1]}, c = ${cDisp}. cos \u03B3 = [a^2^ + b^2^ \u2212 c^2^]/[2ab] = ?`), answer: round2(tr[3]), lessonIndex: 4 } }
  const m = mc('c^2^ = a^2^ + b^2^ \u2212 2ab\u00B7cos \u03B3', ['c^2^ = a^2^ + b^2^ + 2ab', 'c^2^ = a^2^ + 2ab\u00B7cos \u03B3', 'c = a + b'])
  return { display: renderMath(`Which is the law of cosines?`), options: m.options, answer: m.answer, lessonIndex: 4 }
}
function genTrig_L5(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const a = rand(3, 20), b = rand(3, 20); return { display: renderMath(`Triangle with a = ${a}, b = ${b}, \u03B3 = 90\u00B0. Area A = [1/2]ab\u00B7sin 90\u00B0?`), answer: round2(a * b / 2), lessonIndex: 5 } }
  if (t === 1) { const k = rand(2, 6), a = 4 * k, b = rand(4, 8); return { display: renderMath(`Triangle with a = ${a}, b = ${b}, \u03B3 = 30\u00B0 (sin 30\u00B0 = 1/2). Area?`), answer: round2(a * b / 4), lessonIndex: 5 } }
  if (t === 2) { const a = rand(3, 15), b = rand(3, 15); const m2 = a * b; const m = mc(`${m2}\u221A3/4`, [`${m2}\u221A3/2`, `${m2}\u221A3/8`, `${m2}\u221A2/4`]); return { display: renderMath(`Triangle with a = ${a}, b = ${b}, \u03B3 = 60\u00B0. Area = [ab\u221A3]/4 = ?`), options: m.options, answer: m.answer, lessonIndex: 5 } }
  if (t === 3) { const a = rand(3, 15), b = rand(3, 15); const m2 = a * b; const m = mc(`${m2}\u221A2/4`, [`${m2}\u221A2/2`, `${m2}\u221A2/8`, `${m2}\u221A3/4`]); return { display: renderMath(`Triangle with a = ${a}, b = ${b}, \u03B3 = 45\u00B0. Area = [ab\u221A2]/4 = ?`), options: m.options, answer: m.answer, lessonIndex: 5 } }
  if (t === 4) { const a = rand(4, 12), b = rand(2, 6); const A = a * b / 4; return { display: renderMath(`Area = ${A}, a = ${a}, b = ${b}. Which \u03B3 (with sin \u03B3 = [2A]/[ab])?`), options: ['30\u00B0', '60\u00B0', '45\u00B0', '90\u00B0'], answer: '30\u00B0', lessonIndex: 5 } }
  const m = mc('[1/2]ab\u00B7sin \u03B3', ['[1/2]ab\u00B7cos \u03B3', 'ab\u00B7sin \u03B3', '[1/3]ab\u00B7sin \u03B3'])
  return { display: renderMath(`The area of a triangle with sides a, b and included angle \u03B3 is...`), options: m.options, answer: m.answer, lessonIndex: 5 }
}
function genTrig_L6(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) {
    const s = rand(8, 40); const ang = pick([30, 45, 60], 1)[0]
    if (ang === 45) return { display: renderMath(`A tower casts a ${s} m shadow; the sun is at 45\u00B0. Height = shadow \u00D7 tan 45\u00B0 = ?`), answer: s, lessonIndex: 6 }
    const m = ang === 30 ? mc(`${s}\u221A3/3`, [`${s}\u221A3`, `${s}`, `${s}\u221A3/6`]) : mc(`${s}\u221A3`, [`${s}\u221A3/3`, `${s}`, `${s}\u221A3/2`])
    return { display: renderMath(`A tower casts a ${s} m shadow; the sun is at ${ang}\u00B0. Height = shadow \u00D7 tan ${ang}\u00B0 = ?`), options: m.options, answer: m.answer, lessonIndex: 6 }
  }
  if (t === 1) {
    const L = 2 * rand(3, 9); const ang = pick([30, 45, 60], 1)[0]
    if (ang === 30) return { display: renderMath(`A ${L} m ladder makes 30\u00B0 with the ground. Height reached = L \u00D7 sin 30\u00B0 = ?`), answer: L / 2, lessonIndex: 6 }
    const m = ang === 45 ? mc(`${L}\u221A2/2`, [`${L}\u221A2`, `${L}`, `${L}\u221A2/4`]) : mc(`${L}\u221A3/2`, [`${L}\u221A3`, `${L}`, `${L}\u221A3/4`])
    return { display: renderMath(`A ${L} m ladder makes ${ang}\u00B0 with the ground. Height reached = L \u00D7 sin ${ang}\u00B0 = ?`), options: m.options, answer: m.answer, lessonIndex: 6 }
  }
  if (t === 2) { const L = 2 * rand(5, 15); return { display: renderMath(`A kite string is ${L} m long at 30\u00B0 to the ground. Kite height = L \u00D7 sin 30\u00B0?`), answer: L / 2, lessonIndex: 6 } }
  if (t === 3) { const a = rand(30, 70), b = rand(30, 90 - a); return { display: renderMath(`A boat is seen from two points on the bank under angles ${a}\u00B0 and ${b}\u00B0. Find the third angle of the triangle (180\u00B0 \u2212 ${a}\u00B0 \u2212 ${b}\u00B0).`), answer: 180 - a - b, lessonIndex: 6 } }
  if (t === 4) { const d = rand(20, 60); return { display: renderMath(`From distance ${d} m the elevation of a tower top is 45\u00B0 (tan 45\u00B0 = 1). Tower height?`), answer: d, lessonIndex: 6 } }
  const m = mc('above the horizontal', ['below the horizontal', 'between tower and ground', 'any angle'])
  return { display: renderMath(`The angle of elevation is measured...`), options: m.options, answer: m.answer, lessonIndex: 6 }
}
function genTrig_L7(d: number): Task {
  const t = rand(0, 5)
  if (t === 0) { const vals: [string, string][] = [['sin 0\u00B0', '0'], ['cos 0\u00B0', '1'], ['sin 90\u00B0', '1'], ['cos 90\u00B0', '0'], ['sin 180\u00B0', '0'], ['cos 180\u00B0', '-1'], ['sin 270\u00B0', '-1']]; const [q, ans] = vals[rand(0, vals.length - 1)]; const m = mc(ans, [q.startsWith('sin') ? '1' : '0', '-1', '1/2']); return { display: renderMath(`${q} = ?`), options: m.options, answer: m.answer, lessonIndex: 7 } }
  if (t === 1) { const m2 = mc(0.8, [0.6, 0.75, 0.5]); return { display: renderMath(`sin \u03B1 = [3]/[5] in a right triangle. Find cos \u03B1 (the positive Pythagorean value).`), options: m2.options, answer: m2.answer, lessonIndex: 7 } }
  if (t === 2) { const m2 = mc(round2(3 / 4), [round2(4 / 3), round2(3 / 5), round2(4 / 5)]); return { display: renderMath(`sin \u03B1 = [3]/[5] and cos \u03B1 = [4]/[5]. Find tan \u03B1.`), options: m2.options, answer: m2.answer, lessonIndex: 7 } }
  if (t === 3) { const q = pick([[120, 'sin', 'Positive'], [120, 'cos', 'Negative'], [200, 'tan', 'Positive'], [300, 'sin', 'Negative'], [240, 'cos', 'Negative'], [330, 'tan', 'Negative'], [150, 'cos', 'Negative'], [210, 'sin', 'Negative']], 1)[0] as [number, string, string]; return { display: renderMath(`In which quadrant is ${q[1]} ${q[0]}\u00B0, and what is its sign?`), options: ['Positive', 'Negative'], answer: q[2], lessonIndex: 7 } }
  if (t === 4) { const m2 = mc('0.6', ['0.4', '0.5', '0.64']); return { display: renderMath(`sin^2^\u03B1 + cos^2^\u03B1 always equals...`), options: ['0', '1', 'sin \u03B1', 'tan \u03B1'], answer: '1', lessonIndex: 7 } }
  const m2 = mc('\u221A3/2', ['1/2', '\u221A2/2', '1'])
  return { display: renderMath(`sin 60\u00B0 = cos 30\u00B0 = ?`), options: m2.options, answer: m2.answer, lessonIndex: 7 }
}

// ============ GENERATORS MAP ============

type GenFn = (d: number) => Task

const LESSON_GENS: Record<string, GenFn[]> = {
  'addition': [genAdd_L0, genAdd_L1, genAdd_L2],
  'subtraction': [genSub_L0, genSub_L1, genSub_L2],
  'multiplication': [genMul_L0, genMul_L1, genMul_L2],
  'division': [genDiv_L0, genDiv_L1, genDiv_L2],
  'roots': [genRoot_L0, genRoot_L1, genRoot_L2],
  'logarithms': [genLog_L0, genLog_L1, genLog_L2, genLog_L3],
  'equations': [genEquation_L0, genEquation_L1, genEquation_L2],
  'functions': [genFunction_L0, genFunction_L1, genFunction_L2, genFunction_L3],
  'figures': [genFigAngles_L0, genFigTriangles_L1, genFigTriArea_L2, genFigPythag_L3, genFigQuad_L4, genFigParall_L5, genFigTrap_L6, genFigCircle_L7, genFigPoly_L8, genFigSim_L9],
  'solids': [genSolid_L0, genSolid_L1, genSolid_L2, genSolid_L3, genSolid_L4, genSolid_L5, genSolid_L6, genSolid_L7],
  'trig': [genTrig_L0, genTrig_L1, genTrig_L2, genTrig_L3, genTrig_L4, genTrig_L5, genTrig_L6, genTrig_L7],
}

// ============ PUBLIC API ============

export function generateLessonBatch(chapterId: string, lessonIndex: number, count: number): Task[] {
  const gens = LESSON_GENS[chapterId]
  if (!gens || !gens[lessonIndex]) return []
  const gen = gens[lessonIndex]
  const diffs = ramp(count, 3)
  const tasks: Task[] = []
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    let task: Task; let attempts = 0
    do { task = gen(diffs[i]); attempts++ } while (used.has(JSON.stringify(task.display)) && attempts < 100)
    used.add(JSON.stringify(task.display))
    task = { ...task, difficulty: diffs[i] }
    tasks.push(task)
  }
  return tasks
}

export function generateChapterBatch(chapterId: string, difficulty: number, count: number): Task[] {
  const gens = LESSON_GENS[chapterId]
  if (!gens) return []
  const diffs = ramp(count, difficulty)
  const tasks: Task[] = []
  const used = new Set<string>()
  const perLesson = Math.ceil(count / gens.length)

  for (let li = 0; li < gens.length; li++) {
    for (let i = 0; i < perLesson && tasks.length < count; i++) {
      let task: Task; let attempts = 0
      do { task = gens[li](diffs[tasks.length]); task = {...task, lessonIndex: li}; attempts++ }
      while (used.has(JSON.stringify(task.display)) && attempts < 100)
      used.add(JSON.stringify(task.display))
      task.difficulty = diffs[tasks.length]
      tasks.push(task)
    }
  }

  return pick(tasks, count)
}

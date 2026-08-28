import React from 'react'

export interface UserProfile { nickname: string; level: number; xp: number; createdAt: string }
export interface TaskResult { id: number; chapterId: string; difficulty: number; correct: boolean; xpEarned: number; timestamp: string; lessonIndex?: number }
export interface AppData { profile: UserProfile | null; taskResults: TaskResult[]; history: HistoryEntry[] }
export interface HistoryEntry { id: number; timestamp: string; tab: string; input: string; result: string }

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

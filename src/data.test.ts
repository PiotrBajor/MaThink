import { describe, it, expect } from 'vitest'
import {
  CHAPTERS,
  generateLessonBatch,
  generateChapterBatch,
  getLevelForXp,
  getStreak,
  normalizeData,
  XP_REWARDS,
  XP_PER_LEVEL,
} from './data'

const TEST_LEN = 15

function isReactNodeContentOk(d: unknown): boolean {
  return d != null && String(d).trim() !== ''
}

function validateTask(task: unknown, chapterId: string) {
  const t = task as { display: unknown; answer: number | string; options?: (string | number)[]; lessonIndex: number; difficulty?: number }
  expect(t, 'task missing').toBeTruthy()
  expect(isReactNodeContentOk(t.display), 'display empty for ' + chapterId).toBe(true)

  if (typeof t.answer === 'number') {
    expect(Number.isFinite(t.answer), 'numeric answer NaN/inf for ' + chapterId).toBe(true)
  } else {
    expect(typeof t.answer).toBe('string')
    expect(t.answer).not.toBe('')
  }

  if (t.options) {
    expect(Array.isArray(t.options)).toBe(true)
    expect(t.options.length).toBeGreaterThanOrEqual(2)
    expect(t.options.length).toBeLessThanOrEqual(6)
    const strings = t.options.map(String)
    expect(new Set(strings).size, 'duplicate options').toBe(strings.length)
    expect(strings).toContain(String(t.answer))
  }

  expect(Number.isInteger(t.lessonIndex)).toBe(true)
  expect(t.lessonIndex).toBeGreaterThanOrEqual(0)
  expect((t.difficulty ?? 1)).toBeGreaterThanOrEqual(1)
  expect((t.difficulty ?? 1)).toBeLessThanOrEqual(5)
}

describe('generateLessonBatch', () => {
  for (const chapter of CHAPTERS) {
    for (let li = 0; li < chapter.lessons.length; li++) {
      it(`${chapter.id} lesson ${li}: 15 valid, unique tasks`, () => {
        const batch = generateLessonBatch(chapter.id, li, TEST_LEN)
        expect(batch.length).toBe(TEST_LEN)
        const seen = new Set<string>()
        for (const task of batch) {
          validateTask(task, chapter.id + '/' + li)
          expect(seen.has(JSON.stringify(task.display))).toBe(false)
          seen.add(JSON.stringify(task.display))
        }
      })
    }
  }
})

describe('generateChapterBatch', () => {
  for (const chapter of CHAPTERS) {
    for (let diff = 1; diff <= 5; diff++) {
      it(`${chapter.id} diff ${diff}: 15 valid, unique tasks`, () => {
        const batch = generateChapterBatch(chapter.id, diff, TEST_LEN)
        expect(batch.length).toBe(TEST_LEN)
        const seen = new Set<string>()
        for (const task of batch) {
          validateTask(task, chapter.id + '@' + diff)
          expect(seen.has(JSON.stringify(task.display))).toBe(false)
          seen.add(JSON.stringify(task.display))
        }
      })
    }
  }
})

describe('MC robustness (smoke, 40 batches)', () => {
  it('every batch of every chapter yields valid MC constraints', () => {
    for (let r = 0; r < 40; r++) {
      for (const chapter of CHAPTERS) {
        for (let li = 0; li < chapter.lessons.length; li++) {
          const batch = generateLessonBatch(chapter.id, li, 5)
          for (const t of batch) validateTask(t, chapter.id)
        }
      }
    }
  })
})

describe('getLevelForXp', () => {
  it('maps XP thresholds to levels', () => {
    expect(getLevelForXp(0).level).toBe(1)
    expect(getLevelForXp(XP_PER_LEVEL[1] - 1).level).toBe(1)
    expect(getLevelForXp(XP_PER_LEVEL[1]).level).toBe(2)
    expect(getLevelForXp(999999).level).toBe(XP_PER_LEVEL.length)
  })
  it('progress is within range', () => {
    const { progress } = getLevelForXp(1234)
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThanOrEqual(1)
  })
})

describe('getStreak', () => {
  const day = (iso: string) => ({ id: 1, chapterId: 'x', difficulty: 1, correct: true, xpEarned: 10, timestamp: iso, lessonIndex: 0 })

  it('counts consecutive days', () => {
    const now = new Date()
    const mk = (off: number) => {
      const d = new Date(now); d.setDate(d.getDate() - off)
      return d.toISOString()
    }
    const res = getStreak([day(mk(0)), day(mk(1)), day(mk(2)), day(mk(4))])
    expect(res.current).toBe(3)
    expect(res.studiedToday).toBe(true)
  })

  it('keeps streak alive if yesterday studied and today not yet', () => {
    const now = new Date()
    const mk = (off: number) => {
      const d = new Date(now); d.setDate(d.getDate() - off)
      return d.toISOString()
    }
    const res = getStreak([day(mk(1))])
    expect(res.current).toBe(1)
    expect(res.studiedToday).toBe(false)
  })

  it('returns zero when nothing studied', () => {
    const res = getStreak([])
    expect(res.current).toBe(0)
    expect(res.best).toBe(0)
  })
})

describe('normalizeData', () => {
  it('fills defaults for empty input', () => {
    const n = normalizeData(null)
    expect(n.profile).toBeNull()
    expect(n.settings.sound).toBe(true)
    expect(n.settings.theme).toBe('dark')
    expect(n.version).toBe(2)
  })
  it('preserves known fields and merges settings', () => {
    const n = normalizeData({
      profile: { nickname: 'Ala', level: 3, xp: 100, createdAt: '2026-01-01T00:00:00Z' },
      taskResults: [{ id: 1, chapterId: 'a', difficulty: 1, correct: true, xpEarned: 10, timestamp: '2026-01-01T00:00:00Z' }],
      history: [],
      settings: { theme: 'light' },
    })
    expect(n.profile?.nickname).toBe('Ala')
    expect(n.taskResults.length).toBe(1)
    expect(n.settings.theme).toBe('light')
    expect(n.settings.sound).toBe(true)
  })
})

describe('XP rewards', () => {
  it('XP_REWARDS cover difficulties 1..5', () => {
    expect(XP_REWARDS.length).toBe(5)
    XP_REWARDS.forEach(x => expect(x).toBeGreaterThan(0))
  })
})
import { useMemo } from 'react'
import { CHAPTERS, TaskResult, getLevelForXp } from '../data'
import './Tasks.css'

interface Props {
  onSelectChapter: (chapterId: string) => void
  taskResults: TaskResult[]
  xp: number
}

const TEST_LEN = 15

export default function Tasks({ onSelectChapter, taskResults, xp }: Props) {
  const { level } = getLevelForXp(xp)

  const chapterStats = useMemo(() => {
    const map: Record<string, { solved: number; correct: number; lessonCounts: number[] }> = {}
    CHAPTERS.forEach(ch => { map[ch.id] = { solved: 0, correct: 0, lessonCounts: new Array<number>(ch.lessons.length).fill(0) } })
    taskResults.forEach(t => {
      const s = map[t.chapterId]
      if (s) {
        s.solved++; if (t.correct) s.correct++
        if (t.lessonIndex != null && t.lessonIndex >= 0 && t.lessonIndex < s.lessonCounts.length) s.lessonCounts[t.lessonIndex]++
      }
    })
    return map
  }, [taskResults])

  return (
    <div className="tasks">
      <div className="tasks-header">
        <h2>Chapters</h2>
        <p className="tasks-subtitle">Learn and practice math step by step</p>
      </div>

      <div className="chapters-grid">
        {CHAPTERS.map(ch => {
          const stats = chapterStats[ch.id]
          const progress = stats.solved > 0 ? Math.round((stats.correct / Math.max(stats.solved, 1)) * 100) : 0

          return (
            <button
              key={ch.id}
              className="chapter-card"
              onClick={() => onSelectChapter(ch.id)}
              style={{ borderColor: ch.color + '40' }}
            >
              <div className="chapter-icon" style={{ color: ch.color, borderColor: ch.color + '30' }}>
                {ch.icon === 'log' ? 'log' : ch.icon}
              </div>
              <div className="chapter-info">
                <h3 className="chapter-title">{ch.title}</h3>
                <p className="chapter-lessons">{ch.lessons.length} lessons</p>
              </div>
              <div className="chapter-stats">
                <span className="chapter-solved">{stats.solved} solved</span>
                <div className="chapter-diff-dots" title="Lessons completed">
                  {stats.lessonCounts.map((done, i) => (
                    <span key={i} className={`diff-dot ${done >= TEST_LEN ? 'lesson-done' : ''}`} style={{ background: done >= TEST_LEN ? '#2ecc71' : undefined }} />
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
import { useMemo } from 'react'
import { Chapter, CHAPTERS, TaskResult, getLevelForXp } from '../data'
import './Tasks.css'

interface Props {
  onSelectChapter: (chapterId: string) => void
  taskResults: TaskResult[]
  xp: number
}

export default function Tasks({ onSelectChapter, taskResults, xp }: Props) {
  const { level } = getLevelForXp(xp)

  const chapterStats = useMemo(() => {
    const map: Record<string, { solved: number; correct: number; bestDiff: number }> = {}
    CHAPTERS.forEach(ch => { map[ch.id] = { solved: 0, correct: 0, bestDiff: 0 } })
    taskResults.forEach(t => {
      const s = map[t.chapterId]
      if (s) { s.solved++; if (t.correct) s.correct++ }
    })
    CHAPTERS.forEach(ch => {
      const s = map[ch.id]
      for (let d = 1; d <= 5; d++) {
        const atD = taskResults.filter(t => t.chapterId === ch.id && t.difficulty === d)
        const atDCorrect = atD.filter(t => t.correct).length
        if (atD.length >= 5 && atDCorrect / atD.length >= 0.8) s.bestDiff = d
        else break
      }
    })
    return map
  }, [taskResults])

  const maxDiff = 5

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
                <div className="chapter-diff-dots">
                  {Array.from({ length: maxDiff }, (_, i) => (
                    <span
                      key={i}
                      className={`diff-dot ${i < stats.bestDiff ? 'filled' : ''}`}
                      style={{ background: i < stats.bestDiff ? ch.color : undefined }}
                    />
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

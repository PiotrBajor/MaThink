import { useState, useMemo } from 'react'
import { CHAPTERS, TaskResult, generateChapterBatch, Task, XP_REWARDS } from '../data'
import LessonView from './LessonView'
import './Chapter.css'

interface Props {
  chapterId: string
  onBack: () => void
  taskResults: TaskResult[]
  onSolve: (result: TaskResult) => void
  onQuizActiveChange?: (active: boolean) => void
}

type Phase = 'menu' | 'quiz' | 'results'
interface AnsweredTask { task: Task; userAnswer: string; correct: boolean }

export default function Chapter({ chapterId, onBack, taskResults, onSolve, onQuizActiveChange }: Props) {
  const chapter = useMemo(() => CHAPTERS.find(c => c.id === chapterId)!, [chapterId])
  const [phase, setPhase] = useState<Phase>('menu')
  const [difficulty, setDifficulty] = useState(1)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answered, setAnswered] = useState<AnsweredTask[]>([])
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null)

  const stats = useMemo(() => {
    const cr = taskResults.filter(t => t.chapterId === chapterId)
    const solved = cr.length
    const correct = cr.filter(t => t.correct).length
    let bestDiff = 0
    for (let d = 1; d <= 5; d++) {
      const atD = cr.filter(t => t.difficulty === d)
      const atDCorrect = atD.filter(t => t.correct).length
      if (atD.length >= 5 && atDCorrect / atD.length >= 0.8) bestDiff = d
      else break
    }
    return { solved, correct, bestDiff, bestDiffLabel: ['Easy','Medium','Hard','Expert','Master'][bestDiff] || 'Easy' }
  }, [taskResults, chapterId])

  const startChapterQuiz = (diff: number) => {
    setDifficulty(diff)
    const batch = generateChapterBatch(chapterId, diff, 10)
    setTasks(batch)
    setCurrentIndex(0)
    setUserAnswer('')
    setAnswered([])
    setPhaseSafe('quiz')
  }

  const setPhaseSafe = (p: Phase) => {
    setPhase(p)
    onQuizActiveChange?.(p === 'quiz')
  }

  const submitAnswer = () => {
    const ans = parseFloat(userAnswer)
    if (isNaN(ans) || userAnswer.trim() === '') return
    const task = tasks[currentIndex]
    const correct = Math.abs(ans - task.answer) < 0.01
    const xp = correct ? XP_REWARDS[difficulty - 1] : 0
    const newAnswered = [...answered, { task, userAnswer, correct }]
    setAnswered(newAnswered)
    onSolve({ id: Date.now() + currentIndex, chapterId, difficulty, correct, xpEarned: xp, timestamp: new Date().toISOString() })
    if (currentIndex + 1 < tasks.length) { setCurrentIndex(prev => prev + 1); setUserAnswer('') }
    else setPhaseSafe('results')
  }

  const totalCorrect = answered.filter(a => a.correct).length
  const totalXp = answered.reduce((s, a) => s + (a.correct ? XP_REWARDS[difficulty - 1] : 0), 0)

  // Show lesson view if a lesson is selected
  if (selectedLesson !== null) {
    const lesson = chapter.lessons[selectedLesson]
    return (
      <LessonView
        chapterId={chapterId}
        lessonIndex={selectedLesson}
        chapterColor={chapter.color}
        lessonTitle={lesson.title}
        lessonContent={lesson.content}
        lessonExamples={lesson.examples}
        onBack={() => setSelectedLesson(null)}
        onSolve={onSolve}
        onQuizActiveChange={onQuizActiveChange}
      />
    )
  }

  return (
    <div className="chapter-view">
      <div className="chapter-nav">
        <button className="btn-back" onClick={() => phase === 'menu' ? onBack() : setPhaseSafe('menu')}>
          {phase === 'menu' ? '\u2190 Chapters' : '\u2190 Back'}
        </button>
        <h2 style={{ color: chapter.color }}>{chapter.title}</h2>
      </div>

      {/* ============ MENU ============ */}
      {phase === 'menu' && (
        <>
          <div className="lessons-list">
            {chapter.lessons.map((lesson, i) => (
              <button key={i} className="lesson-card clickable" onClick={() => setSelectedLesson(i)} style={{ borderColor: chapter.color + '30' }}>
                <div className="lesson-num" style={{ background: chapter.color }}>{i + 1}</div>
                <div className="lesson-body">
                  <h3>{lesson.title}</h3>
                  <p className="lesson-preview">{lesson.content[0]?.content.slice(0, 100)}...</p>
                  <span className="lesson-open-hint">Open lesson {'\u2192'}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="chapter-summary">
            <div className="summary-row">
              <div className="summary-stat">
                <span className="summary-label">Solved</span>
                <span className="summary-val">{stats.solved}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Accuracy</span>
                <span className="summary-val">{stats.solved > 0 ? Math.round(stats.correct / stats.solved * 100) : 0}%</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Best Level</span>
                <span className="summary-val">{stats.bestDiffLabel}</span>
              </div>
            </div>
            <button className="btn-chapter-quiz" onClick={() => startChapterQuiz(Math.max(1, stats.bestDiff))} style={{ background: chapter.color }}>
              Mixed Practice (All Lessons)
            </button>
          </div>
        </>
      )}

      {/* ============ QUIZ ============ */}
      {phase === 'quiz' && tasks.length > 0 && (
        <div className="quiz-phase">
          <div className="quiz-progress">
            <span>{currentIndex + 1} / {tasks.length}</span>
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${(currentIndex / tasks.length) * 100}%`, background: chapter.color }} />
            </div>
          </div>
          <div className="quiz-task-card">
            <div className="quiz-question">{tasks[currentIndex].display}</div>
            <div className="quiz-input-row">
              <input type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                placeholder="Your answer" className="quiz-input" autoFocus />
              <button className="btn-submit-answer" onClick={submitAnswer} style={{ background: chapter.color }}>
                {currentIndex + 1 < tasks.length ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
          {answered.length > 0 && (
            <div className="quiz-dots">
              {answered.map((a, i) => (<span key={i} className={`quiz-dot ${a.correct ? 'correct' : 'wrong'}`} />))}
              {tasks.slice(currentIndex).map((_, i) => (<span key={`p${i}`} className="quiz-dot pending" />))}
            </div>
          )}
        </div>
      )}

      {/* ============ RESULTS ============ */}
      {phase === 'results' && (
        <div className="results-phase">
          <div className="results-summary">
            <div className="results-score">
              <span className="results-num" style={{ color: chapter.color }}>{totalCorrect}</span>
              <span className="results-of">/ {tasks.length}</span>
            </div>
            <div className="results-xp">+{totalXp} XP earned</div>
          </div>
          <div className="results-list">
            {answered.map((a, i) => (
              <div key={i} className={`result-row ${a.correct ? 'correct' : 'wrong'}`}>
                <span className="result-num">#{i + 1}</span>
                <span className="result-question">{a.task.display}</span>
                <span className="result-your">Your: {a.userAnswer}</span>
                <span className="result-answer">Ans: {a.task.answer}</span>
                <span className={`result-icon ${a.correct ? 'correct' : 'wrong'}`}>{a.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
          <div className="results-actions">
            <button className="btn-retry" onClick={() => startChapterQuiz(difficulty)} style={{ background: chapter.color }}>Try Again</button>
            <button className="btn-back-chapters" onClick={() => setPhaseSafe('menu')}>Back to Chapter</button>
          </div>
        </div>
      )}
    </div>
  )
}

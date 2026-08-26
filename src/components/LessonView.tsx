import { useState } from 'react'
import { Task, generateLessonBatch, XP_REWARDS } from '../data'
import './LessonView.css'

interface Props {
  chapterId: string
  lessonIndex: number
  chapterColor: string
  lessonTitle: string
  lessonContent: { type: string; content: string }[]
  lessonExamples: string[]
  onBack: () => void
  onSolve: (result: { id: number; chapterId: string; difficulty: number; correct: boolean; xpEarned: number; timestamp: string }) => void
  onQuizActiveChange?: (active: boolean) => void
}

interface AnsweredTask { task: Task; userAnswer: string; correct: boolean }

export default function LessonView({ chapterId, lessonIndex, chapterColor, lessonTitle, lessonContent, lessonExamples, onBack, onSolve, onQuizActiveChange }: Props) {
  const [phase, setPhase] = useState<'read' | 'quiz' | 'results'>('read')

  const setPhaseSafe = (p: 'read' | 'quiz' | 'results') => {
    setPhase(p)
    onQuizActiveChange?.(p === 'quiz')
  }
  const [difficulty, setDifficulty] = useState(1)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answered, setAnswered] = useState<AnsweredTask[]>([])

  const startQuiz = (diff: number) => {
    setDifficulty(diff)
    const batch = generateLessonBatch(chapterId, lessonIndex, diff, 10)
    setTasks(batch)
    setCurrentIndex(0)
    setUserAnswer('')
    setAnswered([])
    setPhaseSafe('quiz')
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

  return (
    <div className="lesson-view">
      <div className="lesson-nav">
        <button className="btn-back" onClick={() => phase === 'read' ? onBack() : setPhaseSafe('read')}>
          {phase === 'read' ? '\u2190 Back' : '\u2190 Lesson'}
        </button>
        <h2 style={{ color: chapterColor }}>{lessonTitle}</h2>
      </div>

      {/* ============ READ PHASE ============ */}
      {phase === 'read' && (
        <div className="lesson-content">
          {lessonContent.map((block, i) => {
            if (block.type === 'heading') return <h3 key={i} className="lc-heading">{block.content}</h3>
            if (block.type === 'example') return <div key={i} className="lc-example"><span className="lc-example-label">Example</span>{block.content}</div>
            if (block.type === 'rule') return <div key={i} className="lc-rule">{block.content}</div>
            if (block.type === 'code') return <pre key={i} className="lc-code">{block.content}</pre>
            return <p key={i} className="lc-text">{block.content}</p>
          })}

          <div className="lesson-examples-section">
            <h4>Quick Examples</h4>
            <div className="lesson-examples">
              {lessonExamples.map((ex, j) => (<code key={j}>{ex}</code>))}
            </div>
          </div>

          <div className="lesson-practice-section">
            <h4>Practice this lesson</h4>
            <p className="practice-hint">Choose a difficulty to start a 10-question quiz</p>
            <div className="practice-diffs">
              {[1,2,3,4,5].map(d => (
                <button key={d} className="practice-diff-btn" onClick={() => startQuiz(d)} style={{ borderColor: chapterColor + '40' }}>
                  <span className="pd-name">{['Easy','Medium','Hard','Expert','Master'][d-1]}</span>
                  <span className="pd-xp">+{XP_REWARDS[d-1]} XP</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ QUIZ PHASE ============ */}
      {phase === 'quiz' && tasks.length > 0 && (
        <div className="quiz-phase">
          <div className="quiz-progress">
            <span>{currentIndex + 1} / {tasks.length}</span>
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${(currentIndex / tasks.length) * 100}%`, background: chapterColor }} />
            </div>
          </div>
          <div className="quiz-task-card">
            <div className="quiz-question">{tasks[currentIndex].display}</div>
            <div className="quiz-input-row">
              <input type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                placeholder="Your answer" className="quiz-input" autoFocus />
              <button className="btn-submit-answer" onClick={submitAnswer} style={{ background: chapterColor }}>
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
              <span className="results-num" style={{ color: chapterColor }}>{totalCorrect}</span>
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
            <button className="btn-retry" onClick={() => startQuiz(difficulty)} style={{ background: chapterColor }}>Try Again</button>
            <button className="btn-back-chapters" onClick={() => setPhaseSafe('read')}>Back to Lesson</button>
          </div>
        </div>
      )}
    </div>
  )
}

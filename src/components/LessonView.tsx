import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react'
import { Task, generateLessonBatch, XP_REWARDS } from '../data'
import { renderMath } from '../utils/mathfmt'
import { playCorrect, playWrong, playStart } from '../utils/sound'
import { confetti } from '../utils/confetti'
import './LessonView.css'
import CalcPopover from './CalcPopover'

const MathGraph = lazy(() => import('./MathGraph'))

interface Props {
  chapterId: string
  lessonIndex: number
  chapterColor: string
  lessonTitle: string
  lessonContent: { type: string; content: string }[]
  lessonExamples: string[]
  onBack: () => void
  onSolve: (result: { id: number; chapterId: string; difficulty: number; correct: boolean; xpEarned: number; timestamp: string; lessonIndex: number }) => void
  onQuizActiveChange?: (active: boolean) => void
}

interface AnsweredTask { task: Task; userAnswer: string; correct: boolean }

function Rich({ text }: { text: string }) {
  return <>{renderMath(text)}</>
}

const TEST_LEN = 15

export default function LessonView({ chapterId, lessonIndex, chapterColor, lessonTitle, lessonContent, lessonExamples, onBack, onSolve, onQuizActiveChange }: Props) {
  const [phase, setPhase] = useState<'read' | 'quiz' | 'results'>('read')

  const setPhaseSafe = (p: 'read' | 'quiz' | 'results') => {
    setPhase(p)
    onQuizActiveChange?.(p === 'quiz')
  }
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answered, setAnswered] = useState<AnsweredTask[]>([])
  const [calcOpen, setCalcOpen] = useState(false)

  const startQuizWith = (list?: Task[]) => {
    const batch = list ?? generateLessonBatch(chapterId, lessonIndex, TEST_LEN)
    setTasks(batch)
    setCurrentIndex(0)
    setUserAnswer('')
    setAnswered([])
    setPhaseSafe('quiz')
    playStart()
  }

  const startQuiz = () => startQuizWith()

  const submitAnswer = (value?: string) => {
    const task = tasks[currentIndex]
    let ans: number | string = value ?? ''
    if (task.options) {
      ans = value ?? ''
      if (ans === '') return
    } else {
      const num = parseFloat(userAnswer)
      if (isNaN(num) || userAnswer.trim() === '') return
      ans = num
    }
    const correct = task.options
      ? String(ans) === String(task.answer)
      : typeof ans === 'number'
        ? Math.abs(ans - Number(task.answer)) < 0.01
        : ans === task.answer
    const qd = task.difficulty ?? 1
    const xp = correct ? XP_REWARDS[qd - 1] : 0
    const newAnswered = [...answered, { task, userAnswer: String(ans), correct }]
    setAnswered(newAnswered)
    onSolve({ id: Date.now() + currentIndex, chapterId, difficulty: qd, correct, xpEarned: xp, timestamp: new Date().toISOString(), lessonIndex })
    if (correct) { playCorrect(); confetti(18) } else playWrong()
    if (currentIndex + 1 < tasks.length) { setCurrentIndex(prev => prev + 1); setUserAnswer('') }
    else { setPhaseSafe('results'); if (newAnswered.filter(a => a.correct).length >= tasks.length - 2) confetti(60) }
  }

  useEffect(() => {
    if (phase !== 'quiz' || tasks.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (calcOpen) return
      const task = tasks[currentIndex]
      if (task.options) {
        const idx = parseInt(e.key, 10)
        if (idx >= 1 && idx <= task.options.length) { submitAnswer(String(task.options[idx - 1])); return }
      }
      if (e.key === 'Enter') submitAnswer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const totalCorrect = answered.filter(a => a.correct).length
  const wrongCount = answered.length - totalCorrect
  const totalXp = answered.reduce((s, a) => s + (a.correct ? XP_REWARDS[(a.task.difficulty ?? 1) - 1] : 0), 0)

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
            if (block.type === 'example') return <div key={i} className="lc-example"><span className="lc-example-label">Example</span><Rich text={block.content} /></div>
            if (block.type === 'rule') return <div key={i} className="lc-rule"><Rich text={block.content} /></div>
            if (block.type === 'code') return <pre key={i} className="lc-code">{block.content}</pre>
            if (block.type === 'graph') return (
              <Suspense key={i} fallback={<div className="lc-mathgraph-placeholder">Loading graph...</div>}>
                <MathGraph expr={block.content} color={chapterColor} />
              </Suspense>
            )
            return <p key={i} className="lc-text"><Rich text={block.content} /></p>
          })}

          <div className="lesson-examples-section">
            <h4>Quick Examples</h4>
            <div className="lesson-examples">
              {lessonExamples.map((ex, j) => (<code key={j}><Rich text={ex} /></code>))}
            </div>
          </div>

          <div className="lesson-practice-section">
            <h4>Practice this lesson</h4>
            <p className="practice-hint">Starts easy and gets harder as you go</p>
            <div className="practice-diffs">
              <button className="practice-diff-btn test-btn" onClick={startQuiz} style={{ borderColor: chapterColor + '40', background: chapterColor + '1a' }}>
                <span className="pd-name">Start {TEST_LEN}-Question Test</span>
                <span className="pd-xp">up to +{XP_REWARDS[4]} XP / question</span>
              </button>
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
            {tasks[currentIndex].options ? (
              <div className="quiz-mc-row">
                {tasks[currentIndex].options!.map((opt, oi) => (
                  <button key={oi} className="quiz-mc-btn" style={{ borderColor: chapterColor + '55' }} onClick={() => submitAnswer(String(opt))}>
                    {String(opt)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="quiz-input-row">
                <input type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                  placeholder="Your answer" className="quiz-input" autoFocus />
                <button className="btn-submit-answer" onClick={() => submitAnswer()} style={{ background: chapterColor }}>
                  {currentIndex + 1 < tasks.length ? 'Next' : 'Finish'}
                </button>
              </div>
            )}
            <div className="quiz-actions-row">
              <CalcPopover onOpenChange={setCalcOpen} />
            </div>
            <div className="quiz-tip">
              {tasks[currentIndex].options ? 'Press 1-' + tasks[currentIndex].options.length + ' to pick an answer' : 'Press Enter to submit'}
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
            {wrongCount > 0 && (
              <button className="btn-review" onClick={() => startQuizWith(answered.filter(a => !a.correct).map(a => a.task))} style={{ borderColor: chapterColor }}>
                Review mistakes ({wrongCount})
              </button>
            )}
            <button className="btn-retry" onClick={startQuiz} style={{ background: chapterColor }}>Try Again</button>
            <button className="btn-back-chapters" onClick={() => setPhaseSafe('read')}>Back to Lesson</button>
          </div>
        </div>
      )}
    </div>
  )
}

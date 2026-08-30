import { useState, useMemo, useEffect } from 'react'
import { CHAPTERS, TaskResult, generateChapterBatch, Task, XP_REWARDS } from '../data'
import LessonView from './LessonView'
import { playCorrect, playWrong, playStart } from '../utils/sound'
import { confetti } from '../utils/confetti'
import './Chapter.css'
import CalcPopover from './CalcPopover'

interface Props {
  chapterId: string
  onBack: () => void
  taskResults: TaskResult[]
  onSolve: (result: TaskResult) => void
  onQuizActiveChange?: (active: boolean) => void
}

type Phase = 'menu' | 'quiz' | 'results'
interface AnsweredTask { task: Task; userAnswer: string; correct: boolean }

const TEST_LEN = 15
const LEVEL_NAMES = ['Easy', 'Medium', 'Hard', 'Expert', 'Master']

export default function Chapter({ chapterId, onBack, taskResults, onSolve, onQuizActiveChange }: Props) {
  const chapter = useMemo(() => CHAPTERS.find(c => c.id === chapterId)!, [chapterId])
  const [phase, setPhase] = useState<Phase>('menu')
  const [difficulty, setDifficulty] = useState(1)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answered, setAnswered] = useState<AnsweredTask[]>([])
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null)
  const [calcOpen, setCalcOpen] = useState(false)

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
    const lessonCounts = new Array<number>(chapter.lessons.length).fill(0)
    cr.forEach(t => { if (t.lessonIndex != null && t.lessonIndex >= 0 && t.lessonIndex < lessonCounts.length) lessonCounts[t.lessonIndex]++ })
    return { solved, correct, bestDiff, bestDiffLabel: LEVEL_NAMES[bestDiff] || LEVEL_NAMES[0], lessonCounts }
  }, [taskResults, chapterId, chapter.lessons.length])

  const startQuizWith = (diff: number, list?: Task[]) => {
    const batch = list ?? generateChapterBatch(chapterId, diff, TEST_LEN)
    setTasks(batch)
    setCurrentIndex(0)
    setUserAnswer('')
    setAnswered([])
    setPhaseSafe('quiz')
    playStart()
  }

  const startChapterQuiz = (diff: number) => {
    setDifficulty(diff)
    startQuizWith(diff)
  }

  const setPhaseSafe = (p: Phase) => {
    setPhase(p)
    onQuizActiveChange?.(p === 'quiz')
  }

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
    const qd = task.difficulty ?? difficulty
    const xp = correct ? XP_REWARDS[qd - 1] : 0
    const newAnswered = [...answered, { task, userAnswer: String(ans), correct }]
    setAnswered(newAnswered)
    onSolve({ id: Date.now() + currentIndex, chapterId, difficulty: qd, correct, xpEarned: xp, timestamp: new Date().toISOString(), lessonIndex: task.lessonIndex })
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
  const totalXp = answered.reduce((s, a) => s + (a.correct ? XP_REWARDS[(a.task.difficulty ?? difficulty) - 1] : 0), 0)

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
                {stats.lessonCounts[i] >= TEST_LEN && <span className="lesson-done-dot" title="Lesson test completed" />}
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

            <div className="chapter-test-box">
              <h4>Chapter Test</h4>
              <p className="chapter-test-hint">Mixed {TEST_LEN}-question test over all lessons. Questions start easy and get harder. Unlock levels by scoring 80% at the current level.</p>
              <div className="chapter-test-levels">
                {[1,2,3,4,5].map(lvl => {
                  const locked = lvl > stats.bestDiff + 1
                  return (
                    <button
                      key={lvl}
                      className={`chapter-test-btn ${locked ? 'locked' : ''}`}
                      style={{ borderColor: chapter.color + '55', background: stats.bestDiff + 1 >= lvl ? chapter.color : undefined }}
                      disabled={locked}
                      onClick={() => startChapterQuiz(lvl)}
                    >
                      <span className="ctb-name">{LEVEL_NAMES[lvl - 1]}</span>
                      <span className="ctb-xp">+{XP_REWARDS[lvl - 1]} XP</span>
                    </button>
                  )
                })}
              </div>
            </div>
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
            {tasks[currentIndex].options ? (
              <div className="quiz-mc-row">
                {tasks[currentIndex].options!.map((opt, oi) => (
                  <button key={oi} className="quiz-mc-btn" style={{ borderColor: chapter.color + '55' }} onClick={() => submitAnswer(String(opt))}>
                    {String(opt)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="quiz-input-row">
                <input type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                  placeholder="Your answer" className="quiz-input" autoFocus />
                <button className="btn-submit-answer" onClick={() => submitAnswer()} style={{ background: chapter.color }}>
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
            {wrongCount > 0 && (
              <button className="btn-review" onClick={() => startQuizWith(difficulty, answered.filter(a => !a.correct).map(a => a.task))} style={{ borderColor: chapter.color }}>
                Review mistakes ({wrongCount})
              </button>
            )}
            <button className="btn-retry" onClick={() => startChapterQuiz(difficulty)} style={{ background: chapter.color }}>Try Again</button>
            <button className="btn-back-chapters" onClick={() => setPhaseSafe('menu')}>Back to Chapter</button>
          </div>
        </div>
      )}
    </div>
  )
}
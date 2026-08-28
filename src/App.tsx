import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import AccountSetup from './components/AccountSetup'
import Dashboard from './components/Dashboard'
import Calculator from './components/Calculator'
import GraphPlotter from './components/GraphPlotter'
import Delta from './components/Delta'
import Tasks from './components/Tasks'
import Chapter from './components/Chapter'
import Settings from './components/Settings'
import { AppData, UserProfile, TaskResult, HistoryEntry, getLevelForXp, getStreak } from './data'
import './App.css'

export type Tab = 'dashboard' | 'calculator' | 'graph' | 'delta' | 'tasks' | 'settings'

declare global {
  interface Window {
    electronAPI: {
      loadData: () => Promise<AppData>
      saveData: (data: AppData) => Promise<boolean>
      resetData: () => Promise<boolean>
    }
  }
}

const DEFAULT_DATA: AppData = {
  profile: null,
  taskResults: [],
  history: [],
}

export default function App() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [quizActive, setQuizActive] = useState(false)
  const [pendingTab, setPendingTab] = useState<Tab | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  useEffect(() => {
    window.electronAPI.loadData().then(d => {
      setData(d || DEFAULT_DATA)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (loaded) {
      window.electronAPI.saveData(data).catch(console.error)
    }
  }, [data, loaded])

  const handleAccountSetup = (nickname: string) => {
    const profile: UserProfile = {
      nickname,
      level: 1,
      xp: 0,
      createdAt: new Date().toISOString(),
    }
    setData(prev => ({ ...prev, profile }))
  }

  const handleTaskSolve = useCallback((result: TaskResult) => {
    setData(prev => {
      if (!prev.profile) return prev
      const newXp = prev.profile.xp + result.xpEarned
      const { level } = getLevelForXp(newXp)
      const profile = { ...prev.profile, xp: newXp, level }
      return {
        ...prev,
        profile,
        taskResults: [result, ...prev.taskResults].slice(0, 1000),
      }
    })
  }, [])

  const addHistory = (tab: string, input: string, result: string) => {
    const entry: HistoryEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      tab,
      input,
      result,
    }
    setData(prev => ({
      ...prev,
      history: [entry, ...prev.history].slice(0, 200),
    }))
  }

  const handleTabChange = (tab: Tab) => {
    if (quizActive && tab !== 'tasks') {
      setPendingTab(tab)
      setShowLeaveDialog(true)
      return
    }
    setActiveTab(tab)
    setSelectedChapter(null)
  }

  const confirmLeave = () => {
    setQuizActive(false)
    setShowLeaveDialog(false)
    if (pendingTab) {
      setActiveTab(pendingTab)
      setSelectedChapter(null)
      setPendingTab(null)
    }
  }

  const cancelLeave = () => {
    setShowLeaveDialog(false)
    setPendingTab(null)
  }

  const handleReset = async () => {
    await window.electronAPI.resetData()
    setData(DEFAULT_DATA)
  }

  const streak = data.profile ? getStreak(data.taskResults).current : 0

  if (!loaded) return <div className="loading">Loading...</div>

  if (!data.profile) {
    return <AccountSetup onComplete={handleAccountSetup} />
  }

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        nickname={data.profile.nickname}
        xp={data.profile.xp}
        streak={streak}
      />
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard profile={data.profile} taskResults={data.taskResults} />
        )}
        {activeTab === 'calculator' && (
          <Calculator onResult={(input, result) => addHistory('Calculator', input, result)} />
        )}
        {activeTab === 'graph' && <GraphPlotter />}
        {activeTab === 'delta' && (
          <Delta onResult={(input, result) => addHistory('Delta', input, result)} />
        )}
        {activeTab === 'tasks' && !selectedChapter && (
          <Tasks
            onSelectChapter={setSelectedChapter}
            taskResults={data.taskResults}
            xp={data.profile.xp}
          />
        )}
        {activeTab === 'tasks' && selectedChapter && (
          <Chapter
            chapterId={selectedChapter}
            onBack={() => setSelectedChapter(null)}
            taskResults={data.taskResults}
            onSolve={handleTaskSolve}
            onQuizActiveChange={setQuizActive}
          />
        )}
        {activeTab === 'settings' && (
          <Settings profile={data.profile} onReset={handleReset} />
        )}
      </main>

      {showLeaveDialog && (
        <div className="dialog-overlay" onClick={cancelLeave}>
          <div className="dialog-box" onClick={e => e.stopPropagation()}>
            <h3>Leave quiz?</h3>
            <p>You have an active quiz in progress. Your progress will be lost.</p>
            <div className="dialog-actions">
              <button className="dialog-btn cancel" onClick={cancelLeave}>Stay</button>
              <button className="dialog-btn confirm" onClick={confirmLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

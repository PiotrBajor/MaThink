import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import AccountSetup from './components/AccountSetup'
import Dashboard from './components/Dashboard'
import Tasks from './components/Tasks'
import Chapter from './components/Chapter'
import Settings from './components/Settings'
import { AppData, UserProfile, TaskResult, HistoryEntry, getLevelForXp, getStreak, normalizeData, DEFAULT_DATA } from './data'
import { loadData, saveData, resetData } from './persistence'
import { setSoundEnabled, playLevelUp } from './utils/sound'
import { confetti } from './utils/confetti'
import './App.css'

const Calculator = lazy(() => import('./components/Calculator'))
const GraphPlotter = lazy(() => import('./components/GraphPlotter'))
const Delta = lazy(() => import('./components/Delta'))
const Solids = lazy(() => import('./components/Solids'))
const Shapes = lazy(() => import('./components/Shapes'))

export type Tab = 'dashboard' | 'calculator' | 'graph' | 'delta' | 'solids' | 'shapes' | 'tasks' | 'settings'
export type Theme = 'dark' | 'light'

declare global {
  interface Window {
    electronAPI: {
      loadData: () => Promise<AppData>
      saveData: (data: AppData) => Promise<boolean>
      resetData: () => Promise<boolean>
      exportData: () => Promise<boolean>
      importData: () => Promise<AppData | null>
    }
  }
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
    loadData().then(d => { setData(d); setLoaded(true) })
  }, [])

  useEffect(() => {
    if (!loaded) return
    window.electronAPI
      ? window.electronAPI.saveData(data).catch(console.error)
      : saveData(data)
  }, [data, loaded])

  useEffect(() => {
    setSoundEnabled(data.settings.sound !== false)
  }, [data.settings.sound])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme === 'light' ? 'light' : 'dark')
  }, [data.settings.theme])

  const handleAccountSetup = (nickname: string) => {
    const profile: UserProfile = { nickname, level: 1, xp: 0, createdAt: new Date().toISOString() }
    setData(prev => ({ ...prev, profile }))
  }

  const handleTaskSolve = useCallback((result: TaskResult) => {
    setData(prev => {
      if (!prev.profile) return prev
      const newXp = prev.profile.xp + result.xpEarned
      const { level } = getLevelForXp(newXp)
      const leveledUp = level > prev.profile.level
      const profile = { ...prev.profile, xp: newXp, level }
      if (leveledUp) {
        confetti(120)
        playLevelUp()
      }
      return {
        ...prev,
        profile,
        taskResults: [result, ...prev.taskResults].slice(0, 1000),
      }
    })
  }, [])

  const addHistory = (tab: string, input: string, result: string) => {
    const entry: HistoryEntry = { id: Date.now(), timestamp: new Date().toISOString(), tab, input, result }
    setData(prev => ({ ...prev, history: [entry, ...prev.history].slice(0, 200) }))
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
    await resetData()
    setData({ ...DEFAULT_DATA })
  }

  const handleToggleTheme = () => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, theme: prev.settings.theme === 'light' ? 'dark' : 'light' } }))
  }

  const handleSetSound = (sound: boolean) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, sound } }))
  }

  const handleExport = async (): Promise<boolean> => {
    if (window.electronAPI) {
      try { return await window.electronAPI.exportData() } catch (e) { console.error(e); return false }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mathink-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  }

  const handleImport = async (): Promise<boolean> => {
    if (window.electronAPI) {
      try {
        const d = await window.electronAPI.importData()
        if (d) { setData(normalizeData(d)); return true }
        return false
      } catch (e) { console.error(e); return false }
    }
    return new Promise<boolean>(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = () => {
        const f = input.files?.[0]
        if (!f) { resolve(false); return }
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result))
            if (parsed && typeof parsed === 'object') {
              setData(normalizeData(parsed))
              resolve(true)
              return
            }
          } catch (e) { console.error(e) }
          resolve(false)
        }
        reader.readAsText(f)
      }
      input.click()
    })
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
        theme={data.settings.theme}
        onToggleTheme={handleToggleTheme}
      />
      <main className="main-content">
        <Suspense fallback={<div className="loading">Loading...</div>}>
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
          {activeTab === 'solids' && <Solids />}
          {activeTab === 'shapes' && <Shapes />}
        </Suspense>
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
          <Settings
            profile={data.profile}
            onReset={handleReset}
            sound={data.settings.sound}
            onSoundChange={handleSetSound}
            onExport={handleExport}
            onImport={handleImport}
          />
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
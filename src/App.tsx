import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Calculator from './components/Calculator'
import GraphPlotter from './components/GraphPlotter'
import Delta from './components/Delta'
import './App.css'

export type Tab = 'calculator' | 'graph' | 'delta'

export interface HistoryEntry {
  id: number
  timestamp: string
  tab: string
  input: string
  result: string
}

declare global {
  interface Window {
    electronAPI: {
      loadHistory: () => Promise<HistoryEntry[]>
      saveHistory: (history: HistoryEntry[]) => Promise<boolean>
      loadSettings: () => Promise<Record<string, unknown>>
      saveSettings: (settings: Record<string, unknown>) => Promise<boolean>
    }
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculator')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.electronAPI.loadHistory().then(data => {
      setHistory(data || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (loaded) {
      window.electronAPI.saveHistory(history).catch(console.error)
    }
  }, [history, loaded])

  const addHistory = (tab: string, input: string, result: string) => {
    const entry: HistoryEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('en-US'),
      tab,
      input,
      result,
    }
    setHistory(prev => [entry, ...prev].slice(0, 200))
  }

  const clearHistory = () => setHistory([])

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        history={history}
        onClearHistory={clearHistory}
      />
      <main className="main-content">
        {activeTab === 'calculator' && <Calculator onResult={(input, result) => addHistory('Calculator', input, result)} />}
        {activeTab === 'graph' && <GraphPlotter />}
        {activeTab === 'delta' && <Delta onResult={(input, result) => addHistory('Delta', input, result)} />}
      </main>
    </div>
  )
}

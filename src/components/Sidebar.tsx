import { useState } from 'react'
import { Tab, HistoryEntry } from '../App'
import './Sidebar.css'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  history: HistoryEntry[]
  onClearHistory: () => void
}

const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'calculator', label: 'Calculator', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="16" y2="18"/></svg> },
  { id: 'graph', label: 'Graphs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id: 'delta', label: 'Delta', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 22h20L12 2z"/></svg> },
]

const historyIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>

export default function Sidebar({ activeTab, onTabChange, history, onClearHistory }: Props) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">
          <span className="logo-ma">Ma</span>
          <span className="logo-think">Think</span>
        </h1>
      </div>

      <nav className="sidebar-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="nav-item history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          <span className="nav-icon">{historyIcon}</span>
          <span className="nav-label">History</span>
          {history.length > 0 && (
            <span className="history-badge">{history.length}</span>
          )}
        </button>
      </div>

      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h3>Calculation History</h3>
            <div className="history-actions">
              <button className="btn-clear" onClick={onClearHistory}>Clear</button>
              <button className="btn-close" onClick={() => setShowHistory(false)}>X</button>
            </div>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="history-empty">No history</p>
            ) : (
              history.map(entry => (
                <div key={entry.id} className="history-entry">
                  <div className="history-meta">
                    <span className="history-tab">{entry.tab}</span>
                    <span className="history-time">{entry.timestamp}</span>
                  </div>
                  <div className="history-expression">{entry.input}</div>
                  <div className="history-result">= {entry.result}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

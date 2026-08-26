import { useState } from 'react'
import { UserProfile } from '../data'
import './Settings.css'

interface Props {
  profile: UserProfile
  onReset: () => void
}

export default function Settings({ profile, onReset }: Props) {
  const [confirming, setConfirming] = useState(false)

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    onReset()
    setConfirming(false)
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-section">
        <h3>Account</h3>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Nickname</span>
            <span className="settings-value">{profile.nickname}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Level</span>
            <span className="settings-value">{profile.level}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Total XP</span>
            <span className="settings-value">{profile.xp}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Member since</span>
            <span className="settings-value">{new Date(profile.createdAt).toLocaleDateString('en-US')}</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Data</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">Reset All Data</span>
              <p className="settings-desc">This will delete your profile, task history, and calculator history. This cannot be undone.</p>
            </div>
            <button
              className={`btn-danger-action ${confirming ? 'confirming' : ''}`}
              onClick={handleReset}
            >
              {confirming ? 'Click again to confirm' : 'Reset All Data'}
            </button>
          </div>
          {confirming && (
            <button className="btn-cancel" onClick={() => setConfirming(false)}>Cancel</button>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Version</span>
            <span className="settings-value">1.0.0</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">App</span>
            <span className="settings-value">MaThink - Math Learning Desktop App</span>
          </div>
        </div>
      </div>
    </div>
  )
}

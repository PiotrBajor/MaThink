import { useState } from 'react'
import { UserProfile } from '../data'
import './Settings.css'

interface Props {
  profile: UserProfile
  onReset: () => void
  sound: boolean
  onSoundChange: (sound: boolean) => void
  onExport: () => Promise<boolean>
  onImport: () => Promise<boolean>
}

export default function Settings({ profile, onReset, sound, onSoundChange, onExport, onImport }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    onReset()
    setConfirming(false)
  }

  const exportData = async () => {
    setMsg(null)
    const ok = await onExport()
    setMsg(ok ? { ok: true, text: 'Progress exported.' } : { ok: false, text: 'Export failed.' })
  }

  const importData = async () => {
    setMsg(null)
    const ok = await onImport()
    setMsg(ok ? { ok: true, text: 'Progress imported.' } : { ok: false, text: 'Import failed or cancelled.' })
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
        <h3>Preferences</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">Sound effects</span>
              <p className="settings-desc">Play a short sound when an answer is right or wrong.</p>
            </div>
            <button
              className={`btn-toggle ${sound ? 'on' : ''}`}
              onClick={() => onSoundChange(!sound)}
              aria-pressed={sound}
            >
              <span className="toggle-track"><span className="toggle-knob" /></span>
              <span className="toggle-label">{sound ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Backup</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">Export progress</span>
              <p className="settings-desc">Save your profile, task history and settings to a JSON file.</p>
            </div>
            <button className="btn-sec-action" onClick={exportData}>Export</button>
          </div>
          <div className="settings-row">
            <div>
              <span className="settings-label">Import progress</span>
              <p className="settings-desc">Restore a previously exported backup. Overwrites current progress.</p>
            </div>
            <button className="btn-sec-action" onClick={importData}>Import</button>
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

      {msg && (
        <div className={`settings-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>
      )}

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
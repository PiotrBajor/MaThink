import { useState } from 'react'
import './AccountSetup.css'

interface Props {
  onComplete: (nickname: string) => void
}

export default function AccountSetup({ onComplete }: Props) {
  const [nickname, setNickname] = useState('')

  const handleSubmit = () => {
    const trimmed = nickname.trim()
    if (trimmed.length >= 2) {
      onComplete(trimmed)
    }
  }

  return (
    <div className="setup-overlay">
      <div className="setup-card">
        <div className="setup-logo">
          <span className="logo-ma">Ma</span>
          <span className="logo-think">Think</span>
        </div>
        <p className="setup-subtitle">Your math learning companion</p>

        <h2 className="setup-title">Welcome!</h2>
        <p className="setup-desc">Enter your nickname to get started</p>

        <div className="setup-input-group">
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Your nickname"
            className="setup-input"
            maxLength={20}
            autoFocus
          />
        </div>

        <button
          className="setup-btn"
          onClick={handleSubmit}
          disabled={nickname.trim().length < 2}
        >
          Get Started
        </button>

        <p className="setup-hint">Min. 2 characters</p>
      </div>
    </div>
  )
}

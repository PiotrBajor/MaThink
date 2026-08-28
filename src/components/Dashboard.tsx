import { useMemo } from 'react'
import { UserProfile, TaskResult, getLevelForXp, getStreak } from '../data'
import './Dashboard.css'

interface Props {
  profile: UserProfile
  taskResults: TaskResult[]
}

export default function Dashboard({ profile, taskResults }: Props) {
  const stats = useMemo(() => {
    const total = taskResults.length
    const correct = taskResults.filter(t => t.correct).length
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    const totalXp = taskResults.reduce((sum, t) => sum + t.xpEarned, 0)
    const { level, progress, currentXp, nextLevelXp } = getLevelForXp(profile.xp)
    const streak = getStreak(taskResults)

    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeek = taskResults.filter(t => new Date(t.timestamp) >= weekAgo)

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayCounts = new Array(7).fill(0)
    thisWeek.forEach(t => {
      const d = new Date(t.timestamp).getDay()
      dayCounts[d]++
    })
    const maxDay = Math.max(...dayCounts, 1)

    const today = taskResults.filter(t => {
      const d = new Date(t.timestamp)
      const todayDate = new Date()
      return d.toDateString() === todayDate.toDateString()
    })

    const totalMinutes = Math.round(taskResults.length * 0.5)

    return { total, correct, accuracy, totalXp, level, progress, currentXp, nextLevelXp, dayCounts, dayNames, maxDay, today, totalMinutes, streak }
  }, [taskResults, profile.xp])

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h2>Welcome back, {profile.nickname}</h2>
          <p className="dash-subtitle">Level {stats.level} learner</p>
        </div>
        <div className="dash-level-badge">
          <span className="level-num">Lv.{stats.level}</span>
        </div>
      </div>

      <div className="dash-xp-bar">
        <div className="xp-bar-info">
          <span>XP: {stats.currentXp} / {stats.nextLevelXp}</span>
          <span>Level {stats.level} {'\u2192'} {stats.level + 1}</span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${stats.progress * 100}%` }} />
        </div>
      </div>

      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Tasks Solved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.today.length}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.accuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalXp}</div>
          <div className="stat-label">Total XP</div>
        </div>
      </div>

      <div className="dash-streak">
        <div className="streak-left">
          <svg className="streak-fire" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          <div className="streak-info">
            <span className="streak-num">{stats.streak.current}</span>
            <span className="streak-label">day streak</span>
          </div>
        </div>
        <div className="streak-strip" title="Last 7 days">
          {stats.streak.last7.map((d, i) => (
            <div key={i} className={`strip-day ${d.active ? 'active' : ''} ${d.isToday ? 'today' : ''}`}>
              <span className="strip-dot" />
              <span className="strip-label">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.date.getDay()]}</span>
            </div>
          ))}
        </div>
        <div className="streak-best">Best: {stats.streak.best} days</div>
      </div>

      <div className="dash-weekly">
        <h3>This Week</h3>
        <div className="weekly-chart">
          {stats.dayNames.map((name, i) => (
            <div key={i} className="weekly-col">
              <div className="weekly-bar-wrap">
                <div
                  className="weekly-bar"
                  style={{ height: `${(stats.dayCounts[i] / stats.maxDay) * 100}%` }}
                />
              </div>
              <span className="weekly-label">{name}</span>
              <span className="weekly-count">{stats.dayCounts[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

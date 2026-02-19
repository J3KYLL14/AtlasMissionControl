import { useState, useEffect } from 'react'
import { DataProvider } from './contexts/DataContext'
import { useData } from './contexts/DataContext'
import Sidebar from './components/Sidebar'
import Overview from './components/Overview'
import EisenhowerMatrix from './components/EisenhowerMatrix'
import Channels from './components/Channels'
import Inbox from './components/Inbox'
import Cron from './components/Cron'
import Login from './components/Login'
import UsagePage from './components/Usage'
import './App.css'

import Settings from './components/Settings'
import SubAgents from './components/SubAgents'
import Skills from './components/Skills'

// ─── Authenticated dashboard ──────────────────────────────────────────────────
// Rendered only after login, inside DataProvider so fetchData has a valid token.

interface DashboardProps {
  onLogout: () => void;
}

function Dashboard({ onLogout }: DashboardProps) {
  const [activePage, setActivePage] = useState('overview')
  const { loading } = useData()

  const renderPage = () => {
    switch (activePage) {
      case 'overview': return <Overview />
      case 'matrix': return <EisenhowerMatrix />
      case 'channels': return <Channels />
      case 'inbox': return <Inbox />
      case 'cron': return <Cron />
      case 'settings': return <Settings />
      case 'subagents': return <SubAgents />
      case 'skills': return <Skills />
      case 'usage': return <UsagePage />
      default: return <Overview />
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        <header className="top-header">
          <div className="search-bar">
            <input type="text" placeholder="Search tasks, logs, or messages..." className="glass" />
          </div>
          <div className="global-status">
            <div className="status-indicator"></div>
            <span>Gateway Online</span>
          </div>
          <button onClick={onLogout} className="logout-btn">Sign Out</button>
        </header>
        {loading ? (
          <div className="loading-screen">
            <div className="loader"></div>
            <p>Initializing Atlas...</p>
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  )
}

// ─── Root App — handles auth gate ─────────────────────────────────────────────

function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('mc_token'))

  const handleLogin = (token: string) => {
    localStorage.setItem('mc_token', token)
    setAuthToken(token)
  }

  useEffect(() => {
    const onAuthError = () => {
      localStorage.removeItem('mc_token')
      setAuthToken(null)
    }
    window.addEventListener('auth:unauthorized', onAuthError)
    return () => window.removeEventListener('auth:unauthorized', onAuthError)
  }, [])

  const handleLogout = async () => {
    const token = localStorage.getItem('mc_token')
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => { })
    }
    localStorage.removeItem('mc_token')
    setAuthToken(null)
  }

  if (!authToken) {
    return <Login onLogin={handleLogin} />
  }

  // DataProvider mounts only when authenticated → fetchData runs with a valid token.
  // When the user logs out, authToken → null and the provider unmounts, clearing all state.
  return (
    <DataProvider>
      <Dashboard onLogout={handleLogout} />
    </DataProvider>
  )
}

export default App

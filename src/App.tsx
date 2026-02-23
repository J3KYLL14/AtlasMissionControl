import { useState, useEffect } from 'react'
import { DataProvider, useData } from './contexts/DataContext'
import { api } from './services/api'
import Sidebar from './components/Sidebar'
import Overview from './components/Overview'
import EisenhowerMatrix from './components/EisenhowerMatrix'
import Channels from './components/Channels'
import Inbox from './components/Inbox'
import Cron from './components/Cron'
import Login from './components/Login'
import './App.css'
import Settings from './components/Settings'
import SubAgents from './components/SubAgents'
import Skills from './components/Skills'
import UsagePage from './components/Usage'
import Deliverables from './components/Deliverables'

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
      case 'deliverables': return <Deliverables />
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

function App() {
  const [authReady, setAuthReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const verifySession = async () => {
    try {
      await api.getSession()
      setIsAuthenticated(true)
    } catch {
      setIsAuthenticated(false)
    } finally {
      setAuthReady(true)
    }
  }

  useEffect(() => {
    verifySession()

    const onAuthError = () => {
      setIsAuthenticated(false)
    }
    window.addEventListener('auth:unauthorized', onAuthError)
    return () => window.removeEventListener('auth:unauthorized', onAuthError)
  }, [])

  const handleLogin = async () => {
    await verifySession()
  }

  const handleLogout = async () => {
    await api.logout().catch(() => { })
    setIsAuthenticated(false)
  }

  if (!authReady) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Checking session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <DataProvider>
      <Dashboard onLogout={handleLogout} />
    </DataProvider>
  )
}

export default App

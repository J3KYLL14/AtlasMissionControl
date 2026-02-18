import { useState } from 'react'
import { useData } from './contexts/DataContext'
import Sidebar from './components/Sidebar'
import Overview from './components/Overview'
import EisenhowerMatrix from './components/EisenhowerMatrix'
import Channels from './components/Channels'
import Inbox from './components/Inbox'
import Cron from './components/Cron'
import './App.css'

import Settings from './components/Settings'
import SubAgents from './components/SubAgents'
import Skills from './components/Skills'

function App() {
  const [activePage, setActivePage] = useState('overview')
  const { loading } = useData()

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <Overview />
      case 'matrix':
        return <EisenhowerMatrix />
      case 'channels':
        return <Channels />
      case 'inbox':
        return <Inbox />
      case 'cron':
        return <Cron />
      case 'settings':
        return <Settings />
      case 'subagents':
        return <SubAgents />
      case 'skills':
        return <Skills />
      case 'runbooks':
        return <div className="placeholder">Runbooks (Coming Soon)</div>
      case 'logs':
        return <div className="placeholder">Audit Logs (Coming Soon)</div>
      default:
        return <Overview />
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

export default App

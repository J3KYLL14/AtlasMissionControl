import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Overview from './components/Overview'
import EisenhowerMatrix from './components/EisenhowerMatrix'
import Channels from './components/Channels'
import Inbox from './components/Inbox'
import Cron from './components/Cron'
import './App.css'

import type { KanbanTask } from './services/mockData'

import Settings from './components/Settings'

function App() {
  const [activePage, setActivePage] = useState('overview')
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch tasks on mount
  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        setTasks(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch tasks:', err)
        setLoading(false)
      })
  }, [])

  // Save tasks whenever they change
  useEffect(() => {
    if (loading) return
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks)
    }).catch(err => console.error('Failed to save tasks:', err))
  }, [tasks, loading])

  const handleTaskAdd = (newTask: KanbanTask) => {
    setTasks(prev => [newTask, ...prev])
  }

  const handleTaskUpdate = (updatedTask: KanbanTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
  }

  const handleTaskDelete = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <Overview
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskAdd={handleTaskAdd}
        />
      case 'matrix':
        return <EisenhowerMatrix
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskAdd={handleTaskAdd}
        />
      case 'channels':
        return <Channels />
      case 'inbox':
        return <Inbox />
      case 'cron':
        return <Cron />
      case 'settings':
        return <Settings />
      case 'runbooks':
        return <div className="placeholder">Runbooks (Coming Soon)</div>
      default:
        return <Overview
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskAdd={handleTaskAdd}
        />
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
            <p>Initializing Mission Control...</p>
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  )
}

export default App

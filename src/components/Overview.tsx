import React, { useState } from 'react';
import type { KanbanTask } from '../services/mockData';
import './Pages.css';
import KanbanBoard from './KanbanBoard';
import AgentStatusSection from './AgentStatusSection';
import { Archive, ArchiveRestore, Plus } from 'lucide-react';
import TaskModal from './TaskModal';
import AddTaskModal from './AddTaskModal';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';

const Overview: React.FC = () => {
    const { tasks, agentStatus, metrics, refreshData } = useData();
    const [showArchive, setShowArchive] = useState(false);
    const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const handleTaskUpdate = async (task: KanbanTask) => {
        await api.updateTask(task);
        refreshData();
    };

    const handleTaskDelete = async (taskId: string) => {
        await api.deleteTask(taskId);
        setActiveTask(null);
        refreshData();
    };

    const handleTaskAdd = async (task: KanbanTask) => {
        await api.createTask(task);
        setShowAddModal(false);
        refreshData();
    };

    return (
        <div className="overview-container">
            <header className="page-header overview-header">
                <div className="title-group">
                    <h2 className="page-title">Mission Control Board</h2>
                    <div className="status-indicator-group">
                        <div className={`status-dot ${agentStatus?.status === 'idle' || agentStatus?.status === 'busy' ? 'online' : 'offline'}`}></div>
                        <span className="status-label">{agentStatus?.status === 'offline' ? 'Offline' : 'Online'}</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={18} /> Add Task
                    </button>
                    <button
                        className={`btn btn-secondary archive-toggle ${showArchive ? 'active' : ''}`}
                        onClick={() => setShowArchive(!showArchive)}
                    >
                        {showArchive ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                        {showArchive ? 'Hide Archive' : 'Show Archive'}
                    </button>
                    <div className="sync-info">
                        <span className="sync-time">Last sync: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </header>

            <div className="overview-top-widgets">
                {agentStatus && <AgentStatusSection agent={agentStatus} horizontal />}

                <div className="deliverables-section glass-card metrics-widget">
                    <h4 className="section-subtitle">Core Metrics</h4>
                    <div className="metrics-grid">
                        <div className="mini-metric">
                            <span className="metric-label">Avg Task Time</span>
                            <span className="metric-value">{metrics?.avgTaskTime || '--'}</span>
                        </div>
                        <div className="mini-metric">
                            <span className="metric-label">Success Rate</span>
                            <span className="metric-value">{metrics?.successRate || '--'}</span>
                        </div>
                        <div className="mini-metric">
                            <span className="metric-label">Active Agents</span>
                            <span className="metric-value">{metrics?.activeAgents || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className={`kanban-main ${showArchive ? 'show-archive' : 'hide-archive'}`}>
                <KanbanBoard
                    tasks={tasks}
                    onTaskClick={setActiveTask}
                    showArchive={showArchive}
                />
            </main>

            {activeTask && (
                <TaskModal
                    task={activeTask}
                    onClose={() => setActiveTask(null)}
                    onSave={handleTaskUpdate}
                    onDelete={handleTaskDelete}
                />
            )}

            {showAddModal && (
                <AddTaskModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleTaskAdd}
                />
            )}
        </div>
    );
};

export default Overview;

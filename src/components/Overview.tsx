import React, { useState } from 'react';
import type { KanbanTask } from '../services/mockData';
import './Pages.css';
import KanbanBoard from './KanbanBoard';
import { Archive, ArchiveRestore, Plus, Compass } from 'lucide-react';
import TaskModal from './TaskModal';
import AddTaskModal from './AddTaskModal';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';

const STATUS_COLOR: Record<string, string> = {
    active: 'var(--status-working)',
    idle:   'var(--status-idle)',
    error:  'var(--status-disconnected)',
};

const initials = (name: string) =>
    name.split(/[\s\-_]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const Overview: React.FC = () => {
    const { tasks, agentStatus, metrics, subAgents, refreshData } = useData();
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

    const assigneeOptions = Array.from(
        new Set((subAgents || []).map((a) => a.name).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const atlasStatus = agentStatus?.status ?? 'idle';
    const activeAgentCount = subAgents.filter(a => a.status === 'active').length;
    const visibleSubAgents = subAgents.filter(a => a.name.toLowerCase() !== 'atlas');

    return (
        <div className="overview-container">
            <div className="overview-split">

                {/* ── Left: Atlas Panel ─────────────────────────────────── */}
                <div className="atlas-panel glass-card">

                    {/* Atlas header */}
                    <div className="atlas-panel-header">
                        <div className="atlas-avatar-wrap">
                            {agentStatus?.image
                                ? <img src={agentStatus.image} alt="Atlas" className="atlas-avatar-img" />
                                : <Compass size={28} />
                            }
                            <div className={`status-dot ${atlasStatus}`}></div>
                        </div>
                        <div className="atlas-info">
                            <h3 className="atlas-name">{agentStatus?.name || 'Atlas'}</h3>
                            <div className="status-badge-inline">
                                <span className={`status-dot-mini ${atlasStatus}`}></span>
                                <span className={`status-text ${atlasStatus}`}>{atlasStatus.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {agentStatus?.message && (
                        <p className="atlas-message">{agentStatus.message}</p>
                    )}

                    {/* Metrics */}
                    <div className="atlas-metrics">
                        <div className="atlas-metric">
                            <span className="metric-label">Avg Task Time</span>
                            <span className="metric-value">{metrics?.avgTaskTime || '--'}</span>
                        </div>
                        <div className="atlas-metric">
                            <span className="metric-label">Success Rate</span>
                            <span className="metric-value">{metrics?.successRate || '--'}</span>
                        </div>
                        <div className="atlas-metric">
                            <span className="metric-label">Active Agents</span>
                            <span className="metric-value">{activeAgentCount}</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="atlas-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus size={16} /> Add Task
                        </button>
                        <button
                            className={`btn btn-secondary archive-toggle ${showArchive ? 'active' : ''}`}
                            onClick={() => setShowArchive(!showArchive)}
                        >
                            {showArchive ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                            {showArchive ? 'Hide Archive' : 'Show Archive'}
                        </button>
                        <span className="sync-time">Last sync: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>

                {/* ── Right: Sub-agents Panel ───────────────────────────── */}
                <div className="sub-agents-overview-panel glass-card">
                    <h4 className="sao-panel-title">Sub Agents</h4>
                    <div className="sao-list">
                        {visibleSubAgents.length === 0 && (
                            <p className="no-sub-agents">No sub-agents deployed</p>
                        )}
                        {visibleSubAgents.map(agent => (
                            <div key={agent.id} className="sao-row">
                                <div className="sao-avatar-wrap">
                                    {agent.image
                                        ? <img src={agent.image} alt={agent.name} className="sao-avatar-img" />
                                        : <div className="sao-avatar-initials">{initials(agent.name)}</div>
                                    }
                                    <span
                                        className="sao-status-dot"
                                        style={{ background: STATUS_COLOR[agent.status] ?? 'var(--status-idle)' }}
                                    />
                                </div>
                                <div className="sao-info">
                                    <span className="sao-name">{agent.name}</span>
                                    <span className="sao-task">{agent.task || 'Idle'}</span>
                                </div>
                            </div>
                        ))}
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
                    assigneeOptions={assigneeOptions}
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

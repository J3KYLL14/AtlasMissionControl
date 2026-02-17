import React, { useState } from 'react';
import { Clock, Play, Pause, Edit2, Trash2, Calendar, Plus, X, Save } from 'lucide-react';
import './Cron.css';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const CronPage: React.FC = () => {
    const { cronJobs, refreshData } = useData();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newJob, setNewJob] = useState({ name: '', schedule: '0 0 * * *', command: '' });

    const handleToggle = async (job: any) => {
        await api.updateCronJob({ ...job, enabled: !job.enabled });
        refreshData();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this job?')) {
            await api.deleteCronJob(id);
            refreshData();
        }
    };

    const handleAdd = async () => {
        await api.createCronJob({
            id: uuidv4(),
            name: newJob.name,
            schedule: newJob.schedule,
            enabled: true,
            lastRunStatus: 'pending',
            nextRunAt: new Date().toISOString(), // Placeholder
            lastRunAt: new Date().toISOString() // Placeholder
        });
        setShowAddModal(false);
        setNewJob({ name: '', schedule: '0 0 * * *', command: '' });
        refreshData();
    };

    return (
        <div className="page-container">
            <header className="page-header cron-header">
                <div>
                    <h2 className="page-title">Cron & Reminders</h2>
                    <p className="page-subtitle">Schedule tasks and manage recurring operations.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18} /> New Schedule
                </button>
            </header>

            <div className="cron-stats">
                <div className="glass-card mini-stat">
                    <span className="mini-label">Total Jobs</span>
                    <span className="mini-value">{cronJobs.length}</span>
                </div>
                <div className="glass-card mini-stat">
                    <span className="mini-label">Active</span>
                    <span className="mini-value">{cronJobs.filter(j => j.enabled).length}</span>
                </div>
                <div className="glass-card mini-stat">
                    <span className="mini-label">Next Run</span>
                    <span className="mini-value">--:--</span>
                </div>
            </div>

            <div className="glass-card cron-table-container">
                <table className="cron-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Task Name</th>
                            <th>Schedule</th>
                            <th>Last Run</th>
                            <th>Next Run</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cronJobs.map((job) => (
                            <tr key={job.id}>
                                <td>
                                    <div
                                        className={`status-indicator ${job.enabled ? 'online' : 'offline'}`}
                                        onClick={() => handleToggle(job)}
                                        style={{ cursor: 'pointer' }}
                                        title="Toggle Status"
                                    ></div>
                                </td>
                                <td>
                                    <div className="job-name-cell">
                                        <span className="job-name">{job.name}</span>
                                        <span className="job-status-text">{job.lastRunStatus}</span>
                                    </div>
                                </td>
                                <td><code className="cron-code">{job.schedule}</code></td>
                                <td>
                                    <div className="time-cell">
                                        <Clock size={12} />
                                        <span>{new Date(job.lastRunAt).toLocaleTimeString()}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="time-cell">
                                        <Calendar size={12} />
                                        <span>{new Date(job.nextRunAt).toLocaleTimeString()}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="table-actions">
                                        <button className="icon-btn" title="Run Now"><Play size={16} /></button>
                                        <button className="icon-btn" title={job.enabled ? "Pause" : "Resume"} onClick={() => handleToggle(job)}>
                                            {job.enabled ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                        <button className="icon-btn" title="Edit"><Edit2 size={16} /></button>
                                        <button className="icon-btn delete" title="Delete" onClick={() => handleDelete(job.id)}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <section className="reminder-wizard">
                <h3 className="section-title">One-Shot Reminders</h3>
                <div className="wizard-grid">
                    <div className="glass-card wizard-card">
                        <span className="wizard-icon">⏰</span>
                        <p>In 20 mins</p>
                    </div>
                    <div className="glass-card wizard-card">
                        <span className="wizard-icon">🌅</span>
                        <p>Tomorrow 9am</p>
                    </div>
                    <div className="glass-card wizard-card">
                        <span className="wizard-icon">📅</span>
                        <p>Custom Time</p>
                    </div>
                </div>
            </section>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <header className="modal-header">
                            <div className="header-left">
                                <Clock size={20} className="text-accent" />
                                <h3 className="text-accent-foreground">New Scheduled Job</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                        </header>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Job Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Database Backup"
                                    value={newJob.name}
                                    onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Cron Expression</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="* * * * *"
                                    value={newJob.schedule}
                                    onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
                                />
                                <span className="helper-text">Format: Min Hour Day Month DayOfWeek</span>
                            </div>
                            <div className="form-group">
                                <label>Target Script / Command</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="npm run backup"
                                    value={newJob.command}
                                    onChange={(e) => setNewJob({ ...newJob, command: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAdd}>
                                <Save size={16} /> Save Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CronPage;

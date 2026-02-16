import React, { useState } from 'react';
import { Clock, Play, Pause, Edit2, Trash2, Calendar, Plus, X, Save } from 'lucide-react';
import { mockCronJobs } from '../services/mockData';
import './Cron.css';

const CronPage: React.FC = () => {
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="page-container">
            {/* ... header and content ... */}
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
                    <span className="mini-value">{mockCronJobs.length}</span>
                </div>
                <div className="glass-card mini-stat">
                    <span className="mini-label">Active</span>
                    <span className="mini-value">{mockCronJobs.filter(j => j.enabled).length}</span>
                </div>
                <div className="glass-card mini-stat">
                    <span className="mini-label">Next Run</span>
                    <span className="mini-value">08:00 AM</span>
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
                        {mockCronJobs.map((job) => (
                            <tr key={job.id}>
                                <td>
                                    <div className={`status-indicator ${job.enabled ? 'online' : 'offline'}`}></div>
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
                                        <button className="icon-btn" title="Pause"><Pause size={16} /></button>
                                        <button className="icon-btn" title="Edit"><Edit2 size={16} /></button>
                                        <button className="icon-btn delete" title="Delete"><Trash2 size={16} /></button>
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
                                <h3>New Scheduled Job</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                        </header>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Job Name</label>
                                <input type="text" className="form-input" placeholder="e.g. Database Backup" />
                            </div>
                            <div className="form-group">
                                <label>Cron Expression</label>
                                <input type="text" className="form-input" placeholder="* * * * *" defaultValue="0 0 * * *" />
                                <span className="helper-text">Format: Min Hour Day Month DayOfWeek</span>
                            </div>
                            <div className="form-group">
                                <label>Target Script / Command</label>
                                <input type="text" className="form-input" placeholder="npm run backup" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => setShowAddModal(false)}>
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

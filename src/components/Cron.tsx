import React, { useState } from 'react';
import { Clock, Play, Pause, Edit2, Trash2, Calendar, Plus, X, Save, Bell } from 'lucide-react';
import './Cron.css';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import AddReminderModal from './AddReminderModal';
import type { CronJob } from '../services/mockData';
import type { ReminderRecord } from '../services/types';

const CronPage: React.FC = () => {
    const { cronJobs, reminders, refreshData } = useData();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newJob, setNewJob] = useState({ name: '', schedule: '0 0 * * *', command: '' });
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderPreset, setReminderPreset] = useState<{ label: string; datetime: string } | undefined>(undefined);

    const handleToggle = async (job: CronJob) => {
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
            command: newJob.command,
            enabled: true,
            lastRunStatus: 'pending',
            nextRunAt: new Date().toISOString(),
            lastRunAt: new Date().toISOString()
        });
        setShowAddModal(false);
        setNewJob({ name: '', schedule: '0 0 * * *', command: '' });
        refreshData();
    };

    const getPresetDatetime = (type: 'in20' | 'tomorrow9' | 'custom') => {
        const now = new Date();
        if (type === 'in20') {
            const d = new Date(now.getTime() + 20 * 60 * 1000);
            return { label: 'In 20 mins', datetime: toLocalDatetime(d) };
        }
        if (type === 'tomorrow9') {
            const d = new Date(now);
            d.setDate(d.getDate() + 1);
            d.setHours(9, 0, 0, 0);
            return { label: 'Tomorrow 9am', datetime: toLocalDatetime(d) };
        }
        return undefined; // custom — no preset
    };

    const toLocalDatetime = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const openReminderModal = (type: 'in20' | 'tomorrow9' | 'custom') => {
        setReminderPreset(getPresetDatetime(type));
        setShowReminderModal(true);
    };

    const handleSaveReminder = async (reminder: ReminderRecord) => {
        await api.createReminder(reminder);
        setShowReminderModal(false);
        setReminderPreset(undefined);
        refreshData();
    };

    const handleDeleteReminder = async (id: string) => {
        await api.deleteReminder(id);
        refreshData();
    };

    const formatReminderTime = (datetime: string) => {
        const d = new Date(datetime);
        const now = new Date();
        const diff = d.getTime() - now.getTime();
        if (diff < 0) return 'Overdue';
        if (diff < 60 * 60 * 1000) return `In ${Math.round(diff / 60000)}m`;
        if (diff < 24 * 60 * 60 * 1000) return `In ${Math.round(diff / 3600000)}h`;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
                    <span className="mini-label">Reminders</span>
                    <span className="mini-value">{reminders.length}</span>
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
                    <div className="glass-card wizard-card" onClick={() => openReminderModal('in20')}>
                        <span className="wizard-icon">⏰</span>
                        <p>In 20 mins</p>
                    </div>
                    <div className="glass-card wizard-card" onClick={() => openReminderModal('tomorrow9')}>
                        <span className="wizard-icon">🌅</span>
                        <p>Tomorrow 9am</p>
                    </div>
                    <div className="glass-card wizard-card" onClick={() => openReminderModal('custom')}>
                        <span className="wizard-icon">📅</span>
                        <p>Custom Time</p>
                    </div>
                </div>

                {reminders.length > 0 && (
                    <div className="reminders-list">
                        {reminders.map((r: ReminderRecord, idx: number) => (
                            <div key={r.id || `reminder-${idx}`} className="glass-card reminder-item">
                                <div className="reminder-item-left">
                                    <Bell size={14} className="reminder-bell" />
                                    <div className="reminder-item-info">
                                        <span className="reminder-item-title">{r.title}</span>
                                        {r.message && <span className="reminder-item-message">{r.message}</span>}
                                    </div>
                                </div>
                                <div className="reminder-item-right">
                                    <span className={`reminder-time-badge ${r.datetime && new Date(r.datetime) < new Date() ? 'overdue' : ''}`}>
                                        {formatReminderTime(r.datetime || r.dueAt || new Date().toISOString())}
                                    </span>
                                    <span className="reminder-channel">{r.channel}</span>
                                    <button className="icon-btn delete" title="Delete" onClick={() => r.id && handleDeleteReminder(r.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

            {showReminderModal && (
                <AddReminderModal
                    onClose={() => { setShowReminderModal(false); setReminderPreset(undefined); }}
                    onSave={handleSaveReminder}
                    preset={reminderPreset}
                />
            )}
        </div>
    );
};

export default CronPage;

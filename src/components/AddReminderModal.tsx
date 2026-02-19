import React, { useState } from 'react';
import { Bell, X, Save } from 'lucide-react';
import { mockChannels } from '../services/mockData';

interface AddReminderModalProps {
    onClose: () => void;
    onSave: (reminder: any) => void;
    preset?: { label: string; datetime: string };
}

const AddReminderModal: React.FC<AddReminderModalProps> = ({ onClose, onSave, preset }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [datetime, setDatetime] = useState(preset?.datetime || '');
    const [channel, setChannel] = useState('dashboard');

    const handleSave = () => {
        if (!title.trim() || !datetime) return;
        onSave({
            title: title.trim(),
            message: message.trim(),
            datetime,
            channel,
            status: 'pending',
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                <header className="modal-header">
                    <div className="header-left">
                        <Bell size={20} className="text-accent" />
                        <h3 className="text-accent-foreground">
                            {preset ? `Reminder — ${preset.label}` : 'New Reminder'}
                        </h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Follow up with team"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Message / Notes</label>
                        <textarea
                            className="form-input"
                            placeholder="Optional details about this reminder..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <div className="form-group">
                        <label>When</label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={datetime}
                            onChange={(e) => setDatetime(e.target.value)}
                        />
                        {preset && (
                            <span className="helper-text">Pre-filled from "{preset.label}" — adjust if needed</span>
                        )}
                    </div>
                    <div className="form-group">
                        <label>Notify via</label>
                        <select
                            className="form-input"
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            style={{ color: 'black', backgroundColor: 'white' }}
                        >
                            <option value="dashboard">Dashboard</option>
                            {mockChannels.map((ch) => (
                                <option key={ch.id} value={ch.id}>{ch.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!title.trim() || !datetime}
                    >
                        <Save size={16} /> Set Reminder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddReminderModal;

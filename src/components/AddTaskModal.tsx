import React, { useState } from 'react';
import { X, Save, Calendar, MessageSquare, PlusSquare } from 'lucide-react';
import type { KanbanTask } from '../services/mockData';
import './TaskModal.css';

interface AddTaskModalProps {
    onClose: () => void;
    onSave: (task: KanbanTask) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<'todo' | 'inprogress'>('todo');
    const [importance, setImportance] = useState(50);
    const [urgency, setUrgency] = useState(50);
    const [dueDate, setDueDate] = useState('');
    const [hasDueDate, setHasDueDate] = useState(false);
    const [description, setDescription] = useState('');
    const [implementationPlan, setImplementationPlan] = useState('This is an implementation plan developed similar to those for coding projects. Step-by-step instructions to completion: \n\n1. ');

    const handleSave = () => {
        if (!title.trim()) return;

        const newTask: KanbanTask = {
            id: `t-${Date.now()}`,
            title,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status,
            importance,
            urgency,
            dueDate: hasDueDate ? new Date(dueDate).toISOString() : undefined,
            description,
            implementationPlan,
            estimatedHours: 4
        };

        onSave(newTask);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="header-left">
                        <PlusSquare size={20} className="text-accent" />
                        <h3>Create New Task</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="form-input"
                            autoFocus
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Initial Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as any)}
                                className="form-select"
                            >
                                <option value="todo">To Do</option>
                                <option value="inprogress">In Progress</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Due Date</label>
                            <div className="checkbox-row" style={{ marginTop: '0.5rem' }}>
                                <label className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        checked={hasDueDate}
                                        onChange={e => setHasDueDate(e.target.checked)}
                                    />
                                    <span className="checkbox-label">Has Deadline</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {hasDueDate && (
                        <div className="form-group">
                            <div className="input-with-icon">
                                <Calendar size={16} className="input-icon" />
                                <input
                                    type="datetime-local"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add some context..."
                            className="form-textarea"
                            rows={3}
                        />
                    </div>

                    <div className="form-group agent-box">
                        <label><MessageSquare size={14} /> Implementation Plan</label>
                        <textarea
                            value={implementationPlan}
                            onChange={e => setImplementationPlan(e.target.value)}
                            placeholder="Write step-by-step instructions to completion..."
                            className="form-textarea agent-textarea"
                            rows={5}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <div className="label-row">
                                <label>Importance</label>
                                <span className="value-badge">{importance}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={importance}
                                onChange={e => setImportance(Number(e.target.value))}
                                className="form-range"
                            />
                        </div>
                        {!hasDueDate && (
                            <div className="form-group">
                                <div className="label-row">
                                    <label>Urgency</label>
                                    <span className="value-badge">{urgency}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={urgency}
                                    onChange={e => setUrgency(Number(e.target.value))}
                                    className="form-range"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <footer className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim()}>
                        <Save size={16} /> Create Task
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AddTaskModal;

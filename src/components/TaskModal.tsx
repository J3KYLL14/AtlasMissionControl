import React, { useState } from 'react';
import type { KanbanTask } from '../services/mockData';
import { X, Calendar, BarChart, MessageSquare, Save, Trash2 } from 'lucide-react';
import './TaskModal.css';

interface TaskModalProps {
    task: KanbanTask;
    onClose: () => void;
    onSave: (updatedTask: KanbanTask) => void;
    onDelete?: (taskId: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
    const [editedTask, setEditedTask] = useState<KanbanTask>({ ...task });
    const [hasDueDate, setHasDueDate] = useState<boolean>(!!task.dueDate);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target as HTMLInputElement;

        if (name === 'hasDueDate') {
            setHasDueDate((e.target as HTMLInputElement).checked);
            return;
        }

        setEditedTask(prev => ({
            ...prev,
            [name]: name === 'importance' || name === 'estimatedHours' ? Number(value) : value
        }));
    };

    const handleSave = () => {
        const taskToSave = { ...editedTask };
        if (!hasDueDate) {
            delete taskToSave.dueDate;
        }
        onSave(taskToSave);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="header-left">
                        <BarChart size={20} className="text-accent" />
                        <h3>Edit Task Details</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Task Title</label>
                        <input
                            type="text"
                            name="title"
                            value={editedTask.title}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                name="status"
                                value={editedTask.status}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="todo">To Do</option>
                                <option value="inprogress">In Progress</option>
                                <option value="done">Done</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Estimated Hours</label>
                            <input
                                type="number"
                                name="estimatedHours"
                                value={editedTask.estimatedHours || ''}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. 4"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label>Due Date</label>
                            <label className="checkbox-group">
                                <input
                                    type="checkbox"
                                    name="hasDueDate"
                                    checked={hasDueDate}
                                    onChange={handleChange}
                                />
                                <span className="checkbox-label">Has Deadline</span>
                            </label>
                        </div>
                        <div className={`input-with-icon ${!hasDueDate ? 'disabled' : ''}`}>
                            <Calendar size={16} className="input-icon" />
                            <input
                                type="datetime-local"
                                name="dueDate"
                                value={editedTask.dueDate ? editedTask.dueDate.substring(0, 16) : ''}
                                onChange={handleChange}
                                className="form-input"
                                disabled={!hasDueDate}
                                style={{ opacity: hasDueDate ? 1 : 0.3 }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={editedTask.description || ''}
                            onChange={handleChange}
                            placeholder="General task description..."
                            className="form-textarea"
                            rows={3}
                        />
                    </div>

                    <div className="form-group agent-box">
                        <label><MessageSquare size={14} /> Implementation Plan</label>
                        <textarea
                            name="implementationPlan"
                            value={editedTask.implementationPlan || ''}
                            onChange={handleChange}
                            placeholder="This is an implementation plan developed similar to those for coding projects. Write step-by-step instructions to completion here."
                            className="form-textarea agent-textarea"
                            rows={6}
                        />
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label>Importance Level</label>
                            <span className="value-badge">{editedTask.importance}%</span>
                        </div>
                        <input
                            type="range"
                            name="importance"
                            min="0"
                            max="100"
                            value={editedTask.importance}
                            onChange={handleChange}
                            className="form-range"
                        />
                    </div>
                </div>

                <footer className="modal-footer">
                    {onDelete && (
                        <button className="btn btn-danger" onClick={() => { onDelete(task.id); onClose(); }}>
                            <Trash2 size={16} /> Delete
                        </button>
                    )}
                    <div className="footer-right">
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default TaskModal;

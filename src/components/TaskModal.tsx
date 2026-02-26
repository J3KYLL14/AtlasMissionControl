import React, { useState } from 'react';
import type { KanbanTask } from '../services/mockData';
import { X, Calendar, BarChart, MessageSquare, Save, Trash2 } from 'lucide-react';
import './TaskModal.css';

interface TaskModalProps {
    task: KanbanTask;
    assigneeOptions: string[];
    onClose: () => void;
    onSave: (updatedTask: KanbanTask) => void;
    onDelete?: (taskId: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, assigneeOptions, onClose, onSave, onDelete }) => {
    const VAULT_ROOT = '/data/.openclaw/vault/';

    const [editedTask, setEditedTask] = useState<KanbanTask>({ ...task });
    const [hasDueDate, setHasDueDate] = useState<boolean>(!!task.dueDate);
    const [markdownInput, setMarkdownInput] = useState('');

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

    const handleAssignAndStart = () => {
        const taskToSave = { ...editedTask, status: 'inprogress' as const };
        if (!hasDueDate) {
            delete taskToSave.dueDate;
        }
        onSave(taskToSave);
        onClose();
    };

    const handlePauseTask = () => {
        const taskToSave = { ...editedTask, status: 'paused' as const };
        if (!hasDueDate) {
            delete taskToSave.dueDate;
        }
        onSave(taskToSave);
        onClose();
    };

    const assigneeLabel = editedTask.assignee?.trim() ? editedTask.assignee : 'Unassigned';
    const linkedMarkdownFiles = editedTask.markdownFiles || [];

    const normalizeInputPath = (rawPath: string) => {
        const trimmed = rawPath.trim();
        if (!trimmed) return '';
        const normalized = trimmed.replace(/\\/g, '/');

        if (normalized.startsWith(VAULT_ROOT)) return normalized;
        if (normalized.startsWith('/')) return normalized;

        const withoutVaultPrefix = normalized.replace(/^vault\//i, '');
        return `${VAULT_ROOT}${withoutVaultPrefix.replace(/^\/+/, '')}`;
    };

    const toVaultDisplay = (rawPath: string) => {
        const normalized = rawPath.replace(/\\/g, '/');
        if (normalized.startsWith(VAULT_ROOT)) {
            return {
                displayPath: `vault/${normalized.slice(VAULT_ROOT.length)}`,
                inVault: true,
            };
        }
        return {
            displayPath: normalized,
            inVault: false,
        };
    };

    const handleAddMarkdown = () => {
        const nextPath = normalizeInputPath(markdownInput);
        if (!nextPath) return;
        if (linkedMarkdownFiles.includes(nextPath)) {
            setMarkdownInput('');
            return;
        }
        setEditedTask((prev) => ({
            ...prev,
            markdownFiles: [...(prev.markdownFiles || []), nextPath],
        }));
        setMarkdownInput('');
    };

    const handleRemoveMarkdown = (pathToRemove: string) => {
        setEditedTask((prev) => ({
            ...prev,
            markdownFiles: (prev.markdownFiles || []).filter((p) => p !== pathToRemove),
        }));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass task-edit-modal" onClick={e => e.stopPropagation()}>
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
                                <option value="paused">Paused</option>
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

                    <div className="form-row assignee-row">
                        <div className="form-group">
                            <label>Assigned To</label>
                            <div className="assignee-current">{assigneeLabel}</div>
                        </div>
                        <div className="form-group">
                            <label>Assign Agent</label>
                            <select
                                name="assignee"
                                value={editedTask.assignee || ''}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="">Unassigned</option>
                                {assigneeOptions.map((agentName) => (
                                    <option key={agentName} value={agentName}>
                                        {agentName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Task Markdown Files</label>
                        <div className="markdown-link-row">
                            <input
                                type="text"
                                value={markdownInput}
                                onChange={(e) => setMarkdownInput(e.target.value)}
                                placeholder="e.g. vault/10 Learn/Research/Topic.md"
                                className="form-input"
                            />
                            <button type="button" className="btn btn-secondary" onClick={handleAddMarkdown}>
                                Link File
                            </button>
                        </div>
                        <div className="markdown-files-box">
                            {linkedMarkdownFiles.length === 0 ? (
                                <div className="markdown-empty">No markdown files linked to this task.</div>
                            ) : (
                                linkedMarkdownFiles.map((path) => {
                                    const display = toVaultDisplay(path);
                                    return (
                                        <div key={path} className="markdown-file-row markdown-file-linked">
                                            <div className="markdown-path-wrap">
                                                <code className="markdown-path">{display.displayPath}</code>
                                                <div className={`markdown-status ${display.inVault ? 'vault' : 'external'}`}>
                                                    {display.inVault
                                                        ? 'In Obsidian vault (sync-enabled)'
                                                        : 'Outside vault (not synced to Obsidian)'}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="markdown-remove-btn"
                                                onClick={() => handleRemoveMarkdown(path)}
                                                title="Remove link"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="markdown-workspace">
                            Vault paths (`vault/...`) sync to your Obsidian vault. Non-vault paths stay server-local.
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
                        <button className="btn btn-secondary" onClick={handlePauseTask}>
                            Pause Task
                        </button>
                        <button className="btn btn-secondary" onClick={handleAssignAndStart}>
                            Assign & Start
                        </button>
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

import React from 'react';
import type { KanbanTask } from '../services/mockData';
import { Square, Zap, CheckCircle2, Archive, Calendar } from 'lucide-react';
import './KanbanBoard.css';

interface KanbanBoardProps {
    tasks: KanbanTask[];
    onTaskClick: (task: KanbanTask) => void;
    showArchive: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskClick, showArchive }) => {
    const columns = [
        { id: 'todo', title: 'To Do', icon: Square, color: 'todo' },
        { id: 'inprogress', title: 'In Progress', icon: Zap, color: 'inprogress' },
        { id: 'done', title: 'Done', icon: CheckCircle2, color: 'done' },
        { id: 'archived', title: 'Archived', icon: Archive, color: 'archived' },
    ].filter(col => col.id !== 'archived' || showArchive);

    return (
        <div className="kanban-board">
            {columns.map((col) => {
                const Icon = col.icon;
                const columnTasks = tasks.filter((t) => t.status === col.id);

                return (
                    <div key={col.id} className="kanban-column">
                        <header className="column-header">
                            <Icon size={16} className={`column-icon ${col.color}`} />
                            <h3 className="column-title">{col.title}</h3>
                            <span className="column-count">{columnTasks.length}</span>
                        </header>

                        <div className="task-list">
                            {columnTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`task-card glass-card border-${col.color}`}
                                    onClick={() => onTaskClick(task)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <p className="task-title">{task.title}</p>
                                    <div className="task-footer">
                                        <Calendar size={12} />
                                        <span className={`task-date ${!task.dueDate ? 'no-deadline' : ''}`}>
                                            {task.dueDate
                                                ? new Date(task.dueDate).toLocaleDateString()
                                                : "No Deadline Set"
                                            }
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default KanbanBoard;

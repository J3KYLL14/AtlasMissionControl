import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { KanbanTask } from '../services/mockData';
import { AlertCircle, Clock, CheckCircle2, Zap, Calendar, Plus } from 'lucide-react';
import TaskModal from './TaskModal';
import AddTaskModal from './AddTaskModal';
import './EisenhowerMatrix.css';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';

const EisenhowerMatrix: React.FC = () => {
    const { tasks, refreshData } = useData();
    const activeTasks = tasks.filter(t => t.status === 'todo' || t.status === 'inprogress');
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
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

    useEffect(() => {
        if (!containerRef.current) return;
        const update = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // Calculate urgency based on due date if available
    const calculateUrgency = (task: KanbanTask): number => {
        if (!task.dueDate) return task.urgency;

        const now = new Date();
        const due = new Date(task.dueDate);
        const diffMs = due.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        // Exponential mapping over 6 months (180 days)
        // Overdue (diffDays <= 0) -> 100
        // Due today -> near 100
        // Due 180 days from now -> 0
        const SIX_MONTHS_DAYS = 180;

        if (diffDays <= 0) return 100;
        if (diffDays >= SIX_MONTHS_DAYS) return 0;

        // Cubic curve: shoots up quickly as the date approaches
        // (1 - ratio)^3 gives a nice exponential feel
        const ratio = diffDays / SIX_MONTHS_DAYS;
        const score = 100 * Math.pow(1 - ratio, 3);

        return isNaN(score) ? 50 : score;
    };

    const handleDragEnd = (taskId: string, _: any, info: any) => {
        if (!containerRef.current || dimensions.width === 0) return;

        const rect = containerRef.current.getBoundingClientRect();

        // Logical ranges for the CURSOR (centered on 180x80 box)
        const minX = 100;
        const maxX = dimensions.width - 100;
        const minY = 50;
        const maxY = dimensions.height - 50;

        const cursorX = info.point.x - rect.left;
        const cursorY = info.point.y - rect.top;

        const rangeX = maxX - minX;
        const rangeY = maxY - minY;

        if (rangeX <= 0 || rangeY <= 0) return;

        let xScore = ((cursorX - minX) / rangeX) * 100;
        let yScore = 100 - (((cursorY - minY) / rangeY) * 100);

        xScore = Math.min(100, Math.max(0, isNaN(xScore) ? 0 : xScore));
        yScore = Math.min(100, Math.max(0, isNaN(yScore) ? 0 : yScore));

        const snap = 2.5;
        xScore = Math.round(xScore / snap) * snap;
        yScore = Math.round(yScore / snap) * snap;

        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const updatedTask = { ...task, importance: yScore };
            if (!task.dueDate) {
                updatedTask.urgency = xScore;
            }
            handleTaskUpdate(updatedTask);
        }
    };

    return (
        <div className="matrix-page">
            <header className="page-header">
                <div>
                    <h2 className="page-title">Eisenhower Matrix</h2>
                    <p className="page-description">Prioritize tasks by Urgency and Importance</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18} /> Add Task
                </button>
            </header>

            <div className="matrix-container" ref={containerRef}>
                {/* Axis Labels */}
                <div className="axis-label x-axis-low">Least Urgent</div>
                <div className="axis-label x-axis-high">Most Urgent</div>
                <div className="axis-label y-axis-low">Low Importance</div>
                <div className="axis-label y-axis-high">High Importance</div>

                {/* Grid Quadrants */}
                <div className="matrix-grid">
                    <div className="quadrant q1"><div className="quadrant-info"><Clock size={18} /><span>SCHEDULE</span></div></div>
                    <div className="quadrant q2"><div className="quadrant-info"><AlertCircle size={18} /><span>DO FIRST</span></div></div>
                    <div className="quadrant q3"><div className="quadrant-info"><CheckCircle2 size={18} /><span>ELIMINATE</span></div></div>
                    <div className="quadrant q4"><div className="quadrant-info"><Zap size={18} /><span>DELEGATE</span></div></div>
                </div>

                {/* Task Markers */}
                {dimensions.width > 0 && activeTasks.map(task => {
                    const uScore = calculateUrgency(task);
                    const iScore = task.importance;

                    const urgency = Math.min(100, Math.max(0, isNaN(uScore) ? 0 : uScore));
                    const importance = Math.min(100, Math.max(0, isNaN(iScore) ? 0 : iScore));

                    // Date status for colors
                    let dateStatus = '';
                    if (task.dueDate) {
                        const diff = new Date(task.dueDate).getTime() - new Date().getTime();
                        const diffDays = diff / (1000 * 60 * 60 * 24);
                        if (diffDays <= 0) dateStatus = 'overdue';
                        else if (diffDays <= 7) dateStatus = 'soon';
                    }

                    // Use transform-based positioning to avoid layout thrashing and feedback loops
                    // Score 0 -> left: 10px. Score 100 -> left: width - 190px.
                    const targetX = 10 + (dimensions.width - 200) * (urgency / 100);
                    const targetY = dimensions.height - 90 - (dimensions.height - 100) * (importance / 100);

                    return (
                        <motion.div
                            key={task.id}
                            drag={task.dueDate ? "y" : true}
                            dragConstraints={containerRef}
                            dragMomentum={false}
                            dragElastic={0}
                            onDragEnd={(event, info) => handleDragEnd(task.id, event, info)}
                            animate={{
                                x: targetX,
                                y: targetY
                            }}
                            className={`task-marker ${task.status} ${task.dueDate ? 'y-only' : ''}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                zIndex: 100
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <motion.div
                                className="marker-content"
                                onTap={() => setActiveTask(task)}
                            >
                                <span className="marker-title">{task.title}</span>
                                {task.dueDate && (
                                    <div className={`marker-meta ${dateStatus}`}>
                                        <Calendar size={10} />
                                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>

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

export default EisenhowerMatrix;

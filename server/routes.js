
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, readSkills, writeSkill, deleteSkill } from './store.js';
import { authenticate } from './auth.js';
import { syncCronJobs, runJobNow } from './cronRunner.js';

const router = express.Router();

// ─── Pagination helper ────────────────────────────────────────────────────────
// If ?page is provided, returns { data, total, page, limit, pages }.
// Without ?page, returns the raw array (backwards-compatible with frontend).
const paginate = (arr, query) => {
    const { page, limit: limitStr } = query;
    if (page === undefined) return arr;
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limitStr) || 20));
    const start = (p - 1) * l;
    return {
        data: arr.slice(start, start + l),
        total: arr.length,
        page: p,
        limit: l,
        pages: Math.ceil(arr.length / l),
    };
};

export const createRoutes = (broadcast) => {

    // ── Tasks ─────────────────────────────────────────────────────────────────
    router.get('/tasks', authenticate, (req, res) => {
        let tasks = readData('tasks');

        // Optional filters for agent queries (?status=todo&priority=high&assignee=atlas)
        if (req.query.status) tasks = tasks.filter(t => t.status === req.query.status);
        if (req.query.priority) tasks = tasks.filter(t => t.priority === req.query.priority);
        if (req.query.assignee) tasks = tasks.filter(t => t.assignee === req.query.assignee);

        res.json(paginate(tasks, req.query));
    });

    router.post('/tasks', authenticate, (req, res) => {
        try {
            const newTask = { id: uuidv4(), date: new Date().toISOString(), ...req.body };
            let tasks = readData('tasks');
            if (!Array.isArray(tasks)) {
                console.warn("Tasks data was not an array, resetting to empty array.");
                tasks = [];
            }
            tasks.unshift(newTask);
            writeData('tasks', tasks);
            broadcast('tasks_update', tasks);
            res.status(201).json(newTask);
        } catch (error) {
            console.error("Error creating task:", error);
            res.status(500).json({ error: "Failed to create task" });
        }
    });

    router.put('/tasks', authenticate, (req, res) => {
        try {
            const updatedTask = req.body;
            let tasks = readData('tasks');
            if (!Array.isArray(tasks)) tasks = [];

            const index = tasks.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
                tasks[index] = { ...tasks[index], ...updatedTask };
                writeData('tasks', tasks);
                broadcast('tasks_update', tasks);
                res.json(tasks[index]);
            } else {
                res.status(404).json({ error: 'Task not found' });
            }
        } catch (error) {
            console.error("Error updating task:", error);
            res.status(500).json({ error: "Failed to update task" });
        }
    });

    router.delete('/tasks', authenticate, (req, res) => {
        const { id } = req.query;
        let tasks = readData('tasks');
        const initialLength = tasks.length;
        tasks = tasks.filter(t => t.id !== id);
        if (tasks.length !== initialLength) {
            writeData('tasks', tasks);
            broadcast('tasks_update', tasks);
            res.json({ message: 'Task deleted' });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    });

    // ── Agent Status ──────────────────────────────────────────────────────────
    router.get('/status', authenticate, (req, res) => {
        res.json(readData('status'));
    });

    router.put('/status', authenticate, (req, res) => {
        const newStatus = { ...readData('status'), ...req.body };
        writeData('status', newStatus);
        broadcast('status_update', newStatus);
        res.json(newStatus);
    });

    // ── Metrics ───────────────────────────────────────────────────────────────
    router.get('/metrics', authenticate, (req, res) => {
        res.json(readData('metrics'));
    });

    router.put('/metrics', authenticate, (req, res) => {
        const newMetrics = { ...readData('metrics'), ...req.body };
        writeData('metrics', newMetrics);
        broadcast('metrics_update', newMetrics);
        res.json(newMetrics);
    });

    // ── Cron Jobs ─────────────────────────────────────────────────────────────

    // Run history — defined before /:id to avoid route shadowing
    router.get('/cron/history', authenticate, (req, res) => {
        let history = readData('cronHistory') || [];
        if (req.query.jobId) history = history.filter(h => h.jobId === req.query.jobId);
        res.json(paginate(history, req.query));
    });

    // Manual trigger
    router.post('/cron/:id/run', authenticate, async (req, res) => {
        const jobs = readData('cron');
        if (!jobs.find(j => j.id === req.params.id)) {
            return res.status(404).json({ error: 'Job not found' });
        }
        try {
            const result = await runJobNow(req.params.id);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/cron', authenticate, (req, res) => {
        res.json(paginate(readData('cron'), req.query));
    });

    router.post('/cron', authenticate, (req, res) => {
        try {
            const newJob = {
                id: uuidv4(),
                lastRunStatus: 'pending',
                lastRunAt: null,
                lastRunOutput: null,
                enabled: true,
                ...req.body,
            };
            let cron = readData('cron');
            if (!Array.isArray(cron)) cron = [];
            cron.push(newJob);
            writeData('cron', cron);
            syncCronJobs(cron);
            broadcast('cron_update', cron);
            res.status(201).json(newJob);
        } catch (error) {
            console.error("Error creating cron job:", error);
            res.status(500).json({ error: "Failed to create cron job" });
        }
    });

    router.put('/cron', authenticate, (req, res) => {
        const updatedJob = req.body;
        const cron = readData('cron');
        const index = cron.findIndex(j => j.id === updatedJob.id);
        if (index !== -1) {
            cron[index] = { ...cron[index], ...updatedJob };
            writeData('cron', cron);
            syncCronJobs(cron);
            broadcast('cron_update', cron);
            res.json(cron[index]);
        } else {
            res.status(404).json({ error: 'Job not found' });
        }
    });

    router.delete('/cron', authenticate, (req, res) => {
        const { id } = req.query;
        let cron = readData('cron');
        const initialLength = cron.length;
        cron = cron.filter(j => j.id !== id);
        if (cron.length !== initialLength) {
            writeData('cron', cron);
            syncCronJobs(cron);
            broadcast('cron_update', cron);
            res.json({ message: 'Job deleted' });
        } else {
            res.status(404).json({ error: 'Job not found' });
        }
    });

    // ── Sub-Agents ────────────────────────────────────────────────────────────
    router.get('/subAgents', authenticate, (req, res) => {
        res.json(paginate(readData('subagents'), req.query));
    });

    router.post('/subAgents', authenticate, (req, res) => {
        const newAgent = { id: uuidv4(), ...req.body };
        const subAgents = readData('subagents');
        subAgents.push(newAgent);
        writeData('subagents', subAgents);
        broadcast('subagents_update', subAgents);
        res.status(201).json(newAgent);
    });

    router.put('/subAgents', authenticate, (req, res) => {
        const updatedAgent = req.body;
        const subAgents = readData('subagents');
        const index = subAgents.findIndex(a => a.id === updatedAgent.id);
        if (index !== -1) {
            subAgents[index] = { ...subAgents[index], ...updatedAgent };
            writeData('subagents', subAgents);
            broadcast('subagents_update', subAgents);
            res.json(subAgents[index]);
        } else {
            res.status(404).json({ error: 'Sub-agent not found' });
        }
    });

    router.delete('/subAgents', authenticate, (req, res) => {
        const { id } = req.query;
        let subAgents = readData('subagents');
        const initialLength = subAgents.length;
        subAgents = subAgents.filter(a => a.id !== id);
        if (subAgents.length !== initialLength) {
            writeData('subagents', subAgents);
            broadcast('subagents_update', subAgents);
            res.json({ message: 'Sub-agent deleted' });
        } else {
            res.status(404).json({ error: 'Sub-agent not found' });
        }
    });

    // ── Skills ────────────────────────────────────────────────────────────────
    router.get('/skills', authenticate, (req, res) => {
        res.json(paginate(readSkills(), req.query));
    });

    router.post('/skills', authenticate, (req, res) => {
        const newSkill = writeSkill(req.body);
        if (newSkill) {
            broadcast('skills_update', readSkills());
            res.status(201).json(newSkill);
        } else {
            res.status(500).json({ error: 'Failed to create skill' });
        }
    });

    router.put('/skills', authenticate, (req, res) => {
        const updatedSkill = writeSkill(req.body);
        if (updatedSkill) {
            broadcast('skills_update', readSkills());
            res.json(updatedSkill);
        } else {
            res.status(500).json({ error: 'Failed to update skill' });
        }
    });

    router.delete('/skills', authenticate, (req, res) => {
        const { id } = req.query;
        if (deleteSkill(id)) {
            broadcast('skills_update', readSkills());
            res.json({ message: 'Skill deleted' });
        } else {
            res.status(404).json({ error: 'Skill not found' });
        }
    });

    // ── Reminders ─────────────────────────────────────────────────────────────
    router.get('/reminders', authenticate, (req, res) => {
        res.json(paginate(readData('reminders'), req.query));
    });

    router.post('/reminders', authenticate, (req, res) => {
        try {
            const newReminder = {
                id: uuidv4(),
                createdAt: new Date().toISOString(),
                ...req.body,
            };
            let reminders = readData('reminders');
            if (!Array.isArray(reminders)) reminders = [];
            reminders.push(newReminder);
            writeData('reminders', reminders);
            broadcast('reminders_update', reminders);
            res.status(201).json(newReminder);
        } catch (error) {
            console.error("Error creating reminder:", error);
            res.status(500).json({ error: "Failed to create reminder" });
        }
    });

    router.delete('/reminders', authenticate, (req, res) => {
        const { id } = req.query;
        let reminders = readData('reminders');
        const initialLength = reminders.length;
        reminders = reminders.filter(r => r.id !== id);
        if (reminders.length !== initialLength) {
            writeData('reminders', reminders);
            broadcast('reminders_update', reminders);
            res.json({ message: 'Reminder deleted' });
        } else {
            res.status(404).json({ error: 'Reminder not found' });
        }
    });

    // ── Usage ─────────────────────────────────────────────────────────────────
    router.get('/usage', authenticate, (req, res) => {
        res.json(readData('usage'));
    });

    return router;
};

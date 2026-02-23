import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, readSkills, writeSkill, deleteSkill } from './store.js';
import { authenticate, authorize } from './auth.js';
import { syncCronJobs, runJobNow } from './cronRunner.js';

const router = express.Router();
const requireAdmin = authorize('admin');

const paginate = (arr, query) => {
    const { page, limit: limitStr } = query;
    if (page === undefined) return arr;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 20));
    const start = (p - 1) * l;
    return {
        data: arr.slice(start, start + l),
        total: arr.length,
        page: p,
        limit: l,
        pages: Math.ceil(arr.length / l),
    };
};

const asString = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const asNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const asBool = (v) => (typeof v === 'boolean' ? v : undefined);
const requireId = (req, res) => {
    const id = asString(req.query.id, 128);
    if (!id) {
        res.status(400).json({ error: 'Valid id query parameter is required' });
        return null;
    }
    return id;
};

const sanitizeTaskPayload = (body, isUpdate = false) => {
    const title = asString(body.title, 140);
    const status = asString(body.status, 32);
    const description = asString(body.description, 5000);
    const implementationPlan = asString(body.implementationPlan, 5000);
    const assignee = asString(body.assignee, 120);
    const priority = asString(body.priority, 32);
    const importance = asNumber(body.importance);
    const urgency = asNumber(body.urgency);
    const estimatedHours = asNumber(body.estimatedHours);
    const dueDate = asString(body.dueDate, 64);

    if (!isUpdate && !title) return { error: 'Task title is required' };
    if (status && !['todo', 'inprogress', 'done', 'archived'].includes(status)) return { error: 'Invalid task status' };

    const payload = {
        ...(title ? { title } : {}),
        ...(status ? { status } : {}),
        ...(description ? { description } : {}),
        ...(implementationPlan ? { implementationPlan } : {}),
        ...(assignee ? { assignee } : {}),
        ...(priority ? { priority } : {}),
        ...(importance !== undefined ? { importance } : {}),
        ...(urgency !== undefined ? { urgency } : {}),
        ...(estimatedHours !== undefined ? { estimatedHours } : {}),
        ...(dueDate ? { dueDate } : {}),
    };
    return { payload };
};

const sanitizeCronPayload = (body) => {
    const name = asString(body.name, 120);
    const command = asString(body.command, 500);
    const schedule = asString(body.schedule, 120);
    const expression = asString(body.expression, 120);
    const enabled = asBool(body.enabled);
    if (!name || !command || !(schedule || expression)) {
        return { error: 'Cron job requires name, command, and schedule/expression' };
    }
    return {
        payload: {
            name,
            command,
            ...(schedule ? { schedule } : {}),
            ...(expression ? { expression } : {}),
            ...(enabled !== undefined ? { enabled } : {}),
        },
    };
};

const sanitizeSubAgentPayload = (body, isUpdate = false) => {
    const name = asString(body.name, 120);
    const role = asString(body.role, 120);
    const status = asString(body.status, 32);
    const description = asString(body.description, 2000);
    const task = asString(body.task, 1000);
    const model = asString(body.model, 200);
    const soul = asString(body.soul, 8000);
    const image = asString(body.image, 1200);
    const maxSpawnDepth = asNumber(body.maxSpawnDepth);
    const skills = Array.isArray(body.skills)
        ? body.skills.map((s) => asString(s, 120)).filter(Boolean).slice(0, 50)
        : undefined;

    if (!isUpdate && (!name || !role)) return { error: 'Sub-agent requires name and role' };
    if (status && !['active', 'idle', 'error'].includes(status)) return { error: 'Invalid sub-agent status' };

    return {
        payload: {
            ...(name ? { name } : {}),
            ...(role ? { role } : {}),
            ...(status ? { status } : {}),
            ...(description ? { description } : {}),
            ...(task ? { task } : {}),
            ...(model ? { model } : {}),
            ...(soul ? { soul } : {}),
            ...(image ? { image } : {}),
            ...(maxSpawnDepth !== undefined ? { maxSpawnDepth } : {}),
            ...(skills ? { skills } : {}),
        },
    };
};

export const createRoutes = (broadcast) => {
    router.get('/tasks', authenticate, (req, res) => {
        let tasks = readData('tasks');
        if (req.query.status) tasks = tasks.filter((t) => t.status === req.query.status);
        if (req.query.priority) tasks = tasks.filter((t) => t.priority === req.query.priority);
        if (req.query.assignee) tasks = tasks.filter((t) => t.assignee === req.query.assignee);
        res.json(paginate(tasks, req.query));
    });

    router.post('/tasks', authenticate, requireAdmin, (req, res) => {
        const { error, payload } = sanitizeTaskPayload(req.body, false);
        if (error) return res.status(400).json({ error });
        let tasks = readData('tasks');
        if (!Array.isArray(tasks)) tasks = [];
        const newTask = { id: uuidv4(), date: new Date().toISOString(), ...payload };
        tasks.unshift(newTask);
        writeData('tasks', tasks);
        broadcast('tasks_update', tasks);
        res.status(201).json(newTask);
    });

    router.put('/tasks', authenticate, requireAdmin, (req, res) => {
        const id = asString(req.body?.id, 128);
        if (!id) return res.status(400).json({ error: 'Task id is required' });
        const { error, payload } = sanitizeTaskPayload(req.body, true);
        if (error) return res.status(400).json({ error });
        let tasks = readData('tasks');
        if (!Array.isArray(tasks)) tasks = [];
        const index = tasks.findIndex((t) => t.id === id);
        if (index === -1) return res.status(404).json({ error: 'Task not found' });
        tasks[index] = { ...tasks[index], ...payload, id };
        writeData('tasks', tasks);
        broadcast('tasks_update', tasks);
        res.json(tasks[index]);
    });

    router.delete('/tasks', authenticate, requireAdmin, (req, res) => {
        const id = requireId(req, res);
        if (!id) return;
        let tasks = readData('tasks');
        const initialLength = tasks.length;
        tasks = tasks.filter((t) => t.id !== id);
        if (tasks.length === initialLength) return res.status(404).json({ error: 'Task not found' });
        writeData('tasks', tasks);
        broadcast('tasks_update', tasks);
        res.json({ message: 'Task deleted' });
    });

    router.get('/status', authenticate, (req, res) => res.json(readData('status')));
    router.put('/status', authenticate, requireAdmin, (req, res) => {
        const existing = readData('status') || {};
        const status = asString(req.body?.status, 32);
        const name = asString(req.body?.name, 120);
        const message = asString(req.body?.message, 1000);
        const newStatus = {
            ...existing,
            ...(status ? { status } : {}),
            ...(name ? { name } : {}),
            ...(message ? { message } : {}),
        };
        writeData('status', newStatus);
        broadcast('status_update', newStatus);
        res.json(newStatus);
    });

    router.get('/metrics', authenticate, (req, res) => res.json(readData('metrics')));
    router.put('/metrics', authenticate, requireAdmin, (req, res) => {
        const existing = readData('metrics') || {};
        const avgTaskTime = asString(req.body?.avgTaskTime, 32);
        const successRate = asString(req.body?.successRate, 32);
        const activeAgents = asNumber(req.body?.activeAgents);
        const newMetrics = {
            ...existing,
            ...(avgTaskTime ? { avgTaskTime } : {}),
            ...(successRate ? { successRate } : {}),
            ...(activeAgents !== undefined ? { activeAgents } : {}),
        };
        writeData('metrics', newMetrics);
        broadcast('metrics_update', newMetrics);
        res.json(newMetrics);
    });

    router.get('/cron/history', authenticate, (req, res) => {
        let history = readData('cronHistory') || [];
        const jobId = asString(req.query.jobId, 128);
        if (jobId) history = history.filter((h) => h.jobId === jobId);
        res.json(paginate(history, req.query));
    });

    router.post('/cron/:id/run', authenticate, requireAdmin, async (req, res) => {
        const id = asString(req.params.id, 128);
        const jobs = readData('cron');
        if (!jobs.find((j) => j.id === id)) return res.status(404).json({ error: 'Job not found' });
        try {
            const result = await runJobNow(id);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/cron', authenticate, (req, res) => res.json(paginate(readData('cron'), req.query)));
    router.post('/cron', authenticate, requireAdmin, (req, res) => {
        const { error, payload } = sanitizeCronPayload(req.body || {});
        if (error) return res.status(400).json({ error });
        let cron = readData('cron');
        if (!Array.isArray(cron)) cron = [];
        const newJob = {
            id: uuidv4(),
            lastRunStatus: 'pending',
            lastRunAt: null,
            lastRunOutput: null,
            enabled: true,
            ...payload,
        };
        cron.push(newJob);
        writeData('cron', cron);
        syncCronJobs(cron);
        broadcast('cron_update', cron);
        res.status(201).json(newJob);
    });

    router.put('/cron', authenticate, requireAdmin, (req, res) => {
        const id = asString(req.body?.id, 128);
        if (!id) return res.status(400).json({ error: 'Job id is required' });
        const cron = readData('cron');
        const index = cron.findIndex((j) => j.id === id);
        if (index === -1) return res.status(404).json({ error: 'Job not found' });

        const body = req.body || {};
        const updates = {};
        if (body.name !== undefined) updates.name = asString(body.name, 120);
        if (body.command !== undefined) updates.command = asString(body.command, 500);
        if (body.schedule !== undefined) updates.schedule = asString(body.schedule, 120);
        if (body.expression !== undefined) updates.expression = asString(body.expression, 120);
        if (body.enabled !== undefined) {
            const enabled = asBool(body.enabled);
            if (enabled === undefined) return res.status(400).json({ error: 'Invalid enabled value' });
            updates.enabled = enabled;
        }

        cron[index] = { ...cron[index], ...updates, id };
        writeData('cron', cron);
        syncCronJobs(cron);
        broadcast('cron_update', cron);
        res.json(cron[index]);
    });

    router.delete('/cron', authenticate, requireAdmin, (req, res) => {
        const id = requireId(req, res);
        if (!id) return;
        let cron = readData('cron');
        const initialLength = cron.length;
        cron = cron.filter((j) => j.id !== id);
        if (cron.length === initialLength) return res.status(404).json({ error: 'Job not found' });
        writeData('cron', cron);
        syncCronJobs(cron);
        broadcast('cron_update', cron);
        res.json({ message: 'Job deleted' });
    });

    router.get('/subAgents', authenticate, (req, res) => res.json(paginate(readData('subagents'), req.query)));
    router.post('/subAgents', authenticate, requireAdmin, (req, res) => {
        const { error, payload } = sanitizeSubAgentPayload(req.body || {}, false);
        if (error) return res.status(400).json({ error });
        const subAgents = readData('subagents');
        const newAgent = { id: uuidv4(), ...payload };
        subAgents.push(newAgent);
        writeData('subagents', subAgents);
        broadcast('subagents_update', subAgents);
        res.status(201).json(newAgent);
    });

    router.put('/subAgents', authenticate, requireAdmin, (req, res) => {
        const id = asString(req.body?.id, 128);
        if (!id) return res.status(400).json({ error: 'Sub-agent id is required' });
        const { error, payload } = sanitizeSubAgentPayload(req.body || {}, true);
        if (error) return res.status(400).json({ error });
        const subAgents = readData('subagents');
        const index = subAgents.findIndex((a) => a.id === id);
        if (index === -1) return res.status(404).json({ error: 'Sub-agent not found' });
        subAgents[index] = { ...subAgents[index], ...payload, id };
        writeData('subagents', subAgents);
        broadcast('subagents_update', subAgents);
        res.json(subAgents[index]);
    });

    router.delete('/subAgents', authenticate, requireAdmin, (req, res) => {
        const id = requireId(req, res);
        if (!id) return;
        let subAgents = readData('subagents');
        const initialLength = subAgents.length;
        subAgents = subAgents.filter((a) => a.id !== id);
        if (subAgents.length === initialLength) return res.status(404).json({ error: 'Sub-agent not found' });
        writeData('subagents', subAgents);
        broadcast('subagents_update', subAgents);
        res.json({ message: 'Sub-agent deleted' });
    });

    router.get('/skills', authenticate, (req, res) => res.json(paginate(readSkills(), req.query)));
    router.post('/skills', authenticate, requireAdmin, (req, res) => {
        const newSkill = writeSkill(req.body || {});
        if (!newSkill) return res.status(400).json({ error: 'Failed to create skill (invalid payload)' });
        broadcast('skills_update', readSkills());
        res.status(201).json(newSkill);
    });

    router.put('/skills', authenticate, requireAdmin, (req, res) => {
        const updatedSkill = writeSkill(req.body || {});
        if (!updatedSkill) return res.status(400).json({ error: 'Failed to update skill (invalid payload)' });
        broadcast('skills_update', readSkills());
        res.json(updatedSkill);
    });

    router.delete('/skills', authenticate, requireAdmin, (req, res) => {
        const id = requireId(req, res);
        if (!id) return;
        if (!deleteSkill(id)) return res.status(404).json({ error: 'Skill not found' });
        broadcast('skills_update', readSkills());
        res.json({ message: 'Skill deleted' });
    });

    router.get('/reminders', authenticate, (req, res) => res.json(paginate(readData('reminders'), req.query)));
    router.post('/reminders', authenticate, requireAdmin, (req, res) => {
        const title = asString(req.body?.title, 200);
        const dueAt = asString(req.body?.dueAt, 64);
        const note = asString(req.body?.note, 2000);
        if (!title) return res.status(400).json({ error: 'Reminder title is required' });
        let reminders = readData('reminders');
        if (!Array.isArray(reminders)) reminders = [];
        const newReminder = { id: uuidv4(), createdAt: new Date().toISOString(), title, ...(dueAt ? { dueAt } : {}), ...(note ? { note } : {}) };
        reminders.push(newReminder);
        writeData('reminders', reminders);
        broadcast('reminders_update', reminders);
        res.status(201).json(newReminder);
    });

    router.delete('/reminders', authenticate, requireAdmin, (req, res) => {
        const id = requireId(req, res);
        if (!id) return;
        let reminders = readData('reminders');
        const initialLength = reminders.length;
        reminders = reminders.filter((r) => r.id !== id);
        if (reminders.length === initialLength) return res.status(404).json({ error: 'Reminder not found' });
        writeData('reminders', reminders);
        broadcast('reminders_update', reminders);
        res.json({ message: 'Reminder deleted' });
    });

    router.get('/usage', authenticate, (req, res) => res.json(readData('usage')));
    return router;
};

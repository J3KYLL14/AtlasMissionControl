
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, readSkills, writeSkill, deleteSkill } from './store.js';
import { authenticate } from './auth.js';

const router = express.Router();

export const createRoutes = (broadcast) => {

    // --- Tasks API ---
    router.get('/tasks', authenticate, (req, res) => {
        const tasks = readData('tasks');
        res.json(tasks);
    });

    router.post('/tasks', authenticate, (req, res) => {
        const newTask = { id: uuidv4(), date: new Date().toISOString(), ...req.body };
        const tasks = readData('tasks');
        tasks.unshift(newTask);
        writeData('tasks', tasks);
        broadcast('tasks_update', tasks);
        res.status(201).json(newTask);
    });

    router.put('/tasks', authenticate, (req, res) => {
        const updatedTask = req.body;
        const tasks = readData('tasks');
        const index = tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updatedTask };
            writeData('tasks', tasks);
            broadcast('tasks_update', tasks);
            res.json(tasks[index]);
        } else {
            res.status(404).json({ error: 'Task not found' });
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

    // --- Agent Status API ---
    router.get('/status', authenticate, (req, res) => {
        const status = readData('status');
        res.json(status);
    });

    router.put('/status', authenticate, (req, res) => {
        const newStatus = { ...readData('status'), ...req.body };
        writeData('status', newStatus);
        broadcast('status_update', newStatus);
        res.json(newStatus);
    });

    // --- Core Metrics API ---
    router.get('/metrics', authenticate, (req, res) => {
        const metrics = readData('metrics');
        res.json(metrics);
    });

    router.put('/metrics', authenticate, (req, res) => {
        const newMetrics = { ...readData('metrics'), ...req.body };
        writeData('metrics', newMetrics);
        broadcast('metrics_update', newMetrics);
        res.json(newMetrics);
    });

    // --- Cron Jobs API ---
    router.get('/cron', authenticate, (req, res) => {
        const cron = readData('cron');
        res.json(cron);
    });

    router.post('/cron', authenticate, (req, res) => {
        const newJob = {
            id: uuidv4(),
            lastRunStatus: 'pending',
            ...req.body
        };
        const cron = readData('cron');
        cron.push(newJob);
        writeData('cron', cron);
        broadcast('cron_update', cron);
        res.status(201).json(newJob);
    });

    router.put('/cron', authenticate, (req, res) => {
        const updatedJob = req.body;
        const cron = readData('cron');
        const index = cron.findIndex(j => j.id === updatedJob.id);
        if (index !== -1) {
            cron[index] = { ...cron[index], ...updatedJob };
            writeData('cron', cron);
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
            broadcast('cron_update', cron);
            res.json({ message: 'Job deleted' });
        } else {
            res.status(404).json({ error: 'Job not found' });
        }
    });

    // --- Sub-Agents API ---
    router.get('/subAgents', authenticate, (req, res) => {
        const subAgents = readData('subagents');
        res.json(subAgents);
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

    // --- Skills API ---
    router.get('/skills', authenticate, (req, res) => {
        const skills = readSkills();
        res.json(skills);
    });

    router.post('/skills', authenticate, (req, res) => {
        const newSkill = writeSkill(req.body);
        if (newSkill) {
            const skills = readSkills();
            broadcast('skills_update', skills);
            res.status(201).json(newSkill);
        } else {
            res.status(500).json({ error: 'Failed to create skill' });
        }
    });

    router.put('/skills', authenticate, (req, res) => {
        const updatedSkill = writeSkill(req.body);
        if (updatedSkill) {
            const skills = readSkills();
            broadcast('skills_update', skills);
            res.json(updatedSkill);
        } else {
            res.status(500).json({ error: 'Failed to update skill' });
        }
    });

    router.delete('/skills', authenticate, (req, res) => {
        const { id } = req.query;
        if (deleteSkill(id)) {
            const skills = readSkills();
            broadcast('skills_update', skills);
            res.json({ message: 'Skill deleted' });
        } else {
            res.status(404).json({ error: 'Skill not found' });
        }
    });
    // --- Reminders API ---
    router.get('/reminders', authenticate, (req, res) => {
        const reminders = readData('reminders');
        res.json(reminders);
    });

    router.post('/reminders', authenticate, (req, res) => {
        const newReminder = {
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            ...req.body
        };
        const reminders = readData('reminders');
        reminders.push(newReminder);
        writeData('reminders', reminders);
        broadcast('reminders_update', reminders);
        res.status(201).json(newReminder);
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

    return router;
};

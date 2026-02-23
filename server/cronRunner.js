import cron from 'node-cron';
import { execFile } from 'child_process';
import { readData, writeData } from './store.js';

const scheduledTasks = new Map();
let _broadcast = null;

const DEFAULT_ALLOWED_BINARIES = ['echo', 'date', 'uptime'];
const allowedBinaries = new Set(
    (process.env.CRON_ALLOWED_BINARIES || DEFAULT_ALLOWED_BINARIES.join(','))
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
);

const UNSAFE_SHELL_PATTERN = /[|&;><`$(){}[\]\\\n\r]/;

export const parseCronCommand = (command) => {
    if (typeof command !== 'string') return null;
    const trimmed = command.trim();
    if (!trimmed || UNSAFE_SHELL_PATTERN.test(trimmed)) return null;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    const [bin, ...args] = parts;
    if (!allowedBinaries.has(bin)) return null;
    return { bin, args };
};

const runCommand = (command, callback) => {
    const parsed = parseCronCommand(command);
    if (!parsed) {
        callback(new Error('Command rejected by policy'), '', '');
        return;
    }

    execFile(parsed.bin, parsed.args, { timeout: 60_000 }, callback);
};

export const startCronRunner = (broadcast) => {
    _broadcast = broadcast;
    const jobs = readData('cron');
    _loadJobs(jobs);
    console.log(`Cron runner started. Scheduled ${scheduledTasks.size} active job(s).`);
};

export const syncCronJobs = (jobs) => {
    scheduledTasks.forEach((task) => task.stop());
    scheduledTasks.clear();
    _loadJobs(jobs);
};

export const runJobNow = (jobId) => _executeJob(jobId);

const _loadJobs = (jobs) => {
    for (const job of jobs) {
        if (!job.enabled) continue;
        const expression = job.expression || job.schedule;
        if (!cron.validate(expression)) {
            console.warn(`Cron job "${job.name}" has invalid expression: ${expression}`);
            continue;
        }
        const task = cron.schedule(expression, () => _executeJob(job.id), { scheduled: true });
        scheduledTasks.set(job.id, task);
    }
};

const _executeJob = (jobId) =>
    new Promise((resolve) => {
        const jobs = readData('cron');
        const idx = jobs.findIndex((j) => j.id === jobId);
        if (idx === -1) return resolve({ error: 'Job not found' });

        const job = jobs[idx];
        jobs[idx] = { ...job, lastRunStatus: 'running', lastRunAt: new Date().toISOString() };
        writeData('cron', jobs);
        if (_broadcast) _broadcast('cron_update', jobs);

        runCommand(job.command, (error, stdout, stderr) => {
            const combined = `${stdout || ''}${stderr || ''}`.trim();
            const freshJobs = readData('cron');
            const i = freshJobs.findIndex((j) => j.id === jobId);
            if (i === -1) return resolve({ error: 'Job disappeared during run' });

            const status = error ? 'failure' : 'success';
            freshJobs[i] = {
                ...freshJobs[i],
                lastRunStatus: status,
                lastRunAt: new Date().toISOString(),
                lastRunOutput: combined.slice(-1000),
            };
            writeData('cron', freshJobs);
            if (_broadcast) _broadcast('cron_update', freshJobs);

            const history = readData('cronHistory') || [];
            history.unshift({
                jobId,
                jobName: freshJobs[i].name,
                runAt: freshJobs[i].lastRunAt,
                status,
                output: combined.slice(-4000),
                exitCode: error ? (error.code ?? 1) : 0,
            });
            writeData('cronHistory', history.slice(0, 200));
            resolve({ status, output: combined });
        });
    });

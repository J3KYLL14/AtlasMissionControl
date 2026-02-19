
import cron from 'node-cron';
import { exec } from 'child_process';
import { readData, writeData } from './store.js';

// Active scheduled tasks: jobId -> node-cron ScheduledTask
const scheduledTasks = new Map();

let _broadcast = null;

/**
 * Start the cron runner. Call once on server startup.
 */
export const startCronRunner = (broadcast) => {
    _broadcast = broadcast;
    const jobs = readData('cron');
    _loadJobs(jobs);
    console.log(`Cron runner started. Scheduled ${scheduledTasks.size} active job(s).`);
};

/**
 * Reload all scheduled tasks from a fresh jobs array.
 * Call this whenever cron jobs are created, updated, or deleted.
 */
export const syncCronJobs = (jobs) => {
    scheduledTasks.forEach(task => task.stop());
    scheduledTasks.clear();
    _loadJobs(jobs);
};

/**
 * Immediately execute a cron job by ID (manual trigger).
 * Returns a promise that resolves when the job finishes.
 */
export const runJobNow = (jobId) => {
    return _executeJob(jobId);
};

// ─── Internal ────────────────────────────────────────────────────────────────

const _loadJobs = (jobs) => {
    for (const job of jobs) {
        if (!job.enabled) continue;
        const expression = job.expression || job.schedule;
        if (!cron.validate(expression)) {
            console.warn(`Cron job "${job.name}" has invalid expression: ${expression}`);
            continue;
        }
        const task = cron.schedule(expression, () => _executeJob(job.id), {
            scheduled: true,
        });
        scheduledTasks.set(job.id, task);
    }
};

const _executeJob = (jobId) => {
    return new Promise((resolve) => {
        const jobs = readData('cron');
        const idx = jobs.findIndex(j => j.id === jobId);
        if (idx === -1) return resolve({ error: 'Job not found' });

        const job = jobs[idx];

        // Mark as running
        jobs[idx] = { ...job, lastRunStatus: 'running', lastRunAt: new Date().toISOString() };
        writeData('cron', jobs);
        if (_broadcast) _broadcast('cron_update', jobs);

        exec(job.command, { timeout: 60_000, shell: '/bin/sh' }, (error, stdout, stderr) => {
            const combined = (stdout + stderr).trim();
            const freshJobs = readData('cron');
            const i = freshJobs.findIndex(j => j.id === jobId);
            if (i === -1) return resolve({ error: 'Job disappeared during run' });

            const status = error ? 'failure' : 'success';
            freshJobs[i] = {
                ...freshJobs[i],
                lastRunStatus: status,
                lastRunAt: new Date().toISOString(),
                lastRunOutput: combined.slice(-1000), // keep last 1000 chars
            };
            writeData('cron', freshJobs);
            if (_broadcast) _broadcast('cron_update', freshJobs);

            // Append to run history (capped at 200 entries)
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
};

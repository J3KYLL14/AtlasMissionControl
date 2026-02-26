import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import path from 'path';
import { readData, writeData, readSkills, writeSkill, deleteSkill, setSkillEnabled } from './store.js';
import { authenticate, authorize } from './auth.js';
import { syncCronJobs, runJobNow } from './cronRunner.js';
import { triggerTaskStart, triggerOrchestratorRun } from './openclawGateway.js';

const router = express.Router();
const requireAdmin = authorize('admin');
const requireAdminOrAgent = authorize('admin', 'agent');
const OPENCLAW_TASKS_DIR = process.env.OPENCLAW_TASKS_DIR || '/data/.openclaw/workspace/tasks';
const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG || '/data/.openclaw/openclaw.json';
const OPENCLAW_VAULT_PATH = process.env.OPENCLAW_VAULT_PATH || '/data/.openclaw/vault';
const VAULT_INDEX_PATH = path.join(OPENCLAW_VAULT_PATH, '99 System', 'Meta', 'VAULT_INDEX.md');
const VAULT_INDEX_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour cache

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
const asStringArray = (v, maxItems = 200, maxItemLen = 500) => {
    if (!Array.isArray(v)) return [];
    return v
        .map((item) => asString(item, maxItemLen))
        .filter(Boolean)
        .slice(0, maxItems);
};
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

const mapOpenClawStatus = (status) => {
    const normalized = (status || '').toString().trim().toLowerCase();
    if (!normalized) return 'todo';

    if (['todo', 'pending', 'queued', 'open'].includes(normalized)) return 'todo';
    if (['paused', 'on_hold', 'onhold', 'hold'].includes(normalized)) return 'paused';
    if (['in_progress', 'inprogress', 'active', 'running'].includes(normalized)) return 'inprogress';
    if (['done', 'completed', 'complete', 'success'].includes(normalized)) return 'done';
    if (['archived', 'cancelled', 'canceled'].includes(normalized)) return 'archived';

    // Keep unknown OpenClaw statuses visible on the board instead of hiding them.
    return 'todo';
};

const normalizeAgentId = (name) => (name || '').toLowerCase().replace(/\s+/g, '');
const asEpoch = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
const OPENCLAW_ACTIVE_WINDOW_MS = 15 * 60 * 1000;

const resolveAgentWorkspace = (agentName) => {
    if (!existsSync(OPENCLAW_CONFIG_PATH)) return null;
    try {
        const cfg = JSON.parse(readFileSync(OPENCLAW_CONFIG_PATH, 'utf8'));
        const defaultsWorkspace = cfg?.agents?.defaults?.workspace || '/data/.openclaw/workspace';
        const normalized = normalizeAgentId(agentName);
        const isAtlas = normalized === 'atlas' || normalized === 'main';
        if (isAtlas) return defaultsWorkspace;

        const list = Array.isArray(cfg?.agents?.list) ? cfg.agents.list : [];
        const byName = list.find((a) => normalizeAgentId(a?.name || '') === normalized);
        if (byName?.workspace) return byName.workspace;

        const byId = list.find((a) => normalizeAgentId(a?.id || '') === normalized);
        if (byId?.workspace) return byId.workspace;

        return null;
    } catch {
        return null;
    }
};

const mapTaskStatusToOpenClaw = (status) => {
    if (status === 'todo') return 'pending';
    if (status === 'paused') return 'pending';
    if (status === 'inprogress') return 'in_progress';
    if (status === 'done') return 'completed';
    if (status === 'archived') return 'cancelled';
    return status;
};

const mapOpenClawTaskToMissionControl = (raw) => {
    const implementationPlan = Array.isArray(raw.implementation_plan)
        ? raw.implementation_plan.join('\n')
        : (raw.implementation_plan || '');
    return {
        id: raw.id,
        title: raw.title,
        description: raw.description || '',
        status: mapOpenClawStatus(raw.status || ''),
        importance: raw.importance,
        urgency: raw.urgency,
        dueDate: raw.due_date || '',
        implementationPlan,
        // Default unassigned OpenClaw tasks to Atlas so orchestration heartbeat can claim them.
        assignee: asString(raw.assignee, 120) || 'Atlas',
        markdownFiles: asStringArray(raw.markdown_files || raw.markdownFiles, 200, 500),
        estimatedHours: raw.estimated_hours,
        tags: raw.tags || [],
        source: 'openclaw',
        date: raw.created_at || raw.createdAt || '',
        readOnly: false,
    };
};

const findOpenClawTaskFileById = (taskId) => {
    if (!existsSync(OPENCLAW_TASKS_DIR)) return null;
    const entries = readdirSync(OPENCLAW_TASKS_DIR).filter((f) => f.endsWith('.json'));
    for (const entry of entries) {
        const filePath = `${OPENCLAW_TASKS_DIR}/${entry}`;
        try {
            const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
            if (raw?.id === taskId) return { filePath, raw };
        } catch {
            // continue
        }
    }
    return null;
};

const updateOpenClawTaskById = (taskId, payload) => {
    const match = findOpenClawTaskFileById(taskId);
    if (!match) return null;
    const { filePath } = match;
    const raw = { ...match.raw };

    if (payload.title !== undefined) raw.title = payload.title;
    if (payload.description !== undefined) raw.description = payload.description;
    if (payload.status !== undefined) raw.status = mapTaskStatusToOpenClaw(payload.status);
    if (payload.importance !== undefined) raw.importance = payload.importance;
    if (payload.urgency !== undefined) raw.urgency = payload.urgency;
    if (payload.assignee !== undefined) raw.assignee = payload.assignee;
    if (payload.markdownFiles !== undefined) raw.markdown_files = payload.markdownFiles;
    if (payload.estimatedHours !== undefined) raw.estimated_hours = payload.estimatedHours;
    if (payload.dueDate !== undefined) raw.due_date = payload.dueDate || null;
    if (payload.implementationPlan !== undefined) {
        raw.implementation_plan = payload.implementationPlan
            ? payload.implementationPlan.split('\n').map((s) => s.trim()).filter(Boolean)
            : [];
    }

    raw.updated_at = new Date().toISOString();
    try {
        const content = JSON.stringify(raw, null, 2);
        // atomic-ish write
        const tmp = `${filePath}.tmp`;
        writeFileSync(tmp, content, 'utf-8');
        renameSync(tmp, filePath);
    } catch {
        return null;
    }
    return mapOpenClawTaskToMissionControl(raw);
};

const getOpenClawRuntimeStatusMap = () => {
    const result = new Map();
    if (!existsSync(OPENCLAW_CONFIG_PATH)) return result;
    let cfg = null;
    try {
        cfg = JSON.parse(readFileSync(OPENCLAW_CONFIG_PATH, 'utf8'));
    } catch {
        return result;
    }
    const list = Array.isArray(cfg?.agents?.list) ? cfg.agents.list : [];
    const now = Date.now();
    for (const agent of list) {
        const id = agent?.id;
        const name = agent?.name || id;
        if (!id || !name) continue;
        const sessionFile = `/data/.openclaw/agents/${id}/sessions/sessions.json`;
        if (!existsSync(sessionFile)) {
            result.set(normalizeAgentId(name), { status: 'idle', updatedAt: 0 });
            continue;
        }
        try {
            const sessions = JSON.parse(readFileSync(sessionFile, 'utf8'));
            const entries = Object.values(sessions || {});
            const maxUpdatedAt = entries.reduce((acc, s) => Math.max(acc, asEpoch(s?.updatedAt)), 0);
            const hasRecentAbort = entries.some((s) => s?.abortedLastRun && (now - asEpoch(s?.updatedAt) <= OPENCLAW_ACTIVE_WINDOW_MS));
            const runtimeStatus = hasRecentAbort
                ? 'error'
                : (maxUpdatedAt > 0 && (now - maxUpdatedAt <= OPENCLAW_ACTIVE_WINDOW_MS) ? 'active' : 'idle');
            result.set(normalizeAgentId(name), { status: runtimeStatus, updatedAt: maxUpdatedAt });
            if (id === 'main') result.set('atlas', { status: runtimeStatus, updatedAt: maxUpdatedAt });
        } catch {
            result.set(normalizeAgentId(name), { status: 'idle', updatedAt: 0 });
        }
    }
    return result;
};

const enrichSubAgentsWithRuntime = (subAgents, tasks = []) => {
    const runtime = getOpenClawRuntimeStatusMap();
    const assignedInProgress = getAssignedInProgressByAgent(tasks);
    return (subAgents || []).map((agent) => {
        const key = normalizeAgentId(agent?.name || '');
        const assignedTask = assignedInProgress.get(key);
        if (assignedTask) {
            return { ...agent, status: 'active', task: assignedTask };
        }
        const rt = runtime.get(key);
        if (!rt) return agent;
        return { ...agent, status: rt.status };
    });
};

const listMarkdownFiles = (workspacePath, limit = 200) => {
    const maxEntries = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    const skipDirs = new Set(['.git', 'node_modules', '.obsidian']);
    const stack = [workspacePath];
    const found = [];
    let scanned = 0;

    while (stack.length > 0 && scanned < 20000) {
        const current = stack.pop();
        if (!current) continue;
        let entries = [];
        try {
            entries = readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            scanned += 1;
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (skipDirs.has(entry.name)) continue;
                stack.push(full);
                continue;
            }
            if (entry.isSymbolicLink()) continue;
            if (!entry.isFile()) continue;
            if (!entry.name.toLowerCase().endsWith('.md')) continue;
            try {
                const st = statSync(full);
                found.push({
                    path: path.relative(workspacePath, full),
                    absolutePath: full,
                    modifiedAt: st.mtime.toISOString(),
                    sizeBytes: st.size,
                });
            } catch {
                // skip unreadable files
            }
        }
    }

    found.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    return {
        totalFound: found.length,
        files: found.slice(0, maxEntries),
    };
};

const VAULT_FOLDER_DESCRIPTIONS = {
    '00': 'Home — dashboards, MOCs, reviews',
    '01': 'Intake — quick notes, meeting notes, agent memory',
    '10': 'Learn — sources, highlights, annotations',
    '20': 'Think — concepts, frameworks, evergreen notes',
    '30': 'Do — projects, agent outputs, builds, teaching, writing',
    '40': 'People — collaborators, students, organisations',
    '50': 'Reference — templates, rubrics, policies, snippets',
    '90': 'Archive — retired notes, old projects',
    '99': 'System — meta, attachments, canvas',
};

const buildVaultFileId = (relPath) => {
    const parts = relPath.replace(/\.md$/i, '').split('/');
    const segments = [];
    for (const part of parts) {
        const numMatch = part.match(/^(\d{2})\s+/);
        if (numMatch) {
            segments.push(numMatch[1]);
        } else {
            const slug = part.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
            if (slug) segments.push(slug);
        }
    }
    return segments.filter((s, i) => i === 0 || s !== segments[i - 1]).join('-');
};

const buildVaultIndex = (vaultPath) => {
    const skipDirs = new Set(['.git', 'node_modules', '.obsidian', '.stfolder']);
    const files = [];
    const stack = [vaultPath];
    let scanned = 0;
    while (stack.length > 0 && scanned < 20000 && files.length < 2000) {
        const current = stack.pop();
        let entries = [];
        try { entries = readdirSync(current, { withFileTypes: true }); } catch { continue; }
        for (const entry of entries) {
            scanned++;
            if (skipDirs.has(entry.name)) continue;
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) { stack.push(full); continue; }
            if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
            try {
                const st = statSync(full);
                const rel = path.relative(vaultPath, full);
                files.push({
                    rel,
                    id: buildVaultFileId(rel),
                    name: path.basename(entry.name, '.md'),
                    sizeKb: Math.round(st.size / 102.4) / 10,
                    mtime: st.mtime.toISOString().slice(0, 10),
                });
            } catch { /* skip */ }
        }
    }

    // Group by top-level folder
    const groups = new Map();
    for (const f of files) {
        const top = f.rel.split('/')[0];
        if (!groups.has(top)) groups.set(top, []);
        groups.get(top).push(f);
    }

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const lines = [
        '# Vault Index',
        '',
        `> Generated: ${now} UTC — ${files.length} files`,
        '> **Agents**: read this index first, then fetch only the specific files you need.',
        '> File IDs: `{folder#}-{SubfolderName}-{FileName}`',
        '',
        '## Folder Map',
        '',
        '| # | Folder | Purpose |',
        '|---|--------|---------|',
    ];
    for (const [num, desc] of Object.entries(VAULT_FOLDER_DESCRIPTIONS)) {
        const [folder, purpose] = desc.split(' — ');
        lines.push(`| \`${num}\` | ${folder} | ${purpose} |`);
    }
    lines.push('');

    for (const [folder, folderFiles] of [...groups.entries()].sort()) {
        const num = (folder.match(/^(\d{2})/) || [])[1] || '??';
        const desc = VAULT_FOLDER_DESCRIPTIONS[num] || folder;
        lines.push(`## ${folder}`);
        lines.push(`_${desc}_`);
        lines.push('');

        // Sub-group by immediate subfolder
        const subgroups = new Map();
        for (const f of folderFiles) {
            const parts = f.rel.split('/');
            const sub = parts.length > 2 ? parts[1] : '(root)';
            if (!subgroups.has(sub)) subgroups.set(sub, []);
            subgroups.get(sub).push(f);
        }
        for (const [sub, subFiles] of [...subgroups.entries()].sort()) {
            if (sub !== '(root)') lines.push(`### ${sub}`);
            lines.push('');
            lines.push('| ID | Name | Modified |');
            lines.push('|----|------|----------|');
            for (const f of subFiles) {
                lines.push(`| \`${f.id}\` | ${f.name} | ${f.mtime} |`);
            }
            lines.push('');
        }
    }
    lines.push('---');
    lines.push(`_${files.length} files — regenerate: \`GET /api/vault/index?regenerate=1\`_`);
    return lines.join('\n');
};

const readOpenClawTasks = () => {
    if (!existsSync(OPENCLAW_TASKS_DIR)) return [];
    try {
        const entries = readdirSync(OPENCLAW_TASKS_DIR).filter((f) => f.endsWith('.json'));
        const tasks = [];
        for (const entry of entries) {
            const filePath = `${OPENCLAW_TASKS_DIR}/${entry}`;
            try {
                const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
                if (!raw?.id || !raw?.title) continue;
                tasks.push(mapOpenClawTaskToMissionControl(raw));
            } catch {
                // ignore individual task parse errors
            }
        }
        return tasks;
    } catch {
        return [];
    }
};

const getMergedTasks = () => {
    let localTasks = readData('tasks');
    if (!Array.isArray(localTasks)) localTasks = [];

    const openclawTasks = readOpenClawTasks();
    const localById = new Map(localTasks.map((t) => [t.id, t]));
    const mergedOpenclaw = openclawTasks.map((task) => {
        const override = localById.get(task.id);
        if (!override) return task;
        return { ...task, ...override, id: task.id, readOnly: false };
    });
    const openclawIds = new Set(openclawTasks.map((t) => t.id));
    const localOnly = localTasks.filter((t) => !openclawIds.has(t.id));
    return [...mergedOpenclaw, ...localOnly];
};

const getAssignedInProgressByAgent = (tasks) => {
    const assigned = new Map();
    for (const task of tasks || []) {
        if (task?.status !== 'inprogress') continue;
        const assignee = asString(task?.assignee, 120);
        if (!assignee) continue;
        const key = normalizeAgentId(assignee);
        if (!assigned.has(key)) assigned.set(key, task.title || 'Working on task');
    }
    return assigned;
};

const sanitizeTaskPayload = (body, isUpdate = false) => {
    const title = asString(body.title, 140);
    const status = asString(body.status, 32);
    const description = asString(body.description, 5000);
    const implementationPlan = asString(body.implementationPlan, 5000);
    const assigneeProvided = Object.prototype.hasOwnProperty.call(body ?? {}, 'assignee');
    const assignee = asString(body.assignee, 120);
    const markdownFilesProvided = Object.prototype.hasOwnProperty.call(body ?? {}, 'markdownFiles');
    const markdownFiles = asStringArray(body.markdownFiles, 200, 500);
    const priority = asString(body.priority, 32);
    const importance = asNumber(body.importance);
    const urgency = asNumber(body.urgency);
    const estimatedHours = asNumber(body.estimatedHours);
    const dueDate = asString(body.dueDate, 64);

    if (!isUpdate && !title) return { error: 'Task title is required' };
    if (status && !['todo', 'paused', 'inprogress', 'done', 'archived'].includes(status)) return { error: 'Invalid task status' };

    const payload = {
        ...(title ? { title } : {}),
        ...(status ? { status } : {}),
        ...(description ? { description } : {}),
        ...(implementationPlan ? { implementationPlan } : {}),
        ...(assigneeProvided ? { assignee } : {}),
        ...(markdownFilesProvided ? { markdownFiles } : {}),
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

const shouldAutoStartTask = (beforeTask, afterTask) => {
    if (!afterTask) return false;
    const nextStatus = asString(afterTask.status, 32).toLowerCase();
    const nextAssignee = asString(afterTask.assignee, 120);
    if (nextStatus !== 'inprogress' || !nextAssignee) return false;

    const prevStatus = asString(beforeTask?.status, 32).toLowerCase();
    const prevAssignee = asString(beforeTask?.assignee, 120);
    return prevStatus !== 'inprogress' || prevAssignee !== nextAssignee;
};

const startTaskExecutionIfNeeded = (beforeTask, afterTask) => {
    if (!shouldAutoStartTask(beforeTask, afterTask)) return;

    // Fire-and-forget: task update should not block on OpenClaw gateway round-trips.
    triggerTaskStart(afterTask).catch(async (err) => {
        // Fallback to Atlas orchestrator if direct assignee trigger fails.
        try {
            await triggerOrchestratorRun('atlas-task-orchestrator-5min');
        } catch (fallbackErr) {
            console.error('Task start trigger failed', {
                taskId: afterTask?.id,
                assignee: afterTask?.assignee,
                error: String(err),
                fallbackError: String(fallbackErr),
            });
        }
    });
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
        let merged = getMergedTasks();
        if (req.query.status) merged = merged.filter((t) => t.status === req.query.status);
        if (req.query.priority) merged = merged.filter((t) => t.priority === req.query.priority);
        if (req.query.assignee) merged = merged.filter((t) => t.assignee === req.query.assignee);
        res.json(paginate(merged, req.query));
    });

    router.post('/tasks', authenticate, requireAdminOrAgent, (req, res) => {
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

    router.put('/tasks', authenticate, requireAdminOrAgent, (req, res) => {
        const id = asString(req.body?.id, 128);
        if (!id) return res.status(400).json({ error: 'Task id is required' });
        const { error, payload } = sanitizeTaskPayload(req.body, true);
        if (error) return res.status(400).json({ error });
        let tasks = readData('tasks');
        if (!Array.isArray(tasks)) tasks = [];
        const index = tasks.findIndex((t) => t.id === id);
        if (index !== -1) {
            const before = tasks[index];
            tasks[index] = { ...tasks[index], ...payload, id };
            writeData('tasks', tasks);
            const merged = getMergedTasks();
            broadcast('tasks_update', merged);
            startTaskExecutionIfNeeded(before, tasks[index]);
            return res.json(tasks[index]);
        }

        // fallback: create local override for OpenClaw task IDs (MC mount is read-only for OpenClaw data)
        const openclawTask = readOpenClawTasks().find((t) => t.id === id);
        if (!openclawTask) return res.status(404).json({ error: 'Task not found' });
        const before = openclawTask;
        const override = { ...openclawTask, ...payload, id, readOnly: false, source: 'openclaw-override' };
        tasks.unshift(override);
        writeData('tasks', tasks);
        const merged = getMergedTasks();
        broadcast('tasks_update', merged);
        startTaskExecutionIfNeeded(before, override);
        return res.json(override);
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

    router.get('/status', authenticate, (req, res) => {
        const status = readData('status') || {};
        const mergedTasks = getMergedTasks();
        const subAgents = enrichSubAgentsWithRuntime(readData('subagents') || [], mergedTasks);
        const atlas = subAgents.find((a) => normalizeAgentId(a?.name || '') === 'atlas');
        const mapMainStatus = (s) => {
            if (s === 'active') return 'working';
            if (s === 'error') return 'disconnected';
            return 'idle';
        };
        return res.json({
            ...status,
            name: atlas?.name || status.name || 'Atlas',
            status: mapMainStatus(atlas?.status || 'idle'),
            message: atlas?.task || status.message || 'Ready for assignment',
            image: atlas?.image || status.image || '',
            subAgents: subAgents.filter((a) => normalizeAgentId(a?.name || '') !== 'atlas'),
        });
    });
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

    router.get('/subAgents', authenticate, (req, res) => {
        const subAgents = enrichSubAgentsWithRuntime(readData('subagents') || [], getMergedTasks());
        res.json(paginate(subAgents, req.query));
    });
    router.get('/subAgents/markdown', authenticate, (req, res) => {
        const name = asString(req.query?.name, 120);
        const limit = Math.min(1000, Math.max(1, parseInt(asString(req.query?.limit, 8) || '200', 10) || 200));
        if (!name) return res.status(400).json({ error: 'Agent name is required (query: name)' });

        const workspace = resolveAgentWorkspace(name);
        if (!workspace || !existsSync(workspace)) {
            return res.status(404).json({ error: `Workspace not found for agent: ${name}` });
        }

        const { totalFound, files } = listMarkdownFiles(workspace, limit);
        return res.json({
            agent: name,
            workspace,
            totalFound,
            files,
        });
    });

    // GET /api/vault/index — returns a compact TOC of all vault markdown files.
    // Agents should call this instead of listing all markdown files on startup.
    // ?regenerate=1  force rebuild (otherwise served from cache up to 1h)
    // ?format=text   return raw markdown instead of JSON
    router.get('/vault/index', authenticate, (req, res) => {
        if (!existsSync(OPENCLAW_VAULT_PATH)) {
            return res.status(404).json({ error: 'Vault path not found', path: OPENCLAW_VAULT_PATH });
        }
        const forceRegen = asString(req.query.regenerate, 4) === '1';
        let content = null;
        let generatedAt = null;

        // Try to serve from cache
        if (!forceRegen && existsSync(VAULT_INDEX_PATH)) {
            try {
                const st = statSync(VAULT_INDEX_PATH);
                if (Date.now() - st.mtimeMs < VAULT_INDEX_MAX_AGE_MS) {
                    content = readFileSync(VAULT_INDEX_PATH, 'utf-8');
                    generatedAt = st.mtime.toISOString();
                }
            } catch { /* fall through to regenerate */ }
        }

        // Regenerate if needed
        if (!content) {
            content = buildVaultIndex(OPENCLAW_VAULT_PATH);
            generatedAt = new Date().toISOString();
            try {
                const dir = path.dirname(VAULT_INDEX_PATH);
                if (!existsSync(dir)) {
                    mkdirSync(dir, { recursive: true });
                }
                writeFileSync(VAULT_INDEX_PATH, content, 'utf-8');
            } catch { /* best-effort cache write */ }
        }

        const format = asString(req.query.format, 8);
        if (format === 'text' || format === 'md') {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            return res.send(content);
        }
        return res.json({ generatedAt, path: VAULT_INDEX_PATH, content });
    });

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

    router.put('/skills/enable', authenticate, requireAdmin, (req, res) => {
        const slug = asString(req.body?.slug, 120);
        const enabled = asBool(req.body?.enabled);
        if (!slug || enabled === undefined) return res.status(400).json({ error: 'slug and enabled (boolean) are required' });
        setSkillEnabled(slug, enabled);
        const updated = readSkills();
        broadcast('skills_update', updated);
        res.json({ ok: true });
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

    router.get('/channels', authenticate, (req, res) => {
        const configPath = process.env.OPENCLAW_CONFIG || '/data/.openclaw/openclaw.json';
        const sessionsPath = `${process.env.OPENCLAW_SESSIONS_DIR || '/data/.openclaw/agents/main/sessions'}/sessions.json`;
        const credsDir = process.env.OPENCLAW_CREDENTIALS_DIR || '/data/.openclaw/credentials';

        let cfg = null;
        let sessions = {};
        try { cfg = JSON.parse(readFileSync(configPath, 'utf8')); } catch { /* openclaw not mounted */ }
        try { sessions = JSON.parse(readFileSync(sessionsPath, 'utf8')); } catch { /* no sessions yet */ }

        if (!cfg) return res.json([]);

        const plugins = cfg.plugins?.entries || {};
        const channels = cfg.channels || {};
        const sessionList = Object.values(sessions);
        const result = [];

        // Discord: plugin enabled + token present
        if (plugins.discord?.enabled && channels.discord?.token) {
            const session = sessionList.find((s) => s.channel === 'discord' || s.lastChannel === 'discord');
            result.push({
                id: 'discord',
                name: 'Discord',
                type: 'discord',
                status: 'connected',
                lastActivityAt: session?.updatedAt ? new Date(session.updatedAt).toISOString() : null,
                detail: session?.displayName || null,
            });
        }

        // WhatsApp: plugin enabled + creds file exists (= linked)
        if (plugins.whatsapp?.enabled && channels.whatsapp) {
            const credsPath = `${credsDir}/whatsapp/default/creds.json`;
            if (existsSync(credsPath)) {
                const session = sessionList.find((s) => s.channel === 'whatsapp' || s.lastChannel === 'whatsapp');
                result.push({
                    id: 'whatsapp',
                    name: 'WhatsApp',
                    type: 'whatsapp',
                    status: 'connected',
                    lastActivityAt: session?.updatedAt ? new Date(session.updatedAt).toISOString() : null,
                    detail: channels.whatsapp.allowFrom?.join(', ') || null,
                });
            }
        }

        // Telegram: plugin enabled + botToken present
        if (plugins.telegram?.enabled && channels.telegram?.botToken) {
            const session = sessionList.find((s) => s.channel === 'telegram' || s.lastChannel === 'telegram');
            result.push({
                id: 'telegram',
                name: 'Telegram',
                type: 'telegram',
                status: 'connected',
                lastActivityAt: session?.updatedAt ? new Date(session.updatedAt).toISOString() : null,
                detail: null,
            });
        }

        // Slack: plugin enabled + token present
        if (plugins.slack?.enabled && channels.slack?.token) {
            const session = sessionList.find((s) => s.channel === 'slack' || s.lastChannel === 'slack');
            result.push({
                id: 'slack',
                name: 'Slack',
                type: 'slack',
                status: 'connected',
                lastActivityAt: session?.updatedAt ? new Date(session.updatedAt).toISOString() : null,
                detail: null,
            });
        }

        res.json(result);
    });

    return router;
};

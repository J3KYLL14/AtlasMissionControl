import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const SKILLS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, 'clawd', 'skills');
const WORKSPACE_SKILLS_DIR = '/data/.openclaw/workspace/skills';
const SKILLS_CATALOG_PATH = '/data/.openclaw/skills-catalog.json';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure skills directory exists
if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

// On startup, snapshot existing data files to .bak for recovery
try {
    const existing = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const file of existing) {
        fs.copyFileSync(
            path.join(DATA_DIR, file),
            path.join(DATA_DIR, file.replace('.json', '.bak'))
        );
    }
} catch (e) {
    console.warn('Could not create startup backups:', e.message);
}

// Initial data templates
const INITIAL_DATA = {
    tasks: [],
    status: {
        name: 'Atlas',
        status: 'working',
        message: 'Analyzing mission parameters...',
        subAgents: []
    },
    metrics: {
        avgTaskTime: '0m',
        successRate: '100%',
        activeAgents: 0
    },
    cron: [],
    subagents: [],
    skills: [],
    reminders: [],
    usage: {
        totalSpend: 0,
        history: []
    },
    sessions: {}
};

export { DATA_DIR, SKILLS_DIR };

const ENABLED_SKILLS_PATH = path.join(DATA_DIR, 'enabled-skills.json');

export const readEnabledSkills = () => {
    try { return JSON.parse(fs.readFileSync(ENABLED_SKILLS_PATH, 'utf-8')); } catch { return []; }
};

export const setSkillEnabled = (slug, enabled) => {
    const current = readEnabledSkills();
    const updated = enabled
        ? [...new Set([...current, slug])]
        : current.filter(s => s !== slug);
    fs.writeFileSync(ENABLED_SKILLS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
};

const getFilePath = (key) => path.join(DATA_DIR, `${key}.json`);
const SKILL_ID_REGEX = /^[a-z0-9][a-z0-9-_]{0,63}$/i;
export const normalizeSkillId = (value) =>
    value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);

export const resolveSkillPath = (id) => {
    if (!id || !SKILL_ID_REGEX.test(id)) return null;
    const resolved = path.resolve(SKILLS_DIR, id);
    const base = path.resolve(SKILLS_DIR);
    if (!resolved.startsWith(`${base}${path.sep}`) && resolved !== base) return null;
    return resolved;
};

export const readData = (key) => {
    const filePath = getFilePath(key);
    if (!fs.existsSync(filePath)) {
        // ... (existing migration logic for tasks) ...
        if (key === 'tasks') {
            const rootTasksPath = path.resolve(__dirname, '../tasks.json');
            if (fs.existsSync(rootTasksPath)) {
                try {
                    const data = fs.readFileSync(rootTasksPath, 'utf-8');
                    const parsed = JSON.parse(data);
                    writeData(key, parsed);
                    return parsed;
                } catch (e) {
                    console.error("Error migrating root tasks.json", e);
                }
            }
        }

        const defaultData = INITIAL_DATA[key] || [];
        writeData(key, defaultData);
        return defaultData;
    }

    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${key}:`, error);
        // Return default data to prevent crashes
        return INITIAL_DATA[key] || (key === 'status' || key === 'metrics' || key === 'usage' || key === 'sessions' ? {} : []);
    }
};

export const writeData = (key, data) => {
    const filePath = getFilePath(key);
    const tmpPath = `${filePath}.tmp`;
    try {
        const json = JSON.stringify(data, null, 2);
        fs.writeFileSync(tmpPath, json, 'utf-8');
        fs.renameSync(tmpPath, filePath); // atomic on same filesystem
        return true;
    } catch (error) {
        console.error(`Error writing ${key}:`, error);
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        return false;
    }
};

// --- Skill Management (Directory based) ---

function parseSkillFrontmatter(content) {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!fmMatch) return { name: 'Unknown', description: '', emoji: '📦', body: content, homepage: '', userInvocable: false };
    const fm = fmMatch[1];
    const body = fmMatch[2].trim();
    const nameMatch = fm.match(/^name:\s*(.+?)$/m);
    const descMatch = fm.match(/^description:\s*([\s\S]+?)(?=\n[a-zA-Z]|\n---|$)/m);
    const homepageMatch = fm.match(/^homepage:\s*(.+?)$/m);
    const emojiMatch = fm.match(/"emoji":\s*"([^"]+)"/);
    const description = descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '').trim() : '';
    return {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown',
        description,
        homepage: homepageMatch ? homepageMatch[1].trim() : '',
        emoji: emojiMatch ? emojiMatch[1] : '📦',
        body,
        userInvocable: /^user-invocable:\s*true/m.test(fm),
    };
}

function readWorkspaceSkills() {
    const skills = [];
    try {
        const entries = fs.readdirSync(WORKSPACE_SKILLS_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const slug = entry.name;
            const mdPath = path.join(WORKSPACE_SKILLS_DIR, slug, 'SKILL.md');
            try {
                const content = fs.readFileSync(mdPath, 'utf-8');
                const parsed = parseSkillFrontmatter(content);
                skills.push({ id: `workspace-${slug}`, slug, source: 'workspace', ...parsed, content });
            } catch {
                skills.push({ id: `workspace-${slug}`, slug, name: slug, description: '', emoji: '📦', body: '', homepage: '', userInvocable: false, source: 'workspace', content: '' });
            }
        }
    } catch { /* dir not found */ }
    return skills;
}

function readCatalogSkills() {
    try {
        const data = fs.readFileSync(SKILLS_CATALOG_PATH, 'utf-8');
        const catalog = JSON.parse(data);
        return catalog.map(s => ({ ...s, id: `catalog-${s.slug}`, source: 'openclaw-bundled', content: s.body || '' }));
    } catch { return []; }
}

export const readSkills = () => {
    const userSkills = [];
    if (fs.existsSync(SKILLS_DIR)) {
        try {
            const folders = fs.readdirSync(SKILLS_DIR);
            for (const folder of folders) {
                const skillPath = path.join(SKILLS_DIR, folder);
                if (!fs.statSync(skillPath).isDirectory()) continue;
                const skillMdPath = path.join(skillPath, 'SKILL.md');
                let content = '';
                let parsed = { name: folder, description: '', emoji: '📦', body: '', homepage: '', userInvocable: false };
                if (fs.existsSync(skillMdPath)) {
                    content = fs.readFileSync(skillMdPath, 'utf-8');
                    parsed = { ...parsed, ...parseSkillFrontmatter(content) };
                }
                userSkills.push({ id: folder, slug: folder, source: 'user-defined', ...parsed, content });
            }
        } catch (e) {
            console.error('Error reading user skills', e);
        }
    }
    const workspaceSkills = readWorkspaceSkills();
    const catalogSkills = readCatalogSkills();
    const enabledSlugs = readEnabledSkills();
    const all = [...userSkills, ...workspaceSkills, ...catalogSkills];
    return all.map(s => ({
        ...s,
        enabled: s.source === 'workspace' || s.source === 'user-defined' || enabledSlugs.includes(s.slug),
    }));
};

export const writeSkill = (skill) => {
    const { id, content, ...metadata } = skill;
    // Ensure name and description exist for frontmatter, defaulting if needed
    if (!metadata.name) metadata.name = id || 'Untitled Skill';
    if (!metadata.description) metadata.description = '';

    const rawSkillName = id || metadata.name;
    const skillName = normalizeSkillId(rawSkillName);
    if (!skillName || !SKILL_ID_REGEX.test(skillName)) return null;
    const skillPath = resolveSkillPath(skillName);
    if (!skillPath) return null;

    try {
        if (!fs.existsSync(skillPath)) {
            fs.mkdirSync(skillPath, { recursive: true });
        }

        const skillMdPath = path.join(skillPath, 'SKILL.md');
        let body = content || '';

        // Strip existing frontmatter from content if present
        if (body.startsWith('---')) {
            const endFrontmatter = body.indexOf('\n---', 3);
            if (endFrontmatter !== -1) {
                // 4 is length of `\n---`
                // Check if there is a newline after the closing dashes
                let endPos = endFrontmatter + 4;
                if (body[endPos] === '\n') endPos++;
                else if (body[endPos] === '\r' && body[endPos + 1] === '\n') endPos += 2;

                body = body.slice(endPos);
            }
        }

        // Remove system fields that shouldn't be in YAML
        const { instructionCount, ...yamlFields } = metadata;

        // Construct YAML frontmatter
        const frontmatter = Object.entries(yamlFields)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        const fullContent = `---\n${frontmatter}\n---\n\n${body.trim()}`;

        fs.writeFileSync(skillMdPath, fullContent, 'utf-8');
        return { id: skillName, ...metadata, content: fullContent };
    } catch (e) {
        console.error("Error writing skill", e);
        return null;
    }
};

export const deleteSkill = (id) => {
    const skillPath = resolveSkillPath((id || '').toString());
    if (!skillPath) return false;
    try {
        if (fs.existsSync(skillPath)) {
            fs.rmSync(skillPath, { recursive: true, force: true });
            return true;
        }
        return false;
    } catch (e) {
        console.error("Error deleting skill", e);
        return false;
    }
};

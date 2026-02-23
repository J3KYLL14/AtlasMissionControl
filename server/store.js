import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const SKILLS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, 'clawd', 'skills');

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

export const readSkills = () => {
    if (!fs.existsSync(SKILLS_DIR)) return [];

    try {
        const folders = fs.readdirSync(SKILLS_DIR);
        return folders.map(folder => {
            const skillPath = path.join(SKILLS_DIR, folder);
            if (!fs.statSync(skillPath).isDirectory()) return null;

            const skillMdPath = path.join(skillPath, 'SKILL.md');
            let content = '';
            let metadata = { name: folder, description: '' };

            if (fs.existsSync(skillMdPath)) {
                content = fs.readFileSync(skillMdPath, 'utf-8');
                // Basic frontmatter parser
                const match = content.match(/^---\n([\s\S]*?)\n---/);
                if (match) {
                    const yaml = match[1];
                    yaml.split('\n').forEach(line => {
                        const [key, ...val] = line.split(':');
                        if (key && val) metadata[key.trim()] = val.join(':').trim();
                    });
                }
            }

            return {
                id: folder,
                ...metadata,
                content
            };
        }).filter(Boolean);
    } catch (e) {
        console.error("Error reading skills", e);
        return [];
    }
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

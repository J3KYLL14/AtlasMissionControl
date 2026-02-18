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
    reminders: []
};

export { DATA_DIR, SKILLS_DIR };

const getFilePath = (key) => path.join(DATA_DIR, `${key}.json`);

export const readData = (key) => {
    const filePath = getFilePath(key);
    if (!fs.existsSync(filePath)) {
        // If file doesn't exist, try to use tasks.json from root if it's 'tasks'
        if (key === 'tasks') {
            const rootTasksPath = path.resolve(__dirname, '../tasks.json');
            if (fs.existsSync(rootTasksPath)) {
                try {
                    const data = fs.readFileSync(rootTasksPath, 'utf-8');
                    // Migrate to new location
                    writeData(key, JSON.parse(data));
                    return JSON.parse(data);
                } catch (e) {
                    console.error("Error migrating root tasks.json", e);
                }
            }
        }

        // Initialize with default data
        const defaultData = INITIAL_DATA[key] || [];
        writeData(key, defaultData);
        return defaultData;
    }

    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${key}:`, error);
        return INITIAL_DATA[key] || [];
    }
};

export const writeData = (key, data) => {
    const filePath = getFilePath(key);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`Error writing ${key}:`, error);
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
    const { id, name, description, content } = skill;
    const skillName = id || name.toLowerCase().replace(/\s+/g, '-');
    const skillPath = path.join(SKILLS_DIR, skillName);

    try {
        if (!fs.existsSync(skillPath)) {
            fs.mkdirSync(skillPath, { recursive: true });
        }

        const skillMdPath = path.join(skillPath, 'SKILL.md');
        let fullContent = content;

        // If content doesn't have frontmatter, add it
        if (!content.startsWith('---')) {
            fullContent = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;
        }

        fs.writeFileSync(skillMdPath, fullContent, 'utf-8');
        return { id: skillName, name, description, content: fullContent };
    } catch (e) {
        console.error("Error writing skill", e);
        return null;
    }
};

export const deleteSkill = (id) => {
    const skillPath = path.join(SKILLS_DIR, id);
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

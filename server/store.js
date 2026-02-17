import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial data templates
const INITIAL_DATA = {
    tasks: [],
    status: {
        name: 'Mission Control Agent',
        status: 'idle',
        message: 'System online',
        subAgents: []
    },
    metrics: {
        avgTaskTime: '0m',
        successRate: '100%',
        activeAgents: 0
    },
    cron: [],
    subagents: []
};

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


const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../server/data/usage.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

let usageData = {
    totalSpend: 0,
    history: []
};

if (fs.existsSync(DATA_FILE)) {
    try {
        usageData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        console.error('Failed to parse usage.json', e.message);
    }
}

const today = new Date().toISOString().split('T')[0];
let todayEntry = usageData.history.find(d => d.date === today);

if (!todayEntry) {
    todayEntry = { date: today, spend: 0, calls: 0 };
    usageData.history.push(todayEntry);
}

// Simulate hourly update
const newCalls = Math.floor(Math.random() * 50) + 10;
const costPerCall = 0.002;
const newSpend = newCalls * costPerCall;

todayEntry.calls += newCalls;
todayEntry.spend += newSpend;
usageData.totalSpend += newSpend;

// Keep 30 days history
if (usageData.history.length > 30) {
    usageData.history = usageData.history.slice(-30);
}

// Ensure totalSpend is refreshed based on history + maybe some baseline
usageData.totalSpend = usageData.history.reduce((acc, curr) => acc + curr.spend, 0);

fs.writeFileSync(DATA_FILE, JSON.stringify(usageData, null, 2));

console.log(`Updated usage for ${today}: +${newCalls} calls, +$${newSpend.toFixed(4)}`);

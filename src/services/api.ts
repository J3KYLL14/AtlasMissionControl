
const API_TOKEN = 'mission-control-token-123'; // In a real app, use import.meta.env.VITE_API_TOKEN

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || response.statusText);
    }
    return response.json();
};

export const api = {
    // Tasks
    getTasks: () => fetch('/api/tasks', { headers }).then(handleResponse),
    createTask: (task: any) => fetch('/api/tasks', { method: 'POST', headers, body: JSON.stringify(task) }).then(handleResponse),
    updateTask: (task: any) => fetch('/api/tasks', { method: 'PUT', headers, body: JSON.stringify(task) }).then(handleResponse),
    deleteTask: (id: string) => fetch(`/api/tasks?id=${id}`, { method: 'DELETE', headers }).then(handleResponse),

    // Status
    getStatus: () => fetch('/api/status', { headers }).then(handleResponse),
    updateStatus: (status: any) => fetch('/api/status', { method: 'PUT', headers, body: JSON.stringify(status) }).then(handleResponse),

    // Metrics
    getMetrics: () => fetch('/api/metrics', { headers }).then(handleResponse),
    updateMetrics: (metrics: any) => fetch('/api/metrics', { method: 'PUT', headers, body: JSON.stringify(metrics) }).then(handleResponse),

    // Cron
    getCronJobs: () => fetch('/api/cron', { headers }).then(handleResponse),
    createCronJob: (job: any) => fetch('/api/cron', { method: 'POST', headers, body: JSON.stringify(job) }).then(handleResponse),
    updateCronJob: (job: any) => fetch('/api/cron', { method: 'PUT', headers, body: JSON.stringify(job) }).then(handleResponse),
    deleteCronJob: (id: string) => fetch(`/api/cron?id=${id}`, { method: 'DELETE', headers }).then(handleResponse),

    // SubAgents
    getSubAgents: () => fetch('/api/subAgents', { headers }).then(handleResponse),
    createSubAgent: (agent: any) => fetch('/api/subAgents', { method: 'POST', headers, body: JSON.stringify(agent) }).then(handleResponse),
    updateSubAgent: (agent: any) => fetch('/api/subAgents', { method: 'PUT', headers, body: JSON.stringify(agent) }).then(handleResponse),
    deleteSubAgent: (id: string) => fetch(`/api/subAgents?id=${id}`, { method: 'DELETE', headers }).then(handleResponse),
};

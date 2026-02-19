
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('mc_token') ?? ''}`,
});

const handleResponse = async (response: Response) => {
    if (response.status === 401) {
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
    }
    return response.json();
};

export const api = {
    // Tasks
    getTasks: () => fetch('/api/tasks', { headers: getHeaders() }).then(handleResponse),
    createTask: (task: any) => fetch('/api/tasks', { method: 'POST', headers: getHeaders(), body: JSON.stringify(task) }).then(handleResponse),
    updateTask: (task: any) => fetch('/api/tasks', { method: 'PUT', headers: getHeaders(), body: JSON.stringify(task) }).then(handleResponse),
    deleteTask: (id: string) => fetch(`/api/tasks?id=${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

    // Status
    getStatus: () => fetch('/api/status', { headers: getHeaders() }).then(handleResponse),
    updateStatus: (status: any) => fetch('/api/status', { method: 'PUT', headers: getHeaders(), body: JSON.stringify(status) }).then(handleResponse),

    // Metrics
    getMetrics: () => fetch('/api/metrics', { headers: getHeaders() }).then(handleResponse),
    updateMetrics: (metrics: any) => fetch('/api/metrics', { method: 'PUT', headers: getHeaders(), body: JSON.stringify(metrics) }).then(handleResponse),

    // Cron
    getCronJobs: () => fetch('/api/cron', { headers: getHeaders() }).then(handleResponse),
    createCronJob: (job: any) => fetch('/api/cron', { method: 'POST', headers: getHeaders(), body: JSON.stringify(job) }).then(handleResponse),
    updateCronJob: (job: any) => fetch('/api/cron', { method: 'PUT', headers: getHeaders(), body: JSON.stringify(job) }).then(handleResponse),
    deleteCronJob: (id: string) => fetch(`/api/cron?id=${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

    // SubAgents
    getSubAgents: () => fetch('/api/subAgents', { headers: getHeaders() }).then(handleResponse),
    createSubAgent: (agent: any) => fetch('/api/subAgents', { method: 'POST', headers: getHeaders(), body: JSON.stringify(agent) }).then(handleResponse),
    updateSubAgent: (agent: any) => fetch('/api/subAgents', { method: 'PUT', headers: getHeaders(), body: JSON.stringify(agent) }).then(handleResponse),
    deleteSubAgent: (id: string) => fetch(`/api/subAgents?id=${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

    // Skills
    getSkills: () => fetch('/api/skills', { headers: getHeaders() }).then(handleResponse),
    createSkill: (skill: any) => fetch('/api/skills', { method: 'POST', headers: getHeaders(), body: JSON.stringify(skill) }).then(handleResponse),
    updateSkill: (skill: any) => fetch('/api/skills', { method: 'PUT', headers: getHeaders(), body: JSON.stringify(skill) }).then(handleResponse),
    deleteSkill: (id: string) => fetch(`/api/skills?id=${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

    // Reminders
    getReminders: () => fetch('/api/reminders', { headers: getHeaders() }).then(handleResponse),
    createReminder: (reminder: any) => fetch('/api/reminders', { method: 'POST', headers: getHeaders(), body: JSON.stringify(reminder) }).then(handleResponse),
    deleteReminder: (id: string) => fetch(`/api/reminders?id=${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
};

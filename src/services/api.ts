const jsonHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'missioncontrol',
};

type Payload = object;

const request = (url: string, init: RequestInit = {}) =>
    fetch(url, {
        credentials: 'include',
        ...init,
        headers: {
            ...(init.body ? jsonHeaders : { 'X-Requested-With': 'missioncontrol' }),
            ...(init.headers || {}),
        },
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
    getTasks: () => request('/api/tasks').then(handleResponse),
    createTask: (task: Payload) => request('/api/tasks', { method: 'POST', body: JSON.stringify(task) }).then(handleResponse),
    updateTask: (task: Payload) => request('/api/tasks', { method: 'PUT', body: JSON.stringify(task) }).then(handleResponse),
    deleteTask: (id: string) => request(`/api/tasks?id=${id}`, { method: 'DELETE' }).then(handleResponse),

    getStatus: () => request('/api/status').then(handleResponse),
    updateStatus: (status: Payload) => request('/api/status', { method: 'PUT', body: JSON.stringify(status) }).then(handleResponse),

    getMetrics: () => request('/api/metrics').then(handleResponse),
    updateMetrics: (metrics: Payload) => request('/api/metrics', { method: 'PUT', body: JSON.stringify(metrics) }).then(handleResponse),

    getCronJobs: () => request('/api/cron').then(handleResponse),
    createCronJob: (job: Payload) => request('/api/cron', { method: 'POST', body: JSON.stringify(job) }).then(handleResponse),
    updateCronJob: (job: Payload) => request('/api/cron', { method: 'PUT', body: JSON.stringify(job) }).then(handleResponse),
    deleteCronJob: (id: string) => request(`/api/cron?id=${id}`, { method: 'DELETE' }).then(handleResponse),

    getSubAgents: () => request('/api/subAgents').then(handleResponse),
    createSubAgent: (agent: Payload) => request('/api/subAgents', { method: 'POST', body: JSON.stringify(agent) }).then(handleResponse),
    updateSubAgent: (agent: Payload) => request('/api/subAgents', { method: 'PUT', body: JSON.stringify(agent) }).then(handleResponse),
    deleteSubAgent: (id: string) => request(`/api/subAgents?id=${id}`, { method: 'DELETE' }).then(handleResponse),

    getSkills: () => request('/api/skills').then(handleResponse),
    createSkill: (skill: Payload) => request('/api/skills', { method: 'POST', body: JSON.stringify(skill) }).then(handleResponse),
    updateSkill: (skill: Payload) => request('/api/skills', { method: 'PUT', body: JSON.stringify(skill) }).then(handleResponse),
    deleteSkill: (id: string) => request(`/api/skills?id=${id}`, { method: 'DELETE' }).then(handleResponse),

    getReminders: () => request('/api/reminders').then(handleResponse),
    createReminder: (reminder: Payload) => request('/api/reminders', { method: 'POST', body: JSON.stringify(reminder) }).then(handleResponse),
    deleteReminder: (id: string) => request(`/api/reminders?id=${id}`, { method: 'DELETE' }).then(handleResponse),

    getSession: () => request('/api/auth/session').then(handleResponse),
    logout: () => request('/api/auth/logout', { method: 'POST' }).then(handleResponse),
};

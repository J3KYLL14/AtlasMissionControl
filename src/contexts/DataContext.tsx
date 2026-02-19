
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

import type { KanbanTask, CronJob, AgentStatus, SubAgent } from '../services/mockData';

interface Metrics {
    avgTaskTime: string;
    successRate: string;
    activeAgents: number;
}

interface DataContextType {
    tasks: KanbanTask[];
    agentStatus: AgentStatus | null;
    metrics: Metrics | null;
    cronJobs: CronJob[];
    subAgents: SubAgent[];
    skills: any[];
    reminders: any[];
    loading: boolean;
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
    const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
    const [skills, setSkills] = useState<any[]>([]);
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        // Use allSettled so a single failing endpoint never blocks the others
        const [tasksRes, statusRes, metricsRes, cronRes, subAgentsRes, skillsRes, remindersRes] =
            await Promise.allSettled([
                api.getTasks(),
                api.getStatus(),
                api.getMetrics(),
                api.getCronJobs(),
                api.getSubAgents(),
                api.getSkills(),
                api.getReminders(),
            ]);

        if (tasksRes.status     === 'fulfilled') setTasks(tasksRes.value);
        if (statusRes.status    === 'fulfilled') setAgentStatus(statusRes.value);
        if (metricsRes.status   === 'fulfilled') setMetrics(metricsRes.value);
        if (cronRes.status      === 'fulfilled') setCronJobs(cronRes.value);
        if (subAgentsRes.status === 'fulfilled') setSubAgents(subAgentsRes.value);
        if (skillsRes.status    === 'fulfilled') setSkills(skillsRes.value);
        if (remindersRes.status === 'fulfilled') setReminders(remindersRes.value);

        // Log any individual failures for debugging
        [tasksRes, statusRes, metricsRes, cronRes, subAgentsRes, skillsRes, remindersRes]
            .forEach((r, i) => {
                if (r.status === 'rejected') {
                    const names = ['tasks', 'status', 'metrics', 'cron', 'subAgents', 'skills', 'reminders'];
                    console.warn(`fetchData: ${names[i]} failed —`, r.reason?.message ?? r.reason);
                }
            });

        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        let unmounted = false;
        let ws: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let attempts = 0;

        const connect = () => {
            if (unmounted) return;

            const token = localStorage.getItem('mc_token') ?? '';
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                attempts = 0;
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const { event: eventName, data } = JSON.parse(event.data);
                    switch (eventName) {
                        case 'tasks_update':     setTasks(data);       break;
                        case 'status_update':    setAgentStatus(data); break;
                        case 'metrics_update':   setMetrics(data);     break;
                        case 'cron_update':      setCronJobs(data);    break;
                        case 'subagents_update': setSubAgents(data);   break;
                        case 'skills_update':    setSkills(data);      break;
                        case 'reminders_update': setReminders(data);   break;
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            ws.onerror = () => {
                ws?.close();
            };

            ws.onclose = (event) => {
                // 1000 = intentional close, 4001 = auth rejected (don't retry)
                if (!unmounted && event.code !== 1000 && event.code !== 4001) {
                    const delay = Math.min(1000 * Math.pow(2, attempts), 30_000);
                    console.log(`WebSocket disconnected. Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
                    attempts++;
                    reconnectTimer = setTimeout(connect, delay);
                }
            };
        };

        connect();

        return () => {
            unmounted = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            ws?.close(1000, 'Component unmounting');
        };
    }, []);

    return (
        <DataContext.Provider value={{
            tasks,
            agentStatus,
            metrics,
            cronJobs,
            subAgents,
            skills,
            reminders,
            loading,
            refreshData: fetchData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

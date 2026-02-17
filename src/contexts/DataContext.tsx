
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

// Re-using types from mockData for now, but in reality should be shared types
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
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [tasksData, statusData, metricsData, cronData, subAgentsData] = await Promise.all([
                api.getTasks(),
                api.getStatus(),
                api.getMetrics(),
                api.getCronJobs(),
                api.getSubAgents()
            ]);

            setTasks(tasksData);
            setAgentStatus(statusData);
            setMetrics(metricsData);
            setCronJobs(cronData);
            setSubAgents(subAgentsData);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            // Don't set loading false here to avoid UI flicker if retry logic is added, 
            // but for now we should probably allow partial rendering or show error
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // WebSocket Connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // When using Vite proxy, we connect to the same host/port as the frontend
        // and the proxy handles the upgrade. 
        // However, if the proxy is configured to /ws -> ws://localhost:3001, 
        // we should connect to /ws on the current origin.
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        // Note: The vite proxy for /ws needs to be set up correctly. 
        // In vite.config.ts we set '/ws' -> target 'ws://localhost:3001'.
        // So consistent with that.

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to WebSocket');
        };

        ws.onmessage = (event) => {
            try {
                const { event: eventName, data } = JSON.parse(event.data);
                console.log('WS Update:', eventName, data);

                switch (eventName) {
                    case 'tasks_update':
                        setTasks(data);
                        break;
                    case 'status_update':
                        setAgentStatus(data);
                        break;
                    case 'metrics_update':
                        setMetrics(data);
                        break;
                    case 'cron_update':
                        setCronJobs(data);
                        break;
                    case 'subagents_update':
                        setSubAgents(data);
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Reconnection logic could go here
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <DataContext.Provider value={{
            tasks,
            agentStatus,
            metrics,
            cronJobs,
            subAgents,
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

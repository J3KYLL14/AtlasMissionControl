export interface GatewayStatus {
  status: 'running' | 'stopped' | 'error';
  version: string;
  uptime: string;
  lastRestart: string;
}

export interface Channel {
  id: string;
  type: 'discord' | 'whatsapp' | 'telegram';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastInboundAt: string;
  lastOutboundAt: string;
  errorText?: string;
}

export interface Message {
  id: string;
  channelId: string;
  sender: string;
  content: string;
  timestamp: string;
  isMention: boolean;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string;
  lastRunStatus: 'success' | 'failed';
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  implementationPlan?: string;
  date: string;
  status: 'todo' | 'inprogress' | 'done' | 'archived';
  importance: number; // 0-100
  urgency: number;    // 0-100 (if no dueDate)
  dueDate?: string;   // ISO string
  estimatedHours?: number;
}

export interface SubAgent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'error';
  skills: string[];
  task?: string;
  model?: string;
  maxSpawnDepth?: number;
  soul?: string;       // personality / SOUL.md content
  description?: string; // what tasks this agent handles
  image?: string;       // profile image URL (optional)
}

export interface AgentStatus {
  name: string;
  status: 'idle' | 'working' | 'blocked' | 'awaiting' | 'disconnected';
  message: string;
  subAgents: SubAgent[];
}

export const mockGatewayStatus: GatewayStatus = {
  status: 'running',
  version: '2.4.1-stable',
  uptime: '12d 4h 32m',
  lastRestart: '2026-02-01T12:00:00Z',
};

export const mockChannels: Channel[] = [
  {
    id: 'dc-1',
    type: 'discord',
    name: 'Main Discord',
    status: 'connected',
    lastInboundAt: '2026-02-12T21:00:05Z',
    lastOutboundAt: '2026-02-12T21:05:12Z',
  },
  {
    id: 'wa-1',
    type: 'whatsapp',
    name: 'Personal WhatsApp',
    status: 'connected',
    lastInboundAt: '2026-02-12T20:45:00Z',
    lastOutboundAt: '2026-02-12T20:50:00Z',
  },
  {
    id: 'tg-1',
    type: 'telegram',
    name: 'Ops Bot',
    status: 'error',
    errorText: 'API Token Expired',
    lastInboundAt: '2026-02-10T15:00:00Z',
    lastOutboundAt: '2026-02-10T15:05:00Z',
  },
];

export const mockMessages: Message[] = [
  {
    id: 'm1',
    channelId: 'dc-1',
    sender: 'Alice',
    content: 'Hey Ben, can you check the server logs?',
    timestamp: '2026-02-12T21:30:00Z',
    isMention: true,
  },
  {
    id: 'm2',
    channelId: 'wa-1',
    sender: 'Bob',
    content: 'The reminder for tomorrow is set.',
    timestamp: '2026-02-12T21:25:00Z',
    isMention: false,
  },
  {
    id: 'm3',
    channelId: 'dc-1',
    sender: 'System',
    content: 'Gateway heartbeat detected.',
    timestamp: '2026-02-12T21:20:00Z',
    isMention: false,
  },
];

export const mockCronJobs: CronJob[] = [
  {
    id: 'cron-1',
    name: 'Morning Briefing',
    schedule: '0 8 * * *',
    enabled: true,
    nextRunAt: '2026-02-13T08:00:00Z',
    lastRunAt: '2026-02-12T08:00:05Z',
    lastRunStatus: 'success',
  },
  {
    id: 'cron-2',
    name: 'Log Rotation',
    schedule: '0 0 * * *',
    enabled: true,
    nextRunAt: '2026-02-13T00:00:00Z',
    lastRunAt: '2026-02-12T00:00:10Z',
    lastRunStatus: 'success',
  },
];

export const mockKanbanTasks: KanbanTask[] = [
  { id: 't1', title: 'Fix PDF page breaks', date: 'Jan 27, 2026', status: 'todo', importance: 80, urgency: 40, dueDate: '2026-02-20T17:00:00Z', estimatedHours: 4 },
  { id: 't2', title: 'Add charts to reports', date: 'Jan 27, 2026', status: 'todo', importance: 60, urgency: 30, estimatedHours: 6 },
  { id: 't3', title: 'X API monitoring access', date: 'Jan 27, 2026', status: 'todo', importance: 90, urgency: 50, estimatedHours: 2 },
  { id: 't4', title: 'X expert monitoring role', date: 'Jan 27, 2026', status: 'inprogress', importance: 80, urgency: 85, dueDate: '2026-02-17T09:00:00Z', estimatedHours: 12 },
  { id: 't5', title: 'Metrics tracking system', date: 'Jan 27, 2026', status: 'inprogress', importance: 50, urgency: 20, estimatedHours: 8 },
  { id: 't6', title: 'YouTube audit PDF', date: 'Jan 27, 2026', status: 'done', importance: 40, urgency: 10 },
  { id: 't7', title: 'PDF generation pipeline', date: 'Jan 27, 2026', status: 'done', importance: 30, urgency: 5 },
  { id: 't8', title: 'Voice transcription', date: 'Jan 27, 2026', status: 'archived', importance: 10, urgency: 2 },
  { id: 't9', title: 'Overdue infrastructure patch', date: 'Feb 10, 2026', status: 'inprogress', importance: 95, urgency: 50, dueDate: '2026-02-10T12:00:00Z' },
  { id: 't10', title: 'Strategic multi-year review', date: 'Feb 16, 2026', status: 'todo', importance: 40, urgency: 50, dueDate: '2026-08-16T12:00:00Z' },
  { id: 't11', title: 'Spring quarterly report', date: 'Feb 16, 2026', status: 'inprogress', importance: 65, urgency: 50, dueDate: '2026-04-01T12:00:00Z' },
];

export const mockAgentStatus: AgentStatus = {
  name: 'Atlas',
  status: 'working',
  message: 'Analyzing mission parameters...',
  subAgents: [
    { id: 'sa1', name: 'Scraper-01', status: 'active', role: 'Data Mining', skills: ['Web Search', 'Data Extraction'], task: 'Monitoring X feeds' },
    { id: 'sa2', name: 'Writer-Pro', status: 'idle', role: 'Content Gen', skills: ['Copywriting', 'SEO'] },
    { id: 'sa3', name: 'PDF-Gen', status: 'error', role: 'Reporting', skills: ['Layout', 'PDF Kit'], task: 'Memory limit exceeded' },
  ],
};

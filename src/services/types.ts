export interface SkillRecord {
    id?: string;
    name: string;
    description: string;
    icon?: string;
    content?: string;
    emoji?: string;
    body?: string;
    homepage?: string;
    userInvocable?: boolean;
    source?: string;
    slug?: string;
    enabled?: boolean;
}

export interface ReminderRecord {
    id?: string;
    title: string;
    message?: string;
    note?: string;
    datetime?: string;
    dueAt?: string;
    channel?: string;
    status?: string;
    createdAt?: string;
}

export interface AgentMarkdownFileRecord {
    path: string;
    absolutePath: string;
    modifiedAt: string;
    sizeBytes: number;
}

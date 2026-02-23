export interface SkillRecord {
    id?: string;
    name: string;
    description: string;
    icon?: string;
    content?: string;
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

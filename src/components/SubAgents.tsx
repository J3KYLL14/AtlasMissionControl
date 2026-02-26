import React, { useState } from 'react';
import { UserPlus, Trash2, Crown } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import AddSubAgentModal from './AddSubAgentModal';
import AgentDetailModal from './AgentDetailModal';
import ConfirmationModal from './ConfirmationModal';
import type { SubAgent } from '../services/mockData';
import './Agents.css';

const STATUS_COLOR: Record<string, string> = {
    active: 'var(--status-working)',
    idle:   'var(--status-idle)',
    error:  'var(--status-disconnected)',
};

const initials = (name: string) =>
    name.split(/[\s\-_]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── Org Chart Structure ───────────────────────────────────────────────────────

const DEPARTMENTS = [
    {
        id: 'ops',
        name: 'Operations & Scheduling',
        color: '#818cf8',
        members: [
            { name: 'Triage',  role: 'Dashboard Task Ops' },
            { name: 'Cadence', role: 'Scheduling Lead' },
        ],
    },
    {
        id: 'research',
        name: 'Research & Intelligence',
        color: '#a78bfa',
        members: [
            { name: 'Scout',     role: 'Research Analyst' },
            { name: 'Archivist', role: 'Memory & Knowledge Manager' },
        ],
    },
    {
        id: 'product',
        name: 'Product & Engineering',
        color: '#22d3ee',
        members: [
            { name: 'Sketch', role: 'Product Design Lead' },
            { name: 'Forge',  role: 'Engineering Lead' },
        ],
    },
    {
        id: 'quality',
        name: 'Quality & Risk',
        color: '#fbbf24',
        members: [
            { name: 'Redline', role: 'QA & Risk Lead' },
        ],
    },
    {
        id: 'education',
        name: 'Education Design & Delivery',
        color: '#34d399',
        members: [
            { name: 'Blueprint', role: 'Curriculum Architect' },
            { name: 'Playbook',  role: 'Lesson Designer' },
            { name: 'Assembly',  role: 'Resource Production' },
        ],
    },
    {
        id: 'comms',
        name: 'Communications & Publishing',
        color: '#fb923c',
        members: [
            { name: 'Scribe', role: 'Longform Lead' },
            { name: 'Herald', role: 'Shortform & Social Lead' },
        ],
    },
];

// All agent names that live inside the org chart
const ORG_MEMBER_NAMES = new Set([
    'atlas',
    ...DEPARTMENTS.flatMap(d => d.members.map(m => m.name.toLowerCase())),
]);

// ─── CEO Card ─────────────────────────────────────────────────────────────────

const CeoCard: React.FC<{
    agent: SubAgent | undefined;
    onClick: () => void;
}> = ({ agent, onClick }) => {
    const statusColor = agent ? (STATUS_COLOR[agent.status] ?? 'var(--status-idle)') : 'var(--status-idle)';

    return (
        <button
            className="org-ceo-card"
            onClick={agent ? onClick : undefined}
            style={{ cursor: agent ? 'pointer' : 'default' }}
        >
            <div className="org-ceo-crown-badge"><Crown size={13} /></div>
            <div className="org-ceo-avatar-wrap">
                {agent?.image ? (
                    <img src={agent.image} alt="Atlas" className="org-ceo-avatar-img" />
                ) : (
                    <div className="org-ceo-avatar-initials">AT</div>
                )}
                {agent && <span className="org-ceo-status-dot" style={{ background: statusColor }} />}
            </div>
            <h3 className="org-ceo-name">Atlas</h3>
            <span className="org-ceo-role">CEO / Orchestrator</span>
            {agent && <span className="apc-cta">View profile</span>}
        </button>
    );
};

// ─── Org Agent Card ────────────────────────────────────────────────────────────

const OrgAgentCard: React.FC<{
    agent: SubAgent | undefined;
    fallbackName: string;
    fallbackRole: string;
    onClick: () => void;
    onDelete: (agent: SubAgent) => void;
}> = ({ agent, fallbackName, fallbackRole, onClick, onDelete }) => {
    const statusColor = agent ? (STATUS_COLOR[agent.status] ?? 'var(--status-idle)') : 'transparent';
    const name = agent?.name ?? fallbackName;
    const role = agent?.role ?? fallbackRole;
    const deployed = !!agent;

    return (
        <button
            className={`org-agent-card${deployed ? '' : ' org-agent-card--phantom'}`}
            onClick={deployed ? onClick : undefined}
        >
            <div className="org-agent-avatar-wrap">
                {agent?.image ? (
                    <img src={agent.image} alt={name} className="org-agent-avatar-img" />
                ) : (
                    <div className="org-agent-avatar-initials">{initials(name)}</div>
                )}
                {deployed && <span className="org-agent-status-dot" style={{ background: statusColor }} />}
            </div>
            <div className="org-agent-info">
                <span className="org-agent-name">{name}</span>
                <span className="org-agent-role">{role}</span>
            </div>
            {deployed && (
                <button
                    type="button"
                    className="org-agent-delete"
                    onClick={e => { e.stopPropagation(); onDelete(agent!); }}
                    title="Delete agent"
                >
                    <Trash2 size={12} />
                </button>
            )}
        </button>
    );
};

// ─── Flat Agent Card (for "Other Agents" overflow) ────────────────────────────

const AgentCard: React.FC<{ agent: SubAgent; onClick: () => void; onDelete: (a: SubAgent) => void }> = ({
    agent, onClick, onDelete,
}) => {
    const statusColor = STATUS_COLOR[agent.status] ?? 'var(--status-idle)';
    const visibleSkills = agent.skills.slice(0, 3);
    const extra = agent.skills.length - visibleSkills.length;

    return (
        <button className="agent-profile-card" onClick={onClick}>
            <div className="apc-avatar-wrap">
                {agent.image ? (
                    <img src={agent.image} alt={agent.name} className="apc-avatar-img" />
                ) : (
                    <div className="apc-avatar-initials">{initials(agent.name)}</div>
                )}
                <span className="apc-status-dot" style={{ background: statusColor }} />
            </div>
            <h4 className="apc-name">{agent.name}</h4>
            <span className="apc-role">{agent.role}</span>
            {visibleSkills.length > 0 && (
                <div className="apc-skills">
                    {visibleSkills.map(s => <span key={s} className="apc-skill-tag">{s}</span>)}
                    {extra > 0 && <span className="apc-skill-tag apc-skill-more">+{extra}</span>}
                </div>
            )}
            <span className="apc-cta">View profile</span>
            <button
                type="button"
                className="apc-delete-btn"
                onClick={e => { e.stopPropagation(); onDelete(agent); }}
            >
                <Trash2 size={14} /> Delete
            </button>
        </button>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SubAgents: React.FC = () => {
    const { subAgents, refreshData } = useData();
    const [showAddModal, setShowAddModal]       = useState(false);
    const [editingAgent, setEditingAgent]       = useState<SubAgent | undefined>();
    const [viewingAgent, setViewingAgent]       = useState<SubAgent | undefined>();
    const [deletingAgent, setDeletingAgent]     = useState<SubAgent | undefined>();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const findAgent = (name: string) =>
        subAgents.find(a => a.name.toLowerCase() === name.toLowerCase());

    const atlasAgent = findAgent('Atlas');

    // Agents that aren't part of the org chart definition
    const extraAgents = subAgents.filter(
        a => !ORG_MEMBER_NAMES.has(a.name.toLowerCase()),
    );

    const handleSave = async (agent: Partial<SubAgent>) => {
        if (agent.id) {
            await api.updateSubAgent(agent);
        } else {
            await api.createSubAgent(agent);
        }
        setShowAddModal(false);
        setEditingAgent(undefined);
        refreshData();
    };

    const openEdit = (agent: SubAgent) => {
        setViewingAgent(undefined);
        setEditingAgent(agent);
        setShowAddModal(true);
    };

    const handleDelete = async () => {
        if (!deletingAgent) return;
        await api.deleteSubAgent(deletingAgent.id);
        setShowDeleteConfirm(false);
        setDeletingAgent(undefined);
        refreshData();
    };

    const openView  = (agent: SubAgent) => setViewingAgent(agent);
    const openDelete = (agent: SubAgent) => { setDeletingAgent(agent); setShowDeleteConfirm(true); };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h2 className="page-title">Agents</h2>
                    <p className="page-subtitle">The Atlas command hierarchy.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <UserPlus size={18} /> Add Agent
                </button>
            </header>

            {/* ── Org Chart ─────────────────────────────────────────────── */}
            <div className="org-chart">

                {/* Level 1 — Atlas */}
                <div className="org-ceo-row">
                    <CeoCard
                        agent={atlasAgent}
                        onClick={() => atlasAgent && openView(atlasAgent)}
                    />
                </div>

                {/* Vertical stem */}
                <div className="org-stem-v" />

                {/* Level 2 — Departments */}
                <div className="org-dept-row">
                    {DEPARTMENTS.map(dept => (
                        <div key={dept.id} className="org-dept-col">
                            <div className="org-dept-stem-v" />
                            <div
                                className="org-dept-label"
                                style={{ borderColor: dept.color, color: dept.color }}
                            >
                                {dept.name}
                            </div>
                            <div className="org-dept-agents">
                                {dept.members.map(m => (
                                    <OrgAgentCard
                                        key={m.name}
                                        agent={findAgent(m.name)}
                                        fallbackName={m.name}
                                        fallbackRole={m.role}
                                        onClick={() => { const a = findAgent(m.name); if (a) openView(a); }}
                                        onDelete={openDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Extra agents outside the hierarchy ────────────────────── */}
            {extraAgents.length > 0 && (
                <div className="org-extra-section">
                    <p className="org-extra-label">Unassigned Agents</p>
                    <div className="agents-card-grid">
                        {extraAgents.map(agent => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                onClick={() => openView(agent)}
                                onDelete={openDelete}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Modals ────────────────────────────────────────────────── */}
            {viewingAgent && (
                <AgentDetailModal
                    agent={viewingAgent}
                    onClose={() => setViewingAgent(undefined)}
                    onEdit={() => openEdit(viewingAgent)}
                />
            )}
            {showAddModal && (
                <AddSubAgentModal
                    agent={editingAgent}
                    onClose={() => { setShowAddModal(false); setEditingAgent(undefined); }}
                    onSave={handleSave}
                />
            )}
            {deletingAgent && (
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    onClose={() => { setShowDeleteConfirm(false); setDeletingAgent(undefined); }}
                    onConfirm={handleDelete}
                    title="Delete Agent?"
                    message={`Delete ${deletingAgent.name}? This cannot be undone.`}
                    confirmText="Delete agent"
                    type="danger"
                />
            )}
        </div>
    );
};

export default SubAgents;

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import AddSubAgentModal from './AddSubAgentModal';
import AgentDetailModal from './AgentDetailModal';
import type { SubAgent } from '../services/mockData';
import './Agents.css';

const STATUS_COLOR: Record<string, string> = {
    active: 'var(--status-working)',
    idle:   'var(--status-idle)',
    error:  'var(--status-disconnected)',
};

const initials = (name: string) =>
    name.split(/[\s\-_]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const AgentCard: React.FC<{ agent: SubAgent; onClick: () => void }> = ({ agent, onClick }) => {
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
                    {visibleSkills.map(s => (
                        <span key={s} className="apc-skill-tag">{s}</span>
                    ))}
                    {extra > 0 && <span className="apc-skill-tag apc-skill-more">+{extra}</span>}
                </div>
            )}

            <span className="apc-cta">View profile</span>
        </button>
    );
};

const SubAgents: React.FC = () => {
    const { subAgents, refreshData } = useData();
    const [showAddModal, setShowAddModal]       = useState(false);
    const [editingAgent, setEditingAgent]       = useState<SubAgent | undefined>();
    const [viewingAgent, setViewingAgent]       = useState<SubAgent | undefined>();

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

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h2 className="page-title">Agents</h2>
                    <p className="page-subtitle">Manage and deploy specialised agents.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <UserPlus size={18} /> Add Agent
                </button>
            </header>

            {subAgents.length === 0 ? (
                <div className="placeholder">No agents deployed yet</div>
            ) : (
                <div className="agents-card-grid">
                    {subAgents.map(agent => (
                        <AgentCard
                            key={agent.id}
                            agent={agent}
                            onClick={() => setViewingAgent(agent)}
                        />
                    ))}
                </div>
            )}

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
        </div>
    );
};

export default SubAgents;

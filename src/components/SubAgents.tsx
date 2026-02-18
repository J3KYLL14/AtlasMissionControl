import React, { useState } from 'react';
import { Users, UserPlus, Settings, Activity } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import AddSubAgentModal from './AddSubAgentModal';
import type { SubAgent } from '../services/mockData';

const SubAgents: React.FC = () => {
    const { subAgents, refreshData } = useData();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<SubAgent | undefined>(undefined);

    const handleDeploy = async (agent: Partial<SubAgent>) => {
        if (agent.id) {
            await api.updateSubAgent(agent);
        } else {
            await api.createSubAgent(agent);
        }
        setShowAddModal(false);
        setEditingAgent(undefined);
        refreshData();
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h2 className="page-title">SubAgents</h2>
                    <p className="page-subtitle">Manage and delegate tasks to specialized sub-agents.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <UserPlus size={18} /> Deploy New Agent
                </button>
            </header>

            <div className="subagents-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                {subAgents.map(agent => (
                    <div key={agent.id} className="glass-card agent-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
                        <div className="agent-card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="agent-icon-bg" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                <Users size={24} />
                            </div>
                            <div className="agent-meta" style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{agent.name}</h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{agent.role}</span>
                            </div>
                            <div className={`status-pill ${agent.status === 'active' ? 'status-online' : agent.status === 'idle' ? 'status-idle' : 'status-offline'}`}>
                                {agent.status}
                            </div>
                        </div>

                        <div className="agent-skills-section">
                            <h5 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Equipped Skills</h5>
                            <div className="skills-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {agent.skills.map(skill => (
                                    <span key={skill} style={{ padding: '0.25rem 0.75rem', borderRadius: '99px', background: 'var(--glass)', fontSize: '0.75rem', border: '1px solid var(--border)' }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="agent-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                className="btn btn-secondary flex-1"
                                style={{ flex: 1 }}
                                onClick={() => {
                                    setEditingAgent(agent);
                                    setShowAddModal(true);
                                }}
                            >
                                <Settings size={14} /> Configure
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '0.5rem' }}><Activity size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {showAddModal && (
                <AddSubAgentModal
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingAgent(undefined);
                    }}
                    onSave={handleDeploy}
                    agent={editingAgent}
                />
            )}
        </div>
    );
};

export default SubAgents;

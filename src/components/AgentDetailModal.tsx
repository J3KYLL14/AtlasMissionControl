import React from 'react';
import { X, Edit2, Cpu, Brain, Zap } from 'lucide-react';
import type { SubAgent } from '../services/mockData';

const MODEL_LABELS: Record<string, string> = {
    'claude-sonnet-4-6':          'Claude Sonnet 4.6',
    'claude-opus-4-6':            'Claude Opus 4.6',
    'claude-haiku-4-5-20251001':  'Claude Haiku 4.5',
    'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
    'claude-3-opus-20240229':     'Claude 3 Opus',
    'claude-3-haiku-20240307':    'Claude 3 Haiku',
};

const STATUS_COLOR: Record<string, string> = {
    active: 'var(--status-working)',
    idle:   'var(--status-idle)',
    error:  'var(--status-disconnected)',
};

const initials = (name: string) =>
    name.split(/[\s\-_]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

interface Props {
    agent: SubAgent;
    onClose: () => void;
    onEdit: () => void;
}

const AgentDetailModal: React.FC<Props> = ({ agent, onClose, onEdit }) => {
    const statusColor = STATUS_COLOR[agent.status] ?? 'var(--status-idle)';
    const modelLabel  = MODEL_LABELS[agent.model ?? ''] ?? agent.model ?? 'Not specified';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card adm-modal" onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <header className="modal-header">
                    <div className="adm-header-identity">
                        <div className="adm-avatar-wrap">
                            {agent.image ? (
                                <img src={agent.image} alt={agent.name} className="adm-avatar-img" />
                            ) : (
                                <div className="adm-avatar-initials">{initials(agent.name)}</div>
                            )}
                        </div>
                        <div>
                            <h3 className="adm-name">{agent.name}</h3>
                            <div className="adm-meta-row">
                                <span className="adm-role-badge">{agent.role}</span>
                                <span className="adm-status-chip" style={{ color: statusColor, borderColor: statusColor }}>
                                    <span className="adm-status-dot" style={{ background: statusColor }} />
                                    {agent.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X /></button>
                </header>

                {/* ── Body ── */}
                <div className="modal-body adm-body">

                    {/* Personality */}
                    {agent.soul && (
                        <section className="adm-section">
                            <div className="adm-section-label">
                                <Brain size={14} /> Personality
                            </div>
                            <p className="adm-text">{agent.soul}</p>
                        </section>
                    )}

                    {/* Task focus */}
                    {agent.description && (
                        <section className="adm-section">
                            <div className="adm-section-label">
                                <Zap size={14} /> Task Focus
                            </div>
                            <p className="adm-text">{agent.description}</p>
                        </section>
                    )}

                    {/* Model */}
                    <section className="adm-section">
                        <div className="adm-section-label">
                            <Cpu size={14} /> Intelligence Model
                        </div>
                        <span className="adm-model-chip">{modelLabel}</span>
                    </section>

                    {/* Skills */}
                    {agent.skills.length > 0 && (
                        <section className="adm-section">
                            <div className="adm-section-label">
                                <Zap size={14} /> Skills
                            </div>
                            <div className="adm-skills-wrap">
                                {agent.skills.map(s => (
                                    <span key={s} className="adm-skill-tag">{s}</span>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* ── Footer ── */}
                <footer className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn btn-primary" onClick={onEdit}>
                        <Edit2 size={15} /> Edit Profile
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AgentDetailModal;

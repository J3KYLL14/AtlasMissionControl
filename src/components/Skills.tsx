import React, { useState, useMemo } from 'react';
import { Plus, X, ExternalLink, Search } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={e => { e.stopPropagation(); onChange(!on); }}
            style={{
                width: '38px', height: '21px', borderRadius: '11px', flexShrink: 0,
                background: on ? 'var(--accent-primary)' : 'rgba(255,255,255,0.12)',
                border: 'none', cursor: disabled ? 'default' : 'pointer',
                position: 'relative', transition: 'background 0.2s',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <span style={{
                position: 'absolute', top: '3px',
                left: on ? '19px' : '3px',
                width: '15px', height: '15px', borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
                pointerEvents: 'none',
            }} />
        </button>
    );
}
import AddSkillModal from './AddSkillModal';
import type { SkillRecord } from '../services/types';

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
    'workspace':        { label: 'Workspace',  color: 'var(--accent-primary)' },
    'user-defined':     { label: 'Custom',     color: '#a78bfa' },
    'openclaw-bundled': { label: 'Built-in',   color: 'var(--text-muted)' },
};

function SourceBadge({ source }: { source?: string }) {
    const cfg = SOURCE_LABELS[source || ''] ?? { label: source || 'Unknown', color: 'var(--text-muted)' };
    return (
        <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '2px 8px',
            borderRadius: '999px',
            border: `1px solid ${cfg.color}`,
            color: cfg.color,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
        }}>
            {cfg.label}
        </span>
    );
}

function SkillModal({ skill, onClose }: { skill: SkillRecord; onClose: () => void }) {
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.7)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '680px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Modal header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <span style={{ fontSize: '2.5rem', lineHeight: 1, flexShrink: 0 }}>{skill.emoji || '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{skill.name}</h3>
                            <SourceBadge source={skill.source} />
                            {skill.userInvocable && (
                                <span style={{
                                    fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
                                    padding: '2px 8px', borderRadius: '999px',
                                    border: '1px solid var(--accent-primary)',
                                    color: 'var(--accent-primary)', textTransform: 'uppercase',
                                }}>
                                    User Invocable
                                </span>
                            )}
                        </div>
                        {skill.slug && (
                            <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--glass)', padding: '1px 6px', borderRadius: '4px' }}>
                                /{skill.slug}
                            </code>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', flexShrink: 0 }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal body */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {skill.description && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6, margin: 0 }}>
                            {skill.description}
                        </p>
                    )}

                    {skill.homepage && (
                        <a
                            href={skill.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none',
                            }}
                        >
                            <ExternalLink size={14} /> {skill.homepage}
                        </a>
                    )}

                    {(skill.body || skill.content) && (
                        <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                                Skill Instructions
                            </p>
                            <pre style={{
                                background: 'var(--bg-deep, #0a0a0c)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '1rem',
                                fontSize: '0.78rem',
                                lineHeight: 1.6,
                                color: 'var(--text-secondary, #cbd5e1)',
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                margin: 0,
                            }}>
                                {skill.body || skill.content}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SkillCard({ skill, onClick, onToggle }: { skill: SkillRecord; onClick: () => void; onToggle?: (enabled: boolean) => void }) {
    const isWorkspace = skill.source === 'workspace' || skill.source === 'user-defined';
    return (
        <div
            className="glass-card skill-card"
            onClick={onClick}
            style={{
                padding: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'var(--transition)',
                borderRadius: '12px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>{skill.emoji || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{skill.name}</span>
                    </div>
                    {skill.slug && (
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--glass)', padding: '1px 5px', borderRadius: '3px' }}>
                            /{skill.slug}
                        </code>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                    <SourceBadge source={skill.source} />
                    {onToggle && (
                        <Toggle
                            on={!!skill.enabled}
                            onChange={onToggle}
                            disabled={isWorkspace}
                        />
                    )}
                </div>
            </div>

            {skill.description && (
                <p style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {skill.description}
                </p>
            )}
        </div>
    );
}

const Skills: React.FC = () => {
    const { skills, refreshData } = useData();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSkill, setEditingSkill] = useState<SkillRecord | undefined>(undefined);
    const [selectedSkill, setSelectedSkill] = useState<SkillRecord | null>(null);
    const [search, setSearch] = useState('');

    const handleToggleSkill = async (skill: SkillRecord, enabled: boolean) => {
        if (!skill.slug) return;
        await api.setSkillEnabled(skill.slug, enabled);
        refreshData();
    };

    const handleSaveSkill = async (skill: SkillRecord) => {
        if (skill.id) {
            await api.updateSkill(skill);
        } else {
            await api.createSkill(skill);
        }
        setShowAddModal(false);
        setEditingSkill(undefined);
        refreshData();
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return skills;
        return skills.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q) ||
            (s.slug || '').toLowerCase().includes(q)
        );
    }, [skills, search]);

    const workspace = filtered.filter(s => s.source === 'workspace' || s.source === 'user-defined');
    const catalog   = filtered.filter(s => s.source === 'openclaw-bundled');

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h2 className="page-title">Skills</h2>
                    <p className="page-subtitle">
                        All capabilities available to your agents — {skills.length} skill{skills.length !== 1 ? 's' : ''} loaded.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18} /> Define New Skill
                </button>
            </header>

            {/* Search bar */}
            <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '2rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                    type="text"
                    placeholder="Search skills…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                        color: 'inherit',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Installed / workspace skills */}
            {workspace.length > 0 && (
                <section style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        Installed ({workspace.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {workspace.map(skill => (
                            <SkillCard key={skill.id} skill={skill} onClick={() => setSelectedSkill(skill)} onToggle={(v) => handleToggleSkill(skill, v)} />
                        ))}
                    </div>
                </section>
            )}

            {/* Catalog / built-in skills */}
            {catalog.length > 0 && (
                <section>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        Available Skills ({catalog.length})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                        Toggle a skill on to make it available for assignment to agents.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {catalog.map(skill => (
                            <SkillCard key={skill.id} skill={skill} onClick={() => setSelectedSkill(skill)} onToggle={(v) => handleToggleSkill(skill, v)} />
                        ))}
                    </div>
                </section>
            )}

            {filtered.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem' }}>
                    {search ? 'No skills match your search.' : 'No skills found.'}
                </p>
            )}

            {/* Detail modal */}
            {selectedSkill && (
                <SkillModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
            )}

            {/* Add / Edit skill modal */}
            {showAddModal && (
                <AddSkillModal
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingSkill(undefined);
                    }}
                    onSave={handleSaveSkill}
                    skill={editingSkill}
                />
            )}
        </div>
    );
};

export default Skills;

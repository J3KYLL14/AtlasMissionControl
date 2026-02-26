import React, { useEffect, useState } from 'react';
import { X, Edit2, Cpu, Brain, Zap, Search, FileText } from 'lucide-react';
import type { SubAgent } from '../services/mockData';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import type { AgentMarkdownFileRecord } from '../services/types';

const MODEL_LABELS: Record<string, string> = {
    // OpenAI
    'openai/gpt-5.2':         'ChatGPT 5.2',
    'openai/gpt-5.1-codex':   'ChatGPT 5.1 Codex',
    'openai/gpt-5':           'ChatGPT 5',
    'openai/gpt-5-mini':      'ChatGPT 5 Mini',
    'openai/gpt-4.1':         'ChatGPT 4.1',
    'openai/gpt-5.3-codex':   'Codex 5.3',
    // Anthropic
    'anthropic/claude-opus-4-6':    'Claude Opus 4.6',
    'anthropic/claude-sonnet-4-5':  'Claude Sonnet 4.5',
    'anthropic/claude-haiku-4-5':   'Claude Haiku 4.5',
    // Legacy Anthropic IDs
    'claude-sonnet-4-6':            'Claude Sonnet 4.6',
    'claude-opus-4-6':              'Claude Opus 4.6',
    'claude-haiku-4-5-20251001':    'Claude Haiku 4.5',
    'claude-3-5-sonnet-20240620':   'Claude 3.5 Sonnet',
    'claude-3-opus-20240229':       'Claude 3 Opus',
    'claude-3-haiku-20240307':      'Claude 3 Haiku',
    // Google
    'google/gemini-3-pro-preview':    'Gemini 3 Pro Preview',
    'google/gemini-3-flash-preview':  'Gemini 3 Flash Preview',
    'google/gemini-2.5-flash':        'Gemini 2.5 Flash',
    'google/gemini-2.5-flash-lite':   'Gemini 2.5 Flash Lite',
};

const STATUS_COLOR: Record<string, string> = {
    active: 'var(--status-working)',
    idle:   'var(--status-idle)',
    error:  'var(--status-disconnected)',
};

const initials = (name: string) =>
    name.split(/[\s\-_]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function SkillToggleRow({
    emoji, name, description, checked, onChange,
}: {
    emoji?: string; name: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.55rem 0.5rem', borderRadius: '8px', cursor: 'pointer',
            transition: 'background 0.15s',
        }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
            <span style={{ fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}>{emoji || '📦'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{name}</div>
                {description && (
                    <div style={{
                        fontSize: '0.72rem', color: 'var(--text-muted)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {description}
                    </div>
                )}
            </div>
            {/* Toggle */}
            <div
                role="switch"
                aria-checked={checked}
                onClick={e => { e.preventDefault(); onChange(!checked); }}
                style={{
                    width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
                    background: checked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.12)',
                    position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                }}
            >
                <span style={{
                    position: 'absolute', top: '3px',
                    left: checked ? '17px' : '3px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s', pointerEvents: 'none',
                }} />
            </div>
        </label>
    );
}

interface Props {
    agent: SubAgent;
    onClose: () => void;
    onEdit: () => void;
}

const AgentDetailModal: React.FC<Props> = ({ agent, onClose, onEdit }) => {
    const { skills: allSkills } = useData();
    const [agentSkills, setAgentSkills] = useState<string[]>(agent.skills ?? []);
    const [saving, setSaving] = useState(false);
    const [skillSearch, setSkillSearch] = useState('');
    const [markdownLoading, setMarkdownLoading] = useState(false);
    const [markdownError, setMarkdownError] = useState<string | null>(null);
    const [markdownWorkspace, setMarkdownWorkspace] = useState('');
    const [markdownFiles, setMarkdownFiles] = useState<AgentMarkdownFileRecord[]>([]);

    const statusColor = STATUS_COLOR[agent.status] ?? 'var(--status-idle)';
    const modelLabel  = MODEL_LABELS[agent.model ?? ''] ?? agent.model ?? 'Not specified';

    // Only show skills that are enabled or workspace-level
    const availableSkills = allSkills.filter(s => s.enabled);

    const filteredSkills = availableSkills.filter(s => {
        const q = skillSearch.toLowerCase();
        return !q ||
            s.name.toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q);
    });

    const toggleSkill = async (slug: string, on: boolean) => {
        const updated = on
            ? [...new Set([...agentSkills, slug])]
            : agentSkills.filter(s => s !== slug);
        setAgentSkills(updated);
        setSaving(true);
        try {
            await api.updateSubAgent({ id: agent.id, skills: updated });
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const loadMarkdownFiles = async () => {
            setMarkdownLoading(true);
            setMarkdownError(null);
            try {
                const res = await api.getSubAgentMarkdown(agent.name, 200) as {
                    workspace?: string;
                    files?: AgentMarkdownFileRecord[];
                };
                if (cancelled) return;
                setMarkdownWorkspace(res.workspace || '');
                setMarkdownFiles(Array.isArray(res.files) ? res.files : []);
            } catch (err) {
                if (cancelled) return;
                setMarkdownError(err instanceof Error ? err.message : 'Failed to load markdown files');
                setMarkdownFiles([]);
                setMarkdownWorkspace('');
            } finally {
                if (!cancelled) setMarkdownLoading(false);
            }
        };
        loadMarkdownFiles();
        return () => {
            cancelled = true;
        };
    }, [agent.name]);

    const sectionLabel = (icon: React.ReactNode, text: string, extra?: React.ReactNode) => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-muted)',
            marginBottom: '0.5rem',
        }}>
            {icon} {text} {extra}
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content glass-card"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '680px', width: '100%' }}
            >
                {/* ── Header ── */}
                <header className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
                        <div style={{ flexShrink: 0 }}>
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
                                {agent.model && (
                                    <span className="adm-model-chip" style={{ fontSize: '0.72rem', padding: '0.1rem 0.5rem' }}>
                                        {modelLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X /></button>
                </header>

                {/* ── Body ── */}
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Two-column info row */}
                    {(agent.soul || agent.description) && (
                        <div style={{ display: 'grid', gridTemplateColumns: agent.soul && agent.description ? '1fr 1fr' : '1fr', gap: '1.25rem' }}>
                            {agent.soul && (
                                <section>
                                    {sectionLabel(<Brain size={13} />, 'Personality')}
                                    <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-main)', margin: 0, maxHeight: '150px', overflowY: 'auto', paddingRight: '0.25rem' }}>{agent.soul}</p>
                                </section>
                            )}
                            {agent.description && (
                                <section>
                                    {sectionLabel(<Zap size={13} />, 'Task Focus')}
                                    <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-main)', margin: 0, maxHeight: '150px', overflowY: 'auto', paddingRight: '0.25rem' }}>{agent.description}</p>
                                </section>
                            )}
                        </div>
                    )}

                    {/* Model (standalone if no personality/description shown inline) */}
                    {!agent.soul && !agent.description && (
                        <section>
                            {sectionLabel(<Cpu size={13} />, 'Intelligence Model')}
                            <span className="adm-model-chip">{modelLabel}</span>
                        </section>
                    )}

                    {/* ── Skills section ── */}
                    <section>
                        {sectionLabel(
                            <Zap size={13} />,
                            'Skills',
                            saving ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 400 }}>saving…</span>
                            ) : (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {agentSkills.length} active
                                </span>
                            )
                        )}

                        {availableSkills.length === 0 ? (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                No skills enabled. Go to the <strong>Skills</strong> page and toggle skills on to make them available here.
                            </p>
                        ) : (
                            <>
                                {/* Search */}
                                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                    <Search size={13} style={{
                                        position: 'absolute', left: '0.6rem', top: '50%',
                                        transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search skills…"
                                        value={skillSearch}
                                        onChange={e => setSkillSearch(e.target.value)}
                                        style={{
                                            width: '100%', background: 'var(--bg-deep, #0a0a0c)',
                                            border: '1px solid var(--border)', borderRadius: '7px',
                                            padding: '0.4rem 0.7rem 0.4rem 2rem',
                                            color: 'inherit', fontSize: '0.8rem', outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                {/* List */}
                                <div style={{
                                    maxHeight: '260px', overflowY: 'auto',
                                    border: '1px solid var(--border)', borderRadius: '10px',
                                    padding: '0.25rem 0.25rem',
                                }}>
                                    {filteredSkills.length === 0 ? (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.75rem', margin: 0 }}>No skills match.</p>
                                    ) : (
                                        filteredSkills.map(skill => (
                                            <SkillToggleRow
                                                key={skill.id ?? skill.slug}
                                                emoji={skill.emoji}
                                                name={skill.name}
                                                description={skill.description}
                                                checked={agentSkills.includes(skill.slug ?? skill.name)}
                                                onChange={on => toggleSkill(skill.slug ?? skill.name, on)}
                                            />
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    {/* ── Markdown file activity ── */}
                    <section>
                        {sectionLabel(
                            <FileText size={13} />,
                            'Markdown Files',
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {markdownFiles.length} shown
                            </span>
                        )}
                        {markdownWorkspace && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                Workspace: <code>{markdownWorkspace}</code>
                            </p>
                        )}
                        {markdownLoading ? (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Loading markdown files…</p>
                        ) : markdownError ? (
                            <p style={{ fontSize: '0.82rem', color: 'var(--error)', margin: 0 }}>{markdownError}</p>
                        ) : markdownFiles.length === 0 ? (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No markdown files found.</p>
                        ) : (
                            <div style={{
                                maxHeight: '260px',
                                overflowY: 'auto',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                padding: '0.35rem 0.5rem',
                            }}>
                                {markdownFiles.map((file) => (
                                    <div key={`${file.absolutePath}-${file.modifiedAt}`} style={{
                                        padding: '0.45rem 0.2rem',
                                        borderBottom: '1px solid var(--border)',
                                    }}>
                                        <div style={{ fontSize: '0.83rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                                            <code>{file.path}</code>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            {new Date(file.modifiedAt).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
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

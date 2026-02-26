import React, { useState } from 'react';
import { X, Save, Shield, Brain, Cpu, MessageSquare, Image, FileText, Zap, Search } from 'lucide-react';
import type { SubAgent } from '../services/mockData';
import { useData } from '../contexts/DataContext';

interface AddSubAgentModalProps {
    onClose: () => void;
    onSave: (agent: Partial<SubAgent>) => void;
    agent?: SubAgent;
}

const AddSubAgentModal: React.FC<AddSubAgentModalProps> = ({ onClose, onSave, agent }) => {
    const { skills: allSkills } = useData();

    const [name,           setName]          = useState(agent?.name          ?? '');
    const [role,           setRole]          = useState(agent?.role          ?? '');
    const [model,          setModel]         = useState(agent?.model         ?? 'openai/gpt-5.2');
    const [maxSpawnDepth,  setMaxSpawnDepth] = useState(agent?.maxSpawnDepth ?? 1);
    const [soul,           setSoul]          = useState(agent?.soul          ?? '');
    const [description,    setDescription]   = useState(agent?.description   ?? '');
    const [image,          setImage]         = useState(agent?.image         ?? '');
    const [selectedSkills, setSelectedSkills] = useState<string[]>(agent?.skills ?? []);
    const [skillSearch,    setSkillSearch]   = useState('');

    // Only show enabled skills (workspace + toggled catalog)
    const availableSkills = allSkills.filter(s => s.enabled);

    const filteredSkills = availableSkills.filter(s => {
        const q = skillSearch.toLowerCase();
        return !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    });

    const toggleSkill = (slug: string) => {
        setSelectedSkills(prev =>
            prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
        );
    };

    const handleSave = () => {
        if (!name || !role) return;
        onSave({
            ...agent,
            name,
            role,
            status: agent?.status ?? 'idle',
            model,
            maxSpawnDepth,
            soul,
            description,
            image: image.trim() || undefined,
            skills: selectedSkills,
            task: agent?.task ?? 'Ready for assignment',
        });
    };

    const isEditing = Boolean(agent?.id);

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card">
                <header className="modal-header">
                    <div className="title-group">
                        <Shield className="text-accent" />
                        <h3>{isEditing ? 'Edit Agent' : 'Add Agent'}</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X /></button>
                </header>

                <div className="modal-body">

                    {/* Name + Role */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Agent Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Researcher-01"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <input
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                placeholder="e.g. Data Extraction"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Model + Max Spawn Depth */}
                    <div className="form-row">
                        <div className="form-group">
                            <label><Brain size={14} /> Intelligence Model</label>
                            <select value={model} onChange={e => setModel(e.target.value)} className="form-select">
                                <optgroup label="OpenAI">
                                    <option value="openai/gpt-5.2">ChatGPT 5.2 (Latest / Recommended)</option>
                                    <option value="openai/gpt-5">ChatGPT 5</option>
                                    <option value="openai/gpt-5-mini">ChatGPT 5 Mini (Fast / Cheap)</option>
                                    <option value="openai/gpt-4.1">ChatGPT 4.1</option>
                                    <option value="openai/gpt-5.1-codex">ChatGPT 5.1 Codex</option>
                                    <option value="openai/gpt-5.3-codex">Codex 5.3</option>
                                </optgroup>
                                <optgroup label="Anthropic">
                                    <option value="anthropic/claude-opus-4-6">Claude Opus 4.6 (Complex reasoning)</option>
                                    <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5 (Balanced)</option>
                                    <option value="anthropic/claude-haiku-4-5">Claude Haiku 4.5 (Fast / Cheap)</option>
                                </optgroup>
                                <optgroup label="Google">
                                    <option value="google/gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                                    <option value="google/gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                    <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    <option value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                                </optgroup>
                            </select>
                        </div>
                        <div className="form-group">
                            <label><Cpu size={14} /> Max Spawn Depth</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={maxSpawnDepth}
                                onChange={e => setMaxSpawnDepth(parseInt(e.target.value))}
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Profile Image URL */}
                    <div className="form-group">
                        <label><Image size={14} /> Profile Image URL <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                        <input
                            value={image}
                            onChange={e => setImage(e.target.value)}
                            placeholder="https://example.com/avatar.png"
                            className="form-input"
                        />
                    </div>

                    {/* Skills picker */}
                    <div className="form-group">
                        <label><Zap size={14} /> Skills
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                                — {selectedSkills.length} selected
                            </span>
                        </label>

                        {availableSkills.length === 0 ? (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                No skills enabled. Visit the <strong>Skills</strong> page and toggle skills on first.
                            </p>
                        ) : (
                            <>
                                {/* Search */}
                                <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
                                    <Search size={13} style={{
                                        position: 'absolute', left: '0.6rem', top: '50%',
                                        transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search skills…"
                                        value={skillSearch}
                                        onChange={e => setSkillSearch(e.target.value)}
                                        className="form-input"
                                        style={{ paddingLeft: '2rem' }}
                                    />
                                </div>

                                {/* Checklist */}
                                <div style={{
                                    maxHeight: '200px', overflowY: 'auto',
                                    border: '1px solid var(--border)', borderRadius: '8px',
                                    padding: '0.25rem',
                                }}>
                                    {filteredSkills.length === 0 ? (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem', margin: 0 }}>No skills match.</p>
                                    ) : (
                                        filteredSkills.map(skill => {
                                            const slug = skill.slug ?? skill.name;
                                            const checked = selectedSkills.includes(slug);
                                            return (
                                                <label
                                                    key={skill.id ?? slug}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                        padding: '0.45rem 0.5rem', borderRadius: '6px',
                                                        cursor: 'pointer',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleSkill(slug)}
                                                        style={{ accentColor: 'var(--accent-primary)', width: '14px', height: '14px', flexShrink: 0 }}
                                                    />
                                                    <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{skill.emoji || '📦'}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.83rem', fontWeight: 500 }}>{skill.name}</div>
                                                        {skill.description && (
                                                            <div style={{
                                                                fontSize: '0.7rem', color: 'var(--text-muted)',
                                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                            }}>
                                                                {skill.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Task Description */}
                    <div className="form-group">
                        <label><FileText size={14} /> Task Focus</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe what tasks this agent handles..."
                            className="form-textarea"
                            rows={3}
                        />
                    </div>

                    {/* Soul */}
                    <div className="form-group">
                        <label><MessageSquare size={14} /> Personality (SOUL.md)</label>
                        <textarea
                            value={soul}
                            onChange={e => setSoul(e.target.value)}
                            placeholder="Define the personality and core focus of this agent..."
                            className="form-textarea agent-textarea"
                            rows={4}
                        />
                    </div>

                </div>

                <footer className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!name || !role}>
                        <Save size={18} /> {isEditing ? 'Save Changes' : 'Add Agent'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AddSubAgentModal;

import React, { useState } from 'react';
import { X, Save, Shield, Brain, Cpu, MessageSquare, Image, FileText } from 'lucide-react';
import type { SubAgent } from '../services/mockData';

interface AddSubAgentModalProps {
    onClose: () => void;
    onSave: (agent: Partial<SubAgent>) => void;
    agent?: SubAgent;
}

const AddSubAgentModal: React.FC<AddSubAgentModalProps> = ({ onClose, onSave, agent }) => {
    const [name,          setName]          = useState(agent?.name          ?? '');
    const [role,          setRole]          = useState(agent?.role          ?? '');
    const [model,         setModel]         = useState(agent?.model         ?? 'claude-sonnet-4-6');
    const [maxSpawnDepth, setMaxSpawnDepth] = useState(agent?.maxSpawnDepth ?? 1);
    const [soul,          setSoul]          = useState(agent?.soul          ?? '');
    const [description,   setDescription]   = useState(agent?.description   ?? '');
    const [image,         setImage]         = useState(agent?.image         ?? '');
    const [selectedSkills, setSelectedSkills] = useState<string[]>(agent?.skills ?? []);
    const [newSkill,      setNewSkill]      = useState('');

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

    const addSkill = () => {
        const trimmed = newSkill.trim();
        if (trimmed && !selectedSkills.includes(trimmed)) {
            setSelectedSkills([...selectedSkills, trimmed]);
            setNewSkill('');
        }
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
                                <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Balanced)</option>
                                <option value="claude-opus-4-6">Claude Opus 4.6 (Complex reasoning)</option>
                                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast / Cheap)</option>
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

                    {/* Skills */}
                    <div className="form-group">
                        <label>Skills</label>
                        <div className="skill-input-group" style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                value={newSkill}
                                onChange={e => setNewSkill(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                placeholder="Type skill and press Enter or Add"
                                className="form-input"
                            />
                            <button className="btn btn-secondary" onClick={addSkill}>Add</button>
                        </div>
                        <div className="skills-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {selectedSkills.map(skill => (
                                <span
                                    key={skill}
                                    className="skill-tag"
                                    style={{ background: 'var(--glass)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {skill}
                                    <X
                                        size={10}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))}
                                    />
                                </span>
                            ))}
                        </div>
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

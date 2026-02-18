import React, { useState } from 'react';
import { X, Save, Shield, Brain, Cpu, MessageSquare } from 'lucide-react';
import type { SubAgent } from '../services/mockData';

interface AddSubAgentModalProps {
    onClose: () => void;
    onSave: (agent: Partial<SubAgent>) => void;
    agent?: SubAgent;
}

const AddSubAgentModal: React.FC<AddSubAgentModalProps> = ({ onClose, onSave, agent }) => {
    const [name, setName] = useState(agent?.name || '');
    const [role, setRole] = useState(agent?.role || '');
    const [model, setModel] = useState(agent?.model || 'claude-3-5-sonnet-20240620');
    const [maxSpawnDepth, setMaxSpawnDepth] = useState(agent?.maxSpawnDepth || 1);
    const [soul, setSoul] = useState(agent?.soul || '');
    const [selectedSkills, setSelectedSkills] = useState<string[]>(agent?.skills || []);
    const [newSkill, setNewSkill] = useState('');

    const handleSave = () => {
        if (!name || !role) return;
        onSave({
            ...agent,
            name,
            role,
            status: agent?.status || 'idle',
            model,
            maxSpawnDepth,
            soul,
            skills: selectedSkills,
            task: agent?.task || 'Ready for assignment'
        });
    };

    const addSkill = () => {
        if (newSkill && !selectedSkills.includes(newSkill)) {
            setSelectedSkills([...selectedSkills, newSkill]);
            setNewSkill('');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card">
                <header className="modal-header">
                    <div className="title-group">
                        <Shield className="text-accent" />
                        <h3>Deploy New Sub-Agent</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X /></button>
                </header>

                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Agent Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Researcher-01" className="form-input" />
                        </div>
                        <div className="form-group">
                            <label>Specialized Role</label>
                            <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Data Extraction" className="form-input" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label><Brain size={14} /> Intelligence Model</label>
                            <select value={model} onChange={e => setModel(e.target.value)} className="form-select">
                                <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Balanced)</option>
                                <option value="claude-3-opus-20240229">Claude 3 Opus (Complex reasoning)</option>
                                <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast/Cheap)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label><Cpu size={14} /> Max Spawn Depth</label>
                            <input type="number" min="1" max="3" value={maxSpawnDepth} onChange={e => setMaxSpawnDepth(parseInt(e.target.value))} className="form-input" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Assigned Skills</label>
                        <div className="skill-input-group" style={{ display: 'flex', gap: '0.5rem' }}>
                            <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Type skill name..." className="form-input" />
                            <button className="btn btn-secondary" onClick={addSkill}>Add</button>
                        </div>
                        <div className="skills-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {selectedSkills.map(skill => (
                                <span key={skill} className="skill-tag" style={{ background: 'var(--glass)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
                                    {skill} <X size={10} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))} />
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="form-group agent-box">
                        <label><MessageSquare size={14} /> Agent Soul (SOUL.md)</label>
                        <textarea
                            value={soul}
                            onChange={e => setSoul(e.target.value)}
                            placeholder="Define the personality and core focus of this sub-agent..."
                            className="form-textarea agent-textarea"
                            rows={4}
                        />
                    </div>
                </div>

                <footer className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!name || !role}>
                        <Save size={18} /> Initialize Agent
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AddSubAgentModal;

import React, { useState } from 'react';
import { X, Save, Book, Code } from 'lucide-react';

interface AddSkillModalProps {
    onClose: () => void;
    onSave: (skill: any) => void;
    skill?: any;
}

const AddSkillModal: React.FC<AddSkillModalProps> = ({ onClose, onSave, skill }) => {
    const [name, setName] = useState(skill?.name || '');
    const [description, setDescription] = useState(skill?.description || '');
    const [icon, setIcon] = useState(skill?.icon || 'zap');
    const [content, setContent] = useState(skill?.content || '# New Skill\n\n## Description\n\n## Tools / Instructions\n');

    const handleSave = () => {
        if (!name || !description) return;
        onSave({
            ...skill,
            name,
            description,
            icon,
            content
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card">
                <header className="modal-header">
                    <div className="title-group">
                        <Book className="text-accent" />
                        <h3>Define New Skill</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X /></button>
                </header>

                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Skill Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Image Processing" className="form-input" />
                        </div>
                        <div className="form-group">
                            <label>Icon</label>
                            <select value={icon} onChange={e => setIcon(e.target.value)} className="form-select">
                                <option value="zap">Zap (Action)</option>
                                <option value="globe">Globe (Web)</option>
                                <option value="code">Code (Programming)</option>
                                <option value="messagesquare">Message (Communication)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Short Description</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this skill enable?" className="form-input" />
                    </div>

                    <div className="form-group agent-box">
                        <label><Code size={14} /> SKILL.md Content</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="form-textarea agent-textarea"
                            rows={10}
                        />
                    </div>
                </div>

                <footer className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!name || !description}>
                        <Save size={18} /> Perspective Skill
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AddSkillModal;

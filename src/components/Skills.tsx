import React, { useState } from 'react';
import { Plus, Code, Zap, Globe, MessageSquare } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import AddSkillModal from './AddSkillModal';

const Skills: React.FC = () => {
    const { skills, refreshData } = useData();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSkill, setEditingSkill] = useState<any | undefined>(undefined);

    const handleSaveSkill = async (skill: any) => {
        if (skill.id) {
            await api.updateSkill(skill);
        } else {
            await api.createSkill(skill);
        }
        setShowAddModal(false);
        setEditingSkill(undefined);
        refreshData();
    };

    const getIcon = (iconName: string) => {
        switch (iconName?.toLowerCase()) {
            case 'code': return Code;
            case 'zap': return Zap;
            case 'globe': return Globe;
            case 'messagesquare': return MessageSquare;
            default: return Zap;
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h2 className="page-title">Skills</h2>
                    <p className="page-subtitle">Define and configure specialized capabilities for Atlas.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18} /> Define New Skill
                </button>
            </header>

            <div className="skills-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                {skills.map(skill => {
                    const Icon = getIcon(skill.icon);
                    return (
                        <div key={skill.id} className="glass-card skill-card" style={{ padding: '1.5rem', transition: 'var(--transition)', cursor: 'pointer' }}>
                            <div className="skill-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="skill-icon-bg" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                    <Icon size={20} />
                                </div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{skill.name}</h4>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                                {skill.description}
                            </p>
                            <div className="skill-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{skill.instructionCount} instructions</span>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSkill(skill);
                                        setShowAddModal(true);
                                    }}
                                >
                                    Edit Logic
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

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

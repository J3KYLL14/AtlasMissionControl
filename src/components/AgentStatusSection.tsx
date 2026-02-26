import React from 'react';
import type { AgentStatus } from '../services/mockData';
import { FlaskConical } from 'lucide-react';
import './AgentStatusSection.css';

interface AgentStatusSectionProps {
    agent: AgentStatus;
    horizontal?: boolean;
}

const AgentStatusSection: React.FC<AgentStatusSectionProps> = ({ agent }) => {

    return (
        <div className="agent-status-section glass-card expanded-view">
            <div className="agent-split-layout">
                {/* Left column: Atlas info */}
                <div className="agent-left-col">
                    <div className="agent-main-info">
                        <div className="agent-avatar">
                            {agent.image ? (
                                <img src={agent.image} alt={agent.name} className="agent-avatar-img" />
                            ) : (
                                <FlaskConical size={32} />
                            )}
                            <div className={`status-dot ${agent.status}`}></div>
                        </div>
                        <div className="agent-details">
                            <div className="agent-header">
                                <h3 className="agent-name">{agent.name || 'Atlas'}</h3>
                                <div className="status-badge-inline">
                                    <span className={`status-dot-mini ${agent.status}`}></span>
                                    <span className={`status-text ${agent.status}`}>{agent.status.toUpperCase()}</span>
                                </div>
                            </div>
                            <p className="agent-message">{agent.message}</p>
                        </div>
                    </div>
                    <button className="btn btn-secondary ready-btn" style={{ alignSelf: 'stretch', marginTop: 'auto', textAlign: 'center' }}>Ready for tasks</button>
                </div>

                {/* Right column: Sub Agents roster */}
                <div className="agent-right-col">
                    <h4 className="sub-agents-heading">Sub Agents</h4>
                    <div className="sub-agents-roster">
                        {agent.subAgents.length === 0 && (
                            <p className="no-sub-agents">No active sub-agents</p>
                        )}
                        {agent.subAgents.map((sub) => (
                            <div key={sub.id} className="sub-agent-row">
                                <div className="sub-agent-row-left">
                                    <span className={`status-dot-mini ${sub.status}`}></span>
                                    <span className="sub-agent-row-name">{sub.name}</span>
                                </div>
                                {sub.task && <span className="sub-agent-row-task">{sub.task}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentStatusSection;

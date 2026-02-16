import React, { useState } from 'react';
import type { AgentStatus, SubAgent } from '../services/mockData';
import { ChevronDown, ChevronUp, User, Bot, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import './AgentStatusSection.css';

interface AgentStatusSectionProps {
    agent: AgentStatus;
    horizontal?: boolean;
}

const AgentStatusSection: React.FC<AgentStatusSectionProps> = ({ agent, horizontal }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getStatusIcon = (status: SubAgent['status']) => {
        switch (status) {
            case 'active': return <CheckCircle size={14} className="text-success" />;
            case 'idle': return <Clock size={14} className="text-muted" />;
            case 'error': return <AlertCircle size={14} className="text-error" />;
            default: return null;
        }
    };

    return (
        <div className={`agent-status-section glass-card ${horizontal ? 'horizontal' : ''}`}>
            <div className="agent-main-info">
                <div className="agent-avatar">
                    <Bot size={28} />
                    <div className={`status-dot ${agent.status}`}></div>
                </div>
                <div className="agent-details">
                    <div className="agent-header">
                        <h3 className="agent-name">{agent.name}</h3>
                        <span className={`status-text ${agent.status}`}>{agent.status.toUpperCase()}</span>
                    </div>
                    {!horizontal && <p className="agent-message">{agent.message}</p>}
                </div>
                {!horizontal && <button className="btn btn-secondary ready-btn">Ready for tasks</button>}
            </div>

            <div className={`sub-agents-accordion ${horizontal ? 'condensed' : ''}`}>
                <button
                    className="accordion-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    disabled={horizontal && !isExpanded}
                >
                    <span className="toggle-label">Sub-Agents ({agent.subAgents.length})</span>
                    {!horizontal && (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                </button>

                {(isExpanded || horizontal) && (
                    <div className="sub-agents-list">
                        {agent.subAgents.map((sub) => (
                            <div key={sub.id} className="sub-agent-item" title={sub.task}>
                                <div className="sub-agent-info">
                                    <User size={14} />
                                    <span className="sub-agent-name">{sub.name}</span>
                                </div>
                                <div className="sub-agent-status">
                                    {!horizontal && sub.task && <span className="sub-agent-task">{sub.task}</span>}
                                    {getStatusIcon(sub.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentStatusSection;

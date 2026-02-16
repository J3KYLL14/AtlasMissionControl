import { useState } from 'react';
import { Search, Filter, Reply, Clock, Zap, Eye, EyeOff } from 'lucide-react';
import { mockMessages } from '../services/mockData';
import './Inbox.css';

const Inbox: React.FC = () => {
    const messages = mockMessages;
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

    const toggleReveal = (id: string) => {
        const next = new Set(revealedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setRevealedIds(next);
    };

    const redact = (text: string) => {
        return text.replace(/\b[A-Za-z0-9-_]{20,}\b/g, '[REDACTED TOKEN]');
    };

    return (
        <div className="page-container">
            <header className="page-header inbox-header">
                <div>
                    <h2 className="page-title">Operational Inbox</h2>
                    <p className="page-subtitle">Unified message stream with redaction & quick actions.</p>
                </div>
                <div className="inbox-controls">
                    <div className="search-wrapper glass">
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Filter messages..." />
                    </div>
                    <button className="btn btn-secondary">
                        <Filter size={18} /> Filters
                    </button>
                </div>
            </header>

            <div className="message-list">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-item glass-card ${msg.isMention ? 'mention' : ''}`}>
                        <div className="msg-sidebar">
                            <div className="msg-avatar">{msg.sender[0]}</div>
                            <div className="msg-line"></div>
                        </div>

                        <div className="msg-main">
                            <div className="msg-header">
                                <span className="msg-sender">{msg.sender}</span>
                                <span className="msg-channel">via {msg.channelId.includes('dc') ? 'Discord' : 'WhatsApp'}</span>
                                {msg.isMention && <span className="mention-badge">Mention</span>}
                                <span className="msg-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>

                            <div className="msg-body">
                                {revealedIds.has(msg.id) ? (
                                    <p>{redact(msg.content)}</p>
                                ) : (
                                    <div className="blurred-content" onClick={() => toggleReveal(msg.id)}>
                                        <span className="blur-text">{msg.content.substring(0, 10)}... [Click to reveal]</span>
                                    </div>
                                )}
                            </div>

                            <div className="msg-actions">
                                <button className="msg-action-btn">
                                    <Reply size={16} /> Reply
                                </button>
                                <button className="msg-action-btn">
                                    <Clock size={16} /> Remind
                                </button>
                                <button className="msg-action-btn primary-action">
                                    <Zap size={16} /> Escalate to Agent
                                </button>
                                <button className="reveal-toggle" onClick={() => toggleReveal(msg.id)}>
                                    {revealedIds.has(msg.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Inbox;

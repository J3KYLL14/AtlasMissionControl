import { useState } from 'react';
import { Radio, ShieldCheck, AlertCircle, Send, RefreshCw } from 'lucide-react';
import { mockChannels } from '../services/mockData';
import './Channels.css';

const Channels: React.FC = () => {
    const channels = mockChannels;
    const [testingId, setTestingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const handleTest = (id: string) => {
        setTestingId(id);
        // Simulate a test process
        setTimeout(() => {
            setTestingId(null);
            alert(`${id} communication test: SUCCESS (Ping: 42ms)`);
        }, 1500);
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h2 className="page-title">Channels & Integrations</h2>
                <p className="page-subtitle">Manage your connections to external platforms.</p>
            </header>

            <div className="channels-grid">
                {channels.map((channel) => (
                    <div key={channel.id} className="glass-card channel-card">
                        <div className="channel-header">
                            <div className={`channel-icon-bg ${channel.type}`}>
                                <Radio size={24} />
                            </div>
                            <div className="channel-meta">
                                <h3 className="channel-name">{channel.name}</h3>
                                <span className="channel-type">{channel.type.toUpperCase()}</span>
                            </div>
                            <div className={`status-pill ${channel.status === 'connected' ? 'status-online' : 'status-offline'}`}>
                                {channel.status}
                            </div>
                        </div>

                        <div className="channel-details">
                            <div className="detail-item">
                                <span className="detail-label">Last Inbound</span>
                                <span className="detail-value">{new Date(channel.lastInboundAt).toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Last Outbound</span>
                                <span className="detail-value">{new Date(channel.lastOutboundAt).toLocaleString()}</span>
                            </div>
                            {channel.errorText && (
                                <div className="channel-error">
                                    <AlertCircle size={14} />
                                    <span>{channel.errorText}</span>
                                </div>
                            )}
                        </div>

                        <div className="channel-actions">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => handleTest(channel.id)}
                                disabled={testingId === channel.id}
                            >
                                {testingId === channel.id ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                ) : (
                                    <ShieldCheck size={16} />
                                )}
                                Verify
                            </button>
                            <button className="btn btn-primary">
                                <Send size={16} /> Send Test
                            </button>
                        </div>
                    </div>
                ))}

                <div className="glass-card add-channel-card" onClick={() => setShowAddModal(true)}>
                    <div className="add-icon">+</div>
                    <p>Add New Integration</p>
                </div>
            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <header className="modal-header">
                            <h3>Add New Integration</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </header>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Platform</label>
                                <select className="form-select">
                                    <option>Discord</option>
                                    <option>WhatsApp (Twilio)</option>
                                    <option>Telegram Bot</option>
                                    <option>Slack</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Connection Name</label>
                                <input type="text" className="form-input" placeholder="e.g. Operations Bot" />
                            </div>
                            <div className="form-group">
                                <label>API Key / Token</label>
                                <input type="password" className="form-input" placeholder="Paste your token here..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => {
                                alert("Agent 'Atlas' is now configuring the new gateway connection...");
                                setShowAddModal(false);
                            }}>
                                Connect Integration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Channels;

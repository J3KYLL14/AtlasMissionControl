import { useEffect, useState } from 'react';
import { Radio, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import './Channels.css';

interface Channel {
    id: string;
    name: string;
    type: string;
    status: string;
    lastActivityAt: string | null;
    detail: string | null;
}

const Channels: React.FC = () => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getChannels()
            .then(setChannels)
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page-container">
            <header className="page-header">
                <h2 className="page-title">Channels & Integrations</h2>
                <p className="page-subtitle">Active connections to external platforms.</p>
            </header>

            {loading && <p className="page-subtitle">Loading channels...</p>}

            {error && (
                <div className="channel-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && channels.length === 0 && (
                <p className="page-subtitle">No active channels configured.</p>
            )}

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
                                <span className="detail-label">Last Activity</span>
                                <span className="detail-value">
                                    {channel.lastActivityAt
                                        ? new Date(channel.lastActivityAt).toLocaleString()
                                        : '—'}
                                </span>
                            </div>
                            {channel.detail && (
                                <div className="detail-item">
                                    <span className="detail-label">Detail</span>
                                    <span className="detail-value">{channel.detail}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Channels;

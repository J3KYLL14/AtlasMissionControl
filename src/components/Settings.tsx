import React, { useState } from 'react';
import { User, Shield, Palette, Globe, Save } from 'lucide-react';
import './Pages.css';

const Settings: React.FC = () => {
    const [theme, setTheme] = useState('dark');
    const [agentName, setAgentName] = useState('Atlas');

    return (
        <div className="page-container">
            <header className="page-header">
                <h2 className="page-title">Settings</h2>
                <p className="page-subtitle">Configure your Mission Control environment and Agent preferences.</p>
            </header>

            <div className="settings-grid">
                <section className="glass-card settings-section">
                    <div className="section-header">
                        <User size={20} className="text-accent" />
                        <h3>User Profile</h3>
                    </div>
                    <div className="settings-content">
                        <div className="form-group">
                            <label>Display Name</label>
                            <input type="text" className="form-input" defaultValue="Ben" />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" className="form-input" defaultValue="ben@example.com" />
                        </div>
                    </div>
                </section>

                <section className="glass-card settings-section">
                    <div className="section-header">
                        <Shield size={20} className="text-accent" />
                        <h3>Agent Configuration</h3>
                    </div>
                    <div className="settings-content">
                        <div className="form-group">
                            <label>Agent Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Agent Personality</label>
                            <select className="form-select">
                                <option>Professional & Precise</option>
                                <option>Casual & Friendly</option>
                                <option>Concise & Direct</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section className="glass-card settings-section">
                    <div className="section-header">
                        <Palette size={20} className="text-accent" />
                        <h3>Appearance</h3>
                    </div>
                    <div className="settings-content">
                        <div className="form-group">
                            <label>Theme</label>
                            <div className="theme-toggle">
                                <button
                                    className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    Dark
                                </button>
                                <button
                                    className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setTheme('light')}
                                >
                                    Light (Coming Soon)
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="glass-card settings-section">
                    <div className="section-header">
                        <Globe size={20} className="text-accent" />
                        <h3>Gateway Settings</h3>
                    </div>
                    <div className="settings-content">
                        <div className="form-group">
                            <label>Gateway URL</label>
                            <input type="text" className="form-input" defaultValue="https://gateway.missioncontrol.io" />
                        </div>
                        <div className="checkbox-row">
                            <label className="checkbox-group">
                                <input type="checkbox" defaultChecked />
                                <span className="checkbox-label">Auto-reconnect on disconnect</span>
                            </label>
                        </div>
                    </div>
                </section>
            </div>

            <footer className="settings-footer">
                <button className="btn btn-primary">
                    <Save size={18} /> Save All Changes
                </button>
            </footer>
        </div>
    );
};

export default Settings;

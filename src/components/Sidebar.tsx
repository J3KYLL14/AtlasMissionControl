import React from 'react';
import { LayoutDashboard, LayoutGrid, Radio, MessageSquare, Clock, Zap, History, Settings, ChevronRight } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
    const navItems = [
        { id: 'overview', name: 'Overview', icon: LayoutDashboard },
        { id: 'matrix', name: 'Matrix', icon: LayoutGrid },
        { id: 'channels', name: 'Channels', icon: Radio },
        { id: 'inbox', name: 'Inbox', icon: MessageSquare },
        { id: 'cron', name: 'Cron & Reminders', icon: Clock },
        { id: 'runbooks', name: 'Runbooks', icon: Zap },
        { id: 'logs', name: 'Audit Logs', icon: History },
        { id: 'settings', name: 'Settings', icon: Settings },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="logo-container">
                    <div className="logo-icon">
                        <Zap size={24} fill="var(--accent-primary)" stroke="var(--accent-primary)" />
                    </div>
                    <h1 className="logo-text">Mission Control</h1>
                </div>
            </div>

            <div className="sidebar-agent-section">
                <div className="agent-profile">
                    <div className="agent-avatar-large">
                        <span className="avatar-emoji">🔱</span>
                        <div className="status-dot-inner idle"></div>
                    </div>
                    <div className="agent-profile-info">
                        <span className="agent-display-name">Atlas</span>
                        <div className="agent-display-status">
                            <span className="dot"></span>
                            <span className="status-label">Idle</span>
                        </div>
                    </div>
                    <button className="ready-status-btn">Ready for tasks</button>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setActivePage(item.id)}
                        >
                            <Icon size={20} className="nav-icon" />
                            <span className="nav-name">{item.name}</span>
                            {isActive && <ChevronRight size={16} className="active-indicator" />}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;

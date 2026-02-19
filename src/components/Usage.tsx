import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, DollarSign, TrendingUp } from 'lucide-react';
import './Usage.css';


interface UsageDataPoint {
    date: string;
    spend: number;
    calls: number;
}

const UsagePage: React.FC = () => {
    // We'll use local state for now, but ideally this would be in DataContext if widely used
    const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalSpend, setTotalSpend] = useState(0);

    const fetchUsage = async () => {
        setLoading(true);
        try {
            // In a real implementation, this would fetch from /api/usage
            // For now, we simulate a fetch that returns data "from OpenClaw"
            const response = await fetch('/api/usage');
            const data = await response.json();
            setUsageData(data.history || []);
            setTotalSpend(data.totalSpend || 0);
        } catch (error) {
            console.error("Failed to fetch usage data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsage();
    }, []);

    // Calculate max value for chart scaling
    const maxSpend = Math.max(...usageData.map(d => d.spend), 1);

    return (
        <div className="page-container">
            <header className="page-header usage-header">
                <div>
                    <h2 className="page-title">API Usage & Billing</h2>
                    <p className="page-subtitle">OpenClaw system resource consumption and cost analysis.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchUsage} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                    <div className="last-synced">
                        Synced via OpenClaw
                    </div>
                </div>
            </header>

            <div className="usage-stats-grid">
                <div className="glass-card stat-card">
                    <div className="stat-icon-wrapper">
                        <DollarSign size={24} className="text-accent" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Spend (Month)</span>
                        <span className="stat-value">${totalSpend.toFixed(2)}</span>
                    </div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-icon-wrapper">
                        <Activity size={24} className="text-blue" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total API Calls</span>
                        <span className="stat-value">{usageData.reduce((acc, curr) => acc + curr.calls, 0).toLocaleString()}</span>
                    </div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-icon-wrapper">
                        <TrendingUp size={24} className="text-green" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Projected Spend</span>
                        <span className="stat-value">${(totalSpend * 1.2).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="glass-card chart-container">
                <h3 className="chart-title">Daily Spend (USD)</h3>
                <div className="bar-chart">
                    {usageData.length === 0 ? (
                        <div className="no-data">No usage data available</div>
                    ) : (
                        usageData.map((point, index) => (
                            <div key={index} className="chart-column">
                                <div className="bar-wrapper">
                                    <div
                                        className="bar-fill"
                                        style={{ height: `${(point.spend / maxSpend) * 100}%` }}
                                        title={`$${point.spend.toFixed(2)} - ${point.calls} calls`}
                                    ></div>
                                </div>
                                <span className="chart-label">{new Date(point.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UsagePage;

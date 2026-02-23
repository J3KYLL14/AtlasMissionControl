import React, { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'missioncontrol',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            onLogin();
        } catch {
            setError('Unable to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.backdrop}>
            <div style={styles.card}>
                <div style={styles.logoRow}>
                    <div style={styles.iconWrap}>
                        <Shield size={28} color="var(--accent-primary)" />
                    </div>
                    <div>
                        <h1 style={styles.title}>Mission Control</h1>
                        <p style={styles.subtitle}>Secure access portal</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                            required
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Password</label>
                        <div style={styles.passwordWrap}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                autoComplete="current-password"
                                required
                                style={{ ...styles.input, paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                style={styles.eyeBtn}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} style={styles.submitBtn}>
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <p style={styles.footer}>Atlas v1.0 &mdash; Restricted access</p>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-deep)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '2.5rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    },
    logoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
    },
    iconWrap: {
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        background: 'rgba(20,184,166,0.1)',
        border: '1px solid rgba(20,184,166,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    title: {
        fontSize: '1.35rem',
        fontWeight: 700,
        fontFamily: "'Outfit', sans-serif",
        color: 'var(--text-main)',
        margin: 0,
    },
    subtitle: {
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginTop: '2px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    label: {
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    input: {
        width: '100%',
        padding: '0.75rem 1rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    },
    passwordWrap: {
        position: 'relative',
    },
    eyeBtn: {
        position: 'absolute',
        right: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'flex',
        alignItems: 'center',
    },
    error: {
        fontSize: '0.85rem',
        color: 'var(--error)',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '8px',
        padding: '0.6rem 0.9rem',
        margin: 0,
    },
    submitBtn: {
        marginTop: '0.25rem',
        padding: '0.8rem',
        background: 'var(--accent-gradient)',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.95rem',
        cursor: 'pointer',
        transition: 'opacity 0.2s',
    },
    footer: {
        marginTop: '1.75rem',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
    },
};

export default Login;

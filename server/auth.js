
import { readData, writeData } from './store.js';
import crypto from 'crypto';

const sha512 = (str) => crypto.createHash('sha512').update(str).digest('hex');

// Pre-computed hashes — never store plaintext credentials
const USERS = {
    ben: {
        username: 'ben',
        // SHA-512 of 'Hurstpierpoint1!'
        passwordHash: '90c3973184dd5868555c4b69a5efde842d547d84e5684dd2cf7b2fc9d3416556cb9985c3afa40da8b4ed0cecbeb449aedd486cc188aa014dc20b2359423e62db',
        role: 'admin',
    },
};

// SHA-512 of the agent's plaintext token
const AGENT_TOKEN_HASH = '3c43295a39d664ceadad4ed1685deb46e85c1f1787d4ca10bcf8426451abb6149091ee48ad65af4da345c56907b2f81f67fa2c3bb74029b310811e715268b85b';

// In-memory sessions: token -> { username, role, expires }
// Load initial sessions from disk
const storedSessions = readData('sessions') || {};
const sessions = new Map(Object.entries(storedSessions));

// Cleanup expired sessions on load
for (const [token, session] of sessions) {
    if (Date.now() > session.expires) {
        sessions.delete(token);
    }
}
// Save clean state
writeData('sessions', Object.fromEntries(sessions));


const saveSessions = () => {
    writeData('sessions', Object.fromEntries(sessions));
};

export const login = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = USERS[username.toLowerCase()];
    if (!user || sha512(password) !== user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    sessions.set(token, { username: user.username, role: user.role, expires });
    saveSessions();

    res.json({ token, username: user.username, role: user.role });
};

export const logout = (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            sessions.delete(token);
            saveSessions();
        }
    }
    res.json({ ok: true });
};

// Shared token validation used by both HTTP middleware and WebSocket auth
export const validateToken = (token) => {
    if (!token) return null;

    // Agent token check
    if (sha512(token) === AGENT_TOKEN_HASH) {
        return { username: 'agent', role: 'agent' };
    }

    // Session check
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expires) {
        sessions.delete(token);
        saveSessions();
        return null;
    }
    return { username: session.username, role: session.role };
};

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const user = validateToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
};

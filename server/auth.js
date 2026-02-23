import { readData, writeData } from './store.js';
import crypto from 'crypto';

const sha512 = (str) => crypto.createHash('sha512').update(str).digest('hex');

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'ben').trim().toLowerCase();
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || '').trim();
const LEGACY_PASSWORD_HASH = '90c3973184dd5868555c4b69a5efde842d547d84e5684dd2cf7b2fc9d3416556cb9985c3afa40da8b4ed0cecbeb449aedd486cc188aa014dc20b2359423e62db';
const SESSION_TTL_MS = Math.max(1, Number(process.env.SESSION_TTL_HOURS || 24)) * 60 * 60 * 1000;

const AGENT_TOKEN_HASH =
    (process.env.AGENT_TOKEN_HASH || '').trim() ||
    ((process.env.AGENT_TOKEN || '').trim() ? sha512(process.env.AGENT_TOKEN.trim()) : '');

const users = {
    [ADMIN_USERNAME]: {
        username: ADMIN_USERNAME,
        passwordHash: ADMIN_PASSWORD_HASH || LEGACY_PASSWORD_HASH,
        role: 'admin',
    },
};

if (!ADMIN_PASSWORD_HASH) {
    console.warn('ADMIN_PASSWORD_HASH is not set. Using legacy fallback hash. Set ADMIN_PASSWORD_HASH before production.');
}
if (!AGENT_TOKEN_HASH) {
    console.warn('AGENT_TOKEN_HASH/AGENT_TOKEN is not set. Agent token authentication is disabled.');
}

// In-memory sessions: token -> { username, role, expires }
const storedSessions = readData('sessions') || {};
const sessions = new Map(Object.entries(storedSessions));

// Basic per-IP login throttling to reduce brute-force attempts.
const failedLoginByIp = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

for (const [token, session] of sessions) {
    if (Date.now() > session.expires) {
        sessions.delete(token);
    }
}
writeData('sessions', Object.fromEntries(sessions));

const saveSessions = () => writeData('sessions', Object.fromEntries(sessions));

const SESSION_COOKIE_NAME = 'mc_session';

const getClientIp = (req) =>
    (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || req.ip || 'unknown').trim();

const isLockedOut = (ip) => {
    const entry = failedLoginByIp.get(ip);
    if (!entry) return false;
    if (entry.lockUntil && entry.lockUntil > Date.now()) return true;
    if (entry.windowStart + LOGIN_WINDOW_MS < Date.now()) {
        failedLoginByIp.delete(ip);
        return false;
    }
    return false;
};

const recordFailedLogin = (ip) => {
    const now = Date.now();
    const current = failedLoginByIp.get(ip);
    if (!current || current.windowStart + LOGIN_WINDOW_MS < now) {
        failedLoginByIp.set(ip, { count: 1, windowStart: now, lockUntil: 0 });
        return;
    }
    current.count += 1;
    if (current.count >= LOGIN_MAX_ATTEMPTS) {
        current.lockUntil = now + LOGIN_LOCK_MS;
    }
    failedLoginByIp.set(ip, current);
};

const clearFailedLogin = (ip) => failedLoginByIp.delete(ip);

const parseCookies = (cookieHeader) => {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach((part) => {
        const [key, ...rest] = part.split('=');
        if (!key || rest.length === 0) return;
        cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
    });
    return cookies;
};

export const extractTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token) return token;
    }
    const cookies = parseCookies(req.headers.cookie || '');
    return cookies[SESSION_COOKIE_NAME] || null;
};

const setSessionCookie = (res, token) => {
    const isProd = process.env.NODE_ENV === 'production';
    const attrs = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ];
    if (isProd) attrs.push('Secure');
    res.setHeader('Set-Cookie', attrs.join('; '));
};

const clearSessionCookie = (res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const attrs = [
        `${SESSION_COOKIE_NAME}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0',
    ];
    if (isProd) attrs.push('Secure');
    res.setHeader('Set-Cookie', attrs.join('; '));
};

export const login = (req, res) => {
    const ip = getClientIp(req);
    if (isLockedOut(ip)) {
        return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }

    const username = req.body?.username?.toString()?.trim()?.toLowerCase();
    const password = req.body?.password?.toString();
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users[username];
    if (!user || sha512(password) !== user.passwordHash) {
        recordFailedLogin(ip);
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearFailedLogin(ip);
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + SESSION_TTL_MS;
    sessions.set(token, { username: user.username, role: user.role, expires });
    saveSessions();
    setSessionCookie(res, token);
    res.json({ token, username: user.username, role: user.role });
};

export const logout = (req, res) => {
    const token = extractTokenFromRequest(req);
    if (token) {
        sessions.delete(token);
        saveSessions();
    }
    clearSessionCookie(res);
    res.json({ ok: true });
};

export const validateToken = (token) => {
    if (!token) return null;

    if (AGENT_TOKEN_HASH && sha512(token) === AGENT_TOKEN_HASH) {
        return { username: 'agent', role: 'agent' };
    }

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
    const token = extractTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ error: 'No authorization header' });
    }
    const user = validateToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
};

export const getSessionUser = (req, res) => {
    const token = extractTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });
    const user = validateToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });
    return res.json({ username: user.username, role: user.role });
};

export const authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

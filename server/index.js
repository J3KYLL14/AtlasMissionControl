import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { URL } from 'url';
import cors from 'cors';
import crypto from 'crypto';
import { createRoutes } from './routes.js';
import { authenticate, getSessionUser, login, logout, validateToken } from './auth.js';
import { startCronRunner } from './cronRunner.js';

const app = express();
const port = process.env.PORT || 3002;
const env = process.env.NODE_ENV || 'development';

const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
);

const parseCookies = (cookieHeader = '') => {
    const cookies = {};
    cookieHeader.split(';').forEach((part) => {
        const [key, ...rest] = part.split('=');
        if (!key || rest.length === 0) return;
        cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
    });
    return cookies;
};

app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id']?.toString() || crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
});

app.use(
    cors({
        credentials: true,
        origin(origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.has(origin)) return callback(null, true);
            return callback(new Error('Origin not allowed'));
        },
    })
);
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (!unsafeMethod) return next();
    const xrw = req.headers['x-requested-with']?.toString();
    if (xrw !== 'missioncontrol') {
        return res.status(403).json({ error: 'Missing anti-CSRF header' });
    }
    return next();
});

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    next();
});

app.use((req, _res, next) => {
    console.log(
        JSON.stringify({
            level: 'info',
            ts: new Date().toISOString(),
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            ip: req.ip,
        })
    );
    next();
});

app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'missioncontrol', ts: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
    res.json({ ok: true, ready: true, ts: new Date().toISOString() });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const broadcast = (event, data) => {
    const message = JSON.stringify({ event, data });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(message);
    });
};

wss.on('connection', (ws, req) => {
    try {
        const { searchParams } = new URL(req.url, 'http://localhost');
        const queryToken = searchParams.get('token');
        const cookieToken = parseCookies(req.headers.cookie || '').mc_session;
        const token = queryToken || cookieToken;
        const user = validateToken(token);
        if (!user) {
            ws.close(4001, 'Unauthorized');
            return;
        }

        ws.user = user;
        console.log(`WebSocket connected: ${user.username}`);
        ws.on('close', () => console.log(`WebSocket disconnected: ${user.username}`));
        ws.on('error', (err) => console.error('WebSocket error:', err.message));
    } catch {
        ws.close(4000, 'Bad request');
    }
});

app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/session', authenticate, getSessionUser);
app.use('/api', createRoutes(broadcast));

app.use((err, _req, res, _next) => {
    if (err?.message === 'Origin not allowed') {
        return res.status(403).json({ error: 'CORS origin rejected' });
    }
    console.error('Unhandled application error:', err);
    return res.status(500).json({ error: 'Internal server error' });
});

const onServerError = (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Run: lsof -ti :${port} | xargs kill -9`);
        process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
};

server.on('error', onServerError);
wss.on('error', onServerError);

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startCronRunner(broadcast);
});

const shutdown = () => {
    console.log('Shutting down server...');
    wss.close(() => {
        console.log('WebSocket server closed');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });

    setTimeout(() => {
        console.error('Forcing shutdown...');
        process.exit(1);
    }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

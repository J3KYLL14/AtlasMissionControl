
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { URL } from 'url';
import cors from 'cors';
import { createRoutes } from './routes.js';
import { login, logout, validateToken } from './auth.js';
import { startCronRunner } from './cronRunner.js';

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP Server
const server = createServer(app);

// Attach WebSocket server directly to the HTTP server so the handshake always
// completes — this prevents EPIPE in Vite's proxy when we reject via socket.destroy().
// Auth is enforced in the 'connection' handler instead, using WS close code 4001.
const wss = new WebSocketServer({ server, path: '/ws' });

// WebSocket Broadcast function
const broadcast = (event, data) => {
    const message = JSON.stringify({ event, data });
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
};

// WebSocket Connection Handler — validate token after handshake
wss.on('connection', (ws, req) => {
    try {
        const { searchParams } = new URL(req.url, `http://localhost`);
        const token = searchParams.get('token');
        const user = validateToken(token);

        if (!user) {
            // Close with 4001 (app-level auth failure) — no socket.destroy()
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

// Auth routes (no authentication required)
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);

// Protected routes
const router = createRoutes(broadcast);
app.use('/api', router);

// The ws library re-emits server errors on the wss instance, so we need handlers
// on BOTH to avoid an unhandled 'error' event crash.
const onServerError = (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Run: lsof -ti :${port} | xargs kill -9`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
};

server.on('error', onServerError);
wss.on('error', onServerError);

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startCronRunner(broadcast);
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down server...');
    wss.close(() => {
        console.log('WebSocket server closed');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });

    // Force exit if not closed within 5s
    setTimeout(() => {
        console.error('Forcing shutdown...');
        process.exit(1);
    }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

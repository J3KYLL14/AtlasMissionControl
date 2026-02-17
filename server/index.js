
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createRoutes } from './routes.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP Server
const server = createServer(app);

// Create WebSocket Server
const wss = new WebSocketServer({ server });

// WebSocket Broadcast function
const broadcast = (event, data) => {
    const message = JSON.stringify({ event, data });
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
};

// WebSocket Connection Handler
wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

// Routes
const router = createRoutes(broadcast);
app.use('/api', router);

// Start Server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

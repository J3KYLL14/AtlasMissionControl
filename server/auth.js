
const API_TOKEN = process.env.VITE_API_TOKEN || 'mission-control-token-123';

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== API_TOKEN) {
        return res.status(403).json({ error: 'Invalid API token' });
    }

    next();
};

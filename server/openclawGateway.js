import { readFileSync, existsSync } from 'fs';
import { randomUUID, createPrivateKey, createPublicKey, sign } from 'crypto';
import WebSocket from 'ws';

const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG || '/data/.openclaw/openclaw.json';
const OPENCLAW_PAIRED_DEVICES_PATH = process.env.OPENCLAW_PAIRED_DEVICES || '/data/.openclaw/devices/paired.json';
const OPENCLAW_DEVICE_IDENTITY_PATH = process.env.OPENCLAW_DEVICE_IDENTITY || '/data/.openclaw/identity/device.json';
const OPENCLAW_DEVICE_AUTH_PATH = process.env.OPENCLAW_DEVICE_AUTH || '/data/.openclaw/identity/device-auth.json';
const DEFAULT_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://172.18.0.1:47100';
const PROTOCOL_VERSION = 3;
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const asString = (v, max = 512) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const normalizeAgentId = (name) => (name || '').toLowerCase().replace(/\s+/g, '');

const readDefaultGatewayIp = () => {
    try {
        const content = readFileSync('/proc/net/route', 'utf8');
        const lines = content.split('\n').slice(1);
        for (const line of lines) {
            const cols = line.trim().split(/\s+/);
            if (cols.length < 3) continue;
            const destinationHex = cols[1];
            const gatewayHex = cols[2];
            if (destinationHex !== '00000000') continue;
            if (!/^[0-9A-Fa-f]{8}$/.test(gatewayHex)) continue;
            const octets = gatewayHex.match(/../g);
            if (!octets || octets.length !== 4) continue;
            return octets.reverse().map((o) => parseInt(o, 16)).join('.');
        }
    } catch {
        // Ignore read/parsing errors and fall back to static candidates.
    }
    return null;
};

const base64UrlEncode = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const safeReadJson = (p) => {
    if (!existsSync(p)) return null;
    try {
        return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
        return null;
    }
};

const safeReadConfig = () => safeReadJson(OPENCLAW_CONFIG_PATH);

const derivePublicKeyRawBase64Url = (publicKeyPem) => {
    const spki = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
    const raw = spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
        ? spki.subarray(ED25519_SPKI_PREFIX.length)
        : spki;
    return base64UrlEncode(raw);
};

const loadDeviceAuth = () => {
    const identity = safeReadJson(OPENCLAW_DEVICE_IDENTITY_PATH);
    const deviceAuthFile = safeReadJson(OPENCLAW_DEVICE_AUTH_PATH);
    const paired = safeReadJson(OPENCLAW_PAIRED_DEVICES_PATH);
    if (!identity?.deviceId || !identity?.privateKeyPem || !identity?.publicKeyPem) return null;

    const device = paired?.[identity.deviceId];
    const operatorToken = asString(
        deviceAuthFile?.tokens?.operator?.token
        || device?.tokens?.operator?.token,
        512
    );
    const scopes = Array.isArray(deviceAuthFile?.tokens?.operator?.scopes)
        ? deviceAuthFile.tokens.operator.scopes
        : (Array.isArray(device?.tokens?.operator?.scopes) ? device.tokens.operator.scopes : []);

    if (!operatorToken || !scopes.includes('operator.admin')) return null;

    return {
        deviceId: identity.deviceId,
        privateKeyPem: identity.privateKeyPem,
        publicKeyBase64Url: derivePublicKeyRawBase64Url(identity.publicKeyPem),
        token: operatorToken,
        scopes,
        clientId: asString(device?.clientId, 120) || 'cli',
        clientMode: asString(device?.clientMode, 120) || 'cli',
        platform: asString(device?.platform, 120) || 'linux',
    };
};

const buildDeviceAuthPayload = ({ deviceId, clientId, clientMode, role, scopes, signedAtMs, token, nonce }) => {
    const version = nonce ? 'v2' : 'v1';
    const base = [
        version,
        deviceId,
        clientId,
        clientMode,
        role,
        scopes.join(','),
        String(signedAtMs),
        token || '',
    ];
    if (nonce) base.push(nonce);
    return base.join('|');
};

const signDevicePayload = (privateKeyPem, payload) => {
    const key = createPrivateKey(privateKeyPem);
    const sig = sign(null, Buffer.from(payload, 'utf8'), key);
    return base64UrlEncode(sig);
};

const resolveGatewayConnection = () => {
    const cfg = safeReadConfig();
    const deviceAuth = loadDeviceAuth();
    const defaultGatewayIp = readDefaultGatewayIp();

    const configuredGatewayUrl = asString(process.env.OPENCLAW_GATEWAY_URL, 512);
    const gatewayToken = asString(
        process.env.OPENCLAW_GATEWAY_TOKEN
        || cfg?.gateway?.auth?.token
        || cfg?.proxy?.auth?.token,
        512
    );
    const gatewayUrls = [
        configuredGatewayUrl,
        defaultGatewayIp ? `ws://${defaultGatewayIp}:47100` : '',
        DEFAULT_GATEWAY_URL,
        'ws://172.17.0.1:47100',
        'ws://172.18.0.1:47100',
        'ws://172.19.0.1:47100',
    ].filter(Boolean);

    return {
        url: gatewayUrls[0],
        urls: [...new Set(gatewayUrls)],
        gatewayToken,
        deviceAuth,
    };
};

const resolveAgentId = (assignee) => {
    const normalized = normalizeAgentId(assignee);
    if (!normalized || normalized === 'atlas' || normalized === 'main') return 'main';

    const cfg = safeReadConfig();
    const list = Array.isArray(cfg?.agents?.list) ? cfg.agents.list : [];

    const byId = list.find((a) => normalizeAgentId(a?.id || '') === normalized);
    if (byId?.id) return byId.id;

    const byName = list.find((a) => normalizeAgentId(a?.name || '') === normalized);
    if (byName?.id) return byName.id;

    return normalized;
};

const callGatewayAtUrl = (url, method, params = {}, opts = {}, connection) => new Promise((resolve, reject) => {
    const timeoutMs = Math.max(1000, Number(opts.timeoutMs) || 15000);
    const ws = new WebSocket(url);
    const gatewayToken = connection.gatewayToken;
    const deviceAuth = connection.deviceAuth;

    const pending = new Map();
    let connectReqId = null;
    let connected = false;
    let closed = false;

    const cleanup = () => {
        if (closed) return;
        closed = true;
        try { ws.close(); } catch { /* noop */ }
    };

    const failAll = (err) => {
        for (const [, p] of pending) p.reject(err);
        pending.clear();
    };

    const sendReq = (reqMethod, reqParams, { expectFinal = false } = {}) => {
        const id = randomUUID();
        pending.set(id, { resolve, reject, expectFinal, method: reqMethod });
        ws.send(JSON.stringify({ type: 'req', id, method: reqMethod, params: reqParams || {} }));
        return id;
    };

    const sendConnect = (nonce) => {
        const role = 'operator';
        const scopes = Array.isArray(deviceAuth?.scopes) && deviceAuth.scopes.length
            ? deviceAuth.scopes
            : ['operator.admin', 'operator.approvals', 'operator.pairing', 'operator.write'];
        const clientId = asString(deviceAuth?.clientId, 120) || 'gateway-client';
        const clientMode = asString(deviceAuth?.clientMode, 120) || 'backend';
        const clientPlatform = asString(deviceAuth?.platform, 120) || 'linux';

        let authToken = gatewayToken;
        let device = undefined;

        if (deviceAuth?.token && deviceAuth?.privateKeyPem && deviceAuth?.publicKeyBase64Url && deviceAuth?.deviceId) {
            authToken = deviceAuth.token;
            const signedAt = Date.now();
            const payload = buildDeviceAuthPayload({
                deviceId: deviceAuth.deviceId,
                clientId,
                clientMode,
                role,
                scopes,
                signedAtMs: signedAt,
                token: authToken,
                nonce,
            });
            device = {
                id: deviceAuth.deviceId,
                publicKey: deviceAuth.publicKeyBase64Url,
                signature: signDevicePayload(deviceAuth.privateKeyPem, payload),
                signedAt,
                ...(nonce ? { nonce } : {}),
            };
        }

        const connectParams = {
            minProtocol: PROTOCOL_VERSION,
            maxProtocol: PROTOCOL_VERSION,
            client: {
                id: clientId,
                displayName: 'Mission Control Backend',
                version: '1.0.0',
                platform: clientPlatform,
                mode: clientMode,
                instanceId: randomUUID(),
            },
            caps: [],
            role,
            scopes,
            auth: authToken ? { token: authToken } : undefined,
            ...(device ? { device } : {}),
        };

        connectReqId = sendReq('connect', connectParams);
    };

    const timer = setTimeout(() => {
        const err = new Error(`OpenClaw gateway timeout calling ${method}`);
        failAll(err);
        cleanup();
        reject(err);
    }, timeoutMs);

    ws.on('open', () => {
        // With device auth enabled, gateway v3 expects nonce challenge first.
        if (!deviceAuth) sendConnect();
    });

    ws.on('message', (raw) => {
        let parsed = null;
        try {
            parsed = JSON.parse(String(raw));
        } catch {
            return;
        }

        const parsedType = asString(parsed?.type, 32).toLowerCase();
        if ((parsedType === 'evt' || parsedType === 'event') && parsed?.event === 'connect.challenge') {
            const nonce = asString(parsed?.payload?.nonce, 512);
            sendConnect(nonce || undefined);
            return;
        }

        if (!(parsedType === 'res' || parsedType === 'response') || typeof parsed.id !== 'string') return;

        const p = pending.get(parsed.id);
        if (!p) return;

        const status = parsed?.payload?.status;
        if (p.expectFinal && status === 'accepted') return;

        pending.delete(parsed.id);

        if (!parsed.ok) {
            const message = parsed?.error?.message || `OpenClaw ${p.method} failed`;
            // Gateway may require nonce-based device challenge before accepting connect.
            if (parsed.id === connectReqId && String(message).toLowerCase().includes('device nonce required')) {
                return;
            }
            const err = new Error(message);
            clearTimeout(timer);
            cleanup();
            p.reject(err);
            return;
        }

        if (parsed.id === connectReqId) {
            connected = true;
            sendReq(method, params, { expectFinal: opts.expectFinal === true });
            return;
        }

        clearTimeout(timer);
        cleanup();
        p.resolve(parsed.payload);
    });

    ws.on('error', (err) => {
        clearTimeout(timer);
        failAll(err instanceof Error ? err : new Error(String(err)));
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
    });

    ws.on('close', (code, reason) => {
        if (closed || !pending.size) return;
        clearTimeout(timer);
        const err = new Error(`OpenClaw gateway closed (${code}): ${String(reason || '')}`);
        failAll(err);
        cleanup();
        if (!connected) reject(err);
    });
});

const callGateway = async (method, params = {}, opts = {}) => {
    const connection = resolveGatewayConnection();
    const urls = Array.isArray(connection.urls) && connection.urls.length ? connection.urls : [connection.url];
    let lastErr = null;

    for (const url of urls) {
        try {
            return await callGatewayAtUrl(url, method, params, opts, connection);
        } catch (err) {
            lastErr = err;
        }
    }

    if (lastErr) throw lastErr;
    throw new Error(`OpenClaw gateway unavailable for ${method}`);
};

const buildTaskStartPrompt = (task) => {
    const lines = [
        'Mission Control task has been moved to inprogress. Start now.',
        `Task ID: ${task.id}`,
        `Title: ${task.title || 'Untitled task'}`,
    ];

    if (task.description) lines.push(`Description: ${task.description}`);
    if (task.implementationPlan) lines.push(`Implementation Plan:\n${task.implementationPlan}`);
    if (task.dueDate) lines.push(`Due Date: ${task.dueDate}`);

    lines.push('Requirements: keep scope to this task, produce concrete deliverables, and report blockers quickly.');
    lines.push('When done, update Mission Control status and markdownFiles for this specific task only.');

    return lines.join('\n\n');
};

export const triggerTaskStart = async (task) => {
    const assignee = asString(task?.assignee, 120);
    const status = asString(task?.status, 32).toLowerCase();
    if (!assignee || status !== 'inprogress') return { triggered: false, reason: 'task not startable' };

    const agentId = resolveAgentId(assignee);
    const idempotencyKey = `mc-task-start-${task.id || randomUUID()}-${Date.now()}`;

    const payload = await callGateway('agent', {
        agentId,
        message: buildTaskStartPrompt(task),
        idempotencyKey,
        deliver: false,
        timeout: 15000,
        label: `task-${task.id || 'unknown'}`,
    }, { timeoutMs: 20000, expectFinal: false });

    return {
        triggered: true,
        agentId,
        idempotencyKey,
        runId: payload?.runId || null,
        status: payload?.status || null,
    };
};

export const triggerOrchestratorRun = async (jobId = 'atlas-task-orchestrator-5min') => {
    const payload = await callGateway('cron.run', { id: jobId }, { timeoutMs: 15000, expectFinal: false });
    return {
        triggered: true,
        jobId,
        ran: !!payload?.ran,
    };
};

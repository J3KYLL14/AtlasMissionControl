# Mission Control Operations Runbook

## Backups

- Data files live in `server/data/*.json`.
- Skills live in `${HOME}/clawd/skills`.
- Create a timestamped backup:

```bash
mkdir -p backups
ts=$(date +%Y%m%d-%H%M%S)
tar -czf "backups/missioncontrol-${ts}.tar.gz" server/data "${HOME}/clawd/skills"
```

## Restore

- Stop the server first.
- Restore from a selected archive:

```bash
tar -xzf backups/missioncontrol-<timestamp>.tar.gz
```

- Validate restored JSON:

```bash
node -e "for (const f of require('fs').readdirSync('server/data')) { if (f.endsWith('.json')) JSON.parse(require('fs').readFileSync('server/data/' + f, 'utf8')); } console.log('JSON OK')"
```

## Secret Rotation

- Rotate these values on every incident response cycle:
- `ADMIN_PASSWORD_HASH`
- `AGENT_TOKEN_HASH` (or `AGENT_TOKEN`)
- `SESSION_TTL_HOURS` if policy changes
- Process:
1. Generate new values in your secret manager.
2. Deploy updated environment variables.
3. Restart service instances.
4. Invalidate sessions by deleting `server/data/sessions.json` and restarting.

## Health Monitoring

- Liveness endpoint: `GET /health`
- Readiness endpoint: `GET /ready`
- Track:
- Authentication failures (`401` and `429`)
- CORS rejections (`403` with `CORS origin rejected`)
- Cron failures in `server/data/cronHistory.json`

## Incident Triage

1. Capture last 500 lines of server logs.
2. Snapshot `server/data` and current environment configuration.
3. Check `/health` and `/ready`.
4. Verify login flow and websocket connection behavior.
5. If compromise suspected, rotate secrets and clear sessions immediately.

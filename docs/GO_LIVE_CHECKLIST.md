# Mission Control Go-Live Checklist

## Security

- Set `ADMIN_PASSWORD_HASH` to a non-default value.
- Set `AGENT_TOKEN_HASH` (or `AGENT_TOKEN`) if agent auth is required.
- Set `ALLOWED_ORIGINS` to production domains only.
- Confirm production runs with `NODE_ENV=production`.
- Confirm HTTPS termination is enabled.

## Reliability

- Verify `/health` and `/ready` endpoints in deployment.
- Enable log shipping and retention policy.
- Validate backup and restore commands from `docs/OPERATIONS.md`.
- Validate session invalidation process.

## Quality Gates

- `npm run lint`
- `npm test`
- `npm run build`
- CI pipeline green on main branch.

## Runtime Policy

- Set `CRON_ALLOWED_BINARIES` to the minimum required list.
- Verify all configured cron commands are allowlisted.
- Verify only admin users can mutate tasks, cron, agents, skills, and reminders.

## Frontend Auth

- Verify login sets secure cookie in production.
- Verify logout clears cookie and blocks protected API access.
- Verify browser refresh keeps session when cookie is valid.

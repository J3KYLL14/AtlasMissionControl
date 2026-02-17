# Mission Control API Documentation

## Overview
The Mission Control backend provides a RESTful API for managing tasks, cron jobs, agent status, and metrics. It also supports real-time updates via WebSockets.

**Base URL**: `http://localhost:3001/api` (Proxied via Vite at `/api` during dev)

## Authentication
All API requests must include the `Authorization` header with a Bearer token.
```
Authorization: Bearer mission-control-token-123
```

## Resources

### 1. Tasks
Manage Kanban board tasks.

*   `GET /tasks` - List all tasks.
*   `POST /tasks` - Create a new task.
*   `PUT /tasks` - Update an existing task.
*   `DELETE /tasks?id={id}` - Delete a task.

**Task Object Structure**:
```json
{
  "id": "uuid",
  "title": "Task Title",
  "status": "todo" | "inprogress" | "done" | "archived",
  "importance": 0-100,
  "urgency": 0-100,
  "date": "Creation Date String",
  "dueDate": "ISO Date String (Optional)",
  "description": "Optional description",
  "agentInstructions": "Optional instructions for agents"
}
```

### 2. Cron Jobs
Manage scheduled tasks and reminders.

*   `GET /cron` - List all jobs.
*   `POST /cron` - Create a job.
*   `PUT /cron` - Update a job (toggle enabled/disabled).
*   `DELETE /cron?id={id}` - Delete a job.

**Cron Job Object**:
```json
{
  "id": "uuid",
  "name": "Job Name",
  "schedule": "Cron Expression (e.g., 0 8 * * *)",
  "enabled": true,
  "lastRunStatus": "success" | "failed",
  "lastRunAt": "ISO Date",
  "nextRunAt": "ISO Date"
}
```

### 3. Agent Status
Read/Write the global agent status.

*   `GET /status` - Get current status.
*   `PUT /status` - Update status.

**Status Object**:
```json
{
  "name": "Agent Name",
  "status": "idle" | "busy" | "offline",
  "message": "Current activity message",
  "subAgents": []
}
```

### 4. Metrics
Read/Write core dashboard metrics.

*   `GET /metrics` - Get metrics.
*   `PUT /metrics` - Update metrics.

### 5. Sub-Agents
Manage autonomous sub-agent processes.

*   `GET /subAgents`
*   `POST /subAgents`
*   `PUT /subAgents`
*   `DELETE /subAgents?id={id}`

## Real-time Updates (WebSockets)
Connect to `ws://localhost:3001` to receive real-time updates.

**Events**:
*   `tasks_update`: Payload is the full list of tasks.
*   `status_update`: Payload is the new status object.
*   `metrics_update`: Payload is the new metrics object.
*   `cron_update`: Payload is the full list of cron jobs.
*   `subagents_update`: Payload is the full list of sub-agents.

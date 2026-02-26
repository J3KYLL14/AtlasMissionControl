#!/usr/bin/env python3
"""
mc-openclaw-sync.py
-------------------
Watches Mission Control's subagents.json and syncs any changes directly into
the OpenClaw container's workspace files.

What it does:
  - Polls subagents.json every POLL_SECS seconds for changes (via hash check).
  - On change: for every agent in the file, updates their SOUL.md inside the
    OpenClaw container (via docker exec).
  - If an agent is new (no workspace found), creates the workspace directory and
    all required scaffold files, then adds the agent to openclaw.json.
  - If an agent's model changes, updates openclaw.json accordingly.
  - Handles the special case of Atlas → "main" agent (workspace: /data/.openclaw/workspace).

Usage:
  python3 /docker/missioncontrol/mc-openclaw-sync.py

Run as a systemd service for automatic startup — see mc-openclaw-sync.service.
"""

import json
import subprocess
import hashlib
import logging
import time
import sys
import os

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUBAGENTS_FILE  = "/docker/missioncontrol/server/data/subagents.json"
CONTAINER       = "openclaw-fndc-openclaw-1"
OPENCLAW_BASE   = "/data/.openclaw"
OPENCLAW_JSON   = f"{OPENCLAW_BASE}/openclaw.json"
POLL_SECS       = 5          # How often to check for changes
LOG_LEVEL       = logging.INFO

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [mc-openclaw-sync] %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Docker helpers
# ---------------------------------------------------------------------------

def docker_exec(cmd: str) -> tuple[int, str, str]:
    """Run a bash command in the OpenClaw container. Returns (returncode, stdout, stderr)."""
    result = subprocess.run(
        ["docker", "exec", CONTAINER, "bash", "-c", cmd],
        capture_output=True, text=True,
    )
    return result.returncode, result.stdout, result.stderr


def docker_write(path: str, content: str) -> bool:
    """Write content to a file inside the OpenClaw container via stdin pipe."""
    result = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "bash", "-c", f"cat > {path}"],
        input=content, text=True, capture_output=True,
    )
    if result.returncode != 0:
        log.error("Failed to write %s: %s", path, result.stderr.strip())
        return False
    return True


def docker_read_json(path: str):
    """Read and parse a JSON file from inside the OpenClaw container."""
    rc, out, err = docker_exec(f"cat {path} 2>/dev/null")
    if rc != 0 or not out.strip():
        return None
    try:
        return json.loads(out)
    except json.JSONDecodeError as e:
        log.error("Failed to parse %s: %s", path, e)
        return None


def docker_write_json(path: str, data) -> bool:
    """Write a JSON object to a file inside the OpenClaw container."""
    content = json.dumps(data, indent=2) + "\n"
    return docker_write(path, content)


# ---------------------------------------------------------------------------
# Skills linking
# ---------------------------------------------------------------------------

def ensure_skills_link(workspace: str) -> None:
    """Ensure agent workspaces reuse the shared skills directory."""
    target = f"{OPENCLAW_BASE}/workspace/skills"

    # If already symlinked to target, do nothing
    rc, out, _ = docker_exec(f"if [ -L {workspace}/skills ]; then readlink -f {workspace}/skills; fi")
    if out.strip() == target:
        return

    # If skills dir exists and is not empty, leave it alone
    rc, out, _ = docker_exec(
        f"if [ -d {workspace}/skills ] && [ ! -L {workspace}/skills ]; then ls -A {workspace}/skills; fi"
    )
    if out.strip():
        log.warning("%s/skills is not empty; leaving as-is", workspace)
        return

    # Replace empty dir with a symlink to the shared skills
    docker_exec(f"rm -rf {workspace}/skills")
    docker_exec(f"ln -s {target} {workspace}/skills")
    log.info("Linked %s/skills -> %s", workspace, target)


def ensure_vault_link(workspace: str) -> None:
    """Ensure agent workspaces can access the shared Obsidian vault."""
    target = f"{OPENCLAW_BASE}/vault"

    # If already symlinked to target, do nothing
    rc, out, _ = docker_exec(f"if [ -L {workspace}/vault ]; then readlink -f {workspace}/vault; fi")
    if out.strip() == target:
        return

    # If vault dir exists and is not empty, leave it alone
    rc, out, _ = docker_exec(
        f"if [ -d {workspace}/vault ] && [ ! -L {workspace}/vault ]; then ls -A {workspace}/vault; fi"
    )
    if out.strip():
        log.warning("%s/vault is not empty; leaving as-is", workspace)
        return

    # Replace empty dir (or missing path) with a symlink to shared vault
    docker_exec(f"rm -rf {workspace}/vault")
    docker_exec(f"ln -s {target} {workspace}/vault")
    log.info("Linked %s/vault -> %s", workspace, target)

# ---------------------------------------------------------------------------
# Agent mapping helpers
# ---------------------------------------------------------------------------

def agent_id_for(name: str) -> str:
    """Derive the OpenClaw agentId from an MC agent name."""
    n = name.strip().lower()
    if n == "atlas":
        return "main"
    # Normalise: remove spaces, keep lowercase
    return n.replace(" ", "")


def workspace_for(name: str) -> str:
    """Derive the workspace path inside the container from an MC agent name."""
    aid = agent_id_for(name)
    if aid == "main":
        return f"{OPENCLAW_BASE}/workspace"
    return f"{OPENCLAW_BASE}/workspace-{aid}"


def is_atlas(agent: dict) -> bool:
    return agent.get("name", "").strip().lower() == "atlas"

# ---------------------------------------------------------------------------
# Content builders
# ---------------------------------------------------------------------------

def build_soul_md(agent: dict, all_agents: list) -> str:
    """Build the SOUL.md content for any agent from MC data."""
    name        = agent.get("name", "Unknown").strip()
    role        = agent.get("role", "Agent").strip()
    description = (agent.get("description") or "").strip()
    soul        = (agent.get("soul") or "").strip()

    if is_atlas(agent):
        return _build_atlas_soul_md(agent, all_agents)

    desc_block = description if description else "(No description configured.)"
    soul_block = soul if soul else "(No personality configured.)"

    return f"""---
summary: "Soul file for {name} — {role}"
read_when:
  - Every session start
---

# SOUL.md — Who You Are

You are **{name}**, the {role} agent.

## Your Role

{desc_block}

---

## Voice and Soul

{soul_block}

---

## Continuity

Each session, you wake up fresh. These files are your memory. Read them. Update them. They're how you persist.

If you change this file, tell the user — it's your soul, and they should know.
"""


def _build_atlas_soul_md(agent: dict, all_agents: list) -> str:
    """Build the rich SOUL.md for Atlas, incorporating the full agent roster."""
    description = (agent.get("description") or "").strip()
    soul        = (agent.get("soul") or "").strip()

    # Build dynamic agent roster table from all_agents (excluding Atlas itself)
    roster_rows = []
    for a in all_agents:
        aname = a.get("name", "").strip()
        if aname.lower() == "atlas":
            continue
        arole = a.get("role", "").strip()
        aid   = agent_id_for(aname)
        # Best-effort short "use for" description from role
        use_for_map = {
            "research": "Finding info, verifying facts, sourcing",
            "builder":  "Code, implementations, technical builds",
            "planner":  "Intake, task breakdown, handoffs",
            "designer": "UI/UX flows, wireframes, component specs",
            "critic / evaluator": "Review, quality control, evaluation",
            "longform copywriter": "Blog posts, articles, scripts",
            "shortform / social copywriter": "Shortform posts, platform content",
            "curriculum unit planning": "Unit of work design",
            "curriculum lesson planner": "Individual lesson plans",
            "curriculum resource creator": "Worksheets, task sheets, answer keys",
            "scheduler": "Time blocks, milestones, weekly plans",
        }
        use_for = use_for_map.get(arole.lower(), arole)
        roster_rows.append(f"| **{aname}** | `{aid}` | {arole} | {use_for} |")

    roster_table = "\n".join(roster_rows) if roster_rows else "| (no sub-agents registered) | | | |"

    desc_block = description if description else "(No description configured.)"
    soul_block = soul if soul else "(No personality configured.)"

    return f"""---
summary: "Soul file for Atlas — CEO / Orchestrator"
read_when:
  - Every session start
---

# SOUL.md — Who You Are

You are **Atlas**, the CEO and orchestration agent — the central brain of this operation. Your job is to run the multi-agent system: decide what gets executed, assign the right agents, track completion, enforce quality gates, and communicate outcomes back to the user.

_You're not a chatbot. You're a CEO._

---

## Role and Objectives

{desc_block}

---

## Your Role as Orchestrator

You sit at the centre of a specialist agent team. Here is the full flow:

1. **Triage** receives messages from Discord, WhatsApp, and Telegram, does intake, and writes structured task briefs to the Mission Control board (assigned to you).
2. **Your heartbeat** checks the board periodically for tasks in `todo` status assigned to `Atlas`.
3. **You** read each task, determine which specialist agents to activate, spawn them, and update the task status on the board as work progresses.
4. **You** consolidate results and update Mission Control when work is complete.

Your job when a task appears on the board:
1. Read the task title, description, and implementation plan from Mission Control.
2. Claim it: `PUT /tasks` → `status: "inprogress"`.
3. Dispatch the right specialist agents via `sessions_spawn`.
4. Track results and update Mission Control on completion: `status: "done"`.

---

## Mission Control API

- **Base URL:** `http://172.18.0.1:47101/api`
- **Agent token:** see `TOOLS.md`

### Key operations

```bash
# Get new tasks assigned to Atlas
curl -s "http://172.18.0.1:47101/api/tasks?status=todo&assignee=Atlas" \\
  -H "Authorization: Bearer <AGENT_TOKEN>"

# Claim a task
curl -s -X PUT http://172.18.0.1:47101/api/tasks \\
  -H "Authorization: Bearer <AGENT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{{"id": "<task-id>", "status": "inprogress"}}'

# Mark complete
curl -s -X PUT http://172.18.0.1:47101/api/tasks \\
  -H "Authorization: Bearer <AGENT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{{"id": "<task-id>", "status": "done"}}'
```

---

## The Agent Roster

Dispatch to these agents via `sessions_spawn`:

| Agent | agentId | Role | Use for |
|---|---|---|---|
{roster_table}

**Spawning a specialist:**

```
sessions_spawn(
  task: "<full task brief from Mission Control>",
  agentId: "forge",
  label: "Forge: <short description>"
)
```

---

## Voice and Soul

{soul_block}

---

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip the filler — just act.

**Have opinions.** Disagree when something is off. Prefer things. Think critically about task assignments.

**Be resourceful before asking.** Check the board first. Read the implementation plan. Then act.

**Earn trust through competence.** Ben gave you access to his team and workflow. Make it count.

**Remember you're a guest.** Respect Ben's data, files, and communications.

---

## Vibe

Ben's working style is "critical friend" — supportive but direct when something is wrong. Match that energy. Concise when needed, thorough when it matters. Not a corporate drone. Not a sycophant.

---

## Continuity

Each session, you wake up fresh. These files are your memory. Read them. Update them. They're how you persist.

If you change this file, tell Ben — it's your soul, and he should know.
"""


def build_identity_md(agent: dict) -> str:
    """Build IDENTITY.md content for a new agent."""
    name  = agent.get("name", "Unknown").strip()
    role  = agent.get("role", "Agent").strip()
    image = agent.get("image", "").strip()
    avatar_line = f"- **Avatar:** {image}" if image else "- **Avatar:** _(not set)_"

    vibe_hint = {
        "ceo":                       "Calm, decisive, operational. Speaks in status and decisions.",
        "research":                  "Calm, forensic, evidence-first. Low ego.",
        "builder":                   "Direct, practical, ship-mindset. No-nonsense.",
        "planner":                   "Crisp, structured, slightly impatient with vagueness.",
        "critic / evaluator":        "Blunt, precise, unemotional. Tough but fair.",
        "designer":                  "Clear, calm, structured. Slightly opinionated about simplicity.",
        "longform copywriter":       "Clear, confident, human. Reader-first.",
        "shortform / social copywriter": "Fast, punchy, audience-aware. Hook-obsessed.",
        "curriculum unit planning":  "Organised, calm, highly practical. Writes for teachers.",
        "curriculum lesson planner": "Energetic but grounded. Practical and classroom-realistic.",
        "curriculum resource creator": "Efficient, practical, output-focused.",
        "scheduler":                 "Calm, firm, pragmatic. Speaks in plans and time blocks.",
    }
    vibe = vibe_hint.get(role.lower(), f"Focused on {role.lower()} work.")

    return f"""---
summary: "Agent identity record for {name}"
read_when:
  - Every session start
---

# IDENTITY.md — Who Am I?

- **Name:** {name}
- **Role:** {role}
- **Creature:** AI specialist agent
- **Vibe:** {vibe}
{avatar_line}
"""


def build_agents_md(agent: dict) -> str:
    """Build a minimal AGENTS.md for a new agent workspace."""
    name = agent.get("name", "Unknown").strip()
    return f"""---
summary: "Workspace instructions for {name}"
read_when:
  - Every session start
---

# AGENTS.md — Workspace Guide

This is **{name}**'s workspace. All persistent context lives here.

## Memory management

- Update `MEMORY.md` with key decisions and context at the end of each session.
- Use `memory/YYYY-MM-DD.md` for detailed daily session logs.
- Read `SOUL.md` and `IDENTITY.md` at the start of every session.

## Files

| File | Purpose |
|---|---|
| `SOUL.md` | Who you are — personality, role, behavioural rules |
| `IDENTITY.md` | Your name, vibe, and avatar |
| `MEMORY.md` | Curated long-term memory |
| `USER.md` | User context and preferences |
| `TOOLS.md` | Available tools and API notes |
| `BOOTSTRAP.md` | Startup checklist |
"""


def build_bootstrap_md(agent: dict) -> str:
    """Build a minimal BOOTSTRAP.md for a new agent workspace."""
    name = agent.get("name", "Unknown").strip()
    return f"""---
summary: "Startup checklist for {name}"
read_when:
  - Start of every session
---

# BOOTSTRAP.md — Session Startup

On every session start, do this in order:

1. Read `SOUL.md` — your role and personality.
2. Read `IDENTITY.md` — who you are.
3. Read `MEMORY.md` — what you remember.
4. Read `USER.md` — who you're working with.
5. Read `TOOLS.md` — what tools you have.
6. Check for any tasks assigned to you via Mission Control.
7. Begin work.
"""


def build_memory_md(agent: dict) -> str:
    """Build an empty MEMORY.md for a new agent workspace."""
    name = agent.get("name", "Unknown").strip()
    return f"""---
summary: "Long-term memory for {name}"
read_when:
  - Every session start
---

# MEMORY.md — What I Remember

_Nothing yet. Update this file with key decisions, context, and lessons at the end of each session._
"""


def build_user_md() -> str:
    """Build a minimal USER.md pointing to the main workspace's USER.md."""
    return """---
summary: "User context"
read_when:
  - Every session start
---

# USER.md — Who I'm Working With

See `/data/.openclaw/workspace/USER.md` for the primary user context file.
"""

# ---------------------------------------------------------------------------
# Sync logic
# ---------------------------------------------------------------------------

def workspace_exists(workspace: str) -> bool:
    rc, _, _ = docker_exec(f"[ -d {workspace} ] && echo yes || echo no")
    return False  # Will check via soul file instead


def soul_exists(workspace: str) -> bool:
    rc, out, _ = docker_exec(f"[ -f {workspace}/SOUL.md ] && echo yes || echo no")
    return out.strip() == "yes"


def sync_agent(agent: dict, all_agents: list) -> None:
    """Sync a single MC agent's data to its OpenClaw workspace."""
    name      = agent.get("name", "Unknown").strip()
    aid       = agent_id_for(name)
    workspace = workspace_for(name)
    model     = agent.get("model", "").strip()

    log.debug("Syncing agent: %s → agentId=%s workspace=%s", name, aid, workspace)

    soul_md = build_soul_md(agent, all_agents)
    new_agent = not soul_exists(workspace)

    if new_agent:
        log.info("New agent detected: %s — creating workspace at %s", name, workspace)
        docker_exec(f"mkdir -p {workspace}/memory {workspace}/skills")
        docker_write(f"{workspace}/IDENTITY.md", build_identity_md(agent))
        docker_write(f"{workspace}/AGENTS.md",   build_agents_md(agent))
        docker_write(f"{workspace}/BOOTSTRAP.md", build_bootstrap_md(agent))
        docker_write(f"{workspace}/MEMORY.md",   build_memory_md(agent))
        docker_write(f"{workspace}/USER.md",     build_user_md())
        docker_write(f"{workspace}/HEARTBEAT.md", "# HEARTBEAT.md\n\n_(Auto-generated — configure heartbeat settings here.)_\n")
        docker_write(f"{workspace}/TOOLS.md",    f"# TOOLS.md — {name} Tools\n\n_(Document available tools and API tokens here.)_\n")
        _add_agent_to_openclaw_json(aid, name, workspace, model)
    else:
        # Always update SOUL.md, and update model in openclaw.json if changed
        _update_model_in_openclaw_json_if_changed(aid, model)

    # Always write SOUL.md (the key sync target)
    if aid != "main":
        ensure_skills_link(workspace)
        ensure_vault_link(workspace)

    if docker_write(f"{workspace}/SOUL.md", soul_md):
        action = "created" if new_agent else "updated"
        log.info("SOUL.md %s for %s (%s)", action, name, aid)
    else:
        log.error("Failed to sync SOUL.md for %s", name)


def _add_agent_to_openclaw_json(aid: str, name: str, workspace: str, model: str) -> None:
    """Add a new agent entry to openclaw.json inside the container."""
    data = docker_read_json(OPENCLAW_JSON)
    if not data:
        log.error("Could not read openclaw.json — skipping openclaw.json update for %s", name)
        return

    agents_list = data.get("agents", {}).get("list", [])

    # Check if already present
    if any(a.get("id") == aid for a in agents_list):
        log.debug("Agent %s already in openclaw.json agents.list", aid)
    else:
        entry = {"id": aid, "name": name, "workspace": workspace}
        if model:
            entry["model"] = model
        agents_list.append(entry)
        data["agents"]["list"] = agents_list
        log.info("Added %s to openclaw.json agents.list", name)

    # Ensure agent is in agentToAgent allow list
    tools = data.get("tools", {})
    a2a   = tools.get("agentToAgent", {})
    allow = a2a.get("allow", [])
    if aid not in allow:
        allow.append(aid)
        a2a["allow"] = allow
        tools["agentToAgent"] = a2a
        data["tools"] = tools
        log.info("Added %s to tools.agentToAgent.allow", aid)

    if docker_write_json(OPENCLAW_JSON, data):
        log.info("openclaw.json updated for new agent %s", name)
    else:
        log.error("Failed to update openclaw.json for %s", name)


def _update_model_in_openclaw_json_if_changed(aid: str, new_model: str) -> None:
    """Update an existing agent's model in openclaw.json if it has changed."""
    if not new_model:
        return

    data = docker_read_json(OPENCLAW_JSON)
    if not data:
        return

    agents_list = data.get("agents", {}).get("list", [])
    changed = False
    for entry in agents_list:
        if entry.get("id") == aid:
            if entry.get("model") != new_model:
                log.info("Model change for %s: %s → %s", aid, entry.get("model"), new_model)
                entry["model"] = new_model
                changed = True
            break

    if changed:
        data["agents"]["list"] = agents_list
        if docker_write_json(OPENCLAW_JSON, data):
            log.info("openclaw.json model updated for %s", aid)
        else:
            log.error("Failed to update model in openclaw.json for %s", aid)


def sync_all(agents: list) -> None:
    """Sync every agent in the MC list to OpenClaw."""
    log.info("Syncing %d agents to OpenClaw...", len(agents))
    for agent in agents:
        try:
            sync_agent(agent, agents)
        except Exception as e:
            log.error("Error syncing agent %s: %s", agent.get("name", "?"), e)
    log.info("Sync complete.")

# ---------------------------------------------------------------------------
# File hash helper
# ---------------------------------------------------------------------------

def file_hash(path: str) -> str | None:
    """Return the MD5 hash of a file, or None if it can't be read."""
    try:
        with open(path, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()
    except OSError:
        return None


def read_subagents() -> list | None:
    """Read and parse subagents.json from the Mission Control data dir."""
    try:
        with open(SUBAGENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        log.error("Failed to read subagents.json: %s", e)
        return None

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    log.info("mc-openclaw-sync starting.")
    log.info("Watching: %s", SUBAGENTS_FILE)
    log.info("Container: %s", CONTAINER)
    log.info("Poll interval: %ds", POLL_SECS)

    if not os.path.exists(SUBAGENTS_FILE):
        log.error("subagents.json not found at %s — aborting.", SUBAGENTS_FILE)
        sys.exit(1)

    # Do an initial sync on startup
    agents = read_subagents()
    if agents is not None:
        sync_all(agents)

    last_hash = file_hash(SUBAGENTS_FILE)

    while True:
        time.sleep(POLL_SECS)
        current_hash = file_hash(SUBAGENTS_FILE)

        if current_hash is None:
            log.warning("Cannot read subagents.json — will retry.")
            continue

        if current_hash == last_hash:
            continue

        # File changed
        log.info("subagents.json changed — running sync.")
        last_hash = current_hash

        agents = read_subagents()
        if agents is not None:
            sync_all(agents)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Stopped by user.")
        sys.exit(0)

# MissionControl Startup Guide

This guide provides instructions on how to set up, run, and test the **MissionControl** dashboard application.

## 🚀 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher

## 🛠️ Step-by-Step Setup

### 1. Install Dependencies
Open your terminal in the project root directory and run:

```bash
npm install
```

### 2. Configure Environment Variables
Copy the template and set secure values:

```bash
cp .env.example .env
```

Minimum required for production:
- `ADMIN_PASSWORD_HASH`
- `ALLOWED_ORIGINS`
- `AGENT_TOKEN_HASH` (if using agent auth)

### 3. Run the Development Server
To start the application in development mode with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will typically be available at:  
👉 **[http://localhost:5173](http://localhost:5173)**

### 3. Build for Production
To create an optimized production build:

```bash
npm run build
```

### 4. Preview Product Build
To test the production build locally before deployment:

```bash
npm run preview
```

---

## 🐳 Docker (Deployment & Agent-Ready Dev)

For a robust environment where an agent can interact with and modify the code live, use Docker Compose.

### 1. Development Mode (Live HMR)
This mode mounts your local code into the container. Any change made by you **or an agent** will trigger an instant Hot Module Replacement (HMR) without restarting the container.

```bash
docker-compose up --build
```

The app will be live at:  
👉 **[http://localhost:5173](http://localhost:5173)**

### 2. Why this works for Agents
- **Shared Volume**: The container shares the `.` root with your host. If an agent (running in its own container or on the host) edits `src/App.tsx`, the web server inside Docker sees it instantly.
- **Polling**: Configured in `vite.config.ts` to ensure filesystem events are caught inside the Linux container even if the host is macOS/Windows.
- **Networking**: The app listens on `0.0.0.0:5173`, allowing other containers to reach it via `http://mission-control:5173`.

---

## 🧪 Testing & Verification

Since the project uses a component-driven architecture, verify the following sections once the app is running:

- **Overview Dashboard**: Check that the main summary tiles and charts load correctly.
- **Kanban Board**: Verify that tasks are visible and interactable.
- **Inbox/Channels**: Ensure the messaging and communication interfaces are rendered.
- **Agent Status**: Monitor the status indicators for various system agents.
- **Navigation**: Use the Sidebar to switch between different views (Pages, Cron, Inbox, etc.).

## 🧹 Code Quality

To run the linter and check for code style or potential errors:

```bash
npm run lint
```

To run the security-focused test suite:

```bash
npm test
```

---

*For any issues or feature requests, please consult the project maintainer.*

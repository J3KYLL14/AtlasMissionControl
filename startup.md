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

### 2. Run the Development Server
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

---

*For any issues or feature requests, please consult the project maintainer.*

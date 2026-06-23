# PRM Tool — Project & Resource Management

A full-stack enterprise tool for managing employees, projects, allocations, and timesheets — with built-in AI assistance for skill matching, project risk analysis, and team building.

---

## What This Project Is About

PRM Tool is an internal platform for IT services companies to:

- **Manage employees** — profiles, skills, proficiency levels, and user accounts
- **Manage projects** — create projects, assign managers, track milestones and health status
- **Allocate resources** — assign employees to projects with utilisation percentages and date ranges
- **Track timesheets** — employees log weekly hours per project; managers view team submissions
- **AI assistance** — skill-match employees to project needs, generate project risk summaries, and build entire teams from a single natural-language prompt
- **Automate health checks** — a background scheduler flags project health (ON_TRACK / ATTENTION / AT_RISK), marks missed timesheets, and sends email reminders with account freeze on non-compliance

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, TypeScript |
| Database | MySQL 8 |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| AI | Pluggable LLM providers: Gemini, Groq, Gemma (self-hosted) |
| Scheduler | node-cron |
| Email | Nodemailer (SMTP) |
| Client | Node.js CLI (TypeScript, interactive terminal menus) |

---

## System Flow

```
User logs in (POST /api/auth/login)
        |
        v
JWT token returned with role embedded (ADMIN / MANAGER / RESOURCE)
        |
        v
Client sends token in every request header: Authorization: Bearer <token>
        |
        v
Server middleware:
  1. authenticate()        — verifies JWT, attaches req.user
  2. requirePermission()   — checks role against DB-loaded permission map
        |
        v
Controller → Service → Repository → MySQL
        |
        v
Response: { success: true, data: { ... } }
```

### Role Capabilities

| Role | Can Do |
|------|--------|
| **ADMIN** | Manage employees, create projects, manage skills, view/update system config, manage allocations |
| **MANAGER** | View dashboard, create/end allocations, view projects, view team timesheets, use AI features |
| **RESOURCE** | Submit timesheets, view own timesheets, view own allocations |

### Background Scheduler

Runs on a configurable interval (set via Admin config, minimum 1 minute):
1. **Flag Project Health** — marks projects as ON_TRACK, ATTENTION, or AT_RISK based on overdue milestones and logged effort
2. **Mark Missed Timesheets** — inserts MISSED records for allocated employees who did not submit last week (never marks the current week)
3. **Timesheet Reminders & Freeze** — sends email Reminder 1 → Reminder 2 → freezes submission access after two missed reminders; notifies employee and reporting manager

---

## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username + password, returns JWT token |
| POST | `/api/auth/change-password` | Change own password (requires old password) |
| POST | `/api/auth/force-change-password` | Set new password on first login |

---

### Admin — `/api/admin` *(requires ADMIN role)*

#### Employee Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/employees` | Create employee + user account |
| GET | `/api/admin/employees` | List all employees with accounts |
| PUT | `/api/admin/employees/:id/reset-password` | Reset an employee's password |
| PUT | `/api/admin/employees/:id/deactivate` | Deactivate employee account |
| PUT | `/api/admin/employees/:id/reactivate` | Reactivate employee account |

#### Employee Profile & Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/employees/:id` | Get employee profile detail |
| PUT | `/api/admin/employees/:id` | Update employee profile |
| GET | `/api/admin/employees/:id/skills` | List employee skills |
| POST | `/api/admin/employees/:id/skills` | Add a skill to employee |
| PUT | `/api/admin/employees/:id/skills/:skillId` | Update skill proficiency |
| DELETE | `/api/admin/employees/:id/skills/:skillId` | Remove a skill from employee |

#### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/projects` | List all projects |
| POST | `/api/admin/projects` | Create a new project |
| GET | `/api/admin/projects/:id` | Get project detail |
| PUT | `/api/admin/projects/:id` | Update project (name, status, manager, etc.) |
| GET | `/api/admin/projects/:id/milestones` | List project milestones |
| POST | `/api/admin/projects/:id/milestones` | Add a milestone |
| PUT | `/api/admin/projects/:id/milestones/:milestoneId` | Update milestone (status, due date) |

#### Allocations & Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/allocations` | View all allocations across all projects |
| GET | `/api/admin/config` | View system configuration (LLM provider, max hours, etc.) |
| PUT | `/api/admin/config` | Update system configuration |

---

### Manager — `/api/manager` *(requires MANAGER role)*

#### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manager/dashboard` | Manager dashboard — team overview, project health |
| GET | `/api/manager/dashboard/employees/:id` | Detailed view of a specific employee |

#### Allocations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/manager/allocations` | Allocate an employee to a project with utilisation % |
| PUT | `/api/manager/allocations/:id/end` | End an active allocation |
| GET | `/api/manager/projects/:id/allocations` | View all allocations for a project |

#### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manager/projects` | List all projects |
| GET | `/api/manager/projects/:id` | Get project detail |

#### Timesheets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manager/timesheets?week=YYYY-MM-DD` | View team timesheets for a given week |

#### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/manager/ai/skill-match` | Find best-matched employees for a skill requirement |
| POST | `/api/manager/ai/risk-summary` | Generate plain-English project risk summary |
| POST | `/api/manager/ai/team-match` | Build an entire team from a natural-language prompt |

---

### Resource — `/api/resource` *(requires RESOURCE role)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resource/timesheets` | Submit weekly timesheet with hours per project |
| GET | `/api/resource/timesheets` | View own timesheet history (includes IN_PROGRESS for current week) |
| GET | `/api/resource/timesheets/:id` | View a specific timesheet with entries |
| GET | `/api/resource/allocations` | View own active allocations |

---

## How AI Is Implemented

The AI layer follows an **enterprise pattern**: the LLM is used only for parsing unstructured input and generating narrative output — all business logic and data matching is done deterministically in the service layer.

### Three AI Features

#### 1. Skill Match
- Manager sends a skill + proficiency requirement
- Service queries all employees from DB, builds a structured JSON context
- LLM receives the JSON and returns a ranked recommendation narrative

#### 2. Risk Summary
- Manager selects a project
- Service fetches project details, milestones, allocations, and recent timesheet data
- LLM generates a 3–5 sentence plain-English risk summary from that JSON

#### 3. Team Builder (enterprise prompt pattern)
```
Manager types one natural-language prompt:
  "I need a team for a React + Node.js project. Senior frontend dev, 
   mid-level backend dev, and a DevOps engineer familiar with Docker."

Step 1 — LLM PARSES:
  Extracts structured JSON:
  { roles: [ { role_name: "Frontend Developer", required_skills: [...] }, ... ] }

Step 2 — SERVICE MATCHES (deterministic, no AI):
  - Queries ALL employees from DB with their skills and current allocation %
  - Greedy single-pass assignment (no employee assigned twice)
  - Three-tier sort: exact skill match → most skills matched → highest availability %
  - Gap analysis: NO_SKILL_IN_TEAM (nobody has the skill) vs ALL_ALLOCATED (skill exists but everyone is booked)

Step 3 — LLM NARRATES:
  Receives filled_roles + unfilled_roles JSON
  Writes a staffing report explaining fit and recommendations
```

### Pluggable LLM Providers

Configured via Admin panel — no code change needed to switch:

| Provider | Model | Notes |
|----------|-------|-------|
| `gemini` | gemini-2.0-flash | Google Gemini API |
| `groq` | llama3-8b-8192 | Groq fast inference API |
| `gemma` | gemma3:12b-it-q8_0 | Self-hosted Ollama endpoint |

Provider and API key are stored in `system_config` table and loaded at runtime.

---

## Clone and Run Locally

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/prm-tool.git
cd prm-tool
```

### 2. Set Up the Database

```bash
mysql -u root -p -e "CREATE DATABASE prm_tool;"
mysql -u root -p prm_tool < server/src/database/migrations/001_schema.sql
mysql -u root -p prm_tool < server/src/database/migrations/002_reminders.sql
```

Seed with initial data (roles, permissions, admin user):

```bash
cd server
npm install
npx ts-node src/database/seeds/seed.ts
```

To seed test data for development:

```bash
npx ts-node src/database/seeds/test-seed.ts
```

### 3. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=prm_tool

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=8h

# Gemma (self-hosted, optional)
GEMMA_API_URL=http://localhost:11434/api/generate
GEMMA_MODEL=gemma3:12b-it-q8_0

# SMTP (optional — for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="PRM Tool <noreply@prm-tool.local>"
```

> LLM provider and API key are configured through the Admin panel after first login — no .env change needed.

### 4. Start the Server

```bash
cd server
npm install
npm run dev
```

Server starts at `http://localhost:3000`

### 5. Start the Client

```bash
cd client
npm install
npm run dev
```

Interactive CLI menu opens in the terminal.

### 6. First Login

Use the admin account created by the seed:

```
Username: admin_user
Password: Admin@123
```

You will be prompted to change your password on first login.

### Default Test Accounts (after test-seed)

| Username | Password | Role |
|----------|----------|------|
| admin_user | Admin@123 | ADMIN |
| manager_one | Manager@123 | MANAGER |
| alice_r | Alice@123 | RESOURCE |
| bob_r | Bob@123 | RESOURCE |

---

## Project Structure

```
prm-tool/
├── server/
│   └── src/
│       ├── ai/              # LLM providers (Gemini, Groq, Gemma)
│       ├── config/          # Environment config
│       ├── controllers/     # Request handlers
│       ├── database/        # Migrations, seeds, connection
│       ├── exceptions/      # Typed error classes
│       ├── middleware/       # Auth, RBAC, error handler
│       ├── models/          # TypeScript interfaces
│       ├── repositories/    # DB access layer (interfaces + implementations)
│       ├── routes/          # Express route definitions
│       ├── scheduler/       # Background job runner
│       ├── services/        # Business logic
│       └── utils/           # Helpers (logger, asyncHandler, etc.)
└── client/
    └── src/
        ├── api/             # Typed API call functions
        └── screens/         # CLI menu screens per role
```

<h1 align="center">
  <br />
  Spagad SRAD Task Manager
  <br />
</h1>

<p align="center">
  A full-stack project management platform built for developers — with real-time messaging, sprint tracking, AI assistance, whiteboards, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-00E5C4?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss" />
</p>

---

## 📸 Screenshots

Replace the placeholders below with your actual screenshot paths:
![Dashboard](./screenshots/home.JPG)
![Tasks Board](./screenshots/task.JPG)
![Ai Assistant](./screenshots/chat1.JPG)
![Ai Assistant](./screenshots/chat2.JPG)
![Project](./screenshots/projects.JPG)
![Analytics](./screenshots/analytics.JPG)
![CodeOps](./screenshots/codeOps.JPG)
![Schedule](./screenshots/schedule.JPG)

---

## ✨ Features

### 🗂️ Project & Task Management

- Create and manage **projects** with colour-coded labels, tech stacks, priority levels, and progress tracking
- Full **task lifecycle** — Backlog → To Do → In Progress → In Review → Completed → Archived
- **Subtasks**, **comments**, **tags**, **due dates**, and **time estimates** per task
- **Time tracking** with per-task time entries

### 🏃 Agile Sprints

- Create sprints with goals, start/end dates, and status (Planning → Active → Completed)
- Assign tasks to sprints and track velocity across cycles

### 📅 Calendar

- Unified calendar view for tasks, meetings, deadlines, sprint events, and releases

### 💬 Real-time Messaging

- Direct messages use **Pusher Channels on Vercel** and the **native WebSocket server on Docker/self-hosted deployments**
- Rich message features: **replies**, **edits**, **deletes**, and **media attachments** (image, video, audio, document)
- Live **online presence** indicators

### 📣 Standups

- Log daily standups: _what you did yesterday_, _what you're doing today_, _blockers_, and a **mood tracker**
- Scoped per project

### 📊 Analytics

- Per-project analytics: tasks completed, total tasks, time spent, team size, and sprint velocity

### 🤖 AI Assistant

- Integrated **Groq AI** assistant for in-app help and task guidance

### 🖊️ Whiteboard

- Full **Excalidraw** integration for collaborative diagramming and freehand drawing
- Auto-saves with thumbnail preview

### 📝 Jot It (Notes)

- Quick personal notes with colour coding, pinning, and archiving
- Rich-text editing powered by **TipTap**

### 📧 Internal Email

- In-app email system between team members

### 🔔 Notifications

- **Push notifications** (Web Push / VAPID) and **email notifications** via Gmail or any SMTP server
- Admins configure outbound email in-app under **Settings → Email Delivery** — credentials are verified on save and stored encrypted
- Granular preference controls: task reminders, team updates, daily digest, overdue escalation, quiet hours
- A scheduled sweep (`/api/cron/reminders`, wired up in `vercel.json`) actually sends these — requires `CRON_SECRET` (see [Configure environment variables](#3-configure-environment-variables))

### 👥 Team Management

- Manage teams and project members with roles: `lead`, `backend`, `frontend`, `design`, `devops`, `member`
- Role-based access control (RBAC): `ADMIN`, `USER`, `GUEST`

### 🔗 GitHub Integration

- Link repositories to projects (GitHub, GitLab, Bitbucket)
- Repository writes (file edits, branches, PRs, merges) run under each user's own connected GitHub account, not a shared token
- Commit and deployment tracking per project — deployments are recorded automatically from pushes to `main`/`staging`/`develop` via the GitHub webhook (`GITHUB_WEBHOOK_SECRET` required), with a manual "Log Deployment" option for admins

### 🎫 Help & Support

- In-app support ticket form — tickets are saved and notify admins (in-app + email)
- Documentation and FAQ reference content
- Community forum and video tutorial tabs are illustrative previews, not backed by live data

### 🔐 Authentication

- **Google OAuth** via NextAuth.js v5 with JWT sessions
- Optional GitHub connection for repository writes, branches, and pull requests
- Custom credential-based login with **bcrypt** password hashing
- Email verification with **OTP** support
- Workspace invitations and workspace-scoped authorization
- TOTP **MFA**, recovery codes, password reset, session revocation, and audit logs

### ⚙️ Settings & Admin

- User profile, timezone, and notification preferences
- Admin panel for platform-wide management

---

## 🛠️ Tech Stack

| Layer                  | Technology                                                         |
| ---------------------- | ------------------------------------------------------------------ |
| **Framework**          | [Next.js 16](https://nextjs.org/) (App Router)                     |
| **Language**           | TypeScript 5                                                       |
| **Runtime**            | React 19                                                           |
| **Database**           | PostgreSQL via [Neon](https://neon.tech/) (serverless)             |
| **ORM**                | [Prisma 7](https://www.prisma.io/)                                 |
| **Auth**               | [NextAuth.js v5](https://authjs.dev/) (Google OAuth + Credentials) |
| **Real-time**          | Pusher Channels on Vercel; native WebSocket (`ws`) on Docker       |
| **Styling**            | [Tailwind CSS v4](https://tailwindcss.com/)                        |
| **UI Components**      | [Radix UI](https://www.radix-ui.com/) + shadcn/ui                  |
| **Rich Text**          | [TipTap](https://tiptap.dev/)                                      |
| **Code Editor**        | [Monaco Editor](https://microsoft.github.io/monaco-editor/)        |
| **Whiteboard**         | [Excalidraw](https://excalidraw.com/)                              |
| **Charts**             | [Recharts](https://recharts.org/)                                  |
| **AI**                 | [Groq SDK](https://groq.com/)                                      |
| **Email**              | Nodemailer (Gmail / SMTP, configured in-app)                        |
| **Push Notifications** | Web Push (VAPID)                                                   |
| **Drag & Drop**        | [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)           |
| **Forms**              | React Hook Form + Zod                                              |
| **Deployment**         | [Vercel](https://vercel.com/)                                      |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 10+
- A **PostgreSQL** database (recommended: [Neon](https://neon.tech/) for serverless)
- A **Google OAuth Web client** ([create one here](https://console.cloud.google.com/auth/clients))
- Optional: a **GitHub OAuth App** for repository write access
- Optional: a Gmail account with an [App Password](https://myaccount.google.com/apppasswords), or any SMTP server, for outbound email

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/spagad-srad-task-manager.git
cd spagad-srad-task-manager
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL=""           # Pooled connection string (Neon / pg)
DIRECT_URL=""             # Direct (non-pooled) connection string
DATABASE_URL_UNPOOLED=""  # Unpooled URL for migrations

# ─── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET=""             # Secret for custom JWT sessions
AUTH_SECRET=""            # NextAuth.js secret (required in production)
AUTH_URL="http://localhost:3000"

# ─── Google OAuth (primary sign-in) ────────────────────────────────────────────
AUTH_GOOGLE_ID=""         # Google OAuth Web Client ID
AUTH_GOOGLE_SECRET=""     # Google OAuth Web Client Secret

# ─── GitHub OAuth (optional repository connection) ─────────────────────────────
GITHUB_ID=""              # GitHub OAuth App Client ID
GITHUB_SECRET=""          # GitHub OAuth App Client Secret

# ─── App ──────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ─── Push Notifications ───────────────────────────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:you@example.com"

# ─── Outbound Email (optional fallback) ──────────────────────────────────────
# Preferred: configure Gmail/SMTP in-app under Settings → Email Delivery.
# Anything saved there overrides these variables.
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASSWORD=""
NOTIFICATION_FROM_EMAIL="notifications@yourdomain.com"
NOTIFICATION_FROM_NAME="Your App Notifications"

# ─── GitHub Workspace Integration ─────────────────────────────────────────────
GITHUB_ACCESS_TOKEN=""
GITHUB_WEBHOOK_SECRET=""
```

> **Tip:** Generate VAPID keys with:
>
> ```bash
> npx web-push generate-vapid-keys
> ```

---

### 4. Set up the database

Schema changes are tracked with Prisma Migrate (`prisma/migrations/`), not `db push` — this gives you rollback history and prevents application builds from mutating production data.

```bash
# First time: create the database and apply all migrations
npx prisma migrate deploy
npx prisma generate

# (Optional) Seed with sample data
npx tsx prisma/seed.ts
```

When you change `schema.prisma` during development, generate a new migration instead of pushing:

```bash
npx prisma migrate dev --name describe_your_change
```

This writes a new folder under `prisma/migrations/` — commit it. Apply migrations explicitly in each environment with `npm run db:migrate` before starting the application.

---

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

`npm run dev` runs the custom Node server and exposes `ws://localhost:3000/ws`.
The custom server defaults to native WebSockets locally; set
`NEXT_PUBLIC_REALTIME_TRANSPORT=websocket` explicitly in `.env` if you want
to make that choice clear. Use `npm run dev:next` only when you intentionally
want plain Next.js without the native WebSocket listener.

---

## 📦 Available Scripts

| Script                    | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Start the custom Next.js + native WebSocket development server |
| `npm run dev:next`        | Start plain Next.js without the native WebSocket listener      |
| `npm run build`           | Build for production (runs `prisma generate` first) |
| `npm start`               | Start plain Next.js production server (no native `/ws`) |
| `npm run start:node`      | Start self-hosted Next.js + native WebSocket server     |
| `npm run lint`            | Run ESLint                                          |
| `npm run typecheck`       | Run the TypeScript compiler without emitting files  |
| `npm test`                | Run the security and authorization test suite        |
| `npm run prisma:generate` | Regenerate the Prisma client                        |
| `npm run db:migrate`      | Apply checked-in migrations to the target database   |

---

## ☁️ Deploying to Vercel

1. Push your code to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Add **all environment variables** from `.env.example` in the Vercel dashboard under **Settings → Environment Variables**. Select both the **Production** and **Preview** scopes for the authentication variables.
4. Set `NEXT_PUBLIC_REALTIME_TRANSPORT=pusher` and configure the Pusher server/client variables **before the Vercel build**. Vercel Functions cannot host the native `/ws` listener.
5. In Google Cloud Console, create a **Web application** OAuth client and set its **Authorized redirect URI** to:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
   Do not enter a generated preview URL here. Google must use this one stable
   production callback exactly. To enable preview sign-in, either turn on
   **Automatically expose System Environment Variables** in Vercel, or set
   `AUTH_REDIRECT_PROXY_URL` to `https://your-domain.vercel.app/api/auth` in
   both Production and Preview. Also set `NEXT_PUBLIC_APP_URL` and `AUTH_URL`
   to `https://your-domain.vercel.app` in both scopes as a fallback. Save the
   Google Client ID as `AUTH_GOOGLE_ID` and its secret as `AUTH_GOOGLE_SECRET`
   in both scopes.
6. Optional: configure a GitHub OAuth App with callback URL
   `https://your-domain.vercel.app/api/auth/callback/github`. GitHub is used
   only when a repository contributor connects it from Code Workspace.
7. Run `npm run db:migrate` from a trusted release job against the production database, then redeploy.

Vercel is the serverless deployment: API routes, scheduled jobs, and Pusher events run there. Do not use `npm run start:node` or expect `ws://.../ws` to work on Vercel. Uploads should use Vercel Blob rather than local disk.

> **Verify auth is working** by visiting `https://your-domain.vercel.app/api/auth/providers` — it should return a `github` object, not `{}`.

### 🐳 Docker with native WebSocket

The included `Dockerfile` builds the browser bundle for `websocket`, runs migrations,
and starts `server.ts`, which serves Next.js and `/ws` from the same process. The
image intentionally does not accept a Pusher transport override: use Vercel for
the serverless/Pusher deployment.

```bash
docker build -t spagad-task-manager .
docker run --env-file .env -p 3000:3000 spagad-task-manager
```

The Dockerfile already compiles `NEXT_PUBLIC_REALTIME_TRANSPORT=websocket`;
the runtime env file supplies secrets and database settings. Put a reverse
proxy/load balancer in front of the container that supports HTTP connection
upgrades for `/ws`. Run one WebSocket-capable instance or add a shared broker/
sticky routing strategy before horizontal scaling. Persist `MEDIA_STORAGE_DIR`
on a volume, or configure object storage; container filesystems are not durable.

---

## 🔐 Roles & Permissions

| Role    | Access                            |
| ------- | --------------------------------- |
| `ADMIN` | Full platform access, admin panel |
| `USER`  | Standard access to all features   |
| `GUEST` | Read-only, limited feature access |

Project members also have sub-roles: `lead`, `backend`, `frontend`, `design`, `devops`, `member`.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

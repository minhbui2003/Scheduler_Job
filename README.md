# Scheduler Job

A personal job interview workspace built with Next.js. Manage your job applications, schedule interviews, compare companies, and make better career decisions.

**This is NOT a job search website.** It's a personal productivity tool for managing your interview process.

## Features

- 🗓️ **Weekly Interview Scheduler** — Timetable-style view with Morning/Afternoon/Evening sections
- ✨ **AI Import** — Paste HR emails/messages, AI extracts interview details automatically
- 📝 **Post Interview Review** — Record salary, pros/cons, ratings after each interview
- 📊 **Company Comparison** — Side-by-side comparison of multiple companies
- 🔔 **Smart Notifications** — Reminders at 1 day, 2 hours, and 30 minutes before interviews
- 👤 **Multi-User** — Each user has completely isolated data
- 🔐 **Admin Panel** — Manage user accounts
- ✉️ **Email Verification** — Secure registration with email verification

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **UI:** TailwindCSS + shadcn/ui
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + httpOnly cookies
- **Validation:** Zod
- **AI:** OpenAI API
- **Email:** Nodemailer

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or cloud)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd scheduler-job

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Environment Setup

Edit `.env` with your values:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/scheduler-job

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# JWT (generate random strings, min 32 chars)
JWT_SECRET=your-jwt-secret-here
REFRESH_TOKEN_SECRET=your-refresh-token-secret-here

# Admin credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword123

# Email (optional for dev, required for email verification)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM="Scheduler Job" <noreply@example.com>

# OpenAI (required for AI Import feature)
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4o

# Cron (for notification processing)
CRON_SECRET=your-cron-secret
```

### MongoDB Setup

**Local MongoDB:**
```bash
# Using Docker
docker run -d --name mongodb -p 27017:27017 mongo:7

# Or install MongoDB locally
# https://www.mongodb.com/docs/manual/installation/
```

**MongoDB Atlas (Cloud):**
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Set `MONGODB_URI` in `.env`

### Email Setup (Gmail)

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate an app password
5. Use it as `MAIL_PASSWORD`

### AI Setup (OpenAI)

1. Create account at [platform.openai.com](https://platform.openai.com)
2. Go to API Keys
3. Create a new key
4. Set `OPENAI_API_KEY` in `.env`

### Run Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build Production

```bash
npm run build
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build manually
docker build -t scheduler-job .
docker run -p 3000:3000 --env-file .env scheduler-job
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Verify Email
│   ├── (dashboard)/     # Scheduler, Applications, Reviews, Profile, Settings
│   ├── admin/           # Admin Login, User Management
│   └── api/             # REST API endpoints
├── components/
│   ├── notifications/   # Notification dropdown
│   ├── providers/       # Auth, Toaster providers
│   ├── reviews/         # Post-interview review modal
│   ├── scheduler/       # Interview detail, create, AI import modals
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── mongodb.ts       # Reusable MongoDB connection
│   ├── auth.ts          # JWT auth utilities
│   ├── mail.ts          # Email service
│   ├── validations.ts   # Zod schemas
│   └── api-utils.ts     # API response helpers, rate limiting
├── models/              # Mongoose models
├── services/            # Business logic services
└── types/               # TypeScript type definitions
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/verify-email?token=xxx` — Verify email
- `POST /api/auth/resend-verification` — Resend verification
- `GET /api/auth/me` — Get current user
- `POST /api/auth/refresh` — Refresh token

### Companies
- `GET /api/companies` — List companies
- `POST /api/companies` — Create company
- `GET/PUT/DELETE /api/companies/[id]` — Company CRUD

### Applications
- `GET /api/applications` — List with search/filter/sort
- `POST /api/applications` — Create application
- `GET/PUT/DELETE /api/applications/[id]` — Application CRUD

### Interviews
- `GET /api/interviews` — List with date range filter
- `POST /api/interviews` — Create interview
- `GET/PUT/DELETE /api/interviews/[id]` — Interview CRUD
- `PUT /api/interviews/[id]` with `action: reschedule/complete/cancel`

### Reviews
- `GET /api/reviews` — List with filters
- `POST /api/reviews` — Create review
- `GET/PUT /api/reviews/[id]` — Review CRUD

### AI
- `POST /api/ai/extract` — Extract interview data from text

### Notifications
- `GET /api/notifications/upcoming` — Upcoming notifications
- `PUT /api/notifications/[id]/read` — Mark as read
- `PUT /api/notifications/read-all` — Mark all as read

### Cron
- `POST /api/cron/notifications` — Process pending (requires CRON_SECRET)

### Admin
- `POST /api/admin/login` — Admin login
- `GET /api/admin/users` — List users
- `PUT /api/admin/users/[id]/activate` — Activate user
- `PUT /api/admin/users/[id]/disable` — Disable user
- `DELETE /api/admin/users/[id]` — Delete user + all data

## Cron Setup

Process notifications by calling the cron endpoint periodically:

```bash
# Every minute with curl
*/1 * * * * curl -X POST http://localhost:3000/api/cron/notifications -H "x-cron-secret: YOUR_CRON_SECRET"
```

**Vercel Cron:** Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/notifications",
    "schedule": "*/5 * * * *"
  }]
}
```

## Security

- Passwords hashed with bcryptjs (cost factor 12)
- JWT tokens in httpOnly/secure/sameSite cookies
- All queries filtered by userId (IDOR prevention)
- Zod validation on all API inputs
- Rate limiting on auth endpoints
- NoSQL injection prevention
- CRON_SECRET protection on cron endpoints

## License

Private — All rights reserved.

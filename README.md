# AI-Powered Cold Calling Dialer & CRM

A production-ready cold calling CRM and browser dialer built with Next.js, PostgreSQL, Prisma, and SignalWire. The system gives admins complete control over users, SignalWire configuration, phone number assignment, and calling activity while giving sales users a secure, isolated lead workspace for importing, managing, calling, and exporting leads.

## Features

- Secure admin and user login
- Admin dashboard for user management
- SignalWire settings management with encrypted secrets
- Phone number pool with one active assigned number per user
- User-specific CRM lead workspace
- Manual lead creation
- CSV lead import with row-level summary
- CSV lead export
- Global duplicate protection across all users
- Server-side lead data isolation
- Browser-based SignalWire calling
- Call outcome tracking
- Call logs and history
- Follow-up tracking
- Do Not Call handling
- Audit-friendly database schema
- AI-ready CRM architecture for future scoring, summaries, and coaching workflows

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- SignalWire browser SDK and API routes
- Zod validation
- PapaParse CSV parsing
- HTTP-only session cookies
- Vitest
- GitHub Actions CI

## Core Workflows

### Admin

Admins can:

- Create users
- Manage user roles and disabled status
- Configure SignalWire credentials
- Add or sync SignalWire phone numbers
- Assign phone numbers to users
- View all calling activity
- Manage the global dialing setup

### User

Users can:

- View only their own leads
- Import leads from CSV
- Add leads manually
- Export their own leads
- Call leads using only their assigned SignalWire number
- Save call outcomes and notes
- View their own call history
- Track follow-ups

## Security

- Authentication is enforced server-side.
- Admin APIs require the `ADMIN` role.
- User APIs derive `userId` from the session and never trust client-provided user IDs.
- Lead reads, updates, deletes, exports, imports, and call outcome saves are scoped to the logged-in user.
- SignalWire secrets are encrypted before database storage.
- SignalWire credentials are never exposed to the frontend.
- Phone number assignment is checked server-side before a call can be bridged.
- SignalWire webhooks support a shared secret header.

## Deduplication

The app enforces global deduplication across all users.

- Emails are trimmed and lowercased.
- Phone numbers are normalized with `libphonenumber-js` where possible.
- Raw phone/email and normalized phone/email are stored separately.
- Duplicate email or phone records are skipped during CSV import.
- Duplicate email or phone records are rejected during manual creation.

## Environment Variables

Create `.env` locally and configure these values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cold_calling"
AUTH_SECRET="replace-with-at-least-32-random-characters"
APP_URL="http://localhost:3000"
ENCRYPTION_KEY="replace-with-a-long-random-secret"
SIGNALWIRE_WEBHOOK_SECRET="replace-with-a-random-webhook-secret"
```

For production, set these same variables in your hosting provider.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

Run migrations and seed accounts:

```bash
pnpm prisma migrate dev
pnpm seed
```

Start the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Seed accounts:

```text
Admin: admin@example.com / Admin12345!
User:  agent@example.com / User12345!
```

You can override seed passwords:

```bash
SEED_ADMIN_PASSWORD="your-password" SEED_USER_PASSWORD="your-password" pnpm seed
```

## SignalWire Setup

1. Log in as admin.
2. Open `/admin`.
3. Save SignalWire settings:
   - Space URL, for example `your-space.signalwire.com`
   - Project ID
   - API token
   - Shared subscriber reference
   - Shared subscriber password
   - Dial address
4. Add phone numbers manually or fetch them from SignalWire.
5. Assign one active number to each user.

Webhook endpoint:

```text
https://your-domain.com/api/signalwire/webhook
```

If `SIGNALWIRE_WEBHOOK_SECRET` is configured, send it as:

```text
x-webhook-secret: your-secret
```

## CSV Import Headers

Supported CSV headers include:

```csv
full_name,phone,email,job_title,company_name,company_website,industry,region,notes
```

Required fields:

- `full_name`
- `phone`

The import response includes:

- Total rows processed
- Successfully imported rows
- Duplicate rows skipped
- Invalid rows skipped
- Missing required field rows
- Row-level errors

## Deployment

Recommended free deployment:

- App: Vercel Hobby
- Database: Neon Free PostgreSQL

Production commands:

```bash
pnpm prisma migrate deploy
pnpm seed
```

Vercel build command:

```bash
pnpm build
```

## Quality Checks

Run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm prisma validate
```

## Project Structure

```text
src/app
  api/                 Backend route handlers
  admin/               Admin dashboard page
  crm/                 User CRM and dialer page
  login/               Login page
src/components         Client UI components
src/lib
  auth/                Session and password helpers
  leads/               Lead creation/import logic
  phone-numbers/       Assignment logic
  signalwire/          SignalWire services
prisma
  schema.prisma        Database schema
  seed.ts              Seed users
```

## License

MIT

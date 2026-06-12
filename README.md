# Smart Logics Dialer

A cold calling CRM & dialer platform built with Next.js 15, SignalWire, and DeepSeek AI.

## Features

- Browser-based calling via SignalWire Fabric
- Lead management with bulk import & deduplication
- AI-generated sales pitches (DeepSeek)
- Auto-dialer with queue management
- Follow-up scheduling
- DNC (Do Not Call) list
- Admin panel: user approval, phone number management, VoIP settings
- Role-based access (admin / agent)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: NextAuth v5 (JWT, email/password)
- **Database**: PostgreSQL via Prisma ORM
- **VoIP**: SignalWire Fabric SDK
- **AI**: DeepSeek via OpenAI-compatible SDK
- **UI**: Tailwind CSS + shadcn/ui

## Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd cold-calling-app
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon) |
| `NEXTAUTH_SECRET` | Random 32+ char secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL (e.g. `https://yourapp.vercel.app`) |
| `NEXT_PUBLIC_APP_URL` | Same as above |
| `DEEPSEEK_API_KEY` | From [platform.deepseek.com](https://platform.deepseek.com) |

SignalWire credentials are configured via the Admin → Dialer Settings page — not in `.env`.

### 3. Database

```bash
pnpm exec prisma migrate deploy
node node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

Default admin credentials: `admin@example.com` / `Admin@1234`

### 4. Run locally

```bash
pnpm dev
```

## Deployment (Vercel)

See deployment instructions below.

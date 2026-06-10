# Deployment Guide

This guide deploys the app for free using GitHub, Vercel, and Neon.

## 1. Create A GitHub Repository

1. Go to https://github.com/new
2. Repository name: `cold-calling-dialer`
3. Visibility: Public or Private
4. Do not initialize with README, `.gitignore`, or license because this project already includes them.
5. Click **Create repository**.

## 2. Push This Project To GitHub

Run these commands inside the project folder:

```bash
cd C:\Users\fassi\ColdCalling\cold-calling-next
git status
git add .
git commit -m "Initial cold calling dialer app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cold-calling-dialer.git
git push -u origin main
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/cold-calling-dialer.git
git push -u origin main
```

## 3. Create A Free Neon Database

1. Go to https://neon.com
2. Create a free account.
3. Create a new project.
4. Copy the pooled PostgreSQL connection string.
5. Use it as `DATABASE_URL`.

## 4. Deploy To Vercel

1. Go to https://vercel.com
2. Import the GitHub repo.
3. Framework preset: Next.js
4. Build command: `pnpm build`
5. Install command: `pnpm install`
6. Add environment variables:

```env
DATABASE_URL="your-neon-connection-string"
AUTH_SECRET="generate-a-long-random-secret"
APP_URL="https://your-vercel-domain.vercel.app"
ENCRYPTION_KEY="generate-another-long-random-secret"
SIGNALWIRE_WEBHOOK_SECRET="generate-a-random-webhook-secret"
```

7. Deploy.

## 5. Run Production Migration

From your local machine, set `DATABASE_URL` to the Neon production connection string and run:

```bash
pnpm prisma migrate deploy
pnpm seed
```

You can also run these from a CI/CD job if preferred.

## 6. Configure SignalWire

After deployment:

1. Visit the Vercel app URL.
2. Log in as admin.
3. Open `/admin`.
4. Save SignalWire credentials.
5. Add or fetch phone numbers.
6. Assign a number to each user.
7. Configure SignalWire webhook:

```text
https://your-vercel-domain.vercel.app/api/signalwire/webhook
```

## 7. Verify

Run locally before pushing:

```bash
pnpm lint
pnpm test
pnpm build
```

Then verify production:

1. Admin can log in.
2. Admin can create a user.
3. Admin can configure SignalWire.
4. Admin can assign a phone number.
5. User can log in.
6. User can import leads.
7. User can call only from the assigned number.
8. Call logs are saved.

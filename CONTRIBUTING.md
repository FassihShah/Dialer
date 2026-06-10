# Contributing

## Development

```bash
pnpm install
docker compose up -d postgres
pnpm prisma migrate dev
pnpm seed
pnpm dev
```

## Checks

Before opening a pull request, run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm prisma validate
```

## Database Changes

Update `prisma/schema.prisma`, then create a migration:

```bash
pnpm prisma migrate dev
```

Commit both the schema change and generated migration.

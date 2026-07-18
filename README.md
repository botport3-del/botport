# Botport

Discord server **backup, recovery & verification** platform — a legitimate,
privacy-respecting take on VaultCord-style tooling.

> **What this is not:** Botport does **not** harvest members' email/IP/device data
> and does **not** store OAuth tokens to mass-add ("pull") members into other
> servers. Those patterns violate Discord's Terms of Service and users' privacy.
> Botport backs up **your own** server and verifies members **transparently**.

## Features

- **Automatic backups** of roles, channels, categories and server settings (hourly/daily).
- **One-click recovery** to rebuild server structure after a raid or deletion.
- **Transparent verification** — CAPTCHA (Cloudflare Turnstile) + optional, disclosed
  `identify` OAuth consent. Members always see what is stored.
- **Anti-raid** — minimum account age, join-rate raid detection, blacklist, manual review.
- **Auto roles**, **team RBAC** with audit logging, and a full web dashboard.

## Architecture

Monorepo (pnpm workspaces):

```
apps/web    Next.js dashboard, verify pages, API routes, marketing
apps/bot    discord.js worker — slash commands, events, backup scheduler
packages/db Prisma schema + shared client
```

## Getting started

Requirements: Node ≥ 20, pnpm 10, Docker (for local Postgres).

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Configure environment
cp .env.example .env   # then fill in Discord + Turnstile credentials

# 4. Create the database schema and seed demo data
pnpm db:migrate
pnpm db:seed

# 5. Run the dashboard and the bot
pnpm dev
```

- Dashboard: http://localhost:3000
- The bot connects when `DISCORD_BOT_TOKEN` is set; otherwise it logs a warning and idles.

## Environment variables

See [`.env.example`](./.env.example). You need a
[Discord application](https://discord.com/developers/applications)
(client id/secret + bot token) and, for real CAPTCHAs, a
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) key pair.
The Turnstile test keys shipped in `.env.example` always pass, which is handy for
local development.

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Run web + bot in watch mode                  |
| `pnpm build`        | Build all packages                           |
| `pnpm db:migrate`   | Apply Prisma migrations (dev)                |
| `pnpm db:seed`      | Seed demo data                               |
| `pnpm typecheck`    | Type-check every workspace                   |
| `pnpm test`         | Run tests                                    |

## Status

Built in milestones — see the project plan. This repository currently contains the
scaffold plus features landed per milestone.

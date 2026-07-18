# Deploying Botport

Botport has three parts that run in different places:

| Part | What it is | Where it runs |
| --- | --- | --- |
| **Web** (`apps/web`) | Dashboard, verify pages, API | **Vercel** (serverless) |
| **Bot** (`apps/bot`) | discord.js worker + backup scheduler | A **worker host** (Railway, Render, Fly.io, or a VPS) |
| **Database** | Postgres | **Neon** or **Supabase** (managed Postgres) |

All three share the same `DATABASE_URL`. Secrets live **only** in each host's
environment variables — never in the repository.

> The web app can go on Vercel, but the bot **cannot** — it's a long-running
> process, and Vercel is serverless. Put the bot on a host that runs a
> persistent worker.

---

## 0. Before you start

Make the repository private if you don't want the code public:
**GitHub → your repo → Settings → Danger Zone → Change visibility → Make private.**
(No secrets are committed either way, but this hides the source.)

You'll need free accounts on: **Discord Developer Portal**, **Neon** (or Supabase),
**Vercel**, and a bot host such as **Railway** or **Render**.

---

## 1. Create the Discord application

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **General Information** → copy the **Application ID** → this is `DISCORD_CLIENT_ID`.
3. **OAuth2** → **Reset Secret** → copy it → `DISCORD_CLIENT_SECRET`.
4. **OAuth2 → Redirects** → add: `https://YOUR-DOMAIN/api/auth/callback`
   (use your Vercel URL, e.g. `https://botport.vercel.app/api/auth/callback`).
5. **Bot** → **Reset Token** → copy it → `DISCORD_BOT_TOKEN`.
6. **Bot → Privileged Gateway Intents** → enable **Server Members Intent**.
7. Keep these three secrets handy for the steps below.

---

## 2. Create the database (Neon)

1. Create a project at <https://neon.tech> → copy the connection string.
2. That string is your `DATABASE_URL`
   (looks like `postgresql://user:pass@host/db?sslmode=require`).

---

## 3. Deploy the web app to Vercel

1. <https://vercel.com/new> → import your GitHub repo.
2. **Root Directory** → set to `apps/web`.
   Vercel detects the pnpm workspace and installs from the repo root; the root
   `postinstall` generates the Prisma client automatically.
3. **Framework Preset** → Next.js (auto-detected).
4. **Environment Variables** — add all of these (see the reference table below):
   `DATABASE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `DISCORD_BOT_TOKEN`, `APP_BASE_URL`, `AUTH_SECRET`,
   `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
5. **Deploy.** Note the resulting URL and set `APP_BASE_URL` to it (then redeploy
   once so OAuth redirects use the right host). Make sure this URL also matches
   the Discord redirect from step 1.4.

---

## 4. Run database migrations

From your machine, point Prisma at the production database once:

```bash
DATABASE_URL="<your Neon URL>" pnpm db:migrate:deploy
```

This creates all tables. Re-run it whenever the schema changes.
(Do **not** run `db:seed` in production — that only inserts demo data.)

---

## 5. Deploy the bot worker

The bot is a Node process. On **Railway** or **Render**, create a new service
from the same repo with:

- **Install:** `pnpm install`
- **Build:** `pnpm --filter bot build`
- **Start:** `pnpm --filter bot start`
- **Environment variables:** `DATABASE_URL`, `DISCORD_BOT_TOKEN`,
  `DISCORD_CLIENT_ID`, `APP_BASE_URL`, `AUTH_SECRET`.

After the first deploy, register the slash commands once:

```bash
DISCORD_BOT_TOKEN="..." DISCORD_CLIENT_ID="..." pnpm --filter bot register
```

(Global commands can take up to an hour to appear. For instant testing, set
`DISCORD_DEV_GUILD_IDS` to your server's ID and re-run `register`.)

---

## 6. Invite the bot & go live

1. In the dashboard, open **Servers → Add a server** to get the invite link
   (or build it from `https://discord.com/oauth2/authorize?client_id=...&scope=bot%20applications.commands&permissions=8`).
2. Add the bot to a server you manage.
3. Log in to the dashboard with Discord, turn on verification, pick a verified
   role, and set a backup schedule. Run `/verify-embed` to post the Verify button.

---

## Environment variable reference

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | web, bot | Postgres connection string. |
| `DISCORD_CLIENT_ID` | web, bot | Application ID. |
| `DISCORD_CLIENT_SECRET` | web | OAuth secret (web only). |
| `DISCORD_BOT_TOKEN` | web, bot | Bot token. Web uses it to assign roles / take backups. |
| `APP_BASE_URL` | web, bot | Public dashboard URL, e.g. `https://botport.vercel.app`. |
| `AUTH_SECRET` | web, bot | Signs sessions & verify tokens. Generate: `openssl rand -hex 32`. **Must match** on web and bot. |
| `TURNSTILE_SITE_KEY` | web | Cloudflare Turnstile site key. |
| `TURNSTILE_SECRET_KEY` | web | Cloudflare Turnstile secret. |
| `DISCORD_DEV_GUILD_IDS` | bot | Optional. Comma-separated guild IDs for instant command registration. |

---

## Security checklist

- ✅ **No secrets in git.** Only `.env.example` (placeholders) is committed; real
  values live in host environment variables.
- ✅ **Dev login is disabled in production** (`NODE_ENV=production`), so the local
  demo shortcut can't be used against the live app.
- ✅ **`AUTH_SECRET` must be a strong random value** and identical on web + bot,
  or verify links minted by the bot won't validate on the web.
- ✅ Rotate the `DISCORD_BOT_TOKEN` if it is ever exposed (Discord Developer
  Portal → Bot → Reset Token).
- ✅ Consider making the GitHub repo private (step 0).

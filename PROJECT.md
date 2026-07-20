# Devorju — Projekt-Übersicht

Discord-Backup, -Verifizierung und Server-Transfer als Web-Dashboard.
Basiert komplett auf offiziellen Discord-APIs, ohne verstecktes
Token-Sammeln oder ToS-Verstöße.

- **Live:** https://botport-web.vercel.app
- **Repo:** https://github.com/botport3-del/botport
- **Bot-Name (Discord):** Devorju
- **Bot-Einladelink:**
  `https://discord.com/oauth2/authorize?client_id=1528327940851368079&permissions=8&scope=bot+applications.commands`

---

## Was das Dashboard kann (alles ohne Slash-Commands)

| Bereich | Was du dort machst |
| --- | --- |
| **Overview** | Alle deine Server auf einen Blick, Stats (Backups, verifizierte Members). |
| **Servers** | Verbundene Server verwalten, neue Server per Bot-Invite hinzufügen. |
| **Roles & channels** | Struktur des Servers aus dem letzten Backup ansehen. |
| **Members** | Wer sich verifiziert hat, Status, Account-Alter, letztes Verhalten. |
| **Transfer** | Members auf einen anderen Server übertragen (siehe unten). |
| **Backups** | „Create backup now", Backups wiederherstellen, löschen. |
| **Verification** | Verify-Button in einen Channel posten, Rollen, Anti-Raid, Branding. |
| **Logs** | Alle Verifizierungen mit Ergebnis und Zeit. |
| **Stats** | Numerische Statistiken. |
| **Audit** | Alle privilegierten Aktionen (wer hat wann was gemacht). |
| **Team** | Staff einladen mit Rollen ADMIN/MOD. |
| **Settings** | Backup-Zeitplan, Raid-Schwelle, Blacklist. |

Slash-Commands (`/backup`, `/restore`, `/verify-embed`, `/blacklist`, `/info`)
bleiben in Discord verfügbar, sind aber nur noch Notfall-Alternative.

---

## Datenschutz-Prinzipien (bewusste Design-Entscheidungen)

- **Kein Speichern von IP, E-Mail oder Gerätedaten** von Members auf der Verify-Seite.
- **Kein Rate-Limit-Umgehen** — Devorju respektiert Discord's API-Limits.
- **Refresh-Tokens** (für Server-Transfer) werden **AES-256-GCM verschlüsselt**
  in der Datenbank abgelegt und **nur** auf owner-getriggerte Aktion verwendet.
- **Consent-Screen** von Discord: der Member sieht auf **Discord's eigener Seite**,
  welche Rechte er gewährt (`identify`, `guilds.join`), bevor Devorju je einen
  Token erhält.

---

## Wie man alles benutzt (Kurzanleitungen)

### 1. Bot einladen (einmalig pro Server)
Öffne den Einladelink oben → Server auswählen → **Autorisieren**.
Danach erscheint der Server im Dashboard unter „Servers".

### 2. Verify-Button in einen Channel posten
1. Dashboard → Server → **Verification**
2. „Enable verification" einschalten → **Save**
3. Card oben: **Post Verify button** → Channel wählen → **Post verify embed**
4. Der Bot postet das Embed mit dem Verify-Knopf in den Channel.

### 3. Backup erstellen / wiederherstellen
- **Erstellen:** Server → **Backups** → **Create backup now**
- **Automatisch:** Server → **Settings** → Backup schedule = **Daily** oder **Hourly**
- **Wiederherstellen:** Bei jedem Backup den **Restore**-Knopf klicken.
  Restore ist additiv — nichts wird gelöscht, nur Fehlendes wird nachgebaut.

### 4. Members auf einen neuen Server übertragen
1. Bot in den neuen Ziel-Server einladen (gleicher Einladelink oben).
2. Dashboard → alter Server → **Transfer**-Tab
3. **Target server ID** eintragen (im neuen Server: Rechtsklick → „ID kopieren").
4. Filter/Auswahl der Members — oder **Select all filtered** für alle.
5. **Transfer** klicken. Devorju ruft für jeden Member
   `PUT /guilds/{id}/members/{user}` mit dem gespeicherten Refresh-Token auf.
   Discord fügt sie hinzu **und schickt automatisch** die Nachricht
   „eine Anwendung, Devorju, hat dich dem Server X hinzugefügt".
6. Fortschritt läuft live im Batch (JOINED / pending / failed). **Retry**-Knopf
   für fehlgeschlagene.

**Voraussetzung:** Members müssen sich vorher über die Verify-Seite verifiziert
und dabei den `guilds.join`-Scope auf Discord's Consent-Screen bestätigt haben.
Ältere Verifizierungen ohne diesen Scope können nicht transferiert werden.

---

## Technik (Kurzform)

**Monorepo (pnpm workspaces):**

```
apps/
  web/       Next.js 15 App Router (Dashboard, Verify, API, Marketing)
packages/
  db/        Prisma-Schema + Client (Postgres)
  core/      Snapshot/Restore/Verify-Token/Snowflake (getestet)
```

**Stack:**

- Web-App: Next.js 15 App Router, Tailwind, Server Actions, `useActionState`
- Session: `jose` (HS256, httpOnly Cookie)
- Discord: Interactions HTTP endpoint (kein persistenter Gateway-Bot), signiert
  mit `DISCORD_PUBLIC_KEY`
- OAuth2 (Verify): `identify guilds.join`, refresh_token AES-256-GCM verschlüsselt
- Datenbank: Neon Postgres (serverless HTTPS-Zugriff)
- Deployment: Vercel (Web + Interactions), Vercel-Cron (stündliche/tägliche
  Backups)
- CAPTCHA: Cloudflare Turnstile
- Bot-Prozess: **läuft NICHT als persistenter Prozess** — Discord ruft unseren
  Interactions-Endpoint auf. Deshalb steht der Bot in der Discord-Sidebar als
  „offline", funktioniert aber trotzdem.

**Datenbankmodelle:**
`User`, `Guild`, `GuildSettings`, `Backup`, `Verification`, `BlacklistEntry`,
`StaffMember`, `AuditLog`, `TransferBatch`, `TransferInvitation`.

---

## Umbenennung / Rebrand

Ursprünglicher Name: **Botport**. Auf **Devorju** umbenannt (M2026-07-19).
- Logo: „D" auf lila/blauem Verlauf, Favicon in `apps/web/app/icon.svg`.
- Domain: aktuell noch `botport-web.vercel.app`. Umbenennung zu
  `devorju.vercel.app` oder eigene Domain (`devorju.com`) möglich via Vercel
  → Settings → Domains.

---

## Environment Variables (Vercel)

Alle sind gesetzt und aktiv:

- `DATABASE_URL` — Neon Postgres
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`
- `DISCORD_PUBLIC_KEY` — für Interactions-Signatur-Verifizierung
- `AUTH_SECRET` — signiert Sessions **und** verschlüsselt Refresh-Tokens
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `CRON_SECRET` — schützt den Backup-Cron-Endpoint

`APP_BASE_URL` wird nicht mehr benötigt — die Adresse wird zur Laufzeit aus
den Request-Headern erkannt.

---

## Bekannte Konfigurations-Punkte

### Discord Redirect-URIs
Discord's API akzeptiert das Hinzufügen von OAuth-Redirect-URIs per Bot-Token
nicht mehr (Sicherheitsänderung 2024). Zwei URIs müssen manuell im
Developer Portal registriert sein:

1. `https://botport-web.vercel.app/api/auth/callback` — Dashboard-Login ✅
2. `https://botport-web.vercel.app/api/verify/oauth-callback` — Verify-Flow

Falls die zweite fehlt, gibt Discord auf der Verify-Seite:
„Ungültiges OAuth2 redirect_uri". Fix im Portal:
**https://discord.com/developers/applications/1528327940851368079/oauth2** →
**Redirects** → **Add Redirect** → obige URL einfügen → **Save Changes**.

---

## Meilensteine (chronologisch)

| # | Was | Status |
| --- | --- | --- |
| M1 | Monorepo-Scaffold: Next.js + discord.js + Prisma | ✅ |
| M2 | Discord-OAuth-Login und Dashboard-Shell | ✅ |
| M3 | Backup- und Restore-System (Rollen, Channels, Overwrites, Settings) | ✅ |
| M4 | Verifizierung + CAPTCHA + Anti-Raid | ✅ |
| M5 | Team-RBAC, Server-Settings, Blacklist, Marketing-Seiten | ✅ |
| M6 | VaultCord-Style Landing-Redesign, Tools | ✅ |
| M7 | Redesign in echte App portiert | ✅ |
| M8 | Deployment-fertig (Vercel, Neon), DEPLOYMENT.md | ✅ |
| M9 | Deploy live inkl. Datenbank-Migration | ✅ |
| M10 | Bot als HTTP Interactions auf Vercel (kein persistenter Prozess nötig) | ✅ |
| M11 | Statistiken- und Audit-Log-Seiten | ✅ |
| M12 | Rollen&Channels- und Members-Tabs | ✅ |
| M13 | Rebrand von Botport auf Devorju | ✅ |
| M14 | Server-Transfer (guilds.join + PUT members, verschlüsselte Tokens) | ✅ |
| M15 | Verify-Embed direkt vom Dashboard posten (Channel-Dropdown) | ✅ |

---

## Support-Referenz für dich

**Wenn beim Verifizieren „Ungültiges OAuth2 redirect_uri" kommt** →
Redirect-URI im Portal nachtragen (siehe „Bekannte Konfigurations-Punkte").

**Wenn Transfer 0 „eligible members" zeigt** →
Members müssen sich einmal neu verifizieren (mit der neuen „Continue with
Discord"-Version), damit der Refresh-Token gespeichert wird.

**Wenn im Backups-Tab „No bot token configured" steht** →
`DISCORD_BOT_TOKEN` in Vercel-Env fehlt oder ist leer.

**Wenn der Channel-Dropdown beim Verify-Post leer bleibt** →
Bot ist nicht im Server oder hat keine `View Channels`-Berechtigung.

**Wenn im Dashboard „No servers connected yet" steht, obwohl der Bot im
Server ist** → Bot einmal aus dem Server entfernen und neu einladen; der
Bot registriert die Guild beim Join in die Datenbank.

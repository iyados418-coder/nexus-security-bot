# Nexus Security Bot — Deployment Guide

## Overview
- **Frontend** → Netlify (free)
- **Backend + Bot** → Fly.io (free, always-on)
- **Logs** → stored on Fly.io VM

---

## 1. Push to GitHub

Create a repository and push your code:

```bash
# Remove large local files first
echo "node_modules/
logs/
dashboard/.next/
dashboard/out/
.env" > .gitignore

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

---

## 2. Deploy Bot + API to Fly.io (Free)

### 2.1 Install flyctl

**Windows (PowerShell):**
```powershell
winget install Fly.io.FlyCtl
```

**Or manually:** https://fly.io/docs/hands-on/install-flyctl/

### 2.2 Sign up & login

```bash
fly auth signup
```

Follow the browser — a credit card is required for verification, but the free tier costs nothing.

### 2.3 Create these files in the root project folder:

**Dockerfile:**
```dockerfile
FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
```

**fly.toml:**
```toml
app = "nexus-security-bot"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

`.dockerignore:`
```
node_modules
.git
logs
dashboard
```

### 2.4 Launch the app

```bash
fly launch --no-deploy
```

This creates the app on Fly.io. It will ask for a name — use `nexus-security-bot` (or your own).

### 2.5 Set secrets (do NOT put these in .env)

```bash
fly secrets set TOKEN=MTQ3NDY5NjQxODU4NDQzMjc2Mw....
fly secrets set CLIENT_ID=1474696418584432763
fly secrets set CLIENT_SECRET=OnAK7djgqWOnEBChS-kn_4crlM4nsaoQ
fly secrets set SESSION_SECRET=nexusdevelopmentdev
fly secrets set DASHBOARD_URL=https://your-dashboard.netlify.app
fly secrets set API_PORT=3001
```

Replace `your-dashboard.netlify.app` with your actual Netlify URL after step 3.

### 2.6 Set memory & deploy

```bash
fly scale memory 256
fly deploy
```

### 2.7 Verify it's running

```bash
fly status
fly logs
```

You should see: `API + WebSocket running on http://localhost:3001`

Your backend URL will be: `https://nexus-security-bot.fly.dev`

---

## 3. Deploy Dashboard to Netlify (Free)

### 3.1 Update env for production

Create a file `dashboard/.env.production`:
```
NEXT_PUBLIC_API_URL=https://nexus-security-bot.fly.dev
```

### 3.2 Deploy via Git (recommended)

1. Go to https://app.netlify.com
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repo
4. Set:
   - **Base directory:** `dashboard`
   - **Build command:** `npm run build`
   - **Publish directory:** `dashboard/out`
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://nexus-security-bot.fly.dev`
6. Click **Deploy site**

### 3.3 Update Discord OAuth URL

Go to https://discord.com/developers/applications/1474696418584432763/oauth2

Set **Redirects:**
```
https://nexus-security-bot.fly.dev/api/auth/discord/callback
```

Also add to the .env secrets on Fly.io:
```bash
fly secrets set OAUTH_URL=https://nexus-security-bot.fly.dev/api/auth/discord/callback
```

### 3.4 Update Fly secrets with the real Netlify URL

```bash
fly secrets set DASHBOARD_URL=https://your-site.netlify.app
```

Then restart:
```bash
fly deploy
```

---

## 4. All Done

| Component | Host | URL |
|-----------|------|-----|
| Dashboard | Netlify | `https://your-site.netlify.app` |
| API + WebSocket | Fly.io | `https://nexus-security-bot.fly.dev` |
| Discord Bot | Fly.io | (same as API) |

### Verify
1. Visit your Netlify URL
2. Log in with Discord
3. Select a server
4. Toggle security modules, view logs, manage voice

### Update after code changes
```bash
git add .
git commit -m "update"
git push
# Netlify auto-deploys
# Fly.io: run "fly deploy" manually
```

---

## Troubleshooting

**Bot won't connect?**
```bash
fly logs
```
Check that `TOKEN` secret is correct.

**Dashboard shows "API offline"?**
- Verify `NEXT_PUBLIC_API_URL` is set correctly on Netlify
- Check `fly logs` — the API should be listening on port 3001

**CORS errors in browser?**
- Make sure `DASHBOARD_URL` secret matches your Netlify URL exactly (no trailing slash)
- Re-deploy: `fly deploy`

**Out of memory?**
The free tier is 256MB. Avoid adding large dependencies. If needed:
```bash
fly scale memory 512
```
(This costs $1.94/mo — or stay at 256MB for free)

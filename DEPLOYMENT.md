# Deployment Guide

Host your Connect app on the web so anyone can register, chat, and see online presence in real time.

## What you need to provide

### Required (for hosting chat today)

| Item | What it is | Where to get it |
|------|------------|-----------------|
| **JWT_SECRET** | Random secret string (32+ chars) for login tokens | Generate: `openssl rand -hex 32` or any password generator |
| **CLIENT_URL** | Your public app URL | Set after deploy, e.g. `https://your-app.onrender.com` |

### Not needed yet (current app)

Your [Metered](https://www.metered.ca/) account is **not required** for text chat, contacts, or presence. The app works without it today.

### Optional (for voice/video calls later)

From your Metered dashboard → **TURN Server**:

| Item | Purpose |
|------|---------|
| **METERED_API_KEY** | Create TURN credentials via REST API |
| **TURN server URLs** | e.g. `turn:global.relay.metered.ca:80` |
| **TURN username & credential** | ICE server auth for WebRTC |

Metered trial: **500 MB/month** on the Global plan (shown in your dashboard). Voice/video uses this quota.

Other Metered products (only if you expand later):

- **Realtime Messaging** — alternative to our Socket.io chat
- **Global Cloud SFU** — group video calls (better than peer-to-peer for many users)
- **Sessions & Rooms** — managed call rooms

---

## Option 1: Render (recommended, free tier)

Good for demos and portfolios. Supports WebSockets and persistent disk for SQLite.

### Steps

1. Push code to GitHub (already done): [github.com/Dilnuka/personalCommunication](https://github.com/Dilnuka/personalCommunication)

2. Go to [render.com](https://render.com) → **New** → **Web Service**

3. Connect repo `Dilnuka/personalCommunication`

4. Settings:
   - **Build command:** `npm run install:all && npm run build`
   - **Start command:** `npm start`
   - **Plan:** Free (or paid for always-on)

5. **Environment variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=<paste a long random secret>
   CLIENT_URL=https://<your-service-name>.onrender.com
   ```
   Set `CLIENT_URL` to the exact URL Render gives you (no trailing slash).

6. **Disk** (important for SQLite):
   - Add disk: mount path `/opt/render/project/src/server/data`, size 1 GB

7. Deploy. Open your URL — the app serves frontend + API + WebSockets from one address.

> **Note:** Free tier sleeps after inactivity (~50s cold start). Upgrade for 24/7 uptime.

---

## Option 2: Docker (VPS, Railway, Fly.io, Azure, etc.)

Works anywhere Docker runs.

```bash
# Create .env in project root
JWT_SECRET=your-long-random-secret
CLIENT_URL=https://your-domain.com

docker compose up -d --build
```

App runs on port **3001**. Put Nginx or Caddy in front for HTTPS.

---

## Option 3: Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select `personalCommunication`
3. Variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<random secret>
   CLIENT_URL=https://<your-app>.up.railway.app
   ```
4. Add a **Volume** mounted at `/app/server/data`
5. Build: `npm run install:all && npm run build`
6. Start: `npm start`

---

## Option 4: VPS (DigitalOcean, Linode, AWS EC2)

```bash
git clone https://github.com/Dilnuka/personalCommunication.git
cd personalCommunication
npm run install:all

# server/.env
cat > server/.env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-here
CLIENT_URL=https://yourdomain.com
EOF

npm run build
NODE_ENV=production npm start
```

Use **PM2** to keep it running:

```bash
npm install -g pm2
pm2 start src/index.js --name connect --cwd server --env production
pm2 save && pm2 startup
```

Point your domain with Nginx reverse proxy + Let's Encrypt SSL.

---

## Verify deployment

1. Open `https://your-url/api/health` → should return `{"status":"ok","environment":"production"}`
2. Register two users in two browsers
3. Add contact and send messages — they should appear instantly

---

## Send me these to deploy for you

If you want help wiring everything up, share:

1. **Hosting choice** — Render, Railway, Docker VPS, or other
2. **JWT_SECRET** — or ask me to generate one (never commit it to GitHub)
3. **Public URL** — after you create the service, or your custom domain
4. **(Later) Metered API key** — only when adding voice/video

---

## Architecture (production)

```
Browser  →  HTTPS  →  Your hosted URL
                         ├── React UI (static files)
                         ├── /api/*  (REST)
                         └── Socket.io (real-time chat)
                         └── SQLite (server/data/app.db)
```

One URL for everything — no separate frontend/backend URLs needed.

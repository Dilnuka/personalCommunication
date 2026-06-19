# Fix: Accounts Lost After Railway Deploy

Your accounts disappear because **SQLite saves to temporary disk** on Railway. Every deploy or restart **wipes that disk**.

## Fix in 3 steps (Railway)

### Step 1 — Add a Volume

1. Open [Railway](https://railway.app) → your project → **personal-communication** service
2. Go to **Settings** → scroll to **Volumes**
3. Click **Add Volume**
4. Set:
   - **Mount path:** `/app/server/data`
   - **Size:** 1 GB (enough for a demo/small app)
5. Save

### Step 2 — Add environment variable

Go to **Variables** → **New Variable**:

| Name | Value |
|------|--------|
| `DATA_DIR` | `/app/server/data` |

Keep your other variables (`JWT_SECRET`, `CLIENT_URL`, etc.).

### Step 3 — Redeploy

Click **Deploy** (or push any commit to trigger deploy).

---

## Verify it worked

After deploy, open:

```
https://personal-communication-production.up.railway.app/api/health
```

You should see:

```json
{
  "status": "ok",
  "environment": "production",
  "database": {
    "path": "/app/server/data/app.db",
    "persistent": true
  }
}
```

If `"persistent": false` → volume or `DATA_DIR` is not set correctly. Data will still be lost on deploy.

---

## Why this happens

| Storage type | What happens on deploy |
|--------------|------------------------|
| **No volume** (default) | All users, chats, messages **deleted** |
| **Volume mounted** | Data **kept** across deploys and restarts |

Railway containers are rebuilt on each deploy. Only files inside a **Volume** survive.

---

## After setting up the volume

- **Old accounts are gone** — they were on the old temporary disk. You need to **register again** (one time).
- New accounts will **persist** through future deploys.

---

## Check deploy logs

After redeploy, in Railway **Deploy Logs** you should see:

```
SQLite database: /app/server/data/app.db
```

If you see a warning about `DATA_DIR is not set`, fix Step 2 above.

---

## Cost note

Railway volumes may require a **paid plan** (Hobby ~$5/month) depending on your account. The free trial credits may cover a small volume. Check your Railway billing page.

If you cannot use a volume on free tier, alternatives are:
- **Turso** (cloud SQLite) — free tier available
- **Railway Postgres** — plugin database

Ask if you want help migrating to a cloud database for permanent free-tier storage.

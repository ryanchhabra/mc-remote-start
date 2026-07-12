# World Status — remote Minecraft server control

Next.js + Auth.js v5 (Discord login) frontend/backend for the remote-start
project. This is the piece your friends actually see: login, a status
display, and a start button. It talks to the Raspberry Pi agent from the
setup guide via two small authenticated endpoints.

## 1. Create a Discord OAuth app

1. Go to https://discord.com/developers/applications > **New Application**.
2. Under **OAuth2** > **General**, copy the **Client ID** and **Client
   Secret** — these become `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET`.
3. Under **OAuth2** > **Redirects**, add:
   - `http://localhost:3000/api/auth/callback/discord` (for local dev)
   - `https://your-deployed-domain.com/api/auth/callback/discord` (once deployed)

## 2. Find your friends' Discord user IDs

In Discord: **User Settings > Advanced > Developer Mode** (toggle on).
Then right-click any username > **Copy User ID**. Collect the IDs of
everyone you want to allow, including yourself.

## 3. Configure environment variables

```
cp .env.example .env
```

Fill in:
- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` — from step 1
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `AUTH_URL` — `http://localhost:3000` locally, your real domain once deployed
- `ALLOWED_DISCORD_IDS` — comma-separated IDs from step 2
- `AGENT_API_KEY` — a long random string. Put this **same value** into
  `BACKEND_URL`'s corresponding `AGENT_API_KEY` in `pi_agent.py` on the
  Raspberry Pi (see the setup guide from earlier).

## 4. Run it locally

```
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in with Discord, and confirm your
account (if it's on the allow-list) reaches the dashboard.

## 5. How it fits together with the Pi

Three endpoints exist purely for the Raspberry Pi agent, authenticated
with `AGENT_API_KEY` as a bearer token (not the friend login):

- `GET /api/agent/command` — the Pi polls this; returns
  `{"command": "start"}` once, then clears it
- `POST /api/agent/status` — the Pi pushes `{"state": ..., "detail": ...}`
  here every few seconds
- `GET /api/status` — what the website itself polls (requires a friend's
  logged-in session, not the agent key)

Set `BACKEND_URL` in `pi_agent.py` to wherever you deploy this app, and
make sure `AGENT_API_KEY` matches on both sides exactly.

## 6. A note on deployment and persistence

`lib/store.ts` keeps status in memory. That's simplest to read and totally
fine **as long as this app runs as one persistent Node process** — for
example `next build && next start` on Railway, Render, Fly.io, or a small
always-on VPS.

If you deploy to Vercel instead, its serverless functions don't guarantee
the same in-memory instance handles every request, so status updates can
occasionally seem to vanish. If you go that route, swap `lib/store.ts` for
a version backed by Vercel KV or Upstash Redis — same exported function
names, so nothing else in the app needs to change.

## 7. Locking things down further (optional, worth doing eventually)

- Rate-limit `/api/start-server` so nobody can spam restarts
- Log who requested a start and when (helpful if something breaks)
- Add a "stop server" flow the same way, if you want friends to be able to
  shut it down too

# Palm Volley · Court Report

A React + Vite pickleball game tracker backed by Supabase. Log games, track stats, share a single group with friends via invite code.

## Run locally

Requires Node 18+.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Deploy to Vercel (3 minutes)

1. Push this folder to a new GitHub repo:

   ```bash
   git init
   git add .
   git commit -m "initial"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/palm-volley-tracker.git
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new), import the repo, and click Deploy. Vercel auto-detects Vite and builds without any config.

3. Share the resulting URL (e.g. `palm-volley-tracker.vercel.app`) with your crew. On iPhone, Safari → Share → "Add to Home Screen" gives a native-feeling app icon.

## Deploy to Netlify

Same deal: push to GitHub, import at [app.netlify.com](https://app.netlify.com). Build command `npm run build`, publish directory `dist`.

## How it works

- **Database** — Supabase Postgres (project `palm-volley-pickle`). Tables: `tracker_groups`, `tracker_players`, `tracker_games`.
- **Auth model** — No user accounts. Each group has a 6-char invite code that acts as a shared secret. All reads/writes go through SECURITY DEFINER RPC functions that validate the code server-side. Anon role is locked out of the tables entirely.
- **Persistence** — The invite code is stored in the browser's `localStorage` so users only enter it once per device.

## Security notes

- The Supabase URL and publishable anon key are baked into the client bundle. That's normal — Supabase's anon key is designed to be public. Security is enforced by the RLS policies and RPC validation, not by hiding the key.
- Anyone with an invite code has full read/write/delete access to that group's data. Share codes with people you trust. If a code leaks, the recovery path is to create a new group.

## Schema changes

All schema lives in Supabase migrations applied via the MCP server. To change the schema, edit migrations in the Supabase dashboard or apply new ones via `apply_migration`.

## File map

```
palm-volley-tracker/
├── index.html              # HTML shell + Google Fonts
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── favicon.svg
│   └── manifest.webmanifest
└── src/
    ├── main.jsx            # React entry
    ├── index.css           # Tailwind
    └── App.jsx             # The entire app (group gate + tracker)
```

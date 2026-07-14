# Palm Volley Tracker — Project Context for Claude Code

This document is a complete handoff brief for a developer (or AI assistant) coming into the Palm Volley Tracker codebase. Read it top-to-bottom before making changes.

---

## 1. Business Context

**Palm Volley Pickle (PVP)** is a pickleball brand based in **Ponte Vedra, FL**, operated by James Sparkman. The business has four revenue lines: competitive and recreational pickleball leagues, private and group coaching with video review, **Erne Pickleball Machine** rentals ($30/hr), and branded merchandise.

There are **two interconnected web projects**:

1. **palmvolleypickle.com** — A member-facing marketing and portal site (dashboards, booking, payments). This is the main brand site.
2. **tracker.palmvolley.com** — *This project.* A casual game tracker for James's friend group. Logs pickleball games, computes stats, manages a roster.

The tracker app started as a standalone single-page React app for James and friends. The longer-term goal is to combine or integrate it with the marketing site at palmvolleypickle.com.

---

## 2. Product Overview — what the tracker does

A mobile-first web app for logging casual pickleball games with a pool of friends. Core flows:

- **Group gate / picker** — first-time users create or join a group via invite link. Existing users either auto-resume their last group or pick from a list (if multi-group)
- **Log a game** — pick singles or doubles, select players from the pool, enter scores, optional note
- **Games tab** — reverse-chronological history of every match. Winners highlighted. Owners (and game creators) can edit or delete
- **Players tab** — roster management with per-player game/W-L summary
- **Stats tab** — summary metrics, Points Won leaderboard with horizontal bars, sortable all-time leaderboard, Streaks summary (4 records: longest win/loss streak record + longest active win/loss streak), top duo callout, all partnerships with duo lookup modal, **session filter** (scope stats to a player pool + date range), CSV export

Data is shared across all devices for users in the same group. Friends can log from their own phones and everyone sees the same data live.

Live site: **tracker.palmvolley.com**

---

## 3. Tech Stack

- **Frontend** — React 18, Vite 5, Tailwind CSS 3, lucide-react icons
- **Backend** — Supabase (Postgres 17 + PostgREST + Supabase Auth)
- **Auth** — Real per-user identity via Supabase Auth (Google OAuth, email/password, magic link). Invite codes are the join mechanism but don't grant access by themselves
- **Hosting** — GitHub repo at `jsparkm-spec/palm-volley-tracker`, deployed on Vercel
- **Domain** — `tracker.palmvolley.com` (Porkbun DNS → Vercel)
- **Persistence helpers** — `localStorage` for active group, session filter

Bundle size at last build: ~492KB JS / 132KB gzipped.

---

## 4. Supabase Project

- **Project name** — `palm-volley-pickle`
- **Project ID** — `lzfadeofasgihhugmwmm`
- **URL** — `https://lzfadeofasgihhugmwmm.supabase.co`
- **Anon (publishable) key** — embedded in the client bundle at `src/lib/supabase.js` (this is normal for Supabase; security is enforced via RLS + SECURITY DEFINER RPCs, not by hiding the key)

All tables are prefixed `tracker_` to namespace them from any future schema the marketing site might add to the same project.

---

## 5. Database Schema

### `tracker_groups`
- `id uuid pk`
- `name text not null`
- `invite_code text unique not null` — legacy 6-char invite code (still in schema, no longer the primary join mechanism)
- `owner_user_id uuid` — references `auth.users.id`. The group's owner.
- `claim_window_open boolean default true` — when true, new members joining via invite can claim an unclaimed player record. When false, only the owner can grant claims.
- `allow_pending_join boolean default true` — when true, invite redeemers without a claim can become "pending" members awaiting owner approval.
- `created_at timestamptz`

### `tracker_players`
- `id uuid pk`
- `name text not null`
- `user_id uuid` — references `auth.users.id`. Set when a real auth user claims this player record. Null = unclaimed (legacy or placeholder records).
- `claimed_at timestamptz` — when the user_id was set
- `group_id uuid` — legacy field, no longer required (player records are now global; rostering goes through tracker_group_players)
- `created_at timestamptz`

### `tracker_group_players`
- `group_id uuid` references tracker_groups
- `player_id uuid` references tracker_players
- PK: (group_id, player_id)
- Many-to-many bridge: a player can be on multiple groups' rosters (same human, multiple friend circles)

### `tracker_memberships`
- `user_id uuid` references auth.users
- `group_id uuid` references tracker_groups
- `role text` — 'owner' | 'member'
- `status text` — 'active' | 'pending'
- `joined_at timestamptz`
- PK: (user_id, group_id)
- Tracks which auth users are members of which groups, and their role + status

### `tracker_games`
- `id uuid pk`
- `group_id uuid` references tracker_groups
- `game_date date not null default current_date`
- `mode text check in ('singles','doubles')`
- `team1 uuid[]` — array of player IDs
- `team2 uuid[]` — array of player IDs
- `score1 int >= 0`
- `score2 int >= 0`
- `note text`
- `created_by uuid` — references auth.users (added in migration 04 for "creator can delete their own games" permission)
- `created_at timestamptz`
- CHECK: team array sizes match mode (1v1 for singles, 2v2 for doubles)
- CHECK: scores can't be tied

### `tracker_invites`
- `id uuid pk`
- `group_id uuid` references tracker_groups
- `short_token text unique` — 6-char URL-safe token (omits I/O/0/1 for clarity). Used in `/i/AB12CD` URLs.
- `created_by uuid` references auth.users
- `revoked_at timestamptz` — null = active, non-null = revoked
- `created_at timestamptz`

### Security model

- **All tables have RLS enabled with zero anon policies.** Direct table access is blocked.
- **All access goes through SECURITY DEFINER RPC functions** that check auth (`auth.uid()`) and membership before any read/write.
- Two helper functions for permission checks: `tracker_is_active_member(group_id)` and `tracker_is_owner(group_id)`

### Key RPC functions

All `SECURITY DEFINER` and granted EXECUTE to `authenticated`:

| Function | Purpose |
|---|---|
| `tracker_create_group_v2(name)` | Atomic group creation: creates group, sets owner, creates player record, adds to roster, creates owner membership |
| `tracker_my_groups()` | Lists groups the caller is a member of |
| `tracker_my_groups_needing_player()` | Lists groups where caller is an active member but has no player record on the roster |
| `tracker_my_player_record()` | Returns the caller's claimed player record if any exists |
| `tracker_unclaimed_players_in_group(group_id)` | Lists unclaimed player records in a group |
| `tracker_claim_player(player_id, group_id)` | Claims an unclaimed player record for the caller |
| `tracker_create_player_for_self(display_name, group_id)` | Creates a new player record for the caller, OR if they already have one, reuses it and adds to the group's roster |
| `tracker_approve_member(user_id, group_id)` | Owner-only: approves a pending member |
| `tracker_reject_member(user_id, group_id)` | Owner-only: removes a pending member |
| `tracker_set_claim_window(group_id, open)` | Owner-only: toggles claim window |
| `tracker_create_invite(group_id)` | Generates a new short-token invite link, revoking any existing primary invite |
| `tracker_active_invite(group_id)` | Returns the current active invite |
| `tracker_resolve_invite(short_token)` | Resolves a token to group info (read-only, used for landing page preview) |
| `tracker_redeem_invite(short_token)` | Joins the caller to the invited group as an active or pending member |
| `tracker_revoke_invite(invite_id)` | Owner-only: revokes an invite |
| `tracker_list_players(group_id)` (v2) | Lists players in a group (auth-aware) |
| `tracker_add_player(group_id, name)` (v2) | Adds a player record to a group's roster |
| `tracker_delete_player(group_id, player_id)` (v2) | Removes a player from a group's roster (owner-only) |
| `tracker_list_games(group_id)` (v2) | Lists games in a group |
| `tracker_add_game(group_id, date, mode, team1, team2, score1, score2, note)` (v2) | Logs a new game; stamps `created_by` |
| `tracker_update_game_v2(game_id, date, score1, score2, note)` | Updates a game's date/scores/note (owner OR creator) |
| `tracker_delete_game_v2(group_id, game_id)` | Deletes a game (owner OR creator only) |

### Legacy v1 RPCs

Earlier v1 RPCs that take `p_code` (invite code) instead of `p_group_id` (`tracker_list_players`, `tracker_add_game`, etc.) still exist but are unused. The client code has a `dataApi` switcher that picks v2 when the user is an authed member of the group, v1 otherwise — currently the v1 path is never reached.

---

## 6. Authentication & Membership Flow

Understanding this is critical because there are many edge cases.

### Sign-up paths

1. **Welcome screen** offers Sign In + Create Account
2. **AuthGate** offers:
   - Google OAuth (works everywhere including iOS PWA — though iOS PWA had historical issues, see "Quirks" section)
   - Email + password
   - Magic link (problematic in iOS PWA — opens in Safari, leaves the PWA signed-out)

### Group join paths

1. **Create a new group** — ClaimOrJoinFlow → enters group name → `tracker_create_group_v2` runs atomically
2. **Join via invite link** — `/i/AB12CD` URL → if not signed in, sign-up flow → on completion, `tracker_redeem_invite` runs

### Post-redeem flow ("fix flow")

After redeeming an invite, the user is a member of the group but doesn't necessarily have a player record on its roster. The `ClaimOrAddPlayerForGroup` screen handles this:

1. **If user has an existing claimed player record** → silently add it to this group's roster (no UI shown). One human, one player record, multiple group rosters.
2. **If user has no record + group has unclaimed records** → show "Are any of these you?" screen with unclaimed players + an "Add me as a new player" option (display name pre-filled from auth metadata)
3. **If user has no record + group has no unclaimed records** → silently create a new player record using their display name from auth metadata

This flow also backfills any existing members who slipped through earlier signup flows without claiming a record. It's detected via `tracker_my_groups_needing_player()` which returns groups where the user is an active member but has no player on the roster.

### Multi-group support

A user can be a member of multiple groups. The `Header` shows the active group with a chevron — tapping opens `GroupSwitcherModal` which lists all the user's groups (with owner/member tags) plus a "Start a new group" option.

### Owner detection

Per-group. Check the user's `tracker_memberships` row for the active group:
```js
const isOwner = memberships.find(m => m.group_id === group.id)?.role === 'owner';
```

---

## 7. Code Structure

### Repo layout

```
palm-volley-tracker/
├── index.html
├── vercel.json              # SPA fallback + /i/:token rewrite for invite links
├── package.json             # React 18, Vite 5, Tailwind 3, lucide-react, @supabase/supabase-js
├── public/
│   ├── favicon.svg
│   └── manifest.webmanifest # PWA manifest for Add to Home Screen
├── supabase/
│   └── *.sql                # Numbered migrations (01-10), all already deployed
└── src/
    ├── main.jsx
    ├── index.css
    ├── lib/
    │   └── supabase.js      # Supabase client + auth helpers + RPC helpers (api, authApi)
    ├── components/
    │   ├── AuthGate.jsx     # Sign in / sign up form
    │   └── Logomark.jsx     # Inline SVG logo
    └── App.jsx              # Everything else — ~6500 lines
```

### Single-file React architecture

`src/App.jsx` is the entire app. This was a deliberate choice — keeps everything searchable and edit-friendly, no module-boundary friction. Don't split it up unless there's a clear reason. New features go into this file.

### Key components in App.jsx (in rough render order)

- **`App`** (root) — Auth/session handling, routing between Welcome / AuthGate / GroupPicker / ClaimOrAddPlayerForGroup / TrackerApp / pending screen
- **`AuthGate`** — Sign in / sign up forms (Google, email, magic link)
- **`Welcome`** — Welcome screen with Sign In / Create Account buttons
- **`GroupPickerScreen`** — Full-screen post-login picker for multi-group users
- **`ClaimOrJoinFlow`** — Create new group OR join via invite code (legacy escape hatch)
- **`ClaimOrAddPlayerForGroup`** — Post-invite player record fix flow (described above)
- **`PendingScreen`** — Shown to users with a pending membership awaiting approval
- **`TrackerApp`** — Main app shell after the user lands in a group. Owns the data API switcher, game/player state, memberships, session filter
- **`Header`** — Top bar with group name (tappable chevron for multi-group users), cloud sync indicator, gear icon
- **`BottomNav`** — Log / Games / Players / Stats
- **`GroupModal`** — Group management modal (invite link, members, settings, leave, sign out)
- **`GroupSwitcherModal`** — Lists user's groups + Start a new group
- **`PlayView`** — Log a game form (singles/doubles, player picker, scores, note)
- **`GamesView`** — Reverse-chrono games list with edit/delete buttons, Spark Rating changes
- **`EditGameModal`** — Edit a game's date/score/note (owner or creator only)
- **`PlayersView`** — Roster with per-player mini-stats
- **`StatsView`** — All the stats. Session filter card at top. Below: metrics trio, Points Won board, all-time leaderboard with multiple sort keys (incl. Spark Rating), DailyLeaderboard (hidden when session filter active), HotStreaksSection (4-card streak summary), Top Duo callout, AllPartnershipsSection with duo lookup modal, CSV export
- **`PlayerProfileView`** — Drill-down profile. Reached by tapping a player's name anywhere. Shows season stats, streaks, Spark Rating card, partner section (truncated), head-to-head section (truncated)
- **`SessionFilterModal`** — Player + time range picker for scoping stats to a session
- **`PartnershipLookupModal`** — Pick 2 players, see their joint record as a duo
- **`ConfirmModal` + `useConfirm`** — Custom in-app confirmation dialog. Always use this instead of `window.confirm` (the latter is broken in iOS PWA)

### Key helpers / hooks

- **`useTruncated(items, keyDep, pageSize)`** — Pagination helper for "show 5/10, Show More" pattern. Resets when keyDep changes.
- **`useConfirm()`** — Returns `{ confirm, ConfirmHost }`. Call `confirm({ title, body, confirmLabel, danger })` → returns a Promise<boolean>. Mount `<ConfirmHost />` once at the top level.
- **`computeStats(players, games)`** — Per-player W/L stats, point diffs, streaks
- **`computePartnerships(players, games)`** — Per-pair team records
- **`computeRatings(players, games)`** — Spark Rating (ELO) per player, separate singles and doubles, with history
- **`applySessionFilter(games, filter)`** — Filters games by player pool + time range
- **`PlayerName`** — Renders a tappable player name that opens their profile via `ProfileNavContext`

### API helpers in `src/lib/supabase.js`

Two namespaces:
- **`api`** — v1 RPCs using `p_code` (invite code). Legacy, currently unused.
- **`authApi`** — v2 RPCs using `p_group_id` + `auth.uid()`. Primary path.

Both expose the same set of methods: `listPlayers`, `addPlayer`, `deletePlayer`, `listGames`, `addGame`, `deleteGame`, `updateGame`, plus authApi-only: `myGroups`, `myGroupsNeedingPlayer`, `myPlayerRecord`, `claimPlayer`, `createPlayerForSelf`, `unclaimedPlayersInGroup`, `approveMember`, `rejectMember`, `setClaimWindow`, `createInvite`, `revokeInvite`, `activeInvite`, `resolveInvite`, `redeemInvite`.

---

## 8. Design System / Brand

### Colors (defined in `App.jsx` as `C`)

```js
const C = {
  navy: "#0a456a",        // primary brand color, used for hero sections, headers
  navyDeep: "#0d2f45",    // darker variant for gradients
  blue: "#1a7ab5",        // secondary blue
  sky: "#60c0e2",         // light accent
  baby: "#a8d8ea",        // even lighter accent
  ice: "#e8f4f8",         // backgrounds, dividers
  coral: "#ea4e33",       // primary CTA / accent color
  coralDeep: "#c13e2a",   // coral hover / gradient end
  cream: "#f6f9fb",       // page background (off-white)
  ink: "#0d2f45",         // body text + dark UI (alias of navyDeep)
  muted: "#7a8f9e",       // muted body text
  line: "#e8f4f8",        // borders (alias of ice)
};
```

### Typography

- **Display / Headlines** — `'Russo One'`, all-caps, wide letter-spacing (`0.01-0.04em`). Used for headings, score displays, big numbers, button labels
- **Body / UI** — `'Lato'`, weights 400 and 700. Section labels are uppercase, letter-spacing `0.18-0.28em`

### Style conventions

- **Sharp corners** — `border-radius: 0-2px` on buttons/cards (use Tailwind `rounded-sm`)
- **Borders** — 1px solid `C.line` for cards
- **Section labels** — `text-[10px] uppercase tracking-[0.22em] font-bold` with `color: C.muted`
- **Numbers/scores** — Russo One, large, navy color
- **CTAs** — coral background, cream text
- **Danger actions** — coral background in modals, "danger: true" passed to confirm()
- **Hero sections** — navy or navy gradient with cream text, often with grain overlay
- **Buttons** — uppercase, letter-spacing 0.18-0.22em, Lato or Russo One

### Lucide icons used heavily

`Zap` (Spark Rating), `Flame` (win streaks), `Snowflake` (loss streaks), `Trophy`, `Handshake` (partners), `Swords` (head-to-head), `Filter`, `Search`, `Pencil`, `Trash2`, `ChevronDown`, `Check`, `X`, `Plus`, `ArrowRight`, `RefreshCw`, `BarChart3`, `ListOrdered`, `TrendingUp`, `Cloud`, `CloudOff`, `Sparkles`, `Download`, `Copy`

---

## 9. Features Built (production)

| Feature | Description |
|---|---|
| **Group system** | Create / join / switch between groups via invite links |
| **Per-user auth** | Google OAuth, email/password, magic link |
| **Invite links** | Short tokens at `/i/AB12CD`, permanent until revoked, owner-managed |
| **Post-invite fix flow** | Detects members without player records and prompts to claim or create |
| **Game logging** | Singles + doubles, optimistic UI, sync indicator |
| **Edit games** | Date / scores / note. Owner or creator only. |
| **Delete games** | With confirmation modal. Owner or creator only. |
| **Player roster** | Add / remove (owner only) with mini-stats |
| **Stats tab** | Metrics, Points Won board, all-time leaderboard, daily leaderboard, streaks, top duo, all partnerships, CSV export |
| **Session filter** | Scope stats to a player pool + time range. Persisted per-group in localStorage. Exclusive (default) or inclusive mode. Pre-populates today's players. |
| **Streaks** | 4-card summary: Win Streak Record, Active Win Streak, Loss Streak Record, Active Loss Streak. Tiebreakers: recency for wins, lowest pointsPct for losses. |
| **Spark Rating** | Separate singles + doubles ELO ratings (branded as Spark Rating). K=40 new players, K=20 established (15+ games). Goal-differential weighting via log2. Backfilled from all historical games. Sortable on leaderboard. Card on player profile with Zap icon. Per-game rating change shown next to scores in Games tab. |
| **Player profile** | Drill-down view with stats, streaks, Spark Rating, partners (truncated), head-to-head (truncated). Truncation: 5 per page on profile, 10 per page on stats tab leaderboards. |
| **Partnership lookup** | Pick any two players, see their record as a duo. Modal accessible via button + tappable rows on All Partnerships. |
| **CSV export** | Games + stats, formatted for Google Sheets import |
| **iOS PWA support** | Add to Home Screen, manifest, safe-area handling. Custom confirmation modal replaces window.confirm (which is unreliable in PWA). |

---

## 10. Quirks & Learned-the-Hard-Way

These are non-obvious things that have bitten us:

### iOS PWA quirks

- **`window.confirm()` is unreliable** — sometimes doesn't render, sometimes auto-dismisses. Use the custom `ConfirmModal` / `useConfirm()` hook instead. (Same goes for `window.alert` and `window.prompt`.)
- **Magic links break the PWA** — the link opens in Safari, which leaves the home-screen PWA signed out. Google OAuth works fine and is the recommended sign-in path for PWA users.
- **`safe-area-inset-top/bottom`** — use these in CSS for top/bottom padding so content doesn't hide behind the notch / home indicator

### Supabase auth quirks

- **`SIGNED_IN` fires on tab refocus** — Supabase re-emits `SIGNED_IN` from `onAuthStateChange` when the tab regains focus, not just for actual sign-ins. We track session continuity via a `hadSessionRef` to distinguish genuine fresh sign-ins from silent token refreshes. Without this, the group picker shows every time you switch tabs.
- **`getSession()` doesn't fire `INITIAL_SESSION`** — we explicitly call `getSession()` on mount to bootstrap session state. The first `onAuthStateChange` event for an existing session is `INITIAL_SESSION`.

### Database / data quirks

- **Curly apostrophes in group names** — iOS auto-corrects `'` to `'` (U+2019, "right single quotation mark"). This breaks ASCII-based string lookups. Always query by UUID, not by name. Example: "Jackie's group" in the DB has a curly apostrophe; `where name = 'Jackie''s group'` (ASCII) returns nothing.
- **`tracker_create_player_for_self` is idempotent** — calling it when the user already has a player record reuses the existing record rather than erroring. Pass `display_name=""` is fine in that case since it's ignored.
- **Player records are global** — one row in `tracker_players` per human, regardless of how many groups they're in. The `tracker_group_players` bridge table connects players to group rosters.

### Spark Rating quirks

- **Computed entirely client-side** — no DB columns store ratings. `computeRatings(players, games)` recomputes from scratch every time games change. This means editing or deleting a game automatically recomputes everyone's rating correctly (no migration needed).
- **K-factor uses game count AT THE TIME** — during chronological replay, K=40 for the first 15 games per mode, K=20 after. Reflects how the rating actually moved historically.
- **Singles and doubles tracked separately** — a singles game only affects singles ratings; doubles affects doubles. Players who haven't played a mode show null/dash.
- **Session filter does NOT scope ratings** — per design decision, Spark Rating is always all-time, never session-scoped. Filter only affects W/L stats.

### Streak tiebreaker rules

- **Win Streak Record + Active Win Streak**: ties broken by **recency** (more recent date wins)
- **Loss Streak Record + Active Loss Streak**: ties broken by **lowest pointsPct** (worse-performing player wins). Thematic: "the worse player gets the streak crown."
- **Final fallback**: alphabetical name for deterministic display

### localStorage keys

- `tracker:group:v3` — `{ id, name, code }` of the active group (per-device, not per-user)
- `tracker:sessionFilter:v1:{groupId}` — session filter, scoped per-group
- `tracker:invite:redeem` — short-lived stash for invite tokens during auth round-trip

### Deployment

- Vercel auto-detects Vite, builds with `npm run build`, output dir is `dist/`
- `vercel.json` has SPA fallback rewrites including `/i/:token` for invite landing pages
- Every push to `main` triggers an auto-deploy

---

## 11. What's NOT yet built

Worth knowing if Claude Code starts proposing these:

- **Push notifications** — not implemented
- **Real-time sync** — games appear only after a manual refresh or tab focus change. No Supabase realtime channels.
- **Photos / videos attached to games** — not implemented
- **Achievements / badges** — discussed, not built
- **Match recaps after logging** — discussed, not built
- **Tournament / bracket mode** — not implemented
- **Multi-sport support** — not implemented (this is pickleball-only)
- **Public group pages** — not implemented (no unauthenticated read access)

---

## 12. Integration Context

The longer-term goal is to integrate this tracker with **palmvolleypickle.com**, the main brand site. The marketing site:

- Lives at palmvolleypickle.com
- Is being built with Next.js on Vercel, also using Supabase
- Will share the same Supabase project (`lzfadeofasgihhugmwmm`)
- Has its own schema (leagues, coaching_sessions, lesson_videos, drill_assignments, etc.) — distinct from the `tracker_*` schema, so they coexist cleanly
- Brand identity matches what's documented in Section 8

When integrating:

- **Don't break the tracker.palmvolley.com subdomain** — friends actively use it
- **Don't change tracker_* table schemas** without careful consideration — RPCs depend on exact column names
- **Auth can be shared** — a single Supabase Auth user can be both a league member (marketing site) and a tracker user (this app). Use the same `auth.users` table.
- **Likely target integration** — a logged-in user on palmvolleypickle.com sees a "My Games" or "Tracker" link in their dashboard that deep-links into the tracker, signed in
- **Visual cohesion** — both sites should share design tokens (colors, fonts, sharp corners, uppercase labels with tracking)

---

## 13. How to make changes safely

1. **Single-file React** — most changes go in `src/App.jsx`. Search for the component name to find it.
2. **Run `npm run build` after edits** to verify no syntax errors. The build is fast (~12 seconds).
3. **Test locally with `npm run dev`** — opens at `localhost:5173`
4. **Database changes** — write a numbered SQL migration file in `supabase/` (e.g. `11_my_change.sql`) and run it via Supabase SQL Editor. Never edit existing migrations.
5. **RPC permission changes** — server-side checks (SECURITY DEFINER + helper functions) must match the client-side `canEdit` / `isOwner` logic, or you'll get UI affordances that fail with permission errors when tapped.
6. **Confirmation dialogs** — always use `useConfirm()` + `<ConfirmHost />`, never `window.confirm()`.
7. **localStorage** — scope per-group via `groupId` in the key if state shouldn't bleed across groups.
8. **Deploy** — push to `main`, Vercel auto-deploys.

---

## 14. Owner info

- **Owner**: James Sparkman
- **Owner email** in DB: `jsparkm@gmail.com`
- **Owner auth user ID**: `a805be2c-aa4c-4425-aa8f-664f94404628`
- **Test groups**: "PVP Test Group" (id `e6f5de94-8f92-4eff-b1a6-54b70bbd0cfa`, 13 players, 37+ games), "Jackie's group" (curly apostrophe!)

---

End of brief. Read in conjunction with the actual `src/App.jsx` for implementation details.

import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from "react";
import {
  Play,
  Users,
  ListOrdered,
  BarChart3,
  Plus,
  Trash2,
  Download,
  Trophy,
  X,
  Calendar,
  CalendarDays,
  TrendingUp,
  Handshake,
  RefreshCw,
  Cloud,
  CloudOff,
  Settings,
  Copy,
  Check,
  LogOut,
  Sparkles,
  KeyRound,
  Flame,
  Snowflake,
  ArrowLeft,
  Swords,
  Medal,
  Zap,
  ArrowRight,
  ChevronDown,
  Pencil,
  Search,
  Filter,
} from "lucide-react";
import Logomark from "./components/Logomark";
import AuthGate from "./components/AuthGate";
import { supabase } from "./lib/supabase";

// ---------- Profile navigation context ----------
// Exposes a single function `openProfile(playerId)` that deep children can call
// to navigate to a player's profile page, without prop-drilling through every view.
// Unwrapped default is a no-op so component rendering is safe outside TrackerApp.
const ProfileNavContext = createContext({ openProfile: () => {} });
const useProfileNav = () => useContext(ProfileNavContext);

// <PlayerName> — a name-shaped button that navigates to a player's profile.
// Used everywhere a player's name appears in the app so the tap target is consistent.
// Pass `fallback` for cases where the player was deleted (id no longer in the roster).
function PlayerName({ id, name, className = "", style, fallback = "(removed)" }) {
  const { openProfile } = useProfileNav();
  if (!id) return <span className={className} style={style}>{fallback}</span>;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openProfile(id);
      }}
      className={`text-left hover:underline decoration-dotted underline-offset-2 ${className}`}
      style={{ background: "transparent", padding: 0, ...style }}
    >
      {name || fallback}
    </button>
  );
}

// ---------- Brand tokens ----------
// Palm Volley Pickle official palette, extracted from the logo SVG source files.
// Aesthetic: "country club gone coastal hip" — navy-dominant, coral as sharp accent.
const C = {
  navy: "#0a456a",        // primary dark, dominant
  navyDeep: "#0d2f45",    // deepest navy — footer, dark surfaces, primary text
  blue: "#1a7ab5",        // secondary blue
  sky: "#60c0e2",         // bright accent — labels on dark, highlights
  babyBlue: "#a8d8ea",    // pale accent
  ice: "#e8f4f8",         // borders, light backgrounds, dividers
  coral: "#ea4e33",       // primary action — CTAs, rank-1 emphasis, "vs"
  coralDeep: "#c13e2a",   // coral hover/pressed state
  cream: "#f6f9fb",       // page background (off-white)
  ink: "#0d2f45",         // near-black text + dark UI (alias of navyDeep)
  muted: "#7a8f9e",       // muted body text
  line: "#e8f4f8",        // borders (alias of ice)
};

const DISPLAY = "'Russo One', 'Archivo Black', sans-serif";
const BODY = "'Lato', -apple-system, sans-serif";

// ---------- Supabase config ----------
const SB_URL = "https://lzfadeofasgihhugmwmm.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZmFkZW9mYXNnaWhodWdtd21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTM2MTQsImV4cCI6MjA5MDY2OTYxNH0.bEBGdj8gXgQyklHU5kP1ArxoJE_629B_qC_0BJbeHyE";

async function rpc(fn, body = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

const api = {
  createGroup: (name) => rpc("tracker_create_group", { p_name: name }),
  joinGroup: (code) => rpc("tracker_join_group", { p_code: code }),
  listPlayers: (code) => rpc("tracker_list_players", { p_code: code }),
  addPlayer: (code, name) => rpc("tracker_add_player", { p_code: code, p_name: name }),
  deletePlayer: (code, id) => rpc("tracker_delete_player", { p_code: code, p_id: id }),
  listGames: (code) => rpc("tracker_list_games", { p_code: code }),
  addGame: (code, game) =>
    rpc("tracker_add_game", {
      p_code: code,
      p_date: game.date,
      p_mode: game.mode,
      p_team1: game.team1,
      p_team2: game.team2,
      p_score1: game.score1,
      p_score2: game.score2,
      p_note: game.note,
    }),
  deleteGame: (code, id) => rpc("tracker_delete_game", { p_code: code, p_id: id }),
};

// Auth-aware RPC calls — go through the Supabase SDK so the user's auth
// token is automatically attached and the server can resolve auth.uid().
async function authRpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || String(error));
  return data;
}

const authApi = {
  myGroups: () => authRpc("tracker_my_groups"),
  myGroupsNeedingPlayer: () => authRpc("tracker_my_groups_needing_player"),
  myPlayerRecord: () => authRpc("tracker_my_player_record"),
  unclaimedPlayersInGroup: (groupId) =>
    authRpc("tracker_unclaimed_players_in_group", { p_group_id: groupId }),
  claimPlayer: (playerId, groupId) =>
    authRpc("tracker_claim_player", { p_player_id: playerId, p_group_id: groupId }),
  createPlayerForSelf: (displayName, groupId) =>
    authRpc("tracker_create_player_for_self", {
      p_display_name: displayName,
      p_group_id: groupId,
    }),
  pendingMembers: (groupId) =>
    authRpc("tracker_pending_members", { p_group_id: groupId }),
  approveMember: (userId, groupId) =>
    authRpc("tracker_approve_member", { p_user_id: userId, p_group_id: groupId }),
  rejectMember: (userId, groupId) =>
    authRpc("tracker_reject_member", { p_user_id: userId, p_group_id: groupId }),
  setClaimWindow: (groupId, open) =>
    authRpc("tracker_set_claim_window", { p_group_id: groupId, p_open: open }),

  // ---- Step 4: auth-aware data access ----
  listPlayers: (groupId) =>
    authRpc("tracker_list_players_v2", { p_group_id: groupId }),
  addPlayer: (groupId, name) =>
    authRpc("tracker_add_player_v2", { p_group_id: groupId, p_name: name }),
  deletePlayer: (groupId, playerId) =>
    authRpc("tracker_delete_player_v2", { p_group_id: groupId, p_player_id: playerId }),
  listGames: (groupId) =>
    authRpc("tracker_list_games_v2", { p_group_id: groupId }),
  addGame: (groupId, game) =>
    authRpc("tracker_add_game_v2", {
      p_group_id: groupId,
      p_date: game.date,
      p_mode: game.mode,
      p_team1: game.team1,
      p_team2: game.team2,
      p_score1: game.score1,
      p_score2: game.score2,
      p_note: game.note,
    }),
  deleteGame: (groupId, gameId) =>
    authRpc("tracker_delete_game_v2", { p_group_id: groupId, p_game_id: gameId }),
  updateGame: (gameId, fields) =>
    authRpc("tracker_update_game_v2", {
      p_game_id: gameId,
      p_date: fields.date,
      p_score1: fields.score1,
      p_score2: fields.score2,
      p_note: fields.note ?? null,
    }),

  // ---- Step 5: invite links ----
  createInvite: (groupId) =>
    authRpc("tracker_create_invite", { p_group_id: groupId }),
  redeemInvite: (token) =>
    authRpc("tracker_redeem_invite", { p_token: token }),
  resolveInvite: (token) =>
    authRpc("tracker_resolve_invite", { p_token: token }),
  revokeInvite: (inviteId) =>
    authRpc("tracker_revoke_invite", { p_invite_id: inviteId }),
  activeInvite: (groupId) =>
    authRpc("tracker_active_invite", { p_group_id: groupId }),

  // ---- Group creation (auth-aware) ----
  createGroup: (name, displayName) =>
    authRpc("tracker_create_group_v2", {
      p_name: name,
      p_display_name: displayName || null,
    }),
};

// ---------- Helpers ----------
//
// All date math is anchored to Pacific Time so the "day boundary" is
// consistent regardless of where the user physically is. America/Los_Angeles
// handles PDT/PST switching automatically.
//
// Use Intl.DateTimeFormat (rather than naive offset math) so DST transitions
// don't silently corrupt dates twice a year.
const APP_TZ = "America/Los_Angeles";

// Returns a YYYY-MM-DD string for "now" in Pacific Time. This is what we
// store in tracker_games.game_date and use for "today" comparisons.
const todayISO = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
};

// Formats a YYYY-MM-DD date string for display ("Apr 27, 2026"). The input
// is already a wall-clock date string from the DB; we render it in en-US
// without applying timezone math (since YYYY-MM-DD has no time component
// to shift). Anchoring to Pacific via timeZone is still safe and prevents
// the next-day-bug on east-coast machines for ISO strings parsed at UTC.
const fmtDate = (iso) => {
  if (!iso) return "";
  // Treat the date as Pacific noon to avoid edge-case rounding around midnight.
  const d = new Date(`${iso}T12:00:00-08:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: APP_TZ,
  });
};

// ---- Truncated lists ----
// Shared pattern for "show N at a time, expand by N on tap." Returns the
// sliced array, the remaining count, and an expand function. Reset by
// changing the `keyDep` (e.g. a player id) so navigating to a different
// profile resets the count back to the page size.
const TRUNCATED_PAGE = 5;

function useTruncated(items, keyDep = null, pageSize = TRUNCATED_PAGE) {
  const [visible, setVisible] = useState(pageSize);
  // Reset when the key changes — different profile, different list.
  useEffect(() => {
    setVisible(pageSize);
  }, [keyDep, pageSize]);
  const total = items.length;
  const sliced = items.slice(0, visible);
  const remaining = Math.max(0, total - visible);
  const next = Math.min(pageSize, remaining);
  return {
    sliced,
    remaining,
    next,
    showMore: () => setVisible((v) => v + pageSize),
  };
}

const mapGame = (g) => ({
  id: g.id,
  date: g.game_date,
  mode: g.mode,
  team1: g.team1 || [],
  team2: g.team2 || [],
  score1: g.score1,
  score2: g.score2,
  note: g.note,
  createdAt: g.created_at,
  createdBy: g.created_by || null,
});

const GROUP_STORAGE_KEY = "tracker:group:v3";

async function loadGroupFromStorage() {
  try {
    const raw = localStorage.getItem(GROUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function saveGroupToStorage(group) {
  try {
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(group));
  } catch (e) {}
}

async function clearGroupFromStorage() {
  try {
    localStorage.removeItem(GROUP_STORAGE_KEY);
  } catch (e) {}
}

// ---- Session filter helpers ----
// A session filter scopes the Stats tab to a subset of games — typically
// "the four of us tonight" or "this week's games." Filter is persisted
// per-group so switching groups doesn't carry the filter over.
//
// Filter shape:
//   {
//     playerIds: ['uuid', 'uuid'],      // required, the session's player pool
//     mode: 'exclusive' | 'inclusive',  // exclusive = only games where every
//                                       //   player on both teams is in the
//                                       //   pool; inclusive = any game with
//                                       //   at least one selected player
//     timeRange: 'all' | 'today' | 'last7' | 'date' | 'custom',
//     date: 'YYYY-MM-DD' | null,        // for timeRange='date'
//     dateStart: 'YYYY-MM-DD' | null,   // for timeRange='custom'
//     dateEnd: 'YYYY-MM-DD' | null,     // for timeRange='custom'
//   }
const SESSION_FILTER_KEY_PREFIX = "tracker:sessionFilter:v1:";

function loadSessionFilter(groupId) {
  if (!groupId) return null;
  try {
    const raw = localStorage.getItem(SESSION_FILTER_KEY_PREFIX + groupId);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveSessionFilter(groupId, filter) {
  if (!groupId) return;
  try {
    if (filter) {
      localStorage.setItem(SESSION_FILTER_KEY_PREFIX + groupId, JSON.stringify(filter));
    } else {
      localStorage.removeItem(SESSION_FILTER_KEY_PREFIX + groupId);
    }
  } catch (e) {}
}

// Returns the games matching the filter. Returns the full games array if
// filter is null or has no playerIds (filter is not yet meaningful).
function applySessionFilter(games, filter) {
  if (!filter || !filter.playerIds || filter.playerIds.length === 0) return games;

  const idSet = new Set(filter.playerIds);
  const today = todayISO();

  // Compute time bounds. dateStart/dateEnd are inclusive YYYY-MM-DD strings.
  let dateStart = null;
  let dateEnd = null;
  if (filter.timeRange === "today") {
    dateStart = today;
    dateEnd = today;
  } else if (filter.timeRange === "last7") {
    // Last 7 days inclusive of today (ISO date arithmetic).
    const d = new Date(`${today}T12:00:00-08:00`);
    d.setDate(d.getDate() - 6);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dateStart = `${y}-${m}-${dd}`;
    dateEnd = today;
  } else if (filter.timeRange === "date" && filter.date) {
    dateStart = filter.date;
    dateEnd = filter.date;
  } else if (filter.timeRange === "custom") {
    dateStart = filter.dateStart || null;
    dateEnd = filter.dateEnd || null;
  }
  // "all" → both null → no time bound

  return games.filter((g) => {
    // Time bounds (string compare works on YYYY-MM-DD)
    if (dateStart && g.date < dateStart) return false;
    if (dateEnd && g.date > dateEnd) return false;

    // Player-set membership
    const allTeamPlayers = [...g.team1, ...g.team2];
    if (filter.mode === "exclusive") {
      // Every player on both teams must be in the selected set.
      return allTeamPlayers.every((pid) => idSet.has(pid));
    } else {
      // Inclusive: at least one selected player appears in the game.
      return allTeamPlayers.some((pid) => idSet.has(pid));
    }
  });
}

// ---- Invite link helpers ----
// URL pattern: tracker.palmvolley.com/i/AB12CD
// Token gets stored locally so it survives the auth round-trip (sign in → email
// confirmation → redirect back). On the next mount when the user is signed in,
// we redeem the stored token automatically.
const INVITE_TOKEN_KEY = "tracker:pendingInvite:v1";

function readInviteTokenFromUrl() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/^\/i\/([A-Z0-9]{4,12})$/i);
  return m ? m[1].toUpperCase() : null;
}

function stashInviteToken(token) {
  try {
    localStorage.setItem(INVITE_TOKEN_KEY, token);
  } catch (e) {}
}

function readStashedInviteToken() {
  try {
    return localStorage.getItem(INVITE_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function clearStashedInviteToken() {
  try {
    localStorage.removeItem(INVITE_TOKEN_KEY);
  } catch (e) {}
}

// Strip the /i/{token} from the address bar after redemption (avoids
// re-redeeming on reload + cleans up the URL).
function clearInviteUrl() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/i/")) {
    window.history.replaceState(null, "", "/");
  }
}

// ---------- Stats ----------
// Computes per-player stats across a given set of games. Games can be passed
// in any order — we sort chronologically internally for streak tracking.
// `trackStreaks` controls whether streak fields are populated (only needed for
// the all-time leaderboard; daily snapshots don't need them).
function computeStats(players, games, { trackStreaks = true } = {}) {
  const byId = {};
  players.forEach((p) => {
    byId[p.id] = {
      id: p.id,
      name: p.name,
      games: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsPossible: 0,
      // Streak tracking, only meaningful with trackStreaks=true:
      //   currentStreak: positive = active win streak length, negative = loss streak
      //   bestWinStreak: longest win streak ever (positive int)
      //   bestLossStreak: longest loss streak ever (positive int)
      //   bestWinStreakEndedAt / bestLossStreakEndedAt: date of the last game
      //     in the best-of-each streak — used as tiebreakers (recency wins)
      //   lastGameDate: date of the most recent game played — used as
      //     tiebreaker for active streak records
      //   _run: internal accumulator (stripped at the end)
      currentStreak: 0,
      bestWinStreak: 0,
      bestLossStreak: 0,
      bestWinStreakEndedAt: null,
      bestLossStreakEndedAt: null,
      lastGameDate: null,
      _run: 0,
    };
  });

  // For streak tracking we need chronological order (oldest → newest).
  // DB returns games newest-first, so we sort a copy. Tie-break on createdAt
  // so same-day games keep their logged order.
  const chronological = games
    .slice()
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ac = a.createdAt || "";
      const bc = b.createdAt || "";
      return ac < bc ? -1 : ac > bc ? 1 : 0;
    });

  chronological.forEach((g) => {
    const t1Won = g.score1 > g.score2;
    const cap = Math.max(g.score1, g.score2);

    const applyTo = (pid, teamScore, oppScore, won) => {
      const s = byId[pid];
      if (!s) return;
      s.games += 1;
      s[won ? "wins" : "losses"] += 1;
      s.pointsFor += teamScore;
      s.pointsAgainst += oppScore;
      s.pointsPossible += cap;
      // Track most-recent game date for active-streak tiebreakers. Games
      // are processed chronologically, so the last write wins.
      s.lastGameDate = g.date;

      if (trackStreaks) {
        // Extend the current run if the outcome matches its sign, otherwise reset.
        // _run is positive for an active win streak, negative for a loss streak.
        if (won) {
          s._run = s._run > 0 ? s._run + 1 : 1;
          // Update best win streak if we've matched or extended it. We use
          // >= (not just >) so the "ended at" timestamp gets refreshed on
          // ties — the more recent occurrence of the same length wins.
          if (s._run >= s.bestWinStreak) {
            s.bestWinStreak = s._run;
            s.bestWinStreakEndedAt = g.date;
          }
        } else {
          s._run = s._run < 0 ? s._run - 1 : -1;
          if (-s._run >= s.bestLossStreak) {
            s.bestLossStreak = -s._run;
            s.bestLossStreakEndedAt = g.date;
          }
        }
      }
    };

    g.team1.forEach((pid) => applyTo(pid, g.score1, g.score2, t1Won));
    g.team2.forEach((pid) => applyTo(pid, g.score2, g.score1, !t1Won));
  });

  return Object.values(byId).map((s) => {
    const { _run, ...rest } = s;
    return {
      ...rest,
      winPct: s.games > 0 ? s.wins / s.games : 0,
      diff: s.pointsFor - s.pointsAgainst,
      ppg: s.games > 0 ? s.pointsFor / s.games : 0,
      pointsPct: s.pointsPossible > 0 ? s.pointsFor / s.pointsPossible : 0,
      currentStreak: trackStreaks ? _run : 0,
    };
  });
}

// ---------- Spark Rating ----------
// Computes singles and doubles Spark ratings for every player by replaying
// all games chronologically. Two ratings tracked separately — a singles
// game only updates singles ratings, doubles only doubles. Players who
// haven't played a given mode have null rating + 0 games for that mode.
//
// Math (standard ELO under the hood, branded as "Spark"):
//   expected = 1 / (1 + 10^((oppRating - myRating) / 400))
//   actual   = 1 if won else 0
//   marginMult = log2(margin + 1) — pickleball margins range 1..11+
//   K = 40 while player has < 15 games in that mode, else 20
//   ratingChange = K × marginMult × (actual - expected)
//
// For doubles, the team's "rating" is the average of its two players; the
// rating change is applied equally to both players on the team. This
// dampens the impact when a strong + weak player partner up: winning
// gives less credit than expected (because they were "supposed to" win),
// losing costs more.
//
// History is tracked per player per mode: each entry records the date,
// the post-game rating, the change applied, and the game id (so we can
// render rating changes next to each game in the games list).
const SPARK_INITIAL = 1500;
const SPARK_K_NEW = 40;
const SPARK_K_ESTABLISHED = 20;
const SPARK_ESTABLISHED_THRESHOLD = 15;

function computeRatings(players, games) {
  const byId = {};
  players.forEach((p) => {
    byId[p.id] = {
      id: p.id,
      name: p.name,
      singlesRating: SPARK_INITIAL,
      singlesGames: 0,
      singlesHistory: [],
      doublesRating: SPARK_INITIAL,
      doublesGames: 0,
      doublesHistory: [],
    };
  });

  // Replay games oldest → newest. Same chronological sort used by computeStats.
  const chronological = games
    .slice()
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ac = a.createdAt || "";
      const bc = b.createdAt || "";
      return ac < bc ? -1 : ac > bc ? 1 : 0;
    });

  chronological.forEach((g) => {
    const isSingles = g.mode === "singles";
    const ratingKey = isSingles ? "singlesRating" : "doublesRating";
    const gamesKey = isSingles ? "singlesGames" : "doublesGames";
    const historyKey = isSingles ? "singlesHistory" : "doublesHistory";

    const team1Players = g.team1.map((id) => byId[id]).filter(Boolean);
    const team2Players = g.team2.map((id) => byId[id]).filter(Boolean);
    if (team1Players.length === 0 || team2Players.length === 0) return;

    const team1Rating =
      team1Players.reduce((sum, p) => sum + p[ratingKey], 0) / team1Players.length;
    const team2Rating =
      team2Players.reduce((sum, p) => sum + p[ratingKey], 0) / team2Players.length;

    const team1Won = g.score1 > g.score2;
    const margin = Math.abs(g.score1 - g.score2);
    const marginMult = Math.log2(Math.max(1, margin) + 1);

    const expected1 = 1 / (1 + Math.pow(10, (team2Rating - team1Rating) / 400));
    const expected2 = 1 - expected1;
    const actual1 = team1Won ? 1 : 0;
    const actual2 = team1Won ? 0 : 1;

    // Apply rating change to each player on each team. K-factor is per-player
    // based on their game count BEFORE this game (true to "K decreases as
    // experience grows").
    const applyTeam = (teamPlayers, expected, actual) => {
      teamPlayers.forEach((p) => {
        const k = p[gamesKey] < SPARK_ESTABLISHED_THRESHOLD ? SPARK_K_NEW : SPARK_K_ESTABLISHED;
        const change = k * marginMult * (actual - expected);
        p[ratingKey] = p[ratingKey] + change;
        p[gamesKey] = p[gamesKey] + 1;
        p[historyKey].push({
          date: g.date,
          gameId: g.id,
          rating: p[ratingKey],
          change,
        });
      });
    };

    applyTeam(team1Players, expected1, actual1);
    applyTeam(team2Players, expected2, actual2);
  });

  // Round ratings to integers for display, and replace 1500 default with null
  // for modes the player has never played (so we don't show 1500 next to a
  // player who's never played singles).
  return Object.values(byId).map((p) => ({
    id: p.id,
    name: p.name,
    singlesRating: p.singlesGames > 0 ? Math.round(p.singlesRating) : null,
    singlesGames: p.singlesGames,
    singlesHistory: p.singlesHistory,
    doublesRating: p.doublesGames > 0 ? Math.round(p.doublesRating) : null,
    doublesGames: p.doublesGames,
    doublesHistory: p.doublesHistory,
  }));
}

function computePartnerships(players, games) {
  const map = {};
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "—";
  games.forEach((g) => {
    [
      { team: g.team1, won: g.score1 > g.score2 },
      { team: g.team2, won: g.score2 > g.score1 },
    ].forEach(({ team, won }) => {
      if (team.length !== 2) return;
      const [a, b] = [...team].sort();
      const key = `${a}|${b}`;
      if (!map[key]) map[key] = { a, b, aName: nameOf(a), bName: nameOf(b), games: 0, wins: 0 };
      map[key].games += 1;
      if (won) map[key].wins += 1;
    });
  });
  return Object.values(map).map((p) => ({ ...p, winPct: p.games ? p.wins / p.games : 0 }));
}

// Leaderboard comparator. Every sort key resolves ties with point differential
// so identical primary values don't reorder randomly run-to-run.
//   winPct     → ties: diff, then wins
//   pointsPct  → ties: diff, then pointsFor
//   wins       → ties: diff, then winPct
//   games      → ties: diff, then winPct
//   diff       → ties: wins, then games (diff is the primary, so tiebreakers differ)
//   ppg        → ties: diff, then games
function compareBySortKey(sortKey) {
  return (a, b) => {
    switch (sortKey) {
      case "winPct":
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.wins - a.wins;
      case "pointsPct":
        if (b.pointsPct !== a.pointsPct) return b.pointsPct - a.pointsPct;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.pointsFor - a.pointsFor;
      case "wins":
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.winPct - a.winPct;
      case "games":
        if (b.games !== a.games) return b.games - a.games;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.winPct - a.winPct;
      case "diff":
        if (b.diff !== a.diff) return b.diff - a.diff;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.games - a.games;
      case "ppg":
        if (b.ppg !== a.ppg) return b.ppg - a.ppg;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.games - a.games;
      case "singlesRating": {
        // Players who haven't played singles get null and sort to the bottom.
        const ar = a.singlesRating, br = b.singlesRating;
        if (ar == null && br == null) return b.diff - a.diff;
        if (ar == null) return 1;
        if (br == null) return -1;
        if (br !== ar) return br - ar;
        return b.singlesGames - a.singlesGames;
      }
      case "doublesRating": {
        const ar = a.doublesRating, br = b.doublesRating;
        if (ar == null && br == null) return b.diff - a.diff;
        if (ar == null) return 1;
        if (br == null) return -1;
        if (br !== ar) return br - ar;
        return b.doublesGames - a.doublesGames;
      }
      default:
        return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
    }
  };
}

// ---------- Root ----------
export default function App() {
  // Group state. Used to remember the chosen group across reloads.
  const [group, setGroup] = useState(null); // { id, name, code }
  const [bootstrapped, setBootstrapped] = useState(false);

  // ---- Auth + memberships ----
  // session: undefined = loading, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);
  // memberships: undefined = loading, [] = none, [{...}] = list
  const [memberships, setMemberships] = useState(undefined);
  // When true, an existing-member user has tapped "Start a new group" from
  // the switcher and is being routed through the create-group flow. Resets
  // when the flow completes or is cancelled.
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);

  // ---- Invite link state ----
  // The token currently being processed (either fresh from URL on this load,
  // or stashed from a prior load that bounced through auth). Null if none.
  const [pendingInviteToken, setPendingInviteToken] = useState(null);
  // Set after we successfully redeem so the success ribbon can show one tick
  // and we don't try to redeem twice.
  const [redeemedToken, setRedeemedToken] = useState(null);
  // Becomes the {id, name} of the resolved group after redemption — used to
  // route the user straight into that group on next render.
  const [redeemedGroup, setRedeemedGroup] = useState(null);
  // Error from a failed redeem, surfaced on the invite landing screen.
  const [inviteError, setInviteError] = useState(null);

  // refreshMemberships re-queries the user's group memberships. Called after
  // claim/join/redeem actions and on auth state changes.
  const refreshMemberships = useCallback(async () => {
    try {
      const data = await authApi.myGroups();
      setMemberships(data || []);
      return data || [];
    } catch (e) {
      console.error("Failed to load memberships", e);
      setMemberships([]);
      return [];
    }
  }, []);

  // ---- Bootstrap: read invite token from URL once on mount ----
  // If the URL is /i/{TOKEN}, capture it, stash to localStorage so it survives
  // the auth round-trip, and clean the URL so reload doesn't re-trigger.
  useEffect(() => {
    const fromUrl = readInviteTokenFromUrl();
    const stashed = readStashedInviteToken();
    const token = fromUrl || stashed;
    if (token) {
      setPendingInviteToken(token);
      if (fromUrl) {
        stashInviteToken(fromUrl);
        clearInviteUrl();
      }
    }
  }, []);

  // True for the duration of a fresh sign-in flow — set when Supabase fires
  // SIGNED_IN, cleared after the picker has been shown (or on sign-out).
  // Drives "show picker on fresh login but bypass on simple reload."
  const [freshLogin, setFreshLogin] = useState(false);

  // Groups where the user is an active member but has NO player record on
  // the roster. Drives the post-login fix flow. Empty array = nothing to fix.
  // undefined = haven't checked yet for the current memberships state.
  const [groupsNeedingPlayer, setGroupsNeedingPlayer] = useState(undefined);

  // ---- Auth session lifecycle ----
  // Track whether this tab has ever seen a non-null session. Supabase fires
  // SIGNED_IN both for genuine fresh sign-ins AND when the tab regains focus
  // (a quirk of how it re-checks session validity on visibilitychange). We
  // only want to treat it as a "fresh login" the FIRST time we see a session
  // in this tab — subsequent SIGNED_IN events while a session already exists
  // are silent refreshes, not real logins.
  const hadSessionRef = useRef(false);

  useEffect(() => {
    let unsub = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      if (data.session) hadSessionRef.current = true;
      const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
        // If we already had a session and we're getting another non-null one,
        // it's a refresh / re-focus — don't churn membership state.
        const isRefresh =
          hadSessionRef.current && newSession && event !== "SIGNED_OUT";

        if (!isRefresh) {
          setSession(newSession ?? null);
          setMemberships(newSession ? undefined : []);
        }

        // Track that we've had a session for the next event.
        if (newSession) hadSessionRef.current = true;
        if (event === "SIGNED_OUT") hadSessionRef.current = false;

        // Only treat SIGNED_IN as a fresh login if it's the FIRST session
        // we've seen in this tab. Re-emitted SIGNED_IN events from tab
        // re-focus would otherwise force the picker every time.
        if (event === "SIGNED_IN" && !isRefresh) setFreshLogin(true);
        if (event === "SIGNED_OUT") setFreshLogin(false);
      });
      unsub = sub?.subscription;
    })();
    return () => {
      unsub?.unsubscribe?.();
    };
  }, []);

  // ---- Memberships fetch on session ----
  useEffect(() => {
    if (session) {
      refreshMemberships();
    } else {
      setMemberships(undefined);
    }
  }, [session, refreshMemberships]);

  // Clear the fresh-login flag once the user has memberships AND only one
  // active group (no picker possible). Prevents the flag from sticking around
  // and forcing a picker on a future reload — which would surprise users.
  useEffect(() => {
    if (
      freshLogin &&
      memberships !== undefined &&
      memberships.filter((m) => m.status === "active").length <= 1
    ) {
      setFreshLogin(false);
    }
  }, [freshLogin, memberships]);

  // Whenever memberships change, recompute which (if any) groups the user is
  // a member of without having a player record on the roster. Ensures every
  // active member ends up with a player record (claimed or freshly created).
  useEffect(() => {
    if (!session || memberships === undefined) {
      setGroupsNeedingPlayer(undefined);
      return;
    }
    if (memberships.filter((m) => m.status === "active").length === 0) {
      setGroupsNeedingPlayer([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await authApi.myGroupsNeedingPlayer();
        if (!cancelled) setGroupsNeedingPlayer(rows || []);
      } catch (e) {
        console.error("Failed to load groups needing player", e);
        if (!cancelled) setGroupsNeedingPlayer([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, memberships]);

  // Helper to refresh the needing-player list (after a successful claim or
  // create-player call). Used by the fix flow.
  const refreshGroupsNeedingPlayer = useCallback(async () => {
    try {
      const rows = await authApi.myGroupsNeedingPlayer();
      setGroupsNeedingPlayer(rows || []);
      return rows || [];
    } catch (e) {
      console.error(e);
      setGroupsNeedingPlayer([]);
      return [];
    }
  }, []);

  // ---- Auto-redeem: when signed-in user has a pending token, redeem it ----
  // Runs once memberships have loaded for the current session, so we know
  // whether the user is already a member of the invited group.
  useEffect(() => {
    if (!session || !pendingInviteToken || memberships === undefined) return;
    if (redeemedToken === pendingInviteToken) return; // already redeemed
    (async () => {
      try {
        const groupRow = await authApi.redeemInvite(pendingInviteToken);
        const g = {
          id: groupRow.id,
          name: groupRow.name,
          code: groupRow.invite_code,
        };
        setRedeemedGroup(g);
        setRedeemedToken(pendingInviteToken);
        await saveGroupToStorage(g);
        clearStashedInviteToken();
        await refreshMemberships();
      } catch (e) {
        setInviteError(e.message || "Couldn't accept this invite link.");
        clearStashedInviteToken();
        setPendingInviteToken(null);
      }
    })();
  }, [session, pendingInviteToken, memberships, redeemedToken, refreshMemberships]);

  // ---- Group restoration from localStorage ----
  // Just remembers the user's last viewed group across reloads. Membership
  // truth comes from the server.
  useEffect(() => {
    (async () => {
      const saved = await loadGroupFromStorage();
      if (saved?.id) setGroup(saved);
      setBootstrapped(true);
    })();
  }, []);

  // ---- Routing ----

  // Wait for auth + bootstrap to settle.
  if (!bootstrapped || session === undefined) {
    return <Splash message="Warming up the court…" />;
  }

  // Signed-out user → AuthGate. Pass the invite token (if present) so the
  // welcome screen can show "you've been invited" context. The token has
  // already been stashed to localStorage; once they sign in, the
  // auto-redeem effect picks it up.
  if (!session) {
    return <AuthGate invitedTo={pendingInviteToken || null} />;
  }

  // Signed in: wait for memberships to load before deciding where to route.
  if (memberships === undefined) {
    return <Splash message="Loading your groups…" />;
  }

  // If there's a pending token still being redeemed, hold here.
  if (pendingInviteToken && !redeemedToken && !inviteError) {
    return <Splash message="Accepting your invite…" />;
  }

  const activeMemberships = memberships.filter((m) => m.status === "active");
  const pendingMemberships = memberships.filter((m) => m.status === "pending");

  // Wait for the "do I have a player record everywhere I'm a member?" check
  // to complete before deciding what to render. Avoids briefly showing the
  // tracker only to immediately route away to the fix flow.
  if (activeMemberships.length > 0 && groupsNeedingPlayer === undefined) {
    return <Splash message="Checking your roster…" />;
  }

  // If the user is an active member of any group without a player record on
  // its roster, route them through the fix flow for the first such group.
  // After that group is fixed, the next render handles the next one (if any).
  if (groupsNeedingPlayer && groupsNeedingPlayer.length > 0) {
    const target = groupsNeedingPlayer[0];
    return (
      <ClaimOrAddPlayerForGroup
        target={target}
        session={session}
        onComplete={async () => {
          // After successful claim/create, recheck. If there are more groups
          // needing fixing, we'll re-render into the next one.
          await refreshGroupsNeedingPlayer();
          await refreshMemberships();
        }}
        onSignOut={async () => {
          setMemberships(undefined);
          setGroupsNeedingPlayer(undefined);
          await supabase.auth.signOut();
        }}
      />
    );
  }

  // If user has active memberships but tapped "Start a new group" from the
  // switcher, route into ClaimOrJoinFlow to capture the new group's name.
  // The existing user already has a player record claimed, so the SQL
  // tracker_create_group_v2 will reuse it (no new player created).
  if (activeMemberships.length > 0 && isCreatingNewGroup) {
    return (
      <ClaimOrJoinFlow
        session={session}
        forcedIntent="create-group"
        onComplete={async () => {
          setIsCreatingNewGroup(false);
          await refreshMemberships();
        }}
        onCancel={() => setIsCreatingNewGroup(false)}
        onSignOut={async () => {
          setMemberships(undefined);
          await supabase.auth.signOut();
        }}
      />
    );
  }

  // Active memberships → tracker. Prefer redeemed group, then saved, then most recent.
  if (activeMemberships.length > 0) {
    const fromRedeem =
      redeemedGroup &&
      activeMemberships.find((m) => m.group_id === redeemedGroup.id) &&
      redeemedGroup;
    const fromSaved =
      group && activeMemberships.find((m) => m.group_id === group.id) && group;

    // Multi-group + fresh login → show picker. Bypasses if:
    //   (a) only one group (nothing to pick),
    //   (b) user just redeemed an invite (intent already expressed),
    //   (c) reload-with-existing-session AND the saved group is valid.
    const shouldShowPicker =
      activeMemberships.length > 1 &&
      !fromRedeem &&
      (freshLogin || !fromSaved);

    if (shouldShowPicker) {
      return (
        <GroupPickerScreen
          memberships={activeMemberships}
          onPick={async (m) => {
            const g = {
              id: m.group_id,
              name: m.name,
              code: m.invite_code,
            };
            setGroup(g);
            await saveGroupToStorage(g);
            setFreshLogin(false);
          }}
          onCreateGroup={() => {
            setFreshLogin(false);
            setIsCreatingNewGroup(true);
          }}
          onSignOut={async () => {
            await clearGroupFromStorage();
            setGroup(null);
            setMemberships(undefined);
            setRedeemedGroup(null);
            setRedeemedToken(null);
            setPendingInviteToken(null);
            setFreshLogin(false);
            await supabase.auth.signOut();
          }}
        />
      );
    }

    const chosen =
      fromRedeem ||
      fromSaved || {
        id: activeMemberships[0].group_id,
        name: activeMemberships[0].name,
        code: activeMemberships[0].invite_code,
      };
    return (
      <TrackerApp
        group={chosen}
        session={session}
        memberships={memberships}
        onLeaveGroup={async () => {
          await clearGroupFromStorage();
          setGroup(null);
          await refreshMemberships();
        }}
        onSignOut={async () => {
          await clearGroupFromStorage();
          setGroup(null);
          setMemberships(undefined);
          setRedeemedGroup(null);
          setRedeemedToken(null);
          setPendingInviteToken(null);
          await supabase.auth.signOut();
        }}
        onMembershipsChanged={refreshMemberships}
        onSwitchGroup={async (g) => {
          setGroup(g);
          await saveGroupToStorage(g);
        }}
        onCreateGroup={() => setIsCreatingNewGroup(true)}
      />
    );
  }

  // Only pending memberships → waiting screen.
  if (pendingMemberships.length > 0) {
    return (
      <JoinPendingScreen
        memberships={pendingMemberships}
        onRefresh={refreshMemberships}
        onSignOut={async () => {
          setMemberships(undefined);
          await supabase.auth.signOut();
        }}
      />
    );
  }

  // Signed in, no memberships, no pending invite → claim/join flow.
  return (
    <ClaimOrJoinFlow
      session={session}
      onComplete={refreshMemberships}
      onSignOut={async () => {
        setMemberships(undefined);
        await supabase.auth.signOut();
      }}
    />
  );
}

function Splash({ message }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: C.cream, fontFamily: BODY, color: C.muted }}
    >
      <div className="text-center">
        <Logomark className="w-14 h-14 mx-auto mb-4" />
        <div className="inline-block animate-spin mb-3">
          <RefreshCw size={18} />
        </div>
        <div className="text-xs uppercase tracking-[0.22em] font-bold">{message}</div>
      </div>
    </div>
  );
}


// ---------- Group Picker Screen ----------
// Full-screen post-login picker for users in multiple groups. Shown only on
// fresh login (Supabase SIGNED_IN event) — same-session reloads bypass via
// the saved-group fast path. Each group is a stacked rectangular button;
// "+ Start a new group" sits at the bottom for users who want to create
// another group instead of picking an existing one.
function GroupPickerScreen({ memberships, onPick, onCreateGroup, onSignOut }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 60%, ${C.ink} 100%)`,
        color: C.cream,
        fontFamily: BODY,
        paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 1rem))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md w-full mx-auto">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8">
          <Logomark variant="light" className="w-12 h-12 shrink-0" />
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.28em] font-bold"
              style={{ color: C.sky }}
            >
              Palm Volley Pickle
            </div>
            <div
              className="text-2xl uppercase leading-none"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Court Report
            </div>
          </div>
        </div>

        <h1
          className="text-3xl uppercase leading-[1.05] mb-2"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
        >
          Pick your group
        </h1>
        <p className="text-sm mb-7" style={{ color: "rgba(246,249,251,0.7)" }}>
          You're a member of {memberships.length} groups. Tap which one you
          want to look at.
        </p>

        <div className="space-y-2.5">
          {memberships.map((m) => (
            <button
              key={m.group_id}
              onClick={() => onPick(m)}
              className="w-full text-left p-4 rounded-sm flex items-center gap-3 transition-all active:scale-[0.99]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: C.cream,
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="font-bold text-base uppercase truncate"
                  style={{
                    fontFamily: DISPLAY,
                    letterSpacing: "0.02em",
                  }}
                >
                  {m.name}
                </div>
                <div
                  className="text-[10px] uppercase tracking-[0.22em] font-bold mt-1"
                  style={{ color: m.role === "owner" ? C.coral : "rgba(246,249,251,0.55)" }}
                >
                  {m.role === "owner" ? "Owner" : "Member"}
                </div>
              </div>
              <ArrowRight size={16} color={C.sky} />
            </button>
          ))}
        </div>

        {/* Create another group affordance — same pattern as the switcher modal. */}
        <button
          onClick={onCreateGroup}
          className="w-full mt-4 py-3 rounded-sm flex items-center justify-center gap-2 text-sm font-bold"
          style={{
            background: "transparent",
            color: C.cream,
            border: "1px dashed rgba(246,249,251,0.3)",
          }}
        >
          <Plus size={14} strokeWidth={2.6} /> Start a new group
        </button>

        {/* Signing out from the picker is a useful escape hatch in case the
            user signed in to the wrong account. */}
        <div
          className="mt-8 pt-5 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <button
            onClick={onSignOut}
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ color: "rgba(246,249,251,0.45)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Claim / Join Flow ----------
//
// State machine for a signed-in user with no active memberships:
//   step='start'            → choose: claim existing record, or create new
//   step='enter-code'       → enter group code to find a group to claim into
//   step='claim-list'       → show unclaimed players in chosen group → pick one
//   step='create-name'      → enter display name when joining as a new player
//   step='success'          → confirmation, then auto-routes to TrackerApp
//
// All paths terminate by calling onComplete(), which re-fetches memberships
// in the parent App and routes the user into the tracker.
// ---------- Claim or Add Player (post-invite fix flow) ----------
// Shown to a signed-in user who is an active member of a group but has no
// player record on its roster — typically a new signup who joined via invite
// link without going through a claim step. Two paths:
//   1. The group has unclaimed player records → show them as a list. The user
//      either picks one (claims it) or chooses "Add me as a new player"
//      (creates a fresh record with their display name).
//   2. The group has no unclaimed records → silently create a fresh record
//      using the user's display name and skip the screen entirely.
function ClaimOrAddPlayerForGroup({ target, session, onComplete, onSignOut }) {
  // Pull the user's display name from auth metadata. Supabase populates
  // user_metadata.full_name from Google OAuth, and we set display_name on
  // email signup. Fall back to the email's local part if neither is set.
  const md = session?.user?.user_metadata || {};
  const fallbackName =
    md.display_name ||
    md.full_name ||
    md.name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "") ||
    "";

  const [unclaimed, setUnclaimed] = useState(null); // null = loading
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [name, setName] = useState(fallbackName);
  const [editing, setEditing] = useState(false);

  // On mount: figure out the right path to take.
  //   1. Does the caller already have a claimed player record anywhere?
  //      If yes → reuse it (silent: just add to this group's roster). No UI.
  //   2. No existing record → fetch unclaimed players in target group.
  //      If any exist → render the screen, let user pick or add new.
  //      If none exist → silently create a new record with display name.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await authApi.myPlayerRecord();
        // Supabase returns either an object (when function returns a record)
        // or null. Normalize.
        const hasExistingRecord = !!existing && (existing.id || existing[0]?.id);
        if (hasExistingRecord) {
          // Silent: reuse existing record. createPlayerForSelf is idempotent
          // and will just add to the roster + ensure membership.
          if (cancelled) return;
          setBusy(true);
          await authApi.createPlayerForSelf("", target.group_id);
          await onComplete();
          return;
        }

        const rows = await authApi.unclaimedPlayersInGroup(target.group_id);
        if (cancelled) return;
        setUnclaimed(rows || []);
        if ((rows || []).length === 0) {
          if (!fallbackName.trim()) {
            // Edge case: no unclaimed records, no display name in metadata.
            // Render the screen so the user can type a name. The "are these
            // you" messaging would be misleading when the list is empty —
            // but we'll fall through and the empty list + add-as-new prompt
            // is still actionable.
            return;
          }
          setBusy(true);
          await authApi.createPlayerForSelf(fallbackName.trim(), target.group_id);
          await onComplete();
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || "Couldn't set up your roster spot.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.group_id]);

  const claim = async (playerId) => {
    setErr(null);
    setBusy(true);
    try {
      await authApi.claimPlayer(playerId, target.group_id);
      await onComplete();
    } catch (e) {
      setErr(e.message || "Couldn't claim that player.");
    } finally {
      setBusy(false);
    }
  };

  const addAsNew = async () => {
    setErr(null);
    if (!name.trim()) {
      setErr("Display name is required.");
      return;
    }
    setBusy(true);
    try {
      await authApi.createPlayerForSelf(name.trim(), target.group_id);
      await onComplete();
    } catch (e) {
      setErr(e.message || "Couldn't add you as a new player.");
    } finally {
      setBusy(false);
    }
  };

  // While the silent-create path is in flight, show a splash. Same for the
  // very brief load before unclaimed rows arrive.
  if (unclaimed === null || (unclaimed.length === 0 && busy)) {
    return <Splash message={`Setting up ${target.name}…`} />;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 60%, ${C.ink} 100%)`,
        color: C.cream,
        fontFamily: BODY,
        paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 1rem))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md w-full mx-auto">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8">
          <Logomark variant="light" className="w-12 h-12 shrink-0" />
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.28em] font-bold"
              style={{ color: C.sky }}
            >
              {target.name}
            </div>
            <div
              className="text-2xl uppercase leading-none"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Find yourself
            </div>
          </div>
        </div>

        <h1
          className="text-3xl uppercase leading-[1.05] mb-2"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
        >
          Are any of these you?
        </h1>
        <p className="text-sm mb-7" style={{ color: "rgba(246,249,251,0.7)" }}>
          The group has existing player records that nobody's claimed yet. Tap
          your name to keep your stats from past games. Or add yourself as a
          new player below.
        </p>

        {err && (
          <div
            className="mb-5 px-3 py-2.5 rounded-sm text-xs"
            style={{
              background: "rgba(234,78,51,0.15)",
              color: "#ffd9d2",
              border: `1px solid ${C.coral}`,
            }}
          >
            {err}
          </div>
        )}

        <div className="space-y-2.5 mb-5">
          {unclaimed.map((p) => (
            <button
              key={p.id}
              onClick={() => claim(p.id)}
              disabled={busy}
              className="w-full text-left p-4 rounded-sm flex items-center gap-3 transition-all active:scale-[0.99] disabled:opacity-60"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: C.cream,
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="font-bold text-base uppercase truncate"
                  style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
                >
                  {p.name}
                </div>
                <div
                  className="text-[10px] uppercase tracking-[0.22em] font-bold mt-1"
                  style={{ color: "rgba(246,249,251,0.55)" }}
                >
                  Unclaimed
                </div>
              </div>
              <ArrowRight size={16} color={C.sky} />
            </button>
          ))}
        </div>

        {/* Add me as new — pre-filled with display name from auth metadata,
            tap to edit before submitting. */}
        <div
          className="rounded-sm p-4 mb-4"
          style={{
            background: "rgba(96,192,226,0.08)",
            border: "1px dashed rgba(96,192,226,0.4)",
          }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2"
            style={{ color: C.sky }}
          >
            None of these are me
          </div>
          {editing ? (
            <input
              type="text"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditing(false)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-sm mb-3"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: C.cream,
                fontSize: "16px",
                fontWeight: 600,
              }}
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-left px-3 py-2.5 rounded-sm mb-3 flex items-center justify-between"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: C.cream,
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              <span className="truncate">{name || "Tap to enter your name"}</span>
              <Pencil size={13} color={C.sky} />
            </button>
          )}
          <button
            onClick={addAsNew}
            disabled={busy || !name.trim()}
            className="w-full py-3 rounded-sm uppercase tracking-[0.18em] flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: C.coral,
              color: C.cream,
              fontFamily: DISPLAY,
              fontSize: "13px",
            }}
          >
            <Plus size={14} strokeWidth={2.6} /> Add me as a new player
          </button>
        </div>

        {/* Sign-out escape hatch in case the user signed in to the wrong
            account or wants to back out. */}
        <div
          className="mt-4 pt-5 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <button
            onClick={onSignOut}
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ color: "rgba(246,249,251,0.45)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function ClaimOrJoinFlow({ session, onComplete, onSignOut, forcedIntent, onCancel }) {
  // forcedIntent ('create-group') skips the start screen entirely. Used when
  // an already-member user taps "Start a new group" from the group switcher.
  const initialStep = forcedIntent === "create-group" ? "enter-group-name" : "start";
  const [step, setStep] = useState(initialStep);
  const [code, setCode] = useState("");
  const [groupCtx, setGroupCtx] = useState(null); // { id, name, code }
  const [resolvedToken, setResolvedToken] = useState(null); // invite token for groupCtx
  const [unclaimed, setUnclaimed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  // intent: 'claim' = claim an existing player record in an existing group
  //         'create' = brand-new player joining an existing group via invite
  //         'create-group' = creating a brand-new group
  const [intent, setIntent] = useState(forcedIntent || null);
  const [displayName, setDisplayName] = useState("");
  const [groupName, setGroupName] = useState("");

  const lookupGroup = async () => {
    setErr(null);
    setBusy(true);
    try {
      const raw = code.trim();
      const tokenMatch = raw.match(/(?:\/i\/)?([A-Z0-9]{4,12})\s*$/i);
      if (!tokenMatch) {
        setErr("That doesn't look like a valid invite link.");
        return;
      }
      const token = tokenMatch[1].toUpperCase();
      // resolveInvite is read-only and just returns the group.
      const groupRow = await authApi.resolveInvite(token);
      const g = {
        id: groupRow.id,
        name: groupRow.name,
        code: groupRow.invite_code,
      };
      setGroupCtx(g);
      // Stash the resolved token so claim/create handlers can redeem it.
      setResolvedToken(token);
      if (intent === "claim") {
        const players = await authApi.unclaimedPlayersInGroup(g.id);
        setUnclaimed(players || []);
        setStep("claim-list");
      } else {
        setStep("create-name");
      }
    } catch (e) {
      setErr(e.message || "Couldn't find that group.");
    } finally {
      setBusy(false);
    }
  };

  const claimPlayer = async (playerId) => {
    setErr(null);
    setBusy(true);
    try {
      // Redeem the invite first to establish membership, then claim the player.
      // Both are idempotent on Supabase side, so retries are safe.
      if (resolvedToken) {
        await authApi.redeemInvite(resolvedToken);
      }
      await authApi.claimPlayer(playerId, groupCtx.id);
      await saveGroupToStorage(groupCtx);
      setStep("success");
      setTimeout(() => onComplete(), 800);
    } catch (e) {
      setErr(e.message || "Couldn't claim that player.");
    } finally {
      setBusy(false);
    }
  };

  const createPlayer = async () => {
    setErr(null);
    if (!displayName.trim()) {
      setErr("Display name is required.");
      return;
    }
    setBusy(true);
    try {
      if (intent === "create-group") {
        // Brand-new group with the user as owner. Atomic on the SQL side.
        const newGroup = await authApi.createGroup(groupName.trim(), displayName.trim());
        const g = {
          id: newGroup.id,
          name: newGroup.name,
          code: newGroup.invite_code,
        };
        await saveGroupToStorage(g);
        setGroupCtx(g);
        setStep("success");
        setTimeout(() => onComplete(), 800);
      } else {
        // Joining an existing group via invite link → redeem first, then create
        // the player record on that roster.
        if (resolvedToken) {
          await authApi.redeemInvite(resolvedToken);
        }
        await authApi.createPlayerForSelf(displayName.trim(), groupCtx.id);
        await saveGroupToStorage(groupCtx);
        setStep("success");
        setTimeout(() => onComplete(), 800);
      }
    } catch (e) {
      setErr(e.message || "Couldn't finish setting things up.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 60%, ${C.ink} 100%)`,
        color: C.cream,
        fontFamily: BODY,
        paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 1rem))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md w-full mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Logomark variant="light" className="w-12 h-12 shrink-0" />
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.28em] font-bold"
              style={{ color: C.sky }}
            >
              Palm Volley Pickle
            </div>
            <div
              className="text-2xl uppercase leading-none"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Court Report
            </div>
          </div>
        </div>

        {step === "start" && (
          <>
            <h1
              className="text-3xl uppercase leading-[1.05] mb-2"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Find your group
            </h1>
            <p className="text-sm mb-7" style={{ color: "rgba(246,249,251,0.7)" }}>
              Welcome, {session.user.email}. Tell us how you want to get started.
            </p>
            <ChoiceButton
              icon={<Sparkles size={18} />}
              title="I'm an existing player"
              subtitle="Claim your existing record to keep your stats"
              onClick={() => {
                setIntent("claim");
                setStep("enter-code");
              }}
              primary
            />
            <div className="h-3" />
            <ChoiceButton
              icon={<Plus size={18} />}
              title="Start a new group"
              subtitle="Create your own group and invite others"
              onClick={() => {
                setIntent("create-group");
                setStep("enter-group-name");
              }}
            />
            <div className="h-3" />
            <ChoiceButton
              icon={<KeyRound size={18} />}
              title="I'm new to a group"
              subtitle="Join a group with an invite link"
              onClick={() => {
                setIntent("create");
                setStep("enter-code");
              }}
            />
            <div
              className="mt-8 pt-5 text-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <button
                onClick={onSignOut}
                className="text-[11px] uppercase tracking-[0.22em] font-bold"
                style={{ color: "rgba(246,249,251,0.45)" }}
              >
                Sign out
              </button>
            </div>
          </>
        )}

        {step === "enter-code" && (
          <CodeEntryStep
            code={code}
            setCode={setCode}
            busy={busy}
            err={err}
            onSubmit={lookupGroup}
            onBack={() => {
              setErr(null);
              setStep("start");
            }}
          />
        )}

        {step === "claim-list" && (
          <ClaimListStep
            group={groupCtx}
            unclaimed={unclaimed}
            busy={busy}
            err={err}
            onClaim={claimPlayer}
            onCreateInstead={() => {
              setIntent("create");
              setErr(null);
              setStep("create-name");
            }}
            onBack={() => {
              setErr(null);
              setStep("enter-code");
            }}
          />
        )}

        {step === "enter-group-name" && (
          <EnterGroupNameStep
            groupName={groupName}
            setGroupName={setGroupName}
            busy={busy}
            err={err}
            onSubmit={async () => {
              setErr(null);
              if (!groupName.trim()) {
                setErr("Group name is required.");
                return;
              }
              // Forced flow (existing member creating an additional group):
              // the user already has a claimed player record, so we skip the
              // display-name step. The SQL reuses the existing player when
                // p_display_name is null.
              if (forcedIntent === "create-group") {
                setBusy(true);
                try {
                  const newGroup = await authApi.createGroup(groupName.trim(), null);
                  const g = {
                    id: newGroup.id,
                    name: newGroup.name,
                    code: newGroup.invite_code,
                  };
                  await saveGroupToStorage(g);
                  setGroupCtx(g);
                  setStep("success");
                  setTimeout(() => onComplete(), 800);
                } catch (e) {
                  setErr(e.message || "Couldn't create the group.");
                } finally {
                  setBusy(false);
                }
                return;
              }
              setStep("create-name");
            }}
            onBack={() => {
              setErr(null);
              if (forcedIntent === "create-group") {
                onCancel?.();
              } else {
                setStep("start");
              }
            }}
          />
        )}

        {step === "create-name" && (
          <CreatePlayerStep
            group={
              intent === "create-group"
                ? { name: groupName.trim() || "your new group" }
                : groupCtx
            }
            displayName={displayName}
            setDisplayName={setDisplayName}
            busy={busy}
            err={err}
            onSubmit={createPlayer}
            onBack={() => {
              setErr(null);
              if (intent === "create-group") setStep("enter-group-name");
              else if (intent === "claim") setStep("claim-list");
              else setStep("enter-code");
            }}
          />
        )}

        {step === "success" && (
          <div className="text-center py-10">
            <div
              className="w-14 h-14 rounded-sm flex items-center justify-center mx-auto mb-5"
              style={{ background: C.coral }}
            >
              <Check size={26} color={C.cream} strokeWidth={3} />
            </div>
            <h2
              className="text-2xl uppercase mb-2"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              You're in
            </h2>
            <p className="text-sm" style={{ color: "rgba(246,249,251,0.75)" }}>
              Loading {groupCtx?.name || "the tracker"}…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceButton({ icon, title, subtitle, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-sm flex items-center gap-3 transition-all active:scale-[0.99]"
      style={{
        background: primary ? C.coral : "rgba(255,255,255,0.06)",
        border: primary ? "none" : "1px solid rgba(255,255,255,0.12)",
        color: C.cream,
      }}
    >
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
        style={{ background: primary ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px]" style={{ fontFamily: BODY }}>
          {title}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{ color: primary ? "rgba(255,255,255,0.85)" : "rgba(246,249,251,0.6)" }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function CodeEntryStep({ code, setCode, busy, err, onSubmit, onBack }) {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[11px] uppercase tracking-[0.22em] font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2 uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
        Paste your invite
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.7)" }}>
        Paste the invite link the group owner sent you, or just the
        6-character code at the end.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={code}
        maxLength={120}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && code.trim() && onSubmit()}
        placeholder="palmvolley.com/i/AB12CD"
        className="w-full px-4 py-4 rounded-sm outline-none"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: C.cream,
          fontFamily: BODY,
          fontWeight: 600,
          fontSize: "16px",
        }}
      />
      {err && (
        <div className="text-xs mt-3" style={{ color: C.coral }}>
          {err}
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={!code.trim() || busy}
        className="w-full mt-6 py-3.5 rounded-sm text-base uppercase tracking-[0.18em] disabled:opacity-40"
        style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
      >
        {busy ? "Looking up…" : "Continue"}
      </button>
    </div>
  );
}

function ClaimListStep({ group, unclaimed, busy, err, onClaim, onCreateInstead, onBack }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[11px] uppercase tracking-[0.22em] font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2 uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
        Which one's you?
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.7)" }}>
        Pick your name from the {group?.name} roster to claim your stats.
      </p>
      {unclaimed.length === 0 ? (
        <div
          className="rounded-sm p-5 text-center text-sm"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(246,249,251,0.75)",
          }}
        >
          No unclaimed players in this group right now. Claim a fresh new player record below.
        </div>
      ) : (
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {unclaimed.map((p) => (
            <button
              key={p.id}
              onClick={() => onClaim(p.id)}
              disabled={busy}
              className="w-full text-left p-4 rounded-sm flex items-center justify-between transition-all active:scale-[0.99] disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: C.cream,
              }}
            >
              <span className="font-bold text-[15px]">{p.name}</span>
              <ArrowRight size={16} color={C.sky} />
            </button>
          ))}
        </div>
      )}
      {err && (
        <div className="text-xs mt-3" style={{ color: C.coral }}>
          {err}
        </div>
      )}
      <div
        className="mt-6 pt-5 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        <button
          onClick={onCreateInstead}
          className="text-xs"
          style={{ color: "rgba(246,249,251,0.65)" }}
        >
          Don't see your name? Create a new player instead →
        </button>
      </div>
    </div>
  );
}

function EnterGroupNameStep({ groupName, setGroupName, busy, err, onSubmit, onBack }) {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[11px] uppercase tracking-[0.22em] font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2 uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
        Name your group
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.7)" }}>
        This is how your group will appear to everyone you invite. You can
        change it later.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={groupName}
        maxLength={60}
        onChange={(e) => setGroupName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && groupName.trim() && onSubmit()}
        placeholder="e.g. Sunday Doubles"
        className="w-full px-4 py-3.5 rounded-sm text-base font-semibold outline-none"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: C.cream,
        }}
      />
      {err && (
        <div className="text-xs mt-3" style={{ color: C.coral }}>
          {err}
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={!groupName.trim() || busy}
        className="w-full mt-6 py-3.5 rounded-sm text-base uppercase tracking-[0.18em] disabled:opacity-40"
        style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
      >
        Continue
      </button>
    </div>
  );
}

function CreatePlayerStep({ group, displayName, setDisplayName, busy, err, onSubmit, onBack }) {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[11px] uppercase tracking-[0.22em] font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2 uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
        What should we call you?
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.7)" }}>
        This shows up wherever your name appears in {group?.name}.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={displayName}
        maxLength={40}
        onChange={(e) => setDisplayName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && displayName.trim() && onSubmit()}
        placeholder="e.g. James S."
        className="w-full px-4 py-3.5 rounded-sm text-base font-semibold outline-none"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: C.cream,
        }}
      />
      {err && (
        <div className="text-xs mt-3" style={{ color: C.coral }}>
          {err}
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={!displayName.trim() || busy}
        className="w-full mt-6 py-3.5 rounded-sm text-base uppercase tracking-[0.18em] disabled:opacity-40"
        style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
      >
        {busy ? "Saving…" : "Join"}
      </button>
    </div>
  );
}

// Pending-approval waiting screen. Shown when the user has only pending
// memberships (e.g., they joined a group whose claim window is closed).
// Polls memberships periodically so the user is dropped into the app
// the moment the owner approves.
function JoinPendingScreen({ memberships, onRefresh, onSignOut }) {
  useEffect(() => {
    const interval = setInterval(() => onRefresh(), 8000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 60%, ${C.ink} 100%)`,
        color: C.cream,
        fontFamily: BODY,
        paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 1rem))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md w-full mx-auto text-center">
        <Logomark variant="light" className="w-14 h-14 mx-auto mb-6" />
        <h2
          className="text-3xl uppercase mb-3 leading-tight"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
        >
          Waiting for approval
        </h2>
        <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.75)" }}>
          You requested to join{" "}
          <strong>{memberships.map((m) => m.name).join(", ")}</strong>. The group
          owner will get a notification — you'll be dropped in as soon as they
          approve.
        </p>
        <button
          onClick={onRefresh}
          className="text-[11px] uppercase tracking-[0.22em] font-bold flex items-center justify-center gap-1.5 mx-auto"
          style={{ color: C.sky }}
        >
          <RefreshCw size={12} /> Check again
        </button>
        <div
          className="mt-10 pt-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <button
            onClick={onSignOut}
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ color: "rgba(246,249,251,0.45)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Group Gate ----------
function GroupGate({ onReady }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [newlyCreated, setNewlyCreated] = useState(null);

  const doCreate = async (name) => {
    setBusy(true);
    setErr(null);
    try {
      const rows = await api.createGroup(name);
      if (!rows?.length) throw new Error("Empty response");
      const g = { id: rows[0].id, name: rows[0].name, code: rows[0].invite_code };
      setNewlyCreated(g);
    } catch (e) {
      setErr("Couldn't create group. Try again?");
    } finally {
      setBusy(false);
    }
  };

  const doJoin = async (code) => {
    setBusy(true);
    setErr(null);
    try {
      const rows = await api.joinGroup(code);
      if (!rows?.length) {
        setErr("No group with that code.");
        return;
      }
      const g = { id: rows[0].id, name: rows[0].name, code: rows[0].invite_code };
      onReady(g);
    } catch (e) {
      setErr("Couldn't join. Check the code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 60%, ${C.ink} 100%)`,
        color: C.cream,
        fontFamily: BODY,
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md w-full mx-auto">
        {/* Logo lockup */}
        <div className="flex items-center gap-3 mb-10">
          <Logomark variant="light" className="w-14 h-14 shrink-0" />
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.28em] font-bold"
              style={{ color: C.sky }}
            >
              Palm Volley Pickle
            </div>
            <div
              className="text-2xl uppercase"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Court Report
            </div>
          </div>
        </div>

        {newlyCreated ? (
          <CreatedGroupSuccess group={newlyCreated} onContinue={() => onReady(newlyCreated)} />
        ) : mode === null ? (
          <>
            <h1
              className="text-4xl leading-[1.05] mb-4 uppercase"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.01em" }}
            >
              Track games<br />with your crew.
            </h1>
            <p className="text-sm mb-8" style={{ color: "rgba(246,249,251,0.75)" }}>
              Create a group for your regulars, or join one with an invite code.
            </p>

            <div className="space-y-3">
              <GateButton
                icon={<Sparkles size={18} />}
                title="Create a group"
                subtitle="Start fresh and get an invite code to share"
                onClick={() => setMode("create")}
                primary
              />
              <GateButton
                icon={<KeyRound size={18} />}
                title="Join with a code"
                subtitle="Got a 6-character code from a friend?"
                onClick={() => setMode("join")}
              />
            </div>
          </>
        ) : mode === "create" ? (
          <CreateGroupForm
            busy={busy}
            err={err}
            onSubmit={doCreate}
            onBack={() => {
              setMode(null);
              setErr(null);
            }}
          />
        ) : (
          <JoinGroupForm
            busy={busy}
            err={err}
            onSubmit={doJoin}
            onBack={() => {
              setMode(null);
              setErr(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function GateButton({ icon, title, subtitle, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-sm flex items-center gap-3 transition-all active:scale-[0.99]"
      style={{
        background: primary ? C.coral : "rgba(255,255,255,0.06)",
        border: primary ? "none" : "1px solid rgba(255,255,255,0.12)",
        color: C.cream,
      }}
    >
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
        style={{ background: primary ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px]" style={{ fontFamily: BODY }}>
          {title}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{ color: primary ? "rgba(255,255,255,0.85)" : "rgba(246,249,251,0.6)" }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function CreateGroupForm({ busy, err, onSubmit, onBack }) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[11px] uppercase tracking-[0.22em] font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2 uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
        Name your group
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.7)" }}>
        This is just what shows up in the header for everyone in the group.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
        placeholder="e.g. Ponte Vedra Regulars"
        className="w-full px-4 py-3.5 rounded-sm text-base font-semibold outline-none"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: C.cream,
        }}
      />
      {err && (
        <div className="text-xs mt-3" style={{ color: C.coral }}>
          {err}
        </div>
      )}
      <button
        onClick={() => onSubmit(name.trim())}
        disabled={!name.trim() || busy}
        className="w-full mt-6 py-3.5 rounded-sm text-base uppercase tracking-[0.18em] disabled:opacity-40"
        style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
      >
        {busy ? "Creating…" : "Create group"}
      </button>
    </div>
  );
}

function JoinGroupForm({ busy, err, onSubmit, onBack }) {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[11px] uppercase tracking-[0.22em] font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2 uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
        Enter your code
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.7)" }}>
        Ask the person who created the group for their 6-character invite code.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={code}
        maxLength={8}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && code.trim() && onSubmit(code.trim())}
        placeholder="ABC123"
        className="w-full px-4 py-4 rounded-sm text-center outline-none"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: C.cream,
          fontFamily: DISPLAY,
          fontSize: "28px",
          letterSpacing: "0.3em",
        }}
      />
      {err && (
        <div className="text-xs mt-3" style={{ color: C.coral }}>
          {err}
        </div>
      )}
      <button
        onClick={() => onSubmit(code.trim())}
        disabled={!code.trim() || busy}
        className="w-full mt-6 py-3.5 rounded-sm text-base uppercase tracking-[0.18em] disabled:opacity-40"
        style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
      >
        {busy ? "Joining…" : "Join group"}
      </button>
    </div>
  );
}

function CreatedGroupSuccess({ group, onContinue }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {}
  };
  return (
    <div>
      <div
        className="w-14 h-14 rounded-sm flex items-center justify-center mb-5"
        style={{ background: "rgba(255,255,255,0.12)" }}
      >
        <Sparkles size={24} color={C.sky} />
      </div>
      <h2
        className="text-3xl mb-2 uppercase"
        style={{ fontFamily: DISPLAY, letterSpacing: "0.01em" }}
      >
        {group.name} is live.
      </h2>
      <p className="text-sm mb-7" style={{ color: "rgba(246,249,251,0.7)" }}>
        Share this code with anyone you want to add. They'll need it exactly once.
      </p>
      <div
        className="rounded-sm p-5 mb-4"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2"
          style={{ color: C.sky }}
        >
          Invite Code
        </div>
        <div
          className="text-center py-2"
          style={{
            fontFamily: DISPLAY,
            fontSize: "38px",
            letterSpacing: "0.25em",
            color: C.cream,
          }}
        >
          {group.code}
        </div>
        <button
          onClick={copy}
          className="w-full mt-3 py-2.5 rounded-sm flex items-center justify-center gap-2 text-sm font-semibold"
          style={{
            background: copied ? C.sky : "rgba(255,255,255,0.1)",
            color: copied ? C.navyDeep : C.cream,
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <button
        onClick={onContinue}
        className="w-full py-3.5 rounded-sm text-base uppercase tracking-[0.18em]"
        style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
      >
        Enter the app →
      </button>
    </div>
  );
}

// ---------- Main App (scoped to group) ----------
function TrackerApp({
  group,
  session,
  memberships,
  onLeaveGroup,
  onSignOut,
  onMembershipsChanged,
  onSwitchGroup,
  onCreateGroup,
}) {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [view, setView] = useState("play");
  // When non-null, the profile view is rendered on top of the normal tab.
  // Set by openProfile(id); cleared by the profile's back button.
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  // Group switcher modal — only meaningful when user has 2+ active memberships.
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Active memberships (excluding pending) drive the switcher's visibility.
  const activeMemberships = useMemo(
    () => (memberships || []).filter((m) => m.status === "active"),
    [memberships]
  );

  // Memoized so the context value reference is stable across renders —
  // prevents unnecessary re-renders of consumers.
  const profileNav = useMemo(
    () => ({ openProfile: (id) => setSelectedPlayerId(id) }),
    []
  );

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // ---- Data API switcher ----
  // When the user is signed in AND has an active membership for this group,
  // use the auth-aware v2 RPCs (which take group_id and stamp created_by).
  // Otherwise, fall back to the legacy code-based RPCs (used by the invite-code
  // escape hatch on the AuthGate). The legacy path goes away in Step 5.
  const isAuthedMember = !!(
    session &&
    (memberships || []).some((m) => m.group_id === group.id && m.status === "active")
  );

  const dataApi = useMemo(() => {
    // Normalize return shapes: v1 RPCs return arrays, v2 RPCs return single
    // records or null. Call sites should always get { row } for inserts and
    // arrays for lists, regardless of which path is in use.
    const firstRow = (resp) => {
      if (Array.isArray(resp)) return resp[0] ?? null;
      return resp ?? null;
    };

    if (isAuthedMember) {
      return {
        listPlayers: () => authApi.listPlayers(group.id),
        addPlayer: async (name) => firstRow(await authApi.addPlayer(group.id, name)),
        deletePlayer: (playerId) => authApi.deletePlayer(group.id, playerId),
        listGames: () => authApi.listGames(group.id),
        addGame: async (game) => firstRow(await authApi.addGame(group.id, game)),
        deleteGame: (gameId) => authApi.deleteGame(group.id, gameId),
        updateGame: async (gameId, fields) =>
          firstRow(await authApi.updateGame(gameId, fields)),
      };
    }
    return {
      listPlayers: () => api.listPlayers(group.code),
      addPlayer: async (name) => firstRow(await api.addPlayer(group.code, name)),
      deletePlayer: (playerId) => api.deletePlayer(group.code, playerId),
      listGames: () => api.listGames(group.code),
      addGame: async (game) => firstRow(await api.addGame(group.code, game)),
      deleteGame: (gameId) => api.deleteGame(group.code, gameId),
      // Legacy code-only path doesn't support edits — surface a clear error
      // rather than silently failing.
      updateGame: () => {
        throw new Error("Editing games requires signing in.");
      },
    };
  }, [isAuthedMember, group.id, group.code]);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const [ps, gs] = await Promise.all([dataApi.listPlayers(), dataApi.listGames()]);
      setPlayers(ps || []);
      setGames((gs || []).map(mapGame));
      setOnline(true);
    } catch (err) {
      console.error(err);
      setOnline(false);
      flash("Couldn't sync — check connection");
    } finally {
      setSyncing(false);
      setLoaded(true);
    }
  }, [dataApi, flash]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const addPlayer = async (rawName) => {
    const name = rawName.trim();
    if (!name) return false;
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      flash("Player already exists");
      return false;
    }
    try {
      const row = await dataApi.addPlayer(name);
      if (row) setPlayers((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      return true;
    } catch (err) {
      console.error(err);
      flash(err.message || "Couldn't add player");
      return false;
    }
  };

  const removePlayer = async (id) => {
    const used = games.some((g) => g.team1.includes(id) || g.team2.includes(id));
    if (used) {
      if (
        !window.confirm(
          "This player appears in logged games. Remove anyway? (Their games stay but they vanish from stats.)"
        )
      )
        return;
    }
    const snapshot = players;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    try {
      await dataApi.deletePlayer(id);
    } catch (err) {
      console.error(err);
      setPlayers(snapshot);
      flash(err.message || "Couldn't remove player");
    }
  };

  const addGame = async (game) => {
    try {
      const row = await dataApi.addGame(game);
      if (row) setGames((prev) => [mapGame(row), ...prev]);
      flash("Game logged");
      setView("games");
    } catch (err) {
      console.error(err);
      flash(err.message || "Couldn't save game");
    }
  };

  const removeGame = async (id) => {
    if (!window.confirm("Delete this game?")) return;
    const snapshot = games;
    setGames((prev) => prev.filter((g) => g.id !== id));
    try {
      await dataApi.deleteGame(id);
    } catch (err) {
      console.error(err);
      setGames(snapshot);
      flash(err.message || "Couldn't delete");
    }
  };

  // Edit-game modal state — null when closed, else the game being edited.
  const [editingGame, setEditingGame] = useState(null);

  const saveEditedGame = async ({ date, score1, score2, note }) => {
    if (!editingGame) return false;
    if (score1 === score2) {
      flash("Scores can't be tied");
      return false;
    }
    const id = editingGame.id;
    const snapshot = games;
    // Optimistic update — mutate the row in-place so the UI reflects
    // immediately. Roll back on error.
    setGames((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, date, score1, score2, note: note || null } : g
      )
    );
    try {
      const row = await dataApi.updateGame(id, { date, score1, score2, note });
      if (row) {
        setGames((prev) => prev.map((g) => (g.id === id ? mapGame(row) : g)));
      }
      flash("Game updated");
      setEditingGame(null);
      return true;
    } catch (err) {
      console.error(err);
      setGames(snapshot);
      flash(err.message || "Couldn't save changes");
      return false;
    }
  };

  const stats = useMemo(() => computeStats(players, games), [players, games]);
  const partnerships = useMemo(() => computePartnerships(players, games), [players, games]);
  const ratings = useMemo(() => computeRatings(players, games), [players, games]);
  const ratingsById = useMemo(() => {
    const map = {};
    ratings.forEach((r) => { map[r.id] = r; });
    return map;
  }, [ratings]);

  // ---- Session filter ----
  // Scoped to the Stats tab. When set, narrows games to a chosen player pool
  // and time window. Persisted per-group in localStorage so it survives
  // reloads but resets when switching groups.
  const [sessionFilter, setSessionFilter] = useState(null);

  // Load filter when group changes.
  useEffect(() => {
    setSessionFilter(loadSessionFilter(group.id));
  }, [group.id]);

  // Persist filter to localStorage on change.
  useEffect(() => {
    saveSessionFilter(group.id, sessionFilter);
  }, [group.id, sessionFilter]);

  // Filtered games + recomputed stats / partnerships / ratings against the
  // filtered subset. Spark Rating is intentionally NOT filtered — per design decision,
  // ratings stay all-time, the session view shows W/L stats only.
  const filteredGames = useMemo(
    () => applySessionFilter(games, sessionFilter),
    [games, sessionFilter]
  );
  const filteredStats = useMemo(
    () => computeStats(players, filteredGames),
    [players, filteredGames]
  );
  const filteredPartnerships = useMemo(
    () => computePartnerships(players, filteredGames),
    [players, filteredGames]
  );

  return (
    <ProfileNavContext.Provider value={profileNav}>
      <div
        className="min-h-screen"
        style={{
          background: C.cream,
          fontFamily: BODY,
          color: C.ink,
          paddingBottom: "7.5rem",
          backgroundImage: `radial-gradient(${C.babyBlue} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      >
        {/* Header hidden when on profile view — profile has its own header with back button */}
        {!selectedPlayerId && (
          <Header
            group={group}
            online={online}
            syncing={syncing}
            onRefresh={refresh}
            onOpenSettings={() => setGroupModalOpen(true)}
            activeMembershipsCount={activeMemberships.length}
            onOpenSwitcher={() => setSwitcherOpen(true)}
          />
        )}

        <main className="max-w-xl mx-auto px-4 pt-5">
          {!loaded ? (
            <div className="text-center py-20 text-sm" style={{ color: C.muted }}>
              <div className="inline-block animate-spin mb-3">
                <RefreshCw size={20} />
              </div>
              <div>Loading {group.name}…</div>
            </div>
          ) : selectedPlayerId ? (
            <PlayerProfileView
              playerId={selectedPlayerId}
              players={players}
              games={games}
              stats={stats}
              partnerships={partnerships}
              ratingsById={ratingsById}
              onBack={() => setSelectedPlayerId(null)}
            />
          ) : (
            <>
              {view === "play" && (
                <PlayView players={players} onAddGame={addGame} onGoToPlayers={() => setView("players")} />
              )}
              {view === "games" && (
                <GamesView
                  games={games}
                  players={players}
                  onRemove={removeGame}
                  onEdit={(g) => setEditingGame(g)}
                  currentUserId={session?.user?.id || null}
                  isOwner={(memberships || []).some(
                    (m) => m.group_id === group.id && m.role === "owner" && m.status === "active"
                  )}
                  ratingsById={ratingsById}
                />
              )}
              {view === "players" && (
                <PlayersView players={players} stats={stats} onAdd={addPlayer} onRemove={removePlayer} />
              )}
              {view === "stats" && (
                <StatsView
                  stats={stats}
                  partnerships={partnerships}
                  games={games}
                  players={players}
                  ratingsById={ratingsById}
                  sessionFilter={sessionFilter}
                  onSessionFilterChange={setSessionFilter}
                  filteredStats={filteredStats}
                  filteredPartnerships={filteredPartnerships}
                  filteredGames={filteredGames}
                />
              )}
            </>
          )}
        </main>

        {/* Hide bottom nav on profile view for focus; back button handles navigation */}
        {!selectedPlayerId && <BottomNav view={view} setView={setView} />}

        {toast && (
          <div
            className="fixed left-1/2 bottom-28 -translate-x-1/2 px-4 py-2.5 rounded-sm text-sm font-semibold shadow-lg z-50 whitespace-nowrap"
            style={{ background: C.ink, color: C.cream, fontFamily: BODY }}
          >
            {toast}
          </div>
        )}

        {groupModalOpen && (
          <GroupModal
            group={group}
            session={session}
            memberships={memberships}
            onClose={() => setGroupModalOpen(false)}
            onLeave={async () => {
              setGroupModalOpen(false);
              await onLeaveGroup();
            }}
            onSignOut={async () => {
              setGroupModalOpen(false);
              await onSignOut();
            }}
            onMembershipsChanged={onMembershipsChanged}
            onCreateGroup={() => {
              setGroupModalOpen(false);
              onCreateGroup?.();
            }}
          />
        )}

        {switcherOpen && (
          <GroupSwitcherModal
            currentGroupId={group.id}
            memberships={activeMemberships}
            onClose={() => setSwitcherOpen(false)}
            onPick={(membership) => {
              setSwitcherOpen(false);
              if (membership.group_id === group.id) return; // already here
              onSwitchGroup?.({
                id: membership.group_id,
                name: membership.name,
                code: membership.invite_code,
              });
            }}
            onCreateGroup={() => {
              setSwitcherOpen(false);
              onCreateGroup?.();
            }}
          />
        )}

        {editingGame && (
          <EditGameModal
            game={editingGame}
            players={players}
            onSave={saveEditedGame}
            onClose={() => setEditingGame(null)}
          />
        )}
      </div>
    </ProfileNavContext.Provider>
  );
}

// ---------- Header ----------
function Header({
  group,
  online,
  syncing,
  onRefresh,
  onOpenSettings,
  activeMembershipsCount = 1,
  onOpenSwitcher,
}) {
  // Multi-group users get a dedicated switcher affordance on the group-name row.
  const showSwitcher = activeMembershipsCount > 1;
  return (
    <header
      className="px-5 pb-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        color: C.cream,
        borderBottomLeftRadius: "4px",
        borderBottomRightRadius: "4px",
        boxShadow: "0 8px 24px -12px rgba(13,47,69,0.5)",
        paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 1rem))",
      }}
    >
      {/* Grain overlay — subtle texture on the navy per PVP brand */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="relative max-w-xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Logomark variant="dark" className="w-11 h-11 shrink-0" />
          <div className="min-w-0">
            {/* Group name eyebrow — becomes a switcher trigger for multi-group
                users. For single-group users it's just non-interactive text. */}
            {showSwitcher ? (
              <button
                onClick={onOpenSwitcher}
                className="text-[10px] uppercase tracking-[0.22em] font-bold flex items-center gap-1.5 max-w-full transition-opacity active:opacity-70"
                style={{ color: C.sky, fontFamily: BODY }}
                aria-label="Switch group"
              >
                <span className="truncate">{group.name}</span>
                {online ? (
                  <Cloud size={11} color={C.sky} />
                ) : (
                  <CloudOff size={11} color={C.coral} />
                )}
                <ChevronDown size={12} color={C.sky} strokeWidth={2.6} />
              </button>
            ) : (
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-bold flex items-center gap-1.5"
                style={{ color: C.sky, fontFamily: BODY }}
              >
                <span className="truncate">{group.name}</span>
                {online ? (
                  <Cloud size={11} color={C.sky} />
                ) : (
                  <CloudOff size={11} color={C.coral} />
                )}
              </div>
            )}
            <h1
              className="text-2xl leading-none mt-1 uppercase truncate"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Court Report
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={syncing}
            className="w-10 h-10 rounded-sm flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label="Refresh"
          >
            <RefreshCw size={16} color={C.cream} className={syncing ? "animate-spin" : ""} strokeWidth={2.2} />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 rounded-sm flex items-center justify-center"
            style={{ background: C.coral, boxShadow: "0 4px 12px rgba(234,78,51,0.4)" }}
            aria-label="Group settings"
          >
            <Settings size={18} strokeWidth={2.4} color={C.cream} />
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------- Group Switcher Modal ----------
// Centered modal that lets multi-group users pick which group to view.
// Includes a "+ Start a new group" affordance at the bottom for users who
// want to create another group while already in one.
function GroupSwitcherModal({ currentGroupId, memberships, onClose, onPick, onCreateGroup }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
      style={{ background: "rgba(13,47,69,0.6)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full rounded-sm overflow-hidden"
        style={{
          background: C.cream,
          border: `1px solid ${C.line}`,
          boxShadow: "0 24px 48px -12px rgba(13,47,69,0.4)",
          maxHeight: "calc(100vh - 5rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: C.muted, fontFamily: BODY }}
          >
            Switch Group
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
            aria-label="Close switcher"
          >
            <X size={16} />
          </button>
        </div>

        {/* Group list — scrolls if many groups */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 18rem)" }}>
          {memberships.map((m) => {
            const isCurrent = m.group_id === currentGroupId;
            const isOwner = m.role === "owner";
            return (
              <button
                key={m.group_id}
                onClick={() => onPick(m)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors active:bg-gray-50"
                style={{
                  borderBottom: `1px solid ${C.line}`,
                  background: isCurrent ? "rgba(234,78,51,0.06)" : "white",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-[15px] uppercase truncate"
                    style={{
                      fontFamily: DISPLAY,
                      letterSpacing: "0.02em",
                      color: C.ink,
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.22em] font-bold mt-0.5"
                    style={{ color: isOwner ? C.coral : C.muted }}
                  >
                    {isOwner ? "Owner" : "Member"}
                  </div>
                </div>
                {isCurrent ? (
                  <div
                    className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-1 rounded-sm shrink-0"
                    style={{ background: C.coral, color: C.cream, fontFamily: BODY }}
                  >
                    Current
                  </div>
                ) : (
                  <ArrowRight size={16} color={C.muted} />
                )}
              </button>
            );
          })}
        </div>

        {/* Create-new-group footer action */}
        <div
          className="px-4 py-3"
          style={{ background: C.cream, borderTop: `1px solid ${C.line}` }}
        >
          <button
            onClick={onCreateGroup}
            className="w-full py-3 rounded-sm flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.99]"
            style={{
              background: "white",
              color: C.ink,
              border: `1px solid ${C.line}`,
            }}
          >
            <Plus size={14} strokeWidth={2.6} /> Start a new group
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Group Modal ----------
function GroupModal({ group, session, memberships, onClose, onLeave, onSignOut, onMembershipsChanged, onCreateGroup }) {
  // Owner detection: check this user's membership in this specific group.
  const myMembership = (memberships || []).find((m) => m.group_id === group.id);
  const isOwner = myMembership?.role === "owner";

  // Owner-only state: pending members + claim window status + invite link.
  const [pending, setPending] = useState([]);
  const [claimOpen, setClaimOpen] = useState(myMembership?.claim_window_open ?? true);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMsg, setAdminMsg] = useState(null);
  const [activeInvite, setActiveInvite] = useState(null); // { id, short_token, ... } | null
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);

  // Derived invite URL (full URL the user shares with friends).
  const inviteUrl = activeInvite?.short_token
    ? `${window.location.origin}/i/${activeInvite.short_token}`
    : null;

  // Sync local claimOpen state if the membership data refreshes.
  useEffect(() => {
    if (myMembership) setClaimOpen(myMembership.claim_window_open);
  }, [myMembership?.claim_window_open]);

  // Owners only: load pending members + active invite on open.
  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      try {
        const [pendingRows, invite] = await Promise.all([
          authApi.pendingMembers(group.id),
          authApi.activeInvite(group.id),
        ]);
        setPending(pendingRows || []);
        setActiveInvite(invite || null);
      } catch (e) {
        console.error("Failed to load owner data", e);
      }
    })();
  }, [isOwner, group.id]);

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1600);
    } catch (e) {}
  };
  const shareInvite = async () => {
    if (!inviteUrl) return;
    const text = `Join our pickleball group "${group.name}": ${inviteUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pickleball invite", text });
      } catch (e) {}
    } else {
      copyInvite();
    }
  };
  const generateInvite = async () => {
    setInviteBusy(true);
    setAdminMsg(null);
    try {
      const inv = await authApi.createInvite(group.id);
      setActiveInvite(inv);
      setAdminMsg(
        activeInvite
          ? "New invite link generated. The old link no longer works."
          : "Invite link generated."
      );
    } catch (e) {
      setAdminMsg(e.message || "Couldn't generate invite link.");
    } finally {
      setInviteBusy(false);
    }
  };
  const revokeInvite = async () => {
    if (!activeInvite) return;
    if (!window.confirm("Revoke this invite link? Anyone holding the link won't be able to use it.")) {
      return;
    }
    setInviteBusy(true);
    setAdminMsg(null);
    try {
      await authApi.revokeInvite(activeInvite.id);
      setActiveInvite(null);
      setAdminMsg("Invite link revoked.");
    } catch (e) {
      setAdminMsg(e.message || "Couldn't revoke invite link.");
    } finally {
      setInviteBusy(false);
    }
  };

  const leave = () => {
    if (
      window.confirm(
        `Leave "${group.name}"? You'll need a new invite link to rejoin. Group data stays intact for everyone else.`
      )
    ) {
      onLeave();
    }
  };
  const signOut = () => {
    if (window.confirm("Sign out of your account?")) {
      onSignOut();
    }
  };

  const toggleClaimWindow = async () => {
    setAdminBusy(true);
    setAdminMsg(null);
    try {
      const result = await authApi.setClaimWindow(group.id, !claimOpen);
      setClaimOpen(result.claim_window_open);
      onMembershipsChanged?.();
      setAdminMsg(
        result.claim_window_open
          ? "Claim window is open."
          : "Claim window closed. Only owner can grant new claims."
      );
    } catch (e) {
      setAdminMsg(e.message || "Couldn't update setting.");
    } finally {
      setAdminBusy(false);
    }
  };

  const approveMember = async (userId) => {
    setAdminBusy(true);
    try {
      await authApi.approveMember(userId, group.id);
      setPending((prev) => prev.filter((p) => p.user_id !== userId));
      onMembershipsChanged?.();
    } catch (e) {
      setAdminMsg(e.message || "Couldn't approve.");
    } finally {
      setAdminBusy(false);
    }
  };

  const rejectMember = async (userId) => {
    if (!window.confirm("Reject this person? They'll need to request again.")) return;
    setAdminBusy(true);
    try {
      await authApi.rejectMember(userId, group.id);
      setPending((prev) => prev.filter((p) => p.user_id !== userId));
    } catch (e) {
      setAdminMsg(e.message || "Couldn't reject.");
    } finally {
      setAdminBusy(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(13,47,69,0.6)" }}
    >
      <div
        className="w-full max-w-xl rounded-t-md p-5 pb-8"
        style={{ background: C.cream, boxShadow: "0 -12px 40px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Logomark className="w-8 h-8" />
            <h3 className="text-xl uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
              Group
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.muted }}>
          Name
        </div>
        <div
          className="text-lg mb-4 uppercase"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
        >
          {group.name}
        </div>

        {/* Invite link card — owner-only. Generates and shows the group's
            primary invite URL for sharing. */}
        {isOwner && (
          <div
            className="rounded-sm p-4 mb-4"
            style={{
              background: `linear-gradient(135deg, ${C.ice} 0%, ${C.cream} 100%)`,
              border: `1px solid ${C.line}`,
            }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2"
              style={{ color: C.navy }}
            >
              Invite Link
            </div>
            {inviteUrl ? (
              <>
                <div
                  className="text-center py-1 truncate"
                  style={{
                    fontFamily: BODY,
                    fontWeight: 700,
                    fontSize: "16px",
                    color: C.navyDeep,
                  }}
                  title={inviteUrl}
                >
                  {inviteUrl.replace(/^https?:\/\//, "")}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={copyInvite}
                    className="py-2.5 rounded-sm flex items-center justify-center gap-1.5 text-sm font-bold"
                    style={{ background: "white", color: C.ink, border: `1px solid ${C.line}` }}
                  >
                    {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                    {inviteCopied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={shareInvite}
                    className="py-2.5 rounded-sm flex items-center justify-center gap-1.5 text-sm font-bold"
                    style={{ background: C.ink, color: C.cream }}
                  >
                    Share
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={generateInvite}
                    disabled={inviteBusy}
                    className="py-2 rounded-sm text-[11px] uppercase tracking-[0.18em] font-bold disabled:opacity-50"
                    style={{ background: "white", color: C.muted, border: `1px solid ${C.line}` }}
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={revokeInvite}
                    disabled={inviteBusy}
                    className="py-2 rounded-sm text-[11px] uppercase tracking-[0.18em] font-bold disabled:opacity-50"
                    style={{ background: "white", color: C.coralDeep, border: `1px solid ${C.line}` }}
                  >
                    Revoke
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="text-xs mb-3"
                  style={{ color: C.muted, lineHeight: 1.4 }}
                >
                  No active link. Generate one to invite friends — they'll be
                  added to the group automatically when they tap it.
                </div>
                <button
                  onClick={generateInvite}
                  disabled={inviteBusy}
                  className="w-full py-2.5 rounded-sm text-sm font-bold disabled:opacity-50"
                  style={{ background: C.coral, color: C.cream }}
                >
                  {inviteBusy ? "Generating…" : "Generate invite link"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Owner-only admin controls */}
        {isOwner && (
          <div
            className="mb-5 pt-4 pb-1"
            style={{ borderTop: `1px solid ${C.line}` }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3 px-1"
              style={{ color: C.coral }}
            >
              Owner Controls
            </div>

            {/* Claim window toggle */}
            <div
              className="rounded-sm p-3 flex items-start gap-3 mb-3"
              style={{ background: "white", border: `1px solid ${C.line}` }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-bold mb-0.5"
                  style={{ color: C.ink, fontFamily: BODY }}
                >
                  Trust-based claiming
                </div>
                <div className="text-xs" style={{ color: C.muted, lineHeight: 1.4 }}>
                  When open, signed-in members can claim any unclaimed player record.
                  Close once everyone has claimed to lock down identity.
                </div>
              </div>
              <button
                onClick={toggleClaimWindow}
                disabled={adminBusy}
                className="shrink-0 px-3 py-1.5 rounded-sm text-[11px] uppercase tracking-[0.18em] font-bold disabled:opacity-50"
                style={{
                  background: claimOpen ? C.coral : C.cream,
                  color: claimOpen ? C.cream : C.ink,
                  border: claimOpen ? "none" : `1px solid ${C.line}`,
                  fontFamily: BODY,
                }}
              >
                {claimOpen ? "Open" : "Closed"}
              </button>
            </div>

            {/* Pending member approvals */}
            {pending.length > 0 && (
              <div
                className="rounded-sm overflow-hidden"
                style={{ background: "white", border: `1px solid ${C.line}` }}
              >
                <div
                  className="px-3 py-2 text-[10px] uppercase tracking-[0.22em] font-bold flex items-center justify-between"
                  style={{ background: C.cream, borderBottom: `1px solid ${C.line}`, color: C.muted }}
                >
                  <span>Pending Approval · {pending.length}</span>
                </div>
                {pending.map((p) => (
                  <div
                    key={p.user_id}
                    className="px-3 py-2.5 flex items-center gap-2"
                    style={{ borderTop: `1px solid ${C.line}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: C.ink }}>
                        {p.display_name || p.email}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: C.muted }}>
                        {p.email}
                      </div>
                    </div>
                    <button
                      onClick={() => approveMember(p.user_id)}
                      disabled={adminBusy}
                      className="px-3 py-1.5 rounded-sm text-[11px] uppercase tracking-[0.18em] font-bold disabled:opacity-50"
                      style={{ background: C.coral, color: C.cream, fontFamily: BODY }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectMember(p.user_id)}
                      disabled={adminBusy}
                      className="px-3 py-1.5 rounded-sm text-[11px] uppercase tracking-[0.18em] font-bold disabled:opacity-50"
                      style={{ background: C.cream, color: C.muted, border: `1px solid ${C.line}`, fontFamily: BODY }}
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </div>
            )}

            {adminMsg && (
              <div className="text-xs mt-3 px-1" style={{ color: C.muted }}>
                {adminMsg}
              </div>
            )}
          </div>
        )}

        {/* Create another group — only meaningful for authenticated users. */}
        {session?.user && onCreateGroup && (
          <button
            onClick={onCreateGroup}
            className="w-full py-3 mb-2 rounded-sm flex items-center justify-center gap-2 text-sm font-bold"
            style={{ background: "white", color: C.ink, border: `1px solid ${C.line}` }}
          >
            <Plus size={14} strokeWidth={2.6} /> Start a new group
          </button>
        )}

        <button
          onClick={leave}
          className="w-full py-3 rounded-sm flex items-center justify-center gap-2 text-sm font-bold"
          style={{ background: "transparent", color: C.coralDeep, border: `1px solid ${C.line}` }}
        >
          <LogOut size={14} /> Leave group
        </button>

        {session?.user && (
          <>
            <div
              className="mt-5 pt-4 px-1 text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ color: C.muted, borderTop: `1px solid ${C.line}` }}
            >
              Signed in as
            </div>
            <div className="px-1 mt-1 text-sm font-bold truncate" style={{ color: C.ink }}>
              {session.user.email}
            </div>
            <button
              onClick={signOut}
              className="w-full mt-3 py-3 rounded-sm flex items-center justify-center gap-2 text-sm font-bold"
              style={{ background: C.ink, color: C.cream }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Bottom Nav ----------
function BottomNav({ view, setView }) {
  const items = [
    { id: "play", label: "Log", icon: Play },
    { id: "games", label: "Games", icon: ListOrdered },
    { id: "players", label: "Players", icon: Users },
    { id: "stats", label: "Stats", icon: BarChart3 },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div
        className="max-w-xl mx-auto mx-3 mb-3 rounded-sm flex"
        style={{
          background: C.ink,
          color: C.cream,
          padding: "6px",
          boxShadow: "0 12px 32px -8px rgba(13,47,69,0.45)",
        }}
      >
        {items.map((item) => {
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-sm transition-all"
              style={{
                background: active ? C.coral : "transparent",
                color: active ? C.cream : "rgba(246,249,251,0.55)",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.6 : 2} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ fontFamily: BODY }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- Play View ----------
function PlayView({ players, onAddGame, onGoToPlayers }) {
  const [mode, setMode] = useState("doubles");
  const [date, setDate] = useState(todayISO());
  const [team1, setTeam1] = useState([]);
  const [team2, setTeam2] = useState([]);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [pickerFor, setPickerFor] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const slotCount = mode === "singles" ? 1 : 2;

  useEffect(() => {
    setTeam1((t) => t.slice(0, slotCount));
    setTeam2((t) => t.slice(0, slotCount));
  }, [mode]);

  // Any player already placed in either team is removed from the pool.
  // Prevents the same player from being selected twice in one game.
  const allSelected = new Set([...team1, ...team2]);
  const availablePlayers = players.filter((p) => !allSelected.has(p.id));

  const canSubmit =
    !saving &&
    team1.length === slotCount &&
    team2.length === slotCount &&
    score1 !== "" &&
    score2 !== "" &&
    Number(score1) !== Number(score2) &&
    Number(score1) >= 0 &&
    Number(score2) >= 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    await onAddGame({
      date,
      mode,
      team1,
      team2,
      score1: Number(score1),
      score2: Number(score2),
      note: note.trim() || null,
    });
    setTeam1([]);
    setTeam2([]);
    setScore1("");
    setScore2("");
    setNote("");
    setSaving(false);
  };

  if (players.length < 2) {
    return (
      <EmptyCard
        icon={<Users size={28} color={C.coral} />}
        title="Add players first"
        body="Build your pool of regulars — at least two to log a singles match, four for doubles."
        cta="Go to Players"
        onCta={onGoToPlayers}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-1 rounded-sm flex" style={{ background: "white", border: `1px solid ${C.line}` }}>
        {["doubles", "singles"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2.5 rounded-sm text-sm uppercase tracking-[0.18em] transition-all"
            style={{
              background: mode === m ? C.navy : "transparent",
              color: mode === m ? C.cream : C.muted,
              fontFamily: mode === m ? DISPLAY : BODY,
              fontWeight: mode === m ? 400 : 700,
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <Card>
        <label
          className="text-[10px] uppercase tracking-[0.22em] font-bold flex items-center gap-1.5"
          style={{ color: C.muted }}
        >
          <Calendar size={12} /> Match Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 w-full text-base font-semibold bg-transparent outline-none"
          style={{ color: C.ink, fontFamily: BODY }}
        />
      </Card>

      <TeamCard
        label="Team 1"
        accent={C.navy}
        slots={slotCount}
        selectedIds={team1}
        players={players}
        score={score1}
        setScore={setScore1}
        onOpenPicker={() => setPickerFor("team1")}
        onRemoveAt={(idx) => setTeam1(team1.filter((_, i) => i !== idx))}
      />

      <div className="flex items-center justify-center -my-2">
        <div
          className="px-5 py-1.5 rounded-sm text-xs uppercase tracking-[0.3em]"
          style={{
            background: C.coral,
            color: C.cream,
            fontFamily: DISPLAY,
            boxShadow: "0 4px 12px -4px rgba(234,78,51,0.4)",
          }}
        >
          vs
        </div>
      </div>

      <TeamCard
        label="Team 2"
        accent={C.coral}
        slots={slotCount}
        selectedIds={team2}
        players={players}
        score={score2}
        setScore={setScore2}
        onOpenPicker={() => setPickerFor("team2")}
        onRemoveAt={(idx) => setTeam2(team2.filter((_, i) => i !== idx))}
      />

      <Card>
        <label
          className="text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ color: C.muted }}
        >
          Note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. 2nd of 3, windy, rematch"
          className="mt-2 w-full text-sm bg-transparent outline-none placeholder:text-gray-400"
          style={{ color: C.ink, fontFamily: BODY }}
        />
      </Card>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full py-4 rounded-sm text-base uppercase tracking-[0.2em] transition-all"
        style={{
          background: canSubmit ? C.ink : "#c8d0d6",
          color: C.cream,
          fontFamily: DISPLAY,
          boxShadow: canSubmit ? "0 8px 20px -6px rgba(13,47,69,0.4)" : "none",
          opacity: canSubmit ? 1 : 0.7,
        }}
      >
        {saving ? "Saving…" : "Log This Game"}
      </button>

      {pickerFor && (
        <PlayerPicker
          title={pickerFor === "team1" ? "Add to Team 1" : "Add to Team 2"}
          players={availablePlayers}
          onPick={(id) => {
            if (pickerFor === "team1") setTeam1([...team1, id]);
            else setTeam2([...team2, id]);
            setPickerFor(null);
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}

function TeamCard({ label, accent, slots, selectedIds, players, score, setScore, onOpenPicker, onRemoveAt }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "—";
  return (
    <div
      className="rounded-sm p-4"
      style={{ background: "white", border: `1px solid ${C.line}`, boxShadow: "0 1px 0 rgba(0,0,0,0.02)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
          <span
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: accent, fontFamily: BODY }}
          >
            {label}
          </span>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          {Array.from({ length: slots }).map((_, i) => {
            const id = selectedIds[i];
            if (id) {
              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5 rounded-sm"
                  style={{ background: C.cream, border: `1px solid ${C.line}` }}
                >
                  <span className="text-sm font-semibold truncate">{nameOf(id)}</span>
                  <button
                    onClick={() => onRemoveAt(i)}
                    className="w-6 h-6 rounded-sm flex items-center justify-center"
                    style={{ background: C.line, color: C.muted }}
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              );
            }
            return (
              <button
                key={i}
                onClick={onOpenPicker}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm font-semibold"
                style={{ border: `1.5px dashed ${C.babyBlue}`, color: C.muted, background: "transparent" }}
              >
                <Plus size={14} strokeWidth={2.5} /> Add player
              </button>
            );
          })}
        </div>
        <div className="w-[88px] flex flex-col items-center">
          <span
            className="text-[9px] uppercase tracking-[0.18em] font-bold mb-1"
            style={{ color: C.muted }}
          >
            Score
          </span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="—"
            className="w-full text-center text-3xl py-2 rounded-sm outline-none"
            style={{
              background: C.cream,
              color: accent,
              fontFamily: DISPLAY,
              border: `1.5px solid ${C.line}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerPicker({ title, players, onPick, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(13,47,69,0.55)" }}
    >
      <div
        className="w-full max-w-xl rounded-t-md p-5 max-h-[75vh] overflow-y-auto"
        style={{ background: C.cream, boxShadow: "0 -12px 40px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <X size={16} />
          </button>
        </div>
        {players.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: C.muted }}>
            No more players available — add more in the Players tab.
          </p>
        ) : (
          <div className="space-y-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                className="w-full text-left px-4 py-3.5 rounded-sm flex items-center justify-between"
                style={{ background: "white", border: `1px solid ${C.line}` }}
              >
                <span className="font-semibold text-[15px]">{p.name}</span>
                <Plus size={16} color={C.coral} strokeWidth={2.5} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Players View ----------
function PlayersView({ players, stats, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

  const submit = async () => {
    setAdding(true);
    const ok = await onAdd(name);
    if (ok) {
      setName("");
      inputRef.current?.focus();
    }
    setAdding(false);
  };

  const statsById = Object.fromEntries(stats.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <Card>
        <label className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.muted }}>
          Add Player
        </label>
        <div className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Player name"
            className="flex-1 px-4 py-3 rounded-sm text-sm font-semibold outline-none"
            style={{ background: C.cream, border: `1px solid ${C.line}`, fontFamily: BODY }}
          />
          <button
            onClick={submit}
            disabled={adding || !name.trim()}
            className="px-5 rounded-sm uppercase tracking-[0.18em] disabled:opacity-50"
            style={{
              background: C.coral,
              color: C.cream,
              fontFamily: DISPLAY,
              fontSize: "13px",
            }}
          >
            {adding ? "…" : "Add"}
          </button>
        </div>
      </Card>

      <div>
        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 px-1 flex items-center justify-between"
          style={{ color: C.muted }}
        >
          <span>Roster · {players.length}</span>
        </div>
        {players.length === 0 ? (
          <EmptyCard
            icon={<Users size={24} color={C.coral} />}
            title="No players yet"
            body="Add everyone you play with — stats populate automatically as you log games."
          />
        ) : (
          <div className="space-y-2">
            {players
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => {
                const s = statsById[p.id];
                return (
                  <div
                    key={p.id}
                    className="rounded-sm px-4 py-3 flex items-center justify-between gap-2"
                    style={{ background: "white", border: `1px solid ${C.line}` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-sm flex items-center justify-center text-sm shrink-0"
                        style={{ background: C.ice, color: C.navy, fontFamily: DISPLAY }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <PlayerName
                          id={p.id}
                          name={p.name}
                          className="font-bold text-[15px] leading-tight truncate block"
                        />
                        <div className="text-xs" style={{ color: C.muted }}>
                          {s && s.games > 0
                            ? `${s.games} ${s.games === 1 ? "game" : "games"} · ${s.wins}W-${s.losses}L`
                            : "No games yet"}
                        </div>
                      </div>
                    </div>
                    {s && s.currentStreak !== 0 && <StreakBadge streak={s.currentStreak} />}
                    <button
                      onClick={() => onRemove(p.id)}
                      className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0"
                      style={{ background: C.cream, border: `1px solid ${C.line}`, color: C.muted }}
                      aria-label="Remove player"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Games View ----------
// ---------- Edit Game Modal ----------
// Lightweight modal for editing scores, date, and note on an already-logged
// game. Players, teams, and mode are not editable in v1 (rare to need, would
// essentially be re-entry). Permissions enforced server-side; the UI only
// shows the edit affordance to users who can edit (owner or creator).
function EditGameModal({ game, players, onSave, onClose }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "(removed)";
  const [date, setDate] = useState(game.date);
  const [score1, setScore1] = useState(String(game.score1));
  const [score2, setScore2] = useState(String(game.score2));
  const [note, setNote] = useState(game.note || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setErr(null);
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0) {
      setErr("Both scores must be 0 or higher.");
      return;
    }
    if (s1 === s2) {
      setErr("Scores can't be tied.");
      return;
    }
    setBusy(true);
    const ok = await onSave({ date, score1: s1, score2: s2, note: note.trim() });
    setBusy(false);
    if (!ok) {
      // Error message was flashed via toast — leave the modal open so the
      // user can fix and retry rather than losing their entries.
    }
  };

  const t1Won = parseInt(score1, 10) > parseInt(score2, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
      style={{ background: "rgba(13,47,69,0.6)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full rounded-sm overflow-hidden"
        style={{
          background: C.cream,
          border: `1px solid ${C.line}`,
          boxShadow: "0 24px 48px -12px rgba(13,47,69,0.4)",
          maxHeight: "calc(100vh - 5rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: C.muted, fontFamily: BODY }}
          >
            Edit Game
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
            aria-label="Close edit"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="overflow-y-auto px-4 py-4"
          style={{ maxHeight: "calc(100vh - 12rem)" }}
        >
          {/* Date */}
          <label
            className="block text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
            style={{ color: C.muted }}
          >
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-sm mb-4"
            style={{
              background: "white",
              border: `1px solid ${C.line}`,
              fontFamily: BODY,
              fontSize: "15px",
            }}
          />

          {/* Mode + teams (read-only — not editable in v1) */}
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2"
            style={{ color: C.muted }}
          >
            {game.mode} — Players
          </div>
          <div
            className="rounded-sm p-3 mb-4 grid grid-cols-[1fr_auto_1fr] gap-3 items-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <div className="text-left">
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                style={{ color: t1Won ? C.coral : C.muted }}
              >
                Team 1
              </div>
              {game.team1.map((id) => (
                <div key={id} className="text-sm font-bold truncate">
                  {nameOf(id)}
                </div>
              ))}
            </div>
            <div
              className="text-[10px] uppercase tracking-[0.22em]"
              style={{ color: C.muted, fontFamily: DISPLAY }}
            >
              vs
            </div>
            <div className="text-right">
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                style={{ color: !t1Won ? C.coral : C.muted }}
              >
                Team 2
              </div>
              {game.team2.map((id) => (
                <div key={id} className="text-sm font-bold truncate">
                  {nameOf(id)}
                </div>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label
                className="block text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                style={{ color: C.muted }}
              >
                Team 1 Score
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm text-center"
                style={{
                  background: "white",
                  border: `1px solid ${C.line}`,
                  fontFamily: DISPLAY,
                  fontSize: "22px",
                }}
              />
            </div>
            <div>
              <label
                className="block text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                style={{ color: C.muted }}
              >
                Team 2 Score
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm text-center"
                style={{
                  background: "white",
                  border: `1px solid ${C.line}`,
                  fontFamily: DISPLAY,
                  fontSize: "22px",
                }}
              />
            </div>
          </div>

          {/* Note */}
          <label
            className="block text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
            style={{ color: C.muted }}
          >
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            maxLength={140}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything memorable about the match"
            className="w-full px-3 py-2.5 rounded-sm mb-2"
            style={{
              background: "white",
              border: `1px solid ${C.line}`,
              fontFamily: BODY,
              fontSize: "15px",
            }}
          />

          {err && (
            <div className="text-xs mt-3" style={{ color: C.coralDeep }}>
              {err}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="grid grid-cols-2 gap-2 p-3"
          style={{ borderTop: `1px solid ${C.line}`, background: C.cream }}
        >
          <button
            onClick={onClose}
            disabled={busy}
            className="py-3 rounded-sm text-sm font-bold disabled:opacity-50"
            style={{ background: "white", color: C.muted, border: `1px solid ${C.line}` }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="py-3 rounded-sm text-sm font-bold disabled:opacity-50"
            style={{ background: C.coral, color: C.cream }}
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GamesView({ games, players, onRemove, onEdit, currentUserId, isOwner, ratingsById = {} }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "(removed)";
  const today = todayISO();
  const todaysGames = games.filter((g) => g.date === today);

  // Build a per-game lookup of team rating changes. The change is the same
  // for every player on a team, so we just look at the first player's
  // history entry for this gameId.
  const ratingChangesByGameId = useMemo(() => {
    const map = {};
    games.forEach((g) => {
      const isSingles = g.mode === "singles";
      const historyKey = isSingles ? "singlesHistory" : "doublesHistory";
      const t1pid = g.team1[0];
      const t2pid = g.team2[0];
      const t1History = ratingsById[t1pid]?.[historyKey] || [];
      const t2History = ratingsById[t2pid]?.[historyKey] || [];
      const t1Entry = t1History.find((h) => h.gameId === g.id);
      const t2Entry = t2History.find((h) => h.gameId === g.id);
      if (t1Entry && t2Entry) {
        map[g.id] = {
          team1: Math.round(t1Entry.change),
          team2: Math.round(t2Entry.change),
        };
      }
    });
    return map;
  }, [games, ratingsById]);

  // Edit permission per game: owner, OR creator, OR (legacy game with no
  // createdBy) the owner only. Falls back to owner-only when client doesn't
  // know who's signed in.
  const canEdit = (g) => {
    if (!currentUserId) return false;
    if (isOwner) return true;
    return !!g.createdBy && g.createdBy === currentUserId;
  };

  if (games.length === 0) {
    return (
      <EmptyCard
        icon={<ListOrdered size={24} color={C.coral} />}
        title="No games logged"
        body="Head to Log to record your first match. Everything will show up here, freshest first."
      />
    );
  }

  return (
    <div className="space-y-3">
      {todaysGames.length > 0 && (
        <TodaysGamesCard games={todaysGames} players={players} />
      )}
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold px-1" style={{ color: C.muted }}>
        {games.length} {games.length === 1 ? "Game" : "Games"}
      </div>
      {games.map((g) => {
        const t1Won = g.score1 > g.score2;
        const editable = canEdit(g);
        return (
          <div
            key={g.id}
            className="rounded-sm overflow-hidden"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ background: C.cream, borderBottom: `1px solid ${C.line}` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-sm"
                  style={{ background: C.ice, color: C.navy }}
                >
                  {g.mode}
                </span>
                <span className="text-xs font-semibold" style={{ color: C.muted }}>
                  {fmtDate(g.date)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {editable && (
                  <button
                    onClick={() => onEdit(g)}
                    className="w-7 h-7 rounded-sm flex items-center justify-center"
                    style={{ color: C.muted }}
                    aria-label="Edit game"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {editable && (
                  <button
                    onClick={() => onRemove(g.id)}
                    className="w-7 h-7 rounded-sm flex items-center justify-center"
                    style={{ color: C.muted }}
                    aria-label="Delete game"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <TeamResult
                teamPlayers={g.team1.map((id) => ({ id, name: nameOf(id) }))}
                score={g.score1}
                won={t1Won}
                side="left"
                ratingChange={ratingChangesByGameId[g.id]?.team1}
              />
              <div
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: C.muted, fontFamily: DISPLAY }}
              >
                vs
              </div>
              <TeamResult
                teamPlayers={g.team2.map((id) => ({ id, name: nameOf(id) }))}
                score={g.score2}
                won={!t1Won}
                side="right"
                ratingChange={ratingChangesByGameId[g.id]?.team2}
              />
            </div>
            {g.note && (
              <div
                className="px-4 pb-3 text-xs italic"
                style={{ color: C.muted, borderTop: `1px dashed ${C.line}`, paddingTop: "8px" }}
              >
                "{g.note}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamResult({ teamPlayers, score, won, side, ratingChange }) {
  const showRating = typeof ratingChange === "number";
  const positive = ratingChange > 0;
  return (
    <div style={{ textAlign: side === "left" ? "left" : "right" }}>
      <div
        className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
        style={{ color: won ? C.coral : C.muted }}
      >
        {won ? "Winner" : ""}
      </div>
      <div className="text-sm font-bold leading-tight">
        {teamPlayers.map((p, i) => (
          <div key={i} className="truncate">
            {p.id ? (
              <PlayerName id={p.id} name={p.name} fallback="(removed)" />
            ) : (
              p.name
            )}
          </div>
        ))}
      </div>
      <div
        className="text-4xl mt-1"
        style={{
          fontFamily: DISPLAY,
          color: won ? C.navy : C.muted,
          letterSpacing: "0.01em",
        }}
      >
        {score}
      </div>
      {showRating && ratingChange !== 0 && (
        <div
          className="text-[10px] uppercase tracking-[0.18em] font-bold mt-0.5"
          style={{ color: positive ? C.coral : C.muted }}
        >
          {positive ? "+" : ""}
          {ratingChange} Spark
        </div>
      )}
    </div>
  );
}

// ---------- Today's Games Card ----------
// Pinned to the top of the Games tab when today has at least one game.
// Shows game count, total points scored today, and a mini leaderboard
// ranked by wins today (tie-broken by points scored today).
function TodaysGamesCard({ games, players }) {
  const todayStats = useMemo(
    () => computeStats(players, games, { trackStreaks: false }),
    [players, games]
  );
  const active = todayStats
    .filter((s) => s.games > 0)
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);
  const totalPoints = games.reduce((sum, g) => sum + g.score1 + g.score2, 0);

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${C.line}`,
        boxShadow: "0 6px 20px -10px rgba(13,47,69,0.2)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
          color: C.cream,
        }}
      >
        <CalendarDays size={16} strokeWidth={2.4} color={C.sky} />
        <div className="flex-1">
          <div
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ fontFamily: BODY }}
          >
            Today
          </div>
          <div className="text-[10px] opacity-85" style={{ fontFamily: BODY }}>
            {games.length} {games.length === 1 ? "game" : "games"} · {totalPoints} points
          </div>
        </div>
      </div>
      <div>
        {active.map((s, idx) => {
          const isTop = idx === 0;
          return (
            <div
              key={s.id}
              className="px-4 py-2.5 flex items-center gap-3"
              style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}
            >
              <div
                className="w-7 h-7 rounded-sm flex items-center justify-center text-xs shrink-0"
                style={{
                  background: isTop ? C.coral : C.cream,
                  color: isTop ? C.cream : C.muted,
                  fontFamily: DISPLAY,
                  border: isTop ? "none" : `1px solid ${C.line}`,
                }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <PlayerName
                  id={s.id}
                  name={s.name}
                  className="font-bold text-[14px] leading-tight truncate block"
                />
                <div className="text-[11px]" style={{ color: C.muted }}>
                  {s.games}G · {s.pointsFor} pts
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-lg leading-none"
                  style={{ fontFamily: DISPLAY, color: C.navy }}
                >
                  {s.wins}-{s.losses}
                </div>
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-bold"
                  style={{ color: C.muted }}
                >
                  record
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Player Profile View ----------
// Full-screen profile replacing the current view. Header has back button + avatar.
// Sections: hero metrics, point trend chart, recent games (last 10),
// partnerships breakdown, head-to-head records.
function PlayerProfileView({ playerId, players, games, stats, partnerships, ratingsById = {}, onBack }) {
  const player = players.find((p) => p.id === playerId);
  const playerStats = stats.find((s) => s.id === playerId);
  const playerRating = ratingsById[playerId] || null;

  // All games this player appeared in, chronological (oldest → newest) for charting.
  // Each enriched with computed pov (team/opponent/scores/outcome) for render.
  const playerGames = useMemo(() => {
    const list = games
      .filter((g) => g.team1.includes(playerId) || g.team2.includes(playerId))
      .map((g) => {
        const onTeam1 = g.team1.includes(playerId);
        const teamScore = onTeam1 ? g.score1 : g.score2;
        const oppScore = onTeam1 ? g.score2 : g.score1;
        const teammates = (onTeam1 ? g.team1 : g.team2).filter((id) => id !== playerId);
        const opponents = onTeam1 ? g.team2 : g.team1;
        return {
          ...g,
          teamScore,
          oppScore,
          teammates,
          opponents,
          won: teamScore > oppScore,
          cap: Math.max(g.score1, g.score2),
        };
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
      });
    return list;
  }, [games, playerId]);

  // Partnership records specifically for this player: for each player they've
  // ever teamed with, games played together + wins + pointsPct + point diff together.
  const teammateRecords = useMemo(() => {
    const map = {};
    playerGames.forEach((g) => {
      g.teammates.forEach((tid) => {
        const t = players.find((p) => p.id === tid);
        if (!t) return;
        if (!map[tid]) {
          map[tid] = {
            id: tid,
            name: t.name,
            games: 0,
            wins: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointsPossible: 0,
          };
        }
        map[tid].games += 1;
        if (g.won) map[tid].wins += 1;
        map[tid].pointsFor += g.teamScore;
        map[tid].pointsAgainst += g.oppScore;
        map[tid].pointsPossible += g.cap;
      });
    });
    return Object.values(map)
      .map((r) => ({
        ...r,
        winPct: r.games > 0 ? r.wins / r.games : 0,
        pointsPct: r.pointsPossible > 0 ? r.pointsFor / r.pointsPossible : 0,
        diff: r.pointsFor - r.pointsAgainst,
      }))
      .sort((a, b) => b.games - a.games || b.winPct - a.winPct);
  }, [playerGames, players]);

  // Head-to-head records: for each player this player has faced as an opponent,
  // games against + player's wins + pointsPct + point diff against them.
  const opponentRecords = useMemo(() => {
    const map = {};
    playerGames.forEach((g) => {
      g.opponents.forEach((oid) => {
        const o = players.find((p) => p.id === oid);
        if (!o) return;
        if (!map[oid]) {
          map[oid] = {
            id: oid,
            name: o.name,
            games: 0,
            wins: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointsPossible: 0,
          };
        }
        map[oid].games += 1;
        if (g.won) map[oid].wins += 1;
        map[oid].pointsFor += g.teamScore;
        map[oid].pointsAgainst += g.oppScore;
        map[oid].pointsPossible += g.cap;
      });
    });
    return Object.values(map)
      .map((r) => ({
        ...r,
        winPct: r.games > 0 ? r.wins / r.games : 0,
        pointsPct: r.pointsPossible > 0 ? r.pointsFor / r.pointsPossible : 0,
        diff: r.pointsFor - r.pointsAgainst,
      }))
      .sort((a, b) => b.games - a.games || b.winPct - a.winPct);
  }, [playerGames, players]);

  // Highlight picks — require a minimum sample size so a lucky 1-0 doesn't
  // dethrone a real 8-3 record. Primary rank = win %, tiebreak = point diff.
  const HIGHLIGHT_MIN_GAMES = 3;
  const bestPartner = useMemo(() => {
    const eligible = teammateRecords.filter((r) => r.games >= HIGHLIGHT_MIN_GAMES);
    if (eligible.length === 0) return null;
    return eligible.slice().sort(
      (a, b) => b.winPct - a.winPct || b.diff - a.diff
    )[0];
  }, [teammateRecords]);
  // Toughest = where the player has the WORST record against (lowest win %).
  const toughestOpponent = useMemo(() => {
    const eligible = opponentRecords.filter((r) => r.games >= HIGHLIGHT_MIN_GAMES);
    if (eligible.length === 0) return null;
    return eligible.slice().sort(
      (a, b) => a.winPct - b.winPct || a.diff - b.diff
    )[0];
  }, [opponentRecords]);
  // Easiest = best record against, same ranking as bestPartner.
  const easiestOpponent = useMemo(() => {
    const eligible = opponentRecords.filter((r) => r.games >= HIGHLIGHT_MIN_GAMES);
    if (eligible.length === 0) return null;
    return eligible.slice().sort(
      (a, b) => b.winPct - a.winPct || b.diff - a.diff
    )[0];
  }, [opponentRecords]);

  if (!player) {
    return (
      <>
        <div
          style={{
            paddingTop: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))",
          }}
        >
          <EmptyCard
            icon={<Users size={24} color={C.coral} />}
            title="Player not found"
            body="This player may have been removed from the group."
          />
        </div>
        <ProfileBackButton onBack={onBack} />
      </>
    );
  }

  const hasGames = playerStats && playerStats.games > 0;

  return (
    <>
      <div
        className="space-y-4"
        style={{
          // Top safe-area: profile view replaces the main Header so it's
          // responsible for its own notch clearance.
          paddingTop: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))",
          // Extra bottom padding so the fixed Back button doesn't cover the
          // tail end of the scrollable content (head-to-head list, etc).
          paddingBottom: "5rem",
        }}
      >
        {/* Profile header */}
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-sm flex items-center justify-center text-lg shrink-0"
              style={{ background: C.navy, color: C.cream, fontFamily: DISPLAY }}
            >
              {player.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.muted }}>
                Profile
              </div>
              <h2
                className="text-2xl leading-none uppercase truncate"
                style={{ fontFamily: DISPLAY, letterSpacing: "0.02em", color: C.ink }}
              >
                {player.name}
              </h2>
            </div>
          {playerStats && playerStats.currentStreak !== 0 && (
            <StreakBadge streak={playerStats.currentStreak} />
          )}
        </div>
      </div>

      {!hasGames ? (
        <EmptyCard
          icon={<BarChart3 size={24} color={C.coral} />}
          title="No games yet"
          body={`${player.name} hasn't logged any games. Stats and charts populate as games are recorded.`}
        />
      ) : (
        <>
          {/* Hero metrics grid — 2 columns x 3 rows = 6 cards */}
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Point Diff"
              value={`${playerStats.diff >= 0 ? "+" : ""}${playerStats.diff}`}
              accent={playerStats.diff >= 0 ? C.coral : C.muted}
            />
            <MetricCard
              label="Record"
              value={`${playerStats.wins}-${playerStats.losses}`}
              accent={C.navyDeep}
            />
            <MetricCard
              label="Win %"
              value={`${(playerStats.winPct * 100).toFixed(0)}%`}
              accent={C.coral}
            />
            <MetricCard
              label="Points %"
              value={`${(playerStats.pointsPct * 100).toFixed(1)}%`}
              accent={C.coral}
            />
            <MetricCard
              label="Best Win Streak"
              value={playerStats.bestWinStreak}
              accent={C.coral}
            />
            <MetricCard
              label="Best Loss Streak"
              value={playerStats.bestLossStreak}
              accent={C.muted}
            />
          </div>

          {/* Spark Rating — separate card. Shows whichever modes the player
              has actually played; "—" when none. */}
          {playerRating && (playerRating.singlesGames > 0 || playerRating.doublesGames > 0) && (
            <div
              className="rounded-sm overflow-hidden"
              style={{ background: "white", border: `1px solid ${C.line}` }}
            >
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{ background: C.cream, borderBottom: `1px solid ${C.line}` }}
              >
                <Zap size={12} color={C.coral} strokeWidth={2.4} fill={C.coral} />
                <span
                  className="text-[10px] uppercase tracking-[0.22em] font-bold"
                  style={{ color: C.muted, fontFamily: BODY }}
                >
                  Spark Rating
                </span>
              </div>
              <div className="grid grid-cols-2">
                <div
                  className="px-4 py-3"
                  style={{ borderRight: `1px solid ${C.line}` }}
                >
                  <div
                    className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                    style={{ color: C.muted }}
                  >
                    Doubles
                  </div>
                  <div
                    className="text-3xl leading-none"
                    style={{ fontFamily: DISPLAY, color: C.navy }}
                  >
                    {playerRating.doublesRating ?? "—"}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                    {playerRating.doublesGames}{" "}
                    {playerRating.doublesGames === 1 ? "game" : "games"}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div
                    className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                    style={{ color: C.muted }}
                  >
                    Singles
                  </div>
                  <div
                    className="text-3xl leading-none"
                    style={{ fontFamily: DISPLAY, color: C.navy }}
                  >
                    {playerRating.singlesRating ?? "—"}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                    {playerRating.singlesGames}{" "}
                    {playerRating.singlesGames === 1 ? "game" : "games"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Highlight cards — Best Partner, Toughest Opponent, Easiest Opponent.
              Only render when the player has at least one qualifying relationship
              (3+ games). Render each independently so you see what you have. */}
          {(bestPartner || toughestOpponent || easiestOpponent) && (
            <div className="space-y-2">
              {bestPartner && (
                <HighlightCard
                  icon={<Medal size={18} strokeWidth={2.4} color={C.cream} />}
                  iconBg={C.coral}
                  label="Best Partner"
                  record={bestPartner}
                  valueColor={C.coral}
                />
              )}
              {toughestOpponent && (
                <HighlightCard
                  icon={<Swords size={18} strokeWidth={2.4} color={C.cream} />}
                  iconBg={C.navyDeep}
                  label="Toughest Opponent"
                  record={toughestOpponent}
                  valueColor={C.muted}
                />
              )}
              {easiestOpponent && (
                <HighlightCard
                  icon={<Zap size={18} strokeWidth={2.4} color={C.cream} />}
                  iconBg={C.coral}
                  label="Easiest Opponent"
                  record={easiestOpponent}
                  valueColor={C.coral}
                />
              )}
            </div>
          )}

          {/* Point trend chart */}
          {playerGames.length >= 2 && (
            <div
              className="rounded-sm overflow-hidden"
              style={{ background: "white", border: `1px solid ${C.line}` }}
            >
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ background: C.cream, borderBottom: `1px solid ${C.line}` }}
              >
                <TrendingUp size={14} color={C.coral} strokeWidth={2.4} />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[11px] uppercase tracking-[0.22em] font-bold"
                    style={{ color: C.navy, fontFamily: BODY }}
                  >
                    Recent Form
                  </div>
                  <div className="text-[10px]" style={{ color: C.muted }}>
                    Rolling avg point differential · 5-game window
                  </div>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: C.muted }}>
                  {playerGames.length} games
                </span>
              </div>
              <div className="p-4">
                <PointTrendChart games={playerGames} />
              </div>
            </div>
          )}

          {/* Recent games — last 4, newest first */}
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 px-1"
              style={{ color: C.muted }}
            >
              Recent Games · last {Math.min(playerGames.length, 4)}
            </div>
            <div className="space-y-2">
              {playerGames
                .slice()
                .reverse()
                .slice(0, 4)
                .map((g) => (
                  <ProfileGameRow key={g.id} g={g} players={players} />
                ))}
            </div>
          </div>

          {/* Partnerships */}
          {teammateRecords.length > 0 && (
            <PartnerSection records={teammateRecords} keyDep={playerId} />
          )}

          {/* Head-to-head */}
          {opponentRecords.length > 0 && (
            <OpponentSection records={opponentRecords} keyDep={playerId} />
          )}
        </>
      )}
      </div>
      <ProfileBackButton onBack={onBack} />
    </>
  );
}

// Fixed-position Back button used exclusively on the Player Profile view.
// Sits near the bottom of the screen but not flush with the edge, centered,
// and respects the iOS home-indicator safe area.
// Partners list on profile — truncated, expandable.
function PartnerSection({ records, keyDep }) {
  const { sliced, remaining, next, showMore } = useTruncated(records, keyDep);
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 px-1 flex items-center gap-1.5"
        style={{ color: C.muted }}
      >
        <Handshake size={11} /> Partners
      </div>
      <div className="space-y-2">
        {sliced.map((r) => (
          <div
            key={r.id}
            className="rounded-sm px-4 py-2.5 flex items-center justify-between"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <div className="min-w-0 flex-1">
              <PlayerName
                id={r.id}
                name={r.name}
                className="font-bold text-[14px] truncate block"
              />
              <div className="text-[11px]" style={{ color: C.muted }}>
                {r.games} {r.games === 1 ? "game" : "games"} together
              </div>
            </div>
            <div className="text-right">
              <div className="text-base" style={{ color: C.navy, fontFamily: DISPLAY }}>
                {r.wins}-{r.games - r.wins}
              </div>
              <div className="text-[10px] font-semibold" style={{ color: C.muted }}>
                {(r.winPct * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      <ShowMoreButton remaining={remaining} next={next} onClick={showMore} />
    </div>
  );
}

// Head-to-head list on profile — truncated, expandable.
function OpponentSection({ records, keyDep }) {
  const { sliced, remaining, next, showMore } = useTruncated(records, keyDep);
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 px-1 flex items-center gap-1.5"
        style={{ color: C.muted }}
      >
        <Swords size={11} /> Head-to-Head
      </div>
      <div className="space-y-2">
        {sliced.map((r) => {
          const losses = r.games - r.wins;
          const favor = r.wins >= losses;
          return (
            <div
              key={r.id}
              className="rounded-sm px-4 py-2.5 flex items-center justify-between"
              style={{ background: "white", border: `1px solid ${C.line}` }}
            >
              <div className="min-w-0 flex-1">
                <PlayerName
                  id={r.id}
                  name={r.name}
                  className="font-bold text-[14px] truncate block"
                />
                <div className="text-[11px]" style={{ color: C.muted }}>
                  vs this opponent {r.games} {r.games === 1 ? "time" : "times"}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-base"
                  style={{ color: favor ? C.coral : C.muted, fontFamily: DISPLAY }}
                >
                  {r.wins}-{losses}
                </div>
                <div className="text-[10px] font-semibold" style={{ color: C.muted }}>
                  {(r.winPct * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ShowMoreButton remaining={remaining} next={next} onClick={showMore} />
    </div>
  );
}

function ProfileBackButton({ onBack }) {
  return (
    <div
      className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none"
      style={{
        bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
    >
      <button
        onClick={onBack}
        className="pointer-events-auto inline-flex items-center gap-2 px-6 py-3 rounded-sm text-[11px] uppercase tracking-[0.22em] font-bold transition-all active:scale-[0.98]"
        style={{
          background: C.navy,
          color: C.cream,
          fontFamily: BODY,
          boxShadow: "0 8px 24px -6px rgba(13,47,69,0.5)",
        }}
      >
        <ArrowLeft size={14} strokeWidth={2.6} /> Back
      </button>
    </div>
  );
}

// Compact row for a single game on the profile, showing date, teammates,
// opponents, the score, and a W/L indicator.
function ProfileGameRow({ g, players }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "(removed)";
  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{ background: C.cream, borderBottom: `1px solid ${C.line}` }}
      >
        <span className="text-xs font-semibold" style={{ color: C.muted }}>
          {fmtDate(g.date)} · {g.mode}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-sm"
          style={{
            background: g.won ? C.coral : C.ice,
            color: g.won ? C.cream : C.navyDeep,
          }}
        >
          {g.won ? "Won" : "Lost"}
        </span>
      </div>
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {g.teammates.length > 0 && (
            <div className="text-[11px]" style={{ color: C.muted }}>
              With:{" "}
              {g.teammates.map((id, i) => (
                <React.Fragment key={id}>
                  {i > 0 && ", "}
                  <PlayerName id={id} name={nameOf(id)} className="font-semibold" style={{ color: C.ink }} />
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="text-[11px]" style={{ color: C.muted }}>
            vs:{" "}
            {g.opponents.map((id, i) => (
              <React.Fragment key={id}>
                {i > 0 && ", "}
                <PlayerName id={id} name={nameOf(id)} className="font-semibold" style={{ color: C.ink }} />
              </React.Fragment>
            ))}
          </div>
        </div>
        <div
          className="text-2xl shrink-0"
          style={{
            fontFamily: DISPLAY,
            color: g.won ? C.navy : C.muted,
            letterSpacing: "0.01em",
          }}
        >
          {g.teamScore}-{g.oppScore}
        </div>
      </div>
    </div>
  );
}

// ---------- Highlight Card ----------
// Reusable card used for Best Partner / Toughest / Easiest Opponent.
// Shows a colored icon tile, a label, the featured player's name (tappable),
// record, win %, and point diff.
function HighlightCard({ icon, iconBg, label, record, valueColor }) {
  const losses = record.games - record.wins;
  return (
    <div
      className="rounded-sm p-3 flex items-center gap-3"
      style={{
        background: "white",
        border: `1px solid ${C.line}`,
        boxShadow: "0 2px 8px -4px rgba(13,47,69,0.08)",
      }}
    >
      <div
        className="w-11 h-11 rounded-sm flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ color: C.muted }}
        >
          {label}
        </div>
        <PlayerName
          id={record.id}
          name={record.name}
          className="font-bold text-[15px] leading-tight truncate block uppercase"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.01em", color: C.ink }}
        />
        <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>
          {record.games} {record.games === 1 ? "game" : "games"} · {record.diff >= 0 ? "+" : ""}
          {record.diff} diff
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="text-xl leading-none"
          style={{ fontFamily: DISPLAY, color: valueColor }}
        >
          {(record.winPct * 100).toFixed(0)}%
        </div>
        <div
          className="text-[10px] font-bold mt-0.5"
          style={{ color: C.muted, fontFamily: DISPLAY }}
        >
          {record.wins}-{losses}
        </div>
      </div>
    </div>
  );
}

// SVG line chart of the player's "recent form" — rolling average of their
// per-game point differential over a 5-game window. Games before index 5 use an
// expanding window (avg of whatever's been played so far) so early players see
// something meaningful right away.
// X axis: game number. Y axis: avg point differential.
// Shows y-axis gridlines + labels at "nice" round values, and x-axis endpoints.
// Handwritten SVG to avoid any charting library — keeps bundle light.
function PointTrendChart({ games }) {
  const W = 320;
  const H = 160;
  const PAD_L = 34;
  const PAD_R = 12;
  const PAD_T = 10;
  const PAD_B = 22;
  const WINDOW = 5;

  // Build per-game rolling-avg points. For game i (1-indexed in display),
  // the avg covers games max(1, i-WINDOW+1) through i. Expanding window for
  // early games so a fresh player sees the chart from game 1 onward.
  const diffs = games.map((g) => g.teamScore - g.oppScore);
  const points = diffs.map((_, i) => {
    const start = Math.max(0, i - WINDOW + 1);
    const slice = diffs.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return { idx: i + 1, val: avg };
  });

  const maxIdx = points[points.length - 1].idx;
  const vals = points.map((p) => p.val);
  // Domain always includes 0 so the zero line is visible.
  let minY = Math.min(0, ...vals);
  let maxY = Math.max(0, ...vals);
  // Pad the bounds ~10% so the line doesn't hug the edges.
  const span = maxY - minY;
  const padY = Math.max(0.5, span * 0.1);
  if (minY < 0) minY -= padY;
  if (maxY > 0) maxY += padY;
  // If entirely positive or entirely negative, nudge the opposite side so
  // the zero line isn't right at the edge.
  if (minY === 0) minY = -Math.max(0.5, maxY * 0.1);
  if (maxY === 0) maxY = Math.max(0.5, -minY * 0.1);
  const rangeY = maxY - minY || 1;

  // "Nice number" tick selection — picks a step from [1,2,5] × 10^n.
  // Rolling-avg range is typically small (-5 to +5), so sub-integer steps
  // are common (0.5, 1, 2). Keep one decimal in labels when step < 1.
  const niceStep = (range, targetTicks = 4) => {
    const rough = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    return step * mag;
  };
  const step = niceStep(rangeY);
  const decimals = step < 1 ? 1 : 0;
  const formatTick = (v) => {
    const rounded = Number(v.toFixed(decimals));
    if (rounded > 0) return `+${rounded.toFixed(decimals)}`;
    return rounded.toFixed(decimals);
  };

  // Build an ordered list of tick values within [minY, maxY] that are multiples of step.
  const ticks = [];
  const firstTick = Math.ceil(minY / step) * step;
  for (let v = firstTick; v <= maxY + 1e-9; v += step) {
    ticks.push(Math.round(v / step) * step);
  }
  if (!ticks.some((t) => Math.abs(t) < 1e-9) && minY <= 0 && maxY >= 0) ticks.push(0);
  // De-dupe float drift and sort.
  const seen = new Set();
  const uniqTicks = [];
  ticks.sort((a, b) => a - b).forEach((t) => {
    const k = t.toFixed(decimals + 3);
    if (!seen.has(k)) {
      seen.add(k);
      uniqTicks.push(t);
    }
  });

  const xFor = (idx) =>
    // With a single game, center the point horizontally.
    maxIdx === 1
      ? (PAD_L + W - PAD_R) / 2
      : PAD_L + ((idx - 1) / (maxIdx - 1)) * (W - PAD_L - PAD_R);
  const yFor = (val) => {
    const ratio = (val - minY) / rangeY;
    return H - PAD_B - ratio * (H - PAD_B - PAD_T);
  };

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.idx).toFixed(2)} ${yFor(p.val).toFixed(2)}`)
    .join(" ");

  const zeroY = yFor(0);
  const last = points[points.length - 1];
  const lastPositive = last.val >= 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      {/* Gradient fill under the line */}
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.coral} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.coral} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines + y-axis labels */}
      {uniqTicks.map((v, i) => {
        const y = yFor(v);
        const isZero = Math.abs(v) < 1e-9;
        return (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke={isZero ? C.babyBlue : C.line}
              strokeWidth="1"
              strokeDasharray={isZero ? "3 3" : "none"}
            />
            <text
              x={PAD_L - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily={BODY}
              fontWeight="700"
              fill={isZero ? C.navy : C.muted}
            >
              {formatTick(v)}
            </text>
          </g>
        );
      })}

      {/* Area under curve */}
      <path
        d={`${pathD} L ${xFor(last.idx).toFixed(2)} ${zeroY.toFixed(2)} L ${xFor(points[0].idx).toFixed(2)} ${zeroY.toFixed(2)} Z`}
        fill="url(#trendFill)"
      />
      {/* The line itself */}
      <path
        d={pathD}
        fill="none"
        stroke={lastPositive ? C.coral : C.muted}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Final point marker */}
      <circle
        cx={xFor(last.idx)}
        cy={yFor(last.val)}
        r="3.5"
        fill={lastPositive ? C.coral : C.muted}
      />

      {/* X-axis endpoints — game number labels */}
      <text
        x={xFor(1)}
        y={H - 6}
        textAnchor="start"
        fontSize="9"
        fontFamily={BODY}
        fontWeight="700"
        fill={C.muted}
      >
        Game 1
      </text>
      <text
        x={xFor(maxIdx)}
        y={H - 6}
        textAnchor="end"
        fontSize="9"
        fontFamily={BODY}
        fontWeight="700"
        fill={C.muted}
      >
        Game {maxIdx}
      </text>
    </svg>
  );
}

function StatsView({
  stats,
  partnerships,
  games,
  players,
  ratingsById = {},
  sessionFilter = null,
  onSessionFilterChange = () => {},
  filteredStats = null,
  filteredPartnerships = null,
  filteredGames = null,
}) {
  const [sortKey, setSortKey] = useState("winPct");
  const [minGames, setMinGames] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // When filter is active, all stats below the filter card recompute against
  // the filtered subset. Spark Rating stays all-time per design.
  const filterActive =
    !!sessionFilter && sessionFilter.playerIds && sessionFilter.playerIds.length > 0;
  const effectiveStats = filterActive && filteredStats ? filteredStats : stats;
  const effectivePartnerships = filterActive && filteredPartnerships ? filteredPartnerships : partnerships;
  const effectiveGames = filterActive && filteredGames ? filteredGames : games;

  // Merge Spark ratings into each stat row so the leaderboard can sort by
  // singles or doubles rating. Players who haven't played a mode get null
  // ratings; the comparator below pushes those to the bottom.
  const statsWithRatings = useMemo(() => {
    return effectiveStats.map((s) => {
      const r = ratingsById[s.id];
      return {
        ...s,
        singlesRating: r?.singlesRating ?? null,
        singlesGames: r?.singlesGames ?? 0,
        doublesRating: r?.doublesRating ?? null,
        doublesGames: r?.doublesGames ?? 0,
      };
    });
  }, [effectiveStats, ratingsById]);

  const sorted = useMemo(() => {
    const active = statsWithRatings.filter((s) => s.games >= minGames);
    return active.slice().sort(compareBySortKey(sortKey));
  }, [statsWithRatings, sortKey, minGames]);

  const totalGames = effectiveGames.length;
  const totalPoints = effectiveGames.reduce((sum, g) => sum + g.score1 + g.score2, 0);
  const topPartnership = effectivePartnerships
    .filter((p) => p.games >= 2)
    .slice()
    .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins)[0];

  const exportGamesCSV = () => {
    const nameOf = (id) => players.find((p) => p.id === id)?.name || "(removed)";
    const rows = [
      ["Date", "Mode", "Team 1", "Team 2", "Score 1", "Score 2", "Winner", "Note"],
      ...games.map((g) => [
        g.date,
        g.mode,
        g.team1.map(nameOf).join(" & "),
        g.team2.map(nameOf).join(" & "),
        g.score1,
        g.score2,
        g.score1 > g.score2 ? "Team 1" : "Team 2",
        g.note || "",
      ]),
    ];
    download(csv(rows), "pickleball-games.csv", "text/csv");
  };

  const exportStatsCSV = () => {
    const rows = [
      ["Player", "Games", "Wins", "Losses", "Win %", "Points For", "Points Against", "Point Diff", "Avg PF"],
      ...stats.map((s) => [
        s.name,
        s.games,
        s.wins,
        s.losses,
        (s.winPct * 100).toFixed(1) + "%",
        s.pointsFor,
        s.pointsAgainst,
        s.diff,
        s.ppg.toFixed(2),
      ]),
    ];
    download(csv(rows), "pickleball-stats.csv", "text/csv");
  };

  if (totalGames === 0) {
    return (
      <>
        <SessionFilterCard
          filter={sessionFilter}
          players={players}
          onOpen={() => setFilterModalOpen(true)}
          onClear={() => onSessionFilterChange(null)}
        />
        <EmptyCard
          icon={<BarChart3 size={24} color={C.coral} />}
          title={filterActive ? "No games match this filter" : "No stats yet"}
          body={
            filterActive
              ? "Try adjusting the player set or time range, or clear the filter to see everything."
              : "Log at least one game to populate the leaderboard, point differentials, and partnership records."
          }
        />
        {filterModalOpen && (
          <SessionFilterModal
            initialFilter={sessionFilter}
            players={players}
            games={games}
            onApply={(f) => {
              onSessionFilterChange(f);
              setFilterModalOpen(false);
            }}
            onClose={() => setFilterModalOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <SessionFilterCard
        filter={sessionFilter}
        players={players}
        onOpen={() => setFilterModalOpen(true)}
        onClear={() => onSessionFilterChange(null)}
      />

      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Games" value={totalGames} accent={C.navy} />
        <MetricCard label="Points" value={totalPoints} accent={C.coral} />
        <MetricCard label="Players" value={effectiveStats.filter((s) => s.games > 0).length} accent={C.navyDeep} />
      </div>

      <PointsWonBoard stats={effectiveStats} />

      <div className="rounded-sm overflow-hidden" style={{ background: "white", border: `1px solid ${C.line}` }}>
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: C.navy, color: C.cream }}
        >
          <div className="flex items-center gap-2">
            <Trophy size={14} color={C.sky} />
            <span
              className="text-[11px] uppercase tracking-[0.22em] font-bold"
              style={{ fontFamily: BODY }}
            >
              Leaderboard
            </span>
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="text-[11px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-sm outline-none"
            style={{ background: C.navyDeep, color: C.cream, border: `1px solid rgba(255,255,255,0.1)` }}
          >
            <option value="winPct">Win %</option>
            <option value="pointsPct">Points %</option>
            <option value="wins">Wins</option>
            <option value="games">Games</option>
            <option value="diff">Point Diff</option>
            <option value="ppg">Avg PF</option>
            <option value="doublesRating">Doubles Spark</option>
            <option value="singlesRating">Singles Spark</option>
          </select>
        </div>

        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.muted }}>
            Min games: {minGames}
          </span>
          <input
            type="range"
            min="0"
            max={Math.max(1, Math.max(...stats.map((s) => s.games)))}
            value={minGames}
            onChange={(e) => setMinGames(Number(e.target.value))}
            className="w-32"
            style={{ accentColor: C.coral }}
          />
        </div>

        <div className="pb-2">
          {sorted.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: C.muted }}>
              No players meet that filter.
            </div>
          ) : (
            <LeaderboardList sorted={sorted} sortKey={sortKey} minGames={minGames} />
          )}
        </div>
      </div>

      {/* Daily Leaderboard hidden when a session filter is active — the
          session filter already serves the "narrow this down" purpose, and
          showing both is confusing. */}
      {!filterActive && <DailyLeaderboard games={games} players={players} />}

      <HotStreaksSection stats={effectiveStats} />

      {topPartnership && (
        <div
          className="rounded-sm p-4"
          style={{
            background: `linear-gradient(135deg, ${C.ice} 0%, ${C.cream} 100%)`,
            border: `1px solid ${C.line}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Handshake size={14} color={C.navy} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.navy }}>
              Top Duo
            </span>
          </div>
          <div className="text-lg leading-tight uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
            <PlayerName id={topPartnership.a} name={topPartnership.aName} /> &{" "}
            <PlayerName id={topPartnership.b} name={topPartnership.bName} />
          </div>
          <div className="text-xs mt-1" style={{ color: C.muted }}>
            {topPartnership.wins}-{topPartnership.games - topPartnership.wins} ·{" "}
            {(topPartnership.winPct * 100).toFixed(0)}% in {topPartnership.games} games together
          </div>
        </div>
      )}

      {effectivePartnerships.length > 0 && (
        <AllPartnershipsSection partnerships={effectivePartnerships} players={players} />
      )}

      <div className="rounded-sm p-4" style={{ background: "white", border: `1px solid ${C.line}` }}>
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3" style={{ color: C.muted }}>
          Export
        </div>
        <div className="grid grid-cols-1 gap-2">
          <ExportButton onClick={exportGamesCSV} label="Games → CSV (for Google Sheets)" />
          <ExportButton onClick={exportStatsCSV} label="Stats → CSV" variant="ghost" />
        </div>
        <p className="text-[11px] mt-3" style={{ color: C.muted }}>
          CSV files import cleanly into Google Sheets — File → Import → Upload.
        </p>
      </div>

      {filterModalOpen && (
        <SessionFilterModal
          initialFilter={sessionFilter}
          players={players}
          games={games}
          onApply={(f) => {
            onSessionFilterChange(f);
            setFilterModalOpen(false);
          }}
          onClose={() => setFilterModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---------- Session Filter UI ----------
// Inline card at the top of the Stats tab. When no filter is active, shows
// a compact "Filter by session" affordance. When a filter is active, shows
// the summary (player names + time range) with Edit / Clear actions.
function SessionFilterCard({ filter, players, onOpen, onClear }) {
  const active = !!filter && filter.playerIds && filter.playerIds.length > 0;

  if (!active) {
    return (
      <button
        onClick={onOpen}
        className="w-full rounded-sm px-4 py-3 flex items-center justify-between transition-colors active:bg-gray-50"
        style={{
          background: "white",
          border: `1px dashed ${C.line}`,
          color: C.muted,
        }}
      >
        <span className="flex items-center gap-2">
          <Filter size={14} color={C.coral} strokeWidth={2.4} />
          <span className="text-[11px] uppercase tracking-[0.22em] font-bold" style={{ color: C.navy }}>
            Filter by session
          </span>
        </span>
        <ChevronDown size={14} color={C.muted} strokeWidth={2.2} />
      </button>
    );
  }

  // Active filter — render summary
  const playerNames = filter.playerIds
    .map((id) => players.find((p) => p.id === id)?.name)
    .filter(Boolean);
  const playersLabel =
    playerNames.length <= 3
      ? playerNames.join(", ")
      : `${playerNames.slice(0, 2).join(", ")} +${playerNames.length - 2}`;

  let timeLabel = "All time";
  if (filter.timeRange === "today") timeLabel = "Today";
  else if (filter.timeRange === "last7") timeLabel = "Last 7 days";
  else if (filter.timeRange === "date" && filter.date) timeLabel = fmtDate(filter.date);
  else if (filter.timeRange === "custom" && filter.dateStart && filter.dateEnd)
    timeLabel = `${fmtDate(filter.dateStart)} → ${fmtDate(filter.dateEnd)}`;

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${C.coral} 0%, ${C.coralDeep} 100%)`,
        color: C.cream,
      }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <Filter size={12} strokeWidth={2.6} />
        <span
          className="text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ fontFamily: BODY, opacity: 0.9 }}
        >
          Session Filter Active
        </span>
      </div>
      <div className="px-4 pb-2">
        <div
          className="font-bold text-[15px] uppercase truncate"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
        >
          {playersLabel}
        </div>
        <div className="text-[11px] opacity-90 mt-0.5" style={{ fontFamily: BODY }}>
          {timeLabel} · {filter.mode === "exclusive" ? "Exact pool" : "Any of these"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <button
          onClick={onOpen}
          className="py-2 rounded-sm text-[11px] uppercase tracking-[0.22em] font-bold"
          style={{ background: "rgba(255,255,255,0.15)", color: C.cream, fontFamily: BODY }}
        >
          Edit
        </button>
        <button
          onClick={onClear}
          className="py-2 rounded-sm text-[11px] uppercase tracking-[0.22em] font-bold"
          style={{
            background: "rgba(255,255,255,0.95)",
            color: C.coralDeep,
            fontFamily: BODY,
          }}
        >
          Clear Filter
        </button>
      </div>
    </div>
  );
}

// ---------- Session Filter Modal ----------
// Player picker + time range picker + mode toggle + live preview of how many
// games would match. Auto-pre-populates with today's players if any games
// exist today (the "look at our session right after we finished" common case).
function SessionFilterModal({ initialFilter, players, games, onApply, onClose }) {
  // Determine the default player set: if any games today, auto-select today's
  // unique players. Otherwise, leave empty (user must pick).
  const today = todayISO();
  const todaysPlayers = useMemo(() => {
    const s = new Set();
    games.forEach((g) => {
      if (g.date === today) {
        g.team1.forEach((id) => s.add(id));
        g.team2.forEach((id) => s.add(id));
      }
    });
    return [...s];
  }, [games, today]);

  const [playerIds, setPlayerIds] = useState(
    initialFilter?.playerIds && initialFilter.playerIds.length > 0
      ? initialFilter.playerIds
      : todaysPlayers
  );
  const [mode, setMode] = useState(initialFilter?.mode || "exclusive");
  const [timeRange, setTimeRange] = useState(initialFilter?.timeRange || "all");
  const [date, setDate] = useState(initialFilter?.date || today);
  const [dateStart, setDateStart] = useState(initialFilter?.dateStart || today);
  const [dateEnd, setDateEnd] = useState(initialFilter?.dateEnd || today);

  // Build a draft filter and preview match count.
  const draft = {
    playerIds,
    mode,
    timeRange,
    date,
    dateStart,
    dateEnd,
  };
  const previewGames = useMemo(
    () => applySessionFilter(games, draft),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [games, playerIds, mode, timeRange, date, dateStart, dateEnd]
  );

  const togglePlayer = (id) => {
    setPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };
  const selectAll = () => setPlayerIds(players.map((p) => p.id));
  const selectNone = () => setPlayerIds([]);
  const selectToday = () => setPlayerIds(todaysPlayers);

  const canApply = playerIds.length > 0;

  const apply = () => {
    if (!canApply) return;
    onApply(draft);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
      style={{ background: "rgba(13,47,69,0.6)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-sm overflow-hidden flex flex-col"
        style={{
          background: C.cream,
          border: `1px solid ${C.line}`,
          boxShadow: "0 24px 48px -12px rgba(13,47,69,0.4)",
          maxHeight: "calc(100vh - 5rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: C.muted, fontFamily: BODY }}
          >
            Filter by Session
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
            aria-label="Close filter"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto px-4 py-4 flex-1">
          {/* Player picker */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ color: C.navy }}
            >
              Players ({playerIds.length})
            </div>
            <div className="flex items-center gap-1">
              {todaysPlayers.length > 0 && (
                <button
                  onClick={selectToday}
                  className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-1 rounded-sm"
                  style={{ background: C.ice, color: C.navy }}
                >
                  Today
                </button>
              )}
              <button
                onClick={selectAll}
                className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-1 rounded-sm"
                style={{ background: "white", color: C.muted, border: `1px solid ${C.line}` }}
              >
                All
              </button>
              <button
                onClick={selectNone}
                className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-1 rounded-sm"
                style={{ background: "white", color: C.muted, border: `1px solid ${C.line}` }}
              >
                None
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-5">
            {players.map((p) => {
              const checked = playerIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className="text-left px-3 py-2 rounded-sm flex items-center gap-2 transition-colors"
                  style={{
                    background: checked ? C.coral : "white",
                    color: checked ? C.cream : C.ink,
                    border: `1px solid ${checked ? C.coral : C.line}`,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                    style={{
                      background: checked ? "rgba(255,255,255,0.25)" : "white",
                      border: `1px solid ${checked ? "rgba(255,255,255,0.6)" : C.line}`,
                    }}
                  >
                    {checked && <Check size={11} strokeWidth={3} color={C.cream} />}
                  </span>
                  <span className="text-sm font-bold truncate">{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Mode toggle */}
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2"
            style={{ color: C.navy }}
          >
            Match mode
          </div>
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => setMode("exclusive")}
              className="px-3 py-2.5 rounded-sm text-left"
              style={{
                background: mode === "exclusive" ? C.navy : "white",
                color: mode === "exclusive" ? C.cream : C.ink,
                border: `1px solid ${mode === "exclusive" ? C.navy : C.line}`,
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold">
                Exact pool
              </div>
              <div className="text-[10px] mt-0.5 opacity-80">
                Only games where every player is in this set
              </div>
            </button>
            <button
              onClick={() => setMode("inclusive")}
              className="px-3 py-2.5 rounded-sm text-left"
              style={{
                background: mode === "inclusive" ? C.navy : "white",
                color: mode === "inclusive" ? C.cream : C.ink,
                border: `1px solid ${mode === "inclusive" ? C.navy : C.line}`,
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold">
                Any of these
              </div>
              <div className="text-[10px] mt-0.5 opacity-80">
                Games involving at least one of these players
              </div>
            </button>
          </div>

          {/* Time range */}
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2"
            style={{ color: C.navy }}
          >
            Time range
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              { v: "all", l: "All time" },
              { v: "today", l: "Today" },
              { v: "last7", l: "Last 7 days" },
              { v: "date", l: "Specific date" },
              { v: "custom", l: "Custom range" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setTimeRange(opt.v)}
                className="px-3 py-2 rounded-sm text-[11px] uppercase tracking-[0.18em] font-bold"
                style={{
                  background: timeRange === opt.v ? C.navy : "white",
                  color: timeRange === opt.v ? C.cream : C.ink,
                  border: `1px solid ${timeRange === opt.v ? C.navy : C.line}`,
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
          {timeRange === "date" && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-sm mb-3"
              style={{ background: "white", border: `1px solid ${C.line}` }}
            />
          )}
          {timeRange === "custom" && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="px-3 py-2 rounded-sm"
                style={{ background: "white", border: `1px solid ${C.line}` }}
              />
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="px-3 py-2 rounded-sm"
                style={{ background: "white", border: `1px solid ${C.line}` }}
              />
            </div>
          )}

          {/* Preview */}
          <div
            className="rounded-sm p-3 flex items-center justify-between"
            style={{ background: C.ice, border: `1px solid ${C.line}` }}
          >
            <span
              className="text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ color: C.navy }}
            >
              Preview
            </span>
            <span className="text-sm font-bold" style={{ color: C.navyDeep }}>
              {previewGames.length} {previewGames.length === 1 ? "game" : "games"}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="grid grid-cols-2 gap-2 p-3 shrink-0"
          style={{ borderTop: `1px solid ${C.line}`, background: C.cream }}
        >
          <button
            onClick={onClose}
            className="py-3 rounded-sm text-sm font-bold"
            style={{ background: "white", color: C.muted, border: `1px solid ${C.line}` }}
          >
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={!canApply}
            className="py-3 rounded-sm text-sm font-bold disabled:opacity-50"
            style={{ background: C.coral, color: C.cream }}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- All Partnerships ----------
// Truncated list with a "Show More" button + a "Look up a duo" affordance at
// the top. Each row is also tappable — opens the lookup modal pre-populated
// with that pair so users can see the same stats in detail (and toggle to a
// different duo from there if they want).
function AllPartnershipsSection({ partnerships, players }) {
  const sorted = useMemo(
    () => [...partnerships].sort((a, b) => b.games - a.games),
    [partnerships]
  );
  const { sliced, remaining, next, showMore } = useTruncated(sorted, "all-partnerships");
  // Lookup modal state: null = closed, {a, b} = open with these two preselected.
  const [lookup, setLookup] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ color: C.muted }}
        >
          All Partnerships
        </div>
        <button
          onClick={() => setLookup({ a: null, b: null })}
          className="text-[10px] uppercase tracking-[0.22em] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
          style={{
            background: C.ice,
            color: C.navy,
            border: `1px solid ${C.line}`,
          }}
        >
          <Search size={11} /> Look up a duo
        </button>
      </div>
      <div className="space-y-2">
        {sliced.map((p) => (
          <button
            key={`${p.a}|${p.b}`}
            onClick={() => setLookup({ a: p.a, b: p.b })}
            className="w-full text-left rounded-sm px-4 py-2.5 flex items-center justify-between transition-colors active:bg-gray-50"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate">
                {p.aName} & {p.bName}
              </div>
              <div className="text-[11px]" style={{ color: C.muted }}>
                {p.games} {p.games === 1 ? "game" : "games"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm" style={{ color: C.navy, fontFamily: DISPLAY }}>
                {p.wins}-{p.games - p.wins}
              </div>
              <div className="text-[10px] font-semibold" style={{ color: C.muted }}>
                {(p.winPct * 100).toFixed(0)}%
              </div>
            </div>
          </button>
        ))}
      </div>
      <ShowMoreButton remaining={remaining} next={next} onClick={showMore} />

      {lookup && (
        <PartnershipLookupModal
          players={players}
          partnerships={partnerships}
          initialA={lookup.a}
          initialB={lookup.b}
          onClose={() => setLookup(null)}
        />
      )}
    </div>
  );
}

// ---------- Partnership Lookup Modal ----------
// Two player pickers + a result panel showing the duo's record. Pre-populated
// when opened from a tappable row. Falls back to a friendly "haven't played
// together yet" message when the pair isn't in the partnerships data.
function PartnershipLookupModal({ players, partnerships, initialA, initialB, onClose }) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);

  // Build a lookup map keyed by both orderings of the pair so order-of-pick
  // doesn't matter.
  const partnershipByPair = useMemo(() => {
    const map = new Map();
    partnerships.forEach((p) => {
      map.set(`${p.a}|${p.b}`, p);
      map.set(`${p.b}|${p.a}`, p);
    });
    return map;
  }, [partnerships]);

  const result = a && b && a !== b ? partnershipByPair.get(`${a}|${b}`) || null : null;
  const samePicked = a && b && a === b;
  const namesPicked = a && b && a !== b;

  const aName = players.find((p) => p.id === a)?.name || "";
  const bName = players.find((p) => p.id === b)?.name || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
      style={{ background: "rgba(13,47,69,0.6)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full rounded-sm overflow-hidden"
        style={{
          background: C.cream,
          border: `1px solid ${C.line}`,
          boxShadow: "0 24px 48px -12px rgba(13,47,69,0.4)",
          maxHeight: "calc(100vh - 5rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: C.muted, fontFamily: BODY }}
          >
            Duo Lookup
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
            aria-label="Close lookup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(100vh - 12rem)" }}>
          {/* Player pickers */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label
                className="block text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                style={{ color: C.muted }}
              >
                Player 1
              </label>
              <select
                value={a || ""}
                onChange={(e) => setA(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-sm font-bold"
                style={{ background: "white", border: `1px solid ${C.line}`, fontSize: "14px" }}
              >
                <option value="">Pick…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                style={{ color: C.muted }}
              >
                Player 2
              </label>
              <select
                value={b || ""}
                onChange={(e) => setB(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-sm font-bold"
                style={{ background: "white", border: `1px solid ${C.line}`, fontSize: "14px" }}
              >
                <option value="">Pick…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result panel */}
          {!namesPicked && !samePicked && (
            <div
              className="rounded-sm p-4 text-center text-xs"
              style={{ background: "white", border: `1px solid ${C.line}`, color: C.muted }}
            >
              Pick two players to see their record as teammates.
            </div>
          )}
          {samePicked && (
            <div
              className="rounded-sm p-4 text-center text-xs"
              style={{
                background: "rgba(234,78,51,0.08)",
                border: `1px solid ${C.coral}`,
                color: C.coralDeep,
              }}
            >
              Pick two different players.
            </div>
          )}
          {namesPicked && !result && (
            <div
              className="rounded-sm p-4 text-center"
              style={{ background: "white", border: `1px solid ${C.line}` }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                style={{ color: C.muted }}
              >
                Never Partnered
              </div>
              <div className="text-sm" style={{ color: C.ink }}>
                <strong>{aName}</strong> and <strong>{bName}</strong> haven't
                played a game on the same team yet.
              </div>
            </div>
          )}
          {result && (
            <div
              className="rounded-sm p-4"
              style={{
                background: `linear-gradient(135deg, ${C.ice} 0%, ${C.cream} 100%)`,
                border: `1px solid ${C.line}`,
              }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 text-center"
                style={{ color: C.navy }}
              >
                {aName} & {bName}
              </div>
              <div
                className="text-center mb-3"
                style={{ fontFamily: DISPLAY, fontSize: "44px", lineHeight: 1, color: C.navyDeep }}
              >
                {result.wins}-{result.games - result.wins}
              </div>
              <div
                className="text-center text-[10px] uppercase tracking-[0.22em] font-bold"
                style={{ color: C.muted }}
              >
                {(result.winPct * 100).toFixed(0)}% Win Rate · {result.games}{" "}
                {result.games === 1 ? "Game" : "Games"}
              </div>
              {/* Optional point-diff line, when present in the data */}
              {typeof result.pointDiff === "number" && (
                <div
                  className="text-center mt-2 text-xs"
                  style={{ color: result.pointDiff > 0 ? C.coral : result.pointDiff < 0 ? C.muted : C.muted }}
                >
                  {result.pointDiff > 0 ? "+" : ""}
                  {result.pointDiff} pt diff together
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Daily Leaderboard ----------
// Same 5 sort keys as the all-time leaderboard, but scoped to games on a
// selected date. Defaults to today; user can pick any past date. If the chosen
// date has no games, renders an empty state.
function DailyLeaderboard({ games, players }) {
  const [date, setDate] = useState(todayISO());
  const [sortKey, setSortKey] = useState("winPct");

  const gamesForDate = useMemo(
    () => games.filter((g) => g.date === date),
    [games, date]
  );

  const dayStats = useMemo(
    () => computeStats(players, gamesForDate, { trackStreaks: false }),
    [players, gamesForDate]
  );

  const sorted = useMemo(() => {
    const active = dayStats.filter((s) => s.games > 0);
    return active.slice().sort(compareBySortKey(sortKey));
  }, [dayStats, sortKey]);

  // Dates that actually have games — used to pre-validate the date picker
  const gameDates = useMemo(() => {
    const set = new Set(games.map((g) => g.date));
    return Array.from(set).sort().reverse(); // most recent first
  }, [games]);

  const friendlyDate = (iso) => {
    if (iso === todayISO()) return "Today";
    return fmtDate(iso);
  };

  const formatValue = (s, key) => {
    if (key === "winPct") return (s.winPct * 100).toFixed(0) + "%";
    if (key === "pointsPct") return (s.pointsPct * 100).toFixed(1) + "%";
    if (key === "ppg") return s.ppg.toFixed(1);
    return s[key];
  };
  const formatLabel = (key) => {
    if (key === "winPct") return "win rate";
    if (key === "pointsPct") return "pts won";
    if (key === "ppg") return "avg PF";
    return key;
  };

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: C.navyDeep, color: C.cream }}
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={14} color={C.sky} />
          <span
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ fontFamily: BODY }}
          >
            By Day
          </span>
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="text-[11px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-sm outline-none"
          style={{ background: C.navy, color: C.cream, border: `1px solid rgba(255,255,255,0.1)` }}
        >
          <option value="winPct">Win %</option>
          <option value="pointsPct">Points %</option>
          <option value="wins">Wins</option>
          <option value="games">Games</option>
          <option value="diff">Point Diff</option>
          <option value="ppg">Avg PF</option>
        </select>
      </div>

      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.muted }}>
          Date
        </span>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 text-sm font-semibold bg-transparent outline-none"
          style={{ color: C.ink, fontFamily: BODY }}
        />
        <span className="text-[10px] font-semibold shrink-0" style={{ color: C.muted }}>
          {friendlyDate(date)} · {gamesForDate.length} {gamesForDate.length === 1 ? "game" : "games"}
        </span>
      </div>

      <div className="pb-2">
        {sorted.length === 0 ? (
          <div className="text-center py-6 text-sm" style={{ color: C.muted }}>
            {gameDates.length === 0
              ? "No games yet."
              : "No games on this date."}
          </div>
        ) : (
          sorted.map((s, idx) => (
            <div
              key={s.id}
              className="px-4 py-2.5 flex items-center gap-3"
              style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}
            >
              <div
                className="w-7 h-7 rounded-sm flex items-center justify-center text-xs"
                style={{
                  background: idx === 0 ? C.coral : C.cream,
                  color: idx === 0 ? C.cream : C.muted,
                  fontFamily: DISPLAY,
                  border: idx === 0 ? "none" : `1px solid ${C.line}`,
                }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <PlayerName
                  id={s.id}
                  name={s.name}
                  className="font-bold text-[14px] leading-tight truncate block"
                />
                <div className="text-[11px]" style={{ color: C.muted }}>
                  {s.games}G · {s.wins}-{s.losses} · {s.diff >= 0 ? "+" : ""}
                  {s.diff} diff
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-lg leading-none"
                  style={{ fontFamily: DISPLAY, color: C.navy }}
                >
                  {formatValue(s, sortKey)}
                </div>
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-bold"
                  style={{ color: C.muted }}
                >
                  {formatLabel(sortKey)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Hot Streaks Section ----------
// Dedicated section showing the current streak + best-ever streak for each
// player who's played at least one game. Split into two sub-lists: active
// win streaks (hot) and active loss streaks (cold). Best streak shown as
// a small subline under the current.
// Leaderboard list with truncation. Pulled out so the sortKey/minGames
// filter changes can reset the visible-count via the keyDep.
function LeaderboardList({ sorted, sortKey, minGames }) {
  const { sliced, remaining, next, showMore } = useTruncated(
    sorted,
    `${sortKey}|${minGames}`,
    10
  );
  return (
    <>
      {sliced.map((s, idx) => (
        <div
          key={s.id}
          className="px-4 py-2.5 flex items-center gap-3"
          style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}
        >
          <div
            className="w-7 h-7 rounded-sm flex items-center justify-center text-xs"
            style={{
              background: idx === 0 ? C.coral : C.cream,
              color: idx === 0 ? C.cream : C.muted,
              fontFamily: DISPLAY,
              border: idx === 0 ? "none" : `1px solid ${C.line}`,
            }}
          >
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <PlayerName
              id={s.id}
              name={s.name}
              className="font-bold text-[14px] leading-tight truncate block"
            />
            <div className="text-[11px]" style={{ color: C.muted }}>
              {s.games}G · {s.wins}-{s.losses} · {s.diff >= 0 ? "+" : ""}
              {s.diff} diff
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-lg leading-none"
              style={{ fontFamily: DISPLAY, color: C.navy }}
            >
              {sortKey === "winPct"
                ? (s.winPct * 100).toFixed(0) + "%"
                : sortKey === "pointsPct"
                ? (s.pointsPct * 100).toFixed(1) + "%"
                : sortKey === "ppg"
                ? s.ppg.toFixed(1)
                : sortKey === "singlesRating"
                ? s.singlesRating ?? "—"
                : sortKey === "doublesRating"
                ? s.doublesRating ?? "—"
                : s[sortKey]}
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: C.muted }}>
              {sortKey === "winPct"
                ? "win rate"
                : sortKey === "pointsPct"
                ? "pts won"
                : sortKey === "ppg"
                ? "avg PF"
                : sortKey === "singlesRating"
                ? "singles spark"
                : sortKey === "doublesRating"
                ? "doubles spark"
                : sortKey}
            </div>
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <button
            onClick={showMore}
            className="w-full py-2 rounded-sm text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{
              background: "transparent",
              color: C.muted,
              border: `1px dashed ${C.line}`,
            }}
          >
            Show {next} More ({remaining} left)
          </button>
        </div>
      )}
    </>
  );
}

function HotStreaksSection({ stats }) {
  const active = stats.filter((s) => s.games > 0);
  if (active.length === 0) return null;

  // Tiebreakers vary by card:
  //   Win Streak Record + Active Win Streak: recency wins (most recent date)
  //   Loss Streak Record + Active Loss Streak: lower pointsPct wins (the
  //     worse-performing player gets the dubious honor — feels more
  //     thematically right than awarding it to whoever lost most recently)
  //   Final fallback for both: alphabetical name for deterministic ordering.
  const cmpName = (a, b) => a.name.localeCompare(b.name);
  const cmpDate = (aDate, bDate) => {
    if (aDate && bDate) return aDate < bDate ? 1 : aDate > bDate ? -1 : 0;
    if (aDate) return -1;
    if (bDate) return 1;
    return 0;
  };
  // Lower pointsPct wins → ascending sort.
  const cmpPointsPctAsc = (a, b) => (a.pointsPct ?? 0) - (b.pointsPct ?? 0);

  // Longest historical win streak (bestWinStreak max, recency tiebreaker)
  const recordWin = active
    .filter((s) => s.bestWinStreak > 0)
    .sort(
      (a, b) =>
        b.bestWinStreak - a.bestWinStreak ||
        cmpDate(a.bestWinStreakEndedAt, b.bestWinStreakEndedAt) ||
        cmpName(a, b)
    )[0] || null;

  // Longest active win streak (currentStreak > 0, max). Tiebreak on whose
  // most recent game is newest — that player's streak is the most "live."
  const activeWin = active
    .filter((s) => s.currentStreak > 0)
    .sort(
      (a, b) =>
        b.currentStreak - a.currentStreak ||
        cmpDate(a.lastGameDate, b.lastGameDate) ||
        cmpName(a, b)
    )[0] || null;

  // Longest historical loss streak (bestLossStreak max, lower-pointsPct
  // tiebreaker — the worse-performing player gets the streak crown).
  const recordLoss = active
    .filter((s) => s.bestLossStreak > 0)
    .sort(
      (a, b) =>
        b.bestLossStreak - a.bestLossStreak ||
        cmpPointsPctAsc(a, b) ||
        cmpName(a, b)
    )[0] || null;

  // Longest active loss streak (currentStreak < 0, most negative). Same
  // points-won-% tiebreaker rationale.
  const activeLoss = active
    .filter((s) => s.currentStreak < 0)
    .sort(
      (a, b) =>
        a.currentStreak - b.currentStreak ||
        cmpPointsPctAsc(a, b) ||
        cmpName(a, b)
    )[0] || null;

  // Render a single card. Holder is the leader; value is the streak length;
  // accent governs the icon + number color.
  const Card = ({ icon, label, holder, value, accent }) => (
    <div
      className="rounded-sm overflow-hidden"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      <div
        className="px-3 py-2 flex items-center gap-1.5"
        style={{ background: C.cream, borderBottom: `1px solid ${C.line}` }}
      >
        {icon}
        <span
          className="text-[9px] uppercase tracking-[0.2em] font-bold"
          style={{ color: accent, fontFamily: BODY }}
        >
          {label}
        </span>
      </div>
      {holder ? (
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          <PlayerName
            id={holder.id}
            name={holder.name}
            className="font-bold text-[13px] truncate"
          />
          <div
            className="text-2xl leading-none shrink-0"
            style={{ fontFamily: DISPLAY, color: accent }}
          >
            {value}
          </div>
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-[11px]" style={{ color: C.muted }}>
          —
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.22em] font-bold px-1 mb-2"
        style={{ color: C.muted }}
      >
        Streaks
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Card
          icon={<Trophy size={11} color={C.coral} strokeWidth={2.4} />}
          label="Win Streak Record"
          holder={recordWin}
          value={recordWin?.bestWinStreak}
          accent={C.coral}
        />
        <Card
          icon={<Flame size={11} color={C.coral} strokeWidth={2.4} />}
          label="Active Win Streak"
          holder={activeWin}
          value={activeWin?.currentStreak}
          accent={C.coral}
        />
        <Card
          icon={<Snowflake size={11} color={C.navy} strokeWidth={2.4} />}
          label="Loss Streak Record"
          holder={recordLoss}
          value={recordLoss?.bestLossStreak}
          accent={C.navy}
        />
        <Card
          icon={<Snowflake size={11} color={C.navy} strokeWidth={2.4} />}
          label="Active Loss Streak"
          holder={activeLoss}
          value={activeLoss ? Math.abs(activeLoss.currentStreak) : null}
          accent={C.navy}
        />
      </div>
    </div>
  );
}

function PointsWonBoard({ stats }) {
  const active = stats.filter((s) => s.games > 0);
  if (active.length === 0) return null;
  // Sort by pointsPct descending. Ties broken by raw pointsFor so players
  // who've scored more total points edge out players with identical ratios.
  const sorted = useMemo(
    () => active.slice().sort((a, b) => b.pointsPct - a.pointsPct || b.pointsFor - a.pointsFor),
    [active]
  );
  // Bar scaling: leader's pct = 100% bar width; everyone else proportional.
  // This exaggerates the visual gap between players who are all above 50%,
  // which is the typical range for "points actually won out of possible."
  const topPct = sorted[0].pointsPct || 1;

  const { sliced, remaining, next, showMore } = useTruncated(sorted, "points-won", 10);

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${C.line}`,
        boxShadow: "0 6px 20px -10px rgba(234,78,51,0.3)",
      }}
    >
      <div
        className="px-4 py-3.5 flex items-center gap-2.5"
        style={{
          background: `linear-gradient(135deg, ${C.coral} 0%, ${C.coralDeep} 100%)`,
          color: C.cream,
        }}
      >
        <TrendingUp size={16} strokeWidth={2.6} />
        <div className="flex-1">
          <div
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ fontFamily: BODY }}
          >
            Points Won
          </div>
          <div className="text-[10px] opacity-85" style={{ fontFamily: BODY }}>
            Points scored out of total possible
          </div>
        </div>
      </div>
      <div>
        {sliced.map((s, idx) => {
          const pct = s.pointsPct * 100;
          // Bar width relative to the leader so the visual gap reads clearly
          const barPct = (s.pointsPct / topPct) * 100;
          const isTop = idx === 0;
          return (
            <div
              key={s.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}
            >
              <div
                className="w-7 h-7 rounded-sm flex items-center justify-center text-xs shrink-0"
                style={{
                  background: isTop ? C.coral : C.cream,
                  color: isTop ? C.cream : C.muted,
                  fontFamily: DISPLAY,
                  border: isTop ? "none" : `1px solid ${C.line}`,
                }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <PlayerName
                    id={s.id}
                    name={s.name}
                    className="font-bold text-[14px] leading-tight truncate block"
                  />
                  <div className="text-[10px] ml-2 shrink-0" style={{ color: C.muted }}>
                    {s.pointsFor}/{s.pointsPossible} pts
                  </div>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: C.cream, border: `1px solid ${C.line}` }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barPct}%`,
                      background: `linear-gradient(90deg, ${C.coral} 0%, ${C.coralDeep} 100%)`,
                    }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0 w-[62px]">
                <div
                  className="text-2xl leading-none"
                  style={{
                    fontFamily: DISPLAY,
                    color: C.navy,
                    letterSpacing: "0.01em",
                  }}
                >
                  {pct.toFixed(1)}%
                </div>
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-bold mt-0.5"
                  style={{ color: C.muted }}
                >
                  pts won
                </div>
              </div>
            </div>
          );
        })}
        {remaining > 0 && (
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <button
              onClick={showMore}
              className="w-full py-2 rounded-sm text-[11px] uppercase tracking-[0.22em] font-bold"
              style={{
                background: "transparent",
                color: C.muted,
                border: `1px dashed ${C.line}`,
              }}
            >
              Show {next} More ({remaining} left)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StreakBadge({ streak }) {
  // `streak` is signed: positive = win streak, negative = loss streak.
  // Display format: "W3" / "L2" with an appropriate icon.
  // Single-game streaks (W1 / L1) are shown too, as requested — "show current streak only".
  if (streak === 0) return null;
  const isWin = streak > 0;
  const n = Math.abs(streak);
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-sm shrink-0"
      style={{
        background: isWin ? C.coral : C.ice,
        color: isWin ? C.cream : C.navyDeep,
        fontFamily: DISPLAY,
      }}
      aria-label={`${isWin ? "Win" : "Loss"} streak of ${n}`}
    >
      {isWin ? (
        <Flame size={11} strokeWidth={2.6} />
      ) : (
        <Snowflake size={11} strokeWidth={2.6} />
      )}
      <span className="text-[11px] leading-none">
        {isWin ? "W" : "L"}
        {n}
      </span>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div
      className="rounded-sm p-3 text-center"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      <div
        className="text-2xl leading-none"
        style={{ fontFamily: DISPLAY, color: accent }}
      >
        {value}
      </div>
      <div
        className="text-[10px] uppercase tracking-[0.22em] font-bold mt-1"
        style={{ color: C.muted }}
      >
        {label}
      </div>
    </div>
  );
}

function ExportButton({ onClick, label, variant = "solid" }) {
  const solid = variant === "solid";
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-3 rounded-sm text-sm font-bold"
      style={{
        background: solid ? C.ink : "transparent",
        color: solid ? C.cream : C.ink,
        border: solid ? "none" : `1px solid ${C.line}`,
        fontFamily: BODY,
      }}
    >
      <Download size={14} /> {label}
    </button>
  );
}

// Subtle "show more" button. Shown only when there are more items to reveal.
// Pairs with the useTruncated hook above.
function ShowMoreButton({ remaining, next, onClick }) {
  if (remaining <= 0) return null;
  return (
    <button
      onClick={onClick}
      className="w-full mt-2 py-2 rounded-sm text-[11px] uppercase tracking-[0.22em] font-bold"
      style={{
        background: "transparent",
        color: C.muted,
        border: `1px dashed ${C.line}`,
      }}
    >
      Show {next} More ({remaining} left)
    </button>
  );
}

function Card({ children }) {
  return (
    <div
      className="rounded-sm p-4"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      {children}
    </div>
  );
}

function EmptyCard({ icon, title, body, cta, onCta }) {
  return (
    <div
      className="rounded-sm p-8 text-center"
      style={{ background: "white", border: `1px dashed ${C.babyBlue}` }}
    >
      <div
        className="w-14 h-14 rounded-sm flex items-center justify-center mx-auto mb-4"
        style={{ background: C.ice }}
      >
        {icon}
      </div>
      <h3 className="text-lg mb-1 uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: C.muted }}>
        {body}
      </p>
      {cta && (
        <button
          onClick={onCta}
          className="mt-5 px-5 py-2.5 rounded-sm text-sm uppercase tracking-[0.18em]"
          style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

// ---------- Utilities ----------
function csv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        })
        .join(",")
    )
    .join("\n");
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

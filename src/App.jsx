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
};

// ---------- Helpers ----------
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

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
      //   _run: internal accumulator (stripped at the end)
      currentStreak: 0,
      bestWinStreak: 0,
      bestLossStreak: 0,
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

      if (trackStreaks) {
        // Extend the current run if the outcome matches its sign, otherwise reset.
        // _run is positive for an active win streak, negative for a loss streak.
        if (won) {
          s._run = s._run > 0 ? s._run + 1 : 1;
          if (s._run > s.bestWinStreak) s.bestWinStreak = s._run;
        } else {
          s._run = s._run < 0 ? s._run - 1 : -1;
          if (-s._run > s.bestLossStreak) s.bestLossStreak = -s._run;
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
      default:
        return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
    }
  };
}

// ---------- Root ----------
export default function App() {
  // ---- Group state (legacy invite-code flow) ----
  const [group, setGroup] = useState(null); // { id, name, code }
  const [bootstrapped, setBootstrapped] = useState(false);

  // ---- Auth + memberships ----
  // session: undefined = loading, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);
  // memberships: undefined = loading, [] = none, [{...}] = list
  const [memberships, setMemberships] = useState(undefined);
  const [inviteCodeMode, setInviteCodeMode] = useState(false);

  // refreshMemberships re-queries the user's group memberships. Called after
  // claim/join actions and on auth state changes.
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

  // ---- Auth session lifecycle ----
  useEffect(() => {
    let unsub = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession ?? null);
        // Reset memberships on session change so they get re-fetched for the
        // new user (or cleared on sign-out).
        setMemberships(newSession ? undefined : []);
      });
      unsub = sub?.subscription;
    })();
    return () => {
      unsub?.unsubscribe?.();
    };
  }, []);

  // ---- Memberships fetch on session ----
  // Whenever the user becomes signed in, fetch their memberships so we can
  // route to TrackerApp (active member) vs claim flow (no membership) vs
  // pending screen (only pending memberships).
  useEffect(() => {
    if (session) {
      refreshMemberships();
    } else {
      setMemberships(undefined);
    }
  }, [session, refreshMemberships]);

  // ---- Group restoration (legacy invite-code path) ----
  // Only used by the invite-code escape hatch. Once a session-based user has
  // an active membership, this state is bypassed entirely.
  useEffect(() => {
    (async () => {
      const saved = await loadGroupFromStorage();
      if (saved?.code) {
        try {
          const rows = await api.joinGroup(saved.code);
          if (rows && rows.length > 0) {
            const g = { id: rows[0].id, name: rows[0].name, code: rows[0].invite_code };
            setGroup(g);
            await saveGroupToStorage(g);
          } else {
            await clearGroupFromStorage();
          }
        } catch (e) {
          setGroup(saved);
        }
      }
      setBootstrapped(true);
    })();
  }, []);

  // ---- Routing logic ----

  // Wait for both auth + group restoration to settle.
  if (!bootstrapped || session === undefined) {
    return <Splash message="Warming up the court…" />;
  }

  // Unauthenticated and not bypassing → AuthGate.
  if (!session && !inviteCodeMode) {
    return <AuthGate onUseInviteCode={() => setInviteCodeMode(true)} />;
  }

  // Invite-code path bypasses memberships entirely.
  if (!session && inviteCodeMode) {
    if (!group) {
      return (
        <GroupGate
          onReady={async (g) => {
            setGroup(g);
            await saveGroupToStorage(g);
          }}
        />
      );
    }
    return (
      <TrackerApp
        group={group}
        session={null}
        onLeaveGroup={async () => {
          await clearGroupFromStorage();
          setGroup(null);
        }}
        onSignOut={async () => {
          await clearGroupFromStorage();
          setGroup(null);
          setInviteCodeMode(false);
          await supabase.auth.signOut();
        }}
        onMembershipsChanged={refreshMemberships}
      />
    );
  }

  // Authenticated path: wait for memberships to load.
  if (memberships === undefined) {
    return <Splash message="Loading your groups…" />;
  }

  // Active memberships exist → drop into the tracker. Pick the most recent
  // active group as the default. Pending-only memberships fall through to
  // the join-pending screen.
  const activeMemberships = memberships.filter((m) => m.status === "active");
  const pendingMemberships = memberships.filter((m) => m.status === "pending");

  if (activeMemberships.length > 0) {
    // Use saved group if it's in the active list, otherwise the most recent.
    const saved = group;
    const matched =
      saved && activeMemberships.find((m) => m.group_id === saved.id);
    const chosen = matched
      ? saved
      : {
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
          setInviteCodeMode(false);
          setMemberships(undefined);
          await supabase.auth.signOut();
        }}
        onMembershipsChanged={refreshMemberships}
      />
    );
  }

  // Only pending memberships? Show waiting screen.
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

  // No memberships at all → claim/join flow.
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
function ClaimOrJoinFlow({ session, onComplete, onSignOut }) {
  const [step, setStep] = useState("start");
  const [code, setCode] = useState("");
  const [groupCtx, setGroupCtx] = useState(null); // { id, name, code }
  const [unclaimed, setUnclaimed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [intent, setIntent] = useState(null); // 'claim' | 'create'
  const [displayName, setDisplayName] = useState("");

  const lookupGroup = async () => {
    setErr(null);
    setBusy(true);
    try {
      // Use the legacy join-by-code RPC to find the group. It returns the
      // group row if the code is valid; we use that to learn the group's id.
      const rows = await api.joinGroup(code.trim());
      if (!rows?.length) {
        setErr("No group with that code.");
        return;
      }
      const g = { id: rows[0].id, name: rows[0].name, code: rows[0].invite_code };
      setGroupCtx(g);
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
      await authApi.claimPlayer(playerId, groupCtx.id);
      // Save the chosen group to localStorage so TrackerApp picks it up.
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
      await authApi.createPlayerForSelf(displayName.trim(), groupCtx.id);
      await saveGroupToStorage(groupCtx);
      setStep("success");
      setTimeout(() => onComplete(), 800);
    } catch (e) {
      setErr(e.message || "Couldn't create your player record.");
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
              icon={<KeyRound size={18} />}
              title="I'm new to a group"
              subtitle="Join a group with an invite code"
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

        {step === "create-name" && (
          <CreatePlayerStep
            group={groupCtx}
            displayName={displayName}
            setDisplayName={setDisplayName}
            busy={busy}
            err={err}
            onSubmit={createPlayer}
            onBack={() => {
              setErr(null);
              setStep(intent === "claim" ? "claim-list" : "enter-code");
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
        Enter group code
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.7)" }}>
        Ask your group's owner for the 6-character invite code.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={code}
        maxLength={8}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && code.trim() && onSubmit()}
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
      };
    }
    return {
      listPlayers: () => api.listPlayers(group.code),
      addPlayer: async (name) => firstRow(await api.addPlayer(group.code, name)),
      deletePlayer: (playerId) => api.deletePlayer(group.code, playerId),
      listGames: () => api.listGames(group.code),
      addGame: async (game) => firstRow(await api.addGame(group.code, game)),
      deleteGame: (gameId) => api.deleteGame(group.code, gameId),
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

  const stats = useMemo(() => computeStats(players, games), [players, games]);
  const partnerships = useMemo(() => computePartnerships(players, games), [players, games]);

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
              onBack={() => setSelectedPlayerId(null)}
            />
          ) : (
            <>
              {view === "play" && (
                <PlayView players={players} onAddGame={addGame} onGoToPlayers={() => setView("players")} />
              )}
              {view === "games" && <GamesView games={games} players={players} onRemove={removeGame} />}
              {view === "players" && (
                <PlayersView players={players} stats={stats} onAdd={addPlayer} onRemove={removePlayer} />
              )}
              {view === "stats" && (
                <StatsView stats={stats} partnerships={partnerships} games={games} players={players} />
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
          />
        )}
      </div>
    </ProfileNavContext.Provider>
  );
}

// ---------- Header ----------
function Header({ group, online, syncing, onRefresh, onOpenSettings }) {
  return (
    <header
      className="px-5 pb-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        color: C.cream,
        borderBottomLeftRadius: "4px",
        borderBottomRightRadius: "4px",
        boxShadow: "0 8px 24px -12px rgba(13,47,69,0.5)",
        // Respect iOS/Android safe area so the status bar notch doesn't
        // overlap the logo. Falls back to 2rem (32px) on browsers without
        // env() support.
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
        <button
          onClick={onOpenSettings}
          className="text-left flex items-center gap-3 min-w-0 flex-1"
          aria-label="Group info"
        >
          <Logomark variant="dark" className="w-11 h-11 shrink-0" />
          <div className="min-w-0">
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
            <h1
              className="text-2xl leading-none mt-1 uppercase truncate"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Court Report
            </h1>
          </div>
        </button>
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

// ---------- Group Modal ----------
function GroupModal({ group, session, memberships, onClose, onLeave, onSignOut, onMembershipsChanged }) {
  const [copied, setCopied] = useState(false);

  // Owner detection: check this user's membership in this specific group.
  const myMembership = (memberships || []).find((m) => m.group_id === group.id);
  const isOwner = myMembership?.role === "owner";

  // Owner-only state: pending members + claim window status.
  const [pending, setPending] = useState([]);
  const [claimOpen, setClaimOpen] = useState(myMembership?.claim_window_open ?? true);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMsg, setAdminMsg] = useState(null);

  // Sync local claimOpen state if the membership data refreshes.
  useEffect(() => {
    if (myMembership) setClaimOpen(myMembership.claim_window_open);
  }, [myMembership?.claim_window_open]);

  // Owners only: load pending members on open.
  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      try {
        const rows = await authApi.pendingMembers(group.id);
        setPending(rows || []);
      } catch (e) {
        console.error("Failed to load pending members", e);
      }
    })();
  }, [isOwner, group.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {}
  };
  const share = async () => {
    const text = `Join our pickleball group "${group.name}" with code: ${group.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pickleball invite", text });
      } catch (e) {}
    } else {
      copy();
    }
  };
  const leave = () => {
    if (
      window.confirm(
        `Leave "${group.name}"? You can rejoin anytime with the code ${group.code}. Group data stays intact for everyone else.`
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
            Invite Code
          </div>
          <div
            className="text-center py-1"
            style={{
              fontFamily: DISPLAY,
              fontSize: "34px",
              letterSpacing: "0.25em",
              color: C.navyDeep,
            }}
          >
            {group.code}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={copy}
              className="py-2.5 rounded-sm flex items-center justify-center gap-1.5 text-sm font-bold"
              style={{ background: "white", color: C.ink, border: `1px solid ${C.line}` }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={share}
              className="py-2.5 rounded-sm flex items-center justify-center gap-1.5 text-sm font-bold"
              style={{ background: C.ink, color: C.cream }}
            >
              Share
            </button>
          </div>
        </div>

        <p className="text-xs mb-5 px-1" style={{ color: C.muted, lineHeight: 1.5 }}>
          Anyone with this code can log games and delete anything in the group. Share it only with people
          you trust.
        </p>

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
function GamesView({ games, players, onRemove }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "(removed)";
  const today = todayISO();
  const todaysGames = games.filter((g) => g.date === today);

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
              <button
                onClick={() => onRemove(g.id)}
                className="w-7 h-7 rounded-sm flex items-center justify-center"
                style={{ color: C.muted }}
                aria-label="Delete game"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <TeamResult teamPlayers={g.team1.map((id) => ({ id, name: nameOf(id) }))} score={g.score1} won={t1Won} side="left" />
              <div
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: C.muted, fontFamily: DISPLAY }}
              >
                vs
              </div>
              <TeamResult teamPlayers={g.team2.map((id) => ({ id, name: nameOf(id) }))} score={g.score2} won={!t1Won} side="right" />
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

function TeamResult({ teamPlayers, score, won, side }) {
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
function PlayerProfileView({ playerId, players, games, stats, partnerships, onBack }) {
  const player = players.find((p) => p.id === playerId);
  const playerStats = stats.find((s) => s.id === playerId);

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
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 px-1 flex items-center gap-1.5"
                style={{ color: C.muted }}
              >
                <Handshake size={11} /> Partners
              </div>
              <div className="space-y-2">
                {teammateRecords.map((r) => (
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
            </div>
          )}

          {/* Head-to-head */}
          {opponentRecords.length > 0 && (
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 px-1 flex items-center gap-1.5"
                style={{ color: C.muted }}
              >
                <Swords size={11} /> Head-to-Head
              </div>
              <div className="space-y-2">
                {opponentRecords.map((r) => {
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
            </div>
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

function StatsView({ stats, partnerships, games, players }) {
  const [sortKey, setSortKey] = useState("winPct");
  const [minGames, setMinGames] = useState(0);

  const sorted = useMemo(() => {
    const active = stats.filter((s) => s.games >= minGames);
    return active.slice().sort(compareBySortKey(sortKey));
  }, [stats, sortKey, minGames]);

  const totalGames = games.length;
  const totalPoints = games.reduce((sum, g) => sum + g.score1 + g.score2, 0);
  const topPartnership = partnerships
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
      <EmptyCard
        icon={<BarChart3 size={24} color={C.coral} />}
        title="No stats yet"
        body="Log at least one game to populate the leaderboard, point differentials, and partnership records."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Games" value={totalGames} accent={C.navy} />
        <MetricCard label="Points" value={totalPoints} accent={C.coral} />
        <MetricCard label="Players" value={stats.filter((s) => s.games > 0).length} accent={C.navyDeep} />
      </div>

      <PointsWonBoard stats={stats} />

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
                    {sortKey === "winPct"
                      ? (s.winPct * 100).toFixed(0) + "%"
                      : sortKey === "pointsPct"
                      ? (s.pointsPct * 100).toFixed(1) + "%"
                      : sortKey === "ppg"
                      ? s.ppg.toFixed(1)
                      : s[sortKey]}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: C.muted }}>
                    {sortKey === "winPct"
                      ? "win rate"
                      : sortKey === "pointsPct"
                      ? "pts won"
                      : sortKey === "ppg"
                      ? "avg PF"
                      : sortKey}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DailyLeaderboard games={games} players={players} />

      <HotStreaksSection stats={stats} />

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

      {partnerships.length > 0 && (
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 px-1"
            style={{ color: C.muted }}
          >
            All Partnerships
          </div>
          <div className="space-y-2">
            {partnerships
              .slice()
              .sort((a, b) => b.games - a.games)
              .map((p) => (
                <div
                  key={`${p.a}|${p.b}`}
                  className="rounded-sm px-4 py-2.5 flex items-center justify-between"
                  style={{ background: "white", border: `1px solid ${C.line}` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">
                      <PlayerName id={p.a} name={p.aName} /> &{" "}
                      <PlayerName id={p.b} name={p.bName} />
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
                </div>
              ))}
          </div>
        </div>
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
function HotStreaksSection({ stats }) {
  const active = stats.filter((s) => s.games > 0);
  if (active.length === 0) return null;

  // Hot: players with an active win streak (currentStreak > 0), longest first
  const hot = active
    .filter((s) => s.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak);
  // Cold: active loss streaks (currentStreak < 0), longest first
  const cold = active
    .filter((s) => s.currentStreak < 0)
    .sort((a, b) => a.currentStreak - b.currentStreak); // more negative = longer

  const renderRow = (s) => {
    const isWin = s.currentStreak > 0;
    const n = Math.abs(s.currentStreak);
    const best = isWin ? s.bestWinStreak : s.bestLossStreak;
    return (
      <div
        key={s.id}
        className="px-4 py-2.5 flex items-center gap-3"
        style={{ borderTop: `1px solid ${C.line}` }}
      >
        <StreakBadge streak={s.currentStreak} />
        <div className="flex-1 min-w-0">
          <PlayerName
            id={s.id}
            name={s.name}
            className="font-bold text-[14px] leading-tight truncate block"
          />
          <div className="text-[11px]" style={{ color: C.muted }}>
            Best {isWin ? "win" : "loss"} streak: {best}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-lg leading-none"
            style={{ fontFamily: DISPLAY, color: isWin ? C.coral : C.muted }}
          >
            {n}
          </div>
          <div className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: C.muted }}>
            in a row
          </div>
        </div>
      </div>
    );
  };

  const renderBlock = (title, icon, iconColor, list, emptyMsg) => (
    <div
      className="rounded-sm overflow-hidden"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: C.cream }}
      >
        {icon}
        <span
          className="text-[11px] uppercase tracking-[0.22em] font-bold"
          style={{ color: iconColor, fontFamily: BODY }}
        >
          {title}
        </span>
      </div>
      {list.length === 0 ? (
        <div className="text-center py-5 text-xs" style={{ color: C.muted }}>
          {emptyMsg}
        </div>
      ) : (
        list.map(renderRow)
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold px-1" style={{ color: C.muted }}>
        Streaks
      </div>
      {renderBlock(
        "On Fire",
        <Flame size={14} color={C.coral} strokeWidth={2.4} />,
        C.coral,
        hot,
        "No active win streaks."
      )}
      {renderBlock(
        "Ice Cold",
        <Snowflake size={14} color={C.navy} strokeWidth={2.4} />,
        C.navy,
        cold,
        "No active losing streaks."
      )}
    </div>
  );
}

function PointsWonBoard({ stats }) {
  const active = stats.filter((s) => s.games > 0);
  if (active.length === 0) return null;
  // Sort by pointsPct descending. Ties broken by raw pointsFor so players
  // who've scored more total points edge out players with identical ratios.
  const sorted = active
    .slice()
    .sort((a, b) => b.pointsPct - a.pointsPct || b.pointsFor - a.pointsFor);
  // Bar scaling: leader's pct = 100% bar width; everyone else proportional.
  // This exaggerates the visual gap between players who are all above 50%,
  // which is the typical range for "points actually won out of possible."
  const topPct = sorted[0].pointsPct || 1;

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
        {sorted.map((s, idx) => {
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

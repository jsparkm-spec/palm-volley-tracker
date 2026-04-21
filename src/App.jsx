import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
} from "lucide-react";

// ---------- Brand tokens ----------
const C = {
  navy: "#1A4F72",
  navyDeep: "#0F3752",
  babyBlue: "#9DD1E8",
  babyBlueSoft: "#D9EDF6",
  coral: "#E8533E",
  coralDeep: "#C13E2A",
  cream: "#F8F5F0",
  ink: "#0A1F2E",
  muted: "#6C7A85",
  line: "#E4E0D8",
};

const DISPLAY = "'Bricolage Grotesque', 'Archivo Black', sans-serif";
const BODY = "'Plus Jakarta Sans', -apple-system, sans-serif";

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
function computeStats(players, games) {
  const byId = {};
  players.forEach((p) => {
    byId[p.id] = { id: p.id, name: p.name, games: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
  });
  games.forEach((g) => {
    const t1Won = g.score1 > g.score2;
    g.team1.forEach((pid) => {
      if (!byId[pid]) return;
      byId[pid].games += 1;
      byId[pid][t1Won ? "wins" : "losses"] += 1;
      byId[pid].pointsFor += g.score1;
      byId[pid].pointsAgainst += g.score2;
    });
    g.team2.forEach((pid) => {
      if (!byId[pid]) return;
      byId[pid].games += 1;
      byId[pid][!t1Won ? "wins" : "losses"] += 1;
      byId[pid].pointsFor += g.score2;
      byId[pid].pointsAgainst += g.score1;
    });
  });
  return Object.values(byId).map((s) => ({
    ...s,
    winPct: s.games > 0 ? s.wins / s.games : 0,
    diff: s.pointsFor - s.pointsAgainst,
    ppg: s.games > 0 ? s.pointsFor / s.games : 0,
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

// ---------- Root ----------
export default function App() {
  const [group, setGroup] = useState(null); // { id, name, code }
  const [bootstrapped, setBootstrapped] = useState(false);

  // On mount, try to restore a saved group and revalidate it
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
          // Network blip — keep the saved group so user isn't kicked out
          setGroup(saved);
        }
      }
      setBootstrapped(true);
    })();
  }, []);

  if (!bootstrapped) return <Splash message="Warming up the court…" />;

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
      onLeaveGroup={async () => {
        await clearGroupFromStorage();
        setGroup(null);
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
        <div className="inline-block animate-spin mb-3">
          <RefreshCw size={22} />
        </div>
        <div className="text-sm">{message}</div>
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
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: C.coral, boxShadow: "0 6px 18px -4px rgba(232,83,62,0.5)" }}
          >
            <Trophy size={22} strokeWidth={2.4} color={C.cream} />
          </div>
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.25em] font-semibold"
              style={{ color: C.babyBlue }}
            >
              Palm Volley
            </div>
            <div className="text-xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              Court Report
            </div>
          </div>
        </div>

        {newlyCreated ? (
          <CreatedGroupSuccess group={newlyCreated} onContinue={() => onReady(newlyCreated)} />
        ) : mode === null ? (
          <>
            <h1
              className="text-4xl leading-[1.05] mb-3"
              style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              Track games<br />with your crew.
            </h1>
            <p className="text-sm mb-8" style={{ color: "rgba(248,245,240,0.75)" }}>
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
      className="w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.99]"
      style={{
        background: primary ? C.coral : "rgba(255,255,255,0.06)",
        border: primary ? "none" : "1px solid rgba(255,255,255,0.12)",
        color: C.cream,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: primary ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px]" style={{ fontFamily: BODY }}>
          {title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: primary ? "rgba(255,255,255,0.85)" : "rgba(248,245,240,0.6)" }}>
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
        className="text-xs uppercase tracking-wider font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
        Name your group
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(248,245,240,0.7)" }}>
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
        className="w-full px-4 py-3.5 rounded-xl text-base font-semibold outline-none"
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
        className="w-full mt-6 py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.12em] disabled:opacity-40"
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
        className="text-xs uppercase tracking-wider font-bold mb-6 opacity-70"
      >
        ← Back
      </button>
      <h2 className="text-2xl mb-2" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
        Enter your code
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(248,245,240,0.7)" }}>
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
        className="w-full px-4 py-4 rounded-xl text-center outline-none"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: C.cream,
          fontFamily: DISPLAY,
          fontSize: "28px",
          fontWeight: 800,
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
        className="w-full mt-6 py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.12em] disabled:opacity-40"
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
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(255,255,255,0.12)" }}
      >
        <Sparkles size={24} color={C.babyBlue} />
      </div>
      <h2 className="text-3xl mb-2" style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: "-0.01em" }}>
        {group.name} is live.
      </h2>
      <p className="text-sm mb-7" style={{ color: "rgba(248,245,240,0.7)" }}>
        Share this code with anyone you want to add. They'll need it exactly once.
      </p>
      <div
        className="rounded-2xl p-5 mb-4"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2"
          style={{ color: C.babyBlue }}
        >
          Invite Code
        </div>
        <div
          className="text-center py-2"
          style={{
            fontFamily: DISPLAY,
            fontSize: "38px",
            fontWeight: 800,
            letterSpacing: "0.25em",
            color: C.cream,
          }}
        >
          {group.code}
        </div>
        <button
          onClick={copy}
          className="w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
          style={{
            background: copied ? C.babyBlue : "rgba(255,255,255,0.1)",
            color: copied ? C.navyDeep : C.cream,
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <button
        onClick={onContinue}
        className="w-full py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.12em]"
        style={{ background: C.coral, color: C.cream, fontFamily: DISPLAY }}
      >
        Enter the app →
      </button>
    </div>
  );
}

// ---------- Main App (scoped to group) ----------
function TrackerApp({ group, onLeaveGroup }) {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [view, setView] = useState("play");
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const [ps, gs] = await Promise.all([api.listPlayers(group.code), api.listGames(group.code)]);
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
  }, [group.code, flash]);

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
      const rows = await api.addPlayer(group.code, name);
      const row = rows?.[0];
      if (row) setPlayers((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      return true;
    } catch (err) {
      console.error(err);
      flash("Couldn't add player");
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
      await api.deletePlayer(group.code, id);
    } catch (err) {
      console.error(err);
      setPlayers(snapshot);
      flash("Couldn't remove player");
    }
  };

  const addGame = async (game) => {
    try {
      const rows = await api.addGame(group.code, game);
      const row = rows?.[0];
      if (row) setGames((prev) => [mapGame(row), ...prev]);
      flash("Game logged");
      setView("games");
    } catch (err) {
      console.error(err);
      flash("Couldn't save game");
    }
  };

  const removeGame = async (id) => {
    if (!window.confirm("Delete this game?")) return;
    const snapshot = games;
    setGames((prev) => prev.filter((g) => g.id !== id));
    try {
      await api.deleteGame(group.code, id);
    } catch (err) {
      console.error(err);
      setGames(snapshot);
      flash("Couldn't delete");
    }
  };

  const stats = useMemo(() => computeStats(players, games), [players, games]);
  const partnerships = useMemo(() => computePartnerships(players, games), [players, games]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: C.cream,
        fontFamily: BODY,
        color: C.ink,
        paddingBottom: "7.5rem",
        backgroundImage: `radial-gradient(${C.babyBlueSoft} 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
      }}
    >
      <Header
        group={group}
        online={online}
        syncing={syncing}
        onRefresh={refresh}
        onOpenSettings={() => setGroupModalOpen(true)}
      />

      <main className="max-w-xl mx-auto px-4 pt-5">
        {!loaded ? (
          <div className="text-center py-20 text-sm" style={{ color: C.muted }}>
            <div className="inline-block animate-spin mb-3">
              <RefreshCw size={20} />
            </div>
            <div>Loading {group.name}…</div>
          </div>
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

      <BottomNav view={view} setView={setView} />

      {toast && (
        <div
          className="fixed left-1/2 bottom-28 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50 whitespace-nowrap"
          style={{ background: C.ink, color: C.cream, fontFamily: BODY }}
        >
          {toast}
        </div>
      )}

      {groupModalOpen && (
        <GroupModal
          group={group}
          onClose={() => setGroupModalOpen(false)}
          onLeave={async () => {
            setGroupModalOpen(false);
            await onLeaveGroup();
          }}
        />
      )}
    </div>
  );
}

// ---------- Header ----------
function Header({ group, online, syncing, onRefresh, onOpenSettings }) {
  return (
    <header
      className="px-5 pt-8 pb-6"
      style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        color: C.cream,
        borderBottomLeftRadius: "28px",
        borderBottomRightRadius: "28px",
        boxShadow: "0 8px 24px -12px rgba(15,55,82,0.5)",
      }}
    >
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <button
          onClick={onOpenSettings}
          className="text-left flex-1 min-w-0 pr-3"
          aria-label="Group info"
        >
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-semibold flex items-center gap-1.5"
            style={{ color: C.babyBlue, fontFamily: BODY }}
          >
            <span className="truncate">{group.name}</span>
            {online ? (
              <Cloud size={11} color={C.babyBlue} />
            ) : (
              <CloudOff size={11} color={C.coral} />
            )}
          </div>
          <h1
            className="text-3xl leading-none mt-1.5 flex items-center gap-2"
            style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: "-0.02em" }}
          >
            Court Report
          </h1>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={syncing}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label="Refresh"
          >
            <RefreshCw size={16} color={C.cream} className={syncing ? "animate-spin" : ""} strokeWidth={2.2} />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: C.coral, boxShadow: "0 4px 12px rgba(232,83,62,0.4)" }}
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
function GroupModal({ group, onClose, onLeave }) {
  const [copied, setCopied] = useState(false);
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
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(10,31,46,0.6)" }}>
      <div
        className="w-full max-w-xl rounded-t-3xl p-5 pb-8"
        style={{ background: C.cream, boxShadow: "0 -12px 40px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
            Group
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.muted }}>
          Name
        </div>
        <div className="text-lg font-bold mb-4" style={{ fontFamily: DISPLAY }}>
          {group.name}
        </div>

        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: `linear-gradient(135deg, ${C.babyBlueSoft} 0%, ${C.cream} 100%)`,
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
              fontWeight: 800,
              letterSpacing: "0.25em",
              color: C.navyDeep,
            }}
          >
            {group.code}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={copy}
              className="py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold"
              style={{ background: "white", color: C.ink, border: `1px solid ${C.line}` }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={share}
              className="py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold"
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

        <button
          onClick={leave}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
          style={{ background: "transparent", color: C.coralDeep, border: `1px solid ${C.line}` }}
        >
          <LogOut size={14} /> Leave group
        </button>
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
        className="max-w-xl mx-auto mx-3 mb-3 rounded-2xl flex"
        style={{
          background: C.ink,
          color: C.cream,
          padding: "6px",
          boxShadow: "0 12px 32px -8px rgba(10,31,46,0.45)",
        }}
      >
        {items.map((item) => {
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all"
              style={{
                background: active ? C.coral : "transparent",
                color: active ? C.cream : "rgba(248,245,240,0.55)",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.6 : 2} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
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

  const allSelected = new Set([...team1, ...team2]);
  const availableFor = (which) =>
    players.filter((p) => {
      const inMine = which === "team1" ? team1.includes(p.id) : team2.includes(p.id);
      return !allSelected.has(p.id) || inMine;
    });

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
      <div className="p-1 rounded-2xl flex" style={{ background: "white", border: `1px solid ${C.line}` }}>
        {["doubles", "singles"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
            style={{
              background: mode === m ? C.navy : "transparent",
              color: mode === m ? C.cream : C.muted,
              fontFamily: BODY,
              letterSpacing: "0.1em",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <Card>
        <label
          className="text-[10px] uppercase tracking-[0.18em] font-bold flex items-center gap-1.5"
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
          className="px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.3em]"
          style={{
            background: C.coral,
            color: C.cream,
            fontFamily: DISPLAY,
            boxShadow: "0 4px 12px -4px rgba(232,83,62,0.4)",
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
          className="text-[10px] uppercase tracking-[0.18em] font-bold"
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
        className="w-full py-4 rounded-2xl text-base font-bold uppercase tracking-[0.15em] transition-all"
        style={{
          background: canSubmit ? C.ink : "#C8C4BC",
          color: C.cream,
          fontFamily: DISPLAY,
          letterSpacing: "0.12em",
          boxShadow: canSubmit ? "0 8px 20px -6px rgba(10,31,46,0.4)" : "none",
          opacity: canSubmit ? 1 : 0.7,
        }}
      >
        {saving ? "Saving…" : "Log This Game"}
      </button>

      {pickerFor && (
        <PlayerPicker
          title={pickerFor === "team1" ? "Add to Team 1" : "Add to Team 2"}
          players={availableFor(pickerFor)}
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
      className="rounded-2xl p-4"
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
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: C.cream, border: `1px solid ${C.line}` }}
                >
                  <span className="text-sm font-semibold truncate">{nameOf(id)}</span>
                  <button
                    onClick={() => onRemoveAt(i)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
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
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: `1.5px dashed ${C.line}`, color: C.muted, background: "transparent" }}
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
            className="w-full text-center text-3xl font-black py-2 rounded-xl outline-none"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(10,31,46,0.55)" }}>
      <div
        className="w-full max-w-xl rounded-t-3xl p-5 max-h-[75vh] overflow-y-auto"
        style={{ background: C.cream, boxShadow: "0 -12px 40px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ fontFamily: DISPLAY }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
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
                className="w-full text-left px-4 py-3.5 rounded-xl flex items-center justify-between"
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
        <label className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: C.muted }}>
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
            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold outline-none"
            style={{ background: C.cream, border: `1px solid ${C.line}`, fontFamily: BODY }}
          />
          <button
            onClick={submit}
            disabled={adding || !name.trim()}
            className="px-5 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50"
            style={{ background: C.coral, color: C.cream, fontFamily: BODY, letterSpacing: "0.1em" }}
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
                    className="rounded-2xl px-4 py-3 flex items-center justify-between"
                    style={{ background: "white", border: `1px solid ${C.line}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
                        style={{ background: C.babyBlueSoft, color: C.navy, fontFamily: DISPLAY }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-[15px] leading-tight">{p.name}</div>
                        <div className="text-xs" style={{ color: C.muted }}>
                          {s && s.games > 0
                            ? `${s.games} ${s.games === 1 ? "game" : "games"} · ${s.wins}W-${s.losses}L`
                            : "No games yet"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
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
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold px-1" style={{ color: C.muted }}>
        {games.length} {games.length === 1 ? "Game" : "Games"}
      </div>
      {games.map((g) => {
        const t1Won = g.score1 > g.score2;
        return (
          <div
            key={g.id}
            className="rounded-2xl overflow-hidden"
            style={{ background: "white", border: `1px solid ${C.line}` }}
          >
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ background: C.cream, borderBottom: `1px solid ${C.line}` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                  style={{ background: C.babyBlueSoft, color: C.navy }}
                >
                  {g.mode}
                </span>
                <span className="text-xs font-semibold" style={{ color: C.muted }}>
                  {fmtDate(g.date)}
                </span>
              </div>
              <button
                onClick={() => onRemove(g.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: C.muted }}
                aria-label="Delete game"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <TeamResult names={g.team1.map(nameOf)} score={g.score1} won={t1Won} side="left" />
              <div
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: C.muted, fontFamily: DISPLAY }}
              >
                vs
              </div>
              <TeamResult names={g.team2.map(nameOf)} score={g.score2} won={!t1Won} side="right" />
            </div>
            {g.note && (
              <div
                className="px-4 pb-3 text-xs italic"
                style={{ color: C.muted, borderTop: `1px dashed ${C.line}`, paddingTop: "8px" }}
              >
                “{g.note}”
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamResult({ names, score, won, side }) {
  return (
    <div style={{ textAlign: side === "left" ? "left" : "right" }}>
      <div
        className="text-[10px] uppercase tracking-wider font-bold mb-1"
        style={{ color: won ? C.coral : C.muted }}
      >
        {won ? "Winner" : ""}
      </div>
      <div className="text-sm font-bold leading-tight">
        {names.map((n, i) => (
          <div key={i} className="truncate">
            {n}
          </div>
        ))}
      </div>
      <div
        className="text-4xl mt-1"
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          color: won ? C.navy : C.muted,
          letterSpacing: "-0.02em",
        }}
      >
        {score}
      </div>
    </div>
  );
}

// ---------- Stats View ----------
function StatsView({ stats, partnerships, games, players }) {
  const [sortKey, setSortKey] = useState("winPct");
  const [minGames, setMinGames] = useState(0);

  const sorted = useMemo(() => {
    const active = stats.filter((s) => s.games >= minGames);
    return active.slice().sort((a, b) => {
      if (sortKey === "winPct") {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      }
      return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
    });
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

      <PointDifferentialBoard stats={stats} />

      <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: `1px solid ${C.line}` }}>
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: C.navy, color: C.cream }}
        >
          <div className="flex items-center gap-2">
            <Trophy size={14} color={C.babyBlue} />
            <span
              className="text-[11px] uppercase tracking-[0.2em] font-bold"
              style={{ fontFamily: BODY }}
            >
              Leaderboard
            </span>
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md outline-none"
            style={{ background: C.navyDeep, color: C.cream, border: `1px solid rgba(255,255,255,0.1)` }}
          >
            <option value="winPct">Win %</option>
            <option value="wins">Wins</option>
            <option value="games">Games</option>
            <option value="diff">Point Diff</option>
            <option value="ppg">Avg PF</option>
          </select>
        </div>

        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: C.muted }}>
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
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                  style={{
                    background: idx === 0 ? C.coral : C.cream,
                    color: idx === 0 ? C.cream : C.muted,
                    fontFamily: DISPLAY,
                  }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14px] leading-tight truncate">{s.name}</div>
                  <div className="text-[11px]" style={{ color: C.muted }}>
                    {s.games}G · {s.wins}-{s.losses} · {s.diff >= 0 ? "+" : ""}
                    {s.diff} diff
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-lg leading-none"
                    style={{ fontFamily: DISPLAY, fontWeight: 800, color: C.navy }}
                  >
                    {sortKey === "winPct"
                      ? (s.winPct * 100).toFixed(0) + "%"
                      : sortKey === "ppg"
                      ? s.ppg.toFixed(1)
                      : s[sortKey]}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color: C.muted }}>
                    {sortKey === "winPct" ? "win rate" : sortKey === "ppg" ? "avg PF" : sortKey}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {topPartnership && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: `linear-gradient(135deg, ${C.babyBlueSoft} 0%, ${C.cream} 100%)`,
            border: `1px solid ${C.line}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Handshake size={14} color={C.navy} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: C.navy }}>
              Top Duo
            </span>
          </div>
          <div className="text-lg leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 700 }}>
            {topPartnership.aName} & {topPartnership.bName}
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
                  className="rounded-xl px-4 py-2.5 flex items-center justify-between"
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
                    <div className="font-black text-sm" style={{ color: C.navy, fontFamily: DISPLAY }}>
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

      <div className="rounded-2xl p-4" style={{ background: "white", border: `1px solid ${C.line}` }}>
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

function PointDifferentialBoard({ stats }) {
  const active = stats.filter((s) => s.games > 0);
  if (active.length === 0) return null;
  const sorted = active.slice().sort((a, b) => b.diff - a.diff);
  const maxAbs = Math.max(...active.map((s) => Math.abs(s.diff)), 1);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${C.line}`,
        boxShadow: "0 6px 20px -10px rgba(232,83,62,0.3)",
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
            Point Differential
          </div>
          <div className="text-[10px] opacity-85" style={{ fontFamily: BODY }}>
            Cumulative +/− across all games
          </div>
        </div>
      </div>
      <div>
        {sorted.map((s, idx) => {
          const pct = (Math.abs(s.diff) / maxAbs) * 100;
          const positive = s.diff >= 0;
          const isTop = idx === 0 && positive;
          return (
            <div
              key={s.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
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
                  <div className="font-bold text-[14px] leading-tight truncate">{s.name}</div>
                  <div className="text-[10px] ml-2 shrink-0" style={{ color: C.muted }}>
                    {s.games}G · {s.wins}-{s.losses}
                  </div>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: C.cream, border: `1px solid ${C.line}` }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: positive
                        ? `linear-gradient(90deg, ${C.coral} 0%, ${C.coralDeep} 100%)`
                        : C.muted,
                      opacity: positive ? 1 : 0.45,
                    }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0 w-[62px]">
                <div
                  className="text-2xl leading-none"
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 800,
                    color: positive ? C.navy : C.muted,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {positive ? "+" : ""}
                  {s.diff}
                </div>
                <div
                  className="text-[9px] uppercase tracking-wider font-bold mt-0.5"
                  style={{ color: C.muted }}
                >
                  net pts
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div
      className="rounded-2xl p-3 text-center"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      <div
        className="text-2xl leading-none"
        style={{ fontFamily: DISPLAY, fontWeight: 800, color: accent }}
      >
        {value}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider font-bold mt-1"
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
      className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
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
      className="rounded-2xl p-4"
      style={{ background: "white", border: `1px solid ${C.line}` }}
    >
      {children}
    </div>
  );
}

function EmptyCard({ icon, title, body, cta, onCta }) {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: "white", border: `1px dashed ${C.line}` }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: C.babyBlueSoft }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-1" style={{ fontFamily: DISPLAY }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: C.muted }}>
        {body}
      </p>
      {cta && (
        <button
          onClick={onCta}
          className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: C.coral, color: C.cream, fontFamily: BODY }}
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

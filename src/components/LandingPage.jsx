// src/components/LandingPage.jsx
//
// Marketing landing shown to logged-out visitors at the tracker root (no invite
// code in the URL). CTAs open the AuthGate in either "login" or "signup" mode.
//
// Design intent: navy-dominant Palm Volley aesthetic — Russo One display,
// uppercase tracking, coral primary action, sky accents, generous spacing.
// Mobile-first; sections collapse cleanly down to ~360px.

import { useEffect, useRef, useState } from "react";
import {
  Trophy,
  Zap,
  Flame,
  Handshake,
  Users,
  Smartphone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import Logomark from "./Logomark";

// Palette — must match tracker's main brand tokens (C in App.jsx + AuthGate)
const C = {
  navy: "#0a456a",
  navyDeep: "#0d2f45",
  blue: "#1a7ab5",
  sky: "#60c0e2",
  babyBlue: "#a8d8ea",
  ice: "#e8f4f8",
  coral: "#ea4e33",
  coralDeep: "#c13e2a",
  cream: "#f6f9fb",
  ink: "#0d2f45",
  muted: "#5a6b78",
  line: "#e8f4f8",
};
const DISPLAY = "'Russo One', 'Archivo Black', sans-serif";
const BODY = "'Lato', -apple-system, sans-serif";

/**
 * Reveal — fades + lifts its children into view the first time they cross
 * into the viewport. A dawgpark-style scroll reveal, kept tasteful: a short
 * 18px rise over 0.7s with a gentle ease, optional stagger via `delay`.
 *
 * Honors prefers-reduced-motion: motion-sensitive visitors get the content
 * rendered visible immediately, with no observer and no transition. Content
 * is never hidden behind JS for them (or if IntersectionObserver is missing).
 */
function Reveal({ children, delay = 0, as: Tag = "div", className, style }) {
  const ref = useRef(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(reduced);

  useEffect(() => {
    if (reduced || shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, shown]);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        ...(reduced
          ? null
          : {
              opacity: shown ? 1 : 0,
              transform: shown ? "translateY(0)" : "translateY(18px)",
              transition: `opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)`,
              transitionDelay: `${delay}ms`,
              willChange: "opacity, transform",
            }),
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Thin double-line section divider — two coral hairlines with cream gap.
 * Stitches sections together without being a hard cream→navy cliff.
 */
function SectionDivider({ background = C.cream }) {
  return (
    <div style={{ background, padding: "0 0" }}>
      <div
        className="mx-auto"
        style={{
          maxWidth: 64,
          height: 1,
          background: C.coral,
          opacity: 0.65,
        }}
      />
      <div style={{ height: 4 }} />
      <div
        className="mx-auto"
        style={{
          maxWidth: 32,
          height: 1,
          background: C.coral,
          opacity: 0.45,
        }}
      />
    </div>
  );
}

/**
 * Pickleball court outline used as a faint background pattern. Drawn with
 * an SVG so it stays sharp at any size. Real proportions (20'×44') for
 * subliminal authenticity.
 */
function CourtMotif({ color = "rgba(246,249,251,0.07)", strokeWidth = 1.2 }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 100"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {/* Outer court */}
      <rect
        x="10"
        y="10"
        width="200"
        height="80"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Net (center line, vertical) */}
      <line
        x1="110"
        y1="6"
        x2="110"
        y2="94"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="3 3"
      />
      {/* Kitchen / non-volley zones — 7' from net on each side */}
      <line
        x1="78"
        y1="10"
        x2="78"
        y2="90"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1="142"
        y1="10"
        x2="142"
        y2="90"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Service lines on each side */}
      <line
        x1="10"
        y1="50"
        x2="78"
        y2="50"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1="142"
        y1="50"
        x2="210"
        y2="50"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Net posts */}
      <circle cx="110" cy="6" r="1.5" fill={color} />
      <circle cx="110" cy="94" r="1.5" fill={color} />
    </svg>
  );
}

/**
 * HeroPickleTexture — decorative background texture for the hero section.
 *
 * Two layers:
 *   1. A finely-spaced perforation dot grid covering the whole hero — meant
 *      to evoke the wiffle-ball holes pattern of a real pickleball. Very low
 *      opacity so it reads as texture, not pattern noise.
 *   2. Three abstract "pickleball" silhouettes (circle outline + a ring of
 *      hole-dots) at the edges. Different sizes, different sky/coral tints,
 *      asymmetrically placed for movement.
 *
 * All pure SVG — sharp at any size, no image asset.
 */
function HeroPickleTexture() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0, overflow: "hidden" }}
    >
      {/* Layer 1: perforation dot grid */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="pickle-perf"
            x="0"
            y="0"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(8)"
          >
            <circle cx="6" cy="6" r="1.1" fill="rgba(246,249,251,0.10)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pickle-perf)" />
      </svg>

      {/* Layer 2: floating abstract pickleballs */}
      <PickleBall
        size={260}
        top="-60px"
        right="-40px"
        opacity={0.10}
        color="rgba(96,192,226,1)"
      />
      <PickleBall
        size={180}
        bottom="-50px"
        left="-30px"
        opacity={0.08}
        color="rgba(234,78,51,1)"
      />
      <PickleBall
        size={120}
        top="55%"
        left="42%"
        opacity={0.06}
        color="rgba(246,249,251,1)"
      />
    </div>
  );
}

/**
 * A single abstract pickleball — outer ring + a ring of small dots inside
 * representing the perforation holes. Positioned absolutely; pass `top`,
 * `bottom`, `left`, or `right` to place it.
 */
function PickleBall({
  size = 200,
  top,
  bottom,
  left,
  right,
  opacity = 0.1,
  color = "rgba(255,255,255,1)",
}) {
  // Distribute hole-dots evenly around an inner ring
  const HOLES = 12;
  const holeRadius = size * 0.045;
  const ringRadius = size * 0.38;
  const dots = Array.from({ length: HOLES }, (_, i) => {
    const angle = (i / HOLES) * Math.PI * 2;
    const cx = size / 2 + Math.cos(angle) * ringRadius;
    const cy = size / 2 + Math.sin(angle) * ringRadius;
    return <circle key={i} cx={cx} cy={cy} r={holeRadius} fill={color} />;
  });
  return (
    <div
      style={{
        position: "absolute",
        top,
        bottom,
        left,
        right,
        width: size,
        height: size,
        opacity,
        filter: "blur(0.4px)",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block" }}
      >
        {/* Outer ball ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(1, size * 0.012)}
        />
        {/* A smaller inner ring of holes (the visible perforations) */}
        {dots}
        {/* A center hole for depth */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={holeRadius * 0.9}
          fill={color}
        />
      </svg>
    </div>
  );
}

export default function LandingPage({ onSignIn, onSignUp }) {
  // Lock body scroll-restoration to top on first paint
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: C.cream, color: C.ink, fontFamily: BODY }}>
      {/* Keyframe animations for hero accents (delta pulse, streak shimmer,
          floating pills, and ambient ball drift). All animations honor
          prefers-reduced-motion — users who set that flag (motion-sensitive,
          vestibular conditions) get a static page. */}
      <style>{`
        @keyframes cr-delta-pulse {
          0%, 100% { transform: translateY(0); opacity: 0.95; }
          50% { transform: translateY(-1px); opacity: 1; }
        }
        @keyframes cr-streak-shimmer {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234,78,51,0.0); }
          50% { box-shadow: 0 0 0 4px rgba(234,78,51,0.18); }
        }
        @keyframes cr-pill-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        /* Ambient drift for the floating pickleball silhouettes — each ball
           uses a different keyframe path + speed so they never sync. Inspired
           by dawgpark.app's drifting blob motion. */
        @keyframes cr-ball-drift-1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(14px, -10px); }
          66% { transform: translate(-8px, 12px); }
        }
        @keyframes cr-ball-drift-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-14px, -16px); }
        }
        @keyframes cr-ball-drift-3 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-12px, 8px); }
          75% { transform: translate(10px, -6px); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .cr-delta-anim { animation: cr-delta-pulse 2.4s ease-in-out infinite; display: inline-block; }
          .cr-streak-anim { animation: cr-streak-shimmer 2.8s ease-in-out infinite; }
          .cr-pill-anim-1 { animation: cr-pill-float 3.6s ease-in-out infinite; }
          .cr-pill-anim-2 { animation: cr-pill-float 3.6s ease-in-out infinite 1.2s; }
          .cr-pill-anim-3 { animation: cr-pill-float 3.6s ease-in-out infinite 2.4s; }
          .cr-ball-drift-1 { animation: cr-ball-drift-1 18s ease-in-out infinite; }
          .cr-ball-drift-2 { animation: cr-ball-drift-2 22s ease-in-out infinite; }
          .cr-ball-drift-3 { animation: cr-ball-drift-3 16s ease-in-out infinite; }
        }
        /* Spring hover lift on cards — dawgpark's signature bouncy ease
           (cubic-bezier(0.34,1.56,0.64,1)) on transform, with the shadow
           blooming on a slower curve so it feels like the card floats up.
           Lift is gated by prefers-reduced-motion; the shadow transition is
           harmless for reduced-motion users so it stays. */
        .cr-card-lift {
          transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @media (prefers-reduced-motion: no-preference) {
          .cr-card-lift:hover {
            transform: translateY(-6px);
            box-shadow: 0 22px 40px -18px rgba(13,47,69,0.30);
            border-color: rgba(96,192,226,0.55);
          }
        }
        /* Glassmorphism for the floating hero pills — translucent fill +
           backdrop blur so the navy hero shows through, dawgpark-style. */
        .cr-glass-light {
          background: rgba(246,249,251,0.72) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(246,249,251,0.55);
        }
        .cr-glass-coral {
          background: rgba(234,78,51,0.82) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(234,78,51,0.55);
        }
        /* Italic emphasis on key headline words. Synthesizes italic since
           Russo One has no native italic — browser slants the glyphs ~10°,
           which is exactly the "spoken emphasis" feel we want. */
        .cr-em-italic { font-style: italic; display: inline-block; }
      `}</style>

      {/* ───────────────── Top bar ───────────────── */}
      <header
        style={{
          background: C.navyDeep,
          paddingTop: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logomark variant="light" className="w-9 h-9 shrink-0" />
            <div>
              <div
                className="text-[10px] uppercase font-bold leading-none"
                style={{ color: C.sky, letterSpacing: "0.28em" }}
              >
                Palm Volley Pickle
              </div>
              <div
                className="text-lg leading-none mt-1 uppercase"
                style={{
                  fontFamily: DISPLAY,
                  letterSpacing: "0.02em",
                  color: C.cream,
                }}
              >
                Court Report
              </div>
            </div>
          </div>
          <button
            onClick={onSignIn}
            className="text-xs uppercase font-bold px-4 py-3 transition-colors hover:opacity-80"
            style={{
              fontFamily: DISPLAY,
              letterSpacing: "0.18em",
              color: C.cream,
              background: "transparent",
              border: `1px solid rgba(246,249,251,0.35)`,
              borderRadius: 2,
            }}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ───────────────── Hero ───────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 60%, ${C.ink} 100%)`,
          color: C.cream,
          paddingTop: "4rem",
          paddingBottom: "5rem",
        }}
      >
        {/* Pickleball-inspired background texture: a fine perforation grid
            (the wiffle-ball holes) plus a few faint abstract ball silhouettes
            floating at the edges. Decorative only. */}
        <HeroPickleTexture />

        <div className="relative max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold mb-5"
                style={{
                  background: "rgba(96,192,226,0.18)",
                  color: C.sky,
                  letterSpacing: "0.22em",
                  borderRadius: 2,
                }}
              >
                <Sparkles size={11} /> Free for friend groups
              </span>
              <h1
                className="uppercase leading-[0.95] mb-5"
                style={{
                  fontFamily: DISPLAY,
                  fontSize: "clamp(2.5rem, 6.5vw, 4.5rem)",
                  letterSpacing: "0.01em",
                }}
              >
                Settle who's
                <br />
                actually
                <br />
                <span className="cr-em-italic" style={{ color: C.coral }}>the best.</span>
              </h1>
              <p
                className="text-lg md:text-xl leading-relaxed mb-8"
                style={{ color: "rgba(246,249,251,0.85)", maxWidth: 480 }}
              >
                Court Report is the no-fuss pickleball stat tracker for friend
                groups. Log games on the court, watch your{" "}
                <strong style={{ color: C.sky }}>Spark Rating</strong> climb,
                and end the "I'm pretty sure I'm winning" debates for good.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onSignUp}
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 uppercase transition-all active:scale-[0.99] hover:opacity-95"
                  style={{
                    background: C.coral,
                    color: C.cream,
                    fontFamily: DISPLAY,
                    fontSize: 15,
                    letterSpacing: "0.18em",
                    borderRadius: 2,
                    boxShadow: "0 10px 26px -6px rgba(234,78,51,0.45)",
                  }}
                >
                  Start Tracking <ArrowRight size={15} />
                </button>
                <a
                  href="#showcase"
                  className="inline-flex items-center justify-center px-7 py-4 uppercase transition-all active:scale-[0.99]"
                  style={{
                    background: "transparent",
                    color: C.cream,
                    fontFamily: DISPLAY,
                    fontSize: 15,
                    letterSpacing: "0.18em",
                    border: "1px solid rgba(246,249,251,0.35)",
                    borderRadius: 2,
                    textDecoration: "none",
                  }}
                >
                  See the receipts ↓
                </a>
              </div>
              <p
                className="text-xs mt-5"
                style={{ color: "rgba(246,249,251,0.55)" }}
              >
                No credit card. No ads. Works on every phone.
              </p>
            </div>

            {/* Right — Phone mockup (tilted, glowing) flanked by floating
                feature pills. The pills bob gently on a staggered loop so the
                hero feels alive without being noisy.

                aria-hidden because the screen content (J. Sparkman, 1,612 ⚡,
                etc.) is purely decorative, not real data — exposing it to a
                screen reader would mislead. The real product story is in the
                headline and CTAs to the left of this. */}
            <div
              aria-hidden="true"
              className="flex justify-center md:justify-end md:pl-4"
            >
              <div className="relative inline-block">
                {/* Floating pill 1 — top-left, "live ratings" */}
                <div
                  className="cr-pill-anim-1 cr-glass-light hidden sm:flex items-center gap-2 px-3 py-2 absolute"
                  style={{
                    background: C.cream,
                    color: C.ink,
                    fontFamily: BODY,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    borderRadius: 2,
                    boxShadow: "0 14px 30px -10px rgba(0,0,0,0.45)",
                    top: 38,
                    left: -36,
                    zIndex: 5,
                  }}
                >
                  <Zap size={14} style={{ color: C.coral }} />
                  <span>Live Ratings</span>
                </div>

                {/* Floating pill 2 — right side, "+18 rating" */}
                <div
                  className="cr-pill-anim-2 cr-glass-coral hidden sm:flex items-center gap-2 px-3 py-2 absolute"
                  style={{
                    background: C.coral,
                    color: C.cream,
                    fontFamily: DISPLAY,
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    borderRadius: 2,
                    boxShadow: "0 14px 30px -10px rgba(234,78,51,0.55)",
                    top: 200,
                    right: -38,
                    zIndex: 5,
                  }}
                >
                  +18 ⚡
                </div>

                {/* Floating pill 3 — bottom-left, "streak alive" */}
                <div
                  className="cr-pill-anim-3 cr-glass-light hidden sm:flex items-center gap-2 px-3 py-2 absolute"
                  style={{
                    background: C.cream,
                    color: C.ink,
                    fontFamily: BODY,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    borderRadius: 2,
                    boxShadow: "0 14px 30px -10px rgba(0,0,0,0.45)",
                    bottom: 60,
                    left: -28,
                    zIndex: 5,
                  }}
                >
                  <Flame size={14} style={{ color: C.coral }} />
                  <span>Streak Alive</span>
                </div>

                <PhoneMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section transition: cream wedge above the features grid */}
      <div style={{ background: C.cream, paddingTop: "1.5rem" }}>
        <SectionDivider background={C.cream} />
      </div>

      {/* ───────────────── Features grid ───────────────── */}
      <section style={{ background: C.cream, padding: "3.5rem 0 5rem" }}>
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="text-center mb-12">
            <div
              className="text-[10px] uppercase font-bold mb-3"
              style={{ color: C.coral, letterSpacing: "0.28em" }}
            >
              What you get
            </div>
            <h2
              className="uppercase leading-tight"
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                letterSpacing: "0.01em",
                color: C.ink,
              }}
            >
              Everything you need.
              <br />
              <span className="cr-em-italic" style={{ color: C.navy }}>Nothing you don't.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Zap size={22} />,
                title: "Spark Rating",
                copy: "A branded ELO that updates after every game. Separate ratings for singles and doubles, so the doubles specialist gets her due.",
                color: C.sky,
              },
              {
                icon: <Flame size={22} />,
                title: "Win & loss streaks",
                copy: "W3, W7, W12. The streak counter that everyone watches. Current streak and all-time best, never lose count again.",
                color: C.coral,
              },
              {
                icon: <Trophy size={22} />,
                title: "Leaderboards",
                copy: "Sort by rating, win percentage, or point differential. See who's hot, who's cooling off, and who's been quietly dominating.",
                color: C.coral,
              },
              {
                icon: <Handshake size={22} />,
                title: "Partnerships",
                copy: "Doubles math made obvious. Find out who you actually win with — and who's been costing you matches.",
                color: C.sky,
              },
              {
                icon: <Users size={22} />,
                title: "Multiple groups",
                copy: "Friday-night crew, Sunday round-robin, the office league — keep them separate. Each group has its own roster, history, and leaderboard.",
                color: C.navy,
              },
              {
                icon: <Smartphone size={22} />,
                title: "Made for the court",
                copy: "Log a game in 15 seconds between points. Works on every phone — add it to your Home Screen and it opens like a real app. No ads, no nag screens.",
                color: C.navy,
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90} className="h-full">
                <Feature {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── How it works ───────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: C.navy,
          color: C.cream,
          padding: "5rem 0",
        }}
      >
        {/* Faint pickleball-court motif in the background. Sits behind all
            content; opacity is low enough to be ambient. */}
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0.45 }}
        >
          <div style={{ width: "min(900px, 92%)", height: "78%" }}>
            <CourtMotif color="rgba(96,192,226,0.18)" strokeWidth={0.8} />
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto px-5">
          <Reveal className="text-center mb-12">
            <div
              className="text-[10px] uppercase font-bold mb-3"
              style={{ color: C.sky, letterSpacing: "0.28em" }}
            >
              How it works
            </div>
            <h2
              className="uppercase leading-tight"
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                letterSpacing: "0.01em",
              }}
            >
              Three steps. <span className="cr-em-italic" style={{ color: C.coral }}>One minute.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                title: "Create your group",
                copy: "Name it, set the roster, and grab an invite code. Your crew, your court, your rules.",
              },
              {
                n: "02",
                title: "Invite the regulars",
                copy: "Send the invite link. Friends join with one tap — no email confirmation required. The roster builds itself.",
              },
              {
                n: "03",
                title: "Log games as you play",
                copy: "Tap in scores between sets. Stats, streaks, and Spark Ratings update instantly. Everyone sees the same numbers.",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 110} className="h-full">
                <Step {...s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── Why we built this (signature) ───────────────── */}
      <section style={{ background: C.cream, padding: "4.5rem 0" }}>
        <Reveal className="max-w-3xl mx-auto px-5 text-center">
          <div
            className="text-[10px] uppercase font-bold mb-4"
            style={{ color: C.coral, letterSpacing: "0.28em" }}
          >
            Why we built this
          </div>
          <blockquote
            className="leading-snug"
            style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(1.35rem, 2.6vw, 1.85rem)",
              color: C.ink,
              letterSpacing: "0.005em",
              lineHeight: 1.25,
            }}
          >
            <span style={{ color: C.muted }}>“</span>We got tired of
            arguing about who was actually winning. So we{" "}
            <span className="cr-em-italic" style={{ color: C.coral }}>built the receipts.</span>
            <span style={{ color: C.muted }}>”</span>
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: C.navy,
                color: C.cream,
                fontFamily: DISPLAY,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
              }}
            >
              JS
            </div>
            <div className="text-left">
              <div
                className="text-xs uppercase font-bold"
                style={{
                  color: C.ink,
                  letterSpacing: "0.18em",
                  fontFamily: DISPLAY,
                }}
              >
                James Sparkman
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{ color: C.muted, letterSpacing: "0.04em" }}
              >
                Founder · Palm Volley Pickle
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────────────── Showcase: stat row mockup ───────────────── */}
      <section id="showcase" style={{ background: C.cream, padding: "5rem 0", scrollMarginTop: "2rem" }}>
        <div className="max-w-5xl mx-auto px-5">
          <Reveal className="text-center mb-10">
            <div
              className="text-[10px] uppercase font-bold mb-3"
              style={{ color: C.coral, letterSpacing: "0.28em" }}
            >
              The receipts
            </div>
            <h2
              className="uppercase leading-tight"
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                letterSpacing: "0.01em",
                color: C.ink,
              }}
            >
              Your stats, <span className="cr-em-italic" style={{ color: C.navy }}>not vibes.</span>
            </h2>
            <p
              className="text-base mt-4 max-w-2xl mx-auto"
              style={{ color: C.muted }}
            >
              Every game gets logged. Every win and loss gets counted. The
              numbers speak for themselves.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <StatShowcase />
          </Reveal>
        </div>
      </section>

      {/* ───────────────── Works with WHOOP ───────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: C.navyDeep, color: C.cream, padding: "5rem 0" }}
      >
        <div className="relative max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Copy */}
            <Reveal>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[10px] uppercase font-bold"
                  style={{ color: C.sky, letterSpacing: "0.28em", fontFamily: BODY }}
                >
                  Powered by
                </span>
                {/* Official WHOOP wordmark — white version for dark backgrounds,
                    unaltered, 120px wide (WHOOP minimum is 100px), with their
                    2x exclusion zone kept clear around it. */}
                <img
                  src="/whoop-wordmark-white.svg"
                  alt="WHOOP"
                  width={120}
                  height={19}
                  style={{ display: "block" }}
                />
              </div>
              <h2
                className="uppercase leading-tight mb-4"
                style={{
                  fontFamily: DISPLAY,
                  fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                }}
              >
                Your body keeps score{" "}
                <span className="cr-em-italic" style={{ color: C.coral }}>too.</span>
              </h2>
              <p
                className="text-base leading-relaxed mb-4"
                style={{ color: "rgba(246,249,251,0.85)", maxWidth: 460 }}
              >
                Connect your WHOOP and every Health-Tracked Game comes back
                with the numbers your paddle can&apos;t see — strain, average
                and peak heart rate, and calories burned, matched to the exact
                window you played.
              </p>
              <p
                className="text-base leading-relaxed mb-6"
                style={{ color: "rgba(246,249,251,0.85)", maxWidth: 460 }}
              >
                Then the fun part: your win rate on green-recovery days vs the
                days you probably should have stayed home. Recovery vs
                results, side by side.
              </p>
              <button
                onClick={onSignUp}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 uppercase transition-all active:scale-[0.99] hover:opacity-95"
                style={{
                  background: C.coral,
                  color: C.cream,
                  fontFamily: DISPLAY,
                  fontSize: 13,
                  letterSpacing: "0.18em",
                  borderRadius: 2,
                  boxShadow: "0 10px 26px -6px rgba(234,78,51,0.45)",
                }}
              >
                Track Your First Game <ArrowRight size={14} />
              </button>
            </Reveal>

            {/* Visual: health-tracked game stat chips (illustrative) */}
            <Reveal delay={120}>
              <div aria-hidden="true">
                <div
                  className="p-5"
                  style={{
                    background: "rgba(246,249,251,0.05)",
                    border: "1px solid rgba(246,249,251,0.14)",
                    borderRadius: 2,
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-[10px] uppercase font-bold"
                      style={{ color: C.sky, letterSpacing: "0.22em", fontFamily: BODY }}
                    >
                      Health-Tracked Game · Tue
                    </span>
                    <span
                      className="px-1.5 py-0.5 text-[9px] uppercase font-bold"
                      style={{
                        background: "rgba(26,122,181,0.25)",
                        color: C.babyBlue,
                        letterSpacing: "0.18em",
                        borderRadius: 2,
                        fontFamily: BODY,
                      }}
                    >
                      W 11–7
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Day Strain", value: "12.4" },
                      { label: "Avg HR", value: "142 bpm" },
                      { label: "Peak HR", value: "171 bpm" },
                      { label: "Calories", value: "384" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="px-3 py-2.5"
                        style={{
                          background: "rgba(246,249,251,0.06)",
                          border: "1px solid rgba(246,249,251,0.10)",
                          borderRadius: 2,
                        }}
                      >
                        <div
                          className="text-[9px] uppercase font-bold mb-1"
                          style={{ color: "rgba(246,249,251,0.55)", letterSpacing: "0.2em", fontFamily: BODY }}
                        >
                          {stat.label}
                        </div>
                        <div
                          className="uppercase"
                          style={{ fontFamily: DISPLAY, fontSize: 20, lineHeight: 1 }}
                        >
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="mt-3 px-3 py-2.5 flex items-center justify-between"
                    style={{
                      background: "rgba(22,163,74,0.12)",
                      border: "1px solid rgba(22,163,74,0.3)",
                      borderRadius: 2,
                    }}
                  >
                    <span
                      className="text-[9px] uppercase font-bold"
                      style={{ color: "rgba(246,249,251,0.75)", letterSpacing: "0.2em", fontFamily: BODY }}
                    >
                      Morning Recovery
                    </span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 18, color: "#4ade80" }}>
                      82%
                    </span>
                  </div>
                </div>
                <div
                  className="text-[9px] uppercase font-bold mt-3"
                  style={{
                    color: "rgba(246,249,251,0.5)",
                    letterSpacing: "0.2em",
                    fontFamily: BODY,
                  }}
                >
                  Data by WHOOP
                </div>
                <p
                  className="text-[10px] mt-2 leading-relaxed"
                  style={{ color: "rgba(246,249,251,0.4)", fontFamily: BODY }}
                >
                  WHOOP is a registered trademark of WHOOP, Inc. Court Report is
                  an independent product and is not affiliated with or endorsed
                  by WHOOP.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────────── Final CTA ───────────────── */}
      <section
        style={{
          background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
          color: C.cream,
          padding: "5rem 0",
        }}
      >
        <Reveal className="max-w-3xl mx-auto px-5 text-center">
          <h2
            className="uppercase leading-tight mb-4"
            style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              letterSpacing: "0.01em",
            }}
          >
            Stop arguing.
            <br />
            <span className="cr-em-italic" style={{ color: C.coral }}>Start tracking.</span>
          </h2>
          <p
            className="text-lg mb-8"
            style={{ color: "rgba(246,249,251,0.8)" }}
          >
            Free for friend groups. Sign up in 30 seconds. Your first game
            tonight.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onSignUp}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 uppercase transition-all active:scale-[0.99] hover:opacity-95"
              style={{
                background: C.coral,
                color: C.cream,
                fontFamily: DISPLAY,
                fontSize: 16,
                letterSpacing: "0.18em",
                borderRadius: 2,
                boxShadow: "0 10px 26px -6px rgba(234,78,51,0.45)",
              }}
            >
              Create Account <ArrowRight size={16} />
            </button>
            <button
              onClick={onSignIn}
              className="inline-flex items-center justify-center px-8 py-4 uppercase transition-all active:scale-[0.99]"
              style={{
                background: "transparent",
                color: C.cream,
                fontFamily: DISPLAY,
                fontSize: 16,
                letterSpacing: "0.18em",
                border: "1px solid rgba(246,249,251,0.35)",
                borderRadius: 2,
              }}
            >
              I Already Have an Account
            </button>
          </div>
          <div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs"
            style={{ color: "rgba(246,249,251,0.6)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} style={{ color: C.sky }} /> Free forever
              for friend groups
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} style={{ color: C.sky }} /> No ads
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} style={{ color: C.sky }} /> Works on
              every phone
            </span>
          </div>
        </Reveal>
      </section>

      {/* ───────────────── Footer ───────────────── */}
      <footer
        style={{
          background: C.navyDeep,
          color: "rgba(246,249,251,0.7)",
          paddingTop: "2.5rem",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logomark variant="light" className="w-9 h-9 shrink-0" />
              <div>
                <div
                  className="text-[10px] uppercase font-bold"
                  style={{ color: C.sky, letterSpacing: "0.22em" }}
                >
                  Court Report
                </div>
                <div className="text-xs mt-1">
                  A part of{" "}
                  <a
                    href="https://palmvolleypickle.com"
                    className="underline decoration-dotted underline-offset-2 hover:opacity-90"
                    style={{ color: C.cream }}
                  >
                    Palm Volley Pickle
                  </a>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <a
                href="https://palmvolleypickle.com"
                className="hover:opacity-90"
              >
                Main site
              </a>
              <a
                href="https://palmvolleypickle.com/coaching"
                className="hover:opacity-90"
              >
                Coaching
              </a>
              <a
                href="https://palmvolleypickle.com/contact"
                className="hover:opacity-90"
              >
                Contact
              </a>
              <a
                href="https://www.instagram.com/palmvolleypickle/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-90"
              >
                Instagram
              </a>
              <a
                href="https://www.youtube.com/@PalmVolleyPickle"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-90"
              >
                YouTube
              </a>
              <a
                href="https://www.facebook.com/palmvolleypickle"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-90"
              >
                Facebook
              </a>
              <button
                onClick={onSignIn}
                style={{ background: "transparent", padding: 0 }}
                className="hover:opacity-90"
              >
                Sign in
              </button>
            </div>
          </div>
          <div
            className="mt-8 pt-5 text-[11px]"
            style={{
              borderTop: "1px solid rgba(246,249,251,0.12)",
              color: "rgba(246,249,251,0.65)",
            }}
          >
            © {new Date().getFullYear()} Palm Volley Pickle. Made for crews
            who keep score.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ───────────────── Sub-components ─────────────────

function Feature({ icon, title, copy, color }) {
  return (
    <div
      className="cr-card-lift p-6 h-full"
      style={{
        background: C.cream,
        border: `1px solid ${C.ice}`,
        borderRadius: 2,
        boxShadow: "0 1px 0 rgba(13,47,69,0.04)",
      }}
    >
      <div
        className="w-11 h-11 flex items-center justify-center mb-4"
        style={{
          background: `${color}1f`, // ~12% alpha
          color,
          borderRadius: 2,
        }}
      >
        {icon}
      </div>
      <h3
        className="uppercase mb-2"
        style={{
          fontFamily: DISPLAY,
          fontSize: 17,
          letterSpacing: "0.04em",
          color: C.ink,
        }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
        {copy}
      </p>
    </div>
  );
}

function Step({ n, title, copy }) {
  return (
    <div
      className="cr-card-lift p-6 relative h-full"
      style={{
        background: "rgba(246,249,251,0.04)",
        border: "1px solid rgba(246,249,251,0.12)",
        borderRadius: 2,
      }}
    >
      <div
        className="uppercase mb-3"
        style={{
          fontFamily: DISPLAY,
          fontSize: 32,
          letterSpacing: "0.02em",
          color: C.coral,
          lineHeight: 1,
        }}
      >
        {n}
      </div>
      <h3
        className="uppercase mb-2"
        style={{
          fontFamily: DISPLAY,
          fontSize: 17,
          letterSpacing: "0.04em",
          color: C.cream,
        }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "rgba(246,249,251,0.75)" }}
      >
        {copy}
      </p>
    </div>
  );
}

/**
 * PhoneMockup — a CSS-rendered iPhone-style frame containing a stylized
 * Court Report screen. Purely decorative; values are illustrative. Used in
 * the hero to drive home the "made for your pocket" message.
 *
 * Layout: tilted ~5° to the right, with two decorative glow blobs behind it
 * (coral + sky) for depth. Frame is dark with a pinhole camera and a
 * speaker-bar notch. Content inside mirrors the tracker's actual headline
 * stat block — player card → 2x2 stats → recent games.
 */
function PhoneMockup() {
  return (
    <div
      className="relative"
      style={{
        width: 286,
        maxWidth: "100%",
        // Subtle tilt — feels alive without being gimmicky
        transform: "rotate(4deg)",
        transformOrigin: "center center",
      }}
    >
      {/* Decorative glow blobs (behind phone) */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 280,
          height: 280,
          background:
            "radial-gradient(circle, rgba(234,78,51,0.55) 0%, rgba(234,78,51,0) 70%)",
          top: -60,
          right: -70,
          filter: "blur(20px)",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 260,
          height: 260,
          background:
            "radial-gradient(circle, rgba(96,192,226,0.5) 0%, rgba(96,192,226,0) 70%)",
          bottom: -50,
          left: -80,
          filter: "blur(20px)",
          zIndex: 0,
        }}
      />

      {/* Phone frame */}
      <div
        className="relative"
        style={{
          width: 286,
          height: 580,
          background:
            "linear-gradient(165deg, #0d2f45 0%, #08202f 50%, #051522 100%)",
          borderRadius: 38,
          padding: 9,
          boxShadow:
            "0 30px 60px -15px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.06) inset, 0 0 0 4px rgba(0,0,0,0.4)",
          zIndex: 1,
        }}
      >
        {/* Side power/volume buttons (purely decorative) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -3,
            top: 90,
            width: 3,
            height: 32,
            background: "#08202f",
            borderRadius: "2px 0 0 2px",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -3,
            top: 140,
            width: 3,
            height: 56,
            background: "#08202f",
            borderRadius: "2px 0 0 2px",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -3,
            top: 110,
            width: 3,
            height: 76,
            background: "#08202f",
            borderRadius: "0 2px 2px 0",
          }}
        />

        {/* Screen */}
        <div
          className="relative overflow-hidden"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 30,
            background: C.cream,
          }}
        >
          {/* Dynamic Island / notch */}
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: 10,
              width: 90,
              height: 26,
              background: "#000",
              borderRadius: 20,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 10,
            }}
          >
            {/* Tiny camera dot */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#222",
                border: "1px solid #333",
              }}
            />
          </div>

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-6"
            style={{
              paddingTop: 14,
              paddingBottom: 8,
              fontSize: 10,
              fontWeight: 700,
              color: C.ink,
              fontFamily: BODY,
            }}
          >
            <span>9:41</span>
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {/* Signal + battery (simplified) */}
              <span style={{ letterSpacing: 1 }}>●●●</span>
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 9,
                  border: "1px solid currentColor",
                  borderRadius: 2,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    left: 1,
                    bottom: 1,
                    width: "70%",
                    background: "currentColor",
                    borderRadius: 1,
                  }}
                />
              </span>
            </span>
          </div>

          {/* App header strip */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{
              background: C.navyDeep,
              color: C.cream,
            }}
          >
            <div className="flex items-center gap-2">
              <Logomark variant="light" className="w-6 h-6 shrink-0" />
              <div
                className="uppercase"
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 12,
                  letterSpacing: "0.16em",
                }}
              >
                Court Report
              </div>
            </div>
            <span
              className="px-1.5 py-0.5 text-[8px] uppercase font-bold"
              style={{
                background: "rgba(96,192,226,0.2)",
                color: C.sky,
                letterSpacing: "0.18em",
                borderRadius: 2,
              }}
            >
              Sunday
            </span>
          </div>

          {/* Player headline */}
          <div className="px-4 pt-4">
            <div
              className="text-[9px] uppercase font-bold"
              style={{ color: C.coral, letterSpacing: "0.22em" }}
            >
              You're up
            </div>
            <div className="flex items-end justify-between mt-1">
              <div
                className="uppercase"
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 22,
                  letterSpacing: "0.02em",
                  color: C.ink,
                  lineHeight: 1,
                }}
              >
                J. Sparkman
              </div>
              <span
                className="cr-streak-anim inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase font-bold"
                style={{
                  background: "rgba(234,78,51,0.14)",
                  color: C.coral,
                  letterSpacing: "0.18em",
                  borderRadius: 2,
                }}
              >
                <Flame size={9} /> W4
              </span>
            </div>
          </div>

          {/* Stat grid */}
          <div className="px-4 mt-4 grid grid-cols-2 gap-2">
            <PhoneStat label="Singles ⚡" value="1,612" delta="+18" />
            <PhoneStat label="Doubles ⚡" value="1,548" delta="+11" />
            <PhoneStat label="Record" value="42-19" />
            <PhoneStat label="Best run" value="W9" />
          </div>

          {/* Recent games */}
          <div
            className="mx-4 mt-4 pt-3"
            style={{ borderTop: `1px solid ${C.ice}` }}
          >
            <div
              className="text-[9px] uppercase font-bold mb-2"
              style={{ color: C.muted, letterSpacing: "0.22em" }}
            >
              Recent
            </div>
            <div>
              <PhoneGameRow date="Thu" mode="DBL" score="11-7" won />
              <PhoneGameRow date="Tue" mode="SNG" score="11-4" won />
              <PhoneGameRow date="Sun" mode="DBL" score="9-11" won={false} />
            </div>
          </div>

          {/* Bottom CTA — log a game */}
          <div
            className="absolute left-0 right-0 px-4"
            style={{ bottom: 14 }}
          >
            <button
              type="button"
              tabIndex={-1}
              className="w-full inline-flex items-center justify-center gap-2 uppercase"
              style={{
                background: C.coral,
                color: C.cream,
                fontFamily: DISPLAY,
                fontSize: 11,
                letterSpacing: "0.2em",
                padding: "12px 14px",
                borderRadius: 2,
                boxShadow: "0 6px 14px -4px rgba(234,78,51,0.5)",
                cursor: "default",
              }}
            >
              + Log a Game
            </button>
            {/* Home indicator */}
            <div
              aria-hidden
              className="mx-auto mt-2"
              style={{
                width: 100,
                height: 4,
                background: "#1a2a36",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneStat({ label, value, delta }) {
  return (
    <div
      className="px-2.5 py-2"
      style={{
        background: "white",
        border: `1px solid ${C.ice}`,
        borderRadius: 2,
      }}
    >
      <div
        className="text-[8px] uppercase font-bold mb-0.5"
        style={{ color: C.muted, letterSpacing: "0.18em" }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <div
          className="uppercase"
          style={{
            fontFamily: DISPLAY,
            fontSize: 16,
            color: C.navyDeep,
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          {value}
        </div>
        {delta && (
          <span
            className="cr-delta-anim text-[9px] font-bold"
            style={{ color: C.coral }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function PhoneGameRow({ date, mode, score, won }) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{ borderBottom: `1px solid ${C.ice}` }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="px-1 py-0.5 text-[8px] uppercase font-bold"
          style={{
            background: won ? "rgba(26,122,181,0.14)" : "rgba(234,78,51,0.14)",
            color: won ? C.blue : C.coral,
            letterSpacing: "0.18em",
            borderRadius: 2,
          }}
        >
          {won ? "W" : "L"}
        </span>
        <span
          className="text-[8px] uppercase font-bold"
          style={{ color: C.muted, letterSpacing: "0.2em" }}
        >
          {mode}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: 11,
            color: C.navyDeep,
          }}
        >
          {score}
        </span>
        <span
          className="text-[8px] uppercase font-bold w-6 text-right"
          style={{ color: C.muted, letterSpacing: "0.18em" }}
        >
          {date}
        </span>
      </div>
    </div>
  );
}

/**
 * Hero card — a stylized rendering of what a player's headline stat block
 * looks like inside the app. Pure decoration; values are illustrative.
 * (Currently unused — kept for easy revert if we want the flat card again.)
 */
function SparkRatingCard() {
  return (
    <div
      className="p-7"
      style={{
        background: C.cream,
        color: C.ink,
        border: `1px solid ${C.ice}`,
        borderRadius: 2,
        boxShadow: "0 30px 60px -20px rgba(13,47,69,0.45)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div
            className="text-[10px] uppercase font-bold"
            style={{ color: C.coral, letterSpacing: "0.22em" }}
          >
            Player Card
          </div>
          <div
            className="uppercase mt-1"
            style={{
              fontFamily: DISPLAY,
              fontSize: 22,
              letterSpacing: "0.02em",
              color: C.ink,
            }}
          >
            J. Sparkman
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold"
          style={{
            background: "rgba(234,78,51,0.12)",
            color: C.coral,
            letterSpacing: "0.18em",
            borderRadius: 2,
          }}
        >
          <Flame size={10} /> W4
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatTile
          label="Singles ⚡"
          value="1,612"
          delta="+18"
          deltaColor={C.coral}
        />
        <StatTile
          label="Doubles ⚡"
          value="1,548"
          delta="+11"
          deltaColor={C.coral}
        />
        <StatTile label="Record" value="42-19" />
        <StatTile label="Best streak" value="W9" />
      </div>

      <div
        style={{
          borderTop: `1px solid ${C.ice}`,
          paddingTop: 16,
        }}
      >
        <div
          className="text-[10px] uppercase font-bold mb-3"
          style={{ color: C.muted, letterSpacing: "0.22em" }}
        >
          Last 3 games
        </div>
        <div className="space-y-2">
          <GameRow date="Thu" mode="DBL" score="11-7" won />
          <GameRow date="Tue" mode="SNG" score="11-4" won />
          <GameRow date="Sun" mode="DBL" score="9-11" won={false} />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, delta, deltaColor }) {
  return (
    <div
      className="px-3 py-3"
      style={{
        background: "white",
        border: `1px solid ${C.ice}`,
        borderRadius: 2,
      }}
    >
      <div
        className="text-[9px] uppercase font-bold mb-1"
        style={{ color: C.muted, letterSpacing: "0.2em" }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div
          className="uppercase"
          style={{
            fontFamily: DISPLAY,
            fontSize: 22,
            letterSpacing: "0.02em",
            color: C.navyDeep,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {delta && (
          <span
            className="text-[10px] font-bold"
            style={{ color: deltaColor }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function GameRow({ date, mode, score, won }) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{ borderBottom: `1px solid ${C.ice}` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="px-1.5 py-0.5 text-[9px] uppercase font-bold"
          style={{
            background: won ? "rgba(26,122,181,0.12)" : "rgba(234,78,51,0.12)",
            color: won ? C.blue : C.coral,
            letterSpacing: "0.18em",
            borderRadius: 2,
          }}
        >
          {won ? "W" : "L"}
        </span>
        <span
          className="text-[10px] uppercase font-bold"
          style={{ color: C.muted, letterSpacing: "0.2em" }}
        >
          {mode}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: 13,
            color: C.navyDeep,
          }}
        >
          {score}
        </span>
        <span
          className="text-[10px] uppercase font-bold w-8 text-right"
          style={{ color: C.muted, letterSpacing: "0.18em" }}
        >
          {date}
        </span>
      </div>
    </div>
  );
}

/**
 * Mid-page showcase — a wider, denser rendering using leaderboard rows and
 * a chart-ish element. Pure decoration.
 */
function StatShowcase() {
  const rows = [
    { rank: 1, name: "M. Acosta", rating: 1714, wins: 38, losses: 12, streak: "W6" },
    { rank: 2, name: "J. Sparkman", rating: 1612, wins: 42, losses: 19, streak: "W4" },
    { rank: 3, name: "T. Reyes", rating: 1589, wins: 33, losses: 18, streak: "L1" },
    { rank: 4, name: "K. Patel", rating: 1543, wins: 27, losses: 21, streak: "W2" },
    { rank: 5, name: "S. Lin", rating: 1502, wins: 24, losses: 26, streak: "L2" },
  ];
  return (
    <div
      className="overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${C.ice}`,
        borderRadius: 2,
        boxShadow: "0 30px 60px -22px rgba(13,47,69,0.18)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: C.navyDeep, color: C.cream }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} style={{ color: C.sky }} />
          <span
            className="uppercase"
            style={{
              fontFamily: DISPLAY,
              fontSize: 14,
              letterSpacing: "0.18em",
            }}
          >
            Sunday Round-Robin · Leaderboard
          </span>
        </div>
        <span
          className="text-[10px] uppercase font-bold"
          style={{ color: C.sky, letterSpacing: "0.22em" }}
        >
          Top 5 / 12
        </span>
      </div>

      {/* Rows */}
      <div>
        {rows.map((r) => (
          <div
            key={r.rank}
            className="grid grid-cols-12 items-center px-5 py-3 gap-2"
            style={{
              borderBottom: `1px solid ${C.ice}`,
              background: r.rank === 1 ? "rgba(234,78,51,0.04)" : "white",
            }}
          >
            <div
              className="col-span-1 uppercase"
              style={{
                fontFamily: DISPLAY,
                fontSize: 16,
                color: r.rank === 1 ? C.coral : C.muted,
                letterSpacing: "0.02em",
              }}
            >
              {String(r.rank).padStart(2, "0")}
            </div>
            <div
              className="col-span-4"
              style={{
                fontFamily: DISPLAY,
                fontSize: 14,
                color: C.navyDeep,
                letterSpacing: "0.02em",
              }}
            >
              {r.name}
            </div>
            <div
              className="col-span-3 text-right"
              style={{
                fontFamily: DISPLAY,
                fontSize: 17,
                color: r.rank === 1 ? C.coral : C.navy,
              }}
            >
              {r.rating.toLocaleString()}
              <span
                className="ml-1 text-[10px] uppercase font-bold align-middle"
                style={{ color: C.muted, letterSpacing: "0.2em" }}
              >
                ⚡
              </span>
            </div>
            <div
              className="col-span-2 text-right text-xs font-bold"
              style={{ color: C.muted }}
            >
              {r.wins}-{r.losses}
            </div>
            <div className="col-span-2 text-right">
              <span
                className="inline-block px-1.5 py-0.5 text-[10px] uppercase font-bold"
                style={{
                  background: r.streak.startsWith("W")
                    ? "rgba(26,122,181,0.12)"
                    : "rgba(234,78,51,0.12)",
                  color: r.streak.startsWith("W") ? C.blue : C.coral,
                  letterSpacing: "0.18em",
                  borderRadius: 2,
                }}
              >
                {r.streak}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

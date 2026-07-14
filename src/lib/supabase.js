// src/lib/supabase.js
//
// Single configured Supabase client used app-wide.
//
// IMPORTANT (Phase 11 — SSO):
// This client uses `@supabase/ssr`'s `createBrowserClient`, which stores the
// auth session in cookies (not localStorage). In production, those cookies are
// scoped to `.palmvolleypickle.com` so the session is shared with the main PVP
// web app at https://palmvolleypickle.com. That means a user signed in on
// either app is recognized on the other — true single sign-on.
//
// On localhost (dev) we don't set the Domain attribute, so cookies stay
// host-scoped to localhost and behave like a normal local session.
//
// We deliberately keep the URL and publishable anon key embedded in the
// bundle. That's normal for Supabase — the anon key is meant to be public,
// and security is enforced via RLS policies on the database side.

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = "https://lzfadeofasgihhugmwmm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZmFkZW9mYXNnaWhodWdtd21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTM2MTQsImV4cCI6MjA5MDY2OTYxNH0.bEBGdj8gXgQyklHU5kP1ArxoJE_629B_qC_0BJbeHyE";

// Detect prod vs dev by hostname. In prod we set Domain=.palmvolleypickle.com
// so the cookie is sent to both palmvolleypickle.com and
// tracker.palmvolleypickle.com. In dev (localhost) Domain is omitted.
const isProd =
  typeof window !== "undefined" &&
  /(^|\.)palmvolleypickle\.com$/.test(window.location.hostname);

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  cookieOptions: {
    domain: isProd ? ".palmvolleypickle.com" : undefined,
    path: "/",
    sameSite: "lax",
    secure: isProd,
    // Long max-age so the refresh-token cookie survives between visits. The
    // SDK auto-refreshes anyway, but this keeps the user signed-in across
    // browser restarts.
    maxAge: 60 * 60 * 24 * 400, // ~400 days
  },
});

// Helper: where to redirect users after they click email confirmation /
// magic link / OAuth callback. We use the current origin so it works in both
// localhost and production without code changes.
export const authRedirectUrl = () => {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/`;
};

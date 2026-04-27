// src/lib/supabase.js
//
// Single configured Supabase client used app-wide.
//
// We deliberately keep the URL and publishable anon key embedded in the bundle.
// That's normal for Supabase — the anon key is meant to be public, and security
// is enforced via RLS policies on the database side, not by hiding the key.
//
// The session persists across reloads via localStorage (handled internally by
// the SDK with the default options below). On app load, the SDK will rehydrate
// the session if one exists; if it's expired, it auto-refreshes silently.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lzfadeofasgihhugmwmm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZmFkZW9mYXNnaWhodWdtd21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTM2MTQsImV4cCI6MjA5MDY2OTYxNH0.bEBGdj8gXgQyklHU5kP1ArxoJE_629B_qC_0BJbeHyE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed for magic link + OAuth callbacks
    flowType: "pkce", // more secure flow for browser-based apps
  },
});

// Helper: where to redirect users after they click email confirmation /
// magic link / OAuth callback. We use the current origin so it works in both
// localhost and production without code changes.
export const authRedirectUrl = () => {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/`;
};

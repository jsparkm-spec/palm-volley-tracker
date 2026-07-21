// src/lib/supabase.js
//
// Single configured Supabase client used app-wide.
//
// This file is PLATFORM-AWARE:
//
//  • WEB (browser / installed PWA) — unchanged from before. Uses
//    `@supabase/ssr`'s `createBrowserClient`, which stores the auth session in
//    cookies. In production those cookies are scoped to `.palmvolleypickle.com`
//    so the session is shared with the main PVP web app (true SSO). On
//    localhost the Domain attribute is omitted so it behaves like a normal
//    local session.
//
//  • NATIVE (Capacitor iOS/Android) — the cookie-SSO model doesn't exist in a
//    native shell (the webview origin is `localhost`, and cookie persistence in
//    WKWebView is unreliable). So native uses `@supabase/supabase-js`'s
//    `createClient` with a Capacitor Preferences storage adapter — the session
//    is stored in real device storage and survives app restarts. OAuth is
//    handled via the system browser + a deep link (see ./nativeAuth.js);
//    `detectSessionInUrl` is off because we complete the code exchange
//    ourselves from the deep-link callback.
//
// The URL and anon key are embedded in the bundle on purpose — the anon key is
// public by design, and access is enforced by RLS on the database side.

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const SUPABASE_URL = "https://lzfadeofasgihhugmwmm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZmFkZW9mYXNnaWhodWdtd21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTM2MTQsImV4cCI6MjA5MDY2OTYxNH0.bEBGdj8gXgQyklHU5kP1ArxoJE_629B_qC_0BJbeHyE";

// True inside the Capacitor native shell (iOS/Android), false on web/PWA.
export const isNative = Capacitor.isNativePlatform();

// The custom-scheme deep link Google OAuth returns to in the native app. Must
// also be added to Supabase → Authentication → URL Configuration → Redirect
// URLs, and registered in the iOS Info.plist + Android manifest (both done).
export const NATIVE_AUTH_REDIRECT = "com.palmvolleypickle.courtreport://auth";

// The hosted web app — used as the redirect target for EMAIL-based flows
// (signup confirmation, magic link, password reset) on native, since those
// arrive as email links that open a browser, not the app.
const HOSTED_WEB_URL = "https://tracker.palmvolleypickle.com/";

// ── Native: session persisted in device storage via Capacitor Preferences ──
const capacitorStorage = {
  getItem: async (key) => {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  setItem: async (key, value) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    await Preferences.remove({ key });
  },
};

// Prod vs dev detection (web only) for the SSO cookie Domain attribute.
const isProdWeb =
  !isNative &&
  typeof window !== "undefined" &&
  /(^|\.)palmvolleypickle\.com$/.test(window.location.hostname);

export const supabase = isNative
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: capacitorStorage,
        storageKey: "court-report-auth",
        persistSession: true,
        autoRefreshToken: true,
        // We complete the OAuth code exchange manually from the deep-link
        // callback (nativeAuth.js), so the SDK shouldn't scan the URL.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookieOptions: {
        domain: isProdWeb ? ".palmvolleypickle.com" : undefined,
        path: "/",
        sameSite: "lax",
        secure: isProdWeb,
        maxAge: 60 * 60 * 24 * 400, // ~400 days
      },
    });

// Helper: where to redirect users after email confirmation / magic link /
// password reset / (web) OAuth callback.
//   • Web: the current origin (works on localhost and prod unchanged).
//   • Native: the hosted web app, so email links resolve to a real page.
export const authRedirectUrl = () => {
  if (isNative) return HOSTED_WEB_URL;
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/`;
};

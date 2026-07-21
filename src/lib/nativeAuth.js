// src/lib/nativeAuth.js
//
// Native (Capacitor) authentication helpers. On the web these are no-ops or
// fall back to the standard browser redirect — all the native-specific logic
// is gated behind `isNative`.
//
// Google OAuth on native:
//   1. Ask Supabase for the Google authorization URL WITHOUT navigating the
//      webview (skipBrowserRedirect). The redirect target is our custom-scheme
//      deep link so Google returns control to the app, not a web page.
//   2. Open that URL in the SYSTEM browser (SFSafariViewController / Chrome
//      Custom Tabs). Google refuses OAuth inside embedded webviews, so this is
//      required, not just nicer.
//   3. After the user approves, Google redirects to our deep link. The OS hands
//      the URL to the app via the `appUrlOpen` event (see initDeepLinkAuth),
//      where we pull out the `code` and exchange it for a session.

import { supabase, isNative, NATIVE_AUTH_REDIRECT, authRedirectUrl } from "./supabase";

let deepLinkInited = false;

/**
 * Start Google sign-in. Works on both platforms:
 *   • Native: opens the system browser; the session lands via the deep link.
 *   • Web: standard full-page redirect to Google and back (unchanged).
 * Throws on error so the caller can surface a message.
 */
export async function signInWithGoogle() {
  if (isNative) {
    const { Browser } = await import("@capacitor/browser");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_AUTH_REDIRECT,
        skipBrowserRedirect: true, // we open the URL ourselves
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Couldn't start Google sign in.");
    await Browser.open({ url: data.url });
    return;
  }

  // Web: unchanged behavior — SDK performs the redirect.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authRedirectUrl() },
  });
  if (error) throw error;
}

/**
 * Pull the `code` (or legacy token hash) out of a deep-link callback URL and
 * complete the Supabase session. Custom-scheme URLs look like
 * `com.palmvolleypickle.courtreport://auth?code=...`.
 */
async function completeFromUrl(url) {
  let code = null;
  try {
    code = new URL(url).searchParams.get("code");
  } catch {
    // Fallback for parsers that choke on the custom scheme.
    const m = url.match(/[?&]code=([^&]+)/);
    if (m) code = decodeURIComponent(m[1]);
  }
  if (!code) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return true;
}

/**
 * Register the deep-link listener that finishes OAuth on native. Idempotent and
 * a no-op on web. Call once when the app mounts.
 */
export async function initDeepLinkAuth() {
  if (!isNative || deepLinkInited) return;
  deepLinkInited = true;

  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");

  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url || !url.includes("code=")) return;
    try {
      await completeFromUrl(url);
    } catch (e) {
      // Session listener will keep the user on the auth screen; log for debug.
      console.error("Deep-link auth exchange failed:", e?.message || e);
    } finally {
      // Dismiss the system browser sheet regardless of outcome.
      try {
        await Browser.close();
      } catch {
        /* no-op: nothing open */
      }
    }
  });
}

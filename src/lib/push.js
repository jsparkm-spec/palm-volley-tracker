// src/lib/push.js
//
// Native push-notification registration for Court Report. NATIVE ONLY — on web
// (browser / PWA) every function here is a no-op, so it's safe to call
// unconditionally from shared app code.
//
// Flow on native:
//   1. Ask for notification permission (once).
//   2. Register with the OS push service (APNs on iOS, FCM on Android).
//   3. When the device token arrives, store it against the signed-in user via
//      the `tracker_register_push_token` RPC.
//   4. Basic listeners for delivery + tap (expand these when features land).
//
// ACTIVATION (blocked on accounts — see the app-store setup notes):
//   • Android: a Firebase project + `google-services.json` in android/app/, and
//     the Firebase Gradle plugin, are required or the Android build fails. Then
//     `npx cap sync`.
//   • iOS: the "Push Notifications" capability + an APNs key on the Apple
//     Developer account, then `npx cap sync`.
// Until then this module stays dormant (the native plugin isn't synced), and
// nothing here runs on web.

import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

let inited = false;
let currentToken = null;

/**
 * Request permission, register for push, and persist the device token for the
 * current user. Safe to call after sign-in; no-op on web and idempotent.
 */
export async function initPush() {
  if (!Capacitor.isNativePlatform() || inited) return;
  inited = true;

  let PushNotifications;
  try {
    ({ PushNotifications } = await import("@capacitor/push-notifications"));
  } catch {
    // Plugin not synced into the native project yet (pre-activation). Bail
    // quietly rather than crash the app.
    inited = false;
    return;
  }

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return;

    // Drop any listeners from a previous sign-in so a sign-out → sign-in cycle
    // doesn't stack duplicate handlers on the singleton plugin.
    await PushNotifications.removeAllListeners();

    PushNotifications.addListener("registration", async (token) => {
      currentToken = token.value;
      try {
        await supabase.rpc("tracker_register_push_token", {
          p_token: token.value,
          p_platform: Capacitor.getPlatform(),
        });
      } catch (e) {
        console.error("Push token save failed:", e?.message || e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err?.error || err);
    });

    // Foreground delivery + notification tap. Kept minimal for now; deep-link
    // routing (e.g. open a specific group/game) can hang off these later.
    PushNotifications.addListener("pushNotificationReceived", (n) => {
      console.log("Push received:", n?.title);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      console.log("Push tapped:", a?.notification?.title);
    });

    await PushNotifications.register();
  } catch (e) {
    console.error("initPush failed:", e?.message || e);
  }
}

/**
 * Detach this device's token from the user (call on sign-out). No-op on web.
 */
export async function unregisterPush() {
  if (!Capacitor.isNativePlatform() || !currentToken) return;
  try {
    await supabase.rpc("tracker_unregister_push_token", { p_token: currentToken });
  } catch (e) {
    console.error("Push unregister failed:", e?.message || e);
  }
  currentToken = null;
  inited = false;
}

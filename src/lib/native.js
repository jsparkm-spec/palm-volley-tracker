// src/lib/native.js
//
// One-time native shell setup (status bar theming + splash hand-off). NATIVE
// ONLY — a no-op on web/PWA. Call once when the app mounts.

import { Capacitor } from "@capacitor/core";

let inited = false;

export async function initNative() {
  if (!Capacitor.isNativePlatform() || inited) return;
  inited = true;

  // Themed status bar: a solid navy bar with light icons, matching the brand
  // chrome instead of the default translucent/system look.
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark }); // Dark = dark bg → light content
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: "#0a456a" });
    }
  } catch {
    /* status-bar plugin not synced */
  }

  // Hide the launch splash once the web app has mounted, for a clean fade-in
  // instead of an abrupt cut or a lingering splash.
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* splash plugin not synced */
  }
}

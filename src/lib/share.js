// src/lib/share.js
//
// Share content through the OS share sheet on native, the Web Share API in a
// browser that supports it, or a copy-prompt fallback. Returns true if a share
// UI was shown.

import { Capacitor } from "@capacitor/core";

export async function nativeShare({ title, text, url }) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, url, dialogTitle: title });
      return true;
    } catch {
      // fall through to web/prompt
    }
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false; // user cancelled or share failed
    }
  }
  if (typeof window !== "undefined") {
    window.prompt("Copy this link:", url || text || "");
  }
  return false;
}

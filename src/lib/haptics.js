// src/lib/haptics.js
//
// Tactile feedback for key courtside actions. NATIVE ONLY — no-op on web/PWA.
// Kept tiny and fire-and-forget so call sites don't need to await.

import { Capacitor } from "@capacitor/core";

/** A single tap impact — for logging a score / confirming an action. */
export async function hapticImpact(level = "medium") {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const style =
      level === "light"
        ? ImpactStyle.Light
        : level === "heavy"
        ? ImpactStyle.Heavy
        : ImpactStyle.Medium;
    await Haptics.impact({ style });
  } catch {
    /* haptics plugin not synced */
  }
}

/** A success buzz — for a completed game / win. */
export async function hapticSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* haptics plugin not synced */
  }
}

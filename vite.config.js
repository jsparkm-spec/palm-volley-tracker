import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // PWA: precached app shell + auto-updating service worker, so Court
    // Report installs to the home screen and opens instantly. The manifest is
    // generated here (public/manifest.webmanifest was removed in favor of it).
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "og.png"],
      manifest: {
        name: "Court Report · Palm Volley Pickle",
        short_name: "Court Report",
        description:
          "Free pickleball score & stat tracker — Spark Ratings, leaderboards, and streaks for your crew.",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f9fb",
        theme_color: "#0a456a",
        icons: [
          { src: "/pwa-192.png", type: "image/png", sizes: "192x192" },
          { src: "/pwa-512.png", type: "image/png", sizes: "512x512" },
          {
            src: "/pwa-512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // SPA: all navigations fall back to the app shell.
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});

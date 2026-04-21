/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Russo One"', '"Archivo Black"', "sans-serif"],
        body: ["Lato", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        // Palm Volley Pickle — official palette.
        // Exposed as Tailwind colors so utility classes work too (e.g. bg-navy, text-coral).
        // App.jsx continues to reference them via the `C` token object for inline styles.
        navy: "#0a456a",
        "navy-deep": "#0d2f45",
        blue: "#1a7ab5",
        sky: "#60c0e2",
        "baby-blue": "#a8d8ea",
        ice: "#e8f4f8",
        coral: "#ea4e33",
        "coral-deep": "#c13e2a",
        cream: "#f6f9fb",
        ink: "#0d2f45",
        muted: "#7a8f9e",
      },
      borderRadius: {
        // PVP aesthetic: sharp, editorial corners. Keep a subtle curve for big surfaces
        // (modals, nav pill) but keep buttons/cards tight.
        DEFAULT: "2px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
      },
      letterSpacing: {
        // Brand display labels sit in the 2–4px range per the brand system.
        brand: "0.22em",
        "brand-wide": "0.3em",
      },
    },
  },
  plugins: [],
};

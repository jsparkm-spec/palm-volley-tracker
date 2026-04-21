// src/components/Logomark.jsx
//
// Palm Volley Pickle logomark, converted from the official SVG kit.
// Two visual variants are supported via the `variant` prop:
//
//   variant="light" (default)
//     Sky-blue disc with navy palm + gears. Best on cream/white/light surfaces.
//     Matches: Palm_Volley_Pickle--Logomark--Dark_Blue_Palm.svg
//
//   variant="dark"
//     Navy disc with sky-blue palm + gears. Best on dark surfaces (navy headers,
//     coral accent blocks, photography).
//     Matches: Palm_Volley_Pickle--Logomark-Blue_Palm.svg
//
// Colors are inlined (not classed) so multiple instances can render side-by-side
// without style collisions. Pass `className` to size it — e.g. className="w-10 h-10".
//
// Usage:
//   <Logomark className="w-10 h-10" />                 // light variant (default)
//   <Logomark variant="dark" className="w-14 h-14" />  // dark variant for navy header

export default function Logomark({ variant = "light", className = "", title = "Palm Volley Pickle" }) {
  // The two variants differ only in two colors — the inner disc and the palm/gears.
  // Everything else (outer ring, fronds, sun) stays identical.
  const disc   = variant === "dark" ? "#0a456a" : "#60c0e2"; // navy disc vs sky disc
  const figure = variant === "dark" ? "#60c0e2" : "#0a456a"; // sky palm vs navy palm
  const ring   = "#ffffff"; // thin outer ring
  const frond  = "#ffffff"; // palm fronds + sun base circle
  const sun    = "#ea4e33"; // coral sun rays

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 130 130"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      {/* Outer ring + inner disc */}
      <circle cx="65" cy="65" r="65" fill={ring} />
      <circle cx="65" cy="65" r="60.34" fill={disc} />

      {/* Palm trunk + gear teeth (figure color) */}
      <polygon fill={figure} points="41.95 85.34 49.05 94.08 55.19 88.38 48.79 80.5 41.95 85.34" />
      <polygon fill={figure} points="33.4 91.39 41.36 101.21 47.51 95.51 40.24 86.55 33.4 91.39" />
      <path fill={figure} d="M63.21,57.8l3.87.05-.33-3.76c-.07-.8-.73-1.41-1.54-1.42h0c-.8-.01-1.48.59-1.57,1.38l-.43,3.75Z" />
      <polygon fill={figure} points="67.31 59.85 62.94 59.79 61.82 67.77 68.21 67.85 67.31 59.85" />
      <polygon fill={figure} points="50.51 79.29 56.73 86.96 62.87 81.25 57.35 74.45 50.51 79.29" />
      <path fill={figure} d="M68.47,70.1l-.03-.25-6.89-.09h0c-.17,1.22-.84,2.31-1.84,3.02l-.64.46,5.35,6.59.69-.64c2.5-2.32,3.75-5.69,3.37-9.09Z" />
      <path fill={figure} d="M65.79,3.58C31.87,3.14,4.01,30.28,3.58,64.21c-.44,33.92,26.71,61.78,60.63,62.22,33.92.44,61.78-26.71,62.22-60.63.44-33.92-26.71-61.78-60.63-62.22ZM117.78,86.91c-1.68,4.02-3.78,7.78-6.24,11.23-3.86-1.86-8.64-1.19-11.85,2-3.18,3.17-3.89,7.88-2.12,11.73-3.34,2.3-6.96,4.27-10.8,5.84-3.77,1.55-7.64,2.67-11.56,3.39-1.44-4-5.27-6.87-9.77-6.88-4.56-.01-8.44,2.91-9.86,6.99-4.25-.73-8.45-1.94-12.53-3.64-3.54-1.48-6.87-3.28-9.98-5.37.13-.24.24-.47.35-.72,1.34-3.06,3.12-5.9,5.57-8.17l.93-.86-8.15-10.04-1.42,1.01c-2.63,1.86-5.65,3.02-8.79,3.73-.98.22-1.94.59-2.84,1.11-2.58-3.59-4.76-7.51-6.48-11.71-1.44-3.5-2.51-7.08-3.23-10.71,4.66-1.02,8.16-5.17,8.17-10.14.01-5.09-3.63-9.33-8.45-10.25.72-4.28,1.94-8.51,3.66-12.62,1.53-3.65,3.4-7.09,5.58-10.28,4.06,2.97,9.8,2.64,13.48-1.03,3.71-3.69,4.06-9.49,1.02-13.57,3.38-2.34,7.04-4.33,10.93-5.93,3.92-1.61,7.95-2.76,12.02-3.47.73,5.02,5.05,8.88,10.27,8.9,5.16.01,9.46-3.74,10.29-8.67,3.78.74,7.5,1.87,11.14,3.39,4.11,1.72,7.95,3.88,11.48,6.42-2.7,4.04-2.28,9.55,1.28,13.12,3.47,3.49,8.79,4,12.81,1.54,2.05,3.1,3.81,6.42,5.25,9.93,1.71,4.16,2.91,8.45,3.6,12.79-4.36,1.23-7.56,5.23-7.57,9.99-.01,4.64,3.01,8.57,7.2,9.93-.74,3.73-1.86,7.42-3.36,11.01Z" />

      {/* Palm fronds (white) */}
      <path fill={frond} d="M59.4,33.07c-7.87-8.08-17.34-5.53-17.34-5.53l22.42,23.01s2.79-9.39-5.08-17.47Z" />
      <path fill={frond} d="M57.5,45.81c-.62-.37-1.29-.73-2.01-1.05-2.13-.96-4.72-1.63-7.8-1.67-11.28-.15-16.17,8.35-16.17,8.35l32.12.41s-1.88-3.47-6.14-6.04Z" />
      <path fill={frond} d="M89.19,28.15s-9.39-2.79-17.47,5.08c-8.08,7.87-5.53,17.34-5.53,17.34l23.01-22.42Z" />
      <path fill={frond} d="M55.21,53.11c-.76.15-1.56.35-2.38.63-2.39.8-4.96,2.2-7.41,4.59-8.08,7.87-5.53,17.34-5.53,17.34l23.01-22.42s-3.31-.98-7.69-.14Z" />
      <path fill={frond} d="M77.64,54.05c-.81-.29-1.6-.52-2.36-.69-4.35-.96-7.69-.06-7.69-.06l22.42,23.01s2.79-9.39-5.08-17.47c-2.39-2.45-4.92-3.92-7.29-4.78Z" />
      <path fill={frond} d="M83.17,43.55c-3.08-.04-5.68.57-7.84,1.47-.73.3-1.41.64-2.03,1-4.32,2.46-6.3,5.88-6.3,5.88l32.12.41s-4.67-8.62-15.95-8.76Z" />

      {/* Sun disc + coral rays */}
      <circle cx="75.9" cy="91.14" r="12.29" fill={frond} />
      <path fill={frond} d="M75.9,101.26c.18,0,.35-.02.52-.03h-1.05c.17,0,.35.03.52.03Z" />
      <path fill={sun} d="M75.9,81.01c-5.59,0-10.13,4.53-10.13,10.13h20.25c0-5.59-4.53-10.13-10.13-10.13Z" />
      <path fill={sun} d="M66.36,94.5h19.08c.23-.66.4-1.34.49-2.06h-20.07c.09.71.26,1.4.49,2.06Z" />
      <path fill={sun} d="M68.36,97.87h15.1c.56-.62,1.04-1.31,1.43-2.06h-17.95c.39.75.87,1.43,1.43,2.06Z" />
      <path fill={sun} d="M69.77,99.18c1.57,1.2,3.51,1.95,5.61,2.06h1.05c2.11-.11,4.04-.86,5.61-2.06h-12.27Z" />
    </svg>
  );
}

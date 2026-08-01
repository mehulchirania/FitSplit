/**
 * FitSplit design tokens for React Native — mirrors the dark-mode values in
 * src/app/styles/00-base-shell.css (the app ships dark-mode by default; see
 * docs/12_UI_STYLE_GUIDE.md). RN has no CSS variables, so screens import this
 * instead. Keep in sync with the web tokens when they change.
 */
export const theme = {
  // Brand
  brand: "#C8F135",
  brandStrong: "#b8e028",
  brandSoft: "rgba(200, 241, 53, 0.12)",
  /** Text/icon color on brand-filled elements. NEVER white on lime. */
  primaryForeground: "#0A0A0A",

  // Surfaces
  bg: "#111111",
  bgCard: "#1a1a1a",
  bgHover: "#222222",
  accentSoft: "#1f1f1f",

  // Text
  text: "#f5f5f5",
  textSoft: "#a3a3a3",

  // Lines
  border: "rgba(255, 255, 255, 0.09)",

  // Status
  danger: "#ef4444",
  dangerSoft: "rgba(239, 68, 68, 0.12)",
  warning: "#f59e0b",

  // Shape
  radius: 12,
  radiusSm: 8
} as const;

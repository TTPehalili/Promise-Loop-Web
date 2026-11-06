import type { Config } from "tailwindcss";

// PromiseLoop design tokens — Palette "Greenback" (brief §4.2).
// Components must use these names; no raw hex values in components.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./content/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F4EE",
        "paper-deep": "#EEEBE2",
        surface: "#FFFFFF",
        line: "#E2DED3",
        ink: "#14161B",
        "ink-muted": "#555B66",
        brand: "#0B3D2E",
        "brand-hover": "#082E22",
        mint: "#1FAA70",
        "mint-ink": "#157A50",
        "mint-tint": "#E6F4EC",
        gold: "#C9A227",
        rose: "#B4534B",
        focus: "#1FAA70",
      },
      fontFamily: {
        display: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        eyebrow: ["13px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      boxShadow: {
        popover: "0 8px 24px -8px rgb(20 22 27 / 0.12)",
      },
      borderRadius: {
        lg: "8px",
        xl: "12px",
      },
      maxWidth: {
        prose: "65ch",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;

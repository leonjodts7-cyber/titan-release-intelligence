import type { Config } from "tailwindcss";
import { titanTokens } from "./src/lib/design-tokens";

const titan = {
  bg: titanTokens.bg,
  surface: titanTokens.surface,
  "surface-raised": titanTokens.surfaceRaised,
  border: titanTokens.border,
  accent: titanTokens.accent,
  muted: titanTokens.muted,
  profit: titanTokens.profit,
  loss: titanTokens.loss,
  warning: titanTokens.warning,
  extreme: titanTokens.extreme,
  high: titanTokens.high,
  medium: titanTokens.medium,
  low: titanTokens.low,
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        titan,
        // Semantic aliases (same values as titan.*)
        profit: titan.profit,
        loss: titan.loss,
        warning: titan.warning,
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        titan: {
          bg: "#0a0a0f",
          surface: "#12121a",
          raised: "#14141f",
          border: "#1e1e2e",
          accent: "#6366f1",
          muted: "#71717a",
          extreme: "#ef4444",
          high: "#f97316",
          medium: "#eab308",
          low: "#22c55e",
        },
        profit: "var(--profit)",
        loss: "var(--loss)",
        warning: "var(--warning)",
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

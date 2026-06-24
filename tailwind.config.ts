import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: {
          DEFAULT: "var(--ground)",
          2: "var(--ground-2)",
          3: "var(--ground-3)",
        },
        wv: {
          text: "var(--text)",
          soft: "var(--text-soft)",
          muted: "var(--text-2)",
          faint: "var(--text-3)",
          accent: "var(--accent)",
          "accent-dim": "var(--accent-dim)",
          link: "var(--link)",
          primary: "var(--primary)",
          green: "var(--green)",
          "green-dim": "var(--green-dim)",
          red: "var(--red)",
          "red-dim": "var(--red-dim)",
          blue: "var(--blue)",
          "blue-dim": "var(--blue-dim)",
          border: "var(--border)",
          "border-2": "var(--border-2)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease forwards",
        "slide-in": "slide-in 0.25s ease forwards",
        pulse: "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

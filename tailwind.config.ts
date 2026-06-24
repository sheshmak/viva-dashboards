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
          DEFAULT: "#1E2338",
          2: "#252B44",
          3: "#2E3554",
        },
        wv: {
          text: "#EEF0FF",
          muted: "#8B9BC0",
          faint: "#5A6A94",
          accent: "#FFB020",
          "accent-dim": "#3D2D00",
          green: "#3DD68C",
          "green-dim": "#0D3322",
          red: "#FF6B6B",
          "red-dim": "#3D1010",
          blue: "#7CB9FF",
          "blue-dim": "#0D2040",
          border: "rgba(139,155,192,0.12)",
          "border-2": "rgba(139,155,192,0.22)",
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

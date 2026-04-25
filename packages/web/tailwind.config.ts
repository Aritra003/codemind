import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#4361EE", dim: "rgba(67,97,238,0.12)", glow: "rgba(67,97,238,0.25)" },
        accent: { DEFAULT: "#7B2FBE", dim: "rgba(123,47,190,0.12)" },
        neon:   { DEFAULT: "#00F5D4", dim: "rgba(0,245,212,0.12)" },
        heat:   { DEFAULT: "#FF6B6B", dim: "rgba(255,107,107,0.12)" },
        solar:  { DEFAULT: "#FFB347", dim: "rgba(255,179,71,0.12)" },
        surface: {
          DEFAULT: "#0A0A12",
          raised:  "#0F0F1A",
          card:    "#141424",
          hover:   "#1A1A30",
        },
        border: { DEFAULT: "#1E1E35", light: "#2A2A48" },
        ink: {
          DEFAULT: "#F0F0F8",
          muted:   "#7A7A9A",
          dim:     "#3A3A5A",
        },
      },
      fontFamily: {
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        body:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "dot-grid": "radial-gradient(circle, rgba(67,97,238,0.08) 1px, transparent 1px)",
        "scan-line": "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)",
        "brand-gradient": "linear-gradient(135deg, #4361EE, #7B2FBE)",
        "heat-gradient": "linear-gradient(135deg, #FF6B6B, #FFB347)",
      },
      backgroundSize: { "dot-grid": "28px 28px" },
      animation: {
        "pulse-slow":  "pulse 3s ease infinite",
        "float":       "float 6s ease-in-out infinite",
        "glow":        "glow 2.5s ease-in-out infinite",
        "scan":        "scan 8s linear infinite",
        "type":        "type 2.5s steps(30, end) forwards",
        "blink":       "blink 1s step-end infinite",
        "shimmer":     "shimmer 2s linear infinite",
        "slide-up":    "slideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in":     "fadeIn 0.5s ease forwards",
        "count-up":    "fadeIn 0.3s ease forwards",
      },
      keyframes: {
        float:   { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        glow:    { "0%,100%": { opacity: "0.4" }, "50%": { opacity: "1" } },
        scan:    { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100vh)" } },
        blink:   { "50%": { opacity: "0" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(24px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      boxShadow: {
        "brand-glow": "0 0 30px rgba(67,97,238,0.3)",
        "neon-glow":  "0 0 30px rgba(0,245,212,0.25)",
        "heat-glow":  "0 0 30px rgba(255,107,107,0.3)",
        "card":       "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;

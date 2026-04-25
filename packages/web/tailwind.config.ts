import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Page background ────────────────────────────────────────
        bg: "#03030A",
        // ── Brand ─────────────────────────────────────────────────
        brand: {
          DEFAULT: "#5B6EFF",
          dim:     "rgba(91,110,255,0.10)",
          glow:    "rgba(91,110,255,0.22)",
          "50":    "#EEF0FF",
          "400":   "#818CF8",
          "600":   "#4338CA",
        },
        // ── Accents ────────────────────────────────────────────────
        accent: { DEFAULT: "#00E5FF", dim: "rgba(0,229,255,0.10)" },
        neon:   { DEFAULT: "#39FF82", dim: "rgba(57,255,130,0.10)" },
        heat:   { DEFAULT: "#FF3A5E", dim: "rgba(255,58,94,0.10)"  },
        solar:  { DEFAULT: "#FFB300", dim: "rgba(255,179,0,0.10)"  },
        violet: { DEFAULT: "#B06EFF", dim: "rgba(176,110,255,0.10)"},
        // ── Surfaces ───────────────────────────────────────────────
        surface: {
          DEFAULT: "#08081A",
          raised:  "#0D0D22",
          card:    "#111128",
          hover:   "#16162F",
        },
        // ── Borders ────────────────────────────────────────────────
        border: { DEFAULT: "#1A1A35", light: "#242448" },
        // ── Ink ────────────────────────────────────────────────────
        ink: {
          DEFAULT: "#EEEEFF",
          muted:   "#8080A8",
          dim:     "#2A2A50",
        },
      },

      fontFamily: {
        display: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        body:    ["var(--font-inter)",   "Inter",             "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)","JetBrains Mono",   "Fira Code", "monospace"],
      },

      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs:    ["11px", { lineHeight: "1.5" }],
        sm:    ["12px", { lineHeight: "1.5" }],
        base:  ["14px", { lineHeight: "1.6" }],
        lg:    ["16px", { lineHeight: "1.5" }],
        xl:    ["20px", { lineHeight: "1.4" }],
        "2xl": ["24px", { lineHeight: "1.3" }],
        "3xl": ["30px", { lineHeight: "1.2" }],
        "4xl": ["38px", { lineHeight: "1.15" }],
      },

      backgroundImage: {
        "dot-grid":       "radial-gradient(circle, rgba(91,110,255,0.07) 1px, transparent 1px)",
        "scan-line":      "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)",
        "brand-gradient": "linear-gradient(135deg, #5B6EFF 0%, #00E5FF 100%)",
        "heat-gradient":  "linear-gradient(135deg, #FF3A5E 0%, #FFB300 100%)",
        "neon-gradient":  "linear-gradient(135deg, #39FF82 0%, #00E5FF 100%)",
      },
      backgroundSize: { "dot-grid": "24px 24px" },

      borderRadius: {
        sm: "4px", md: "6px", lg: "8px", xl: "10px", "2xl": "14px", "3xl": "20px",
      },

      boxShadow: {
        "brand-glow": "0 0 24px rgba(91,110,255,0.25)",
        "neon-glow":  "0 0 24px rgba(57,255,130,0.20)",
        "heat-glow":  "0 0 24px rgba(255,58,94,0.25)",
        "cyan-glow":  "0 0 24px rgba(0,229,255,0.20)",
        card:         "0 2px 16px rgba(0,0,0,0.5)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.55)",
        overlay:      "0 16px 48px rgba(0,0,0,0.7)",
      },

      animation: {
        "pulse-slow":  "pulse 3s ease infinite",
        "pulse-ring":  "pulseRing 1.8s ease infinite",
        "float":       "float 6s ease-in-out infinite",
        "glow":        "glow 2.5s ease-in-out infinite",
        "fade-up":     "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-right": "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "blink":       "blink 1s step-end infinite",
        "shimmer":     "shimmer 1.8s linear infinite",
        "scan":        "scan 8s linear infinite",
      },
      keyframes: {
        float:        { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        glow:         { "0%,100%": { opacity: "0.4" }, "50%": { opacity: "1" } },
        scan:         { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100vh)" } },
        blink:        { "50%": { opacity: "0" } },
        shimmer:      { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        fadeUp:       { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInRight: { "0%": { opacity: "0", transform: "translateX(12px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        pulseRing:    { "0%": { boxShadow: "0 0 0 0 rgba(91,110,255,0.4)" }, "70%": { boxShadow: "0 0 0 8px rgba(91,110,255,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(91,110,255,0)" } },
      },
    },
  },
  plugins: [],
};

export default config;

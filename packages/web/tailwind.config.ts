import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ────────────────────────────────────────────
        bg:      "#04040A",
        surface: { DEFAULT: "#0E0E1F", raised: "#151530", base: "#08081A" },
        // ── Brand / accent ─────────────────────────────────────────
        brand: {
          DEFAULT: "#6366F1",
          hover:   "#818CF8",
          glow:    "rgba(99,102,241,0.15)",
          dim:     "rgba(99,102,241,0.10)",
        },
        accent:  { DEFAULT: "#6366F1", hover: "#818CF8", glow: "rgba(99,102,241,0.15)" },
        // ── Semantic colors ────────────────────────────────────────
        neon:    { DEFAULT: "#34D399", dim: "rgba(52,211,153,0.10)"  },
        heat:    { DEFAULT: "#F87171", dim: "rgba(248,113,113,0.10)" },
        solar:   { DEFAULT: "#FB923C", dim: "rgba(251,146,60,0.10)"  },
        violet:  { DEFAULT: "#A78BFA", dim: "rgba(167,139,250,0.10)" },
        cyan:    { DEFAULT: "#22D3EE", dim: "rgba(34,211,238,0.10)"  },
        // ── Borders ────────────────────────────────────────────────
        border: {
          subtle:  "rgba(255,255,255,0.06)",
          DEFAULT: "rgba(255,255,255,0.10)",
          hover:   "rgba(255,255,255,0.16)",
          active:  "rgba(100,130,255,0.30)",
          light:   "rgba(255,255,255,0.14)",
        },
        // ── Ink ────────────────────────────────────────────────────
        ink: {
          DEFAULT:   "#F0F0FA",
          primary:   "#F0F0FA",
          secondary: "#B8B8D0",
          tertiary:  "#7878A0",
          muted:     "#505070",
          dim:       "#505070",
        },
      },

      fontFamily: {
        display: ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        body:    ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono:    ["'JetBrains Mono'",    "'Fira Code'", "ui-monospace", "monospace"],
      },

      fontSize: {
        "2xs": ["13px", { lineHeight: "1.4" }],
        xs:    ["13px", { lineHeight: "1.5" }],
        sm:    ["14px", { lineHeight: "1.5" }],
        base:  ["16px", { lineHeight: "1.65" }],
        lg:    ["18px", { lineHeight: "1.5" }],
        xl:    ["20px", { lineHeight: "1.4" }],
        "2xl": ["24px", { lineHeight: "1.3" }],
        "3xl": ["32px", { lineHeight: "1.2" }],
        "4xl": ["40px", { lineHeight: "1.15" }],
        "5xl": ["56px", { lineHeight: "1.1" }],
      },

      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
        "heat-gradient":  "linear-gradient(135deg, #F87171 0%, #FB923C 100%)",
        "neon-gradient":  "linear-gradient(135deg, #34D399 0%, #22D3EE 100%)",
        "dot-grid":       "radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)",
        "scan-line":      "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.006) 3px, rgba(255,255,255,0.006) 4px)",
        "glow-top":       "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08), transparent 60%)",
      },
      backgroundSize: { "dot-grid": "24px 24px" },

      borderRadius: {
        sm:   "8px",
        md:   "10px",
        lg:   "12px",
        xl:   "16px",
        "2xl":"20px",
        "3xl":"24px",
      },

      boxShadow: {
        "brand-glow": "0 0 24px rgba(99,102,241,0.25)",
        "violet-glow":"0 0 24px rgba(167,139,250,0.20)",
        "neon-glow":  "0 0 24px rgba(52,211,153,0.20)",
        "heat-glow":  "0 0 24px rgba(248,113,113,0.25)",
        "card":       "0 4px 24px rgba(0,0,0,0.5)",
        "card-hover": "0 12px 40px rgba(0,0,0,0.55)",
        "overlay":    "0 20px 60px rgba(0,0,0,0.7)",
      },

      animation: {
        "pulse-slow":  "pulse 3s ease infinite",
        "pulse-ring":  "pulseRing 1.8s ease infinite",
        "float":       "float 6s ease-in-out infinite",
        "glow":        "glow 2.5s ease-in-out infinite",
        "fade-up":     "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in":     "fadeIn 0.3s ease forwards",
        "slide-right": "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "blink":       "blink 1s step-end infinite",
        "shimmer":     "shimmer 2s linear infinite",
      },
      keyframes: {
        float:        { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        glow:         { "0%,100%": { opacity: "0.4" }, "50%": { opacity: "1" } },
        blink:        { "50%": { opacity: "0" } },
        shimmer:      { "0%": { backgroundPosition: "-200% center" }, "100%": { backgroundPosition: "200% center" } },
        fadeUp:       { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn:       { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideInRight: { "0%": { opacity: "0", transform: "translateX(12px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        pulseRing:    { "0%": { boxShadow: "0 0 0 0 rgba(99,102,241,0.4)" }, "70%": { boxShadow: "0 0 0 8px rgba(99,102,241,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0)" } },
      },
    },
  },
  plugins: [],
};

export default config;

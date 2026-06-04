/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ─── Vibe OS color tokens ─── */
      colors: {
        bg:             "var(--bg)",
        "bg-elev":      "var(--bg-elev)",
        surface:        "var(--surface)",
        "surface-hi":   "var(--surface-hi)",
        "border-hi":    "var(--border-hi)",
        accent:         "var(--accent)",
        "accent-bright":"var(--accent-bright)",
        "accent-deep":  "var(--accent-deep)",
        "accent-muted": "var(--accent-muted)",
        text:           "var(--text)",
        "text-muted":   "var(--text-muted)",
        "text-faint":   "var(--text-faint)",
        success:        "var(--success)",
        danger:         "var(--danger)",
        info:           "var(--info)",
        warning:        "var(--warning)",
        loyalty:        "var(--loyalty)",

        /* shadcn/ui compat */
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted-var))",
          foreground: "hsl(var(--muted-foreground))",
        },
        "accent-ui": {
          DEFAULT:    "hsl(var(--accent-var))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border-var))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },

      /* ─── Vibe OS font families ─── */
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans:    ["var(--font-sans)",    "sans-serif"],
        mono:    ["var(--font-mono)",    "monospace"],
      },

      /* ─── Vibe OS type scale ─── */
      fontSize: {
        "page-title":   ["34px",   { lineHeight: "1.1", fontWeight: "400" }],
        kpi:            ["38px",   { lineHeight: "1",   fontWeight: "600" }],
        "card-title":   ["19px",   { lineHeight: "1.3", fontWeight: "500" }],
        "mono-eyebrow": ["10.5px", { lineHeight: "1",   letterSpacing: "0.08em", fontWeight: "600" }],
      },

      /* ─── Vibe OS border radius scale ─── */
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },

      /* ─── Vibe OS shadows ─── */
      boxShadow: {
        pop: "0 8px 32px rgba(0,0,0,0.48)",
      },

      /* ─── Vibe OS 24-col grid ─── */
      gridTemplateColumns: {
        "24": "repeat(24, minmax(0, 1fr))",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
};

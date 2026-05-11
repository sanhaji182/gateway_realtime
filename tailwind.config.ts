import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        hover: "var(--bg-hover)",
        subtle: "var(--bg-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
        accent: "var(--accent)",
        "accent-subtle": "var(--accent-subtle)",
        "accent-hover": "var(--accent-hover)",
        success: "var(--success)",
        "success-subtle": "var(--success-subtle)",
        warning: "var(--warning)",
        "warning-subtle": "var(--warning-subtle)",
        error: "var(--error)",
        "error-subtle": "var(--error-subtle)",
        info: "var(--info)",
        "info-subtle": "var(--info-subtle)",
        teal: "var(--teal)",
        "teal-subtle": "var(--teal-subtle)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius-md)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
      },
    },
  },
  plugins: [],
};

export default config;

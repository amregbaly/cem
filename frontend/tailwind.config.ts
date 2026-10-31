import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary, #1E3A8A)",
          foreground: "var(--color-primary-foreground, #FFFFFF)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary, #3B82F6)",
          foreground: "var(--color-secondary-foreground, #FFFFFF)",
        },
        accent: {
          DEFAULT: "var(--color-accent, #0D9488)",
          foreground: "var(--color-accent-foreground, #FFFFFF)",
        },
        cemeteryBg: "var(--color-bg, #F8FAFC)",
        surface: "var(--color-surface, #FFFFFF)",
        cemeteryText: "var(--color-text, #0F172A)",
        cemeteryBorder: "var(--color-border, #E2E8F0)",
      },
    },
  },
  plugins: [],
};
export default config;

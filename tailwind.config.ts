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
        // Integrity deep blue — primary #0B3D91
        brand: {
          50:  "#E8F0FA",
          100: "#D0E1F5",
          200: "#A1C3EB",
          300: "#72A5E1",
          400: "#4387D7",
          500: "#1A5FBD",
          600: "#0D4BA3",
          700: "#0B3D91",
          800: "#093275",
          900: "#07275A",
          950: "#041A3D",
        },
        // Growth green — accent #00A651
        accent: {
          50:  "#E6F7EE",
          100: "#CCEFDD",
          200: "#99DFBB",
          300: "#66CF99",
          400: "#33BF77",
          500: "#00A651",
          600: "#008A43",
          700: "#006E36",
          800: "#005228",
          900: "#00361B",
        },
        page: "#F4F7FB",
        // Light portal sidebar (Pencil mockup)
        sidebar: {
          bg:     "#FFFFFF",
          hover:  "#F8FAFC",
          active: "#EFF6FF",
          text:   "#64748B",
          heading:"#94A3B8",
          border: "#E8EDF2",
        },
        // Pastel KPI card fills (PNG patterns)
        pastel: {
          pink:   "#FCE7F3",
          orange: "#FFEDD5",
          mint:   "#D1FAE5",
          blue:   "#DBEAFE",
          purple: "#EDE9FE",
          peach:  "#FFF1E6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.1)",
      },
      keyframes: {
        "nav-progress": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        "onboarding-backdrop-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "onboarding-modal-in": {
          from: { opacity: "0", transform: "scale(0.94) translateY(10px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "onboarding-icon-pop": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "70%": { transform: "scale(1.06)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "onboarding-sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0.4) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(12deg)" },
        },
      },
      animation: {
        "nav-progress": "nav-progress 1s ease-in-out infinite",
        "onboarding-backdrop-in": "onboarding-backdrop-in 0.28s ease-out forwards",
        "onboarding-modal-in":
          "onboarding-modal-in 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "onboarding-icon-pop":
          "onboarding-icon-pop 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards",
        "onboarding-sparkle": "onboarding-sparkle 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

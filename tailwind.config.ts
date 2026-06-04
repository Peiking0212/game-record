import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        convo: {
          sky: "#2BC5F6",
          "sky-hover": "#1AB0E3",
          "sky-light": "#D4F4FF",
          ink: "#2a3544",
          muted: "#666666",
          fog: "#EEEEEE",
          cloud: "#CFCFCF",
          slate: "#999999",
          night: "#131415",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        convo: "1.25rem",
        pill: "9999px",
      },
      boxShadow: {
        brutal: "0 1px 0 rgba(42, 53, 68, 0.08), 0 6px 20px rgba(42, 53, 68, 0.06)",
        "brutal-lg": "0 2px 0 rgba(42, 53, 68, 0.1), 0 10px 26px rgba(42, 53, 68, 0.09)",
      },
      letterSpacing: {
        display: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;

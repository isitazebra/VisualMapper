import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm paper tones from the prototype design system
        paper: {
          bg: "#f3f1ec",
          DEFAULT: "#faf8f5",
          cream: "#edeae3",
        },
        border: {
          DEFAULT: "#dbd6cb",
          hard: "#c2bdb0",
        },
        ink: {
          DEFAULT: "#1b1914",
          soft: "#5a554b",
          mute: "#999189",
        },
        brand: {
          blue: "#1d4ed8",
          "blue-soft": "#eef2ff",
          purple: "#7c3aed",
          "purple-soft": "#f5f3ff",
          green: "#15803d",
          "green-soft": "#f0fdf4",
          amber: "#a16207",
          "amber-soft": "#fefce8",
          orange: "#c2410c",
          "orange-soft": "#fff7ed",
          red: "#be123c",
          teal: "#0f766e",
          pink: "#be185d",
        },
      },
      fontFamily: {
        sans: ["Karla", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Fira Code", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

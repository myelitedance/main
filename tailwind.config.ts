// tailwind.config.ts (or .js)
import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // Include the web component + any static HTML you ship
    "./public/components/**/*.js",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        "dance-purple": "#8B5CF6",
        "dance-pink": "#EC4899",
        "dance-blue": "#3B82F6",
        "dance-gold": "#F59E0B",
        "dance-green": "#32B486",
      },
      keyframes: {
        "fade-slide": {
          "0%": {
            opacity: "0",
            transform: "translateY(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0px)",
          },
        },
      },
      animation: {
        "fade-slide": "fade-slide 0.35s ease-out",
      },
    },
  },
  safelist: [
    // gradient + text utilities the header uses
    "bg-gradient-to-r",
    "from-dance-purple",
    "via-dance-pink",
    "to-dance-blue",
    "text-dance-purple",
    "text-dance-pink",
    "text-dance-blue",
    "border-dance-blue",
    "border-dance-pink",
  ],
} satisfies Config;
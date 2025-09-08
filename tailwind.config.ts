// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  // v4 auto-scans the project; no `content` array needed
  theme: {
    extend: {
      colors: {
        "dance-purple": "#8B5CF6",
        "dance-pink":   "#EC4899",
        "dance-blue":   "#3B82F6",
      },
      borderRadius: { "2xl": "1rem" }
    },
  },
  plugins: [],
} satisfies Config;
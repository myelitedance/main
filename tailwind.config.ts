// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
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
    },
  },
  plugins: [],
};
export default config;
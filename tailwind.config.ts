/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
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
    },
  },
  plugins: [],
};
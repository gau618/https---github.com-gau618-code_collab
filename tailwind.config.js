/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",         // Next.js App Router pages
    "./pages/**/*.{js,ts,jsx,tsx}",       // Classic Pages directory (if used)
    "./components/**/*.{js,ts,jsx,tsx}",  // All custom components
    "./src/**/*.{js,ts,jsx,tsx}",         // Anything inside `src/` (common)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

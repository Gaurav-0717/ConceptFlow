/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          950: "#070b14",
          900: "#0b1120",
          850: "#0f172a",
          800: "#172033",
          700: "#1e293b",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      boxShadow: {
        'glow-sm': '0 0 16px -2px rgba(99, 102, 241, 0.18)',
        'glow-md': '0 0 24px -4px rgba(99, 102, 241, 0.28)',
        'glow-purple': '0 0 24px -4px rgba(168, 85, 247, 0.24)',
        'card-soft': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 4px 16px -2px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 8px 30px -4px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  plugins: [],
};

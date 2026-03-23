/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffdf0',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        // Remapped to Wix-style light palette
        dark: {
          900: '#F8F9FA',  // page background
          800: '#FFFFFF',  // card background
          700: '#F1F3F5',  // secondary bg / tooltip bg
          600: '#E9ECEF',  // borders
          500: '#DEE2E6',  // subtle borders
        },
        wix: {
          DEFAULT: '#116DFF',
          dark: '#0B56CC',
        },
      },
    },
  },
  plugins: [],
}

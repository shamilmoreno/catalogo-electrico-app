/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        servimeta: {
          50: '#fdf3f3',
          100: '#fbe4e4',
          200: '#f7cdcd',
          300: '#efa8a8',
          400: '#e27676',
          500: '#cd4b4b',
          600: '#9e2626',
          700: '#7a1d1d',
          800: '#601717', // Color exacto del logo "meta c.a."
          900: '#4a1111',
          950: '#290808',
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  // Disable Preflight so MUI base styles aren't overridden
  corePlugins: { preflight: false },
  // important: '#root' ensures Tailwind wins over MUI when both apply
  important: '#root',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fd',
          300: '#a5b8fb',
          400: '#8093f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [],
}

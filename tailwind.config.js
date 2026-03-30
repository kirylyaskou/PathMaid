/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#0f0f0f',
          900: '#141414',
          800: '#1a1a1a',
          700: '#222222',
          600: '#2a2a2a',
          500: '#333333',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light:   '#d4af37',
          dark:    '#a8893b',
          muted:   '#6b5c28',
          glow:    'rgba(201,168,76,0.15)',
        },
        crimson: {
          DEFAULT: '#8b2020',
          light:   '#b03030',
          dark:    '#5c1515',
          muted:   'rgba(139,32,32,0.20)',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        body:    ['system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 12px 2px rgba(201,168,76,0.25)',
        'card':      '0 2px 8px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}

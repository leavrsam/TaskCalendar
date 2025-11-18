/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#d9e9ff',
          200: '#b0d3ff',
          300: '#7fb5ff',
          400: '#4a90ff',
          500: '#1f6aff',
          600: '#0f4edb',
          700: '#0d3da8',
          800: '#0f2f7c',
          900: '#0f275f',
        },
      },
    },
  },
  plugins: [],
}


/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ace: {
          bg: '#0b1020',
          panel: '#111730',
          ink: '#e6ecff',
          muted: '#9aa6c4',
          accent: '#60a5fa',
          danger: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'window': '0 24px 60px -20px rgba(0,0,0,0.55), 0 8px 18px -6px rgba(0,0,0,0.4)',
        'glow': '0 0 0 1px rgba(96,165,250,0.35), 0 8px 32px rgba(96,165,250,0.18)',
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out',
        'fade-out': 'fade-out 0.45s ease-in forwards',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'boot': 'boot 2.6s ease-in-out forwards',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0', visibility: 'hidden' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
        'boot': {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '20%': { transform: 'scale(1)', opacity: '1' },
          '70%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.06)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

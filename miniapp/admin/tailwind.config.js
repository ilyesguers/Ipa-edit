/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
  colors: {
    bg: '#050508',
    panel: '#0d0d14',
    card: '#12121c',
    'card-2': '#1a1a2e',
    border: '#1e1e30',
    neon: '#00d4ff',
    'neon-blue': '#00d4ff',
    'neon-2': '#7c3aed',
    green: '#00ff88',
    red: '#ff3b5c',
    gold: '#ffd700',
    warning: '#f59e0b',
    muted: '#6b7280',
    success: '#10b981',
    purple: '#a855f7',
    'neon-green': '#00ff88',
  },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'count-up': 'count-up 1s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,212,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,212,255,0.6), 0 0 40px rgba(0,212,255,0.3)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      }
    }
  },
  plugins: []
};

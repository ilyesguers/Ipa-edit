/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
  colors: {
    bg: '#0d0f12',
    panel: '#161922',
    card: '#161922',
    'card-2': '#1f2430',
    border: '#2d3748',
    neon: '#10b981',
    'neon-blue': '#3b82f6',
    'neon-2': '#6366f1',
    green: '#10b981',
    red: '#ef4444',
    gold: '#fbbf24',
    warning: '#f59e0b',
    muted: '#6b7280',
    success: '#10b981',
    purple: '#6366f1',
    'neon-green': '#10b981',
  },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'count-up': 'count-up 1s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(16,185,129,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(16,185,129,0.6), 0 0 40px rgba(16,185,129,0.3)' },
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

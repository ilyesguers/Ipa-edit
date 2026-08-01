/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0f12',
        card: '#161922',
        'card-2': '#1f2430',
        border: '#2d3748',
        neon: '#10b981',
        'neon-blue': '#3b82f6',
        'neon-purple': '#6366f1',
        'neon-pink': '#ec4899',
        'neon-green': '#10b981',
        'neon-orange': '#f97316',
        green: '#10b981',
        purple: '#6366f1',
        red: '#ef4444',
        'red-dark': '#dc2626',
        gold: '#fbbf24',
        warning: '#f59e0b',
        success: '#10b981',
        muted: '#6b7280',
      },
      fontFamily: {
        gamer: ['Orbitron', 'Cairo', 'monospace'],
        arabic: ['Cairo', 'sans-serif'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.68,-0.55,0.265,1.55)',
        'shimmer': 'shimmer 1.5s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'rocket': 'rocket 0.6s ease-out',
        'fire': 'fire 0.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px #10b981, 0 0 10px #10b981, 0 0 20px #10b981' },
          '50%': { boxShadow: '0 0 20px #10b981, 0 0 40px #10b981, 0 0 60px #10b981' },
        },
        'glow': {
          '0%': { textShadow: '0 0 10px #10b981, 0 0 20px #10b981' },
          '100%': { textShadow: '0 0 20px #10b981, 0 0 30px #10b981, 0 0 40px #10b981' },
        },
        'rocket': {
          '0%': { transform: 'translateY(20px) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'fire': {
          '0%, 100%': { transform: 'scale(1) rotate(-1deg)' },
          '50%': { transform: 'scale(1.05) rotate(1deg)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'bounce-in': {
          from: { transform: 'scale(0.3)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
      backgroundImage: {
        'gamer-gradient': 'linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #6366f1 100%)',
        'fire-gradient': 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0d0f12 0%, #161922 50%, #1f2430 100%)',
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050508',
        card: '#12121c',
        'card-2': '#1e1e32',
        border: '#2a2a45',
        neon: '#00ff88',
        'neon-blue': '#00d4ff',
        'neon-purple': '#a855f7',
        'neon-pink': '#ff00a0',
        'neon-green': '#00ff88',
        'neon-orange': '#ff8a00',
        green: '#00ff88',
        purple: '#a855f7',
        red: '#ff3b5c',
        'red-dark': '#cc2244',
        gold: '#ffd700',
        warning: '#f59e0b',
        success: '#10b981',
        muted: '#8b8ba7',
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
          '0%, 100%': { boxShadow: '0 0 5px #00ff88, 0 0 10px #00ff88, 0 0 20px #00ff88' },
          '50%': { boxShadow: '0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 60px #00ff88' },
        },
        'glow': {
          '0%': { textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88' },
          '100%': { textShadow: '0 0 20px #00ff88, 0 0 30px #00ff88, 0 0 40px #00ff88' },
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
        'gamer-gradient': 'linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #a855f7 100%)',
        'fire-gradient': 'linear-gradient(135deg, #ff8a00 0%, #ff3b5c 50%, #ff00a0 100%)',
        'dark-gradient': 'linear-gradient(135deg, #050508 0%, #12121c 50%, #1e1e32 100%)',
      }
    }
  },
  plugins: []
};

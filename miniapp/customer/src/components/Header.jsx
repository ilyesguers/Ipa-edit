import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

const THEMES = {
  aurora: { ring: 'ring-cyan-400/30', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20', glow: '0 0 15px rgba(34,211,238,0.15)' },
  emerald: { ring: 'ring-green/30', badge: 'bg-green/10 text-green border-green/20', glow: '0 0 15px rgba(0,255,136,0.15)' },
  velvet: { ring: 'ring-fuchsia-400/30', badge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-400/20', glow: '0 0 15px rgba(217,70,239,0.15)' },
  sunset: { ring: 'ring-orange-400/30', badge: 'bg-orange-500/10 text-orange-300 border-orange-400/20', glow: '0 0 15px rgba(251,146,60,0.15)' },
};

export default function Header() {
  const { user, publicSettings, setActiveTab } = useStore();
  const tg = window.Telegram?.WebApp;
  const avatar = tg?.initDataUnsafe?.user?.photo_url;
  const themeKey = publicSettings?.ui_theme_preset || 'aurora';
  const theme = THEMES[themeKey] || THEMES.aurora;
  const brand = publicSettings?.bot_name || 'Digital Keys';

  return (
    <motion.header initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-[#1a1a1a]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-12"
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 relative gap-3">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('profile')} className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {avatar ? (
              <img src={avatar} alt="avatar" className={`w-10 h-10 rounded-full object-cover ring-2 ${theme.ring}`} />
            ) : (
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-neon/20 to-neon-blue/20 flex items-center justify-center text-lg font-bold text-neon ring-2 ${theme.ring}`}>
                {user?.firstName?.[0] || '?'}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neon rounded-full border-2 border-black">
              <span className="absolute inset-0 bg-neon rounded-full animate-ping opacity-75" />
            </span>
          </div>

          <div className="text-right min-w-0">
            <p className="font-black text-white text-sm leading-none truncate">{brand}</p>
            <p className="text-[11px] text-muted truncate mt-1">{user?.firstName || 'مستخدم'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block border ${theme.badge}`}>
              {user?.role === 'admin' ? '👑 ADMIN' : '🛍️ CUSTOMER'}
            </span>
          </div>
        </motion.button>

        <motion.div whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('profile')} className="rounded-xl px-4 py-2 cursor-pointer group relative overflow-hidden border border-neon/20 bg-neon/10"
          style={{ boxShadow: theme.glow }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-[10px] text-neon/70 text-right">الرصيد</p>
          <p className="text-neon font-black text-lg leading-none glow-green">${(user?.balance || 0).toFixed(2)}</p>
        </motion.div>
      </div>
    </motion.header>
  );
}

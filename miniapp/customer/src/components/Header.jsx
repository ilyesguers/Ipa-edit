import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import { t, cleanMarkdown } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

const THEMES = {
  aurora: { ring: 'ring-cyan-400/40', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20', glow: '0 0 20px rgba(34,211,238,0.25)' },
  emerald: { ring: 'ring-[#10b981]/40', badge: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20', glow: '0 0 20px rgba(16,185,129,0.25)' },
  velvet: { ring: 'ring-fuchsia-400/40', badge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-400/20', glow: '0 0 20px rgba(217,70,239,0.25)' },
  sunset: { ring: 'ring-orange-400/40', badge: 'bg-orange-500/10 text-orange-300 border-orange-400/20', glow: '0 0 20px rgba(251,146,60,0.25)' },
  midnight: { ring: 'ring-[#10b981]/40', badge: 'bg-gradient-to-r from-[#10b981]/15 to-purple-500/15 text-[#10b981] border-[#10b981]/30', glow: '0 0 25px rgba(16,185,129,0.3)' },
};

export default function Header() {
  const { user, publicSettings, setActiveTab, locale } = useStore();
  const tg = window.Telegram?.WebApp;
  const avatar = tg?.initDataUnsafe?.user?.photo_url;
  const theme = THEMES[publicSettings?.ui_theme_preset] || THEMES.midnight;
  const brand = cleanMarkdown(publicSettings?.bot_name) || t(locale, 'brand');

  return (
    <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="sticky top-0 z-40 bg-[#0d0f12]/90 border-b border-[#1f2430]">
      <div className="absolute inset-0 bg-gradient-to-r from-neon/5 via-transparent to-purple/5 pointer-events-none" />
      <div className="flex items-center justify-between px-3 py-3 relative gap-2">
        <motion.button type="button" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('profile')} className="flex items-center gap-3 min-w-0 text-right group">
          <div className="relative shrink-0">
            {avatar ? 
              <div className="relative">
                <img src={avatar} alt="avatar" className={`w-11 h-11 rounded-2xl object-cover ring-2 ${theme.ring} group-hover:ring-neon/60 transition-all`} />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              :
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-neon/30 to-purple/30 flex items-center justify-center text-lg font-black text-white ring-2 ${theme.ring} group-hover:ring-neon/60 transition-all`}>
                {user?.firstName?.[0] || '🎮'}
              </div>
            }
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon rounded-full border-2 border-[#0d0f12] flex items-center justify-center">
              <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
              <span className="absolute inset-0 bg-neon rounded-full animate-ping opacity-40" />
            </span>
          </div>
          <div className="min-w-0 text-left">
            <p className="font-black text-white text-[13px] leading-none truncate flex items-center gap-1">
              <span className="gradient-text font-[Orbitron] tracking-wider">{brand}</span>
              <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="text-[10px]">🔥</motion.span>
            </p>
            <p className="text-[12px] text-white/80 truncate mt-1 font-bold flex items-center gap-1">
              {user?.firstName || t(locale, 'user')} 
              <span className="text-neon">•</span> 
              <span className="text-neon text-[10px]">{t(locale, 'levelUp')}</span>
            </p>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full mt-1 inline-flex items-center gap-1 border ${theme.badge}`}>
              <PremiumIcon name={user?.role === 'admin' ? 'crown' : 'fire'} size="0.9em" /> 
              {user?.role === 'admin' ? t(locale, 'admin') : t(locale, 'customer')}
            </span>
          </div>
        </motion.button>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button type="button" whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.05 }} onClick={() => { haptic.light(); useStore.getState().openLanguagePicker(); }} className="language-switch rounded-xl px-3 py-2.5 border border-[#6366f1]/30 bg-[#6366f1]/10 text-purple-200 text-[11px] font-black hover:bg-[#6366f1]/20 transition-all flex items-center gap-1" aria-label={t(locale, 'language')}>
            <PremiumIcon name="globe" /> {t(locale, 'switchLanguage')}
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05, y: -1 }} onClick={() => setActiveTab('profile')} className="rounded-2xl px-4 py-2.5 border border-neon/30 bg-gradient-to-br from-neon/15 to-neon-blue/10 hover:from-neon/20 hover:to-neon-blue/20 transition-all relative overflow-hidden group" style={{ boxShadow: theme.glow }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <p className="text-[10px] text-neon/80 text-right font-bold tracking-wider relative">{t(locale, 'balance')} 💰</p>
            <p className="text-neon font-black text-[15px] leading-none glow-green relative font-[Orbitron]">${(user?.balance || 0).toFixed(2)}</p>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

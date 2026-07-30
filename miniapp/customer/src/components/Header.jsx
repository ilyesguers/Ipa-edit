import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import { t } from '../i18n';
import PremiumIcon from './PremiumIcon';

const THEMES = {
  aurora: { ring: 'ring-cyan-400/30', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20', glow: '0 0 15px rgba(34,211,238,0.15)' },
  emerald: { ring: 'ring-green/30', badge: 'bg-green/10 text-green border-green/20', glow: '0 0 15px rgba(0,255,136,0.15)' },
  velvet: { ring: 'ring-fuchsia-400/30', badge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-400/20', glow: '0 0 15px rgba(217,70,239,0.15)' },
  sunset: { ring: 'ring-orange-400/30', badge: 'bg-orange-500/10 text-orange-300 border-orange-400/20', glow: '0 0 15px rgba(251,146,60,0.15)' },
  midnight: { ring: 'ring-green-400/30', badge: 'bg-gradient-to-r from-green-500/10 to-purple-500/10 text-green-300 border-green-400/20', glow: '0 0 15px rgba(0,255,136,0.15)' },
};

export default function Header() {
  const { user, publicSettings, setActiveTab, locale, toggleLocale } = useStore();
  const tg = window.Telegram?.WebApp;
  const avatar = tg?.initDataUnsafe?.user?.photo_url;
  const theme = THEMES[publicSettings?.ui_theme_preset] || THEMES.aurora;
  const brand = publicSettings?.bot_name || t(locale, 'brand');

  return (
    <motion.header initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-[#1a1a1a]">
      <div className="flex items-center justify-between px-3 py-2.5 relative gap-2">
        <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('profile')} className="flex items-center gap-2.5 min-w-0 text-right">
          <div className="relative shrink-0">
            {avatar ? <img src={avatar} alt="avatar" className={`w-10 h-10 rounded-full object-cover ring-2 ${theme.ring}`} /> :
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-neon/20 to-neon-blue/20 flex items-center justify-center text-lg font-bold text-neon ring-2 ${theme.ring}`}>{user?.firstName?.[0] || '?'}</div>}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neon rounded-full border-2 border-black"><span className="absolute inset-0 bg-neon rounded-full animate-ping opacity-75" /></span>
          </div>
          <div className="min-w-0">
            <p className="font-black text-white text-sm leading-none truncate">{brand}</p>
            <p className="text-[11px] text-muted truncate mt-1">{user?.firstName || t(locale, 'user')}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1 border ${theme.badge}`}>
              <PremiumIcon name={user?.role === 'admin' ? 'trophy' : 'shopping'} /> {user?.role === 'admin' ? t(locale, 'admin') : t(locale, 'customer')}
            </span>
          </div>
        </motion.button>

        <div className="flex items-center gap-1.5 shrink-0">
          <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => toggleLocale()} className="language-switch rounded-xl px-2.5 py-2 border border-purple/30 bg-purple/10 text-purple-200 text-[10px] font-black" aria-label={t(locale, 'language')}>
            <PremiumIcon name="globe" /> {t(locale, 'switchLanguage')}
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('profile')} className="rounded-xl px-3 py-2 border border-neon/20 bg-neon/10" style={{ boxShadow: theme.glow }}>
            <p className="text-[9px] text-neon/70 text-right">{t(locale, 'balance')}</p>
            <p className="text-neon font-black text-base leading-none glow-green">${(user?.balance || 0).toFixed(2)}</p>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

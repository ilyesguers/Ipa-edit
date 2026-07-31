import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeLocale, t } from '../i18n';
import PremiumIcon from './PremiumIcon';

const TIPS = ['levelUp', 'playNow', 'instantDelivery', 'noCap', 'gg'];
const TIP_ICONS = { levelUp: 'rocket', playNow: 'fire', instantDelivery: 'bolt', noCap: 'crown', gg: 'trophy', legendary: 'crown', hype: 'explosion' };

export default function LoadingScreen() {
  const locale = normalizeLocale(localStorage.getItem('locale') || 'ar');
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTipIndex((value) => (value + 1) % TIPS.length), 2000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="fixed inset-0 bg-[#050508] flex flex-col items-center justify-center z-50 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/10 via-transparent to-purple/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, type: 'spring' }} className="flex flex-col items-center gap-8 relative z-10">
        <div className="relative">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-24 h-24 rounded-[22px]" style={{ background: 'conic-gradient(from 0deg, #00ff88, #00d4ff, #a855f7, #ff3b5c, #00ff88)', padding: '3px' }}>
            <div className="w-full h-full rounded-[20px] bg-[#050508] flex items-center justify-center" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center text-[#00ff88]">
            <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}><PremiumIcon name="rocket" size="2.8rem" /></motion.div>
          </div>
          <motion.div animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-2 -right-2 w-3 h-3 bg-[#00ff88] rounded-full" />
          <motion.div animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#00d4ff] rounded-full" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black text-white font-[Orbitron] tracking-wider"><span className="gradient-text">{t(locale, 'brand')}</span></h1>
          <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[#00ff88] text-sm mt-2 font-black flex items-center justify-center gap-2">
            <PremiumIcon name="fire" /> {t(locale, 'levelUp')} - {t(locale, 'noCap')} <PremiumIcon name="fire" />
          </motion.p>
        </div>

        <div className="h-14 flex items-center justify-center w-72">
          <AnimatePresence mode="wait">
            <motion.div key={tipIndex} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ type: 'spring' }} className="flex items-center gap-2.5 text-center bg-[#12121c]/80 backdrop-blur border border-[#2a2a45] rounded-2xl px-4 py-3 shadow-xl">
              <span className="text-[#00ff88]"><PremiumIcon name={TIP_ICONS[TIPS[tipIndex]] || 'rocket'} /></span>
              <p className="text-[13px] text-white font-bold">{t(locale, TIPS[tipIndex])}</p>
              <span className="text-[#00ff88]">🔥</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div key={i} animate={{ scale: [1, 1.8, 1], opacity: [0.2, 1, 0.2], y: [0, -5, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }} className="w-2.5 h-2.5 rounded-full" style={{ background: i % 2 === 0 ? '#00ff88' : '#00d4ff', boxShadow: `0 0 10px ${i % 2 === 0 ? '#00ff88' : '#00d4ff'}` }} />
          ))}
        </div>

        <p className="text-[10px] text-[#666] font-bold tracking-[2px]">LOADING LEGEND ZONE... 🎮</p>
      </motion.div>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { localizedName, t } from '../i18n';
import PremiumIcon from './PremiumIcon';

export default function ProductCard({ product, index = 0, locale = 'ar', onSelect, compact = false }) {
  const activeDurations = product.durations?.filter((duration) => duration.isActive) || [];
  const minPrice = activeDurations.reduce((min, duration) => Math.min(min, Number(duration.price)), Infinity);
  const hasStock = activeDurations.some((duration) => duration.stockCount > 0 || duration.inStock);
  const isFeatured = product.isFeatured || product.featured;
  const shareText = encodeURIComponent(`${localizedName(product, locale)}\n${t(locale, 'browseGames')}`);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location?.href || '')}&text=${shareText}`;

  if (compact) return (
    <motion.button type="button" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} whileTap={{ scale: 0.97 }} onClick={onSelect} className="w-full flex items-center gap-3 gamer-card rounded-2xl p-3.5 text-right group hover:border-[#00ff88]/40">
      {product.logo ? <img src={product.logo} alt={localizedName(product, locale)} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 ring-1 ring-[#2a2a45]" /> : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/20 flex items-center justify-center"><PremiumIcon name="gem" size="1.6rem" className="text-[#00ff88]" /></div>}
      <div className="flex-1 min-w-0"><p className="font-black text-[13px] text-white truncate">{localizedName(product, locale)}</p><p className="text-xs text-[#00d4ff] font-bold">${Number.isFinite(minPrice) ? minPrice.toFixed(2) : '—'} • {t(locale, 'playNow')}</p></div>
      <div className="w-8 h-8 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center text-[#00ff88] group-hover:bg-[#00ff88]/20 transition-colors"><PremiumIcon name={locale === 'ar' ? 'left' : 'right'} /></div>
    </motion.button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, type: 'spring' }} className="relative group">
      <motion.button type="button" whileTap={{ scale: 0.97 }} whileHover={{ y: -3 }} onClick={onSelect} className="w-full gamer-card rounded-[22px] p-4 text-right overflow-hidden relative transition-all hover:shadow-2xl">
        {isFeatured && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#a855f7] rounded-t-[22px]" />}
        {isFeatured && <div className="absolute top-2 right-2 bg-gradient-to-r from-[#ffd700] to-[#ff8a00] text-black text-[8px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">FEATURED 🔥</div>}
        <div className="flex items-start gap-3.5">
          {product.logo ? (
            <div className="relative">
              <img src={product.logo} alt={localizedName(product, locale)} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 ring-1 ring-[#2a2a45] group-hover:ring-[#00ff88]/30 transition-all shadow-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00ff88] rounded-full border-2 border-[#12121c] flex items-center justify-center text-[10px] text-black font-black">✓</div>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00ff88]/20 via-[#00d4ff]/15 to-purple/20 flex items-center justify-center flex-shrink-0 ring-1 ring-[#2a2a45] group-hover:ring-[#00ff88]/30 transition-all">
              <PremiumIcon name="gem" size="1.8rem" className="text-[#00ff88] group-hover:scale-110 transition-transform" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col items-start">
                <h3 className="font-black text-white text-[14px] leading-tight group-hover:text-[#00ff88] transition-colors">{localizedName(product, locale)}</h3>
                {isFeatured && <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/20 mt-1"><PremiumIcon name="crown" size="0.8em" /> LEGENDARY</span>}
              </div>
              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full border ${hasStock ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.15)]' : 'bg-red/10 text-red border-red/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasStock ? 'bg-[#00ff88] animate-pulse' : 'bg-red'}`} />
                {hasStock ? 'LIVE' : 'OUT'}
              </span>
            </div>
            {product.features?.slice(0, 2).map((feature, featureIndex) => (
              <p key={featureIndex} className="text-[11px] text-[#8b8ba7] mt-1 flex items-center gap-1">
                <span className="text-[#00ff88] text-[8px]">●</span> {feature.text}
              </p>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-[#1e1e32]">
          <div className="flex items-center gap-2">
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="w-9 h-9 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple-300 hover:bg-purple/20 hover:text-white transition-all">
              <PremiumIcon name="chat" />
            </a>
            <div className="flex items-center gap-1 text-[10px] text-[#8b8ba7] bg-[#050508]/50 px-2.5 py-1 rounded-full border border-[#1e1e32]">
              <PremiumIcon name="fire" className="text-orange-400" size="0.9em" /> {activeDurations.length} opts
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-[#8b8ba7] font-bold tracking-wider">{locale === 'en' ? 'FROM' : 'يبدأ من'}</p>
              <p className="text-[#00d4ff] font-black text-[18px] leading-none glow-blue font-[Orbitron]">${Number.isFinite(minPrice) ? minPrice.toFixed(2) : '—'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-black shadow-lg shadow-[#00ff88]/20 group-hover:shadow-[#00ff88]/40 group-hover:scale-110 transition-all">
              <PremiumIcon name={locale === 'ar' ? 'left' : 'right'} size="1.1em" />
            </div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

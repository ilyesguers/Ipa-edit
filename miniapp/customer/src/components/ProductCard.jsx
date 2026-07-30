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
    <motion.button type="button" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} whileTap={{ scale: 0.97 }} onClick={onSelect} className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-right">
      {product.logo ? <img src={product.logo} alt={localizedName(product, locale)} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" /> : <PremiumIcon name="key" size="2rem" className="text-neon flex-shrink-0" />}
      <div className="flex-1 min-w-0"><p className="font-bold text-sm text-white truncate">{localizedName(product, locale)}</p><p className="text-xs text-neon-blue font-semibold">{t(locale, 'subtotal')} ${Number.isFinite(minPrice) ? minPrice.toFixed(2) : '—'}</p></div>
      <PremiumIcon name="left" className="text-muted" />
    </motion.button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="relative">
      <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onSelect} className="w-full bg-card border border-border rounded-2xl p-4 text-right group overflow-hidden relative transition-all hover:border-neon-blue/30">
        {isFeatured && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon via-neon-blue to-purple rounded-t-2xl" />}
        <div className="flex items-start gap-3">
          {product.logo ? <img src={product.logo} alt={localizedName(product, locale)} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-1 ring-border" /> : <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] flex items-center justify-center flex-shrink-0"><PremiumIcon name="key" size="2rem" className="text-neon" /></div>}
          <div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><div className="flex flex-col items-start">{isFeatured && <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 mb-1"><PremiumIcon name="trophy" /> {t(locale, 'featured')}</span>}<h3 className="font-black text-white text-base leading-tight">{localizedName(product, locale)}</h3></div><span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${hasStock ? 'bg-neon/10 text-neon' : 'bg-red/10 text-red'}`}><PremiumIcon name={hasStock ? 'check' : 'skull'} /> {hasStock ? t(locale, 'available') || (locale === 'en' ? 'Available' : 'متاح') : (locale === 'en' ? 'Out' : 'نفد')}</span></div>{product.features?.slice(0, 2).map((feature, featureIndex) => <p key={featureIndex} className="text-[10px] text-muted mt-0.5">{feature.text}</p>)}</div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border"><a href={shareUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="w-8 h-8 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple-200"><PremiumIcon name="chat" /></a><div className="flex items-center gap-3"><div className="text-right"><p className="text-[10px] text-muted">{locale === 'en' ? 'From' : 'من'}</p><p className="text-neon-blue font-black text-lg leading-none glow-blue">${Number.isFinite(minPrice) ? minPrice.toFixed(2) : '—'}</p></div><div className="w-8 h-8 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue"><PremiumIcon name="left" /></div></div></div>
      </motion.button>
    </motion.div>
  );
}

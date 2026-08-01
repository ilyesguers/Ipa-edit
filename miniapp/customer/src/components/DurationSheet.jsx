import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import { localizedName, t } from '../i18n';
import PremiumIcon from './PremiumIcon';

export default function DurationSheet() {
  const { selectedProduct, selectDuration, locale } = useStore();
  if (!selectedProduct) return null;
  const durations = selectedProduct.durations?.filter((duration) => duration.isActive) || [];
  const maxDiscount = durations.reduce((max, duration) => duration.originalPrice > duration.price ? Math.max(max, Math.round(((duration.originalPrice - duration.price) / duration.originalPrice) * 100)) : max, 0);
  const close = () => useStore.setState({ showDurationSheet: false });
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 bg-black/80 z-40" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2} onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 500) close(); }} className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-[32px] max-h-[88vh] overflow-hidden flex flex-col border-[#10b981]/20">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#10b981] via-[#3b82f6] to-[#6366f1]" />
        <div className="flex justify-center pt-4 pb-2"><div className="w-12 h-1.5 rounded-full bg-[#2d3748]" /></div>
        <div className="px-5 pb-4 border-b border-[#1f2430]">
          <div className="flex gap-3.5 items-start">
            {selectedProduct.logo ? <img src={selectedProduct.logo} alt={localizedName(selectedProduct, locale)} className="w-14 h-14 rounded-2xl object-cover ring-1 ring-[#2d3748]" /> : <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#3b82f6]/20 flex items-center justify-center"><PremiumIcon name="gem" size="1.8rem" className="text-[#10b981]" /></div>}
            <div className="flex-1">
              <h2 className="font-black text-white text-[18px] leading-tight">{localizedName(selectedProduct, locale)}</h2>
              <div className="flex items-center gap-2 mt-2">
                {maxDiscount > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/20"><PremiumIcon name="fire" /> −{maxDiscount}% OFF 🔥</span>}
                <span className="text-[10px] bg-[#10b981]/10 text-[#10b981] px-2 py-1 rounded-full border border-[#10b981]/20 font-black">INSTANT 🚀</span>
              </div>
              {selectedProduct.features?.slice(0, 2).map((feature, index) => <p key={index} className="text-xs text-[#9ca3af] mt-1 flex items-center gap-1"><span className="text-[#10b981]">✓</span> {feature.text}</p>)}
            </div>
          </div>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <p className="text-xs text-[#10b981] font-black tracking-wider flex items-center gap-2"><PremiumIcon name="rocket" /> {locale === 'en' ? 'CHOOSE YOUR POWER LEVEL:' : 'اختر قوتك:'} ⚡</p>
          <div className="space-y-3">
            {durations.map((duration, index) => <DurationRow key={duration._id} duration={duration} index={index} locale={locale} onSelect={() => (duration.stockCount > 0 || duration.inStock) && selectDuration(duration)} />)}
          </div>
          <p className="text-center text-[11px] text-[#6b7280] mt-6 flex items-center justify-center gap-2"><PremiumIcon name="fire" /> {t(locale, 'levelUp')} - {t(locale, 'gg')} 👑</p>
        </div>
      </motion.div>
    </>
  );
}
function DurationRow({ duration, index, locale, onSelect }) {
  const inStock = duration.stockCount > 0 || duration.inStock;
  const hasDiscount = duration.originalPrice > duration.price;
  const discount = hasDiscount ? Math.round(((duration.originalPrice - duration.price) / duration.originalPrice) * 100) : 0;
  return (
    <motion.button type="button" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} whileTap={{ scale: 0.97 }} whileHover={{ y: -2, scale: 1.01 }} onClick={onSelect} disabled={!inStock} className={`w-full rounded-[20px] p-4 flex items-center justify-between border-2 transition-all relative overflow-hidden ${inStock ? 'bg-gradient-to-br from-[#161922] to-[#1f2430] border-[#2d3748] hover:border-[#10b981]/50 hover:shadow-xl hover:shadow-[#10b981]/10' : 'bg-[#0d0f12] border-[#1f2430]/50 opacity-60'}`}>
      {inStock && <div className="absolute inset-0 bg-gradient-to-r from-[#10b981]/0 via-[#10b981]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />}
      <div className="text-right relative">
        <div className="flex items-center gap-2"><p className="font-black text-white text-[15px]">{localizedName(duration, locale)}</p>{discount > 0 && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#ef4444] text-white animate-pulse">−{discount}%</span>}</div>
        {hasDiscount && <p className="text-xs text-[#6b7280] line-through">${Number(duration.originalPrice).toFixed(2)}</p>}
        <p className="text-[#3b82f6] font-black text-[22px] glow-blue font-[Orbitron] mt-1">${Number(duration.price).toFixed(2)}</p>
      </div>
      <div className="flex flex-col items-end gap-2 relative">
        {inStock ? (
          <>
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-3 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"><span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse" /> {duration.stockCount > 99 ? '99+' : duration.stockCount} LIVE</span>
            <span className="bg-gradient-to-r from-[#10b981] to-[#3b82f6] text-black text-xs font-black px-5 py-2.5 rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-[#10b981]/20"><PremiumIcon name="rocket" /> {locale === 'en' ? 'SELECT' : 'اختيار'} 🚀</span>
          </>
        ) : (
          <span className="text-[11px] font-black px-4 py-2 rounded-xl bg-[#1f2430] text-[#6b7280] border border-[#2d3748]">{locale === 'en' ? 'OUT 😅' : 'خلص 😅'}</span>
        )}
      </div>
    </motion.button>
  );
}

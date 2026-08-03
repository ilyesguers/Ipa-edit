import React from 'react';
import useStore from '../store/useStore';
import { cleanDisplayText, localizedName, t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

export default function DurationSheet() {
  const { selectedProduct, selectDuration, locale } = useStore();
  if (!selectedProduct) return null;

  const durations = selectedProduct.durations?.filter((duration) => duration.isActive) || [];
  const close = () => useStore.setState({ showDurationSheet: false });

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-black/75 border-0" onClick={close} aria-label={t(locale, 'cancel')} />
      <section className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-[24px] max-h-[86dvh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={localizedName(selectedProduct, locale)}>
        <div className="flex justify-center py-3"><span className="w-10 h-1 rounded-full bg-[#2d3748]" /></div>
        <div className="px-5 pb-6">
          <div className="flex items-start gap-3 pb-4 border-b border-[#2d3748]">
            {selectedProduct.logo ? <img src={selectedProduct.logo} alt="" className="w-14 h-14 rounded-2xl object-cover" /> : <span className="w-14 h-14 rounded-2xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center"><PremiumIcon name="key" size="1.6rem" /></span>}
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-[17px] font-black text-white">{localizedName(selectedProduct, locale)}</h2>
              {selectedProduct.features?.slice(0, 2).map((feature, index) => <p key={index} className="m-0 mt-1 text-xs text-[#9ca3af]">{cleanDisplayText(feature.text)}</p>)}
            </div>
            <button type="button" onClick={close} className="w-10 h-10 min-h-0 p-0 rounded-xl border border-[#2d3748] bg-[#161922] text-[#9ca3af]" aria-label={t(locale, 'cancel')}>×</button>
          </div>

          <div className="section-heading mt-5"><PremiumIcon name="key" /><h3>{locale === 'ar' ? 'اختر المدة' : 'Choose an option'}</h3></div>
          <div className="space-y-3">
            {durations.map((duration) => <DurationRow key={duration._id} duration={duration} locale={locale} onSelect={() => {
              if (duration.stockCount > 0 || duration.inStock) {
                haptic.light();
                selectDuration(duration);
              }
            }} />)}
          </div>
          {!durations.length && <p className="text-center text-sm text-[#9ca3af] py-8">{t(locale, 'noProducts')}</p>}
        </div>
      </section>
    </>
  );
}

function DurationRow({ duration, locale, onSelect }) {
  const inStock = duration.stockCount > 0 || duration.inStock;
  const hasDiscount = Number(duration.originalPrice) > Number(duration.price);
  const discount = hasDiscount ? Math.round(((duration.originalPrice - duration.price) / duration.originalPrice) * 100) : 0;

  return (
    <button type="button" onClick={onSelect} disabled={!inStock} className={`w-full min-h-0 p-4 flex items-center justify-between gap-4 text-start rounded-2xl border ${inStock ? 'bg-[#161922] border-[#2d3748] hover:border-[#10b981]/50' : 'bg-[#11141a] border-[#1f2430] opacity-55'}`}>
      <span className="min-w-0">
        <strong className="block text-white text-[14px]">{localizedName(duration, locale)}</strong>
        {hasDiscount && <small className="block mt-1 text-[#9ca3af] line-through">${Number(duration.originalPrice).toFixed(2)}</small>}
        <b className="block mt-1 text-[#60a5fa] text-[20px]">${Number(duration.price).toFixed(2)}</b>
      </span>
      <span className="flex items-center gap-2 flex-none">
        {discount > 0 && <span className="text-[10px] font-black px-2 py-1 rounded-full text-[#fca5a5] bg-[#ef4444]/10">−{discount}%</span>}
        {inStock ? <span className="w-9 h-9 rounded-xl bg-[#10b981] text-[#06110b] flex items-center justify-center"><PremiumIcon name={locale === 'ar' ? 'left' : 'right'} /></span> : <span className="text-[11px] text-[#9ca3af]">{locale === 'ar' ? 'غير متاح' : 'Unavailable'}</span>}
      </span>
    </button>
  );
}

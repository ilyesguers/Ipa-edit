import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { cleanDisplayText, t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';
import { haptic } from '../../utils/haptic';

export default function MyKeysTab() {
  const { locale } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedFetch('my-keys', async () => (await api.get('/orders/my-keys')).data.data, 45 * 1000, { persist: true })
      .then((data) => setOrders(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copy = (value) => navigator.clipboard.writeText(value).then(() => {
    haptic.success();
    toast.success(t(locale, 'toastCopied'));
  }).catch(() => toast.error(t(locale, 'failed')));

  const copyAll = () => copy(orders.flatMap((order) => order.keyValues || []).join('\n'));

  if (loading) return <div className="store-page space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl skeleton" />)}</div>;
  if (!orders.length) {
    return (
      <div className="store-page empty-state">
        <PremiumIcon name="key" size="2rem" />
        <strong>{t(locale, 'noKeys')}</strong>
        <p>{t(locale, 'buyFirst')}</p>
        <button type="button" onClick={() => useStore.getState().setActiveTab('products')} className="px-5 rounded-xl bg-[#10b981] text-[#06110b] font-black">
          {t(locale, 'browseGames')}
        </button>
      </div>
    );
  }

  return (
    <div className="store-page space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="section-heading mb-0"><PremiumIcon name="key" /><h2>{t(locale, 'myKeys')} ({orders.length})</h2></div>
        <button type="button" onClick={copyAll} className="min-h-0 px-3 py-2 rounded-xl bg-[#10b981]/10 text-[#6ee7b7] border border-[#10b981]/25 text-[11px] font-black inline-flex gap-1.5 items-center">
          <PremiumIcon name="copy" /> {t(locale, 'copyAll')}
        </button>
      </div>

      {orders.map((order) => (
        <section key={order._id} className="gamer-card rounded-2xl overflow-hidden">
          <header className="flex items-center justify-between gap-3 p-4 border-b border-[#2d3748]">
            <div className="min-w-0 flex items-center gap-2">
              <span className="w-9 h-9 flex-none rounded-xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center"><PremiumIcon name="key" /></span>
              <div className="min-w-0">
                <strong className="block truncate text-[13px]">{cleanDisplayText(order.productName)}</strong>
                <small className="block truncate text-[#9ca3af]">{cleanDisplayText(order.durationName)} · ${Number(order.finalPrice || 0).toFixed(2)}</small>
              </div>
            </div>
            <small className="flex-none text-[#9ca3af]">{new Date(order.createdAt).toLocaleDateString(t(locale, 'dateLocale'))}</small>
          </header>
          <div className="p-3 space-y-2">
            {(order.keyValues || []).map((key, index) => (
              <div key={`${key}-${index}`} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#11141a] border border-[#2d3748]">
                <PremiumIcon name="key" className="text-[#10b981]" />
                <code className="min-w-0 flex-1 break-all text-[11px] text-[#d1fae5]">{key}</code>
                <button type="button" onClick={() => copy(key)} className="w-10 h-10 min-h-0 flex-none rounded-lg text-[#6ee7b7] border border-[#10b981]/25 bg-[#10b981]/10" aria-label={t(locale, 'copyAll')}><PremiumIcon name="copy" /></button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';
import { haptic } from '../../utils/haptic';

export default function MyKeysTab() {
  const { locale } = useStore(); const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Cached 45s + persisted locally: switching tabs never re-fetches from network,
    // and keys are visible instantly even after a full reload.
    cachedFetch('my-keys', async () => (await api.get('/orders/my-keys')).data.data, 45 * 1000, { persist: true })
      .then((data) => setOrders(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const copyKey = (key) => navigator.clipboard.writeText(key).then(() => { haptic.success(); toast.success(`✅ ${t(locale, 'toastCopied')}`); });
  const copyAll = () => {
    const all = orders.flatMap(o => o.keyValues || []).join('\n');
    navigator.clipboard.writeText(all).then(() => { haptic.success(); toast.success(`✅ ${t(locale, 'toastCopied')}`); });
  };
  if (loading) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-[20px] skeleton" />)}</div>;
  if (!orders.length) return <div className="flex flex-col items-center justify-center h-72 gap-5 p-6 text-center"><motion.div animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}><PremiumIcon name="ghost" size="4.5rem" className="text-[#10b981]/60" /></motion.div><p className="font-black text-white text-lg">{t(locale, 'noKeys')} 👀</p><p className="text-[#9ca3af] text-sm font-bold">{t(locale, 'buyFirst')} 🚀</p><motion.button whileTap={{ scale: 0.95 }} onClick={() => useStore.getState().setActiveTab('products')} className="btn-neon px-6 py-3 rounded-2xl font-black text-sm">🚀 PLAY NOW - Become Legend 👑</motion.button></div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="section-heading mb-0"><PremiumIcon name="crown" /><h2>{t(locale, 'myKeys')} ({orders.length}) 👑</h2></div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={copyAll} className="text-[11px] font-black bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-3 py-2 rounded-xl hover:bg-[#10b981]/20 transition-all flex items-center gap-1">
          <PremiumIcon name="copy" /> {t(locale, 'copyAll')} 📋
        </motion.button>
      </div>
      {orders.map((order, index) => (
        <motion.div key={order._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -2 }} className="gamer-card rounded-[22px] overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-[#1f2430] bg-gradient-to-r from-[#161922] to-[#1f2430]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10b981]/20 to-[#3b82f6]/15 flex items-center justify-center text-[#10b981] border border-[#2d3748]"><PremiumIcon name="gem" /></div>
              <div><p className="font-black text-white text-[13px] flex items-center gap-1">{order.productName} <PremiumIcon name="fire" size="0.8em" className="text-orange-400" /></p><p className="text-xs text-[#9ca3af] font-bold">{order.durationName} • ${Number(order.finalPrice || 0).toFixed(2)} • <span className="text-[#10b981]">LEGENDARY 👑</span></p></div>
            </div>
            <div className="text-right"><p className="text-xs text-[#10b981] font-black">{new Date(order.createdAt).toLocaleDateString(t(locale, 'dateLocale'))}</p><p className="text-[10px] text-[#6b7280] font-mono bg-[#0d0f12] px-2 py-0.5 rounded-full border border-[#1f2430] mt-1">#{order.orderNumber?.slice(-6)} 🔑</p></div>
          </div>
          <div className="p-4 space-y-2.5">
            {order.keyValues?.map((key, keyIndex) => (
              <div key={keyIndex} className="flex items-center gap-2.5 bg-[#0d0f12] border border-[#10b981]/20 rounded-2xl p-3 group hover:border-[#10b981]/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981] flex-shrink-0"><PremiumIcon name="key" size="0.9em" /></div>
                <p className="flex-1 font-mono text-xs text-[#10b981] break-all font-bold tracking-wide">{key}</p>
                <motion.button type="button" whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.1 }} onClick={() => copyKey(key)} className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] hover:bg-[#10b981]/20 transition-all">
                  <PremiumIcon name="copy" />
                </motion.button>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

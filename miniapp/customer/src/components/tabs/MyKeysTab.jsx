import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';

export default function MyKeysTab() {
  const { locale } = useStore(); const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/orders/my-keys').then((res) => setOrders(res.data.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  const copyKey = (key) => navigator.clipboard.writeText(key).then(() => toast.success(`🔥 ${t(locale, 'toastCopied')}`));
  const copyAll = () => {
    const all = orders.flatMap(o => o.keyValues || []).join('\n');
    navigator.clipboard.writeText(all).then(() => toast.success('🔥 All keys copied legend! 👑'));
  };
  if (loading) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-[20px] skeleton" />)}</div>;
  if (!orders.length) return <div className="flex flex-col items-center justify-center h-72 gap-5 p-6 text-center"><motion.div animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}><PremiumIcon name="ghost" size="4.5rem" className="text-[#00ff88]/60" /></motion.div><p className="font-black text-white text-lg">{t(locale, 'noKeys')} 👀</p><p className="text-[#8b8ba7] text-sm font-bold">{t(locale, 'buyFirst')} 🚀</p><motion.button whileTap={{ scale: 0.95 }} onClick={() => useStore.getState().setActiveTab('products')} className="btn-neon px-6 py-3 rounded-2xl font-black text-sm">🚀 PLAY NOW - Become Legend 👑</motion.button></div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="section-heading mb-0"><PremiumIcon name="crown" /><h2>{t(locale, 'myKeys')} ({orders.length}) 👑</h2></div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={copyAll} className="text-[11px] font-black bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 px-3 py-2 rounded-xl hover:bg-[#00ff88]/20 transition-all flex items-center gap-1">
          <PremiumIcon name="copy" /> {t(locale, 'copyAll')} 📋
        </motion.button>
      </div>
      {orders.map((order, index) => (
        <motion.div key={order._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -2 }} className="gamer-card rounded-[22px] overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-[#1e1e32] bg-gradient-to-r from-[#12121c] to-[#1a1a2e]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/15 flex items-center justify-center text-[#00ff88] border border-[#2a2a45]"><PremiumIcon name="gem" /></div>
              <div><p className="font-black text-white text-[13px] flex items-center gap-1">{order.productName} <PremiumIcon name="fire" size="0.8em" className="text-orange-400" /></p><p className="text-xs text-[#8b8ba7] font-bold">{order.durationName} • ${Number(order.finalPrice || 0).toFixed(2)} • <span className="text-[#00ff88]">LEGENDARY 👑</span></p></div>
            </div>
            <div className="text-right"><p className="text-xs text-[#00ff88] font-black">{new Date(order.createdAt).toLocaleDateString(t(locale, 'dateLocale'))}</p><p className="text-[10px] text-[#666] font-mono bg-[#050508] px-2 py-0.5 rounded-full border border-[#1e1e32] mt-1">#{order.orderNumber?.slice(-6)} 🔑</p></div>
          </div>
          <div className="p-4 space-y-2.5">
            {order.keyValues?.map((key, keyIndex) => (
              <div key={keyIndex} className="flex items-center gap-2.5 bg-[#050508] border border-[#00ff88]/20 rounded-2xl p-3 group hover:border-[#00ff88]/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center text-[#00ff88] flex-shrink-0"><PremiumIcon name="key" size="0.9em" /></div>
                <p className="flex-1 font-mono text-xs text-[#00ff88] break-all font-bold tracking-wide">{key}</p>
                <motion.button type="button" whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.1 }} onClick={() => copyKey(key)} className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center text-[#00ff88] hover:bg-[#00ff88]/20 transition-all">
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

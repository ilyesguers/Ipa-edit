import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import useStore from '../../store/useStore';
import { t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';

const STATUS_KEYS = { completed: 'completed', pending: 'pending', processing: 'processing', failed: 'failed', cancelled: 'cancelled', refunded: 'refunded' };

export default function HistoryTab() {
  const { locale } = useStore();
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1);
  const fetchOrders = async (nextPage = 1) => { setLoading(true); try { const res = await api.get(`/orders?page=${nextPage}&limit=10`); setOrders((current) => nextPage === 1 ? (res.data.data || []) : [...current, ...(res.data.data || [])]); setTotalPages(res.data.totalPages || 1); } catch (_) {} finally { setLoading(false); } };
  useEffect(() => { fetchOrders(); }, []);
  if (loading && page === 1) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-[20px] skeleton" />)}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="section-heading"><PremiumIcon name="crown" /><h2>{t(locale, 'orderHistory')} 👑</h2><span className="ml-auto text-[10px] bg-[#00ff88]/10 text-[#00ff88] px-2.5 py-1 rounded-full border border-[#00ff88]/20 font-black">{orders.length} ORDERS 🚀</span></div>
      {orders.length === 0 && !loading ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-16">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}><PremiumIcon name="ghost" size="3.5rem" className="mb-4 text-[#00ff88]/60 mx-auto" /></motion.div>
          <p className="text-white font-black">{t(locale, 'noOrders')} 👀</p>
          <p className="text-muted text-sm mt-2">ابدأ رحلتك الأسطورية الآن! 🚀🔥</p>
        </motion.div>
      ) : orders.map((order, index) => <OrderRow key={order._id} order={order} index={index} locale={locale} />)}
      {page < totalPages && <motion.button type="button" whileTap={{ scale: 0.97 }} whileHover={{ y: -1 }} onClick={() => { const next = page + 1; setPage(next); fetchOrders(next); }} disabled={loading} className="w-full py-3.5 rounded-2xl text-[13px] font-black text-[#00ff88] border border-[#00ff88]/20 bg-[#00ff88]/10 hover:bg-[#00ff88]/20 transition-all">{loading ? t(locale, 'loading') : `🔥 ${t(locale, 'loadMore')} - LEVEL UP 🚀`}</motion.button>}
    </div>
  );
}

function OrderRow({ order, index, locale }) {
  const statusKey = STATUS_KEYS[order.status] || 'pending';
  const statusConfig = {
    completed: { color: '#00ff88', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/20', icon: 'trophy', label: 'LEGEND ✅' },
    pending: { color: '#f0b90b', bg: 'bg-[#f0b90b]/10', border: 'border-[#f0b90b]/20', icon: 'bolt', label: 'PENDING ⏳' },
    processing: { color: '#00d4ff', bg: 'bg-[#00d4ff]/10', border: 'border-[#00d4ff]/20', icon: 'rocket', label: 'ROCKET 🚀' },
    failed: { color: '#ff3b5c', bg: 'bg-[#ff3b5c]/10', border: 'border-[#ff3b5c]/20', icon: 'skull', label: 'FAILED ❌' },
    cancelled: { color: '#8b8ba7', bg: 'bg-[#8b8ba7]/10', border: 'border-[#8b8ba7]/20', icon: 'ghost', label: 'CANCELLED' },
    refunded: { color: '#ffd700', bg: 'bg-[#ffd700]/10', border: 'border-[#ffd700]/20', icon: 'wallet', label: 'REFUNDED 💰' }
  }[statusKey];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} whileHover={{ y: -2, scale: 1.01 }} className="gamer-card rounded-[20px] p-4 flex items-center gap-3.5 group hover:border-[#00ff88]/30">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/15 flex items-center justify-center text-[#00ff88] border border-[#2a2a45] group-hover:border-[#00ff88]/30 transition-all">
        <PremiumIcon name="gem" size="1.5rem" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-[13px] truncate flex items-center gap-1.5">{order.productName} <PremiumIcon name="fire" size="0.8em" className="text-orange-400" /></p>
        <p className="text-xs text-[#8b8ba7] font-bold">{order.durationName} × {order.quantity} • {new Date(order.createdAt).toLocaleDateString(t(locale, 'dateLocale'))}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusConfig.bg} ${statusConfig.border}`} style={{ color: statusConfig.color }}><PremiumIcon name={statusConfig.icon} size="0.8em" /> {statusConfig.label}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-black text-[#00d4ff] text-[16px] font-[Orbitron]">${Number(order.finalPrice || 0).toFixed(2)}</p>
        <p className="text-[10px] text-[#8b8ba7] font-bold">{t(locale, statusKey)}</p>
      </div>
    </motion.div>
  );
}

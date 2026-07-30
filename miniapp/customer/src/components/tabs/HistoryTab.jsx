import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import useStore from '../../store/useStore';
import { t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';

const STATUS_KEYS = { completed: 'completed', pending: 'pending', processing: 'processing', failed: 'failed', cancelled: 'cancelled' };

export default function HistoryTab() {
  const { locale } = useStore();
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1);
  const fetchOrders = async (nextPage = 1) => { setLoading(true); try { const res = await api.get(`/orders?page=${nextPage}&limit=10`); setOrders((current) => nextPage === 1 ? (res.data.data || []) : [...current, ...(res.data.data || [])]); setTotalPages(res.data.totalPages || 1); } catch (_) {} finally { setLoading(false); } };
  useEffect(() => { fetchOrders(); }, []);
  if (loading && page === 1) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>;
  return <div className="p-4 space-y-3"><div className="section-heading"><PremiumIcon name="shopping" /><h2>{t(locale, 'orderHistory')}</h2></div>{orders.length === 0 && !loading ? <div className="text-center py-12 text-muted"><PremiumIcon name="box" size="3rem" className="mb-4" /><p>{t(locale, 'noOrders')}</p></div> : orders.map((order, index) => <OrderRow key={order._id} order={order} index={index} locale={locale} />)}{page < totalPages && <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => { const next = page + 1; setPage(next); fetchOrders(next); }} disabled={loading} className="w-full py-3 rounded-xl text-sm text-muted border border-border bg-[#1a1a1a]">{loading ? t(locale, 'loading') : t(locale, 'loadMore')}</motion.button>}</div>;
}

function OrderRow({ order, index, locale }) { const statusKey = STATUS_KEYS[order.status] || 'pending'; const statusColor = { completed: 'text-neon bg-neon/10 border-neon/20', pending: 'text-[#f0b90b] bg-[#f0b90b]/10 border-[#f0b90b]/20', processing: 'text-neon-blue bg-neon-blue/10 border-neon-blue/20', failed: 'text-red bg-red/10 border-red/20', cancelled: 'text-muted bg-muted/10 border-muted/20' }[statusKey]; return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-neon"><PremiumIcon name="key" size="1.4rem" /></div><div className="flex-1 min-w-0"><p className="font-bold text-white text-sm truncate">{order.productName}</p><p className="text-xs text-muted">{order.durationName} × {order.quantity}</p><p className="text-xs text-muted">{new Date(order.createdAt).toLocaleDateString(t(locale, 'dateLocale'))}</p></div><div className="text-right flex-shrink-0"><p className="font-black text-neon-blue">${Number(order.finalPrice || 0).toFixed(2)}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{t(locale, statusKey)}</span></div></motion.div>; }

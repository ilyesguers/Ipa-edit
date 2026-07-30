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
  const copyKey = (key) => navigator.clipboard.writeText(key).then(() => toast.success(t(locale, 'toastCopied')));
  if (loading) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl skeleton" />)}</div>;
  if (!orders.length) return <div className="flex flex-col items-center justify-center h-64 gap-4 p-4 text-center"><PremiumIcon name="key" size="4rem" className="text-neon animate-float" /><p className="font-bold text-white">{t(locale, 'noKeys')}</p><p className="text-muted text-sm">{t(locale, 'buyFirst')}</p></div>;
  return <div className="p-4 space-y-3"><div className="section-heading"><PremiumIcon name="key" /><h2>{t(locale, 'myKeys')} ({orders.length})</h2></div>{orders.map((order, index) => <motion.div key={order._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-card border border-border rounded-2xl overflow-hidden"><div className="p-3 flex items-center justify-between border-b border-border bg-[#1a1a1a]"><div><p className="font-bold text-white text-sm">{order.productName}</p><p className="text-xs text-muted">{order.durationName} · ${Number(order.finalPrice || 0).toFixed(2)}</p></div><div className="text-right"><p className="text-xs text-neon">{new Date(order.createdAt).toLocaleDateString(t(locale, 'dateLocale'))}</p><p className="text-xs text-muted">#{order.orderNumber?.slice(-6)}</p></div></div><div className="p-3 space-y-2">{order.keyValues?.map((key, keyIndex) => <div key={keyIndex} className="flex items-center gap-2 bg-[#0a0a0a] border border-border/50 rounded-xl p-2"><p className="flex-1 font-mono text-xs text-neon break-all">{key}</p><motion.button type="button" aria-label={t(locale, 'copyAll')} whileTap={{ scale: 0.85 }} onClick={() => copyKey(key)} className="flex-shrink-0 w-8 h-8 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center text-neon"><PremiumIcon name="copy" /></motion.button></div>)}</div></motion.div>)}</div>;
}

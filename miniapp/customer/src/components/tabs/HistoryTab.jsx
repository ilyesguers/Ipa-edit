import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';

const STATUS_MAP = {
  completed: { label: 'مكتمل', color: 'text-neon', bg: 'bg-neon/10 border-neon/20' },
  pending: { label: 'انتظار', color: 'text-[#f0b90b]', bg: 'bg-[#f0b90b]/10 border-[#f0b90b]/20' },
  processing: { label: 'معالجة', color: 'text-neon-blue', bg: 'bg-neon-blue/10 border-neon-blue/20' },
  failed: { label: 'فاشل', color: 'text-red', bg: 'bg-red/10 border-red/20' },
  cancelled: { label: 'ملغي', color: 'text-muted', bg: 'bg-muted/10 border-muted/20' },
};

export default function HistoryTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/orders?page=${p}&limit=10`);
      setOrders(p === 1 ? res.data.data : prev => [...prev, ...res.data.data]);
      setTotalPages(res.data.totalPages);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  if (loading && page === 1) return (
    <div className="p-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-neon-blue rounded-full" style={{ boxShadow: '0 0 8px #00cfff' }} />
        <h2 className="font-black text-white">سجل الطلبات</h2>
      </div>

      {orders.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted">
          <div className="text-5xl mb-4">📋</div>
          <p>لا يوجد سجل طلبات بعد</p>
        </div>
      ) : (
        orders.map((order, i) => {
          const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
          return (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-xl flex-shrink-0">🔑</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{order.productName}</p>
                <p className="text-xs text-muted">{order.durationName} × {order.quantity}</p>
                <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-neon-blue">${order.finalPrice.toFixed(2)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color} ${status.bg}`}>
                  {status.label}
                </span>
              </div>
            </motion.div>
          );
        })
      )}

      {page < totalPages && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { const p = page + 1; setPage(p); fetchOrders(p); }}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm text-muted border border-border bg-[#1a1a1a]"
        >
          {loading ? '⏳ جاري التحميل...' : 'تحميل المزيد ↓'}
        </motion.button>
      )}
    </div>
  );
}

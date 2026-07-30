import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

const STATUS = {
  pending: { label: 'انتظار', color: 'text-warning bg-warning/10 border-warning/20' },
  processing: { label: 'معالجة', color: 'text-neon-blue bg-neon-blue/10 border-neon-blue/20' },
  completed: { label: 'مكتمل', color: 'text-green bg-green/10 border-green/20' },
  failed: { label: 'فاشل', color: 'text-red bg-red/10 border-red/20' },
  cancelled: { label: 'ملغي', color: 'text-muted bg-muted/10 border-muted/20' },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/orders?status=${filterStatus}&page=${p}&limit=15`);
      setOrders(p === 1 ? r.data.data : prev => [...prev, ...r.data.data]);
      setTotalPages(r.data.totalPages || 1);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { setPage(1); load(1); }, [filterStatus]);

  const handleVerify = async (orderId) => {
    try {
      await api.post(`/admin/orders/${orderId}/verify-payment`);
      toast.success('✅ تم التأكيد والتسليم');
      load(1);
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleReject = async (orderId) => {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;
    try {
      await api.post(`/admin/orders/${orderId}/reject-payment`, { reason });
      toast.success('❌ تم الرفض');
      load(1);
    } catch (err) { toast.error('فشل'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black text-white">🛒 الطلبات</h2>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'الكل'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all
              ${filterStatus === val ? 'bg-neon/10 border-neon/30 text-neon' : 'border-border text-muted bg-card'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-2">
        {orders.map((order, i) => {
          const status = STATUS[order.status] || STATUS.pending;
          return (
            <motion.div key={order._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="admin-card border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-sm">{order.productName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-muted">{order.durationName} × {order.quantity}</p>
                  <p className="text-xs text-muted">@{order.username || 'N/A'} · {order.user}</p>
                  {order.paymentTxHash && <p className="text-[10px] text-neon font-mono truncate">TxHash: {order.paymentTxHash?.substring(0, 20)}...</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-neon">${order.finalPrice?.toFixed(2)}</p>
                  <p className="text-[10px] text-muted">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              {/* Actions for processing orders */}
              {order.status === 'processing' && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleVerify(order._id)}
                    className="flex-1 success-btn py-2 rounded-xl text-xs font-bold">✅ تأكيد وتسليم</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleReject(order._id)}
                    className="flex-1 danger-btn py-2 rounded-xl text-xs font-bold">❌ رفض</motion.button>
                </div>
              )}

              {/* Keys delivered */}
              {order.status === 'completed' && order.keyValues?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted mb-1">المفاتيح المسلّمة:</p>
                  {order.keyValues.map((k, j) => (
                    <p key={j} className="text-[10px] font-mono text-green truncate">{k}</p>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
        {loading && <div className="text-center text-muted py-4">جاري التحميل...</div>}
        {!loading && orders.length === 0 && <div className="text-center text-muted py-8">لا توجد طلبات</div>}
      </div>

      {page < totalPages && (
        <button onClick={() => { const p = page + 1; setPage(p); load(p); }} className="w-full py-2 text-sm text-muted border border-border rounded-xl">تحميل المزيد</button>
      )}
    </div>
  );
}

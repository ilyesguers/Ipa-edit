import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function MyKeysTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/my-keys').then(res => {
      setOrders(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const copyKey = (key) => {
    navigator.clipboard.writeText(key).then(() => toast.success('تم نسخ المفتاح!'));
  };

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl skeleton" />)}
    </div>
  );

  if (!orders.length) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-4">
      <div className="text-6xl animate-float">🔑</div>
      <div className="text-center">
        <p className="font-bold text-white">لا توجد مفاتيح بعد</p>
        <p className="text-muted text-sm mt-1">اشتري أول منتج الآن!</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-neon rounded-full" style={{ boxShadow: '0 0 8px #00ff88' }} />
        <h2 className="font-black text-white">مفاتيحي ({orders.length})</h2>
      </div>

      {orders.map((order, i) => (
        <motion.div
          key={order._id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          <div className="p-3 flex items-center justify-between border-b border-border bg-[#1a1a1a]">
            <div>
              <p className="font-bold text-white text-sm">{order.productName}</p>
              <p className="text-xs text-muted">{order.durationName} · ${order.finalPrice.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neon">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
              <p className="text-xs text-muted">#{order.orderNumber?.slice(-6)}</p>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {order.keyValues?.map((key, j) => (
              <div key={j} className="flex items-center gap-2 bg-[#0a0a0a] border border-border/50 rounded-xl p-2">
                <p className="flex-1 font-mono text-xs text-neon break-all">{key}</p>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => copyKey(key)}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center text-neon text-xs"
                >
                  📋
                </motion.button>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

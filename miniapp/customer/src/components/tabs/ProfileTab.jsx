import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import api from '../../utils/api';

export default function ProfileTab() {
  const { user } = useStore();
  const [balanceHistory, setBalanceHistory] = useState([]);

  useEffect(() => {
    api.get('/users/me/balance-history').then(res => setBalanceHistory(res.data.data.history || [])).catch(() => {});
  }, []);

  const stats = [
    { label: 'إجمالي الطلبات', value: user?.totalOrders || 0, icon: '🛒' },
    { label: 'إجمالي الإنفاق', value: `$${(user?.totalSpent || 0).toFixed(2)}`, icon: '💸' },
    { label: 'إجمالي الشحن', value: `$${(user?.totalDeposited || 0).toFixed(2)}`, icon: '💰' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-3xl p-5 border border-neon/10"
        style={{ boxShadow: '0 0 30px rgba(0,255,136,0.05)' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon/20 to-neon-blue/20 flex items-center justify-center text-3xl border border-neon/20">
            👤
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white">{user?.firstName} {user?.lastName || ''}</h2>
            <p className="text-muted text-sm">@{user?.username || 'N/A'}</p>
            <span className="inline-block mt-1 text-[10px] font-bold px-3 py-0.5 rounded-full bg-neon/10 text-neon border border-neon/20">
              {user?.role === 'admin' ? '👑 ADMIN' : '👤 CUSTOMER'}
            </span>
          </div>
          <div className="bg-neon/10 border border-neon/30 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-muted">الرصيد</p>
            <p className="text-neon font-black text-lg glow-green">${(user?.balance || 0).toFixed(2)}</p>
          </div>
        </div>
      </motion.div>

      {/* Info */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {[
          ['🆔 المعرف', user?.telegramId],
          ['📱 الهاتف', 'غير محقق'],
          ['💱 العملة', 'USD'],
          ['📅 تاريخ الانضمام', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="text-muted">{label}</span>
            <span className="font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-3 text-center"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-base font-black text-white">{s.value}</p>
            <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {user?.role === 'admin' && (
        <a href="/admin#dashboard" target="_blank" rel="noreferrer" className="block text-center bg-neon/10 border border-neon/30 rounded-2xl p-4 text-neon font-black">
          👑 فتح لوحة التحكم
        </a>
      )}

      {/* Balance History */}
      {balanceHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-neon-blue rounded-full" />
            <h3 className="font-bold text-white text-sm">سجل الرصيد</h3>
          </div>
          <div className="space-y-2">
            {balanceHistory.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-[#1a1a1a] rounded-xl px-3 py-2">
                <div>
                  <p className="text-white text-xs font-semibold">{t.description || t.type}</p>
                  <p className="text-muted text-[10px]">{new Date(t.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
                <p className={`font-black ${t.type === 'credit' ? 'text-neon' : 'text-red'}`}>
                  {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

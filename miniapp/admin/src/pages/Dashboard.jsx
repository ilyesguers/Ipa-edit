import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartType, setChartType] = useState('revenue'); // 'revenue' | 'orders'
  const [monthlySummary, setMonthlySummary] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-orders'),
    ]).then(([statsRes, ordersRes]) => {
      setStats(statsRes.data.data);
      setRecentOrders(ordersRes.data.data?.slice(0, 8) || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Monthly summary
    api.get('/admin/stats?period=month').then(res => {
      setMonthlySummary(res.data.data);
    }).catch(() => {});
  }, []);

  const STAT_CARDS = stats ? [
    { title: 'إجمالي المستخدمين', value: stats.totalUsers?.toLocaleString(), icon: '👥', gradient: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/20', textColor: 'text-blue-400', sub: 'مستخدم مسجل' },
    { title: 'إجمالي الأرباح', value: `$${stats.totalRevenue?.toFixed(2)}`, icon: '💰', gradient: 'from-green-500/10 to-green-600/5', border: 'border-green-500/20', textColor: 'text-green-400', sub: `اليوم: $${stats.revenueToday?.toFixed(2)}` },
    { title: 'إجمالي الطلبات', value: stats.totalOrders?.toLocaleString(), icon: '🛒', gradient: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-400/20', textColor: 'text-purple-400', sub: 'مكتمل' },
    { title: 'المخزون الحالي', value: `${stats.activeKeys} / ${stats.totalKeys}`, icon: '🔑', gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-400/20', textColor: 'text-amber-400', sub: 'متاح / إجمالي' },
  ] : [];

  // Quick actions
  const quickActions = [
    { icon: '📦', label: 'إضافة مفاتيح', page: 'inventory', color: 'bg-neon/10 border-neon/20 text-neon' },
    { icon: '📢', label: 'إذاعة', page: 'broadcast', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { icon: '🎫', label: 'كوبونات', page: 'coupons', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
    { icon: '⚙️', label: 'الإعدادات', page: 'settings', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">الإحصائيات 📊</h2>
          <p className="text-muted text-xs mt-0.5">نظرة عامة على أداء المتجر</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => window.location.reload()} className="neon-btn">🔄 تحديث</motion.button>
      </div>

      {/* Stat Cards with gradient cells */}
      <div className="grid grid-cols-2 gap-3">
        {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />) :
          STAT_CARDS.map((card, i) => <StatCard key={i} {...card} index={i} />)}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => window.dispatchEvent(new CustomEvent('admin-navigate', { detail: action.page }))}
            className={`py-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${action.color}`}
          >
            <span className="text-lg">{action.icon}</span>
            <span>{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Revenue/Orders Chart with toggle */}
      {stats?.revenueChart && (
        <div className="admin-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">
              📈 {chartType === 'revenue' ? 'الأرباح' : 'الطلبات'} - آخر 7 أيام
            </h3>
            <div className="flex gap-1 bg-[#0a0a12] rounded-lg p-0.5 border border-border">
              <button
                onClick={() => setChartType('revenue')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${chartType === 'revenue' ? 'bg-neon/20 text-neon' : 'text-muted'}`}
              >
                💰 أرباح
              </button>
              <button
                onClick={() => setChartType('orders')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${chartType === 'orders' ? 'bg-purple-500/20 text-purple-400' : 'text-muted'}`}
              >
                📦 طلبات
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            {chartType === 'revenue' ? (
              <BarChart data={stats.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#12121c', border: '1px solid #1e1e30', borderRadius: '10px', color: '#fff' }} formatter={(v) => [`$${v}`, 'الأرباح']} />
                <Bar dataKey="revenue" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={stats.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#12121c', border: '1px solid #1e1e30', borderRadius: '10px', color: '#fff' }} formatter={(v) => [v, 'الطلبات']} />
                <Line type="monotone" dataKey="orders" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Summary */}
      {monthlySummary && (
        <div className="admin-card">
          <h3 className="font-bold text-white mb-3 text-sm">📅 ملخص هذا الشهر</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-neon">${monthlySummary.revenueMonth?.toFixed(2) || '0.00'}</p>
              <p className="text-[10px] text-muted mt-1">الأرباح</p>
            </div>
            <div>
              <p className="text-2xl font-black text-purple-400">{monthlySummary.ordersMonth || 0}</p>
              <p className="text-[10px] text-muted mt-1">الطلبات</p>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-400">{monthlySummary.newUsers || 0}</p>
              <p className="text-[10px] text-muted mt-1">مستخدم جديد</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="admin-card">
        <h3 className="font-bold text-white mb-3 text-sm">🛒 آخر الطلبات</h3>
        {recentOrders.length === 0 ? (
          <p className="text-muted text-center py-4 text-sm">لا توجد طلبات</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order, i) => (
              <motion.div key={order._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <div>
                  <p className="text-white font-semibold text-xs">{order.productName}</p>
                  <p className="text-muted text-[10px]">@{order.username || 'N/A'} · {order.durationName}</p>
                </div>
                <div className="text-right">
                  <p className="text-neon font-bold text-xs">${order.finalPrice?.toFixed(2)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                    ${order.status === 'completed' ? 'bg-green/10 text-green' : order.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-red/10 text-red'}`}>
                    {order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'انتظار' : order.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, border, textColor, sub, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`stat-card border rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br ${gradient} ${border}`}
    >
      <div>
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{icon}</span>
        </div>
        <p className={`text-2xl font-black ${textColor}`}>{value}</p>
        <p className="text-muted text-xs mt-0.5">{title}</p>
        <p className="text-[10px] text-muted/70 mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}

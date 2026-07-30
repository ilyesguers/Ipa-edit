import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-orders')
    ]).then(([statsRes, ordersRes]) => {
      setStats(statsRes.data.data);
      setRecentOrders(ordersRes.data.data?.slice(0, 8) || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const STAT_CARDS = stats ? [
    { title: 'إجمالي المستخدمين', value: stats.totalUsers?.toLocaleString(), icon: '👥', color: 'neon', sub: 'مستخدم مسجل' },
    { title: 'إجمالي الأرباح', value: `$${stats.totalRevenue?.toFixed(2)}`, icon: '💰', color: 'green', sub: `اليوم: $${stats.revenueToday?.toFixed(2)}` },
    { title: 'إجمالي الطلبات', value: stats.totalOrders?.toLocaleString(), icon: '🛒', color: 'neon-2', sub: 'مكتمل' },
    { title: 'المخزون الحالي', value: `${stats.activeKeys} / ${stats.totalKeys}`, icon: '🔑', color: 'gold', sub: 'متاح / إجمالي' },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">الإحصائيات 📊</h2>
          <p className="text-muted text-xs mt-0.5">نظرة عامة على أداء المتجر</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => window.location.reload()} className="neon-btn">🔄 تحديث</motion.button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />) :
          STAT_CARDS.map((card, i) => <StatCard key={i} {...card} index={i} />)}
      </div>

      {/* Revenue Chart */}
      {stats?.revenueChart && (
        <div className="admin-card">
          <h3 className="font-bold text-white mb-4 text-sm">📈 الأرباح - آخر 7 أيام</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#12121c', border: '1px solid #1e1e30', borderRadius: '10px', color: '#fff' }} formatter={(v) => [`$${v}`, 'الأرباح']} />
              <Bar dataKey="revenue" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

function StatCard({ title, value, icon, color, sub, index }) {
  const colorMap = {
    neon: 'text-neon border-neon/20 bg-neon/5',
    green: 'text-green border-green/20 bg-green/5',
    'neon-2': 'text-purple-400 border-purple-400/20 bg-purple-400/5',
    gold: 'text-gold border-gold/20 bg-gold/5',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      className={`stat-card border rounded-2xl p-4 ${colorMap[color]}`}>
      <div>
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{icon}</span>
        </div>
        <p className={`text-2xl font-black ${colorMap[color].split(' ')[0]}`}>{value}</p>
        <p className="text-muted text-xs mt-0.5">{title}</p>
        <p className="text-[10px] text-muted/70 mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}

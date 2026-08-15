import React, { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../utils/api';
import AdminIcon from '../components/AdminIcon';

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('revenue');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [statsResponse, ordersResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-orders')
      ]);
      setStats(statsResponse.data.data || {});
      setRecentOrders((ordersResponse.data.data || []).slice(0, 6));
      setUpdatedAt(new Date());
    } catch (_) {
      setError('تعذر تحميل الملخص الآن. يمكنك المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const navigate = (page, query = {}) => {
    window.dispatchEvent(new CustomEvent('admin-navigate', { detail: { page, query } }));
  };

  const pendingCount = Number(stats?.pendingOrders || 0) + Number(stats?.processingOrders || 0);
  const cards = stats ? [
    { label: 'المستخدمون', value: Number(stats.totalUsers || 0).toLocaleString(), note: `جديد هذا الشهر: ${stats.newUsers || 0}`, icon: 'users', tone: 'blue' },
    { label: 'إجمالي الأرباح', value: formatMoney(stats.totalRevenue), note: `اليوم: ${formatMoney(stats.revenueToday)}`, icon: 'wallet', tone: 'green' },
    { label: 'إجمالي الطلبات', value: Number(stats.totalOrders || 0).toLocaleString(), note: `هذا الشهر: ${stats.ordersMonth || 0}`, icon: 'orders', tone: 'violet' },
    { label: 'تحتاج متابعة', value: pendingCount, note: `${stats.pendingOrders || 0} انتظار · ${stats.processingOrders || 0} معالجة`, icon: 'clock', tone: pendingCount ? 'amber' : 'green', action: () => navigate('orders') },
    { label: 'المفاتيح المتاحة', value: Number(stats.activeKeys || 0).toLocaleString(), note: `إجمالي المخزون: ${stats.totalKeys || 0}`, icon: 'inventory', tone: 'cyan', action: () => navigate('inventory') },
    { label: 'الاسترجاعات', value: Number(stats.refundedOrders || 0).toLocaleString(), note: 'إجمالي الطلبات المسترجعة', icon: 'refresh', tone: 'muted', action: () => navigate('orders', { status: 'refunded' }) }
  ] : [];

  const quickActions = [
    { label: 'منتج + أكواد', hint: 'كل شيء في صفحة واحدة', icon: 'product', page: 'products' },
    { label: 'مراجعة الطلبات', hint: 'الدفع والتسليم', icon: 'orders', page: 'orders' },
    { label: 'رسالة جديدة', hint: 'إذاعة للمستخدمين', icon: 'broadcast', page: 'broadcast' },
    { label: 'إعدادات المتجر', hint: 'الهوية وطرق الدفع', icon: 'settings', page: 'settings' }
  ];

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard__intro">
        <div>
          <p>نظرة عامة</p>
          <h2>مرحباً، {stats ? 'هذه أهم الأرقام الآن.' : 'جاري تجهيز الملخص.'}</h2>
          <small>{updatedAt ? `آخر تحديث: ${updatedAt.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}` : 'يتم تحديث البيانات عند الطلب.'}</small>
        </div>
        <button type="button" onClick={() => load({ silent: true })} disabled={refreshing} className="neon-btn inline-flex items-center gap-2"><AdminIcon name="refresh" /> {refreshing ? 'جاري التحديث' : 'تحديث البيانات'}</button>
      </section>

      {error && <div className="admin-dashboard__error"><AdminIcon name="warning" /> <span>{error}</span><button type="button" onClick={() => load()}>إعادة المحاولة</button></div>}

      <section className="admin-stat-grid" aria-label="ملخص الأداء">
        {loading ? [1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-32 rounded-2xl skeleton" />) : cards.map((card) => (
          <button key={card.label} type="button" onClick={card.action} disabled={!card.action} className={`admin-stat-card tone-${card.tone} ${card.action ? 'is-actionable' : ''}`}>
            <span className="admin-stat-card__icon"><AdminIcon name={card.icon} /></span>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <small>{card.note}</small>
          </button>
        ))}
      </section>

      <section className="admin-quick-actions" aria-label="اختصارات الإدارة">
        <div className="admin-section-heading"><div><h3>اختصارات سريعة</h3><p>ابدأ المهمة من مكان واحد.</p></div></div>
        <div className="admin-quick-actions__grid">
          {quickActions.map((action) => (
            <button key={action.page} type="button" onClick={() => navigate(action.page)} className="admin-quick-action">
              <span><AdminIcon name={action.icon} /></span>
              <strong>{action.label}</strong>
              <small>{action.hint}</small>
              <AdminIcon name="chevronLeft" className="admin-quick-action__arrow" />
            </button>
          ))}
        </div>
      </section>

      {stats?.revenueChart && (
        <section className="admin-dashboard__chart admin-card">
          <div className="admin-chart-header">
            <div><h3>أداء آخر 7 أيام</h3><p>{chartType === 'revenue' ? 'إجمالي الأرباح اليومية' : 'عدد الطلبات اليومية'}</p></div>
            <div className="admin-segmented-control" role="tablist" aria-label="بيانات الرسم">
              <button type="button" role="tab" aria-selected={chartType === 'revenue'} className={chartType === 'revenue' ? 'is-active' : ''} onClick={() => setChartType('revenue')}>الأرباح</button>
              <button type="button" role="tab" aria-selected={chartType === 'orders'} className={chartType === 'orders' ? 'is-active' : ''} onClick={() => setChartType('orders')}>الطلبات</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {chartType === 'revenue' ? (
              <BarChart data={stats.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252b38" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#8b93a7', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(date) => date.slice(5)} />
                <YAxis tick={{ fill: '#8b93a7', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ background: '#161922', border: '1px solid #2d3748', borderRadius: '10px', color: '#fff' }} formatter={(value) => [formatMoney(value), 'الأرباح']} />
                <Bar dataKey="revenue" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            ) : (
              <LineChart data={stats.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252b38" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#8b93a7', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(date) => date.slice(5)} />
                <YAxis tick={{ fill: '#8b93a7', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ background: '#161922', border: '1px solid #2d3748', borderRadius: '10px', color: '#fff' }} formatter={(value) => [value, 'الطلبات']} />
                <Line type="monotone" dataKey="orders" stroke="#60a5fa" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </section>
      )}

      <section className="admin-dashboard__lower-grid">
        {stats && <div className="admin-month-summary admin-card">
          <div className="admin-section-heading"><div><h3>ملخص هذا الشهر</h3><p>مؤشرات بسيطة للمراجعة السريعة.</p></div></div>
          <div className="admin-month-summary__stats">
            <div><strong>{formatMoney(stats.revenueMonth)}</strong><small>الأرباح</small></div>
            <div><strong>{stats.ordersMonth || 0}</strong><small>الطلبات</small></div>
            <div><strong>{stats.newUsers || 0}</strong><small>مستخدمون جدد</small></div>
          </div>
        </div>}

        <div className="admin-recent-orders admin-card">
          <div className="admin-section-heading"><div><h3>آخر الطلبات</h3><p>أحدث العمليات المسجلة.</p></div><button type="button" onClick={() => navigate('orders')}>كل الطلبات <AdminIcon name="chevronLeft" /></button></div>
          {recentOrders.length ? <div className="admin-recent-orders__list">
            {recentOrders.map((order) => <button key={order._id} type="button" onClick={() => navigate('orders', { search: order.orderNumber })} className="admin-recent-order">
              <span className={`admin-recent-order__status status-${order.status || 'pending'}`} />
              <span className="min-w-0 flex-1"><strong>{order.productName}</strong><small>{order.username ? `@${order.username}` : order.orderNumber}</small></span>
              <b>{formatMoney(order.finalPrice)}</b>
            </button>)}
          </div> : <div className="admin-empty-inline">لا توجد طلبات حديثة.</div>}
        </div>
      </section>
    </div>
  );
}

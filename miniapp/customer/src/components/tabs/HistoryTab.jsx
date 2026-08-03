import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';
import useStore from '../../store/useStore';
import { cleanDisplayText, t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';

const STATUS_KEYS = {
  completed: 'completed',
  pending: 'pending',
  processing: 'processing',
  failed: 'failed',
  cancelled: 'cancelled',
  refunded: 'refunded'
};

const STATUS_STYLE = {
  completed: { icon: 'checkmark', color: '#6ee7b7', background: 'rgba(16,185,129,.12)' },
  pending: { icon: 'clock', color: '#fcd34d', background: 'rgba(245,158,11,.12)' },
  processing: { icon: 'bolt', color: '#93c5fd', background: 'rgba(59,130,246,.12)' },
  failed: { icon: 'alert', color: '#fca5a5', background: 'rgba(239,68,68,.12)' },
  cancelled: { icon: 'cancel', color: '#c4c9d4', background: 'rgba(156,163,175,.12)' },
  refunded: { icon: 'wallet', color: '#fcd34d', background: 'rgba(251,191,36,.12)' }
};

export default function HistoryTab() {
  const { locale } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async (nextPage = 1) => {
    setLoading(true);
    try {
      const key = `orders:${nextPage}`;
      const data = nextPage === 1
        ? await cachedFetch(key, async () => (await api.get(`/orders?page=${nextPage}&limit=10`)).data, 45 * 1000, { persist: true })
        : (await api.get(`/orders?page=${nextPage}&limit=10`)).data;
      setOrders((current) => nextPage === 1 ? (data.data || []) : [...current, ...(data.data || [])]);
      setTotalPages(data.totalPages || 1);
    } catch (_) {
      if (nextPage === 1) setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  if (loading && page === 1) return <div className="store-page space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl skeleton" />)}</div>;

  return (
    <div className="store-page space-y-3">
      <div className="section-heading"><PremiumIcon name="orders" /><h2>{t(locale, 'orderHistory')}</h2></div>
      {!orders.length ? (
        <div className="empty-state"><PremiumIcon name="orders" size="2rem" /><strong>{t(locale, 'noOrders')}</strong></div>
      ) : orders.map((order) => <OrderRow key={order._id} order={order} locale={locale} />)}
      {page < totalPages && (
        <button
          type="button"
          onClick={() => { const next = page + 1; setPage(next); fetchOrders(next); }}
          disabled={loading}
          className="w-full rounded-xl border border-[#10b981]/25 bg-[#10b981]/10 text-[#6ee7b7] text-[13px] font-black"
        >
          {loading ? t(locale, 'loading') : t(locale, 'loadMore')}
        </button>
      )}
    </div>
  );
}

function OrderRow({ order, locale }) {
  const status = STATUS_KEYS[order.status] || 'pending';
  const style = STATUS_STYLE[status];

  return (
    <article className="gamer-card rounded-2xl p-4 flex items-center gap-3">
      <span className="w-10 h-10 flex-none rounded-xl flex items-center justify-center" style={{ color: style.color, background: style.background }}><PremiumIcon name={style.icon} /></span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-[13px]">{cleanDisplayText(order.productName)}</strong>
        <small className="block mt-1 truncate text-[#9ca3af]">{cleanDisplayText(order.durationName)} · {new Date(order.createdAt).toLocaleDateString(t(locale, 'dateLocale'))}</small>
        <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-[10px] font-black" style={{ color: style.color, background: style.background }}><PremiumIcon name={style.icon} size=".8em" /> {t(locale, status)}</span>
      </div>
      <strong className="flex-none text-[#60a5fa] text-[15px]">${Number(order.finalPrice || 0).toFixed(2)}</strong>
    </article>
  );
}

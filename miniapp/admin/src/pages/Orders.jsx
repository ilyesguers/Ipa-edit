import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { haptic } from '../utils/haptic';
import Sheet, { SheetActions } from '../components/Sheet';

const STATUS = {
  pending: { label: 'انتظار', color: 'text-warning bg-warning/10 border-warning/20' },
  processing: { label: 'معالجة', color: 'text-neon-blue bg-neon-blue/10 border-neon-blue/20' },
  completed: { label: 'مكتمل', color: 'text-green bg-green/10 border-green/20' },
  failed: { label: 'فاشل', color: 'text-red bg-red/10 border-red/20' },
  cancelled: { label: 'ملغي', color: 'text-muted bg-muted/10 border-muted/20' },
  rejected: { label: 'مرفوض', color: 'text-red bg-red/10 border-red/20' },
  refunded: { label: 'مسترجع', color: 'text-gold bg-gold/10 border-gold/20' },
};

const PAYMENT_LABELS = {
  wallet: '💰 محفظة',
  binance: '🟡 Binance',
  manual_crypto: '🔗 يدوي',
  admin_gift: '🎁 هدية',
  telegram_stars: '⭐ نجوم تيليجرام',
  paypal: '💙 PayPal',
};

export default function Orders({ routeQuery = {}, setRouteQuery }) {
  const initialSearch = useMemo(() => routeQuery.search || '', [routeQuery.search]);
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState(routeQuery.status || '');
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refunding, setRefunding] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [detail, setDetail] = useState(null); // order detail modal

  const load = async (p = 1, searchValue = search, statusValue = filterStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (statusValue) params.set('status', statusValue);
      if (searchValue) params.set('search', searchValue);
      const r = await api.get(`/admin/orders?${params}`);
      setOrders(p === 1 ? r.data.data : (prev) => [...prev, ...r.data.data]);
      setTotalPages(r.data.totalPages || 1);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    setSearch(routeQuery.search || '');
    setFilterStatus(routeQuery.status || '');
  }, [routeQuery.search, routeQuery.status]);

  useEffect(() => {
    setPage(1);
    load(1, search, filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load(1, search, filterStatus);
      setRouteQuery?.({ ...(search ? { search } : {}), ...(filterStatus ? { status: filterStatus } : {}) });
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleVerify = async (orderId) => {
    haptic.medium();
    try {
      await api.post(`/admin/orders/${orderId}/verify-payment`);
      haptic.success();
      toast.success('✅ تم التأكيد والتسليم');
      load(1);
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleReject = async () => {
    if (!rejecting || !rejectReason.trim()) return toast.error('اكتب سبب الرفض');
    haptic.medium();
    try {
      await api.post(`/admin/orders/${rejecting}/reject-payment`, { reason: rejectReason });
      haptic.success();
      toast.success('❌ تم رفض الطلب');
      setRejecting(null);
      setRejectReason('');
      load(1);
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleRefund = async () => {
    if (!refunding) return;
    haptic.medium();
    try {
      const res = await api.post(`/admin/orders/${refunding}/refund`, { reason: refundReason || undefined });
      haptic.success();
      toast.success(res.data?.data?.starsRefunded ? '⭐ أعاد تيليجرام النجوم للمستخدم' : '💰 تم الاسترجاع للمحفظة');
      setRefunding(null);
      setRefundReason('');
      load(1);
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleCancel = async (order) => {
    if (!confirm(`إلغاء الطلب ${order.orderNumber}؟`)) return;
    haptic.medium();
    try {
      await api.post(`/admin/orders/${order._id}/cancel`, { reason: 'ألغي من الإدارة' });
      haptic.success();
      toast.success('🚫 تم الإلغاء');
      load(1);
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('📋 تم النسخ'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black text-white">🛒 الطلبات</h2>
        <button onClick={() => load(1)} className="neon-btn text-xs px-3 py-2">🔄 تحديث</button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث برقم الطلب أو اسم المنتج أو اليوزر أو ID..." className="input-admin" />
        <div className="flex gap-2 flex-wrap">
          {[['', 'الكل'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([val, label]) => (
            <button
              key={val}
              onClick={() => {
                setFilterStatus(val);
                setRouteQuery?.({ ...(search ? { search } : {}), ...(val ? { status: val } : {}) });
              }}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${filterStatus === val ? 'bg-neon/10 border-neon/30 text-neon' : 'border-border text-muted bg-card'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="نتائج البحث" value={orders.length} icon="🔎" color="text-neon" />
        <SummaryCard label="الحالة المحددة" value={filterStatus ? (STATUS[filterStatus]?.label || filterStatus) : 'الكل'} icon="🎯" color="text-warning" />
        <SummaryCard label="صفحات متاحة" value={totalPages} icon="📄" color="text-green" />
      </div>

      <div className="space-y-2">
        {orders.map((order, i) => {
          const status = STATUS[order.status] || STATUS.pending;
          return (
            <motion.div key={order._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="admin-card border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-sm">{order.productName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted">{order.orderNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">{order.durationName} × {order.quantity}</p>
                  <p className="text-xs text-muted">@{order.username || 'N/A'} · {order.user}</p>
                  {order.paymentTxHash && <p className="text-[10px] text-neon font-mono truncate mt-1">TxHash: {order.paymentTxHash}</p>}
                  {order.adminNotes && <p className="text-[10px] text-warning mt-1">ملاحظة: {order.adminNotes}</p>}
                  {order.refundReason && <p className="text-[10px] text-gold mt-1">💰 سبب الاسترجاع: {order.refundReason}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-neon">${order.finalPrice?.toFixed(2)}</p>
                  <p className="text-[10px] text-muted">{new Date(order.createdAt).toLocaleDateString('ar-IQ-u-nu-latn')}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                <button onClick={() => setDetail(order)} className="text-xs px-3 py-2 rounded-xl border border-border text-muted hover:text-white transition-all">👁 التفاصيل</button>
                {order.status === 'processing' && (
                  <>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleVerify(order._id)} className="flex-1 min-w-[140px] success-btn py-2 rounded-xl text-xs font-bold">✅ تأكيد وتسليم</motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setRejecting(order._id)} className="flex-1 min-w-[100px] danger-btn py-2 rounded-xl text-xs font-bold">❌ رفض</motion.button>
                  </>
                )}
                {order.status === 'pending' && (
                  <>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleVerify(order._id)} className="flex-1 min-w-[140px] success-btn py-2 rounded-xl text-xs font-bold">✅ تأكيد وتسليم</motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCancel(order)} className="flex-1 min-w-[100px] py-2 rounded-xl text-xs font-bold border border-border text-muted hover:text-white">🚫 إلغاء</motion.button>
                  </>
                )}
                {order.status === 'completed' && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setRefunding(order._id)} className="flex-1 min-w-[140px] py-2 rounded-xl text-xs font-bold border border-gold/30 text-gold hover:bg-gold/10">💰 استرجاع</motion.button>
                )}
              </div>

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
        {!loading && orders.length === 0 && <div className="text-center text-muted py-8">لا توجد طلبات مطابقة</div>}
      </div>

      {page < totalPages && (
        <button onClick={() => { const p = page + 1; setPage(p); load(p); }} className="w-full py-2 text-sm text-muted border border-border rounded-xl">تحميل المزيد</button>
      )}

      {/* Order detail sheet */}
      <Sheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="📋 تفاصيل الطلب"
        footer={detail && (
          <div className="flex gap-2">
            <button onClick={() => { const target = detail.user; setDetail(null); window.dispatchEvent(new CustomEvent('admin-navigate', { detail: { page: 'users', query: { search: target } } })); }} className="flex-1 min-h-[48px] rounded-xl border border-neon/30 bg-neon/10 text-neon text-sm font-black">👤 ملف المستخدم</button>
            <button onClick={() => setDetail(null)} className="admin-sheet__cancel">إغلاق</button>
          </div>
        )}
      >
        {detail && (
          <>
              <InfoRow label="رقم الطلب" value={detail.orderNumber} mono onCopy={() => copy(detail.orderNumber)} />
              <InfoRow label="الحالة" value={STATUS[detail.status]?.label || detail.status} />
              <InfoRow label="طريقة الدفع" value={PAYMENT_LABELS[detail.paymentMethod] || detail.paymentMethod} />
              <InfoRow label="المنتج" value={`${detail.productName} - ${detail.durationName}`} />
              <InfoRow label="الكمية" value={detail.quantity} />
              <InfoRow label="السعر النهائي" value={`$${detail.finalPrice?.toFixed(2)}`} />
              {detail.couponCode && <InfoRow label="الكوبون" value={detail.couponCode} />}
              {detail.paymentTxHash && <InfoRow label="TxHash" value={detail.paymentTxHash} mono onCopy={() => copy(detail.paymentTxHash)} />}
              {detail.adminNotes && <InfoRow label="ملاحظة الإدارة" value={detail.adminNotes} />}
              <InfoRow label="التاريخ" value={new Date(detail.createdAt).toLocaleString('ar-IQ-u-nu-latn')} />
          </>
        )}
      </Sheet>

      {/* Reject sheet */}
      <Sheet
        open={Boolean(rejecting)}
        onClose={() => { setRejecting(null); setRejectReason(''); }}
        title="❌ رفض الطلب"
        footer={<SheetActions danger saveLabel="تأكيد الرفض" onSave={handleReject} onCancel={() => { setRejecting(null); setRejectReason(''); }} />}
      >
        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} className="input-admin resize-none" placeholder="اكتب سبب الرفض الذي سيصل للمستخدم" />
      </Sheet>

      {/* Refund sheet */}
      <Sheet
        open={Boolean(refunding)}
        onClose={() => { setRefunding(null); setRefundReason(''); }}
        title="💰 استرجاع الطلب"
        footer={<SheetActions saveLabel="💰 تأكيد الاسترجاع" onSave={handleRefund} onCancel={() => { setRefunding(null); setRefundReason(''); }} />}
      >
        <p className="text-xs text-muted m-0">
          {orders.find((o) => o._id === refunding)?.paymentMethod === 'telegram_stars'
            ? '⭐ سيعيد تيليجرام النجوم إلى رصيد المستخدم مباشرة، وستُبطل المفاتيح المسلّمة.'
            : 'سيتم تحويل المبلغ إلى محفظة المستخدم وإبطال المفاتيح المسلّمة.'}
        </p>
        <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} className="input-admin resize-none" placeholder="سبب الاسترجاع (اختياري)" />
      </Sheet>
    </div>
  );
}

function InfoRow({ label, value, mono, onCopy }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-bg border border-border rounded-xl px-3 py-2">
      <span className="text-[11px] text-muted font-semibold shrink-0">{label}</span>
      <span className={`text-xs text-white font-bold truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
      {onCopy && <button onClick={onCopy} className="text-[10px] text-neon border border-neon/20 rounded px-1.5 py-0.5 shrink-0">نسخ</button>}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <div className="admin-card text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-lg font-black ${color}`}>{value}</div>
      <div className="text-[11px] text-muted mt-1">{label}</div>
    </div>
  );
}

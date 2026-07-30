import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balanceModal, setBalanceModal] = useState(null); // {type: 'add'|'deduct'}
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDesc, setBalanceDesc] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [showDM, setShowDM] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async (s = search, p = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/users?search=${s}&page=${p}&limit=20`);
      setUsers(p === 1 ? r.data.data : prev => [...prev, ...r.data.data]);
      setTotalPages(r.data.totalPages || 1);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { const t = setTimeout(() => { setPage(1); fetchUsers(search, 1); }, 400); return () => clearTimeout(t); }, [search]);

  const loadUser = async (u) => {
    const r = await api.get(`/admin/users/${u.telegramId}`);
    setSelected(r.data.data);
  };

  const handleBalance = async () => {
    if (!balanceAmount || isNaN(balanceAmount)) return toast.error('أدخل مبلغاً صحيحاً');
    try {
      await api.post(`/admin/users/${selected.telegramId}/balance`, {
        amount: parseFloat(balanceAmount), type: balanceModal.type, description: balanceDesc || undefined
      });
      toast.success(`✅ تم ${balanceModal.type === 'add' ? 'إضافة' : 'خصم'} $${balanceAmount}`);
      const updated = { ...selected, balance: balanceModal.type === 'add' ? selected.balance + parseFloat(balanceAmount) : selected.balance - parseFloat(balanceAmount) };
      setSelected(updated);
      setBalanceModal(null); setBalanceAmount(''); setBalanceDesc('');
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleBan = async (ban) => {
    if (!confirm(ban ? 'حظر هذا المستخدم؟' : 'رفع الحظر عن هذا المستخدم؟')) return;
    try {
      await api.post(`/admin/users/${selected.telegramId}/ban`, { ban, reason: 'مخالفة القوانين' });
      toast.success(ban ? '🚫 تم الحظر' : '✅ تم رفع الحظر');
      setSelected({ ...selected, isBanned: ban });
    } catch (err) { toast.error('فشل'); }
  };

  const handleDM = async () => {
    if (!dmMessage.trim()) return toast.error('اكتب رسالة');
    try {
      await api.post(`/admin/users/${selected.telegramId}/dm`, { message: dmMessage });
      toast.success('✅ تم الإرسال');
      setShowDM(false); setDmMessage('');
    } catch (err) { toast.error('فشل في الإرسال'); }
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Users List */}
      <div className={`space-y-3 ${selected ? 'lg:w-1/2' : 'w-full'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white">👥 المستخدمون</h2>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث بالاسم أو @يوزر أو ID..." className="input-admin" />

        <div className="space-y-2">
          {users.map((user, i) => (
            <motion.button key={user._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => loadUser(user)} whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 admin-card text-right border transition-all ${selected?.telegramId === user.telegramId ? 'border-neon/40' : 'border-transparent'}`}>
              <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center text-base flex-shrink-0">
                {user.role === 'admin' ? '👑' : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{user.firstName} {user.lastName || ''}</p>
                <p className="text-xs text-muted">@{user.username || 'N/A'} · {user.telegramId}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-green text-sm font-bold">${user.balance?.toFixed(2)}</p>
                {user.isBanned && <span className="text-[10px] text-red">🚫 محظور</span>}
              </div>
            </motion.button>
          ))}
          {loading && <div className="text-center text-muted py-4">جاري التحميل...</div>}
          {!loading && users.length === 0 && <div className="text-center text-muted py-8">لا يوجد مستخدمون</div>}
        </div>
        {page < totalPages && <button onClick={() => { const p = page + 1; setPage(p); fetchUsers(search, p); }} className="w-full py-2 text-sm text-muted border border-border rounded-xl">تحميل المزيد</button>}
      </div>

      {/* User Profile */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="lg:w-1/2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white">ملف المستخدم</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white text-sm">✕</button>
            </div>

            {/* Profile Card */}
            <div className="admin-card space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center text-2xl">
                  {selected.role === 'admin' ? '👑' : '👤'}
                </div>
                <div>
                  <p className="font-black text-white">{selected.firstName} {selected.lastName || ''}</p>
                  <p className="text-muted text-xs">@{selected.username || 'N/A'} · {selected.telegramId}</p>
                  <p className="text-xs mt-0.5">{selected.isBanned ? <span className="text-red">🚫 محظور</span> : <span className="text-green">✅ نشط</span>}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[['الرصيد', `$${selected.balance?.toFixed(2)}`, 'text-green'], ['إجمالي الإنفاق', `$${selected.totalSpent?.toFixed(2)}`, 'text-neon'], ['الطلبات', selected.totalOrders, 'text-gold']].map(([l, v, c]) => (
                  <div key={l} className="bg-bg border border-border rounded-xl p-2">
                    <p className={`font-black ${c}`}>{v}</p>
                    <p className="text-[10px] text-muted">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setBalanceModal({ type: 'add' })}
                className="success-btn py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1">
                ➕ إضافة رصيد
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setBalanceModal({ type: 'deduct' })}
                className="danger-btn py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1">
                ➖ خصم رصيد
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowDM(true)}
                className="neon-btn py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 col-span-2">
                ✉️ إرسال رسالة خاصة
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleBan(!selected.isBanned)}
                className={`col-span-2 py-3 rounded-xl font-bold text-sm border transition-all
                  ${selected.isBanned ? 'bg-green/10 border-green/30 text-green' : 'bg-red/10 border-red/30 text-red'}`}>
                {selected.isBanned ? '✅ رفع الحظر' : '🚫 حظر المستخدم'}
              </motion.button>
            </div>

            {/* Recent Orders */}
            {selected.recentOrders?.length > 0 && (
              <div className="admin-card">
                <p className="font-bold text-white text-sm mb-2">آخر الطلبات</p>
                {selected.recentOrders.slice(0, 5).map(order => (
                  <div key={order._id} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-xs">
                    <span className="text-white">{order.productName} · {order.durationName}</span>
                    <span className={order.status === 'completed' ? 'text-green font-bold' : 'text-red'}>${order.finalPrice?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance Modal */}
      <AnimatePresence>
        {balanceModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBalanceModal(null)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-panel border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-4">
              <h3 className="font-black text-white">{balanceModal.type === 'add' ? '➕ إضافة رصيد' : '➖ خصم رصيد'}</h3>
              <input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="المبلغ ($)" className="input-admin" />
              <input type="text" value={balanceDesc} onChange={e => setBalanceDesc(e.target.value)} placeholder="السبب (اختياري)" className="input-admin" />
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleBalance}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm ${balanceModal.type === 'add' ? 'success-btn' : 'danger-btn'}`}>
                  تأكيد
                </motion.button>
                <button onClick={() => setBalanceModal(null)} className="px-4 py-3 border border-border rounded-xl text-muted font-bold text-sm">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DM Modal */}
      <AnimatePresence>
        {showDM && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDM(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-panel border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-4">
              <h3 className="font-black text-white">✉️ رسالة خاصة</h3>
              <p className="text-xs text-muted">إلى: {selected?.firstName} (@{selected?.username})</p>
              <textarea value={dmMessage} onChange={e => setDmMessage(e.target.value)} placeholder="اكتب رسالتك..." rows={4} className="input-admin resize-none" />
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleDM} className="flex-1 neon-btn py-3 rounded-xl font-bold text-sm">إرسال ✉️</motion.button>
                <button onClick={() => setShowDM(false)} className="px-4 py-3 border border-border rounded-xl text-muted font-bold text-sm">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

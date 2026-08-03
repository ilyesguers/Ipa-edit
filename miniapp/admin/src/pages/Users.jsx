import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { haptic } from '../utils/haptic';
import { PERMISSION_LABELS } from '../utils/permissions';

export default function Users({ routeQuery = {}, setRouteQuery, currentUser }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState(routeQuery.search || '');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balanceModal, setBalanceModal] = useState(null); // {type: 'add'|'deduct'}
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDesc, setBalanceDesc] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [showDM, setShowDM] = useState(false);
  const [banModal, setBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [permModal, setPermModal] = useState(false);
  const [permSelection, setPermSelection] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
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

  useEffect(() => { setSearch(routeQuery.search || ''); }, [routeQuery.search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchUsers(search, 1);
      setRouteQuery?.(search ? { search } : {});
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadUser = async (u) => {
    const r = await api.get(`/admin/users/${u.telegramId}`);
    setSelected(r.data.data);
    api.get(`/admin/users/${u.telegramId}/balance-history`)
      .then((res) => setBalanceHistory(res.data.data?.history || []))
      .catch(() => setBalanceHistory([]));
  };

  const handleBalance = async () => {
    if (!balanceAmount || isNaN(balanceAmount)) return toast.error('أدخل مبلغاً صحيحاً');
    haptic.medium();
    try {
      await api.post(`/admin/users/${selected.telegramId}/balance`, {
        amount: parseFloat(balanceAmount), type: balanceModal.type, description: balanceDesc || undefined
      });
      haptic.success();
      toast.success(`✅ تم ${balanceModal.type === 'add' ? 'إضافة' : 'خصم'} $${balanceAmount}`);
      const updated = { ...selected, balance: balanceModal.type === 'add' ? selected.balance + parseFloat(balanceAmount) : selected.balance - parseFloat(balanceAmount) };
      setSelected(updated);
      setBalanceModal(null); setBalanceAmount(''); setBalanceDesc('');
      loadUser(updated);
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleBan = async (ban) => {
    if (ban && !banReason.trim()) return toast.error('اكتب سبب الحظر');
    haptic.medium();
    try {
      await api.post(`/admin/users/${selected.telegramId}/ban`, { ban, reason: banReason || undefined });
      haptic.success();
      toast.success(ban ? '🚫 تم الحظر' : '✅ تم رفع الحظر');
      setSelected({ ...selected, isBanned: ban, banReason: ban ? banReason : null });
      setBanModal(false); setBanReason('');
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleRole = async (role) => {
    if (!confirm(role === 'admin' ? 'ترقية هذا المستخدم إلى أدمن؟' : 'إلغاء صلاحية الأدمن عن هذا المستخدم؟')) return;
    haptic.medium();
    try {
      await api.post(`/admin/users/${selected.telegramId}/role`, { role });
      haptic.success();
      toast.success(role === 'admin' ? '👑 تمت الترقية' : 'تم إلغاء الصلاحية');
      setSelected({ ...selected, role, permissions: [] });
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleDM = async () => {
    if (!dmMessage.trim()) return toast.error('اكتب رسالة');
    try {
      await api.post(`/admin/users/${selected.telegramId}/dm`, { message: dmMessage });
      toast.success('✅ تم الإرسال');
      setShowDM(false); setDmMessage('');
    } catch (err) { toast.error('فشل في الإرسال'); }
  };

  const openPermModal = () => {
    setPermSelection(selected?.permissions || []);
    setPermModal(true);
  };

  const togglePerm = (perm) => {
    setPermSelection((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const savePermissions = async () => {
    try {
      await api.post(`/admin/users/${selected.telegramId}/permissions`, { permissions: permSelection });
      toast.success('🎛️ تم حفظ الصلاحيات');
      setSelected({ ...selected, permissions: permSelection });
      setPermModal(false);
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
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
                {user.role === 'admin' || user.role === 'superadmin' ? '👑' : '👤'}
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
                  {selected.role === 'admin' || selected.role === 'superadmin' ? '👑' : '👤'}
                </div>
                <div>
                  <p className="font-black text-white">{selected.firstName} {selected.lastName || ''}</p>
                  <p className="text-muted text-xs">@{selected.username || 'N/A'} · {selected.telegramId}</p>
                  <p className="text-xs mt-0.5">
                    {selected.isBanned ? <span className="text-red">🚫 محظور {selected.banReason ? `- ${selected.banReason}` : ''}</span> : <span className="text-green">✅ نشط</span>}
                    {selected.role === 'superadmin' && <span className="text-gold ml-2">⭐ مالك</span>}
                  </p>
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
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['الإحالات', selected.referralCount || 0, 'text-neon-blue'], ['شحنت', `$${selected.totalDeposited?.toFixed(2)}`, 'text-green'], ['منضم', selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('ar-IQ') : '—', 'text-muted']].map(([l, v, c]) => (
                  <div key={l} className="bg-bg border border-border rounded-xl p-2">
                    <p className={`font-black ${c} text-xs`}>{v}</p>
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
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setBanModal(true)}
                className={`py-3 rounded-xl font-bold text-sm border transition-all
                  ${selected.isBanned ? 'bg-green/10 border-green/30 text-green' : 'bg-red/10 border-red/30 text-red'}`}>
                {selected.isBanned ? '✅ رفع الحظر' : '🚫 حظر المستخدم'}
              </motion.button>
              {selected.role !== 'superadmin' && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleRole(selected.role === 'admin' ? 'customer' : 'admin')}
                  className="py-3 rounded-xl font-bold text-sm border transition-all bg-gold/10 border-gold/30 text-gold">
                  {selected.role === 'admin' ? '⬇️ إلغاء الأدمن' : '👑 ترقية لأدمن'}
                </motion.button>
              )}
              {selected.role === 'admin' && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={openPermModal}
                  className="py-3 rounded-xl font-bold text-sm border transition-all bg-neon-blue/10 border-neon-blue/30 text-neon-blue col-span-2">
                  🎛️ ضبط الصلاحيات {selected.permissions?.length ? `(${selected.permissions.length})` : '(كل الصلاحيات)'}
                </motion.button>
              )}
            </div>

            {/* Balance History */}
            {balanceHistory.length > 0 && (
              <div className="admin-card">
                <p className="font-bold text-white text-sm mb-2">💰 سجل الرصيد ({balanceHistory.length})</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {balanceHistory.map((tx, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-xs">
                      <div className="min-w-0">
                        <p className="text-white truncate">{tx.description || tx.type}</p>
                        <p className="text-[10px] text-muted">{new Date(tx.createdAt).toLocaleString('ar-IQ')}{tx.adminId ? ` · بواسطة ${tx.adminId}` : ''}</p>
                      </div>
                      <span className={`font-black shrink-0 ${tx.type === 'credit' || tx.type === 'refund' ? 'text-green' : 'text-red'}`}>
                        {tx.type === 'credit' || tx.type === 'refund' ? '+' : '-'}${Number(tx.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            {selected.recentOrders?.length > 0 && (
              <div className="admin-card">
                <p className="font-bold text-white text-sm mb-2">آخر الطلبات</p>
                {selected.recentOrders.slice(0, 5).map(order => (
                  <div key={order._id} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-xs">
                    <span className="text-white truncate">{order.productName} · {order.durationName}</span>
                    <span className={order.status === 'completed' ? 'text-green font-bold' : order.status === 'refunded' ? 'text-gold font-bold' : 'text-red'}>${order.finalPrice?.toFixed(2)}</span>
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

      {/* Ban Modal */}
      <AnimatePresence>
        {banModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBanModal(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-panel border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-4">
              <h3 className="font-black text-white">{selected?.isBanned ? '✅ رفع الحظر' : '🚫 حظر المستخدم'}</h3>
              {!selected?.isBanned && (
                <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={3} className="input-admin resize-none" placeholder="سبب الحظر (سيظهر للمستخدم)" />
              )}
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleBan(!selected?.isBanned)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm ${selected?.isBanned ? 'success-btn' : 'danger-btn'}`}>
                  تأكيد
                </motion.button>
                <button onClick={() => { setBanModal(false); setBanReason(''); }} className="px-4 py-3 border border-border rounded-xl text-muted font-bold text-sm">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Permissions Modal */}
      <AnimatePresence>
        {permModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPermModal(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-panel border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-white">🎛️ صلاحيات الأدمن</h3>
                <button onClick={() => setPermModal(false)} className="text-muted hover:text-white text-sm">✕</button>
              </div>
              <p className="text-xs text-muted">إلى: {selected?.firstName} (@{selected?.username})</p>
              <p className="text-[11px] text-neon bg-neon/5 border border-neon/20 rounded-xl px-3 py-2">
                💡 بدون تحديد أي صلاحية = تحكم كامل بكل الأقسام.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(PERMISSION_LABELS).map(([perm, meta]) => {
                  const checked = permSelection.includes(perm);
                  return (
                    <button key={perm} type="button" onClick={() => togglePerm(perm)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${checked ? 'bg-neon/10 border-neon/40 text-neon' : 'border-border text-muted bg-bg'}`}>
                      <span className="text-base">{meta.icon}</span>
                      <span className="flex-1 text-right">{meta.label}</span>
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-[11px] ${checked ? 'bg-neon border-neon text-black' : 'border-border'}`}>
                        {checked ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={savePermissions} className="flex-1 neon-btn py-3 rounded-xl font-bold text-sm">💾 حفظ الصلاحيات</motion.button>
                <button onClick={() => setPermModal(false)} className="px-4 py-3 border border-border rounded-xl text-muted text-sm">إلغاء</button>
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

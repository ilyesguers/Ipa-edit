import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { haptic } from '../utils/haptic';
import { PERMISSION_LABELS } from '../utils/permissions';
import Sheet, { SheetActions } from '../components/Sheet';

const DATE_LOCALE = 'ar-IQ-u-nu-latn'; // Latin digits everywhere — no Arabic-Indic numerals

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(DATE_LOCALE) : '—');
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString(DATE_LOCALE) : '—');
const fmtMoney = (v) => `$${Number(v || 0).toFixed(2)}`;

const Stat = ({ label, value, tone = 'text-white' }) => (
  <div className="bg-bg border border-border rounded-xl p-2 text-center min-w-0">
    <p className={`font-black text-sm truncate ${tone}`}>{value}</p>
    <p className="text-[10px] text-muted">{label}</p>
  </div>
);

const LANGUAGES = [
  ['ar', 'العربية'], ['en', 'English'], ['fr', 'Français'], ['es', 'Español'],
  ['de', 'Deutsch'], ['tr', 'Türkçe'], ['ru', 'Русский'], ['ur', 'اردو'],
  ['hi', 'हिन्दी'], ['id', 'Bahasa Indonesia'], ['pt', 'Português'], ['zh', '中文']
];

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
  const [busy, setBusy] = useState(false);

  // ── Full profile editor ──
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const fetchUsers = async (s = search, p = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/users?search=${encodeURIComponent(s)}&page=${p}&limit=20`);
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
    setBusy(true);
    try {
      await api.post(`/admin/users/${selected.telegramId}/balance`, {
        amount: parseFloat(balanceAmount), type: balanceModal.type, description: balanceDesc || undefined
      });
      haptic.success();
      toast.success(`✅ تم ${balanceModal.type === 'add' ? 'إضافة' : 'خصم'} $${balanceAmount}`);
      setBalanceModal(null); setBalanceAmount(''); setBalanceDesc('');
      loadUser(selected);
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
    setBusy(false);
  };

  const handleBan = async (ban) => {
    if (ban && !banReason.trim()) return toast.error('اكتب سبب الحظر');
    haptic.medium();
    setBusy(true);
    try {
      await api.post(`/admin/users/${selected.telegramId}/ban`, { ban, reason: banReason || undefined });
      haptic.success();
      toast.success(ban ? '🚫 تم الحظر' : '✅ تم رفع الحظر');
      setSelected({ ...selected, isBanned: ban, banReason: ban ? banReason : null });
      setBanModal(false); setBanReason('');
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
    setBusy(false);
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
    setBusy(true);
    try {
      await api.post(`/admin/users/${selected.telegramId}/dm`, { message: dmMessage });
      haptic.success();
      toast.success('✅ تم الإرسال');
      setShowDM(false); setDmMessage('');
    } catch (err) { haptic.error(); toast.error('فشل في الإرسال'); }
    setBusy(false);
  };

  const openPermModal = () => {
    setPermSelection(selected?.permissions || []);
    setPermModal(true);
  };

  const togglePerm = (perm) => {
    setPermSelection((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const savePermissions = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/users/${selected.telegramId}/permissions`, { permissions: permSelection });
      haptic.success();
      toast.success('🎛️ تم حفظ الصلاحيات');
      setSelected({ ...selected, permissions: permSelection });
      setPermModal(false);
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل'); }
    setBusy(false);
  };

  // ── Edit profile ──
  const openEdit = () => {
    setEditForm({
      firstName: selected.firstName || '',
      lastName: selected.lastName || '',
      username: selected.username || '',
      phone: selected.phone || '',
      preferredLanguage: selected.preferredLanguage || 'ar',
      notificationsEnabled: selected.notificationsEnabled !== false,
      balance: Number(selected.balance || 0),
      adminNotes: selected.adminNotes || ''
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.firstName.trim()) return toast.error('الاسم الأول مطلوب');
    setBusy(true);
    try {
      const r = await api.put(`/admin/users/${selected.telegramId}`, editForm);
      haptic.success();
      toast.success('✏️ تم حفظ بيانات المستخدم');
      setEditOpen(false);
      // Merge with the server response (full control-tower payload stays fresh)
      setSelected((prev) => ({ ...prev, ...r.data.data }));
      fetchUsers(search, 1);
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل الحفظ'); }
    setBusy(false);
  };

  const orderStatusRows = selected?.stats?.ordersByStatus || {};
  const statusMeta = [
    ['completed', '✅ مكتملة', 'text-green'], ['pending', '⏳ منتظرة', 'text-warning'],
    ['processing', '🔄 قيد المعالجة', 'text-neon-blue'], ['refunded', '💰 مسترجعة', 'text-gold'],
    ['failed', '❌ فاشلة', 'text-red'], ['cancelled', '🚫 ملغاة', 'text-muted']
  ];

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
                <p className="text-green text-sm font-bold">{fmtMoney(user.balance)}</p>
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
      {selected && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:w-1/2 space-y-3 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white">ملف المستخدم</h3>
            <div className="flex gap-2">
              <button onClick={openEdit} className="neon-btn text-xs px-3 py-1.5">✏️ تعديل البيانات</button>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white text-sm px-2">✕</button>
            </div>
          </div>

          {/* Profile Card */}
          <div className="admin-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center text-2xl shrink-0">
                {selected.role === 'admin' || selected.role === 'superadmin' ? '👑' : '👤'}
              </div>
              <div className="min-w-0">
                <p className="font-black text-white truncate">{selected.firstName} {selected.lastName || ''}</p>
                <p className="text-muted text-xs truncate">@{selected.username || 'N/A'} · {selected.telegramId}</p>
                <p className="text-xs mt-0.5">
                  {selected.isBanned ? <span className="text-red">🚫 محظور {selected.banReason ? `- ${selected.banReason}` : ''}</span> : <span className="text-green">✅ نشط</span>}
                  {selected.role === 'superadmin' && <span className="text-gold ml-2">⭐ مالك</span>}
                  {selected.role === 'admin' && <span className="text-neon ml-2">👑 أدمن</span>}
                </p>
              </div>
            </div>

            {/* Money stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="الرصيد الحالي" value={fmtMoney(selected.balance)} tone="text-green" />
              <Stat label="إجمالي الإنفاق" value={fmtMoney(selected.totalSpent)} tone="text-neon" />
              <Stat label="إجمالي الشحن" value={fmtMoney(selected.totalDeposited)} tone="text-gold" />
            </div>
            {/* Behaviour stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="كل الطلبات" value={selected.totalOrders || 0} />
              <Stat label="طلبات مكتملة" value={selected.stats?.completedOrders ?? 0} tone="text-green" />
              <Stat label="متوسط الطلب" value={fmtMoney(selected.stats?.avgOrderValue)} tone="text-neon" />
              <Stat label="الإحالات" value={selected.referralCount || 0} tone="text-neon-blue" />
              <Stat label="عمر الحساب" value={`${selected.stats?.accountAgeDays ?? '—'} يوم`} />
              <Stat label="آخر طلب" value={selected.stats?.lastOrderAt ? fmtDate(selected.stats.lastOrderAt) : '—'} />
            </div>
          </div>

          {/* Deep info card */}
          <div className="admin-card space-y-2">
            <p className="font-bold text-white text-sm">🧬 معلومات الحساب</p>
            {[
              ['🕐 آخر نشاط', fmtDateTime(selected.lastSeen)],
              ['📅 الانضمام', fmtDateTime(selected.createdAt)],
              ['🌐 اللغة المفضلة', LANGUAGES.find(([c]) => c === selected.preferredLanguage)?.[1] || selected.preferredLanguage || '—'],
              ['🔤 لغة تيليجرام', selected.languageCode || '—'],
              ['📱 الهاتف', selected.phone || '—'],
              ['🔔 الإشعارات', selected.notificationsEnabled === false ? 'معطّلة 🔕' : 'مفعّلة 🔔'],
              ['🤖 تجاوز الكابتشا', selected.captchaPassed ? `نعم — ${fmtDate(selected.captchaPassedAt)}` : 'لا'],
              ['🤝 تمت إحالته بواسطة', selected.stats?.referredBy ? `${selected.stats.referredBy.firstName || ''} (@${selected.stats.referredBy.username || 'N/A'}) · ${selected.stats.referredBy.telegramId}` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 bg-bg border border-border rounded-xl px-3 py-2">
                <span className="text-[11px] text-muted font-semibold shrink-0">{label}</span>
                <span className="text-xs text-white font-bold truncate" dir="auto">{value}</span>
              </div>
            ))}
          </div>

          {/* Orders breakdown */}
          {Object.keys(orderStatusRows).length > 0 && (
            <div className="admin-card">
              <p className="font-bold text-white text-sm mb-2">📊 توزيع الطلبات</p>
              <div className="flex flex-wrap gap-1.5">
                {statusMeta.filter(([k]) => orderStatusRows[k]?.count).map(([k, label, tone]) => (
                  <span key={k} className={`text-[10px] font-bold px-2 py-1 rounded-lg border border-border bg-bg ${tone}`}>
                    {label}: {orderStatusRows[k].count} · {fmtMoney(orderStatusRows[k].total)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Admin notes preview */}
          {selected.adminNotes && (
            <div className="admin-card border-warning/30 bg-warning/5">
              <p className="text-[11px] font-bold text-warning mb-1">📝 ملاحظات الإدارة (خاصة)</p>
              <p className="text-xs text-white whitespace-pre-line">{selected.adminNotes}</p>
            </div>
          )}

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
            <motion.button whileTap={{ scale: 0.95 }} onClick={openEdit}
              className="neon-btn py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 col-span-2">
              ✏️ تعديل البيانات والرصيد والملاحظات
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowDM(true)}
              className="purple-btn py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 col-span-2">
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
                      <p className="text-[10px] text-muted">{fmtDateTime(tx.createdAt)}{tx.adminId ? ` · بواسطة ${tx.adminId}` : ''}</p>
                    </div>
                    <span className={`font-black shrink-0 ${tx.type === 'credit' || tx.type === 'refund' ? 'text-green' : 'text-red'}`}>
                      {tx.type === 'credit' || tx.type === 'refund' ? '+' : '-'}{fmtMoney(tx.amount)}
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
                <div key={order._id} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-xs gap-2">
                  <span className="text-white truncate">{order.productName} · {order.durationName}</span>
                  <span className={order.status === 'completed' ? 'text-green font-bold shrink-0' : order.status === 'refunded' ? 'text-gold font-bold shrink-0' : 'text-red shrink-0'}>{fmtMoney(order.finalPrice)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Balance Sheet */}
      <Sheet
        open={Boolean(balanceModal)}
        onClose={() => setBalanceModal(null)}
        title={balanceModal?.type === 'add' ? '➕ إضافة رصيد' : '➖ خصم رصيد'}
        footer={<SheetActions danger={balanceModal?.type === 'deduct'} saveLabel="تأكيد" onSave={handleBalance} saving={busy} onCancel={() => setBalanceModal(null)} />}
      >
        <input type="number" inputMode="decimal" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="المبلغ ($)" className="input-admin" dir="ltr" />
        <input type="text" value={balanceDesc} onChange={e => setBalanceDesc(e.target.value)} placeholder="السبب (اختياري)" className="input-admin" />
      </Sheet>

      {/* Ban Sheet */}
      <Sheet
        open={banModal}
        onClose={() => { setBanModal(false); setBanReason(''); }}
        title={selected?.isBanned ? '✅ رفع الحظر' : '🚫 حظر المستخدم'}
        footer={<SheetActions danger={!selected?.isBanned} saveLabel="تأكيد" onSave={() => handleBan(!selected?.isBanned)} saving={busy} onCancel={() => { setBanModal(false); setBanReason(''); }} />}
      >
        {!selected?.isBanned && (
          <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={3} className="input-admin resize-none" placeholder="سبب الحظر (سيظهر للمستخدم)" />
        )}
        {selected?.isBanned && <p className="text-xs text-muted m-0">سيستعيد المستخدم الوصول فوراً وسيُبلَّغ في حسابه.</p>}
      </Sheet>

      {/* Permissions Sheet */}
      <Sheet
        open={permModal}
        onClose={() => setPermModal(false)}
        title="🎛️ صلاحيات الأدمن"
        footer={<SheetActions saveLabel="💾 حفظ الصلاحيات" onSave={savePermissions} saving={busy} onCancel={() => setPermModal(false)} />}
      >
        <p className="text-xs text-muted m-0">إلى: {selected?.firstName} (@{selected?.username})</p>
        <p className="text-[11px] text-neon bg-neon/5 border border-neon/20 rounded-xl px-3 py-2 m-0">
          💡 بدون تحديد أي صلاحية = تحكم كامل بكل الأقسام.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(PERMISSION_LABELS).map(([perm, meta]) => {
            const checked = permSelection.includes(perm);
            return (
              <button key={perm} type="button" onClick={() => { haptic.light(); togglePerm(perm); }}
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
      </Sheet>

      {/* DM Sheet */}
      <Sheet
        open={showDM}
        onClose={() => setShowDM(false)}
        title="✉️ رسالة خاصة"
        footer={<SheetActions saveLabel="إرسال ✉️" onSave={handleDM} saving={busy} onCancel={() => setShowDM(false)} />}
      >
        <p className="text-xs text-muted m-0">إلى: {selected?.firstName} (@{selected?.username})</p>
        <textarea value={dmMessage} onChange={e => setDmMessage(e.target.value)} placeholder="اكتب رسالتك..." rows={4} className="input-admin resize-none" maxLength={4096} />
      </Sheet>

      {/* ── Full Edit Sheet ── */}
      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="✏️ تعديل بيانات المستخدم"
        wide
        footer={<SheetActions saveLabel="💾 حفظ كل التعديلات" onSave={saveEdit} saving={busy} onCancel={() => setEditOpen(false)} />}
      >
        {editForm && (
          <>
            <div className="grid gap-2 grid-cols-2">
              <div>
                <label className="label-admin">الاسم الأول</label>
                <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} className="input-admin mt-1" />
              </div>
              <div>
                <label className="label-admin">الاسم الأخير</label>
                <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} className="input-admin mt-1" />
              </div>
            </div>
            <div className="grid gap-2 grid-cols-2">
              <div>
                <label className="label-admin">اليوزر (بدون @)</label>
                <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} className="input-admin mt-1" dir="ltr" />
              </div>
              <div>
                <label className="label-admin">الهاتف</label>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="input-admin mt-1" dir="ltr" />
              </div>
            </div>
            <div className="grid gap-2 grid-cols-2">
              <div>
                <label className="label-admin">اللغة المفضلة</label>
                <select value={editForm.preferredLanguage} onChange={e => setEditForm(f => ({ ...f, preferredLanguage: e.target.value }))} className="input-admin mt-1">
                  {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-admin">الرصيد (تعديل مباشر)</label>
                <input type="number" inputMode="decimal" step="0.01" min="0" value={editForm.balance} onChange={e => setEditForm(f => ({ ...f, balance: e.target.value }))} className="input-admin mt-1" dir="ltr" />
                <p className="text-[10px] text-muted mt-1">الفرق يُسجَّل تلقائياً في سجل الرصيد مع اسمك.</p>
              </div>
            </div>
            <button type="button" onClick={() => setEditForm(f => ({ ...f, notificationsEnabled: !f.notificationsEnabled }))}
              className="bg-bg border border-border rounded-2xl p-3 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-white">🔔 إشعارات البوت</span>
              <span className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${editForm.notificationsEnabled ? 'bg-neon' : 'bg-border'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editForm.notificationsEnabled ? 'right-1' : 'left-1'}`} />
              </span>
            </button>
            <div>
              <label className="label-admin">📝 ملاحظات الإدارة — خاصة، لا تظهر للمستخدم</label>
              <textarea value={editForm.adminNotes} onChange={e => setEditForm(f => ({ ...f, adminNotes: e.target.value }))} rows={3} maxLength={1000} className="input-admin mt-1 resize-none" placeholder="مثال: زبون VIP — يرد بسرعة على العروض" />
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}

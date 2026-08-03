import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

const emptyForm = { code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '', description: '', minOrderAmount: 0 };

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const load = () => api.get('/admin/coupons').then(r => setCoupons(r.data.data || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.code || !form.discountValue) return toast.error('الكود والخصم مطلوبان');
    try {
      const data = {
        ...form,
        discountValue: parseFloat(form.discountValue),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxDiscountAmount: (form.maxDiscountAmount === '' || form.maxDiscountAmount === null || form.maxDiscountAmount === undefined)
          ? null : parseFloat(form.maxDiscountAmount)
      };
      if (editing) { await api.put(`/admin/coupons/${editing}`, data); toast.success('✅ تم التحديث'); }
      else { await api.post('/admin/coupons', data); toast.success('✅ تم إنشاء الكوبون'); }
      setShowForm(false); setForm(emptyForm); setEditing(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا الكوبون؟')) return;
    await api.delete(`/admin/coupons/${id}`);
    toast.success('🗑️ تم الحذف');
    load();
  };

  const handleToggle = async (coupon) => {
    await api.put(`/admin/coupons/${coupon._id}`, { isActive: !coupon.isActive });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">🎫 الكوبونات</h2>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }} className="neon-btn">+ كوبون جديد</motion.button>
      </div>

      <div className="space-y-3">
        {coupons.map((coupon, i) => (
          <motion.div key={coupon._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="admin-card border border-border flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-neon font-mono text-base">{coupon.code}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${coupon.isActive ? 'bg-green/10 text-green border-green/20' : 'bg-red/10 text-red border-red/20'}`}>
                  {coupon.isActive ? 'نشط' : 'معطّل'}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {coupon.discountType === 'percentage' ? `${coupon.discountValue}% خصم` : `$${coupon.discountValue} خصم ثابت`}
              </p>
              <div className="flex gap-3 mt-1 text-[10px] text-muted">
                <span>🔢 {coupon.currentUses}/{coupon.maxUses || '∞'}</span>
                {coupon.expiresAt && <span>📅 {new Date(coupon.expiresAt).toLocaleDateString('ar-IQ')}</span>}
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => { setForm({ ...coupon, discountValue: coupon.discountValue.toString(), maxUses: coupon.maxUses?.toString() || '' }); setEditing(coupon._id); setShowForm(true); }} className="text-xs text-neon border border-neon/20 rounded-lg px-2 py-1">✏️</button>
              <button onClick={() => handleToggle(coupon)} className="text-xs text-muted border border-border rounded-lg px-2 py-1">👁</button>
              <button onClick={() => handleDelete(coupon._id)} className="text-xs text-red border border-red/20 rounded-lg px-2 py-1">🗑</button>
            </div>
          </motion.div>
        ))}
        {coupons.length === 0 && <div className="text-center py-8 text-muted">لا توجد كوبونات بعد</div>}
      </div>

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-panel border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-3">
              <h3 className="font-black text-white">{editing ? '✏️ تعديل كوبون' : '+ كوبون جديد'}</h3>
              <div>
                <label className="text-xs text-muted">كود الخصم</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="input-admin mt-1 font-mono font-bold tracking-widest" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted">نوع الخصم</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className="input-admin mt-1 text-sm">
                    <option value="percentage">نسبة %</option>
                    <option value="fixed">مبلغ ثابت $</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted">قيمة الخصم</label>
                  <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === 'percentage' ? '20' : '2.00'} className="input-admin mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted">أقصى عدد للاستخدام</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="لا نهائي" className="input-admin mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted">تاريخ الانتهاء</label>
                  <input type="date" value={form.expiresAt?.split('T')[0] || ''} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="input-admin mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted">أقل مبلغ للطلب ($)</label>
                  <input type="number" min="0" value={form.minOrderAmount ?? ''} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="0" className="input-admin mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted">أقصى خصم ($) - اختياري</label>
                  <input type="number" min="0" value={form.maxDiscountAmount ?? ''} onChange={e => setForm(f => ({ ...f, maxDiscountAmount: e.target.value }))} placeholder="بدون حد" className="input-admin mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted">الوصف (اختياري)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-admin mt-1" />
              </div>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={save} className="flex-1 neon-btn py-3 rounded-xl font-bold">حفظ الكوبون</motion.button>
                <button onClick={() => setShowForm(false)} className="px-4 py-3 border border-border rounded-xl text-muted text-sm">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

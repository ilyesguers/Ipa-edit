import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Sheet, { SheetActions } from '../components/Sheet';
import ImagePicker from '../components/ImagePicker';
import { haptic } from '../utils/haptic';

const PRESET_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
const emptyPrize = { label: '', labelAr: '', value: 0, type: 'balance', color: '#10b981', icon: '', weight: 1, isActive: true };
const emptyWheel = { name: '', nameAr: '', costPerSpin: 1, prizes: [{ ...emptyPrize }, { ...emptyPrize, label: 'Try again', labelAr: 'حاول مجدداً', value: 0, type: 'nothing', color: '#ef4444' }] };

export default function Wheel() {
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyWheel);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPrize, setNewPrize] = useState(emptyPrize);

  const load = async () => {
    try {
      const r = await api.get('/wheel');
      setWheels(r.data.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name) return toast.error('اسم العجلة مطلوب');
    if (form.prizes.length < 2) return toast.error('مطلوب جائزتين على الأقل');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/wheel/${editing}`, form);
        toast.success('تم حفظ التعديلات');
      } else {
        await api.post('/wheel', form);
        toast.success('تم إنشاء العجلة');
      }
      haptic.success();
      setShowForm(false);
      setForm(emptyWheel);
      setEditing(null);
      await load();
    } catch (err) {
      haptic.error();
      toast.error(err.response?.data?.error || 'فشل الحفظ');
    }
    setSaving(false);
  };

  const handleEdit = (w) => {
    setForm({
      name: w.name, nameAr: w.nameAr, costPerSpin: w.costPerSpin,
      prizes: w.prizes.map(p => ({ ...p }))
    });
    setEditing(w._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذه العجلة نهائياً؟')) return;
    await api.delete(`/wheel/${id}`);
    toast.success('تم الحذف');
    load();
  };

  const handleToggle = async (w) => {
    await api.put(`/wheel/${w._id}`, { isActive: !w.isActive });
    load();
  };

  const addPrize = () => {
    if (!newPrize.label && !newPrize.labelAr) return toast.error('أدخل اسم الجائزة');
    setForm(f => ({ ...f, prizes: [...f.prizes, { ...newPrize }] }));
    setNewPrize(emptyPrize);
  };

  const removePrize = (i) => setForm(f => ({ ...f, prizes: f.prizes.filter((_, j) => j !== i) }));
  const patchPrize = (i, key, value) => setForm(f => ({
    ...f,
    prizes: f.prizes.map((p, j) => j === i ? { ...p, [key]: value } : p)
  }));

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black text-white">عجلة الحظ</h2>
          <p className="text-muted text-xs mt-1">أنشئ عجلات حظ — المستخدم يدفع ويدور ويحصل على جائزة</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setForm(emptyWheel); setEditing(null); setShowForm(true); }} className="neon-btn">
          + عجلة جديدة
        </motion.button>
      </div>

      {/* Wheel list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {wheels.map((w, i) => (
          <motion.div key={w._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="admin-card border border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-white">{w.nameAr || w.name}</p>
                <p className="text-xs text-muted">${w.costPerSpin} لكل دوران · {w.prizes?.length} جائزة</p>
              </div>
              <div className="flex gap-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${w.isActive ? 'bg-green/10 text-green border-green/20' : 'bg-red/10 text-red border-red/20'}`}>
                  {w.isActive ? 'نشط' : 'معطّل'}
                </span>
              </div>
            </div>

            {/* Prize preview strip */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {w.prizes?.slice(0, 8).map((p, j) => (
                <span key={j} className="shrink-0 text-[10px] px-2 py-1 rounded-lg border border-border" style={{ background: `${p.color}15`, color: p.color }}>
                  {p.icon || ' '} {p.labelAr || p.label} {p.value > 0 ? `$${p.value}` : ''}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted">
              <span> {w.totalSpins || 0} دوران</span>
              <span>💰 ${(w.totalPayout || 0).toFixed(2)} صرف</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleEdit(w)} className="text-xs text-neon border border-neon/20 rounded-lg px-3 py-1">تعديل</button>
              <button onClick={() => handleToggle(w)} className="text-xs border rounded-lg px-3 py-1 text-muted border-border">{w.isActive ? 'تعطيل' : 'تفعيل'}</button>
              <button onClick={() => handleDelete(w._id)} className="text-xs text-red border border-red/20 rounded-lg px-3 py-1">حذف</button>
            </div>
          </motion.div>
        ))}
        {!wheels.length && (
          <div className="admin-card border border-border text-center py-8">
            <p className="text-4xl mb-3"> </p>
            <p className="text-muted">لا توجد عجلات بعد — أنشئ عجلتك الأولى</p>
          </div>
        )}
      </div>

      {/* Wheel form sheet */}
      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '✏️ تعديل العجلة' : '➕ عجلة جديدة'}
        wide
        footer={<SheetActions saveLabel="💾 حفظ" onSave={handleSave} saving={saving} onCancel={() => setShowForm(false)} />}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label-admin">اسم العجلة (EN)</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-admin mt-1" placeholder="Lucky Wheel" />
            </div>
            <div>
              <label className="label-admin">اسم العجلة (AR)</label>
              <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="input-admin mt-1" placeholder="عجلة الحظ" />
            </div>
          </div>

          <div>
            <label className="label-admin">سعر الدوران ($)</label>
            <input type="number" step="0.01" min="0.01" value={form.costPerSpin} onChange={e => setForm(f => ({ ...f, costPerSpin: Number(e.target.value) || 0.01 }))} className="input-admin mt-1 w-32" />
          </div>

          {/* Prizes */}
          <div>
            <label className="label-admin">الجوائز ({form.prizes.length})</label>
            <div className="space-y-2 mt-2">
              {form.prizes.map((p, i) => (
                <div key={i} className="bg-bg border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ background: p.color }} />
                      <span className="text-xs text-white font-bold">{p.labelAr || p.label || `جائزة ${i + 1}`}</span>
                    </div>
                    <button onClick={() => removePrize(i)} className="text-red text-xs">حذف</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input value={p.label} onChange={e => patchPrize(i, 'label', e.target.value)} className="input-admin text-xs" placeholder="EN name" />
                    <input value={p.labelAr} onChange={e => patchPrize(i, 'labelAr', e.target.value)} className="input-admin text-xs" placeholder="الاسم بالعربي" />
                    <input type="number" step="0.01" value={p.value} onChange={e => patchPrize(i, 'value', Number(e.target.value))} className="input-admin text-xs" placeholder="القيمة $" />
                    <input type="number" step="0.1" min="0.1" value={p.weight} onChange={e => patchPrize(i, 'weight', Math.max(0.1, Number(e.target.value)))} className="input-admin text-xs" placeholder="الوزن" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={p.type} onChange={e => patchPrize(i, 'type', e.target.value)} className="input-admin text-xs w-auto">
                      <option value="balance">رصيد</option>
                      <option value="nothing">لا شيء</option>
                    </select>
                    <div className="flex gap-1">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => patchPrize(i, 'color', c)}
                          className={`w-5 h-5 rounded-full border-2 ${p.color === c ? 'border-white' : 'border-transparent'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                    <input value={p.icon} onChange={e => patchPrize(i, 'icon', e.target.value)} className="input-admin text-xs w-16 text-center" placeholder=" " />
                  </div>
                </div>
              ))}
            </div>

            {/* Add prize inline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              <input value={newPrize.label} onChange={e => setNewPrize(p => ({ ...p, label: e.target.value }))} className="input-admin text-xs" placeholder="EN prize" />
              <input value={newPrize.labelAr} onChange={e => setNewPrize(p => ({ ...p, labelAr: e.target.value }))} className="input-admin text-xs" placeholder="جائزة بالعربي" />
              <input type="number" step="0.01" value={newPrize.value} onChange={e => setNewPrize(p => ({ ...p, value: Number(e.target.value) }))} className="input-admin text-xs" placeholder="القيمة $" />
              <button onClick={addPrize} className="success-btn text-xs">+ إضافة جائزة</button>
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

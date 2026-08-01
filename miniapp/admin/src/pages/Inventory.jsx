import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualKeys, setManualKeys] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { api.get('/admin/products').then(r => setProducts(r.data.data || [])); }, []);

  const loadKeys = async (p = 1) => {
    if (!selectedProduct || !selectedDuration) return;
    setKeysLoading(true);
    try {
      const params = new URLSearchParams({ productId: selectedProduct._id, durationId: selectedDuration._id, page: p, limit: 30 });
      if (filterStatus) params.set('status', filterStatus);
      const r = await api.get(`/admin/keys?${params}`);
      setKeys(p === 1 ? r.data.data : prev => [...prev, ...r.data.data]);
      setTotalPages(r.data.totalPages || 1);
    } catch (e) {}
    setKeysLoading(false);
  };

  useEffect(() => { setPage(1); loadKeys(1); }, [selectedProduct, selectedDuration, filterStatus]);

  const handleAddKeys = async () => {
    const keyArray = manualKeys.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    if (!keyArray.length) return toast.error('❌ أضف مفاتيح أولاً');

    // Duplicate detection inside the paste buffer
    const seen = new Set();
    const dups = new Set();
    keyArray.forEach(k => {
      const v = k.toLowerCase();
      if (seen.has(v)) dups.add(k);
      seen.add(v);
    });
    if (dups.size > 0 && !confirm(`⚠️ يوجد ${dups.size} مفتاح مكرر في النص - متابعة على أي حال؟`)) return;

    try {
      const r = await api.post('/admin/keys/bulk', {
        productId: selectedProduct._id,
        durationId: selectedDuration._id,
        durationName: selectedDuration.nameAr || selectedDuration.name,
        keys: keyArray
      });
      toast.success(`✅ تم إضافة ${r.data.added} مفتاح بنجاح`);
      setManualKeys('');
      setShowAddModal(false);
      loadKeys(1);
    } catch (err) {
      toast.error(err.response?.data?.error || '❌ فشل في إضافة المفاتيح');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    const r = await api.post('/upload/keys-file', form);
    setManualKeys(r.data.keys.join('\n'));
    toast.success(`📂 تم رفع ${r.data.count} مفتاح من الملف`);
  };

  const handleDeleteUnsold = async () => {
    if (!confirm('🗑️ حذف جميع المفاتيح غير المباعة؟')) return;
    try {
      const r = await api.delete('/admin/keys/unsold', {
        data: { productId: selectedProduct._id, durationId: selectedDuration._id }
      });
      toast.success(`🗑️ تم حذف ${r.data.deleted} مفتاح`);
      loadKeys(1);
    } catch (err) {
      toast.error('❌ فشل في الحذف');
    }
  };

  const handleKeyStatus = async (key, status) => {
    try {
      await api.post(`/admin/keys/${key._id}/status`, { status });
      toast.success(status === 'available' ? '🔄 أُعيد المفتاح للمخزون' : status === 'invalid' ? '🚫 تم إبطال المفتاح' : `✅ تم التحديث إلى ${status}`);
      loadKeys(1);
    } catch (err) {
      toast.error(err.response?.data?.error || '❌ فشل في التحديث');
    }
  };

  const STATUS_META = {
    available: { label: 'متاح', cls: 'text-green bg-green/10 border-green/20', icon: '🟢' },
    sold: { label: 'مباع', cls: 'text-red bg-red/10 border-red/20', icon: '🔴' },
    reserved: { label: 'محجوز', cls: 'text-warning bg-warning/10 border-warning/20', icon: '⏳' },
    expired: { label: 'منتهي', cls: 'text-muted bg-muted/10 border-muted/20', icon: '🕓' },
    invalid: { label: 'غير صالح', cls: 'text-gold bg-gold/10 border-gold/20', icon: '🚫' },
  };

  const duplicates = useMemo(() => {
    const seen = new Map();
    const dup = new Set();
    keys.forEach(k => {
      const v = String(k.keyValue || '').trim().toLowerCase();
      if (!v) return;
      if (seen.has(v)) dup.add(v);
      seen.set(v, (seen.get(v) || 0) + 1);
    });
    return dup;
  }, [keys]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">📦 المخزون - إدارة المفاتيح</h2>
      </div>

      {/* Step-by-step Guide */}
      <div className="rounded-2xl border border-purple/20 bg-gradient-to-br from-purple/10 to-emerald-500/5 p-4 space-y-2">
        <p className="text-sm font-black text-white flex items-center gap-2">📋 <span>كيفية إضافة مفاتيح - خطوة بخطوة</span></p>
        <div className="grid gap-2 text-xs text-muted">
          <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-purple/20 flex items-center justify-center text-purple font-black shrink-0">1</span> اختر <span className="text-white font-bold">المنتج</span> المناسب من القائمة الأولى</p>
          <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-purple/20 flex items-center justify-center text-purple font-black shrink-0">2</span> اختر <span className="text-white font-bold">المدة</span> المناسبة من القائمة الثانية</p>
          <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black shrink-0">3</span> اضغط <span className="text-white font-bold">➕ إضافة مفاتيح جديدة</span> للبدء</p>
          <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black shrink-0">4</span> يمكنك <span className="text-white font-bold">رفع ملف .txt</span> أو <span className="text-white font-bold">الكتابة يدوياً</span> (كل مفتاح في سطر)</p>
          <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black shrink-0">5</span> اضغط <span className="text-white font-bold">✅ إضافة المفاتيح</span> للحفظ</p>
        </div>
      </div>

      {/* Select Product */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted font-semibold block mb-1">📦 اختر المنتج (الخطوة 1)</label>
          <select value={selectedProduct?._id || ''} onChange={e => { const p = products.find(x => x._id === e.target.value); setSelectedProduct(p); setSelectedDuration(null); }} className="input-admin">
            <option value="">-- اختر المنتج --</option>
            {products.map(p => <option key={p._id} value={p._id}>{p.nameAr || p.name}</option>)}
          </select>
        </div>

        {selectedProduct && (
          <div>
            <label className="text-xs text-muted font-semibold block mb-1">⏱ اختر المدة (الخطوة 2)</label>
            <select value={selectedDuration?._id || ''} onChange={e => setSelectedDuration(selectedProduct.durations.find(d => d._id === e.target.value))} className="input-admin">
              <option value="">-- اختر المدة --</option>
              {selectedProduct.durations?.filter(d => d.isActive).map(d => (
                <option key={d._id} value={d._id}>{d.nameAr || d.name} - ${d.price}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stock Actions */}
      {selectedProduct && selectedDuration && (
        <div className="admin-card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold text-white text-sm">{selectedProduct.nameAr || selectedProduct.name}</p>
              <p className="text-muted text-xs">{selectedDuration.nameAr || selectedDuration.name} - ${selectedDuration.price}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)} className="success-btn">
                ➕ إضافة مفاتيح جديدة
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleDeleteUnsold} className="danger-btn">
                🗑️ حذف غير المباعة
              </motion.button>
            </div>
          </div>

          {/* Stock stats */}
          <div className="w-full bg-bg rounded-xl p-3">
            <p className="text-xs text-muted mb-2">📊 إحصائيات المخزون</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-green text-lg font-black">{keys.filter(k => k.status === 'available').length}</p>
                <p className="text-[10px] text-muted">🟢 متاح</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-red text-lg font-black">{keys.filter(k => k.status === 'sold').length}</p>
                <p className="text-[10px] text-muted">🔴 مباع</p>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[['', '🔄 الكل'], ['available', '🟢 متاح'], ['sold', '🔴 مباع'], ['reserved', '⏳ محجوز'], ['expired', '🕓 منتهي'], ['invalid', '🚫 غير صالح']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterStatus(val)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all
                  ${filterStatus === val ? 'bg-neon/10 border-neon/30 text-neon' : 'border-border text-muted bg-card'}`}>
                {label}
              </button>
            ))}
          </div>
          {duplicates.size > 0 && (
            <p className="text-[11px] text-gold bg-gold/5 border border-gold/20 rounded-xl px-3 py-2">
              ⚠️ يوجد {duplicates.size} مفتاح مكرر في هذه الصفحة - انتبه من البيع المزدوج!
            </p>
          )}
        </div>
      )}

      {/* Keys Table */}
      {selectedProduct && selectedDuration && (
        <div className="admin-card">
          <p className="text-sm font-bold text-white mb-3">
            🔑 المفاتيح {keysLoading ? '⏳...' : `(${keys.length})`}
          </p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {keys.map((key, i) => {
              const meta = STATUS_META[key.status] || STATUS_META.available;
              const isDup = duplicates.has(String(key.keyValue || '').trim().toLowerCase());
              return (
                <motion.div key={key._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className={`flex items-center justify-between bg-bg border rounded-xl px-3 py-2 text-xs ${isDup ? 'border-gold/40' : 'border-border'}`}>
                  <span className="font-mono text-white flex-1 truncate ml-2">
                    {key.keyValue}
                    {isDup && <span className="text-gold mr-1" title="مفتاح مكرر">⚠️</span>}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.icon} {meta.label}</span>
                    {key.status === 'sold' && <span className="text-muted text-[10px]">@{key.soldToUsername || key.soldTo}</span>}
                    {key.status !== 'available' && (
                      <button onClick={() => handleKeyStatus(key, 'available')} title="إعادة للمخزون" className="text-green opacity-60 hover:opacity-100 text-sm">🔄</button>
                    )}
                    {key.status === 'available' && (
                      <button onClick={() => handleKeyStatus(key, 'invalid')} title="إبطال المفتاح" className="text-gold opacity-60 hover:opacity-100 text-sm">🚫</button>
                    )}
                    <button onClick={async () => { if (confirm('حذف هذا المفتاح؟')) { await api.delete(`/admin/keys/${key._id}`); loadKeys(1); } }} className="text-red opacity-50 hover:opacity-100 text-sm">🗑️</button>
                  </div>
                </motion.div>
              );
            })}
            {keysLoading && <div className="text-center text-muted text-sm py-2">⏳ جاري التحميل...</div>}
            {!keysLoading && keys.length === 0 && <div className="text-center text-muted text-sm py-4">🔍 لا توجد مفاتيح لهذا المنتج/المدة</div>}
          </div>
          {page < totalPages && (
            <button onClick={() => { const p = page + 1; setPage(p); loadKeys(p); }} className="w-full mt-3 text-sm text-muted border border-border rounded-xl py-2 hover:text-white transition-colors">📦 تحميل المزيد</button>
          )}
        </div>
      )}

      {/* Add Keys Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-4 z-50 bg-panel border border-border rounded-2xl flex flex-col overflow-hidden max-w-2xl mx-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-black text-white text-lg flex items-center gap-2">➕ <span>إضافة مفاتيح جديدة</span></h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-card border border-border text-muted hover:text-white text-sm">✕</button>
              </div>
              <div className="p-4 flex-1 space-y-4 overflow-y-auto">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border border-emerald-500/20 p-3">
                  <label className="text-xs text-emerald-400 font-semibold block mb-1">📋 المنتج / المدة</label>
                  <p className="text-white text-sm font-bold">{selectedProduct?.nameAr || selectedProduct?.name} <span className="text-purple-400">—</span> {selectedDuration?.nameAr || selectedDuration?.name}</p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-xs text-muted font-semibold block mb-2">📁 <span className="text-white">الطريقة الأولى:</span> رفع ملف .txt</label>
                  <div className="bg-bg border border-dashed border-border rounded-xl p-4 text-center">
                    <p className="text-xs text-muted mb-2">💡 كل مفتاح في سطر منفصل داخل الملف</p>
                    <input type="file" accept=".txt" onChange={handleFileUpload} className="text-xs text-white file:bg-neon/10 file:border file:border-neon/30 file:text-neon file:rounded-lg file:px-3 file:py-1.5 file:font-bold file:cursor-pointer file:mr-2" />
                  </div>
                </div>

                {/* Manual Input */}
                <div>
                  <label className="text-xs text-muted font-semibold block mb-2">✏️ <span className="text-white">الطريقة الثانية:</span> إدخال يدوي</label>
                  <textarea
                    value={manualKeys}
                    onChange={e => setManualKeys(e.target.value)}
                    placeholder={'اكتب كل مفتاح في سطر منفصل\nمثال:\nABCD-1234-EFGH\nWXYZ-5678-IJKL\nMNOP-9012-QRST'}
                    rows={8}
                    className="input-admin font-mono text-xs resize-none"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-muted text-xs">
                      {manualKeys.split('\n').filter(k => k.trim()).length > 0 
                        ? `📊 ${manualKeys.split('\n').filter(k => k.trim()).length} مفتاح`
                        : '💡 اكتب المفاتيح واحد تحت الثاني'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddKeys} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-green-500/20">
                  ✅ إضافة {manualKeys.split('\n').filter(k => k.trim()).length || ''} مفتاح
                </motion.button>
                <button onClick={() => setShowAddModal(false)} className="px-5 py-3 border border-border rounded-xl text-muted font-bold text-sm hover:text-white transition-colors">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

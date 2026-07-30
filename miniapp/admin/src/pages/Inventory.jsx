import React, { useEffect, useState } from 'react';
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
    if (!keyArray.length) return toast.error('أضف مفاتيح أولاً');
    try {
      const r = await api.post('/admin/keys/bulk', {
        productId: selectedProduct._id,
        durationId: selectedDuration._id,
        durationName: selectedDuration.nameAr || selectedDuration.name,
        keys: keyArray
      });
      toast.success(`✅ تم إضافة ${r.data.added} مفتاح`);
      setManualKeys('');
      setShowAddModal(false);
      loadKeys(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل في إضافة المفاتيح');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    const r = await api.post('/upload/keys-file', form);
    setManualKeys(r.data.keys.join('\n'));
    toast.success(`📂 تم رفع ${r.data.count} مفتاح`);
  };

  const handleDeleteUnsold = async () => {
    if (!confirm('حذف جميع المفاتيح غير المباعة؟')) return;
    try {
      const r = await api.delete('/admin/keys/unsold', {
        data: { productId: selectedProduct._id, durationId: selectedDuration._id }
      });
      toast.success(`🗑️ حذف ${r.data.deleted} مفتاح`);
      loadKeys(1);
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">📦 المخزون</h2>
      </div>

      {/* Select Product */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted font-semibold block mb-1">اختر المنتج</label>
          <select value={selectedProduct?._id || ''} onChange={e => { const p = products.find(x => x._id === e.target.value); setSelectedProduct(p); setSelectedDuration(null); }} className="input-admin">
            <option value="">-- اختر المنتج --</option>
            {products.map(p => <option key={p._id} value={p._id}>{p.nameAr || p.name}</option>)}
          </select>
        </div>

        {selectedProduct && (
          <div>
            <label className="text-xs text-muted font-semibold block mb-1">اختر المدة</label>
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
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)} className="neon-btn">
                ➕ إضافة مفاتيح
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleDeleteUnsold} className="danger-btn">
                🗑️ حذف غير المباعة
              </motion.button>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['', 'available', 'sold'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all
                  ${filterStatus === s ? 'bg-neon/10 border-neon/30 text-neon' : 'border-border text-muted bg-card'}`}>
                {s === '' ? 'الكل' : s === 'available' ? '🟢 متاح' : '🔴 مباع'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keys Table */}
      {selectedProduct && selectedDuration && (
        <div className="admin-card">
          <p className="text-sm font-bold text-white mb-3">
            المفاتيح {keysLoading ? '...' : `(${keys.length})`}
          </p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {keys.map((key, i) => (
              <motion.div key={key._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center justify-between bg-bg border border-border rounded-xl px-3 py-2 text-xs">
                <span className="font-mono text-white flex-1 truncate ml-2">{key.keyValue}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {key.status === 'available' ? (
                    <span className="text-green font-bold">✅ متاح</span>
                  ) : (
                    <div className="text-right">
                      <span className="text-red font-bold block">🔴 مباع</span>
                      <span className="text-muted text-[10px]">@{key.soldToUsername || key.soldTo}</span>
                    </div>
                  )}
                  <button onClick={async () => { await api.delete(`/admin/keys/${key._id}`); loadKeys(1); }} className="text-red opacity-50 hover:opacity-100">🗑</button>
                </div>
              </motion.div>
            ))}
            {keysLoading && <div className="text-center text-muted text-sm py-2">جاري التحميل...</div>}
            {!keysLoading && keys.length === 0 && <div className="text-center text-muted text-sm py-4">لا توجد مفاتيح</div>}
          </div>
          {page < totalPages && (
            <button onClick={() => { const p = page + 1; setPage(p); loadKeys(p); }} className="w-full mt-3 text-sm text-muted border border-border rounded-xl py-2">تحميل المزيد</button>
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
                <h3 className="font-black text-white">➕ إضافة مفاتيح</h3>
                <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-white">✕</button>
              </div>
              <div className="p-4 flex-1 space-y-3 overflow-y-auto">
                <div>
                  <label className="text-xs text-muted font-semibold block mb-2">المنتج / المدة</label>
                  <p className="text-neon text-sm font-bold">{selectedProduct?.nameAr || selectedProduct?.name} — {selectedDuration?.nameAr || selectedDuration?.name}</p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-xs text-muted font-semibold block mb-2">📁 رفع ملف .txt</label>
                  <input type="file" accept=".txt" onChange={handleFileUpload} className="text-xs text-white file:bg-neon/10 file:border file:border-neon/30 file:text-neon file:rounded-lg file:px-3 file:py-1 file:font-bold file:cursor-pointer" />
                </div>

                {/* Manual Input */}
                <div>
                  <label className="text-xs text-muted font-semibold block mb-2">✏️ إدخال يدوي (كل مفتاح في سطر)</label>
                  <textarea
                    value={manualKeys}
                    onChange={e => setManualKeys(e.target.value)}
                    placeholder="key1&#10;key2&#10;key3"
                    rows={8}
                    className="input-admin font-mono text-xs resize-none"
                  />
                  <p className="text-muted text-xs mt-1">{manualKeys.split('\n').filter(k => k.trim()).length} مفتاح</p>
                </div>
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddKeys} className="flex-1 success-btn py-3 rounded-xl font-bold">✅ إضافة المفاتيح</motion.button>
                <button onClick={() => setShowAddModal(false)} className="px-4 py-3 border border-border rounded-xl text-muted font-bold text-sm">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

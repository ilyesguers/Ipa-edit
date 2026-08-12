import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ImagePicker from '../components/ImagePicker';
import Sheet, { SheetActions } from '../components/Sheet';
import { haptic } from '../utils/haptic';

const emptyProduct = { name: '', nameAr: '', game: '', category: '', description: '', features: [], durations: [], isActive: true, isFeatured: false, productType: 'panel_key', logo: null, banner: null };
const emptyDuration = { name: '', nameAr: '', days: 1, price: '', isActive: true };

const makeSlug = (name) => String(name || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
  .replace(/^-+|-+$/g, '') || `product-${Date.now()}`;

const normalizeDuration = (duration) => ({
  ...(duration._id ? { _id: duration._id } : {}),
  name: String(duration.name || duration.nameAr || '').trim(),
  nameAr: String(duration.nameAr || '').trim(),
  days: Math.max(1, parseInt(duration.days, 10) || 1),
  price: Math.max(0, Number.parseFloat(duration.price) || 0),
  originalPrice: duration.originalPrice === '' || duration.originalPrice === undefined || duration.originalPrice === null ? null : Math.max(0, Number.parseFloat(duration.originalPrice) || 0),
  isActive: duration.isActive !== false,
  stockCount: Math.max(0, parseInt(duration.stockCount, 10) || 0),
  soldCount: Math.max(0, parseInt(duration.soldCount, 10) || 0),
  order: parseInt(duration.order, 10) || 0
});

const buildProductPayload = (form, games, editing) => {
  const selectedGame = games.find((game) => game._id === form.game);
  const category = form.category || selectedGame?.category?._id || selectedGame?.category || '';
  return {
    name: String(form.name || '').trim(),
    nameAr: String(form.nameAr || '').trim(),
    slug: editing ? (form.slug || makeSlug(form.name)) : `${makeSlug(form.name)}-${Date.now()}`,
    game: form.game,
    category,
    description: String(form.description || ''),
    features: (form.features || []).map((feature) => ({
      text: String(feature.text || '').trim(),
      icon: feature.icon || '✅',
      isHighlighted: Boolean(feature.isHighlighted)
    })).filter((feature) => feature.text),
    durations: (form.durations || []).map(normalizeDuration).filter((duration) => duration.name),
    productType: form.productType || 'panel_key',
    logo: form.logo || null,
    banner: form.banner || null,
    isActive: form.isActive !== false,
    isFeatured: Boolean(form.isFeatured),
    isHidden: Boolean(form.isHidden),
    order: parseInt(form.order, 10) || 0,
    tags: Array.isArray(form.tags) ? form.tags : [],
    shareMessage: form.shareMessage || ''
  };
};

const getMinPrice = (durations = []) => {
  const prices = durations
    .filter((duration) => duration.isActive !== false)
    .map((duration) => Number(duration.price))
    .filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : 0;
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [filterGame, setFilterGame] = useState('');
  const [newDuration, setNewDuration] = useState(emptyDuration);
  const [editingDurationIndex, setEditingDurationIndex] = useState(null); // inline duration editing
  const [showDurationForm, setShowDurationForm] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Batch selection & bulk actions ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  const [bulkLogo, setBulkLogo] = useState(null);
  const [bulkBanner, setBulkBanner] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p._id)));
    }
  };

  const load = async () => {
    const [pr, gr, cr] = await Promise.all([
      api.get(`/admin/products${filterGame ? `?gameId=${filterGame}` : ''}`),
      api.get('/admin/games'),
      api.get('/admin/categories')
    ]);
    setProducts(pr.data.data || []);
    setGames(gr.data.data || []);
    setCategories(cr.data.data || []);
  };

  useEffect(() => { load(); }, [filterGame]);

  const handleSave = async () => {
    if (!form.name || !form.game) return toast.error('اسم المنتج واللعبة مطلوبان');
    const data = buildProductPayload(form, games, editing);
    if (!data.category) return toast.error('اختر لعبة مرتبطة بقسم صالح');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/products/${editing}`, data);
        toast.success('✅ تم حفظ كل التعديلات');
      } else {
        await api.post('/admin/products', data);
        toast.success('✅ تم الإنشاء');
      }
      haptic.success();
      setShowForm(false);
      setForm(emptyProduct);
      setEditing(null);
      await load();
    } catch (err) { haptic.error(); toast.error(err.response?.data?.error || 'فشل الحفظ'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا المنتج؟')) return;
    await api.delete(`/admin/products/${id}`);
    toast.success('🗑️ تم الحذف');
    load();
  };

  const handleToggle = async (p) => {
    await api.put(`/admin/products/${p._id}`, { isActive: !p.isActive });
    load();
  };

  const handleEdit = (p) => {
    setForm({ ...p, game: p.game?._id || p.game, category: p.category?._id || p.category });
    setEditing(p._id);
    setShowForm(true);
  };

  // ── Bulk operations ──
  const bulkSetActive = async (isActive) => {
    if (!selectedIds.size) return toast.error('حدد منتجات أولاً');
    setBulkProcessing(true);
    haptic.medium();
    let success = 0;
    for (const id of selectedIds) {
      try {
        await api.put(`/admin/products/${id}`, { isActive });
        success++;
      } catch (_) {}
    }
    toast.success(`✅ تم ${isActive ? 'تفعيل' : 'تعطيل'} ${success} منتج`);
    setSelectedIds(new Set());
    setBulkMode(false);
    await load();
    setBulkProcessing(false);
  };

  const bulkSetFeatured = async (isFeatured) => {
    if (!selectedIds.size) return toast.error('حدد منتجات أولاً');
    setBulkProcessing(true);
    haptic.medium();
    let success = 0;
    for (const id of selectedIds) {
      try {
        await api.put(`/admin/products/${id}`, { isFeatured });
        success++;
      } catch (_) {}
    }
    toast.success(`⭐ تم ${isFeatured ? 'جعل' : 'إلغاء'} ${success} منتج كمميز`);
    setSelectedIds(new Set());
    setBulkMode(false);
    await load();
    setBulkProcessing(false);
  };

  const bulkApplyImage = async () => {
    if (!selectedIds.size) return toast.error('حدد منتجات أولاً');
    if (!bulkLogo && !bulkBanner) return toast.error('اختر صورة واحدة على الأقل');
    setBulkProcessing(true);
    haptic.medium();
    let success = 0;
    for (const id of selectedIds) {
      try {
        const update = {};
        if (bulkLogo) update.logo = bulkLogo;
        if (bulkBanner) update.banner = bulkBanner;
        await api.put(`/admin/products/${id}`, update);
        success++;
      } catch (_) {}
    }
    toast.success(`🖼️ تم تحديث صور ${success} منتج`);
    setShowBulkSheet(false);
    setBulkLogo(null);
    setBulkBanner(null);
    setSelectedIds(new Set());
    setBulkMode(false);
    await load();
    setBulkProcessing(false);
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return toast.error('حدد منتجات أولاً');
    if (!confirm(`⚠️ حذف ${selectedIds.size} منتج نهائياً؟`)) return;
    setBulkProcessing(true);
    haptic.medium();
    let success = 0;
    for (const id of selectedIds) {
      try {
        await api.delete(`/admin/products/${id}`);
        success++;
      } catch (_) {}
    }
    toast.success(`🗑️ تم حذف ${success} منتج`);
    setSelectedIds(new Set());
    setBulkMode(false);
    await load();
    setBulkProcessing(false);
  };

  const duplicateProduct = async (p) => {
    haptic.light();
    try {
      const data = buildProductPayload({ ...p, name: `${p.name} (copy)`, nameAr: `${p.nameAr || p.name} (نسخة)`, slug: '' }, games, false);
      await api.post('/admin/products', data);
      toast.success('📋 تم نسخ المنتج');
      await load();
    } catch (err) {
      toast.error('فشل النسخ');
    }
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setForm(f => ({ ...f, features: [...(f.features || []), { text: featureInput.trim(), icon: '✅' }] }));
    setFeatureInput('');
  };

  const addDuration = () => {
    if (!newDuration.name || newDuration.price === '' || newDuration.price === null) return toast.error('اسم وسعر مطلوبان للمدة');
    const clean = { ...newDuration, price: parseFloat(newDuration.price) };
    setForm(f => {
      const durations = [...(f.durations || [])];
      if (editingDurationIndex !== null && durations[editingDurationIndex]) {
        durations[editingDurationIndex] = { ...durations[editingDurationIndex], ...clean };
      } else {
        durations.push(clean);
      }
      return { ...f, durations };
    });
    setNewDuration(emptyDuration);
    setEditingDurationIndex(null);
    setShowDurationForm(false);
    if (editingDurationIndex !== null) toast.success('✅ تم تحديث المدة');
  };

  const editDuration = (index) => {
    const duration = form.durations?.[index];
    if (!duration) return;
    setNewDuration({ name: duration.name || '', nameAr: duration.nameAr || '', days: duration.days || 1, price: duration.price ?? '', isActive: duration.isActive !== false });
    setEditingDurationIndex(index);
    setShowDurationForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black text-white">🔑 المنتجات</h2>
        <div className="flex gap-2 flex-wrap">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }} className={`text-xs px-3 py-2 rounded-xl border font-bold transition-all ${bulkMode ? 'bg-gold/20 border-gold/40 text-gold' : 'bg-card border-border text-muted hover:text-white'}`}>
            {bulkMode ? '✅ تحديد جماعي' : '☑️ تحديد جماعي'}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setForm(emptyProduct); setEditing(null); setShowForm(true); }} className="neon-btn">
            + إنشاء منتج جديد
          </motion.button>
        </div>
      </div>

      {/* Bulk actions toolbar */}
      <AnimatePresence>
        {bulkMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="admin-card bg-gradient-to-r from-gold/10 to-neon/10 border-gold/30 space-y-3"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-black text-white">📦 تم تحديد <span className="text-gold">{selectedIds.size}</span> منتج</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowBulkSheet(true)} className="text-xs px-3 py-1.5 rounded-lg bg-neon/20 border border-neon/30 text-neon font-bold">🖼️ تعيين صور</button>
                <button onClick={() => bulkSetActive(true)} className="text-xs px-3 py-1.5 rounded-lg bg-green/20 border border-green/30 text-green font-bold">✅ تفعيل الكل</button>
                <button onClick={() => bulkSetActive(false)} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold">⏸️ تعطيل الكل</button>
                <button onClick={() => bulkSetFeatured(true)} className="text-xs px-3 py-1.5 rounded-lg bg-gold/20 border border-gold/30 text-gold font-bold">⭐ مميز</button>
                <button onClick={() => bulkDelete()} className="text-xs px-3 py-1.5 rounded-lg bg-red/20 border border-red/30 text-red font-bold">🗑️ حذف المحدد</button>
                <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border text-muted font-bold">{selectedIds.size === products.length ? 'إلغاء الكل' : 'تحديد الكل'}</button>
              </div>
            </div>
            {bulkProcessing && <div className="text-xs text-gold animate-pulse">⏳ جاري المعالجة...</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick guide */}
      <div className="rounded-2xl border border-purple/20 bg-gradient-to-br from-purple/10 to-emerald-500/5 p-3 text-xs text-muted space-y-1">
        <p className="text-white font-bold text-sm mb-1">📋 كيفية إضافة منتج جديد:</p>
        <p>1️⃣ اذهب إلى <span className="text-purple-400 font-bold">الأقسام والألعاب</span> أولاً وأنشئ القسم واللعبة</p>
        <p>2️⃣ ارجع إلى <span className="text-purple-400 font-bold">المنتجات</span> واضغط "إنشاء منتج جديد"</p>
        <p>3️⃣ اختر اللعبة، أضف اسم المنتج، المميزات، والمدد (كل مدة = مفتاح بفترة صلاحية مختلفة)</p>
        <p>4️⃣ بعد حفظ المنتج، اذهب إلى <span className="text-purple-400 font-bold">المخزون</span> لإضافة المفاتيح الفعلية</p>
      </div>

      <select value={filterGame} onChange={e => setFilterGame(e.target.value)} className="input-admin">
        <option value="">جميع الألعاب</option>
        {games.map(g => <option key={g._id} value={g._id}>{g.nameAr || g.name}</option>)}
      </select>

      <div className="grid gap-3 sm:grid-cols-2">
        {products.map((p, i) => (
          <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`admin-card border flex items-start gap-3 transition-all ${bulkMode && selectedIds.has(p._id) ? 'border-gold/60 bg-gold/5' : 'border-border'}`}>
            {bulkMode && (
              <button
                onClick={() => toggleSelect(p._id)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${selectedIds.has(p._id) ? 'bg-gold border-gold text-white' : 'bg-bg border-border'}`}
              >
                {selectedIds.has(p._id) && <span className="text-xs">✓</span>}
              </button>
            )}
            {p.logo ? <img src={p.logo} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" /> :
              <div className="w-12 h-12 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center text-xl flex-shrink-0">🔑</div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <p className="font-bold text-white text-sm">{p.nameAr || p.name}</p>
                {p.isFeatured && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">⭐ مميز</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.isActive ? 'bg-green/10 text-green border-green/20' : 'bg-red/10 text-red border-red/20'}`}>{p.isActive ? 'نشط' : 'معطّل'}</span>
              </div>
              <p className="text-xs text-muted">{p.game?.nameAr || p.game?.name || '—'} · {p.durations?.length} مدة</p>
              <p className="text-xs text-neon font-semibold">من ${getMinPrice(p.durations).toFixed(2)}</p>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => handleEdit(p)} className="text-xs text-neon border border-neon/20 rounded-lg px-2 py-1">✏️</button>
              <button onClick={() => duplicateProduct(p)} className="text-xs border rounded-lg px-2 py-1 text-muted border-border" title="نسخ المنتج">📋</button>
              <button onClick={() => handleToggle(p)} className="text-xs border rounded-lg px-2 py-1 text-muted border-border">👁</button>
              <button onClick={() => handleDelete(p._id)} className="text-xs text-red border border-red/20 rounded-lg px-2 py-1">🗑</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Product Form Sheet — the save button lives in the sticky footer so it
          is always reachable from a phone, no matter how long the form gets. */}
      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '✏️ تعديل المنتج' : '➕ إنشاء منتج جديد'}
        wide
        footer={<SheetActions saveLabel="💾 حفظ ونشر" onSave={handleSave} saving={saving} onCancel={() => setShowForm(false)} />}
      >

                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label-admin">اسم المنتج (EN)</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-admin mt-1" placeholder="Silent Cheats" /></div>
                  <div><label className="label-admin">اسم المنتج (AR)</label><input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="input-admin mt-1" placeholder="سايلنت تشيتس" /></div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label-admin">اللعبة</label>
                    <select value={form.game} onChange={e => { const g = games.find(x => x._id === e.target.value); setForm(f => ({ ...f, game: e.target.value, category: g?.category?._id || g?.category || '' })); }} className="input-admin mt-1">
                      <option value="">اختر اللعبة</option>
                      {games.map(g => <option key={g._id} value={g._id}>{g.nameAr || g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">النوع</label>
                    <select value={form.productType} onChange={e => setForm(f => ({ ...f, productType: e.target.value }))} className="input-admin mt-1">
                      <option value="panel_key">Panel Key</option>
                      <option value="subscription">Subscription</option>
                      <option value="service">Service</option>
                    </select>
                  </div>
                </div>

                {/* Product images: logo (card) + banner (detail sheet header) */}
                <ImagePicker label="🖼️ شعار المنتج" value={form.logo} onChange={(url) => setForm((current) => ({ ...current, logo: url }))} hint="يظهر داخل بطاقة المنتج في كل مكان بالمتجر." />
                <ImagePicker label="🌅 بانر المنتج (اختياري)" value={form.banner} onChange={(url) => setForm((current) => ({ ...current, banner: url }))} hint="صورة عريضة تظهر أعلى صفحة خيارات المنتج." aspect="wide" />

                {/* Description */}
                <div>
                  <label className="label-admin">الوصف</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-admin mt-1 resize-none" rows={2} />
                </div>

                {/* Features */}
                <div>
                  <label className="label-admin">المميزات</label>
                  <div className="flex gap-2 mt-1">
                    <input value={featureInput} onChange={e => setFeatureInput(e.target.value)} placeholder="أضف ميزة..." className="input-admin flex-1" onKeyDown={e => e.key === 'Enter' && addFeature()} />
                    <button onClick={addFeature} className="neon-btn px-3">+</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.features?.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-neon/5 border border-neon/20 text-neon px-2 py-1 rounded-lg">
                        {f.icon} {f.text}
                        <button onClick={() => setForm(x => ({ ...x, features: x.features.filter((_, j) => j !== i) }))} className="text-red ml-1">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Durations — add, inline-edit and remove */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label-admin">المدد والأسعار</label>
                    <button onClick={() => { setEditingDurationIndex(null); setNewDuration(emptyDuration); setShowDurationForm(!showDurationForm); }} className="text-xs text-neon border border-neon/20 px-2 py-1 rounded-lg">+ مدة</button>
                  </div>
                  {showDurationForm && (
                    <div className="grid gap-2 mt-2 bg-bg border border-border rounded-xl p-3">
                      <p className="text-[10px] text-muted font-bold">{editingDurationIndex !== null ? '✏️ تعديل مدة موجودة' : '➕ إضافة مدة جديدة'}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={newDuration.name} onChange={e => setNewDuration(d => ({ ...d, name: e.target.value }))} placeholder="1 Day" className="input-admin text-xs" />
                        <input value={newDuration.nameAr} onChange={e => setNewDuration(d => ({ ...d, nameAr: e.target.value }))} placeholder="يوم واحد" className="input-admin text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={newDuration.days} onChange={e => setNewDuration(d => ({ ...d, days: parseInt(e.target.value) }))} placeholder="عدد الأيام" className="input-admin text-xs" />
                        <input type="number" step="0.01" value={newDuration.price} onChange={e => setNewDuration(d => ({ ...d, price: e.target.value }))} placeholder="السعر $" className="input-admin text-xs" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addDuration} className="success-btn flex-1 py-2 rounded-xl text-sm font-bold">{editingDurationIndex !== null ? 'حفظ التعديل ✓' : 'إضافة المدة ✓'}</button>
                        {editingDurationIndex !== null && <button onClick={() => { setEditingDurationIndex(null); setNewDuration(emptyDuration); setShowDurationForm(false); }} className="px-3 border border-border rounded-xl text-muted text-xs">إلغاء</button>}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1 mt-2">
                    {form.durations?.map((d, i) => (
                      <div key={i} className="flex items-center justify-between bg-bg border border-border rounded-lg px-3 py-2 text-xs">
                        <span className="text-white">{d.nameAr || d.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-neon font-bold">${parseFloat(d.price).toFixed(2)}</span>
                          <button onClick={() => editDuration(i)} className="text-neon border border-neon/20 rounded-md px-1.5 py-0.5" title="تعديل">✏️</button>
                          <button onClick={() => setForm(f => ({ ...f, durations: f.durations.filter((_, j) => j !== i) }))} className="text-red" title="حذف">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-4">
                  {[['نشط', 'isActive'], ['مميز', 'isFeatured']].map(([l, k]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => setForm(f => ({ ...f, [k]: !f[k] }))}
                        className={`w-10 h-5 rounded-full transition-colors ${form[k] ? 'bg-neon' : 'bg-border'} relative`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form[k] ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                      <span className="text-sm text-muted">{l}</span>
                    </label>
                  ))}
                </div>

      </Sheet>

      {/* Bulk Image Assignment Sheet */}
      <Sheet
        open={showBulkSheet}
        onClose={() => setShowBulkSheet(false)}
        title={`🖼️ تعيين صور لـ ${selectedIds.size} منتج`}
        footer={<SheetActions saveLabel="✅ تطبيق على الكل" onSave={bulkApplyImage} saving={bulkProcessing} onCancel={() => setShowBulkSheet(false)} />}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-neon/20 bg-neon/5 p-3 text-[11px] text-white leading-6">
            <p className="font-bold text-neon">💡 كيف يعمل؟</p>
            <p>• اختر صورة الشعار (الصورة المصغّرة) أو البانر (الصورة العريضة) أو كلاهما.</p>
            <p>• سيتم تطبيق الصور المختارة على جميع المنتجات المحددة دفعة واحدة.</p>
            <p>• إذا أردت تغيير صورة واحدة فقط، اترك الحقل الآخر فارغاً.</p>
          </div>
          <ImagePicker label="🖼️ شعار جديد للمنتجات المحددة" value={bulkLogo} onChange={setBulkLogo} hint="سيتم تعيينه لجميع المنتجات المحددة" />
          <ImagePicker label="🌅 بانر جديد للمنتجات المحددة" value={bulkBanner} onChange={setBulkBanner} hint="صورة عريضة تظهر أعلى صفحة المنتج" aspect="wide" />
          <div className="text-xs text-muted">
            <p>📦 المنتجات المحددة: {selectedIds.size}</p>
            <p className="mt-1 text-[10px]">ملاحظة: الصور الفارغة لن يتم تغييرها — فقط الحقول المملوءة ستُطبّق.</p>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

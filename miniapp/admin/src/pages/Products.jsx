import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

const emptyProduct = { name: '', nameAr: '', game: '', category: '', description: '', features: [], durations: [], isActive: true, isFeatured: false, productType: 'panel_key' };
const emptyDuration = { name: '', nameAr: '', days: 1, price: '', isActive: true };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [filterGame, setFilterGame] = useState('');
  const [newDuration, setNewDuration] = useState(emptyDuration);
  const [showDurationForm, setShowDurationForm] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [uploading, setUploading] = useState(false);

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
    try {
      const data = { ...form, slug: form.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() };
      if (editing) {
        await api.put(`/admin/products/${editing}`, data);
        toast.success('✅ تم التحديث');
      } else {
        await api.post('/admin/products', data);
        toast.success('✅ تم الإنشاء');
      }
      setShowForm(false); setForm(emptyProduct); setEditing(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
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

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setForm(f => ({ ...f, features: [...(f.features || []), { text: featureInput.trim(), icon: '✅' }] }));
    setFeatureInput('');
  };

  const addDuration = () => {
    if (!newDuration.name || !newDuration.price) return toast.error('اسم وسعر مطلوبان للمدة');
    setForm(f => ({ ...f, durations: [...(f.durations || []), { ...newDuration, price: parseFloat(newDuration.price) }] }));
    setNewDuration(emptyDuration);
    setShowDurationForm(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('image', file);
    const r = await api.post('/upload/image', fd);
    setForm(f => ({ ...f, logo: r.data.url }));
    setUploading(false);
    toast.success('✅ تم رفع الصورة');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black text-white">🔑 المنتجات</h2>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setForm(emptyProduct); setEditing(null); setShowForm(true); }} className="neon-btn">
          + إنشاء منتج جديد
        </motion.button>
      </div>

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
            className="admin-card border border-border flex items-start gap-3">
            {p.logo ? <img src={p.logo} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" /> :
              <div className="w-12 h-12 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center text-xl flex-shrink-0">🔑</div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <p className="font-bold text-white text-sm">{p.nameAr || p.name}</p>
                {p.isFeatured && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">⭐ مميز</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.isActive ? 'bg-green/10 text-green border-green/20' : 'bg-red/10 text-red border-red/20'}`}>{p.isActive ? 'نشط' : 'معطّل'}</span>
              </div>
              <p className="text-xs text-muted">{p.game?.nameAr || p.game?.name || '—'} · {p.durations?.length} مدة</p>
              <p className="text-xs text-neon font-semibold">من ${Math.min(...(p.durations?.filter(d => d.isActive).map(d => d.price) || [0])).toFixed(2)}</p>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => handleEdit(p)} className="text-xs text-neon border border-neon/20 rounded-lg px-2 py-1">✏️</button>
              <button onClick={() => handleToggle(p)} className="text-xs border rounded-lg px-2 py-1 text-muted border-border">👁</button>
              <button onClick={() => handleDelete(p._id)} className="text-xs text-red border border-red/20 rounded-lg px-2 py-1">🗑</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-panel border-t border-border rounded-t-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
              <div className="p-4 space-y-4 pb-8">
                <h3 className="font-black text-white text-lg">{editing ? '✏️ تعديل المنتج' : '+ إنشاء منتج جديد'}</h3>

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

                {/* Logo Upload */}
                <div>
                  <label className="label-admin">صورة المنتج</label>
                  <div className="flex items-center gap-3 mt-1">
                    {form.logo && <img src={form.logo} alt="logo" className="w-12 h-12 rounded-xl object-cover" />}
                    <label className="neon-btn cursor-pointer text-sm">
                      {uploading ? '⏳ جاري الرفع...' : '📁 رفع صورة'}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

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

                {/* Durations */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label-admin">المدد والأسعار</label>
                    <button onClick={() => setShowDurationForm(!showDurationForm)} className="text-xs text-neon border border-neon/20 px-2 py-1 rounded-lg">+ مدة</button>
                  </div>
                  {showDurationForm && (
                    <div className="grid gap-2 mt-2 bg-bg border border-border rounded-xl p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={newDuration.name} onChange={e => setNewDuration(d => ({ ...d, name: e.target.value }))} placeholder="1 Day" className="input-admin text-xs" />
                        <input value={newDuration.nameAr} onChange={e => setNewDuration(d => ({ ...d, nameAr: e.target.value }))} placeholder="يوم واحد" className="input-admin text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={newDuration.days} onChange={e => setNewDuration(d => ({ ...d, days: parseInt(e.target.value) }))} placeholder="عدد الأيام" className="input-admin text-xs" />
                        <input type="number" step="0.01" value={newDuration.price} onChange={e => setNewDuration(d => ({ ...d, price: e.target.value }))} placeholder="السعر $" className="input-admin text-xs" />
                      </div>
                      <button onClick={addDuration} className="success-btn py-2 rounded-xl text-sm font-bold">إضافة المدة ✓</button>
                    </div>
                  )}
                  <div className="space-y-1 mt-2">
                    {form.durations?.map((d, i) => (
                      <div key={i} className="flex items-center justify-between bg-bg border border-border rounded-lg px-3 py-2 text-xs">
                        <span className="text-white">{d.nameAr || d.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-neon font-bold">${parseFloat(d.price).toFixed(2)}</span>
                          <button onClick={() => setForm(f => ({ ...f, durations: f.durations.filter((_, j) => j !== i) }))} className="text-red">×</button>
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

                <div className="flex gap-2 pt-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="flex-1 py-3 rounded-xl font-black text-black bg-neon text-sm">💾 حفظ ونشر</motion.button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-3 border border-border rounded-xl text-muted font-bold text-sm">إلغاء</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ImagePicker from '../components/ImagePicker';

const EMPTY_CAT = { name: '', nameAr: '', icon: '🎮', slug: '', image: null };
const EMPTY_GAME = { name: '', nameAr: '', icon: null, category: '' };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [catForm, setCatForm] = useState(EMPTY_CAT);
  const [gameForm, setGameForm] = useState(EMPTY_GAME);
  const [editingCat, setEditingCat] = useState(null);
  const [editingGame, setEditingGame] = useState(null);

  const load = async () => {
    const [cr, gr] = await Promise.all([api.get('/admin/categories'), api.get('/admin/games')]);
    setCategories(cr.data.data || []);
    setGames(gr.data.data || []);
  };

  useEffect(() => { load(); }, []);

  const filteredGames = selectedCat ? games.filter(g => (g.category?._id || g.category) === selectedCat._id) : games;

  const saveCat = async () => {
    if (!catForm.name) return toast.error('اسم القسم مطلوب');
    const slug = catForm.slug || catForm.name.toLowerCase().replace(/\s+/g, '-');
    try {
      if (editingCat) { await api.put(`/admin/categories/${editingCat}`, { ...catForm, slug }); toast.success('✅ تم التحديث'); }
      else { await api.post('/admin/categories', { ...catForm, slug }); toast.success('✅ تم إنشاء القسم'); }
      setShowCatForm(false); setCatForm(EMPTY_CAT); setEditingCat(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
  };

  const saveGame = async () => {
    if (!gameForm.name || !gameForm.category) return toast.error('اسم اللعبة والقسم مطلوبان');
    try {
      const slug = gameForm.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      if (editingGame) { await api.put(`/admin/games/${editingGame}`, gameForm); toast.success('✅ تم التحديث'); }
      else { await api.post('/admin/games', { ...gameForm, slug }); toast.success('✅ تم إنشاء اللعبة'); }
      setShowGameForm(false); setGameForm(EMPTY_GAME); setEditingGame(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'فشل'); }
  };

  const handleDeleteCat = async (id) => {
    if (!confirm('حذف هذا القسم؟')) return;
    await api.delete(`/admin/categories/${id}`);
    toast.success('🗑️ تم الحذف');
    if (selectedCat?._id === id) setSelectedCat(null);
    load();
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('حذف هذه اللعبة؟')) return;
    await api.delete(`/admin/games/${id}`);
    toast.success('🗑️ تم الحذف');
    load();
  };

  const handleToggleCat = async (cat) => {
    await api.put(`/admin/categories/${cat._id}`, { isActive: !cat.isActive });
    load();
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black text-white">📂 الأقسام والألعاب</h2>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setCatForm(EMPTY_CAT); setEditingCat(null); setShowCatForm(true); }} className="neon-btn">➕ قسم جديد</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setGameForm({ ...EMPTY_GAME, category: selectedCat?._id || '' }); setEditingGame(null); setShowGameForm(true); }} className="success-btn">➕ لعبة جديدة</motion.button>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="rounded-2xl border border-purple/20 bg-gradient-to-br from-purple/10 to-emerald-500/5 p-3 text-xs text-muted space-y-1">
        <p className="text-white font-bold text-sm mb-1">📋 ترتيب البيع: قسم ← لعبة ← منتج ← مفاتيح</p>
        <p>1️⃣ أنشئ <span className="text-white font-bold">قسماً</span> (مثال: أندرويد، iOS، كمبيوتر)</p>
        <p>2️⃣ داخل القسم، أنشئ <span className="text-white font-bold">لعبة</span> (مثال: ببجي، فري فاير)</p>
        <p>3️⃣ اذهب إلى <span className="text-purple-400 font-bold">المنتجات</span> لإنشاء منتجات داخل اللعبة (مثال: VIP شهر، VIP سنة)</p>
        <p>4️⃣ اذهب إلى <span className="text-purple-400 font-bold">المخزون</span> لإضافة المفاتيح الفعلية للمنتجات</p>
      </div>

      {/* Categories */}
      <div>
        <p className="text-xs text-muted font-semibold mb-2">الأقسام</p>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat, i) => (
            <motion.div key={cat._id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
              onClick={() => setSelectedCat(selectedCat?._id === cat._id ? null : cat)}
              className={`admin-card border cursor-pointer transition-all text-center relative
                ${selectedCat?._id === cat._id ? 'border-neon/40 bg-neon/5' : 'border-border hover:border-border/80'}`}>
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-xl object-cover mx-auto mb-1" />
              ) : (
                <div className="text-2xl mb-1">{cat.icon}</div>
              )}
              <p className="text-xs font-bold text-white truncate">{cat.nameAr || cat.name}</p>
              <p className="text-[10px] text-muted">{games.filter(g => (g.category?._id || g.category) === cat._id).length} لعبة</p>
              <div className="flex justify-center gap-1 mt-2">
                <button onClick={e => { e.stopPropagation(); setCatForm(cat); setEditingCat(cat._id); setShowCatForm(true); }} className="text-[10px] text-neon border border-neon/20 rounded px-1.5 py-0.5">✏️</button>
                <button onClick={e => { e.stopPropagation(); handleToggleCat(cat); }} className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5">👁</button>
                <button onClick={e => { e.stopPropagation(); handleDeleteCat(cat._id); }} className="text-[10px] text-red border border-red/20 rounded px-1.5 py-0.5">🗑</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Games */}
      <div>
        <p className="text-xs text-muted font-semibold mb-2">
          الألعاب {selectedCat ? `- ${selectedCat.nameAr || selectedCat.name}` : '(الكل)'}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredGames.map((game, i) => (
            <motion.div key={game._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="admin-card border border-border flex items-center gap-3">
              {game.icon ? <img src={game.icon} alt={game.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" /> :
                <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center text-xl flex-shrink-0">🎮</div>}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{game.nameAr || game.name}</p>
                <p className="text-[10px] text-muted">{game.category?.nameAr || game.category?.name || '—'}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setGameForm({ ...game, category: game.category?._id || game.category }); setEditingGame(game._id); setShowGameForm(true); }} className="text-xs text-neon border border-neon/20 rounded-lg px-2 py-1">✏️</button>
                <button onClick={() => handleDeleteGame(game._id)} className="text-xs text-red border border-red/20 rounded-lg px-2 py-1">🗑</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Category Form Modal */}
      <AnimatePresence>
        {showCatForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCatForm(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-panel border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-3 max-h-[90dvh] overflow-y-auto">
              <h3 className="font-black text-white">{editingCat ? '✏️ تعديل قسم' : '+ قسم جديد'}</h3>
              <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Category Name (EN)" className="input-admin" />
              <input value={catForm.nameAr} onChange={e => setCatForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="اسم القسم (AR)" className="input-admin" />
              <input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="الأيقونة (emoji عند عدم وجود صورة)" className="input-admin" />
              <ImagePicker label="🖼️ صورة القسم" value={catForm.image} onChange={(url) => setCatForm(f => ({ ...f, image: url }))} hint="تظهر بدلاً من الإيموجي في متجر العميل." />
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={saveCat} className="flex-1 neon-btn py-3 rounded-xl font-bold">حفظ</motion.button>
                <button onClick={() => setShowCatForm(false)} className="px-4 py-3 border border-border rounded-xl text-muted text-sm">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Game Form Modal */}
      <AnimatePresence>
        {showGameForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGameForm(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-panel border border-border rounded-2xl p-5 max-w-sm mx-auto space-y-3 max-h-[90dvh] overflow-y-auto">
              <h3 className="font-black text-white">{editingGame ? '✏️ تعديل لعبة' : '+ لعبة جديدة'}</h3>
              <input value={gameForm.name} onChange={e => setGameForm(f => ({ ...f, name: e.target.value }))} placeholder="Game Name (EN)" className="input-admin" />
              <input value={gameForm.nameAr} onChange={e => setGameForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="اسم اللعبة (AR)" className="input-admin" />
              <select value={gameForm.category} onChange={e => setGameForm(f => ({ ...f, category: e.target.value }))} className="input-admin">
                <option value="">اختر القسم</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.nameAr || c.name}</option>)}
              </select>
              <ImagePicker label="🖼️ أيقونة اللعبة" value={gameForm.icon} onChange={(url) => setGameForm(f => ({ ...f, icon: url }))} hint="تظهر داخل بطاقة اللعبة في المتجر." />
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={saveGame} className="flex-1 neon-btn py-3 rounded-xl font-bold">حفظ</motion.button>
                <button onClick={() => setShowGameForm(false)} className="px-4 py-3 border border-border rounded-xl text-muted text-sm">إلغاء</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

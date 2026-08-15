import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ImagePicker from '../components/ImagePicker';
import Sheet, { SheetActions } from '../components/Sheet';
import AdminIcon from '../components/AdminIcon';
import { haptic } from '../utils/haptic';
import { hasPermission } from '../utils/permissions';

const emptyProduct = {
  name: '', nameAr: '', game: '', category: '', description: '', features: [], durations: [],
  isActive: true, isFeatured: false, productType: 'panel_key', logo: null, banner: null
};
const emptyDuration = { name: '', nameAr: '', days: 1, price: '', isActive: true, pendingKeys: '' };

const makeSlug = (name) => String(name || '')
  .trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-').replace(/^-+|-+$/g, '') || `product-${Date.now()}`;

const normalizeDuration = (duration) => ({
  ...(duration._id ? { _id: duration._id } : {}),
  name: String(duration.name || duration.nameAr || '').trim(),
  nameAr: String(duration.nameAr || '').trim(),
  days: Math.max(1, parseInt(duration.days, 10) || 1),
  price: Math.max(0, Number.parseFloat(duration.price) || 0),
  originalPrice: duration.originalPrice === '' || duration.originalPrice == null ? null : Math.max(0, Number.parseFloat(duration.originalPrice) || 0),
  isActive: duration.isActive !== false,
  stockCount: Math.max(0, parseInt(duration.stockCount, 10) || 0),
  soldCount: Math.max(0, parseInt(duration.soldCount, 10) || 0),
  order: parseInt(duration.order, 10) || 0
});

const buildProductPayload = (form, games, editing) => {
  const selectedGame = games.find((game) => game._id === form.game);
  const visibleName = String(form.name || form.nameAr || '').trim();
  return {
    name: visibleName,
    nameAr: String(form.nameAr || '').trim(),
    slug: editing ? (form.slug || makeSlug(visibleName)) : `${makeSlug(visibleName)}-${Date.now()}`,
    game: form.game,
    category: form.category || selectedGame?.category?._id || selectedGame?.category || '',
    description: String(form.description || '').trim(),
    features: (form.features || []).map((feature) => ({
      text: String(feature.text || '').trim(), icon: feature.icon || '✓', isHighlighted: Boolean(feature.isHighlighted)
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

const parseKeys = (value = '') => {
  const seen = new Set();
  return String(value).split(/\r?\n/).map((key) => key.trim()).filter((key) => {
    if (!key) return false;
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const cleanDurationDraft = (duration) => ({
  ...duration,
  name: String(duration.name || duration.nameAr || '').trim(),
  nameAr: String(duration.nameAr || '').trim(),
  days: Math.max(1, parseInt(duration.days, 10) || 1),
  price: Math.max(0, parseFloat(duration.price) || 0)
});

const getMinPrice = (durations = []) => {
  const prices = durations.filter((duration) => duration.isActive !== false).map((duration) => Number(duration.price)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : 0;
};

export default function Products({ currentUser }) {
  const [products, setProducts] = useState([]);
  const [games, setGames] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [filterGame, setFilterGame] = useState('');
  const [search, setSearch] = useState('');
  const [newDuration, setNewDuration] = useState(emptyDuration);
  const [editingDurationIndex, setEditingDurationIndex] = useState(null);
  const [showDurationForm, setShowDurationForm] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const canManageKeys = hasPermission(currentUser, 'inventory');

  const load = async () => {
    try {
      const [productsResponse, gamesResponse] = await Promise.all([
        api.get(`/admin/products${filterGame ? `?gameId=${filterGame}` : ''}`),
        api.get('/admin/games')
      ]);
      setProducts(productsResponse.data.data || []);
      setGames(gamesResponse.data.data || []);
    } catch (_) {
      toast.error('تعذر تحميل المنتجات');
    }
  };

  useEffect(() => { load(); }, [filterGame]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.nameAr, product.game?.name, product.game?.nameAr]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [products, search]);

  const totals = useMemo(() => ({
    active: products.filter((product) => product.isActive).length,
    durations: products.reduce((sum, product) => sum + (product.durations?.length || 0), 0),
    stock: products.reduce((sum, product) => sum + (product.durations || []).reduce((durationSum, duration) => durationSum + Number(duration.stockCount || 0), 0), 0)
  }), [products]);

  const resetDurationEditor = (open = false) => {
    setNewDuration(emptyDuration);
    setEditingDurationIndex(null);
    setShowDurationForm(open);
  };

  const openNew = () => {
    setForm(emptyProduct);
    setEditing(null);
    setFeatureInput('');
    resetDurationEditor(true);
    setShowForm(true);
  };

  const openEdit = (product, openCodes = false) => {
    const durations = (product.durations || []).map((duration) => ({ ...duration, pendingKeys: '' }));
    setForm({
      ...product,
      game: product.game?._id || product.game,
      category: product.category?._id || product.category,
      durations
    });
    setEditing(product._id);
    setFeatureInput('');
    if (openCodes && durations.length === 1) {
      setNewDuration(durations[0]);
      setEditingDurationIndex(0);
      setShowDurationForm(true);
    } else {
      resetDurationEditor(openCodes && !durations.length);
    }
    setShowForm(true);
  };

  const uploadPendingKeys = async (savedProduct, drafts) => {
    const failures = [];
    let added = 0;
    for (let index = 0; index < drafts.length; index += 1) {
      const keys = parseKeys(drafts[index].pendingKeys);
      if (!keys.length) continue;
      const savedDuration = drafts[index]._id
        ? savedProduct.durations?.find((duration) => String(duration._id) === String(drafts[index]._id))
        : savedProduct.durations?.[index];
      if (!savedDuration?._id) {
        failures.push(index);
        continue;
      }
      try {
        const response = await api.post('/admin/keys/bulk', {
          productId: savedProduct._id,
          durationId: savedDuration._id,
          durationName: savedDuration.nameAr || savedDuration.name,
          keys
        });
        added += Number(response.data.added || keys.length);
      } catch (_) {
        failures.push(index);
      }
    }
    return { added, failures };
  };

  const handleSave = async () => {
    if (!(form.name || form.nameAr) || !form.game) return toast.error('اسم المنتج واللعبة مطلوبان');

    // If the duration editor is still open, the main Save button includes it
    // automatically. The admin never has to wonder which of two save buttons
    // should be pressed first.
    const durationDrafts = [...(form.durations || [])].map((duration) => ({ ...duration }));
    const editorHasContent = showDurationForm && Boolean(newDuration.name || newDuration.nameAr || newDuration.price !== '' || parseKeys(newDuration.pendingKeys).length);
    if (editorHasContent) {
      if (!(newDuration.name || newDuration.nameAr) || newDuration.price === '' || newDuration.price == null) return toast.error('أكمل اسم المدة وسعرها');
      const clean = cleanDurationDraft(newDuration);
      if (editingDurationIndex !== null && durationDrafts[editingDurationIndex]) durationDrafts[editingDurationIndex] = { ...durationDrafts[editingDurationIndex], ...clean };
      else durationDrafts.push(clean);
    }
    if (!durationDrafts.length) return toast.error('أضف مدة واحدة على الأقل');

    const workingForm = { ...form, durations: durationDrafts };
    const data = buildProductPayload(workingForm, games, editing);
    if (!data.category) return toast.error('اختر لعبة مرتبطة بقسم صالح');
    const pendingCount = durationDrafts.reduce((sum, duration) => sum + parseKeys(duration.pendingKeys).length, 0);
    if (pendingCount && !canManageKeys) return toast.error('حسابك لا يملك صلاحية إضافة الأكواد');

    setSaving(true);
    try {
      const response = editing
        ? await api.put(`/admin/products/${editing}`, data)
        : await api.post('/admin/products', data);
      const savedProduct = response.data.data;
      const result = await uploadPendingKeys(savedProduct, durationDrafts);

      if (result.failures.length) {
        const failedSet = new Set(result.failures);
        setEditing(savedProduct._id);
        setForm({
          ...savedProduct,
          game: savedProduct.game?._id || savedProduct.game,
          category: savedProduct.category?._id || savedProduct.category,
          durations: (savedProduct.durations || []).map((duration, index) => ({
            ...duration,
            pendingKeys: failedSet.has(index) ? durationDrafts[index]?.pendingKeys || '' : ''
          }))
        });
        toast.error(`تم حفظ المنتج، لكن تعذر رفع أكواد ${result.failures.length} مدة. حاول الحفظ مرة أخرى.`);
        await load();
        return;
      }

      haptic.success();
      toast.success(result.added ? `تم حفظ المنتج وإضافة ${result.added} كود` : 'تم حفظ المنتج');
      setShowForm(false);
      setForm(emptyProduct);
      setEditing(null);
      resetDurationEditor(false);
      await load();
    } catch (error) {
      haptic.error();
      toast.error(error.response?.data?.error || 'فشل حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const addDuration = () => {
    if (!(newDuration.name || newDuration.nameAr) || newDuration.price === '' || newDuration.price == null) {
      return toast.error('اسم المدة والسعر مطلوبان');
    }
    const clean = cleanDurationDraft(newDuration);
    setForm((current) => {
      const durations = [...(current.durations || [])];
      if (editingDurationIndex !== null && durations[editingDurationIndex]) durations[editingDurationIndex] = { ...durations[editingDurationIndex], ...clean };
      else durations.push(clean);
      return { ...current, durations };
    });
    toast.success(editingDurationIndex !== null ? 'تم تحديث المدة والأكواد' : 'تمت إضافة المدة');
    resetDurationEditor(false);
  };

  const editDuration = (index) => {
    const duration = form.durations?.[index];
    if (!duration) return;
    setNewDuration({
      ...duration,
      name: duration.name || '', nameAr: duration.nameAr || '', days: duration.days || 1,
      price: duration.price ?? '', isActive: duration.isActive !== false, pendingKeys: duration.pendingKeys || ''
    });
    setEditingDurationIndex(index);
    setShowDurationForm(true);
  };

  const readKeysFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setNewDuration((duration) => ({ ...duration, pendingKeys: [duration.pendingKeys, text].filter(Boolean).join('\n') }));
      toast.success(`تمت قراءة ${parseKeys(text).length} كود من الملف`);
    } catch (_) {
      toast.error('تعذر قراءة الملف');
    }
    event.target.value = '';
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setForm((current) => ({ ...current, features: [...(current.features || []), { text: featureInput.trim(), icon: '✓' }] }));
    setFeatureInput('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا المنتج نهائيًا؟')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('تم حذف المنتج');
      await load();
    } catch (_) { toast.error('تعذر حذف المنتج'); }
  };

  const handleToggle = async (product) => {
    try {
      await api.put(`/admin/products/${product._id}`, { isActive: !product.isActive });
      toast.success(product.isActive ? 'تم إيقاف المنتج' : 'تم تفعيل المنتج');
      await load();
    } catch (_) { toast.error('تعذر تغيير حالة المنتج'); }
  };

  const duplicateProduct = async (product) => {
    try {
      const data = buildProductPayload({
        ...product,
        name: `${product.name} copy`,
        nameAr: `${product.nameAr || product.name} - نسخة`,
        slug: '',
        game: product.game?._id || product.game,
        category: product.category?._id || product.category,
        durations: (product.durations || []).map(({ _id, ...duration }) => duration)
      }, games, false);
      await api.post('/admin/products', data);
      toast.success('تم إنشاء نسخة من المنتج');
      await load();
    } catch (_) { toast.error('تعذر نسخ المنتج'); }
  };

  const toggleSelect = (id) => setSelectedIds((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const runBulk = async (action) => {
    if (!selectedIds.size) return;
    if (action === 'delete' && !window.confirm(`حذف ${selectedIds.size} منتج نهائيًا؟`)) return;
    setBulkProcessing(true);
    let success = 0;
    for (const id of selectedIds) {
      try {
        if (action === 'delete') await api.delete(`/admin/products/${id}`);
        else await api.put(`/admin/products/${id}`, { isActive: action === 'activate' });
        success += 1;
      } catch (_) {}
    }
    toast.success(`تم تحديث ${success} منتج`);
    setSelectedIds(new Set());
    setBulkMode(false);
    await load();
    setBulkProcessing(false);
  };

  return (
    <div className="admin-products-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-page-heading__icon"><AdminIcon name="product" /></span>
          <div><h2>المنتجات</h2><p>أنشئ المنتج، المدة والأكواد في صفحة واحدة.</p></div>
        </div>
        <div className="admin-page-heading__actions">
          <button type="button" onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }} className={`admin-secondary-button ${bulkMode ? 'is-active' : ''}`}><AdminIcon name="check" />{bulkMode ? 'إنهاء التحديد' : 'تحديد'}</button>
          <button type="button" onClick={openNew} className="admin-primary-button"><AdminIcon name="plus" />منتج جديد</button>
        </div>
      </header>

      <section className="admin-product-summary" aria-label="ملخص المنتجات">
        <div><span className="tone-violet"><AdminIcon name="product" /></span><b>{products.length}</b><small>كل المنتجات</small></div>
        <div><span className="tone-green"><AdminIcon name="check" /></span><b>{totals.active}</b><small>منتج نشط</small></div>
        <div><span className="tone-amber"><AdminIcon name="clock" /></span><b>{totals.durations}</b><small>مدة بيع</small></div>
        <div><span className="tone-cyan"><AdminIcon name="key" /></span><b>{totals.stock}</b><small>كود متاح</small></div>
      </section>

      <section className="admin-product-filters">
        <label className="admin-search-field"><AdminIcon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن منتج أو لعبة…" /></label>
        <select value={filterGame} onChange={(event) => setFilterGame(event.target.value)} className="input-admin">
          <option value="">كل الألعاب</option>
          {games.map((game) => <option key={game._id} value={game._id}>{game.nameAr || game.name}</option>)}
        </select>
      </section>

      <AnimatePresence>
        {bulkMode && selectedIds.size > 0 && (
          <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="admin-bulk-bar">
            <b>تم تحديد {selectedIds.size}</b>
            <div>
              <button disabled={bulkProcessing} onClick={() => runBulk('activate')} className="tone-green"><AdminIcon name="check" /> تفعيل</button>
              <button disabled={bulkProcessing} onClick={() => runBulk('deactivate')} className="tone-amber"><AdminIcon name="power" /> إيقاف</button>
              <button disabled={bulkProcessing} onClick={() => runBulk('delete')} className="tone-red"><AdminIcon name="trash" /> حذف</button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="admin-product-grid">
        {visibleProducts.map((product, index) => (
          <motion.article key={product._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .035, .24) }} className={`admin-product-card ${bulkMode && selectedIds.has(product._id) ? 'is-selected' : ''}`}>
            <button type="button" className="admin-product-card__cover" onClick={() => bulkMode ? toggleSelect(product._id) : openEdit(product)} aria-label={`فتح ${product.nameAr || product.name}`}>
              {product.banner || product.logo ? <img src={product.banner || product.logo} alt="" /> : <span className="admin-product-card__placeholder"><AdminIcon name="key" /></span>}
              <i className={product.isActive ? 'is-active' : ''}>{product.isActive ? 'نشط' : 'متوقف'}</i>
              {bulkMode && <b className="admin-product-card__select"><AdminIcon name={selectedIds.has(product._id) ? 'check' : 'plus'} /></b>}
            </button>
            <div className="admin-product-card__body">
              <div className="admin-product-card__title">
                {product.logo && <img src={product.logo} alt="" />}
                <div><h3>{product.nameAr || product.name}</h3><p>{product.game?.nameAr || product.game?.name || 'بدون لعبة'}</p></div>
              </div>
              <div className="admin-product-card__meta">
                <span><b>{product.durations?.length || 0}</b> مدد</span>
                <span><b>{(product.durations || []).reduce((sum, duration) => sum + Number(duration.stockCount || 0), 0)}</b> كود</span>
                <span>من <b>${getMinPrice(product.durations).toFixed(2)}</b></span>
              </div>
              <div className="admin-product-card__actions" aria-label="إجراءات المنتج">
                <button type="button" className="action-green" onClick={() => openEdit(product)} title="تعديل المنتج" aria-label="تعديل المنتج"><AdminIcon name="edit" /></button>
                <button type="button" className="action-orange" onClick={() => openEdit(product, true)} title="المدد والأكواد" aria-label="المدد والأكواد"><AdminIcon name="key" /></button>
                <button type="button" className="action-slate" onClick={() => duplicateProduct(product)} title="نسخ المنتج" aria-label="نسخ المنتج"><AdminIcon name="copy" /></button>
                <button type="button" className="action-amber" onClick={() => handleToggle(product)} title={product.isActive ? 'إيقاف المنتج' : 'تفعيل المنتج'} aria-label={product.isActive ? 'إيقاف المنتج' : 'تفعيل المنتج'}><AdminIcon name="power" /></button>
                <button type="button" className="action-red" onClick={() => handleDelete(product._id)} title="حذف المنتج" aria-label="حذف المنتج"><AdminIcon name="trash" /></button>
              </div>
            </div>
          </motion.article>
        ))}
      </section>

      {!visibleProducts.length && <div className="admin-products-empty"><span><AdminIcon name="product" /></span><h3>لا توجد منتجات</h3><p>أنشئ أول منتج وأضف مدته وأكواده مباشرة.</p><button type="button" onClick={openNew} className="admin-primary-button"><AdminIcon name="plus" />منتج جديد</button></div>}

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'تعديل المنتج' : 'منتج جديد'}
        icon={<AdminIcon name="product" />}
        wide
        footer={<SheetActions saveLabel={<><AdminIcon name="check" /> حفظ المنتج</>} onSave={handleSave} saving={saving} onCancel={() => setShowForm(false)} />}
      >
        <section className="product-form-section">
          <div className="product-form-section__heading"><span>1</span><div><h4>معلومات المنتج</h4><p>الاسم واللعبة فقط هما المطلوبان.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label-admin">اسم المنتج</label><input value={form.nameAr} onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))} className="input-admin" placeholder="مثال: اشتراك بريميوم" /></div>
            <div><label className="label-admin">الاسم الإنجليزي (اختياري)</label><input dir="ltr" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="input-admin" placeholder="Premium subscription" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label-admin">اللعبة</label><select value={form.game} onChange={(event) => { const game = games.find((item) => item._id === event.target.value); setForm((current) => ({ ...current, game: event.target.value, category: game?.category?._id || game?.category || '' })); }} className="input-admin"><option value="">اختر اللعبة</option>{games.map((game) => <option key={game._id} value={game._id}>{game.nameAr || game.name}</option>)}</select></div>
            <div><label className="label-admin">نوع المنتج</label><select value={form.productType} onChange={(event) => setForm((current) => ({ ...current, productType: event.target.value }))} className="input-admin"><option value="panel_key">كود رقمي</option><option value="subscription">اشتراك</option><option value="service">خدمة</option><option value="other">أخرى</option></select></div>
          </div>
        </section>

        <section className="product-form-section product-form-section--accent">
          <div className="product-form-section__heading">
            <span>2</span><div><h4>المدد والأكواد</h4><p>أضف كل مدة وسعرها وأكوادها في نفس المكان.</p></div>
            <button type="button" onClick={() => resetDurationEditor(!showDurationForm)}><AdminIcon name="plus" /> مدة جديدة</button>
          </div>

          {showDurationForm && (
            <div className="duration-editor">
              <div className="duration-editor__title"><span><AdminIcon name="clock" /></span><div><b>{editingDurationIndex !== null ? 'تعديل المدة' : 'إضافة مدة'}</b><small>الأكواد اختيارية، وزر حفظ المنتج يحفظ هذه المدة تلقائيًا.</small></div></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={newDuration.nameAr} onChange={(event) => setNewDuration((duration) => ({ ...duration, nameAr: event.target.value }))} placeholder="اسم المدة: شهر واحد" className="input-admin" />
                <input dir="ltr" value={newDuration.name} onChange={(event) => setNewDuration((duration) => ({ ...duration, name: event.target.value }))} placeholder="English name (optional)" className="input-admin" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label><span>عدد الأيام</span><input type="number" min="1" value={newDuration.days} onChange={(event) => setNewDuration((duration) => ({ ...duration, days: event.target.value }))} className="input-admin" /></label>
                <label><span>السعر بالدولار</span><input type="number" min="0" step="0.01" value={newDuration.price} onChange={(event) => setNewDuration((duration) => ({ ...duration, price: event.target.value }))} className="input-admin" placeholder="0.00" /></label>
              </div>
              {canManageKeys && (
                <div className="duration-editor__keys">
                  <div><label>أكواد هذه المدة</label><span>{parseKeys(newDuration.pendingKeys).length} كود</span></div>
                  <textarea dir="ltr" value={newDuration.pendingKeys} onChange={(event) => setNewDuration((duration) => ({ ...duration, pendingKeys: event.target.value }))} rows="6" className="input-admin" placeholder={'ضع كل كود في سطر مستقل\nABCD-1234-EFGH\nWXYZ-5678-IJKL'} />
                  <label className="duration-editor__upload"><AdminIcon name="upload" /><span>رفع ملف TXT</span><input type="file" accept=".txt,text/plain" onChange={readKeysFile} /></label>
                </div>
              )}
              <div className="duration-editor__actions">
                <button type="button" onClick={addDuration} className="admin-primary-button"><AdminIcon name="check" />{editingDurationIndex !== null ? 'حفظ التعديل' : 'إضافة المدة'}</button>
                <button type="button" onClick={() => resetDurationEditor(false)} className="admin-secondary-button">إلغاء</button>
              </div>
            </div>
          )}

          <div className="duration-list">
            {form.durations?.map((duration, index) => {
              const pending = parseKeys(duration.pendingKeys).length;
              return (
                <div key={duration._id || `${duration.name}-${index}`} className="duration-list__item">
                  <span className="duration-list__icon"><AdminIcon name="clock" /></span>
                  <div className="duration-list__copy"><b>{duration.nameAr || duration.name}</b><small>{duration.days || 1} يوم · المخزون {duration.stockCount || 0}{pending ? ` · ${pending} كود جديد` : ''}</small></div>
                  <strong>${Number(duration.price || 0).toFixed(2)}</strong>
                  <button type="button" onClick={() => editDuration(index)} title="تعديل وإضافة أكواد"><AdminIcon name="edit" /></button>
                  <button type="button" onClick={() => setForm((current) => ({ ...current, durations: current.durations.filter((_, itemIndex) => itemIndex !== index) }))} title="حذف المدة"><AdminIcon name="trash" /></button>
                </div>
              );
            })}
            {!form.durations?.length && !showDurationForm && <button type="button" className="duration-list__empty" onClick={() => resetDurationEditor(true)}><AdminIcon name="plus" /><span><b>أضف أول مدة</b><small>السعر والأكواد في خطوة واحدة</small></span></button>}
          </div>
        </section>

        <section className="product-form-section">
          <div className="product-form-section__heading"><span>3</span><div><h4>الصور والتفاصيل</h4><p>اختيارية، لكنها تجعل المنتج أوضح للعميل.</p></div></div>
          <div className="product-image-grid">
            <ImagePicker label="صورة المنتج" value={form.logo} onChange={(url) => setForm((current) => ({ ...current, logo: url }))} hint="تظهر في بطاقة المنتج." />
            <ImagePicker label="بانر المنتج" value={form.banner} onChange={(url) => setForm((current) => ({ ...current, banner: url }))} hint="صورة عريضة أعلى صفحة المنتج." aspect="wide" />
          </div>
          <div><label className="label-admin">وصف قصير (اختياري)</label><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="input-admin resize-none" rows="2" placeholder="ما الذي يحصل عليه العميل؟" /></div>
          <div>
            <label className="label-admin">المميزات (اختياري)</label>
            <div className="flex gap-2"><input value={featureInput} onChange={(event) => setFeatureInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addFeature(); } }} className="input-admin" placeholder="مثال: تسليم فوري" /><button type="button" onClick={addFeature} className="admin-icon-add" aria-label="إضافة ميزة"><AdminIcon name="plus" /></button></div>
            <div className="product-feature-list">{form.features?.map((feature, index) => <span key={`${feature.text}-${index}`}><AdminIcon name="check" />{feature.text}<button type="button" onClick={() => setForm((current) => ({ ...current, features: current.features.filter((_, itemIndex) => itemIndex !== index) }))}><AdminIcon name="close" /></button></span>)}</div>
          </div>
          <div className="product-form-toggles">
            <label><input type="checkbox" checked={form.isActive !== false} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /><span><b>المنتج نشط</b><small>يظهر ويمكن شراؤه</small></span></label>
            <label><input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))} /><span><b>منتج مميز</b><small>يظهر في الواجهة</small></span></label>
          </div>
        </section>
      </Sheet>
    </div>
  );
}

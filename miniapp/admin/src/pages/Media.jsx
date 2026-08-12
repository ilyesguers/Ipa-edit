import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

/**
 * 🖼️ Media Manager — full control over every uploaded image.
 * Upload, browse, copy URLs, delete, and set the store/bot banner.
 */
export default function Media() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const [savingBanner, setSavingBanner] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, settingsRes] = await Promise.all([
        api.get('/upload/list'),
        api.get('/settings')
      ]);
      setImages(listRes.data.data || []);
      setBannerUrl(settingsRes.data.data?.banner_image_url || '');
    } catch (_) {
      toast.error('تعذر تحميل الوسائط');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api.post('/upload/image', fd);
      setImages((prev) => [{ filename: (r.data.url.split('/').pop()), url: r.data.url, size: file.size, modified: new Date() }, ...prev]);
      toast.success('✅ تم رفع الصورة');
      e.target.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الرفع');
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('📋 تم نسخ الرابط');
    } catch (_) {
      toast.success(`📋 ${url}`);
    }
  };

  const remove = async (filename) => {
    if (!window.confirm('حذف هذه الصورة نهائياً؟')) return;
    try {
      await api.delete(`/upload/${encodeURIComponent(filename)}`);
      setImages((prev) => prev.filter((img) => img.filename !== filename));
      if (bannerUrl && bannerUrl.includes(filename)) setBannerUrl('');
      toast.success('🗑️ تم الحذف');
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحذف');
    }
  };

  const saveBanner = async (url) => {
    setSavingBanner(true);
    try {
      await api.put('/settings/banner_image_url', { value: url || '' });
      setBannerUrl(url || '');
      toast.success('🖼️ تم حفظ البانر');
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحفظ');
    } finally {
      setSavingBanner(false);
    }
  };

  const setAsBanner = (url) => saveBanner(url);

  return (
    <div className="space-y-5">
      <div className="admin-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-white">🖼️ مدير الصور والوسائط</h2>
            <p className="text-muted text-xs mt-1">تحكم كامل بكل صور الموقع: ارفع، انسخ، احذف، واختر صورة البانر.</p>
          </div>
          <button onClick={() => fileRef.current?.click()} className="neon-btn text-sm px-5 py-2.5">
            {uploading ? '⏳ جاري الرفع...' : '📤 رفع صورة'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>

        <div className="rounded-2xl border border-border bg-bg p-4">
          <p className="text-xs text-muted font-semibold mb-2">صورة البانر الحالية (تظهر في رسالة الترحيب للبوت)</p>
          <div className="flex flex-wrap items-center gap-3">
            {bannerUrl ? (
              <img src={bannerUrl} alt="banner" className="w-28 h-16 object-cover rounded-xl ring-2 ring-neon/40" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
            ) : (
              <div className="w-28 h-16 rounded-xl border border-border bg-card flex items-center justify-center text-2xl">🎮</div>
            )}
            <div className="flex-1 min-w-[200px]">
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://... أو اختر من الصور بالأسفل"
                className="input-admin text-xs"
              />
            </div>
            <button type="button" onClick={() => saveBanner(bannerUrl)} disabled={savingBanner} className="success-btn text-xs px-4 py-2">
              {savingBanner ? '⏳...' : '💾 حفظ البانر'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <div key={i} className="aspect-square rounded-2xl skeleton" />)}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 admin-card">
          <div className="text-5xl mb-3">🗂️</div>
          <p className="text-white font-black text-sm">لا توجد صور مرفوعة بعد</p>
          <p className="text-muted text-xs mt-1">ارفع أول صورة من زر "📤 رفع صورة"</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => {
            const isBanner = bannerUrl && bannerUrl.includes(img.filename);
            return (
              <motion.div
                key={img.filename}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className={`admin-card p-2.5 relative overflow-hidden ${isBanner ? 'ring-2 ring-neon' : ''}`}
              >
                {isBanner && (
                  <span className="absolute top-2 right-2 z-10 text-[9px] font-black bg-neon text-black px-2 py-0.5 rounded-full">الرئيسية</span>
                )}
                <div className="aspect-square rounded-xl overflow-hidden bg-bg mb-2">
                  <img src={img.url} alt={img.filename} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <p className="text-[10px] text-muted truncate mb-2" title={img.url}>{img.filename}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => setAsBanner(img.url)} className="success-btn text-[10px] px-2 py-1.5">⭐ بانر</button>
                  <button onClick={() => copyUrl(img.url)} className="neon-btn text-[10px] px-2 py-1.5">📋 نسخ</button>
                </div>
                <button onClick={() => remove(img.filename)} className="w-full mt-1.5 danger-btn text-[10px] px-2 py-1.5">🗑️ حذف</button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

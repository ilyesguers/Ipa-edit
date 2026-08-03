import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

/**
 * 🖼️ ImagePicker — one control to give ANY entity an image:
 * upload a new file (button or drag & drop), reuse an earlier upload from the
 * media library, or clear the current image. Used by products, categories,
 * games and the banner settings — "صورة في كل شيء".
 */
export default function ImagePicker({ label = 'الصورة', value, onChange, hint, aspect = 'square' }) {
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!showLibrary) return;
    api.get('/upload/list').then((r) => setLibrary(r.data.data || [])).catch(() => setLibrary([]));
  }, [showLibrary]);

  const upload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('اختر ملف صورة فقط');
    if (file.size > 5 * 1024 * 1024) return toast.error('الحد الأقصى للصورة 5MB');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api.post('/upload/image', fd);
      onChange(r.data.url);
      toast.success('✅ تم رفع الصورة واختيارها');
    } catch (err) {
      toast.error(err.response?.data?.error || 'تعذر رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-3 transition-colors ${dragOver ? 'border-neon/60 bg-neon/5' : 'border-border bg-bg/60'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]); }}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-white">{label}</label>
        {value && <button type="button" onClick={() => onChange(null)} className="text-[10px] text-red border border-red/25 rounded-lg px-2 py-0.5">إزالة</button>}
      </div>
      {hint && <p className="text-[10px] text-muted mt-0.5 leading-4">{hint}</p>}

      <div className="mt-2 flex items-center gap-3">
        {value ? (
          <img src={value} alt="معاينة" className={`rounded-xl object-cover ring-2 ring-neon/30 ${aspect === 'wide' ? 'w-24 h-14' : 'w-14 h-14'}`} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
        ) : (
          <div className={`rounded-xl bg-panel border border-dashed border-border flex items-center justify-center text-xl ${aspect === 'wide' ? 'w-24 h-14' : 'w-14 h-14'}`}>🖼️</div>
        )}
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex gap-1.5 flex-wrap">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="neon-btn text-[11px] px-3 py-1.5 disabled:opacity-60">
              {uploading ? '⏳ جاري الرفع…' : '📤 رفع صورة'}
            </button>
            <button type="button" onClick={() => setShowLibrary((v) => !v)} className="text-[11px] px-3 py-1.5 rounded-xl border border-border text-muted hover:text-white">
              {showLibrary ? 'إخفاء المكتبة' : '🗂️ من المكتبة'}
            </button>
          </div>
          <p className="text-[9px] text-muted">اسحب الصورة وأفلتها هنا أيضاً · PNG / JPG / WEBP حتى 5MB</p>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {showLibrary && (
        <div className="mt-3">
          {library.length === 0 ? (
            <p className="text-[10px] text-muted">لا توجد صور مرفوعة بعد — ارفع أول صورة.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {library.slice(0, 20).map((image) => (
                <button type="button" key={image.filename} onClick={() => { onChange(image.url); setShowLibrary(false); }}
                  className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 ${value === image.url ? 'border-neon' : 'border-transparent'}`}>
                  <img src={image.url} alt={image.filename} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

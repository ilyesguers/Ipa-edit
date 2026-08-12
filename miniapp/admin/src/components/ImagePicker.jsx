import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

/**
 * ImagePicker — iPhone/iOS compatible image upload with:
 * - Camera capture via capture="environment" (opens camera directly on iOS)
 * - Photo library access (standard file picker)
 * - HEIC/HEIF auto-detection (server converts to JPEG)
 * - Paste from clipboard (Ctrl+V / Cmd+V)
 * - Drag & drop
 * - Media library (previously uploaded images)
 */
export default function ImagePicker({ label = 'الصورة', value, onChange, hint, aspect = 'square' }) {
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState(null); // 'camera' | 'library' | null
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!showLibrary) return;
    api.get('/upload/list').then((r) => setLibrary(r.data.data || [])).catch(() => setLibrary([]));
  }, [showLibrary]);

  // Paste from clipboard (works on iOS Safari and Chrome)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          upload(item.getAsFile());
          return;
        }
      }
    };
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, []);

  const upload = async (file) => {
    if (!file) return;
    // Accept any image type including HEIC (server handles conversion)
    if (file.size > 10 * 1024 * 1024) return toast.error('الحد الأقصى للصورة 10MB');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api.post('/upload/image', fd);
      onChange(r.data.url);
      if (r.data.note) toast.success(`✅ ${r.data.note}`);
      else toast.success('تم رفع الصورة');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'تعذر رفع الصورة';
      toast.error(errMsg, { duration: 5000 });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e, mode) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
    setUploadMode(null);
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border p-3 transition-colors ${dragOver ? 'border-neon/60 bg-neon/5' : 'border-border bg-bg/60'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]); }}
      tabIndex={0}
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
          <div className={`rounded-xl bg-panel border border-dashed border-border flex items-center justify-center text-xl ${aspect === 'wide' ? 'w-24 h-14' : 'w-14 h-14'}`}><span>📷</span></div>
        )}
        <div className="flex flex-col gap-1.5 flex-1">
          {/* Two clear buttons: Camera + Gallery */}
          <div className="flex gap-1.5 flex-wrap">
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading} className="neon-btn text-[11px] px-3 py-1.5 disabled:opacity-60">
              {uploading ? '⏳ جاري الرفع…' : '📸 الكاميرا'}
            </button>
            <button type="button" onClick={() => libraryRef.current?.click()} disabled={uploading} className="neon-btn text-[11px] px-3 py-1.5 disabled:opacity-60" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' }}>
              {uploading ? '⏳ …' : '🖼️ المعرض'}
            </button>
            <button type="button" onClick={() => setShowLibrary((v) => !v)} className="text-[11px] px-3 py-1.5 rounded-xl border border-border text-muted hover:text-white">
              {showLibrary ? 'إخفاء' : '📂 المرفوعات'}
            </button>
          </div>
          <p className="text-[9px] text-muted">PNG / JPG / WEBP / HEIC حتى 10MB — أو الصق صورة من الحافظة</p>
        </div>

        {/* Camera input — capture="environment" opens rear camera on iOS */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'camera')}
        />
        {/* Library input — no capture attribute, opens photo picker */}
        <input
          ref={libraryRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'library')}
        />
      </div>

      {showLibrary && (
        <div className="mt-3">
          {library.length === 0 ? (
            <p className="text-[10px] text-muted">لا توجد صور مرفوعة بعد.</p>
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

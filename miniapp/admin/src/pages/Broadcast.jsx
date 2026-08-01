import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

const AUDIENCE_LABELS = { all: 'جميع المستخدمين', buyers: 'المشترون فقط', with_balance: 'من لديهم رصيد', specific: 'محددون' };

export default function Broadcast() {
  const [form, setForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    targetAudience: 'all',
    buttons: []
  });
  const [specificIds, setSpecificIds] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [newButton, setNewButton] = useState({ text: '', url: '' });
  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const ids = form.targetAudience === 'specific'
        ? specificIds.split(/[\s,،]+/).map(s => parseInt(s)).filter(id => !isNaN(id) && id > 0)
        : [];
      const r = await api.post('/admin/broadcast/target-count', { targetAudience: form.targetAudience, specificUserIds: ids });
      setPreviewCount(r.data.data.count);
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل في حساب العدد');
      setPreviewCount(null);
    }
    setPreviewLoading(false);
  };

  const handleSend = async () => {
    if (!form.message.trim()) return toast.error('الرسالة مطلوبة');
    if (form.targetAudience === 'specific') {
      const ids = specificIds.split(/[\s,،]+/).map(s => parseInt(s)).filter(id => !isNaN(id) && id > 0);
      if (!ids.length) return toast.error('أدخل على الأقل ID واحد للمستخدمين المحددين');
      form.specificUserIds = ids;
    }
    if (!confirm(`إرسال الإذاعة إلى: ${AUDIENCE_LABELS[form.targetAudience]}؟`)) return;
    setSending(true);
    try {
      const r = await api.post('/admin/broadcast', form);
      setResult(r.data);
      toast.success(`📢 جاري الإرسال إلى ${r.data.totalTargets} مستخدم`);
      // Poll until the broadcast finishes so the admin sees live sent/failed counts
      const broadcastId = r.data.data?._id;
      if (broadcastId) {
        const timer = setInterval(async () => {
          try {
            const list = await api.get('/admin/broadcasts');
            const b = list.data.data?.find(x => x._id === broadcastId);
            if (!b) return clearInterval(timer);
            setResult(prev => ({ ...prev, data: b }));
            if (b.status === 'completed') {
              clearInterval(timer);
              toast.success(`✅ اكتمل الإرسال: ${b.sentCount} نجح / ${b.failedCount} فشل`);
            }
          } catch (_) {}
        }, 5000);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل في الإرسال');
    }
    setSending(false);
  };

  const addButton = () => {
    if (!newButton.text || !newButton.url) return;
    setForm(f => ({ ...f, buttons: [...f.buttons, newButton] }));
    setNewButton({ text: '', url: '' });
  };

  const formatMessage = (text) => text
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-white">📢 الإذاعة</h2>

      {result && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-green/10 border border-green/30 rounded-2xl p-4 text-green">
          <p className="font-bold">✅ تم إرسال الإذاعة!</p>
          <p className="text-sm mt-1">إجمالي المستهدفين: {result.totalTargets}</p>
          {result.data?.status === 'completed' ? (
            <p className="text-xs mt-1 text-white/80">
              📨 المُرسل: <b>{result.data.sentCount || 0}</b> · ❌ الفاشل: <b>{result.data.failedCount || 0}</b>
            </p>
          ) : (
            <p className="text-xs mt-1 text-muted">⏳ جاري الإرسال... يتم التحديث تلقائياً</p>
          )}
        </motion.div>
      )}

      <div className="admin-card space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-muted font-semibold block mb-1">🏷️ العنوان (اختياري)</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="مثال: عرض نهاية الأسبوع 🔥" className="input-admin" />
        </div>

        {/* Target Audience */}
        <div>
          <label className="text-xs text-muted font-semibold block mb-2">🎯 الجمهور المستهدف</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(AUDIENCE_LABELS).map(([val, label]) => (
              <button key={val} onClick={() => setForm(f => ({ ...f, targetAudience: val }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all
                  ${form.targetAudience === val ? 'bg-neon/10 border-neon/30 text-neon' : 'border-border text-muted bg-bg'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Specific IDs */}
        {form.targetAudience === 'specific' && (
          <div>
            <label className="text-xs text-muted font-semibold block mb-1">👥 معرّفات المستخدمين (IDs) - افصل بينها بفاصلة أو مسافة</label>
            <textarea value={specificIds} onChange={e => setSpecificIds(e.target.value)} rows={2} className="input-admin resize-none font-mono" placeholder="123456789, 987654321" />
            <p className="text-[10px] text-muted mt-1">💡 تجد الـ ID في ملف أي مستخدم أو من أمر /id في البوت</p>
          </div>
        )}

        {/* Preview count */}
        <div className="flex items-center gap-2">
          <button onClick={handlePreview} disabled={previewLoading} className="text-xs px-3 py-2 rounded-xl border border-neon/30 bg-neon/10 text-neon font-bold hover:bg-neon/20 transition-all disabled:opacity-50">
            {previewLoading ? '⏳...' : '🔍 معاينة العدد'}
          </button>
          {previewCount !== null && (
            <span className="text-xs text-white bg-bg border border-border rounded-xl px-3 py-2 font-bold">
              سيصل إلى: <span className="text-neon font-black">{previewCount}</span> مستخدم 🚀
            </span>
          )}
        </div>

        {/* Image URL */}
        <div>
          <label className="text-xs text-muted font-semibold block mb-1">🖼️ رابط الصورة (اختياري)</label>
          <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="input-admin" />
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted font-semibold">💬 نص الرسالة</label>
            <span className="text-[10px] text-muted">**Bold** *Italic* `Code`</span>
          </div>
          <textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="أهلاً بكم! 🔥 لدينا عرض حصري..."
            rows={6}
            className="input-admin resize-none"
          />
        </div>

        {/* Preview */}
        {form.message && (
          <div className="bg-bg border border-border rounded-xl p-3">
            <p className="text-[10px] text-muted mb-2">معاينة الرسالة:</p>
            {form.title && <p className="text-[11px] text-neon font-black mb-1">🏷️ {form.title}</p>}
            <div className="text-sm text-white" dangerouslySetInnerHTML={{ __html: formatMessage(form.message).replace(/\n/g, '<br>') }} />
          </div>
        )}

        {/* Inline Buttons */}
        <div>
          <label className="text-xs text-muted font-semibold block mb-2">🔗 أزرار شفافة (اختياري)</label>
          <div className="flex gap-2">
            <input value={newButton.text} onChange={e => setNewButton(b => ({ ...b, text: e.target.value }))} placeholder="نص الزر" className="input-admin flex-1 text-xs" />
            <input value={newButton.url} onChange={e => setNewButton(b => ({ ...b, url: e.target.value }))} placeholder="https://..." className="input-admin flex-1 text-xs" />
            <button onClick={addButton} className="neon-btn px-3 text-xs">+</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.buttons.map((btn, i) => (
              <div key={i} className="flex items-center gap-1 bg-neon/5 border border-neon/20 rounded-lg px-2 py-1 text-xs text-neon">
                {btn.text}
                <button onClick={() => setForm(f => ({ ...f, buttons: f.buttons.filter((_, j) => j !== i) }))} className="text-red ml-1">×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Send Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSend}
          disabled={sending || !form.message.trim()}
          className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #00d4ff20, #00d4ff10)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', boxShadow: '0 0 20px rgba(0,212,255,0.1)' }}
        >
          {sending ? '⏳ جاري الإرسال...' : `📢 إرسال إلى ${AUDIENCE_LABELS[form.targetAudience]}`}
        </motion.button>
      </div>
    </div>
  );
}

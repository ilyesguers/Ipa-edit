import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Broadcast() {
  const [form, setForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    targetAudience: 'all',
    buttons: []
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [newButton, setNewButton] = useState({ text: '', url: '' });

  const handleSend = async () => {
    if (!form.message.trim()) return toast.error('الرسالة مطلوبة');
    if (!confirm(`إرسال الإذاعة إلى: ${AUDIENCE_LABELS[form.targetAudience]}؟`)) return;
    setSending(true);
    try {
      const r = await api.post('/admin/broadcast', form);
      setResult(r.data);
      toast.success(`📢 جاري الإرسال إلى ${r.data.totalTargets} مستخدم`);
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

  const AUDIENCE_LABELS = { all: 'جميع المستخدمين', buyers: 'المشترون فقط', with_balance: 'من لديهم رصيد', specific: 'محددون' };

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
        </motion.div>
      )}

      <div className="admin-card space-y-4">
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
